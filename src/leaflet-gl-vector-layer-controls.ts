import chroma from 'chroma-js';
import * as L from 'leaflet';
import { Subject } from 'rxjs';

import {LeafletGlVectorLayer} from "./leaflet-gl-vector-layer";
import {IColorSlider, IColorWrapper} from "./types/color-slider";
import { guidGenerator } from './helpers/guid-generator';
import {IData} from "./types/data";
import {getColor, partial} from "./helpers/color-map-names";



interface IPredefinedColorWrapper {
  value: number,
  color: number[]
}

interface IColorMapWrapper {
  colorWrappers: IPredefinedColorWrapper[];
  colorMapElement: HTMLElement;
  id: string;
}

export class LeafletGlVectorLayerControl {

  public colorWrappers: IColorWrapper[] = [];
  public colorSliders: IColorSlider[] = [];
  public gradient: chroma.Scale|undefined;
  private map: L.Map;
  private mapContainer: HTMLElement;
  private innerContainer: HTMLElement;
  private colorMapContainer: HTMLElement;
  private gradientContainer: HTMLElement;
  private gradientElement: HTMLElement;
  private colorInputContainer: HTMLElement;
  private colorInput: HTMLElement
  private normalizingContainer: HTMLElement;
  private normalizingContainerInput1: HTMLInputElement;
  private normalizingContainerInput2: HTMLInputElement;

  private gradientStopDeleteButton: HTMLDivElement;
  private normalizingValueContainer: HTMLDivElement;

  private draggedSlider: HTMLElement|null;
  private selectedColorSlider: IColorSlider|null;
  private COLOR_SLIDER_WIDTH: number = 20;
  private previousStopColor: number[]|null|undefined;
  private data: IData;
  public subjects = {
    selectedColorSlider: new Subject<IColorSlider>(),
    colorMapDialog: new Subject<boolean>(),
    gradient: new Subject<chroma.Scale|undefined|null>(),
    updateLimits: new Subject<{ min: number, max: number }>()
  };

  public id: string;

  constructor(public layer: LeafletGlVectorLayer) {
    this.id = guidGenerator();
    this.data = layer.options.leafletGlVectorLayerOptions.data;
  }

  public initialize(map: L.Map, mapContainer: HTMLElement) {
    this.map = map;
    this.mapContainer = mapContainer;
    this.innerContainer = L.DomUtil.create('div', 'data-control-container-inner');
    this.colorMapContainer = L.DomUtil.create('div', 'color-map-container', this.innerContainer);
    this.colorInputContainer = L.DomUtil.create('div', 'color-input-container', this.colorMapContainer);
    this.colorInput = L.DomUtil.create('div', 'color-input-inner', this.colorInputContainer)
    this.gradientStopDeleteButton = L.DomUtil.create('div', 'gradient-stop-delete-button disabled', this.colorInputContainer)

    this.gradientContainer = L.DomUtil.create('div', 'gradient-container', this.colorMapContainer);
    this.gradientElement = L.DomUtil.create('div', 'gradient-element', this.gradientContainer);

    this.normalizingContainer = L.DomUtil.create('div', 'normalizing-container', this.colorMapContainer);
    this.normalizingValueContainer = L.DomUtil.create('div', 'normalizing-value-container', this.normalizingContainer);
    L.DomUtil.create('div', 'normalizing-value-container-filler', this.normalizingValueContainer);
    this.normalizingContainerInput1 = L.DomUtil.create('input', 'normalizing-container-input', this.normalizingContainer);

    for(let i = 0; i < 3; i++) {
      let container = L.DomUtil.create('div', 'gradient-marker-container', this.normalizingValueContainer);
      L.DomUtil.create('div', 'gradient-marker-arrow', container).innerHTML = '|';
      L.DomUtil.create('div', 'gradient-marker-value', container);
    }
    L.DomUtil.create('div', 'normalizing-value-container-filler', this.normalizingValueContainer);

    this.normalizingContainerInput2 = L.DomUtil.create('input', 'normalizing-container-input', this.normalizingContainer);

    this.normalizingContainerInput1.type = 'number';
    this.normalizingContainerInput2.type = 'number';
    this.normalizingContainerInput1.value = String(this.layer.dataHelper.currentMinValue);
    this.normalizingContainerInput2.value = String(this.layer.dataHelper.currentMaxValue);

    return this.innerContainer;
  }

  public onAdd() {
    this.initColorWrappers();
  }

  public onSelected() {
    this.initColorWrappers();
    this.initColorSliders();
    this.updateNormalizingMarkers();
    this.addEventListeners();
    this.updateGradientAndGradientElement();
  }

  public initColorWrappers() {
    if(!this.colorWrappers.length) {
      this.handleDefaultColorMap();
    }
    this.updateGradient();
    this.subjects.gradient.next(this.gradient);
  }

  private handleDefaultColorMap() {
    let defaultColorMap = this.layer.options.leafletGlVectorLayerOptions.colormap;
    if(defaultColorMap) {
      if(Array.isArray(defaultColorMap)) {
        for(let i = 0; i < defaultColorMap.length; i++) {
          let rgbaColor = this.getRgbaColorFromNormalizedColor(defaultColorMap[i]);
          this.createColorWrapper(rgbaColor[0], rgbaColor.slice(1, rgbaColor.length), i)
        }
      } else if(typeof defaultColorMap === 'string') {
        try {
          let defaultColors = getColor(defaultColorMap);
          for(let i = 0; i < defaultColors.length; i++) {
            this.createColorWrapper(defaultColors[i][0], defaultColors[i].slice(1, defaultColors[i].length), i)
          }
        } catch(e) {
          throw(e);
        }
      } else {
        throw('Invalid colormap format');
      }
    } else {
      this.createColorWrapper(0, [255, 255, 255, 1], 0)
      this.createColorWrapper(1, [0, 0, 0, 1], 1)
    }

  }

  // Normalized color is in format (x, r, g, b, a) where x is the position of the color in the gradient, and
  // r, g, b, a are the rgba values of the color in the range 0..1
  private getRgbaColorFromNormalizedColor(normalizedColor: number[]) {
    return [
      normalizedColor[0],
      Math.round(normalizedColor[1] * 255),
      Math.round(normalizedColor[2] * 255),
      Math.round(normalizedColor[3] * 255),
      normalizedColor[4]
    ]
  }

  private createColorWrapper(value: number|string, color: number[], index: number): IColorWrapper {
    if(typeof value === 'string') {
      value = parseFloat(value);
    }
    let newColorWrapper: IColorWrapper = {
      color,
      value
    }
    this.colorWrappers.splice(index, 0, newColorWrapper);
    return newColorWrapper;
  }
  public initColorSliders() {
    for(let i = 0; i < this.colorWrappers.length; i++) {
      this.insertColorSlider(this.colorWrappers[i], i);
    }
    this.selectedColorSlider = this.colorSliders[0];

  }

  public onColorMapChange(colorMapWrapper: IColorMapWrapper) {
    this.deleteExistingSliders();
    this.colorWrappers = [];
    this.colorSliders = [];
    this.selectedColorSlider = null;
    for(let i = 0; i < colorMapWrapper.colorWrappers.length; i++) {
      let wrapper = colorMapWrapper.colorWrappers[i];
      let newColorWrapper = {
        color: wrapper.color,
        value: wrapper.value
      };
      this.colorWrappers.splice(i, 0, newColorWrapper);
      this.insertColorSlider(newColorWrapper, i);
    }
    this.selectedColorSlider = this.colorSliders[0];
    this.updateGradientAndGradientElement();
    this.subjects.gradient.next(this.gradient);

  }

  private addEventListeners() {
    this.gradientStopDeleteButton.addEventListener('click', (event: MouseEvent) => {
      if(this.colorWrappers.length <= 2) {
        return;
      }
      if(this.selectedColorSlider) {
        this.deleteGradientSlider(this.selectedColorSlider);
        this.subjects.gradient.next(this.gradient);
      }
    })

    this.innerContainer!.addEventListener('mousemove', (event) => {
      if(!this.draggedSlider || !this.selectedColorSlider) {
        return;
      } else {
        let bbox = this.gradientContainer!.getBoundingClientRect();
        let left = Math.max(Math.min(event.clientX - bbox.x - (this.COLOR_SLIDER_WIDTH / 2), this.gradientContainer!.clientWidth - (this.COLOR_SLIDER_WIDTH / 2)), -(this.COLOR_SLIDER_WIDTH / 2));
        let newPercentage = Math.max((left + -this.COLOR_SLIDER_WIDTH/2) / this.gradientContainer!.clientWidth, 0);
        this.draggedSlider.style.left = left + 'px';
        this.selectedColorSlider.colorWrapper.value = newPercentage;
        this.colorWrappers.sort(item => {
          return item.value;
        })
        this.updateGradientAndGradientElement();
      }
    })

    document.addEventListener('mouseup', (event) => {
      if(this.draggedSlider) {
        this.updateGradient();
        this.subjects.gradient.next(this.gradient);
      }
      this.draggedSlider = null;
    })

    this.gradientContainer!.addEventListener('dblclick', (event: any) => {
      let bbox = this.gradientContainer!.getBoundingClientRect();
      let percentage = (event.clientX - bbox.x) / bbox.width;
      this.addNewColor(percentage);
    })

    this.colorInput?.addEventListener('click', (event: MouseEvent) => {
      this.previousStopColor = this.selectedColorSlider?.colorWrapper?.color;
      this.subjects.colorMapDialog.next(true);
    })

    this.normalizingContainerInput1?.addEventListener('change', this.onNormalizingContainerInputChange.bind(this, 'currentMinValue'));

    this.normalizingContainerInput2?.addEventListener('change', this.onNormalizingContainerInputChange.bind(this, 'currentMaxValue'));
  }

  public onColorPickerChange(color: any) {
    let colorArray = [color.rgba.r, color.rgba.g, color.rgba.b, color.rgba.a];
    if(this.selectedColorSlider) {
      this.selectedColorSlider.colorWrapper.color = colorArray;
    }
    let colorString = this.getRgbaString(colorArray)
    this.colorInput!.style.background = colorString;
    let innerSliderElement = this.selectedColorSlider!.slider.querySelector('.color-slider-inner') as HTMLElement;
    innerSliderElement!.style.background = colorString;
    this.updateGradientAndGradientElement();
  }

  public reset() {
    this.deleteExistingSliders();
    this.colorWrappers = [];
    this.colorSliders = [];
    this.initColorWrappers();
    this.initColorSliders();
    this.updateGradientAndGradientElement();
    this.subjects.gradient.next(this.gradient);
  }

  public onColorPickerDialogClose(reset: boolean) {
    if(reset) {
      if(this.selectedColorSlider && this.previousStopColor) {
        this.selectedColorSlider.colorWrapper.color = this.previousStopColor;
        let colorString = this.getRgbaString(this.selectedColorSlider.colorWrapper.color)
        this.colorInput.style.background = colorString;
        let innerSliderElement = this.selectedColorSlider.slider.querySelector('.color-slider-inner') as HTMLElement;
        innerSliderElement.style.background = colorString;
        this.layer.wrapper.controlWrapper.colorPicker!.setColors([colorString])
        this.updateGradientAndGradientElement();
      }
    } else {
      this.updateGradient();
    }
    this.subjects.gradient.next(this.gradient);

  }



  private deleteExistingSliders() {
    let sliders = this.mapContainer.querySelectorAll('.color-slider-wrapper');
    for (let i = 0; i < sliders.length; i++) {
      sliders[i].remove();
    }
    this.gradientStopDeleteButton.classList.add('disabled');
  }

  private deleteGradientSlider(slider: IColorSlider) {

    let index = this.colorSliders.findIndex(wrapper => {
      return wrapper.slider.id === slider.slider.id;
    })
    this.gradientContainer.removeChild(slider.slider);

    if(index > -1) {
      this.colorSliders.splice(index, 1);
      this.colorWrappers.splice(index, 1);
      this.updateGradientAndGradientElement();
      this.subjects.gradient.next(this.gradient);
      if(this.colorSliders.length) {
        this.selectColorSlider(this.colorSliders[0]);

      }
      if(this.colorWrappers.length <= 2) {
        this.gradientStopDeleteButton.classList.add('disabled');
      }
    }
  }

  private onNormalizingContainerInputChange(type: 'currentMinValue'|'currentMaxValue', event: any) {
    let value = event.target.value;
    if(value === '') {
      value = 0;
    }
    this.layer.dataHelper.setValue(type, parseFloat(value));
    this.updateNormalizingMarkers();
    this.subjects.updateLimits.next({
      min: this.layer.dataHelper.currentMinValue,
      max: this.layer.dataHelper.currentMaxValue
    });
  }

  private updateNormalizingMarkers() {
    let markerValues = this.normalizingContainer?.querySelectorAll('.gradient-marker-value');
    for(let i = 0; i < markerValues!.length; i++ ) {
      let percentage = (i + 1)/ (markerValues!.length + 1);
      markerValues![i].innerHTML = String(this.getValueForPercentage(percentage))
    }
  }

  private getValueForPercentage(percentage: number): number {
    let value = ((this.layer.dataHelper.currentMaxValue - this.layer.dataHelper.currentMinValue) * percentage) + this.layer.dataHelper.currentMinValue;
    return parseFloat(value.toFixed(6));
  }

  private getColorScaleString() {
    let colors = this.colorWrappers.map(item => {
      return 'rgba(' + item.color.join(',') + ')'
    })
    return colors;
  }



  private updateGradientAndGradientElement() {
    this.updateGradient();
    this.updateGradientElement();
  }

  private updateGradient() {
    let colors = this.getColorScaleString();
    this.gradient = chroma.scale(colors).domain([...this.colorWrappers.map(position => position.value)]);
  }

  private updateGradientElement() {
    if(!this.gradientElement || !this.gradient) {
      return;
    }
    let linearGradientString = 'linear-gradient(to right';
    for(let i = 0; i < this.colorWrappers.length ; i++) {
      let rgba = this.colorWrappers[i].color;
      let suffix = `, rgba(${rgba}) ${this.colorWrappers[i].value * 100}%`
      linearGradientString += suffix;
    }
    this.gradientElement.style.setProperty("--gradient-element-background", linearGradientString);

    if(this.colorSliders.length > 2) {
      this.gradientStopDeleteButton.classList.remove('disabled');
    }
  }

  public addNewColor(percentage: number) {
    let index = this.colorWrappers.findIndex((item, index) => {
      let isSmaller = item.value < percentage;
      if(index === this.colorWrappers.length - 1) {
        return index;
      } else {
        return isSmaller && this.colorWrappers[index + 1].value > percentage;
      }
    })
    index += 1;
    let colorAtPosition = this.gradient!(percentage);
    let color = colorAtPosition.rgba();
    let newColorWrapper = {
      color,
      value: percentage
    }
    this.colorWrappers.splice(index, 0, newColorWrapper);
    let slider = this.insertColorSlider(newColorWrapper, index);
    this.selectColorSlider(slider);

    if(this.colorSliders.length > 2) {
      this.gradientStopDeleteButton.classList.remove('disabled');
    }

  }

  private insertColorSlider(colorWrapper: IColorWrapper, index: number) {
    let slider = document.createElement('div');
    slider.classList.add('color-slider-wrapper');
    slider.id = guidGenerator();
    let bbox = this.gradientContainer!.getBoundingClientRect();
    slider.style.left = (bbox.width * colorWrapper.value - this.COLOR_SLIDER_WIDTH / 2) + 'px';

    let sliderTriangle = document.createElement('div');
    sliderTriangle.classList.add('color-slider-triangle');
    slider.appendChild(sliderTriangle);

    let sliderInner = document.createElement('div');
    sliderInner.classList.add('color-slider-inner');
    sliderInner.style.background = this.getRgbaString(colorWrapper.color);
    slider.appendChild(sliderInner);

    this.gradientContainer!.appendChild(slider);

    let newColorSlider = {
      slider,
      colorWrapper
    }
    if(index !== null && index !== undefined) {
      this.colorSliders.splice(index, 0, newColorSlider);
    } else {
      this.colorSliders.push(newColorSlider);
    }
    this.addClickListenerToColorSlider(newColorSlider);
    return newColorSlider;
  }

  private getRgbaString(rgbaArray: number[]) {
    let colorArray = rgbaArray;
    if(rgbaArray.length === 3 ) {
      colorArray.push(1.0);
    }
    return `rgba(${colorArray.join(',')})`;
  }

  private addClickListenerToColorSlider(slider: IColorSlider) {
    slider.slider.addEventListener('mousedown', (event) => {
      this.draggedSlider = slider.slider;
      this.selectColorSlider(slider);
    })
  }

  private selectColorSlider(colorSlider: IColorSlider) {
    this.selectedColorSlider = colorSlider
    this.subjects.selectedColorSlider.next(colorSlider);
    this.colorInput!.style.background = this.getRgbaString(colorSlider.colorWrapper.color);
  }
}
