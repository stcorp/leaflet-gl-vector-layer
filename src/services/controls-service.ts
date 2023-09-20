import { BehaviorSubject, ReplaySubject, Subject } from 'rxjs';
import { LeafletGlVectorLayer } from '../leaflet-gl-vector-layer';
import { LeafletGlVectorLayerOptions } from '../types/typings';

export interface ILimitsSubject {
  min: number;
  max: number;
}

export class ControlsService {
  private limitsSubject = new ReplaySubject<ILimitsSubject>();
  private layerSelectedSubject = new ReplaySubject<LeafletGlVectorLayer>(1);
  private addLayerSubject = new Subject<LeafletGlVectorLayer>();
  private currentLayersSubject = new BehaviorSubject<LeafletGlVectorLayer[]>([]);
  private showLayerSubject = new Subject<LeafletGlVectorLayer>();
  private hideLayerSubject = new Subject<LeafletGlVectorLayer>();

  public selectedLayer: LeafletGlVectorLayer | undefined;
  public currentLayers: LeafletGlVectorLayer[] = [];
  public options: any = {};
  public isColorPickerOpen = false;
  public limitsPerLayer: {
    [layerId: string]: {
      min: number;
      max: number;
    };
  } = {};

  public hideLayer$ = this.hideLayerSubject.asObservable();
  public showLayer$ = this.showLayerSubject.asObservable();
  public currentLayers$ = this.currentLayersSubject.asObservable();
  public addLayer$ = this.addLayerSubject.asObservable();
  public layerSelected$ = this.layerSelectedSubject.asObservable();
  public limits$ = this.limitsSubject.asObservable();
  constructor() {}

  public selectLayer(layer: LeafletGlVectorLayer) {
    this.selectedLayer = layer;
    this.layerSelectedSubject.next(layer);
    if (this.limitsPerLayer[layer.id]) {
      this.limitsSubject.next(this.limitsPerLayer[layer.id]);
    }
  }

  public addLayer(layer: LeafletGlVectorLayer) {
    this.addLayerSubject.next(layer);
    this.currentLayers.push(layer);
    this.currentLayersSubject.next(this.currentLayers);
    if (this.currentLayers.length === 1) {
      this.selectLayer(layer);
    }
  }

  public showLayer(layer: LeafletGlVectorLayer) {
    this.showLayerSubject.next(layer);
  }

  public hideLayer(layer: LeafletGlVectorLayer) {
    this.hideLayerSubject.next(layer);
  }

  public setLimits(limits: { min: number; max: number }) {
    if (this.selectedLayer) {
      this.limitsPerLayer[this.selectedLayer?.id] = {
        min: limits.min,
        max: limits.max,
      };
    }
    this.limitsSubject.next(limits);
  }

  public setOptions(layerId: string, newOptions: LeafletGlVectorLayerOptions) {
    this.options[layerId] = newOptions;
  }

  public getOptions(layerId?: string) {
    if (!layerId) {
      if (this.selectedLayer) {
        return this.options[this.selectedLayer.id];
      } else {
        return undefined;
      }
    }
    return this.options[layerId];
  }

  public getCurrentLayers() {
    return this.currentLayers;
  }

  public cleanUp(clearSubjects: boolean = false) {
    if (clearSubjects) {
      this.currentLayersSubject.next([]);
      this.currentLayersSubject.complete();
      this.layerSelectedSubject.complete();
      this.addLayerSubject.complete();
      this.limitsSubject.complete();
      this.showLayerSubject.complete();
      this.hideLayerSubject.complete();
    }

    this.selectedLayer = undefined;
    this.currentLayers = [];
  }
}
