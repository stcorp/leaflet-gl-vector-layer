import { IColorSlider, IColorWrapper } from "../types/color-slider";
import { LeafletGlVectorLayer } from '../leaflet-gl-vector-layer';
import { IXrgbaColor } from '../types/colors';
import { getColor } from '../helpers/color-map-names';
import { ColorMaps } from '../helpers/color-maps';
import { IColorMapWrapper } from '../controls/color-map.control';
import { ControlsService, IGradientSubject } from './controls-service';
import { Subject } from 'rxjs';
import chroma from 'chroma-js';
import cloneDeep from 'lodash/cloneDeep';

export interface IColorService {
  colorWrappersByLayer: {
    [layerId: string]: IColorWrapper[][];
  },
  initializeLayerColors: (layer: LeafletGlVectorLayer) => void;
  getColorWrappers: (layer?: LeafletGlVectorLayer|undefined) => IColorWrapper[][];
  selectColorMap: (colorMap: IColorMapWrapper) => void;
  changeColor: (color: any) => void;
  closeColorPickerDialog: (reset: boolean) => void;
  openColorPickerDialog: () => void;
  resetColorMap: () => void;
  setGradient: (gradient: chroma.Scale, layer?: LeafletGlVectorLayer) => void;
  selectColorSlider: (colorSlider: IColorSlider) => void;
  updateCurrentColorWrappers: (colorWrappers: IColorWrapper[]) => void;
  cleanUp: () => void;
  onLayerSelected: () => void;
  getCurrentGradient: () => chroma.Scale|void;
  selectColorWrappers: (layer: LeafletGlVectorLayer, colorWrappers: IColorWrapper[]) => void;
  getCurrentColorWrappers: (layer?: LeafletGlVectorLayer) => IColorWrapper[];
  getDefaultColorWrappers: (layer?: LeafletGlVectorLayer) => IColorWrapper[];
  colorPickerSubject: Subject<boolean>;
  colorMapSubject: Subject<IColorMapWrapper>;
  resetColorMapSubject: Subject<boolean>;
  colorPickerDialogSubject: Subject<{
    isOpen: boolean;
    isReset: boolean;
  }>;
  currentGradientSubject: Subject<chroma.Scale>;
  selectedColorSliderSubject: Subject<IColorSlider>;
  currentColorWrappersSubject: Subject<IColorWrapper[]>;
  colorMaps: {
    [layerId: string]: IColorMapWrapper[];
  },
  currentColorWrappers: {
    [layerId: string]: IColorWrapper[];
  };
  gradients: {
    [layerId: string]: chroma.Scale;
  }
  gradientSubject: Subject<IGradientSubject>;
}

export const ColorService: IColorService = {
  colorMapSubject: new Subject<IColorMapWrapper>(),
  colorPickerSubject: new Subject<boolean>(),
  resetColorMapSubject: new Subject<boolean>(),
  colorPickerDialogSubject: new Subject<{isOpen: boolean; isReset: boolean}>(),
  currentGradientSubject: new Subject<chroma.Scale>(),
  gradientSubject: new Subject<IGradientSubject>(),
  selectedColorSliderSubject: new Subject<IColorSlider>(),
  currentColorWrappersSubject: new Subject<IColorWrapper[]>(),
  currentColorWrappers: {},
  colorMaps: {},

  colorWrappersByLayer: {

  },
  gradients: {

  },
  onLayerSelected: () => {
    ColorService.currentColorWrappersSubject.next(cloneDeep(ColorService.getCurrentColorWrappers()));
    let gradient = ColorService.getCurrentGradient();
    if(gradient) {
      ColorService.currentGradientSubject.next(gradient);
    }
    return;
  },
  updateCurrentColorWrappers: (colorWrappers: IColorWrapper[]) => {
    let clonedWrappers = cloneDeep(colorWrappers);
    if(ControlsService.selectedLayer) {
      ColorService.currentColorWrappers[ControlsService.selectedLayer.id] = cloneDeep(clonedWrappers);
      ColorService.currentColorWrappersSubject.next(clonedWrappers);
      let gradient = getGradientForColorWrappers(clonedWrappers);
      ColorService.setGradient(gradient);
      ColorService.currentGradientSubject.next(gradient);
    }
  },
  selectColorMap: (colorMap: IColorMapWrapper) => {
    if(ControlsService.selectedLayer) {
      ColorService.selectColorWrappers(ControlsService.selectedLayer, colorMap.colorWrappers);
    }
    ColorService.colorMapSubject.next(cloneDeep(colorMap));
  },
  selectColorWrappers: (layer: LeafletGlVectorLayer, colorWrappers: IColorWrapper[]) => {
    ColorService.currentColorWrappers[layer.id] = cloneDeep(colorWrappers);
  },
  changeColor: (color: any) => {
    ColorService.colorPickerSubject.next(color);
  },
  resetColorMap: () => {
    ColorService.resetColorMapSubject.next(true);
  },
  closeColorPickerDialog: (reset: boolean) => {
    ColorService.colorPickerDialogSubject.next({isReset: reset, isOpen: false});
  },
  openColorPickerDialog: () => {
    ColorService.colorPickerDialogSubject.next({isReset: false, isOpen: true});
  },
  getColorWrappers: (layer?: LeafletGlVectorLayer): IColorWrapper[][] => {
    if(layer) {
      return [...ColorService.colorWrappersByLayer[layer.id]];
    } else if(ControlsService.selectedLayer){
      return [...ColorService.colorWrappersByLayer[ControlsService.selectedLayer.id]];
    } else {
      console.error('Tried to get color wrappers for undefined layer');
      return [];
    }
  },
  getCurrentGradient: (): chroma.Scale|undefined => {
    if(ControlsService.selectedLayer) {
      return ColorService.gradients[ControlsService.selectedLayer.id];
    } else {
      return undefined;
    }
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
  getCurrentColorWrappers: (layer?: LeafletGlVectorLayer) => {
    if(layer) {
      return cloneDeep(ColorService.currentColorWrappers[layer.id]);
    } else if(ControlsService.selectedLayer) {
      return cloneDeep(ColorService.currentColorWrappers[ControlsService.selectedLayer.id]);
    } else {
      console.error('Tried to get current color wrappers for undefined layer');
      return [];
    }
  },
  getDefaultColorWrappers: (layer?: LeafletGlVectorLayer) => {
    if(layer) {
      return cloneDeep(ColorService.colorWrappersByLayer[layer.id][0]);
    } else if(ControlsService.selectedLayer) {
      return cloneDeep(ColorService.colorWrappersByLayer[ControlsService.selectedLayer.id][0]);
    } else {
      console.error('Tried to get current color wrappers for undefined layer');
      return [];
    }
  },
  cleanUp: () => {
    ColorService.gradients = {};
    ColorService.currentColorWrappers = {};
    ColorService.colorMaps = {};
    ColorService.colorWrappersByLayer = {};
    ColorService.colorMapSubject.complete();
    ColorService.colorPickerSubject.complete();
    ColorService.resetColorMapSubject.complete();
    ColorService.colorPickerDialogSubject.complete();
    ColorService.currentGradientSubject.complete();
    ColorService.gradientSubject.complete();
    ColorService.selectedColorSliderSubject.complete();
    ColorService.currentColorWrappersSubject.complete();
  },
  initializeLayerColors: (layer: LeafletGlVectorLayer) => {
    initializeColorWrappers();
    initializeGradient();

    function initializeColorWrappers() {
      ColorService.colorWrappersByLayer[layer.id] = [];
      let passedDefaultColormap = layer.options.leafletGlVectorLayerOptions.colormap;
      if(passedDefaultColormap) {
        let colorMapAsXrgba: IXrgbaColor[] = toXRGBA(passedDefaultColormap);
        let colorWrappers: IColorWrapper[] = createColorWrappersFromXrgbaColors(colorMapAsXrgba);
        ColorService.colorWrappersByLayer[layer.id] = [colorWrappers];
      } else {
        ColorService.colorWrappersByLayer[layer.id] = [];
      }

      let passedColormaps = layer.options.leafletGlVectorLayerOptions.colormaps;
      let colorMapsAsXrgba: IXrgbaColor[][] = [];
      let colorWrappers: IColorWrapper[][] = [];
      if(!passedColormaps) {
        colorWrappers = [[
          {
            value: 0,
            color: [0, 0, 0, 1]
          },
          {
            value: 1,
            color: [255, 255, 255, 1]
          }
        ]]
      } else {
        colorMapsAsXrgba = passedColormaps.map(map => toXRGBA(map));
        colorWrappers = colorMapsAsXrgba.map(colors => createColorWrappersFromXrgbaColors(colors));
      }
      ColorService.colorWrappersByLayer[layer.id] = ColorService.colorWrappersByLayer[layer.id].concat(colorWrappers);
      ColorService.selectColorWrappers(layer, ColorService.colorWrappersByLayer[layer.id][0]);

      function createColorWrappersFromXrgbaColors(colors: IXrgbaColor[]): IColorWrapper[] {
        return colors.map(color => {
          return toColorWrapper(color);
        })

      }

      function toColorWrapper(color: IXrgbaColor): IColorWrapper {
        return {
          value: color[0],
          color: [color[1], color[2], color[3], color[4]]
        }
      }

      function toXRGBA(xrgbaColors: IXrgbaColor[]): IXrgbaColor[] {
        return xrgbaColors.map(color => {
          return [
            color[0],
            Math.floor(color[1]*255),
            Math.floor(color[2]*255),
            Math.floor(color[3]*255),
            Math.floor(color[4])
          ]
        });
      }
    }

    function initializeGradient() {
      let colorWrappers = ColorService.getCurrentColorWrappers(layer);
      let gradient = getGradientForColorWrappers(colorWrappers);
      ColorService.setGradient(gradient, layer);
    }

  }
}

function getGradientForColorWrappers(colorWrappers: IColorWrapper[]): chroma.Scale {
  let colors = getColorScaleString();
  let gradient = chroma.scale(colors).domain([...colorWrappers.map(position => position.value)]);
  return gradient;

  function getColorScaleString() {
    let colors = colorWrappers.map(item => {
      return 'rgba(' + item.color.join(',') + ')'
    })
    return colors;
  }
}