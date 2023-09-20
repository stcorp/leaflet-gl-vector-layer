import { LeafletGlVectorLayer } from '../leaflet-gl-vector-layer';
import { ControlsService } from './controls-service';
import { BehaviorSubject, ReplaySubject, Subject, takeUntil } from 'rxjs';
import cloneDeep from 'lodash/cloneDeep';
import { IColor, IRGBA, IXRGBA } from '../types/typings';
import { colormapToXrgbaColormap, colorWrappersToXrgbaColormap } from '../helpers/color-transformers';
import { colormapToEdgePoints, getGradientForEdgePoints } from '../helpers/color-transformers';
import { IroColor } from '@irojs/iro-core/dist/color';
export interface IColorEdgePoint {
  value: number;
  color: IRGBA;
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
  [layerId: string]: IColorCollection;
}

export interface IColorSlider {
  slider: HTMLElement;
  edgePoint: IColorEdgePoint;
}

export interface IGradient {
  layerId: string;
  gradient: chroma.Scale;
}

export class ColorService {
  private colorPickerDialogSubject = new Subject<{ isOpen: boolean; isReset: boolean }>();
  private selectedColorSliderSubject = new Subject<IColorSlider>();
  private gradientSubject = new Subject<IGradient>();
  private selectedColorChangedSubject = new Subject<IroColor>();
  private colorMapSelectedSubject = new BehaviorSubject<IColorCollection>({
    name: '',
    colormap: [],
    xrgbaColormap: [],
    colorPickerEdgePoints: [],
  });
  private globalColorCollections: IColorCollection[] = [];
  private selectedColorCollections: {
    [layerId: string]: IColorCollection;
  } = {};
  private colorCollectionsForLayers: {
    [layerId: string]: IColorCollection[];
  } = {};
  private gradientsPerLayer: {
    [layerId: string]: chroma.Scale;
  } = {};
  private destroyed$ = new ReplaySubject(1);

  public colorPickerDialog$ = this.colorPickerDialogSubject.asObservable();
  public selectedColorSlider$ = this.selectedColorSliderSubject.asObservable();
  public gradient$ = this.gradientSubject.asObservable();
  public selectedColorChanged$ = this.selectedColorChangedSubject.asObservable();
  public colorMapSelected$ = this.colorMapSelectedSubject.asObservable();

  constructor(private controlsService: ControlsService) {
    this.controlsService.currentLayers$.pipe(takeUntil(this.destroyed$)).subscribe(layers => {
      for (const layer of layers) {
        this.initialiseColorCollectionForLayer(layer);
      }
    });

    this.controlsService.addLayer$.pipe(takeUntil(this.destroyed$)).subscribe(layer => {
      this.addLayer(layer);
    });
  }

  public changeColor(color: any) {
    this.selectedColorChangedSubject.next(color);
  }

  public updateEdgePointsOfCurrentColorCollection(edgePoints: IColorEdgePoint[]) {
    const layer = this.controlsService.selectedLayer;
    if (layer) {
      const colorCollection = this.selectedColorCollections[layer.id];
      const xrgbaColormap = colorWrappersToXrgbaColormap(edgePoints);
      colorCollection.xrgbaColormap = xrgbaColormap;
      colorCollection.colorPickerEdgePoints = edgePoints;
      this.updateSelectedColorCollection(colorCollection);
    }
  }

  private initialiseColorCollectionForLayer(layer: LeafletGlVectorLayer) {
    if (this.selectedColorCollections[layer.id]) {
      return;
    }

    const colormap = this.controlsService.getOptions(layer.id)?.colormap;
    const colorCollection: any = {};
    if (colormap && Array.isArray(colormap)) {
      let colors;
      let name = '';
      if (typeof colormap[0] === 'string') {
        colors = colormap[1] as IColor[];
        name = colormap[0];
      } else {
        colors = colormap as IColor[];
      }
      colorCollection.name = name;
      colorCollection.xrgbaColormap = colormapToXrgbaColormap(colors);
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
      layerId: layer.id,
      gradient: this.gradientsPerLayer[layer.id],
    });
  }

  public addLayer(layer: LeafletGlVectorLayer) {
    this.initialiseColorCollectionForLayer(layer);
  }

  public setGradient(gradient: chroma.Scale, layer?: LeafletGlVectorLayer) {
    if (layer) {
      this.gradientsPerLayer[layer.id] = gradient;
      this.gradientSubject.next({
        layerId: layer.id,
        gradient,
      });
    } else if (this.controlsService.selectedLayer) {
      this.gradientSubject.next({
        layerId: this.controlsService.selectedLayer.id,
        gradient,
      });
    } else {
      console.warn('No layer selected or given when setting gradient');
    }
  }

  public selectColorMap(colors: IXRGBA[]) {
    const layer = this.controlsService.selectedLayer;
    if (layer) {
      const currentColorCollection = cloneDeep(this.selectedColorCollections[layer.id]);
      currentColorCollection.xrgbaColormap = colors;
      currentColorCollection.colorPickerEdgePoints = colormapToEdgePoints(colors);
      this.updateSelectedColorCollection(currentColorCollection);
      this.colorMapSelectedSubject.next(currentColorCollection);
    }
  }

  public updateSelectedColorCollection(colorCollection: IColorCollection) {
    const layer = this.controlsService.selectedLayer;
    if (layer) {
      this.selectedColorCollections[layer.id] = cloneDeep(colorCollection);
      this.setGradient(getGradientForEdgePoints(colorCollection.colorPickerEdgePoints));
    }
  }

  public closeColorPickerDialog(reset: boolean) {
    this.colorPickerDialogSubject.next({ isReset: reset, isOpen: false });
  }

  public openColorPickerDialog() {
    this.colorPickerDialogSubject.next({ isReset: false, isOpen: true });
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

  public getAllColorCollections() {
    const layer = this.controlsService.selectedLayer;
    if (layer) {
      return (this.colorCollectionsForLayers[layer.id] ?? []).concat(this.globalColorCollections ?? []);
    } else {
      return [];
    }
  }

  public getSelectedColorCollection(): IColorCollection | null {
    const layer = this.controlsService.selectedLayer;
    if (layer) {
      return this.selectedColorCollections[layer.id];
    } else {
      return null;
    }
  }

  public cleanUp(clearSubjects: boolean = false) {
    if (clearSubjects) {
      this.destroyed$.next(true);
      this.destroyed$.complete();
      this.colorPickerDialogSubject.complete();
      this.selectedColorSliderSubject.complete();
      this.colorMapSelectedSubject.complete();
      this.gradientSubject.complete();
    }
  }
}
