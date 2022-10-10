import { BehaviorSubject, Subject } from 'rxjs';
import { LeafletGlVectorLayer } from '../leaflet-gl-vector-layer';
import { ColorService } from './color-service';
import {
  LeafletGlVectorLayerOptions,
} from '../types/leaflet-gl-vector-layer-options';

export interface IGradientSubject {
  gradient: chroma.Scale;
  layer: LeafletGlVectorLayer;
}

export interface ILimitsSubject {
  min: number;
  max: number;
}

export class ControlsService {
  public limitsSubject = new Subject<ILimitsSubject>();
  public selectLayerSubject = new Subject<LeafletGlVectorLayer>();
  public addLayerSubject = new Subject<LeafletGlVectorLayer>();
  public currentLayerSubject = new BehaviorSubject<LeafletGlVectorLayer[]>([]);
  public showLayerSubject = new Subject<LeafletGlVectorLayer>();
  public hideLayerSubject = new Subject<LeafletGlVectorLayer>();

  public selectedLayer: LeafletGlVectorLayer|undefined;
  public currentLayers: LeafletGlVectorLayer[] = [];
  public options: any = {};

  constructor() {

  }

  public selectLayer(layer: LeafletGlVectorLayer) {
    this.selectedLayer = layer;
    this.selectLayerSubject.next(layer);
  }

  public addLayer(layer: LeafletGlVectorLayer) {
    this.addLayerSubject.next(layer);
    this.currentLayers.push(layer);
    this.currentLayerSubject.next(this.currentLayers);
  }

  public showLayer(layer: LeafletGlVectorLayer) {
    this.showLayerSubject.next(layer);
  }

  public hideLayer(layer: LeafletGlVectorLayer) {
    this.hideLayerSubject.next(layer);
  }

  public setLimits(limits: ILimitsSubject) {
    this.limitsSubject.next(limits);
  }

  public setOptions(layerId: string, newOptions: LeafletGlVectorLayerOptions) {
    this.options[layerId] = newOptions;
  }

  public getOptions(layerId?: string) {
    if(!layerId) {
      if(this.selectedLayer) {
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
    if(clearSubjects) {
      this.currentLayerSubject.next([]);
      this.currentLayerSubject.complete();
      this.selectLayerSubject.complete();
      this.addLayerSubject.complete();
      this.limitsSubject.complete();
      this.showLayerSubject.complete();
      this.hideLayerSubject.complete();
    }

    this.selectedLayer = undefined;
    this.currentLayers = [];
  }
}
