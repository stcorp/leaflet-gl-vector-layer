import { LeafletGlVectorLayer } from '../leaflet-gl-vector-layer';
import { ControlsService, IGradientSubject } from './controls-service';
import { BehaviorSubject, Subject } from 'rxjs';
import cloneDeep from 'lodash/cloneDeep';
import { IColor, IRGBA, IXRGBA } from '../types/colors';
import { colormapToXrgbaColormap, colorWrappersToXrgbaColormap } from '../helpers/color-transformers';
import { colormapToEdgePoints, getGradientForEdgePoints } from '../helpers/color-transformers';
import { IroColor } from '@irojs/iro-core/dist/color';
export interface IColorEdgePoint {
  value: number;
  color: IRGBA
}

export interface IColorMap {
  colorCollection: IColorCollection;
  colorMapElement: HTMLElement;
  id: string;
}

export interface IColorCollection {
  name: string;
  colormap: IColor[];
  xrgbaColormap: IXRGBA[];
  colorPickerEdgePoints: IColorEdgePoint[];
}

export interface ISelectedColorCollections {
  [layerId: string]: IColorCollection
}

export interface IColorSlider {
  slider: HTMLElement,
  edgePoint: IColorEdgePoint
}

export interface IColorService {
  changeColor: (color: IroColor) => void;
  updateEdgePointsOfCurrentColorCollection: (edgePoints: IColorEdgePoint[]) => void;
  selectColorMap: (colors: IXRGBA[]) => void;
  setGlobalColorCollections: (colorCollections: IColorCollection[]) => void;
  setColorCollectionsForLayer: (layer: LeafletGlVectorLayer, colorCollections: IColorCollection[]) => void;
  selectColorSlider: (slider: IColorSlider) => void;
  setGradient: (gradient: chroma.Scale, layer?: LeafletGlVectorLayer) => void;
  addLayer: (layer: LeafletGlVectorLayer) => void;
  cleanUp: (clearSubjects: boolean) => void;
  getAllColorCollections: () => IColorCollection[];
  openColorPickerDialog: () => void;
  closeColorPickerDialog: (reset: boolean) => void;
  selectedColorCollections: ISelectedColorCollections;
  updateSelectedColorCollection: (newColorCollection: IColorCollection) => void;
  getSelectedColorCollection: () => IColorCollection|null;
  colorPickerDialogSubject: Subject<{
    isOpen: boolean;
    isReset: boolean;
  }>;
  selectedColorSliderSubject: Subject<IColorSlider>;
  colorMapSelectedSubject: BehaviorSubject<IColorCollection>;
  selectedColorChangedSubject: Subject<IroColor>;
  gradientSubject: Subject<IGradientSubject>;
  globalColorCollections: IColorCollection[];
  colorCollectionsForLayers: {
    [layerId: string]: IColorCollection[];
  };
  gradientsPerLayer: {
    [layerId: string]: chroma.Scale
  }
}

export const ColorService: IColorService = {
  colorPickerDialogSubject: new Subject<{isOpen: boolean; isReset: boolean}>(),
  selectedColorSliderSubject: new Subject<IColorSlider>(),
  gradientSubject: new Subject<IGradientSubject>(),
  selectedColorChangedSubject: new Subject<IroColor>(),
  colorMapSelectedSubject: new BehaviorSubject<IColorCollection>({
    name: '',
    colormap: [],
    xrgbaColormap: [],
    colorPickerEdgePoints: []
  }),
  globalColorCollections: [],
  selectedColorCollections: {},
  colorCollectionsForLayers: {},
  gradientsPerLayer: {},
  changeColor: (color: any) => {
    ColorService.selectedColorChangedSubject.next(color);
  },
  updateEdgePointsOfCurrentColorCollection: (edgePoints: IColorEdgePoint[]) => {
    let layer = ControlsService.selectedLayer;
    if(layer) {
      let colorCollection = ColorService.selectedColorCollections[layer.id];
      let xrgbaColormap = colorWrappersToXrgbaColormap(edgePoints);
      colorCollection.xrgbaColormap = xrgbaColormap;
      colorCollection.colorPickerEdgePoints = edgePoints;
      ColorService.updateSelectedColorCollection(colorCollection);
    }
  },
  addLayer(layer: LeafletGlVectorLayer) {
    let colormap = ControlsService.getOptions(layer.id)?.colormap;
    let colorCollection: any = {
    }
    if(colormap && Array.isArray(colormap)) {
      let colors;
      let name = '';
      if(typeof colormap[0] === 'string') {
        colors = colormap[1] as IColor[];
        name = colormap[0];
      } else {
        colors = colormap as IColor[];
      }
      colorCollection.name = name;
      colorCollection.xrgbaColormap = colormapToXrgbaColormap(colors)
      colorCollection.colorPickerEdgePoints = colormapToEdgePoints(colorCollection.xrgbaColormap);
    } else {
      colorCollection.name = '';
      colorCollection.xrgbaColormap = ColorService.globalColorCollections[0].xrgbaColormap;
      colorCollection.colorPickerEdgePoints = cloneDeep(ColorService.globalColorCollections[0].colorPickerEdgePoints);
    }
    colorCollection as IColorCollection;
    ColorService.selectedColorCollections[layer.id] = colorCollection;
    ColorService.setColorCollectionsForLayer(layer, [colorCollection]);
    ColorService.gradientsPerLayer[layer.id] = getGradientForEdgePoints(colorCollection.colorPickerEdgePoints);
    this.gradientSubject.next({
      layer,
      gradient: ColorService.gradientsPerLayer[layer.id]
    });
    if(!ControlsService.selectedLayer) {
      ColorService.colorMapSelectedSubject.next(colorCollection);
    }

  },
  setGradient: (gradient: chroma.Scale, layer?: LeafletGlVectorLayer) => {
    if (layer) {
      ColorService.gradientsPerLayer[layer.id] = gradient;
      ColorService.gradientSubject.next({
        gradient,
        layer
      });
    } else if (ControlsService.selectedLayer) {
      ColorService.gradientSubject.next({
        gradient,
        layer: ControlsService.selectedLayer
      });
    } else {
      console.warn('No layer selected or given when setting gradient');
    }
  },
  selectColorMap: (colors: IXRGBA[]) => {
    let layer = ControlsService.selectedLayer;
    if(layer) {
      let currentColorCollection = cloneDeep(ColorService.selectedColorCollections[layer.id]);
      currentColorCollection.xrgbaColormap = colors;
      currentColorCollection.colorPickerEdgePoints = colormapToEdgePoints(colors);
      ColorService.updateSelectedColorCollection(currentColorCollection);
      ColorService.colorMapSelectedSubject.next(currentColorCollection);
    }
  },
  updateSelectedColorCollection: (colorCollection: IColorCollection) => {
    let layer = ControlsService.selectedLayer;
    if(layer) {
      ColorService.selectedColorCollections[layer.id] = cloneDeep(colorCollection);
      ColorService.setGradient(getGradientForEdgePoints(colorCollection.colorPickerEdgePoints));
    }
  },
  closeColorPickerDialog: (reset: boolean) => {
    ColorService.colorPickerDialogSubject.next({isReset: reset, isOpen: false});
  },
  openColorPickerDialog: () => {
    ColorService.colorPickerDialogSubject.next({isReset: false, isOpen: true});
  },
  selectColorSlider: (slider: IColorSlider) => {
    ColorService.selectedColorSliderSubject.next(slider);
  },
  setColorCollectionsForLayer: (layer: LeafletGlVectorLayer, colorCollections: IColorCollection[]) => {
    ColorService.colorCollectionsForLayers[layer.id] = colorCollections;
  },
  setGlobalColorCollections: (colorCollections: IColorCollection[]) => {
    ColorService.globalColorCollections = colorCollections;
  },
  getAllColorCollections: () => {
    let layer = ControlsService.selectedLayer;
    if(layer) {
      return ColorService.colorCollectionsForLayers[layer.id].concat(ColorService.globalColorCollections);
    } else {
      return [];
    }
  },
  getSelectedColorCollection: (): IColorCollection|null => {
    let layer = ControlsService.selectedLayer;
    if(layer) {
      return ColorService.selectedColorCollections[layer.id];
    } else {
      return null;
    }
  },
  cleanUp: (clearSubjects: boolean = false) => {
    if(clearSubjects) {
      ColorService.colorPickerDialogSubject.complete();
      ColorService.selectedColorSliderSubject.complete();
      ColorService.colorMapSelectedSubject.complete();
      ColorService.selectedColorChangedSubject.complete();
      ColorService.gradientSubject.complete();
    }
  },
}

