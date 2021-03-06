import {LeafletGlVectorLayerControlWrapper} from "./leaflet-gl-vector-layer-controls-wrapper";
import {LeafletGlVectorLayerControl} from "./leaflet-gl-vector-layer-controls";
import LeafletGlVectorLayer from "./leaflet-gl-vector-layer";
import * as L from 'leaflet';
export class LeafletGlVectorLayerWrapper extends L.Layer {

  private layers: LeafletGlVectorLayer[] = [];
  public controlWrapper: LeafletGlVectorLayerControlWrapper;
  private selectedLayer: LeafletGlVectorLayer;
  public map: L.Map;

  constructor() {
    super();
  }

  public onAdd(map: L.Map) {
    this.addTo(map);
    return this;
  }

  public addTo(map: L.Map) {
    this.map = map;
    this.controlWrapper = new LeafletGlVectorLayerControlWrapper();
    this.controlWrapper.addTo(map);

    this.controlWrapper.subjects.control.subscribe({
      next: (control: LeafletGlVectorLayerControl) => {
        this.onLayerSelected(control.layer);
      }
    })
    return this;
  }

  public removeLayer(layer: any) {
    layer.onRemove(this.map);
    return this;
  }

  public cleanUpControlAndLayerData(layer: any) {
    let index = this.layers.findIndex((layer: any) => {
      return layer._leaflet_id === layer._leaflet_id;
    })
    this.controlWrapper.removeControl(layer.control);
    this.layers.splice(index, 1);
  }

  public addLayer(layer: LeafletGlVectorLayer) {
    layer.addTo(this.map);
    layer.wrapper = this;
    this.layers.push(layer);
    this.controlWrapper.addControl(layer.control)
    if(!this.selectedLayer) {
      this.onLayerSelected(layer);
    }
    return this;
  }

  private onLayerSelected(layer: LeafletGlVectorLayer) {
    this.selectedLayer = layer;
    // TODO: Commented this out for now, maybe we can add some effect with webgl
    // for(let layer of this.layers) {
    //   if(layer.id !== this.selectedLayer.id) {
    //     this.animateLayerOpacity(layer);
    //   } else {
    //     if(layer.canvas) {
    //       layer.canvas.style.opacity = "1";
    //     }
    //   }
    // }
  }

  private animateLayerOpacity(layer: LeafletGlVectorLayer) {
    if(layer.canvas) {
      layer.canvas.style.opacity = "0.3";
    }
    let interval = setInterval(() => {
      let opacity = parseFloat(layer.canvas.style.opacity);
      let newOpacity = opacity + 0.01;
      layer.canvas.style.opacity = newOpacity + '';
      if(newOpacity >= 1) {
        clearInterval(interval);
      }
    }, 20)

  }
}