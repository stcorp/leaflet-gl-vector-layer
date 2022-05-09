import chroma from 'chroma-js';
import * as L from 'leaflet';
import iro from '@jaames/iro';
import {LeafletGlVectorLayerControl} from "./leaflet-gl-vector-layer-controls";
import {Subject} from "rxjs";
import {IColorSlider} from "./types/color-slider";
import { guidGenerator } from './helpers/guid-generator';

interface IPredefinedColorWrapper {
  value: number,
  color: number[]
}

interface IColorMapWrapper {
  colorWrappers: IPredefinedColorWrapper[];
  colorMapElement: HTMLElement;
  id: string;
}

export class LeafletGlVectorLayerControlWrapper extends L.Control {
  private controlWrapperOuterContainer: HTMLElement;
  private controlWrapperTabContainer: HTMLElement;
  private controlWrapperInnerContainer: HTMLElement;
  private controlWrapperContentContainer: HTMLElement;
  private toggleButton: HTMLElement;
  private toggleButtonInner: HTMLElement;
  private resetButton: HTMLElement;
  private resetButtonInner: HTMLElement;
  private infoButton: HTMLElement;
  private infoButtonInner: HTMLElement;
  private infoContainer: HTMLElement;
  private infoContainerContent: HTMLElement;
  private colorPickerDialogButtonContainer: HTMLElement;
  private colorPickerDialogCancelButton: HTMLElement;
  private colorPickerDialogSubmitButton: HTMLElement;
  private colorPickerContainer: HTMLElement;
  public colorPicker: any;

  public controls: LeafletGlVectorLayerControl[];
  private selectedControl: LeafletGlVectorLayerControl;
  private mapContainer: HTMLElement;

  private colorMapDropdownContainer: HTMLDivElement;
  private colorMapDropdownToggle: HTMLDivElement;
  private colorMapDropdownToggleInner: HTMLDivElement;
  private colorMapWrappers: IColorMapWrapper[] = [];
  public map: L.Map;
  private tabs: HTMLElement[] = [];

  public subjects = {
    control: new Subject<LeafletGlVectorLayerControl>()
  }

  constructor() {
    super();
    this.controls = [];
  }

  public addTo(map: L.Map) {
    this.map = map;
    this.mapContainer = map.getContainer();
    let controlContainer = this.mapContainer.querySelector('.leaflet-control-container') as HTMLElement

    this.controlWrapperOuterContainer = L.DomUtil.create('div', 'control-wrapper-outer-container', controlContainer);
    this.controlWrapperInnerContainer = L.DomUtil.create('div', 'control-wrapper-inner-container', this.controlWrapperOuterContainer);
    this.controlWrapperTabContainer = L.DomUtil.create('div', 'control-wrapper-tab-container', this.controlWrapperInnerContainer);
    this.controlWrapperContentContainer = L.DomUtil.create('div', 'control-wrapper-content-container', this.controlWrapperInnerContainer);

    this.toggleButton = L.DomUtil.create('div', 'toggle-button main-toggle', this.controlWrapperOuterContainer);
    this.toggleButtonInner = L.DomUtil.create('div', 'toggle-button-inner main-toggle-inner', this.toggleButton);

    this.resetButton = L.DomUtil.create('div', 'toggle-button reset-button', this.controlWrapperOuterContainer);
    this.resetButtonInner = L.DomUtil.create('div', 'toggle-button-inner reset-button-inner', this.resetButton);

    this.infoContainer = L.DomUtil.create('div', 'info-container', this.controlWrapperOuterContainer);
    this.infoContainerContent = L.DomUtil.create('div', 'info-container-content', this.infoContainer);
    this.infoButton = L.DomUtil.create('div', 'info-button toggle-button', this.controlWrapperOuterContainer);
    this.infoButtonInner = L.DomUtil.create('div', 'info-button-inner toggle-button-inner', this.infoButton);

    this.colorPickerContainer = L.DomUtil.create('div', 'color-picker-dialog color-picker-container', this.controlWrapperOuterContainer);

    let colorPickerElement = L.DomUtil.create('div', 'color-picker', this.colorPickerContainer)
    let id = `color-picker-${guidGenerator()}`;
    colorPickerElement.id = id;

    this.colorPicker = new (iro.ColorPicker as any)(`#${id}`, {
      width: 150,
      borderWidth: 2,
      borderColor: '#343434',
      layout: [
        {
          component: iro.ui.Wheel
        },
        {
          component: iro.ui.Slider,
          options: {
            sliderType: 'alpha'
          }
        },
        {
          component: iro.ui.Slider,
          options: {
            sliderType: 'value'
          }
        }
      ]
    });

    this.colorPickerDialogButtonContainer = L.DomUtil.create('div', 'color-picker-dialog-button-container', this.colorPickerContainer);
    this.colorPickerDialogCancelButton = L.DomUtil.create('div', 'color-picker-dialog-button cancel', this.colorPickerDialogButtonContainer);
    this.colorPickerDialogSubmitButton = L.DomUtil.create('div', 'color-picker-dialog-button success', this.colorPickerDialogButtonContainer);
    this.createColorMapDialog();

    this.addEventListeners();

    return this;
  }

  public removeControl(controlToRemove: LeafletGlVectorLayerControl) {
    let index = this.controls.findIndex(control => {
      return control.id === controlToRemove.id
    });
    if (index > -1) {
      if(controlToRemove.id === this.selectedControl.id) {
        let firstUnselectedControl = this.controls.find(control => {
          return control.id !== controlToRemove.id
        });
        if(firstUnselectedControl) {
          this.selectControl(firstUnselectedControl);
        }
      }
      this.controls.splice(index, 1);
      this.removeTab(index)
    }
  }

  public removeTab(index: number) {
    let tab = this.tabs[index];
    this.tabs.splice(index, 1);
    this.controlWrapperTabContainer.removeChild(tab)
  }

  public addControl(control: LeafletGlVectorLayerControl, layerName?: string) {
    this.controls.push(control);

    control.subjects.selectedColorSlider.subscribe(colorSlider => {
      this.updateColorPicker(colorSlider);
    })

    control.subjects.colorMapDialog.subscribe(isOpen => {
      this.toggleColorPickerDialog(isOpen)
    })

    let tab = this.createTab(control, layerName);
    this.tabs.push(tab);

    this.tabs[0].classList.add('active');
    if(!this.selectedControl) {
      this.selectControl(control);
    } else {
      control.onAdd();
    }
  }

  private updateColorPicker(colorSlider: IColorSlider) {
    let colorString = this.getRgbaString(colorSlider.colorWrapper.color);
    this.colorPicker.setColors([colorString])
  }

  private getRgbaString(rgbaArray: number[]) {
    let colorArray = rgbaArray;
    if(rgbaArray.length === 3 ) {
      colorArray.push(1.0);
    }
    return `rgba(${colorArray.join(',')})`;
  }

  private createTab(control: LeafletGlVectorLayerControl, layerName?: string) {
    let tab = L.DomUtil.create('div', 'control-wrapper-tab', this.controlWrapperTabContainer);
    tab.innerHTML = layerName ?? 'Layer ' + this.controls.length;
    L.DomEvent.on(tab, 'click', () => {
      this.onTabClicked(control, tab);
    });
    return tab;
  }

  private onTabClicked(control: LeafletGlVectorLayerControl, tab: HTMLElement) {
    this.selectControl(control);
    for(let tab of this.tabs) {
      tab.classList.remove('active');
    }
    tab.classList.add('active');
  }

  public selectControl(control: LeafletGlVectorLayerControl) {
    this.selectedControl = control;
    this.subjects.control.next(control);
    this.controlWrapperContentContainer.replaceChildren();
    this.controlWrapperContentContainer.appendChild(this.selectedControl.initialize(this.map, this.mapContainer));
    this.infoContainerContent.innerHTML =
      `<div class="info-container-content">
             <div class="info-container-content-row">
               <div class="info-container-content-value median"><b>Median:</b> ${this.selectedControl.layer.dataHelper.median}</div>
             </div>
             <div class="info-container-content-row">
               <div class="info-container-content-value median"><b>Mean:</b> ${this.selectedControl.layer.dataHelper.mean}</div>
             </div>
          </div>`
    control.onSelected();
  }


  private createColorMapDialog() {
    this.colorMapDropdownContainer = L.DomUtil.create('div', 'color-map-dropdown-container', this.controlWrapperOuterContainer);
    this.colorMapDropdownToggle = L.DomUtil.create('div', 'toggle-button color-map-dropdown-toggle', this.controlWrapperOuterContainer);
    this.colorMapDropdownToggleInner = L.DomUtil.create('div', 'toggle-button-inner color-map-dropdown-toggle-inner', this.colorMapDropdownToggle);
    let dropdownInner = L.DomUtil.create('div', 'color-map-dropdown-container-inner', this.colorMapDropdownContainer);
    let colorMapKeys = Object.keys(chroma.brewer).slice(0, 16);
    for(let i = 0; i < colorMapKeys.length - 1; i += 2) {
      let row = L.DomUtil.create('div', 'single-color-map-row', dropdownInner);
      let colorMapElement1 = L.DomUtil.create('div', 'single-color-map', row);
      colorMapElement1.id = guidGenerator();
      let colorMapElement2 = L.DomUtil.create('div', 'single-color-map', row);
      let colorMap1 = (chroma.brewer as any)[colorMapKeys[i]];
      let colorMap2 = (chroma.brewer as any)[colorMapKeys[i+1]];

      colorMapElement1.style.background = this.createGradientString(colorMap1);
      colorMapElement2.style.background = this.createGradientString(colorMap2);
      let colorMapWrapper1 = this.createColorMapWrapper(colorMap1, colorMapElement1);
      let colorMapWrapper2 = this.createColorMapWrapper(colorMap2, colorMapElement2);

      colorMapElement1.addEventListener('click', (event: MouseEvent) => {
        this.onColorMapClick(colorMapWrapper1);
      })
      colorMapElement2.addEventListener('click', (event: MouseEvent) => {
        this.onColorMapClick(colorMapWrapper2);
      })
    }
  }

  private guidGenerator() {
    var S4 = function() {
      return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
  }

  private createGradientString(colors: string[]) {
    let linearGradientString = 'linear-gradient(to right';
    for(let i = 0; i < colors.length; i++) {
      let suffix = `, ${colors[i]} ${(i/colors.length) * 100}%`
      linearGradientString += suffix;
    }
    return linearGradientString;
  }

  private createColorMapWrapper(colors: string[], colorMapElement: HTMLElement) {
    let colorWrappers: IPredefinedColorWrapper[] = [];
    for(let i = 0; i < colors.length; i++) {
      let color = chroma(colors[i]).rgba();
      let colorWrapper: IPredefinedColorWrapper = {
        value: i / colors.length,
        color
      }
      colorWrappers.push(colorWrapper);
    }
    let colorMapWrapper: IColorMapWrapper = {
      colorMapElement: colorMapElement,
      id: colorMapElement.id,
      colorWrappers
    }
    this.colorMapWrappers.push(colorMapWrapper);
    return colorMapWrapper;
  }

  private onColorMapClick(colorMapWrapper: IColorMapWrapper) {
    this.selectedControl.onColorMapChange(colorMapWrapper);
  }

  private addEventListeners() {
    L.DomEvent.disableClickPropagation(this.controlWrapperInnerContainer);
    L.DomEvent.disableClickPropagation(this.colorPickerContainer);
    L.DomEvent.disableClickPropagation(this.toggleButton);
    L.DomEvent.disableClickPropagation(this.colorMapDropdownToggle);

    this.infoButton.addEventListener('click', (event: MouseEvent) => {
      this.toggleInfoContainer();
    })

    this.resetButton.addEventListener('click', (event: MouseEvent) => {
      this.hideDialogs();
      this.reset();
    })

    this.colorPickerDialogSubmitButton.addEventListener('click', (event: MouseEvent) => {
      this.toggleColorPickerDialog(false);
    })

    this.colorPickerDialogCancelButton.addEventListener('click', (event: MouseEvent) => {
      this.toggleColorPickerDialog(false, true);
    })


    this.toggleButton?.addEventListener('click', (event) => {
      this.hideDialogs();
      this.toggleButton.classList.toggle('toggled');
      this.colorMapDropdownToggle.classList.toggle('toggled');
      this.infoButton.classList.toggle('toggled');
      this.resetButton.classList.toggle('toggled');
      this.controlWrapperInnerContainer.classList.toggle('show');
    })

    this.colorMapDropdownToggle.addEventListener('click', (event: MouseEvent) => {
      this.showColorMapDropdown();
    })

    this.colorMapDropdownContainer.addEventListener('click', (event: MouseEvent) => {
      event.stopPropagation();
    });

    this.colorPicker?.on('color:change', (color: any) => {
      this.selectedControl.onColorPickerChange(color);
    });

    this.map.on('click', (event: any) => {
      this.colorMapDropdownContainer.classList.remove('show');
    });
  }

  private toggleInfoContainer() {
      this.infoContainer.classList.toggle('show');
      let parentLeft = this.infoButton.offsetLeft;
      let parentTop = this.infoButton.offsetTop;
      let dialogBounds = this.infoContainer?.getBoundingClientRect() as DOMRect;
      this.infoContainer!.style.left = (parentLeft - dialogBounds.width) + 'px';
      this.infoContainer!.style.top = parentTop - dialogBounds.height + 'px';
  }

  private showColorMapDropdown() {
      this.colorMapDropdownContainer!.classList.toggle('show');
      let parentLeft = this.colorMapDropdownToggle.offsetLeft;
      let parentTop = this.colorMapDropdownToggle.offsetTop;
      let dialogBounds = this.colorMapDropdownContainer?.getBoundingClientRect() as DOMRect;
      this.colorMapDropdownContainer!.style.left = (parentLeft - dialogBounds.width + 10) + 'px';
      this.colorMapDropdownContainer!.style.top = parentTop - dialogBounds.height - 10 + 'px';
  }

  public onRemove() {
      this.controlWrapperOuterContainer.replaceChildren();
      this.controlWrapperOuterContainer.remove();
      this.colorMapDropdownToggle.remove();
      this.resetButton.remove();
      this.toggleButton.remove();
    }

  private hideDialogs() {
    this.colorMapDropdownContainer.classList.remove('show');
    this.colorPickerContainer.classList.remove('show');
    this.infoContainer.classList.remove('show');
  }

  private reset() {
    this.selectedControl.reset();
  }

  private toggleColorPickerDialog(show: boolean, reset: boolean = false) {
    if(!show) {
      this.selectedControl.onColorPickerDialogClose(reset);
      this.colorPickerContainer!.classList.toggle('show');

    } else {
      this.colorPickerContainer!.classList.toggle('show');
      let parentBounds = this.controlWrapperInnerContainer.querySelector('.color-input-inner')?.getBoundingClientRect() as DOMRect;
      let dialogBounds = this.colorPickerContainer?.getBoundingClientRect() as DOMRect;
      let parentTop = this.controlWrapperInnerContainer.offsetTop;
      this.colorPickerContainer!.style.left = 20 + 'px';
      let calculatedHeight = parentTop - dialogBounds.height;
      this.colorPickerContainer!.style.top = calculatedHeight < 0 ? 0 + 'px' : calculatedHeight + 'px';
    }

  }
}
