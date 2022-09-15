import { LeafletGlVectorLayer } from "./leaflet-gl-vector-layer";
import * as L from 'leaflet';
import { ControlsService } from './services/controls-service';
import { LeafletGlVectorLayerControls } from './controls/leaflet-gl-vector-layer-controls';
import { ColorService } from './services/color-service';
export class LeafletGlVectorLayerWrapper extends L.Layer {

  private layers: LeafletGlVectorLayer[] = [];
  public controls: LeafletGlVectorLayerControls|undefined;
  public map: L.Map;
  constructor() {
    super();
    window.onbeforeunload = () => {

      ControlsService.cleanUp();
      ColorService.cleanUp();
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
    this.controls = new LeafletGlVectorLayerControls();
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