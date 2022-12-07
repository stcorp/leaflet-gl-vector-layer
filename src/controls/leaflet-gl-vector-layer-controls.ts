import * as L from 'leaflet';
import { ControlsService } from '../services/controls-service';
import { LeafletGlVectorLayer } from '../leaflet-gl-vector-layer';
import { Subscription } from 'rxjs';
import { ColorControl } from './color.control';
import { ColorMapControl, IColorMapWrapper } from './color-map.control';
import { LayerControl } from './layer.control';
import { ColorPickerDialogControl } from './color-picker-dialog.control';
import { ColorService, IColorSlider } from '../services/color-service';
import { IroColor } from '@irojs/iro-core/dist/color';
import debounce from 'lodash/debounce';

export class LeafletGlVectorLayerControls extends L.Control {
  private controlWrapperOuterContainer: HTMLElement;
  public controlWrapperInnerContainer: HTMLElement;
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
  private debouncedOnToggleClick: any;

  constructor(private controlsService: ControlsService, private colorService: ColorService) {
    super();
    this.debouncedOnToggleClick = debounce(this.onToggleClick.bind(this), 10);

    let colorSliderSubscription = this.colorService.selectedColorSliderSubject.subscribe((colorSlider: IColorSlider) => {
      this.updateColorPicker(colorSlider);
    })

    let selectlayerSubscription = this.controlsService.selectLayerSubject.subscribe((layer: LeafletGlVectorLayer) => {
      this.onLayerSelected();
    });
    let addLayerSubscription = this.controlsService.addLayerSubject.subscribe((layer: LeafletGlVectorLayer) => {
      this.onLayerAdded(layer);
    });

    let colorPickerDialogSubscription = this.colorService.colorPickerDialogSubject.subscribe(data => {
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
    this.onLayerSelected();
    return this;
  }

  private createColorDialogControl() {
    this.colorPickerDialogControl = new ColorPickerDialogControl();
    this.colorPickerDialogControl.attachTo(this.controlWrapperOuterContainer);
    let colorPickerDialogControlSubscription = this.colorPickerDialogControl.toggled$.subscribe((data: {isOpen: boolean, cancel: boolean}) => {
      if(data.isOpen) {
        this.colorService.openColorPickerDialog();
      } else {
        this.colorService.closeColorPickerDialog(data.cancel);
      }
    })
    let colorChangedSubscription = this.colorPickerDialogControl.colorChanged$.subscribe((color: IroColor) => {
      this.colorService.changeColor(color);
    })

    this.subscriptions.push(colorPickerDialogControlSubscription, colorChangedSubscription);
  }

  private updateColorPicker(colorSlider: IColorSlider) {
    let colorString = this.getRgbaString(colorSlider.edgePoint.color);
    this.colorPickerDialogControl.setColors([colorString])
  }

  private getRgbaString(rgbaArray: number[]) {
    let colorArray = rgbaArray;
    if(rgbaArray.length === 3 ) {
      colorArray.push(1.0);
    }
    return `rgba(${colorArray.join(',')})`;
  }

  public onLayerSelected() {
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
    let selectedColorCollection = this.colorService.getSelectedColorCollection();
    if(selectedColorCollection) {
      this.colorService.selectColorMap(selectedColorCollection.xrgbaColormap);
    }
  }

  public onLayerAdded(layer: LeafletGlVectorLayer) {
    this.layers.push(layer);
  }


  private createLayerControl() {
    this.layerControl = new LayerControl(this.controlsService);
    this.layerControl.showLayer$.subscribe((layer: LeafletGlVectorLayer) => {
      this.controlsService.showLayer(layer);
    })
    this.layerControl.hideLayer$.subscribe((layer: LeafletGlVectorLayer) => {
      this.controlsService.hideLayer(layer);
    })
    this.controlWrapperContentContainer.appendChild(this.layerControl.getContainer());
  }

  private createColorMapControl() {
    let colormaps = this.colorService.getAllColorCollections();
    this.colorMapControl = new ColorMapControl({
      colormaps: colormaps.slice(1).map(map => map.xrgbaColormap),
      defaultColorMap: colormaps[0].xrgbaColormap
    });

    this.colorMapControl.colorMap$.subscribe((colorMapWrapper: IColorMapWrapper) => {
      this.colorService.selectColorMap(colorMapWrapper.colors);
    });
    this.controlWrapperContentContainer.appendChild(this.colorMapControl.getContainer());

  }

  private createColorControl() {
    this.colorControl = new ColorControl(this.controlsService, this.colorService)
    this.colorControl.dataRangeReset$.subscribe(() => {
      this.colorPickerDialogControl.hide();
      if(this.controlsService.selectedLayer) {
        this.controlsService.setLimits({
          min: this.controlsService.selectedLayer.dataHelper.minValue,
          max: this.controlsService.selectedLayer.dataHelper.maxValue
        });
      } else {
        console.warn('No layer selected, limits could not be set');
      }

    });
    this.colorControl.limits$.subscribe((data: {type: 'min'|'max', value: number}) => {
      if(this.controlsService.selectedLayer) {
        this.controlsService.selectedLayer.dataHelper.setValue(data.type, data.value);
        this.controlsService.setLimits({
          min: this.controlsService.selectedLayer.dataHelper.currentMinValue,
          max: this.controlsService.selectedLayer.dataHelper.currentMaxValue
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


    this.toggleButton?.addEventListener('click', this.debouncedOnToggleClick.bind(this));
  }

  private onToggleClick() {
    this.colorPickerDialogControl.hide();
    this.toggleButton.classList.toggle('toggled');
    this.controlWrapperInnerContainer.classList.toggle('show');
  }

  public onRemove() {
      this.controlWrapperOuterContainer.replaceChildren();
      this.controlWrapperOuterContainer.remove();
      this.toggleButton.remove();
  }
}
