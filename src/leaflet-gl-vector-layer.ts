import {
    Browser,
    Bounds,
    DomUtil,
    LatLng,
    ZoomAnimEvent,
    Map,
    ResizeEvent,
    setOptions,
    Layer,
    Point,
    LatLngBounds
} from "leaflet";
import {PointsRenderer} from "./points-renderer";
import {GridRenderer} from "./grid-renderer";
import {SwathRenderer} from "./swath-renderer";
import {LeafletGlVectorLayerControl} from "./leaflet-gl-vector-layer-controls";
import {DataHelper} from "./helpers/data-helper";
import {LeafletGlVectorLayerWrapper} from "./leaflet-gl-vector-layer-wrapper";
import {guidGenerator} from "./helpers/guid-generator";
import {LeafletGlVectorLayerOptions} from "./types/leaflet-gl-vector-layer-options";
// import throttle from 'lodash/throttle';

interface ExtendedOptions extends L.GridLayerOptions {
    leafletGlVectorLayerOptions: LeafletGlVectorLayerOptions
}
export class LeafletGlVectorLayer extends L.GridLayer {
    public canvases: HTMLCanvasElement[] = [];
    public _map: any;
    public renderer: SwathRenderer|GridRenderer|PointsRenderer|undefined;
    private _paneName: string = 'overlayPane';
    public dataHelper: DataHelper;
    public options: ExtendedOptions;
    public wrapper: LeafletGlVectorLayerWrapper;
    public control: LeafletGlVectorLayerControl;
    public _leaflet_id: string;
    public id: string;
    private isFirstRun = true;
    constructor(newOptions: ExtendedOptions) {
        super(newOptions);
        this.id = guidGenerator()
        setOptions(this, {...this.options, leafletGlVectorLayerOptions: newOptions.leafletGlVectorLayerOptions});
    }

    public onRemove(map: Map) {
        this.wrapper?.cleanUpControlAndLayerData(this);
        for(let canvas of this.canvases) {
            canvas?.remove();
        }
        this.renderer = undefined;
        this._map.off("moveend", this._reset, this);
        this._map.off("resize", this._resize, this);
        this._map.off(
          "zoomanim",
          Layer ? this._animateZoom : this._animateZoomNoLayer,
          this
        );
        return this;
    }

    public addTo(map: L.Map) {
        this._map = map;
        this.onAdd(map);
        return this;
    }

    public onAdd(map: Map) {
        this._map = map;
        for(let i = 0; i < 5; i++) {
            this.createCanvas();
        }
        let RendererMap: {
            [x: string]: typeof SwathRenderer | typeof GridRenderer | typeof PointsRenderer
        } = {
            "swath": SwathRenderer,
            "grid": GridRenderer,
            "points": PointsRenderer
        };
        if(!(['swath', 'grid', 'points'].includes(this.options.leafletGlVectorLayerOptions.plot_type))) {
            throw new Error(`${this.options.leafletGlVectorLayerOptions.plot_type} is not a valid renderer type`);
        }

        this.dataHelper = new DataHelper(this);
        this.renderer = new RendererMap[this.options.leafletGlVectorLayerOptions.plot_type](this.options.leafletGlVectorLayerOptions, this.canvases, map, this.dataHelper)


        if (!map.getPane(this._paneName)) {
            throw new Error("unable to find pane");
        }

        // let throttledReset = throttle(this._reset, 100);
        // map.on('move', this._reset, this);
        map.on("moveend", this._reset, this);
        map.on("resize", this._resize, this);

        if (this.isAnimated()) {
            map.on(
              "zoomanim",
              Layer ? this._animateZoom : this._animateZoomNoLayer,
              this
            );
        }

        this._reset();
        this.control = new LeafletGlVectorLayerControl(this);
        this.renderer.bindBuffers();
        this.control.subjects.gradient.subscribe({
            next: this.updateColors.bind(this)
        })
        this.control.subjects.updateLimits.subscribe({
            next: this.updateValues.bind(this)
        })
        return this;
    }

    private createCanvas() {
        let canvas = document.createElement('canvas');
        canvas.width = this._map.getSize().x;
        canvas.height = this._map.getSize().y;
        canvas.className = `leaflet-zoom-${this.isAnimated() ? "animated" : "hide"}`;
        if(this.options.opacity) {
            canvas.style.opacity = (this.options.opacity || 1) + '';
        }
        if (!this._map.getPane(this._paneName)) {
            throw new Error("unable to find pane");
        }
        this._map.getPane(this._paneName)?.appendChild(canvas);
        // this.createDuplicateCanvas();
        // this.createDuplicateWebGlCanvas();
        this.canvases.push(canvas);


        return canvas;
    }

    private updateColors(gradient: chroma.Scale|null|undefined): void {
        if(this.renderer && gradient) {
            this.renderer.setCustomColorMap(gradient);
            if(this.isFirstRun) {
                this.renderer.processData(this.updateRender.bind(this));
                this.isFirstRun = false;
            } else {
                this.renderer.updateColors();
                this._reset();
            }

        }
    }

    private updateRender(): void {
        this.renderer?.updateBuffers();
        this._reset();
    }

    private updateValues(limits: {min: number, max: number}): void {
        this.dataHelper.updateLimits(limits);
        this.renderer?.processData(this.updateRender.bind(this));
    }

    public isAnimated(): boolean {
        return Boolean(this._map.options.zoomAnimation && Browser.any3d);
    }

    private _resize(resizeEvent: ResizeEvent): void {
        if (this.canvases.length && resizeEvent) {
            for(let canvas of this.canvases) {
                canvas.width = resizeEvent.newSize.x;
                canvas.height = resizeEvent.newSize.y;
            }

        }
    }

    private _reset(): void {
        if (this.canvases.length) {
            const topLeft = this._map.containerPointToLayerPoint([0, 0]);
            for(let canvas of this.canvases) {
                DomUtil.setPosition(canvas, topLeft);
            }
            // DomUtil.setPosition(this.duplicateCanvas, topLeft);
            // DomUtil.setPosition(this.duplicateWebGlCanvas, topLeft);
        }
        this._redraw();
    }

    private _redraw(): void {
        const size = this._map.getSize();
        const bounds = this._map.getBounds();
        const zoomScale =
          (size.x * 180) / (20037508.34 * (bounds.getEast() - bounds.getWest())); // resolution = 1/zoomScale
        const zoom = this._map.getZoom();
        const topLeft = new LatLng(bounds.getNorth(), bounds.getWest());

        if (this.renderer) {
            for(let glContextWrapper of this.renderer.glContextWrappers) {
                let adjustedTopLeft = new LatLng(topLeft.lat, topLeft.lng + (360 * glContextWrapper.offsetMultiplier))
                const offset = this._unclampedProject(adjustedTopLeft, 0);
                while(offset.x > 256) {
                    offset.x = offset.x - 256*5;
                }
                while(offset.x < -this._map.getSize().x) {
                    offset.x = offset.x + 256*5
                }
                this.renderer.render({
                    bounds,
                    offset,
                    scale: Math.pow(2, zoom),
                    size,
                    zoomScale,
                    zoom,
                    glContextWrapper
                })
            }

            // let adjustedTopLeft = new LatLng(
            //     topLeft.lat,
            //     topLeft.lng + 360
            // )
            // const offsetAdjusted = this._unclampedProject(adjustedTopLeft, 0);
            // this.renderer.renderDuplicateWebGlCanvas({
            //     bounds,
            //     canvas: this.duplicateWebGlCanvas,
            //     offset: offsetAdjusted,
            //     scale: Math.pow(2, zoom),
            //     size,
            //     zoomScale,
            //     zoom,
            // })
            // this.renderer.renderDuplicateCanvas({
            //     bounds,
            //     canvas: this.duplicateCanvas,
            //     offset,
            //     scale: Math.pow(2, zoom),
            //     size,
            //     zoomScale,
            //     zoom,
            // })
        }
    }


    private _animateZoom(e: ZoomAnimEvent): void {
        const { _map } = this;
        const scale = _map.getZoomScale(e.zoom, _map.getZoom());
        const offset = this._unclampedLatLngBoundsToNewLayerBounds(
          _map.getBounds(),
          e.zoom,
          e.center
        ).min;
        if (this.canvases.length && offset) {
            for(let canvas of this.canvases) {
                DomUtil.setTransform(canvas, offset, scale);
            }
        }
    }

    private _animateZoomNoLayer(e: ZoomAnimEvent): void {
        const { _map } = this;
        if (this.canvases.length) {
            const scale = _map.getZoomScale(e.zoom, _map.getZoom());
            const offset = _map
              ._getCenterOffset(e.center)
              ._multiplyBy(-scale)
              .subtract(_map._getMapPanePos());
            for(let canvas of this.canvases) {
                DomUtil.setTransform(canvas, offset, scale);
            }
        }
    }

    private _unclampedProject(latlng: LatLng, zoom: number): Point {
        // imported partly from https://github.com/Leaflet/Leaflet/blob/1ae785b73092fdb4b97e30f8789345e9f7c7c912/src/geo/projection/Projection.SphericalMercator.js#L21
        // Need to clamp latitude when zooming in or projections will be messed up when zoomed far out.
        const { crs } = this._map.options;
        const { R } = crs.projection;
        const d = Math.PI / 180;
        const lat = latlng.lat;
        const sin = Math.sin(lat * d);
        const projectedPoint = new Point(
          R * latlng.lng * d,
          (R * Math.log((1 + sin) / (1 - sin))) / 2
        );
        const scale = crs?.scale(zoom) ?? 0;
        return crs.transformation._transform(projectedPoint, scale);
    }

    private _unclampedLatLngBoundsToNewLayerBounds(
      latLngBounds: LatLngBounds,
      zoom: number,
      center: LatLng
    ): Bounds {
        // imported party from https://github.com/Leaflet/Leaflet/blob/84bc05bbb6e4acc41e6f89ff7421dd7c6520d256/src/map/Map.js#L1500
        // Need to clamp latitude when zooming in or projections will be messed up when zoomed far out.
        const topLeft = this._map._getNewPixelOrigin(center, zoom);
        return new Bounds([
            this._unclampedProject(latLngBounds.getSouthWest(), zoom).subtract(
              topLeft
            ),
            this._unclampedProject(latLngBounds.getNorthWest(), zoom).subtract(
              topLeft
            ),
            this._unclampedProject(latLngBounds.getSouthEast(), zoom).subtract(
              topLeft
            ),
            this._unclampedProject(latLngBounds.getNorthEast(), zoom).subtract(
              topLeft
            ),
        ]);
    }
}
