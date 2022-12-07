import { LeafletGlVectorLayer } from "./leaflet-gl-vector-layer";
import * as L from 'leaflet';
import { ControlsService } from './services/controls-service';
import { LeafletGlVectorLayerControls } from './controls/leaflet-gl-vector-layer-controls';
import { ColorService, IColorCollection } from './services/color-service';
import { IColor, IColorMap, IRGBA, IXRGBA } from './types/colors';
import { colormapToXrgbaColormap, fromRGBToWebGl } from './helpers/color-transformers';
import { colormapToEdgePoints } from './helpers/color-transformers';

export interface LeafletGlVectorLayerWrapperOptions {
  colormaps?: IColorMap[];
}

export class LeafletGlVectorLayerWrapper extends L.Layer {

  private layers: LeafletGlVectorLayer[] = [];
  public controls: LeafletGlVectorLayerControls|undefined;
  public map: L.Map;
  private controlsService = new ControlsService();
  private colorService = new ColorService(this.controlsService);
  // For removing event listeners
  private onMouseOverControlsFunction = this.onMouseOverControls.bind(this);
  private onMouseOutControlsFunction = this.onMouseOutControls.bind(this);



  constructor(private options: LeafletGlVectorLayerWrapperOptions) {
    super();
    this.cleanUp();

    let colorCollections = [];
    const defaultColorMaps = ([
      [[0, 0, 0, 1], [0, 64, 129, 1], [0, 108, 217, 1], [0, 184, 255, 1], [0, 230, 255, 1], [90, 255, 166, 1], [229, 255, 26, 1], [255, 186, 0, 1], [255, 0, 0, 1]],
      [[232, 236, 251, 1], [143, 86, 159, 1], [78, 149, 189, 1], [115, 181, 131, 1], [201, 184, 67, 1], [229, 115, 48, 1], [206, 34, 33, 1], [111, 29, 22, 1]]
    ] as IRGBA[][]).map((colormap: IRGBA[]) => {
      return colormap.map(fromRGBToWebGl)
    }) as IRGBA[][];
    let defaultXrgbaColormaps = defaultColorMaps.map((colormap: IRGBA[]) => colormapToXrgbaColormap(colormap)) as IXRGBA[][];
    for(let defaultColorMap of defaultXrgbaColormaps) {
      let colorPickerEdgePoints = colormapToEdgePoints(defaultColorMap);
      let defaultColorCollection: IColorCollection = {
        name: '',
        colormap: defaultColorMap,
        xrgbaColormap: defaultColorMap,
        colorPickerEdgePoints,
      }
      colorCollections.push(defaultColorCollection);
    }
    let colormaps = this.options.colormaps;

    if(colormaps && colormaps.length) {
      for(let colormap of colormaps) {
        let colorCollection;
        let xrgbaColormap;
        let colorPickerEdgePoints;
        if(Array.isArray(colormap) && colormap.length) {
          let colors;
          if(colormap.length && typeof colormap[0] === 'string') {
            colors = colormap[1] as IColor[];
          } else {
            colors = colormap as IColor[];
          }
          xrgbaColormap = colormapToXrgbaColormap(colors)
          colorPickerEdgePoints = colormapToEdgePoints(xrgbaColormap);
          colorCollection = {
            name: '',
            xrgbaColormap,
            colorPickerEdgePoints,
            colormap: colormap
          } as IColorCollection
          colorCollections.push(colorCollection);
        }
      }
    }
    this.colorService.setGlobalColorCollections(colorCollections);
    window.onbeforeunload = () => {
      this.cleanUp(true);
    }
  }

  private cleanUp(clearSubjects: boolean = false) {
    if(this.controls?.controlWrapperInnerContainer) {
      this.controls.controlWrapperInnerContainer.removeEventListener('mouseover', this.onMouseOverControlsFunction)
      this.controls.controlWrapperInnerContainer.removeEventListener('mouseout', this.onMouseOutControlsFunction);
    }


    this.controlsService.cleanUp(clearSubjects);
    this.colorService.cleanUp(clearSubjects);
    if(this.controls) {
      this.controls.cleanUp();
    }
    this.controls = undefined;
    if(this.layers.length) {
      for(let layer of this.layers) {
        layer.cleanUp();
      }
      this.layers = [];
    }

    if(this.map) {
      this.map.getContainer()?.replaceChildren();
      this.map.remove();
    }

  }

  public onAdd(map: L.Map) {
    this.addTo(map);
    return this;
  }

  public addTo(map: L.Map) {
    this.map = map;

    return this;
  }

  public addLayer(layer: LeafletGlVectorLayer) {
    layer.addServices(this.controlsService, this.colorService);
    layer.addTo(this.map);
    this.layers.push(layer);
    this.controlsService.addLayer(layer);
    if(!this.controlsService.selectedLayer) {
      this.controlsService.selectLayer(layer);
      this.controls = new LeafletGlVectorLayerControls(this.controlsService, this.colorService);
      this.controls.addTo(this.map);
      this.controls.controlWrapperInnerContainer.addEventListener('mouseover', this.onMouseOverControlsFunction)
      this.controls.controlWrapperInnerContainer.addEventListener('mouseout', this.onMouseOutControlsFunction);
    }
    return this;
  }

  private onMouseOverControls() {
    this.map.dragging.disable();
  }

  private onMouseOutControls() {
    this.map.dragging.enable();
  }
}