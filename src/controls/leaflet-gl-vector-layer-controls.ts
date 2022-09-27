import * as L from 'leaflet';
import { IColorSlider } from "../types/color-slider";
import { ControlsService } from '../services/controls-service';
import { LeafletGlVectorLayer } from '../leaflet-gl-vector-layer';
import { Subscription } from 'rxjs';
import { ColorControl } from './color.control';
import { ColorMapControl, IColorMapWrapper } from './color-map.control';
import { LayerControl } from './layer.control';
import { ColorPickerDialogControl } from './color-picker-dialog.control';
import { ColorService } from '../services/color-service';
import { IroColor } from '@irojs/iro-core/dist/color';
import { IXrgbaColor } from '../types/colors';

interface ExtendedControlOptions extends L.ControlOptions {
  colormaps?: IXrgbaColor[][];
}

export class LeafletGlVectorLayerControls extends L.Control {
  private controlWrapperOuterContainer: HTMLElement;
  private controlWrapperInnerContainer: HTMLElement;
  private controlWrapperContentContainer: HTMLElement;
  private toggleButton: HTMLElement;
  private toggleButtonInner: HTMLElement;

  private mapContainer: HTMLElement|undefined;

  private colorControl: ColorControl;
  private colorMapControl: ColorMapControl;
  private layerControl: LayerControl;
  private colorPickerDialogControl: ColorPickerDialogControl;

  private layers: LeafletGlVectorLayer[] = [];
  private colorPickerSubscription: Subscription;
  public map: L.Map|undefined;
  private subscriptions: Subscription[] = [];

  constructor(public options: ExtendedControlOptions) {
    super();

    let colorSliderSubscription = ColorService.selectedColorSliderSubject.subscribe((colorSlider: IColorSlider) => {
      this.updateColorPicker(colorSlider);
    })

    let selectlayerSubscription = ControlsService.selectLayerSubject.subscribe((layer: LeafletGlVectorLayer) => {
      this.onLayerSelected(layer);
    });
    let addLayerSubscription = ControlsService.addLayerSubject.subscribe((layer: LeafletGlVectorLayer) => {
      this.onLayerAdded(layer);
    });

    let colorPickerDialogSubscription = ColorService.colorPickerDialogSubject.subscribe(data => {
      if(data.isOpen) {
        this.colorPickerDialogControl.show();
      } else {
        this.colorPickerDialogControl.hide();
      }
    })

    this.subscriptions.push(colorSliderSubscription, selectlayerSubscription, addLayerSubscription, colorPickerDialogSubscription);
  }

  public addTo(map: L.Map) {
    this.map = map;
    this.mapContainer = map.getContainer();
    let controlContainer = this.mapContainer.querySelector('.leaflet-control-container') as HTMLElement

    this.controlWrapperOuterContainer = L.DomUtil.create('div', 'control-wrapper-outer-container', controlContainer);
    this.controlWrapperInnerContainer = L.DomUtil.create('div', 'control-wrapper-inner-container', this.controlWrapperOuterContainer);
    this.controlWrapperContentContainer = L.DomUtil.create('div', 'control-wrapper-content-container', this.controlWrapperInnerContainer);
    this.controlWrapperInnerContainer.addEventListener('wheel', (event: any) => {
      event.stopPropagation();
    })
    this.toggleButton = L.DomUtil.create('div', 'toggle-button main-toggle', this.controlWrapperOuterContainer);
    this.toggleButtonInner = L.DomUtil.create('div', 'toggle-button-inner main-toggle-inner', this.toggleButton);
    this.createColorDialogControl();
    this.addStaticEventListeners();
    return this;
  }

  private createColorDialogControl() {
    this.colorPickerDialogControl = new ColorPickerDialogControl();
    this.colorPickerDialogControl.attachTo(this.controlWrapperOuterContainer);
    let colorPickerDialogControlSubscription = this.colorPickerDialogControl.toggled$.subscribe((data: {isOpen: boolean, cancel: boolean}) => {
      if(data.isOpen) {
        ColorService.openColorPickerDialog();
      } else {
        ColorService.closeColorPickerDialog(data.cancel);
      }
    })
    let colorChangedSubscription = this.colorPickerDialogControl.colorChanged$.subscribe((color: IroColor) => {
      ColorService.changeColor(color);
    })

    this.subscriptions.push(colorPickerDialogControlSubscription, colorChangedSubscription);
  }

  private updateColorPicker(colorSlider: IColorSlider) {
    let colorString = this.getRgbaString(colorSlider.colorWrapper.color);
    this.colorPickerDialogControl.setColors([colorString])
  }

  private getRgbaString(rgbaArray: number[]) {
    let colorArray = rgbaArray;
    if(rgbaArray.length === 3 ) {
      colorArray.push(1.0);
    }
    return `rgba(${colorArray.join(',')})`;
  }

  public onLayerSelected(layer: LeafletGlVectorLayer) {
    if(this.colorPickerSubscription) {
      this.colorPickerSubscription.unsubscribe();
    }
    this.cleanUpDynamicControls();

    this.controlWrapperContentContainer.replaceChildren();
    this.createDynamicControls();
  }

  public cleanUp() {
    this.cleanUpDynamicControls();
    for(let subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.colorControl.cleanUp();
    this.subscriptions = [];
    this.mapContainer = undefined;
    this.map = undefined;
    this.layers = [];
    this.controlWrapperOuterContainer.replaceChildren();
  }

  private cleanUpDynamicControls() {
    if(this.colorControl) {
      this.colorControl.cleanUp();
    }
    if(this.colorMapControl) {
      this.colorMapControl.cleanUp();
    }
    if(this.layerControl) {
      this.layerControl.cleanUp();
    }
  }

  private createDynamicControls() {
    this.createColorControl();
    this.createColorMapControl();
    this.createLayerControl();
  }

  public onLayerAdded(layer: LeafletGlVectorLayer) {
    this.layers.push(layer);
  }


  private createLayerControl() {
    this.layerControl = new LayerControl();
    this.layerControl.showLayer$.subscribe((layer: LeafletGlVectorLayer) => {
      ControlsService.showLayer(layer);
    })
    this.layerControl.hideLayer$.subscribe((layer: LeafletGlVectorLayer) => {
      ControlsService.hideLayer(layer);
    })
    this.controlWrapperContentContainer.appendChild(this.layerControl.getContainer());
  }

  private createColorMapControl() {
    let defaultColorMap = ControlsService.getOptions()?.colormap;
    this.colorMapControl = new ColorMapControl({
      colormaps: this.options.colormaps,
      defaultColorMap
    });
    this.colorMapControl.colorMap$.subscribe((colorMap: IColorMapWrapper|undefined) => {
      ColorService.selectColorMap(colorMap);
    });

    this.controlWrapperContentContainer.appendChild(this.colorMapControl.getContainer());
  }

  private createColorControl() {
    this.colorControl = new ColorControl()
    this.colorControl.dataRangeReset$.subscribe(() => {
      this.colorPickerDialogControl.hide();
      if(ControlsService.selectedLayer) {
        ControlsService.setLimits({
          min: ControlsService.selectedLayer.dataHelper.minValue,
          max: ControlsService.selectedLayer.dataHelper.maxValue
        });
      } else {
        console.warn('No layer selected, limits could not be set');
      }

    });
    this.colorControl.limits$.subscribe((data: {type: 'min'|'max', value: number}) => {
      if(ControlsService.selectedLayer) {
        ControlsService.selectedLayer.dataHelper.setValue(data.type, data.value);
        ControlsService.setLimits({
          min: ControlsService.selectedLayer.dataHelper.currentMinValue,
          max: ControlsService.selectedLayer.dataHelper.currentMaxValue
        });
      } else {
        console.warn('No layer selected, colors could not be set');
      }

    });
    this.controlWrapperContentContainer.appendChild(this.colorControl.getContainer());
  }

  private addStaticEventListeners() {
    L.DomEvent.disableClickPropagation(this.controlWrapperInnerContainer);
    L.DomEvent.disableClickPropagation(this.toggleButton);


    this.toggleButton?.addEventListener('click', (event) => {
      this.colorPickerDialogControl.hide();
      this.toggleButton.classList.toggle('toggled');
      this.controlWrapperInnerContainer.classList.toggle('show');
    })
  }

  public onRemove() {
      this.controlWrapperOuterContainer.replaceChildren();
      this.controlWrapperOuterContainer.remove();
      this.toggleButton.remove();
  }
}
