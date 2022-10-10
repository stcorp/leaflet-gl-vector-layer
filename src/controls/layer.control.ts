import * as L from 'leaflet';
import { LeafletGlVectorLayer } from '../leaflet-gl-vector-layer';
import { ControlsService } from '../services/controls-service';
import { Subject, Subscription } from 'rxjs';
import { IHandler } from '../types/handlers';

export class LayerControl {
  private container;
  private hideLayerSubject = new Subject<LeafletGlVectorLayer>();
  private showLayerSubject = new Subject<LeafletGlVectorLayer>();
  public hideLayer$ = this.hideLayerSubject.asObservable();
  public showLayer$ = this.showLayerSubject.asObservable();
  private handlers: IHandler[] = [];
  private subscriptions: Subscription[] = [];
  private layers: LeafletGlVectorLayer[] = [];
  private selectedLayer: LeafletGlVectorLayer|undefined;

  constructor(private controlsService: ControlsService) {
    this.container = L.DomUtil.create('div', 'layer-selection-container');
    let layerSelectionHeader = L.DomUtil.create('div', 'control-section-header', this.container);
    layerSelectionHeader.innerHTML = 'Select and show/hide layers';
    let layerCheckboxContainer = L.DomUtil.create('div', 'layer-checkbox-container', this.container);

    this.selectedLayer = this.controlsService.selectedLayer;
    this.layers = this.controlsService.getCurrentLayers();
    let currentLayerSubscription = this.controlsService.currentLayerSubject.subscribe((layers: LeafletGlVectorLayer[]) => {
      this.layers = layers;
      layerCheckboxContainer.replaceChildren();
      for(let i = 0; i < this.layers.length; i++) {
        this.createLayerToggleCheckbox(this.layers[i], i + 1, layerCheckboxContainer);
      }
    });
    let selectLayerSubscription = this.controlsService.selectLayerSubject.subscribe((layer: LeafletGlVectorLayer) => {
      this.selectedLayer = layer;
    });

    this.subscriptions.push(currentLayerSubscription);
    this.subscriptions.push(selectLayerSubscription);
  }

  public getContainer() {
    return this.container;
  }


  private createLayerToggleCheckbox(layer: LeafletGlVectorLayer, index: number, layerCheckboxContainer: HTMLElement) {
    let checkboxContainer = L.DomUtil.create('div', 'layer-selection-checkbox-container', layerCheckboxContainer);
    if(this.selectedLayer?.id === layer.id) {
      checkboxContainer.classList.add('selected');
    }
    let checkbox = L.DomUtil.create('input', 'layer-selection-checkbox-label', checkboxContainer);
    checkbox.type = 'checkbox';
    checkbox.id = layer.id;
    checkbox.checked = !layer.isHidden;
    let label = L.DomUtil.create('span', 'layer-selection-checkbox-label', checkboxContainer);
    label.innerHTML = `Layer ${index}`;

    let labelClickHandler = {
      element: label,
      func: (event: any) => {
        event.stopPropagation();
        this.controlsService.selectLayer(layer);
      },
      type: 'click'
    }
    this.handlers.push(labelClickHandler);
    labelClickHandler.element.addEventListener(labelClickHandler.type, labelClickHandler.func);

    let checkboxClickHandler = {
      element: checkbox,
      func: (event: any) => {
        if(event.currentTarget.checked) {
          this.showLayer(layer);
        } else {
          this.hideLayer(layer);
        }
      },
      type: 'change'
    }
    this.handlers.push(checkboxClickHandler);
    checkboxClickHandler.element.addEventListener(checkboxClickHandler.type, checkboxClickHandler.func)
  }

  private showLayer(layer: LeafletGlVectorLayer) {
    this.showLayerSubject.next(layer);
  }

  private hideLayer(layer: LeafletGlVectorLayer) {
    this.hideLayerSubject.next(layer);
  }

  public cleanUp() {
    for(let handler of this.handlers) {
      if(handler.element) {
        handler.element.removeEventListener(handler.type, handler.func);
      }
    }
    for(let subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.subscriptions = [];
    this.layers = [];
    this.handlers = [];
    this.selectedLayer = undefined;
    this.container.replaceChildren();
  }

}