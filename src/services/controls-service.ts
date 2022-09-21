import { BehaviorSubject, Subject } from 'rxjs';
import { ExtendedOptions, LeafletGlVectorLayer } from '../leaflet-gl-vector-layer';
import { ColorService } from './color-service';

export interface IGradientSubject {
  gradient: chroma.Scale;
  layer: LeafletGlVectorLayer;
}

export interface ILimitsSubject {
  min: number;
  max: number;
}
export interface IControlsService {
  selectedLayer: LeafletGlVectorLayer|undefined;
  limitsSubject: Subject<ILimitsSubject>;
  selectLayerSubject: Subject<LeafletGlVectorLayer>;
  addLayerSubject: Subject<LeafletGlVectorLayer>;
  showLayerSubject: Subject<LeafletGlVectorLayer>;
  hideLayerSubject: Subject<LeafletGlVectorLayer>;
  currentLayerSubject: BehaviorSubject<LeafletGlVectorLayer[]>;
  selectLayer: (layer: LeafletGlVectorLayer) => void;
  addLayer: (layer: LeafletGlVectorLayer) => void;
  showLayer: (layer: LeafletGlVectorLayer) => void;
  hideLayer: (layer: LeafletGlVectorLayer) => void;
  setLimits: (limits: ILimitsSubject) => void;
  cleanUp: () => void;
  currentLayers: LeafletGlVectorLayer[];
  options: {
    [x: string]: ExtendedOptions
  };
  setOptions: (layerId: string, options: ExtendedOptions) => void;
  getCurrentLayers: () => LeafletGlVectorLayer[];
  getOptions: (layerId: string) => ExtendedOptions;

}

export const ControlsService: IControlsService = {
  limitsSubject: new Subject<ILimitsSubject>(),
  selectLayerSubject: new Subject<LeafletGlVectorLayer>(),
  addLayerSubject: new Subject<LeafletGlVectorLayer>(),
  currentLayerSubject: new BehaviorSubject<LeafletGlVectorLayer[]>([]),
  showLayerSubject: new Subject<LeafletGlVectorLayer>(),
  hideLayerSubject: new Subject<LeafletGlVectorLayer>(),
  selectedLayer: undefined,
  currentLayers: [],
  options: {},

  selectLayer: (layer: LeafletGlVectorLayer) => {
    ControlsService.selectedLayer = layer;
    ControlsService.selectLayerSubject.next(layer);
    ColorService.selectLayer(layer);
  },
  addLayer: (layer: LeafletGlVectorLayer) => {
    ControlsService.addLayerSubject.next(layer);
    ControlsService.currentLayers.push(layer);
    ControlsService.currentLayerSubject.next(ControlsService.currentLayers);
    ColorService.addLayer(layer);
  },
  showLayer: (layer: LeafletGlVectorLayer) => {
    ControlsService.showLayerSubject.next(layer);
  },
  hideLayer: (layer: LeafletGlVectorLayer) => {
    ControlsService.hideLayerSubject.next(layer);
  },
  setLimits: (limits: ILimitsSubject) => {
    ControlsService.limitsSubject.next(limits);
  },
  setOptions: (layerId: string, newOptions: ExtendedOptions) => {
    ControlsService.options[layerId] = newOptions;
  },
  getOptions: (layerId: string) => {
    return ControlsService.options[layerId];
  },
  getCurrentLayers: (): LeafletGlVectorLayer[] => {
    return ControlsService.currentLayers;
  },
  cleanUp: () => {
    ControlsService.currentLayerSubject.next([]);
    ControlsService.currentLayerSubject.complete();
    ControlsService.selectLayerSubject.complete();
    ControlsService.addLayerSubject.complete();
    ControlsService.limitsSubject.complete();
    ControlsService.showLayerSubject.complete();
    ControlsService.hideLayerSubject.complete();
    ControlsService.selectedLayer = undefined;
    ControlsService.currentLayers = [];
  }
}