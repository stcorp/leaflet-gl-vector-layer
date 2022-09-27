import { LeafletGlVectorLayer } from "./leaflet-gl-vector-layer";
import * as L from 'leaflet';
import { ControlsService } from './services/controls-service';
import { LeafletGlVectorLayerControls } from './controls/leaflet-gl-vector-layer-controls';
import { ColorService } from './services/color-service';
import { IRGB, IRGBA, IXrgbaColor } from './types/colors';
import { colormapToColorWrapper } from './helpers/color-maps';
import { colormapsToXrgbaColormaps } from './helpers/color-transformers';

export interface LeafletGlVectorLayerWrapperOptions {
  colormaps?: (IXrgbaColor[][])|(IRGBA[][])|(IRGB[][]);
}

export class LeafletGlVectorLayerWrapper extends L.Layer {

  private layers: LeafletGlVectorLayer[] = [];
  public controls: LeafletGlVectorLayerControls|undefined;
  public map: L.Map;
  private xrgbaColorMaps: IXrgbaColor[][] = [];
  constructor(private options: LeafletGlVectorLayerWrapperOptions) {
    super();
    this.cleanUp();
    let colormaps = this.options.colormaps;
    if(colormaps && colormaps.length > 0 && colormaps[0].length > 0) {
      colormaps = colormapsToXrgbaColormaps(colormaps);
      this.xrgbaColorMaps = colormaps;
    } else {
      this.xrgbaColorMaps = [[
        [0, 0, 0, 0, 1],
        [1, 255, 255, 255, 1]
      ]] as IXrgbaColor[][];
    }
    ColorService.setGlobalColorWrappers(this.xrgbaColorMaps.map((colormap: IXrgbaColor[]) => colormapToColorWrapper(colormap)));
    window.onbeforeunload = () => {
      this.cleanUp(true);
    }
  }

  private cleanUp(clearSubjects: boolean = false) {

    ControlsService.cleanUp(clearSubjects);
    ColorService.cleanUp(clearSubjects);
    if(this.controls) {
      this.controls.cleanUp();
    }
    this.controls = undefined;
    console.log(this.layers);
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
    this.controls = new LeafletGlVectorLayerControls({colormaps: this.xrgbaColorMaps});
    this.controls.addTo(map);
    return this;
  }

  public addLayer(layer: LeafletGlVectorLayer) {
    layer.addTo(this.map);
    this.layers.push(layer);
    ControlsService.addLayer(layer);
    if(!ControlsService.selectedLayer) {
      ControlsService.selectLayer(layer);
    }
    return this;
  }
}