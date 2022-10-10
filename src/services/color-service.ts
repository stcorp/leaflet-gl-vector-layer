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

export class ColorService {
  colorPickerDialogSubject = new Subject<{isOpen: boolean; isReset: boolean}>();
  selectedColorSliderSubject = new Subject<IColorSlider>();
  gradientSubject = new Subject<IGradientSubject>();
  selectedColorChangedSubject = new Subject<IroColor>();
  colorMapSelectedSubject = new BehaviorSubject<IColorCollection>({
    name: '',
    colormap: [],
    xrgbaColormap: [],
    colorPickerEdgePoints: []
  });
  globalColorCollections: IColorCollection[] = [];
  selectedColorCollections: {
    [layerId: string]: IColorCollection
  } = {};
  colorCollectionsForLayers: {
    [layerId: string]: IColorCollection[]
  } = {};
  gradientsPerLayer: {
    [layerId: string]: chroma.Scale
  } = {};

  constructor(private controlsService: ControlsService) {
    this.controlsService.addLayerSubject.subscribe(layer => {
      this.addLayer(layer);
    })
  }


  public changeColor(color: any) {
    this.selectedColorChangedSubject.next(color);
  }

  public updateEdgePointsOfCurrentColorCollection(edgePoints: IColorEdgePoint[]) {
    let layer = this.controlsService.selectedLayer;
    if(layer) {
      let colorCollection = this.selectedColorCollections[layer.id];
      let xrgbaColormap = colorWrappersToXrgbaColormap(edgePoints);
      colorCollection.xrgbaColormap = xrgbaColormap;
      colorCollection.colorPickerEdgePoints = edgePoints;
      this.updateSelectedColorCollection(colorCollection);
    }
  }

  public addLayer(layer: LeafletGlVectorLayer) {
    let colormap = this.controlsService.getOptions(layer.id)?.colormap;
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
      colorCollection.xrgbaColormap = this.globalColorCollections[0].xrgbaColormap;
      colorCollection.colorPickerEdgePoints = cloneDeep(this.globalColorCollections[0].colorPickerEdgePoints);
    }
    colorCollection as IColorCollection;
    this.selectedColorCollections[layer.id] = colorCollection;
    this.setColorCollectionsForLayer(layer, [colorCollection]);
    this.gradientsPerLayer[layer.id] = getGradientForEdgePoints(colorCollection.colorPickerEdgePoints);
    this.gradientSubject.next({
      layer,
      gradient: this.gradientsPerLayer[layer.id]
    });
    if(!this.controlsService.selectedLayer) {
      this.colorMapSelectedSubject.next(colorCollection);
    }

  }

  public setGradient(gradient: chroma.Scale, layer?: LeafletGlVectorLayer) {
    if (layer) {
      this.gradientsPerLayer[layer.id] = gradient;
      this.gradientSubject.next({
        gradient,
        layer
      });
    } else if (this.controlsService.selectedLayer) {
      this.gradientSubject.next({
        gradient,
        layer: this.controlsService.selectedLayer
      });
    } else {
      console.warn('No layer selected or given when setting gradient');
    }
  }

  public selectColorMap(colors: IXRGBA[]) {
    let layer = this.controlsService.selectedLayer;
    if(layer) {
      let currentColorCollection = cloneDeep(this.selectedColorCollections[layer.id]);
      currentColorCollection.xrgbaColormap = colors;
      currentColorCollection.colorPickerEdgePoints = colormapToEdgePoints(colors);
      this.updateSelectedColorCollection(currentColorCollection);
      this.colorMapSelectedSubject.next(currentColorCollection);
    }
  }

  public updateSelectedColorCollection(colorCollection: IColorCollection) {
    let layer = this.controlsService.selectedLayer;
    if(layer) {
      this.selectedColorCollections[layer.id] = cloneDeep(colorCollection);
      this.setGradient(getGradientForEdgePoints(colorCollection.colorPickerEdgePoints));
    }
  }

  public closeColorPickerDialog(reset: boolean) {
    this.colorPickerDialogSubject.next({isReset: reset, isOpen: false});
  }

  public openColorPickerDialog() {
    this.colorPickerDialogSubject.next({isReset: false, isOpen: true});
  }

  public selectColorSlider(slider: IColorSlider) {
    this.selectedColorSliderSubject.next(slider);
  }

  public setColorCollectionsForLayer(layer: LeafletGlVectorLayer, colorCollections: IColorCollection[]) {
    this.colorCollectionsForLayers[layer.id] = colorCollections;
  }

  public setGlobalColorCollections(colorCollections: IColorCollection[]) {
    this.globalColorCollections = colorCollections;
  }

  public getAllColorCollections () {
    let layer = this.controlsService.selectedLayer;
    if(layer) {
      return this.colorCollectionsForLayers[layer.id].concat(this.globalColorCollections);
    } else {
      return [];
    }
  }

  public getSelectedColorCollection(): IColorCollection|null {
    let layer = this.controlsService.selectedLayer;
    if(layer) {
      return this.selectedColorCollections[layer.id];
    } else {
      return null;
    }
  }

  public cleanUp(clearSubjects: boolean = false) {
    if(clearSubjects) {
      this.colorPickerDialogSubject.complete();
      this.selectedColorSliderSubject.complete();
      this.colorMapSelectedSubject.complete();
      this.selectedColorChangedSubject.complete();
      this.gradientSubject.complete();
    }
  }

}

