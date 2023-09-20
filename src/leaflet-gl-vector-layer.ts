import {
    Browser,
    Bounds,
    DomUtil,
    LatLng,
    Map,
    setOptions,
    Layer,
    Point,
    LatLngBounds
} from "leaflet";
import {PointsRenderer} from "./points-renderer";
import {GridRenderer} from "./grid-renderer";
import {SwathRenderer} from "./swath-renderer";
import {DataHelper} from "./helpers/data-helper";
import {guidGenerator} from "./helpers/guid-generator";
import {
    LeafletGlVectorLayerOptions,
} from "./types/typings";
import { ControlsService, ILimitsSubject } from './services/controls-service';
import chroma from 'chroma-js';
import { ColorService } from './services/color-service';
import { filter, ReplaySubject, takeUntil } from 'rxjs';
import { IHandler } from './types/typings';
export interface ExtendedOptions extends L.GridLayerOptions {
    leafletGlVectorLayerOptions: LeafletGlVectorLayerOptions
}

export class LeafletGlVectorLayer extends L.GridLayer {
    public canvas: HTMLCanvasElement;
    public _map: any;
    public renderer: SwathRenderer|GridRenderer|PointsRenderer|undefined;
    private _paneName: string = 'overlayPane';
    public dataHelper: DataHelper;
    public id: string;
    public currentGradient: chroma.Scale|undefined;
    private isFirstRun = true;
    public isHidden = false;
    private handlers: IHandler[] = [];
    private controlsService: ControlsService;
    private colorService: ColorService;
    private destroyed$ = new ReplaySubject(1);
    public options: ExtendedOptions;
    constructor(newOptions: ExtendedOptions) {
        super(newOptions);
        this.id = guidGenerator();
        setOptions(this, {...this.options, leafletGlVectorLayerOptions: newOptions.leafletGlVectorLayerOptions});
    }

    public addServices(controlsService: ControlsService, colorService: ColorService) {
        this.controlsService = controlsService;
        this.colorService = colorService;
        this.controlsService.setOptions(this.id, this.options.leafletGlVectorLayerOptions);
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
        this.destroyed$.next(true);
        this.destroyed$.complete();
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
        map.on(moveEndHandler.type, moveEndHandler.func, this);

        let resizehandler = {
            func: this._resize,
            type: 'resize'
        }
        map.on(resizehandler.type, resizehandler.func, this);
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

        this.colorService.gradient$.pipe(
          takeUntil(this.destroyed$)
        ).subscribe(gradientData => {
            if(gradientData.layerId === this.id) {
                this.currentGradient = gradientData.gradient;
                this.updateColors();
            }
        });

        this.controlsService.limits$.pipe(
          takeUntil(this.destroyed$),
        ).subscribe((limits) => {
            if(!this.currentGradient) {
                return;
            }
            this.updateValues(limits);
        });

        this.controlsService.hideLayer$.pipe(
          takeUntil(this.destroyed$),
          filter((layer: LeafletGlVectorLayer) => {
            return layer.id === this.id;
          })
        ).subscribe((layer: LeafletGlVectorLayer) => {
            this.isHidden = true;
            this.canvas.style.opacity = '0';
        });

        this.controlsService.showLayer$.pipe(
          takeUntil(this.destroyed$),
          filter((layer: LeafletGlVectorLayer) => {
            return layer.id === this.id;
          })
        ).subscribe(() => {
            this.isHidden = false;
            this.canvas.style.opacity = `${this.options.opacity ?? 1}`;
        })

        this.controlsService.setLimits({
            min: this.dataHelper.currentMinValue ?? this.dataHelper.minValue,
            max: this.dataHelper.currentMaxValue ?? this.dataHelper.maxValue
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


        return canvas;
    }

    private updateColors(): void {
        if(this.renderer && this.currentGradient) {
            this.renderer.setCustomColorMap(this.currentGradient);
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

    private updateValues(data: ILimitsSubject): void {
        if(this.controlsService.selectedLayer?.id === this.id) {
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
