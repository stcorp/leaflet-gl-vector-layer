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
import {DataHelper} from "./helpers/data-helper";
import {LeafletGlVectorLayerWrapper} from "./leaflet-gl-vector-layer-wrapper";
import {guidGenerator} from "./helpers/guid-generator";
import {LeafletGlVectorLayerOptions} from "./types/leaflet-gl-vector-layer-options";
import { ControlsService, ILimitsSubject } from './services/controls-service';
import chroma from 'chroma-js';
import { IXrgbaColor } from './types/colors';
import { ColorService } from './services/color-service';
import { Subscription } from 'rxjs';
import { IHandler } from "./types/handlers";
export interface ExtendedOptions extends L.GridLayerOptions {
    leafletGlVectorLayerOptions: LeafletGlVectorLayerOptions
}
export class LeafletGlVectorLayer extends L.GridLayer {
    public canvas: HTMLCanvasElement;
    public _map: any;
    public renderer: SwathRenderer|GridRenderer|PointsRenderer|undefined;
    private _paneName: string = 'overlayPane';
    public dataHelper: DataHelper;
    public options: ExtendedOptions;
    public id: string;
    public currentGradient: chroma.Scale|undefined;
    private isFirstRun = true;
    public isHidden = false;
    private subscriptions: Subscription[] = [];
    private handlers: any[] = [];
    constructor(newOptions: ExtendedOptions) {
        super(newOptions);
        this.id = guidGenerator()
        ControlsService.setOptions(this.id, newOptions);
        setOptions(this, {...this.options, leafletGlVectorLayerOptions: newOptions.leafletGlVectorLayerOptions});
    }

    public onRemove(map: Map) {
        this.canvas.remove();
        this.renderer = undefined;
        for(let handler of this.handlers) {
            this._map.off(handler.type, handler.func, this);
        }
        this.handlers = [];
        return this;
    }

    public addTo(map: L.Map) {
      this._map = map;
      super.onAdd(map);
      this.onAdd(map);
      return this;
    }

    public cleanUp() {
        this.canvas.remove();
        this.renderer?.cleanUp();
        this.dataHelper.cleanUp();
        this.renderer = undefined;
        for(let handler of this.handlers) {
            this._map.off(handler.type, handler.func, this);
        }
        this.handlers = [];
        this._map = undefined;
        this.currentGradient = undefined;
        for(let subscription of this.subscriptions) {
            subscription.unsubscribe();
        }
        this.subscriptions = [];
    }

    public onAdd(map: Map) {
        this._map = map;
        this.canvas = this.createCanvas();
        this.renderer = undefined;
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

        this.dataHelper = new DataHelper(this.options.leafletGlVectorLayerOptions);
        this.renderer = new RendererMap[this.options.leafletGlVectorLayerOptions.plot_type](this.options.leafletGlVectorLayerOptions, map, this.dataHelper, this.canvas)


        if (!map.getPane(this._paneName)) {
            throw new Error("unable to find pane");
        }

        // let throttledReset = throttle(this._reset, 100);
        // map.on('move', this._reset, this);
        let moveEndHandler = {
            func: this._reset,
            type: 'moveend'
        }
        map.on(moveEndHandler.type, moveEndHandler.func);

        let resizehandler = {
            func: this._resize,
            type: 'resize'
        }
        map.on(resizehandler.type, resizehandler.func);
        this.handlers.push(moveEndHandler, resizehandler);
        if (this.isAnimated()) {
            let zoomhandler = {
                func: Layer ? this._animateZoom : this._animateZoomNoLayer,
                type: 'zoomanim'
            }
            map.on(
              zoomhandler.type,
              zoomhandler.func,
              this
            );
            this.handlers.push(zoomhandler);
        }

        this._reset();
        this.renderer.bindBuffers();
        let gradientSubscription = ColorService.gradientSubject.subscribe(data => {
            this.currentGradient = data.gradient;
            this.updateColors(data);
        })
        let limitsSubscription = ControlsService.limitsSubject.subscribe(data => {
            this.updateValues(data);
        })

        let hideLayerSubscription = ControlsService.hideLayerSubject.subscribe((layer: LeafletGlVectorLayer) => {
            if(layer.id === this.id) {
                this.isHidden = true;
                this.canvas.style.opacity = '0';
            }
        });

        let showLayerSubscription = ControlsService.showLayerSubject.subscribe((layer: LeafletGlVectorLayer) => {
            if(layer.id === this.id) {
                this.isHidden = false;
                this.canvas.style.opacity = `${this.options.opacity ?? 1}`;
            }
        })

        this.subscriptions.push(gradientSubscription, limitsSubscription, hideLayerSubscription, showLayerSubscription);
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


        return canvas;
    }

    private updateColors(data: {gradient: chroma.Scale|null|undefined, layer: LeafletGlVectorLayer}): void {
        if(this.id === data.layer.id) {
            if(this.renderer && data.gradient) {
                this.renderer.setCustomColorMap(data.gradient);
                if(this.isFirstRun) {
                    this.renderer.processData(this.updateRender.bind(this));
                    this.isFirstRun = false;
                } else {
                    this.renderer.updateColors();
                    this._reset();
                }
            }
        }
    }

    private updateRender(): void {
        this.renderer?.updateBuffers();
        this._reset();
    }

    private updateValues(data: ILimitsSubject): void {
        if(ControlsService.selectedLayer?.id === this.id) {
            this.dataHelper.updateLimits(data);
            this.renderer?.processData(this.updateRender.bind(this));
        }
    }

    public isAnimated(): boolean {
        return Boolean(this._map.options.zoomAnimation && Browser.any3d);
    }

    private _resize(resizeEvent: any): void {
        if (this.canvas && resizeEvent) {
            this.canvas.width = resizeEvent.newSize.x;
            this.canvas.height = resizeEvent.newSize.y;
        }
    }

    private _reset(): void {
        if (this.canvas) {
            const topLeft = this._map.containerPointToLayerPoint([0, 0]);
            DomUtil.setPosition(this.canvas, topLeft);
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
            let adjustedTopLeft = new LatLng(topLeft.lat, topLeft.lng)
            const offset = this._unclampedProject(adjustedTopLeft, 0);
            this.renderer.render({
                bounds,
                offset,
                scale: Math.pow(2, zoom),
                size,
                zoomScale,
                zoom
            })
        }
    }


    private _animateZoom(e: any): void {
        const { _map } = this;
        const scale = _map.getZoomScale(e.zoom, _map.getZoom());
        const offset = this._unclampedLatLngBoundsToNewLayerBounds(
          _map.getBounds(),
          e.zoom,
          e.center
        ).min;
        if (this.canvas && offset) {
            DomUtil.setTransform(this.canvas, offset, scale);
        }
    }

    private _animateZoomNoLayer(e: any): void {
        const { _map } = this;
        if (this.canvas) {
            const scale = _map.getZoomScale(e.zoom, _map.getZoom());
            const offset = _map
              ._getCenterOffset(e.center)
              ._multiplyBy(-scale)
              .subtract(_map._getMapPanePos());
            DomUtil.setTransform(this.canvas, offset, scale);
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
