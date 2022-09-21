import { IColorSlider, IColorWrapper } from "../types/color-slider";
import { LeafletGlVectorLayer } from '../leaflet-gl-vector-layer';
import { colormapToColorWrapper, getGradientForColorWrappers } from '../helpers/color-maps';
import { IColorMapWrapper } from '../controls/color-map.control';
import { ControlsService, IGradientSubject } from './controls-service';
import { BehaviorSubject, Subject } from 'rxjs';
import chroma from 'chroma-js';
import cloneDeep from 'lodash/cloneDeep';

export interface IColorService {
  selectColorMap: (colorMap: IColorMapWrapper|undefined) => void;
  changeColor: (color: any) => void;
  openColorPickerDialog: () => void;
  closeColorPickerDialog: (reset: boolean) => void;
  setGradient: (gradient: chroma.Scale, layer?: LeafletGlVectorLayer) => void;
  selectColorSlider: (colorSlider: IColorSlider) => void;
  addLayer: (layer: LeafletGlVectorLayer) => void;
  selectLayer: (layer: LeafletGlVectorLayer) => void;
  cleanUp: () => void;
  setGlobalColorWrappers: (colorWrappers: IColorWrapper[][]) => void;
  setSelectedColorWrappers: (colorWrappers: IColorWrapper[]) => void;
  selectedColorChangedSubject: Subject<any>;
  colorMapSubject: BehaviorSubject<IColorMapWrapper|undefined>;
  selectedColorWrappersSubject: BehaviorSubject<IColorWrapper[]>;
  colorPickerDialogSubject: Subject<{
    isOpen: boolean;
    isReset: boolean;
  }>;
  currentGradientSubject: Subject<chroma.Scale>;
  selectedColorSliderSubject: Subject<IColorSlider>;
  gradients: {
    [layerId: string]: chroma.Scale;
  }
  gradientSubject: Subject<IGradientSubject>;
  globalColorWrappers: IColorWrapper[][];
  selectedColorWrappers: {
    [layerId: string]: IColorWrapper[];
  }
}

export const ColorService: IColorService = {
  colorMapSubject: new BehaviorSubject<IColorMapWrapper|undefined>(undefined),
  selectedColorChangedSubject: new Subject<any>(),
  colorPickerDialogSubject: new Subject<{isOpen: boolean; isReset: boolean}>(),
  currentGradientSubject: new Subject<chroma.Scale>(),
  gradientSubject: new Subject<IGradientSubject>(),
  selectedColorSliderSubject: new Subject<IColorSlider>(),
  selectedColorWrappersSubject: new BehaviorSubject<IColorWrapper[]>([]),
  gradients: {

  },
  selectedColorWrappers: {

  },
  globalColorWrappers: [],
  setGlobalColorWrappers(colorWrappers: IColorWrapper[][]) {
    this.globalColorWrappers = colorWrappers;
  },
  setSelectedColorWrappers(colorWrappers: IColorWrapper[]) {
    if(ControlsService.selectedLayer) {
      this.selectedColorWrappers[ControlsService.selectedLayer.id] = colorWrappers;
    }
  },
  addLayer(layer: LeafletGlVectorLayer) {
    if(layer.options.leafletGlVectorLayerOptions.colormap) {
      this.selectedColorWrappers[layer.id] = colormapToColorWrapper(layer.options.leafletGlVectorLayerOptions.colormap);
    } else {
      this.selectedColorWrappers[layer.id] = ColorService.globalColorWrappers[0];
    }
    this.gradients[layer.id] = getGradientForColorWrappers(this.selectedColorWrappers[layer.id]);
    this.gradientSubject.next({
      layer,
      gradient: this.gradients[layer.id]
    });
  },
  selectLayer(layer: LeafletGlVectorLayer) {
    this.selectedColorWrappersSubject.next(this.selectedColorWrappers[layer.id]);
  },
  selectColorMap: (colorMap: IColorMapWrapper|undefined) => {
    if(!colorMap) {
      return;
    }
    if(ControlsService.selectedLayer) {
      let colorWrappers = cloneDeep(colorMap.colorWrappers);
      ColorService.selectedColorWrappers[ControlsService.selectedLayer.id] = colorWrappers;
      ColorService.selectedColorWrappersSubject.next(colorWrappers);
    }
    ColorService.colorMapSubject.next(cloneDeep(colorMap));
  },
  changeColor: (color: any) => {
    ColorService.selectedColorChangedSubject.next(color);
  },
  closeColorPickerDialog: (reset: boolean) => {
    ColorService.colorPickerDialogSubject.next({isReset: reset, isOpen: false});
  },
  openColorPickerDialog: () => {
    ColorService.colorPickerDialogSubject.next({isReset: false, isOpen: true});
  },
  selectColorSlider: (colorSlider: IColorSlider) => {
    ColorService.selectedColorSliderSubject.next(colorSlider);
  },
  setGradient: (gradient: chroma.Scale, layer?: LeafletGlVectorLayer) => {
    if(layer) {
      ColorService.gradients[layer.id] = gradient;
      ColorService.gradientSubject.next({
        gradient,
        layer
      });
    } else if(ControlsService.selectedLayer) {
      ColorService.gradientSubject.next({
        gradient,
        layer: ControlsService.selectedLayer
      });
      ColorService.currentGradientSubject.next(gradient);
    } else {
      console.warn('No layer selected or given when setting gradient');
    }
  },
  cleanUp: () => {
    ColorService.gradients = {};
    ColorService.colorMapSubject.complete();
    ColorService.selectedColorChangedSubject.complete();
    ColorService.colorPickerDialogSubject.complete();
    ColorService.currentGradientSubject.complete();
    ColorService.gradientSubject.complete();
    ColorService.selectedColorSliderSubject.complete();
  },
}

