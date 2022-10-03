/// <reference types="chroma-js" />
import * as L from "leaflet";
import { Layer, Map } from "leaflet";
import {GridRenderer} from "../grid-renderer";
import {PointsRenderer} from "../points-renderer";
import {SwathRenderer} from "../swath-renderer";
import {DataHelper} from "../helpers/data-helper";
import { LeafletGlVectorLayerControls } from '../controls/leaflet-gl-vector-layer-controls';
import { ExtendedOptions } from '../leaflet-gl-vector-layer';
import { IHandler } from './handlers';
import { Subscription } from 'rxjs';

export class LeafletGlVectorLayer extends Layer {
  canvas: HTMLCanvasElement;
  _map: any;
  renderer: SwathRenderer | GridRenderer | PointsRenderer | undefined;
  private _paneName;
  dataHelper: DataHelper;
  options: any;
  wrapper: LeafletGlVectorLayerWrapper;
  control: LeafletGlVectorLayerControl;
  _leaflet_id: string;
  id: string;
  isHidden: boolean;
  private handlers: IHandler[];
  private subscriptions: Subscription[];
  private isFirstRun;
  constructor(newOptions: ExtendedOptions);
  onRemove(map: Map): this;
  addTo(map: L.Map): this;
  onAdd(map: Map): this;
  private updateColors;
  private updateRender;
  private updateValues;
  isAnimated(): boolean;
  private _resize;
  private _reset;
  private _redraw;
  private _animateZoom;
  private _animateZoomNoLayer;
  private _unclampedProject;
  private _unclampedLatLngBoundsToNewLayerBounds;
}

export class LeafletGlVectorLayerWrapper extends L.Layer {
  private layers: LeafletGlVectorLayer[];
  controls: LeafletGlVectorLayerControls|undefined;
  map: L.Map;
  constructor();
  onAdd(map: L.Map): this;
  addTo(map: L.Map): this;
  private cleanUp(layer: any): void;
  addLayer(layer: LeafletGlVectorLayer): this;
  private onLayerSelected;
  private animateLayerOpacity;
}