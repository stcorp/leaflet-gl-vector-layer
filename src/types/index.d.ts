/// <reference types="chroma-js" />
import * as L from 'leaflet';
import { Bounds, LatLng, LatLngBounds, Layer, Map, Point } from 'leaflet';
import { GridRenderer } from '../grid-renderer';
import { PointsRenderer } from '../points-renderer';
import { SwathRenderer } from '../swath-renderer';
import { DataHelper } from '../helpers/data-helper';
import { LeafletGlVectorLayerControls } from '../controls/leaflet-gl-vector-layer-controls';
import { ExtendedOptions } from '../leaflet-gl-vector-layer';
import { IHandler } from './handlers';
import { Subscription } from 'rxjs';
import { LeafletGlVectorLayerOptions } from './leaflet-gl-vector-layer-options';

export class LeafletGlVectorLayer extends Layer {
  canvas: HTMLCanvasElement;
  _map: L.Map;
  renderer: SwathRenderer | GridRenderer | PointsRenderer | undefined;
  private _paneName: string;
  dataHelper: DataHelper;
  options: LeafletGlVectorLayerOptions;
  wrapper: LeafletGlVectorLayerWrapper;
  control: LeafletGlVectorLayerControl;
  _leaflet_id: string;
  id: string;
  isHidden: boolean;
  private handlers: IHandler[];
  private subscriptions: Subscription[];
  private isFirstRun: boolean;
  constructor(newOptions: ExtendedOptions);
  onRemove(map: Map): this;
  addTo(map: L.Map): this;
  onAdd(map: Map): this;
  private updateColors(): void;
  private updateRender(): void;
  private updateValues(): void;
  isAnimated(): boolean;
  private _resize(resizeEvent: any): void;
  private _reset: void;
  private _redraw(): void;
  private _animateZoom(event: any): void;
  private _animateZoomNoLayer(event: any): void;
  private _unclampedProject(latlng: LatLng, zoom: number): Point;
  private _unclampedLatLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds;
}

export class LeafletGlVectorLayerWrapper extends L.Layer {
  private layers: LeafletGlVectorLayer[];
  controls: LeafletGlVectorLayerControls | undefined;
  map: L.Map;
  constructor();
  onAdd(map: L.Map): this;
  addTo(map: L.Map): this;
  private cleanUp(layer: any): void;
  addLayer(layer: LeafletGlVectorLayer): this;
  private onLayerSelected;
  private animateLayerOpacity;
}
