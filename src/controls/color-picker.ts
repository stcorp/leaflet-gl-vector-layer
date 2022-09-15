import { IColorSlider, IColorWrapper } from '../types/color-slider';
import chroma from 'chroma-js';
import { guidGenerator } from '../helpers/guid-generator';
import * as L from 'leaflet';
import { IColorMapWrapper } from './color-map.control';
import { ColorService } from '../services/color-service';
import { IHandler } from '../types/handlers';
import { Subscription } from 'rxjs';
export class ColorPicker {
  public colorWrappers: IColorWrapper[] = [];
  public colorSliders: IColorSlider[] = [];
  public gradient: chroma.Scale;
  private innerContainer: HTMLElement;
  private colorPickerContainer: HTMLElement;
  private gradientContainer: HTMLElement;
  private gradientElement: HTMLElement;
  private colorInputContainer: HTMLElement;
  private gradientStopDeleteButton: HTMLElement;
  private colorInput: HTMLElement
  private draggedSlider: HTMLElement|null;
  private selectedColorSlider: IColorSlider|null;
  private COLOR_SLIDER_WIDTH: number = 10;
  private previousStopColor: number[]|null|undefined;
  private handlers: IHandler[] = [];
  private subscriptions: Subscription[] = [];

  constructor() {
    let colorMapSubscription = ColorService.colorMapSubject.subscribe((colorMapWrapper: IColorMapWrapper) => {
      this.onColorMapChange(colorMapWrapper);
    });
    let colorPickerSubscription = ColorService.colorPickerSubject.subscribe((color: any) => {
      this.onColorPickerChange(color);
    });
    let resetColorSubscription = ColorService.resetColorMapSubject.subscribe(() => {
      this.reset();
    });
    let colorPickerDialogSubscription = ColorService.colorPickerDialogSubject.subscribe(data => {
      this.onColorPickerDialogClose(data.isReset);
    });
    let currentGradientSubscription = ColorService.currentGradientSubject.subscribe((gradient: chroma.Scale) => {
      this.gradient = gradient;
      this.updateGradientElement();
    });

    this.subscriptions.push(colorMapSubscription);
    this.subscriptions.push(colorPickerSubscription);
    this.subscriptions.push(resetColorSubscription);
    this.subscriptions.push(colorPickerDialogSubscription);
    this.subscriptions.push(currentGradientSubscription);

  }


  public initialize() {
    this.innerContainer = L.DomUtil.create('div', 'color-picker-inner-container');
    this.colorPickerContainer = L.DomUtil.create('div', 'color-picker-container', this.innerContainer);
    this.colorInputContainer = L.DomUtil.create('div', 'color-input-container', this.colorPickerContainer);
    this.colorInput = L.DomUtil.create('div', 'color-input-inner', this.colorInputContainer)
    this.gradientStopDeleteButton = L.DomUtil.create('div', 'gradient-stop-delete-button disabled', this.colorInputContainer)
    this.gradientContainer = L.DomUtil.create('div', 'gradient-container', this.colorPickerContainer);
    this.gradientElement = L.DomUtil.create('div', 'gradient-element', this.gradientContainer);
    this.initColorWrappers();
    setTimeout(() => {
      let currentGradient = ColorService.getCurrentGradient();
      if(currentGradient) {
        this.gradient = currentGradient;
      }
      this.initColorSliders();
      this.addEventListeners();
      this.updateGradientElement();
    })

    return this.innerContainer;
  }

  public initColorWrappers(isDefault = false) {
    if(isDefault) {
      this.colorWrappers = ColorService.getDefaultColorWrappers();
    } else {
      this.colorWrappers = ColorService.getCurrentColorWrappers();
    }
    ColorService.updateCurrentColorWrappers(this.colorWrappers);

  }

  public initColorSliders() {
    for(let i = 0; i < this.colorWrappers.length; i++) {
      this.insertColorSlider(this.colorWrappers[i], i);
    }
    this.selectColorSlider(this.colorSliders[0]);
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
    this.selectColorSlider(this.colorSliders[0]);
    ColorService.updateCurrentColorWrappers(this.colorWrappers);
  }

  private addEventListeners() {
    let self = this;
    let gradientStopDeleteHandler = {
      func: onGradientStopDeleteClick,
      element: this.gradientStopDeleteButton,
      type: 'click'
    };
    this.handlers.push(gradientStopDeleteHandler);
    gradientStopDeleteHandler.element.addEventListener(gradientStopDeleteHandler.type, gradientStopDeleteHandler.func);

    let onDocumentMouseMoveHandler = {
      func: onDocumentMouseMove,
      element: document,
      type: 'mousemove'
    };
    this.handlers.push(onDocumentMouseMoveHandler);
    onDocumentMouseMoveHandler.element.addEventListener(onDocumentMouseMoveHandler.type, onDocumentMouseMoveHandler.func);


    let onDocumentMouseUpHandler = {
      func: onDocumentMouseUp.bind(this),
      element: document,
      type: 'mouseup'
    };
    this.handlers.push(onDocumentMouseUpHandler);
    onDocumentMouseUpHandler.element.addEventListener(onDocumentMouseUpHandler.type, onDocumentMouseUpHandler.func);


    let gradientDblClickHandler = {
      func: onGradientContainerDblClick,
      element: this.gradientContainer,
      type: 'dblclick'
    };
    this.handlers.push(gradientDblClickHandler);
    gradientDblClickHandler.element.addEventListener(gradientDblClickHandler.type, gradientDblClickHandler.func);

    let onColorInputClickHandler = {
      func: onColorInputClick.bind(this),
      element: this.colorInput,
      type: 'click'
    };
    this.handlers.push(onColorInputClickHandler);
    onColorInputClickHandler.element.addEventListener(onColorInputClickHandler.type, onColorInputClickHandler.func);

    function onColorInputClick(event: any) {
      self.previousStopColor = self.selectedColorSlider?.colorWrapper?.color;
      ColorService.openColorPickerDialog();
    }

    function onGradientContainerDblClick(event: any) {
      let bbox = self.gradientContainer!.getBoundingClientRect();
      let percentage = (event.clientX - bbox.x) / bbox.width;
      self.addNewColor(percentage);
    }

    function onDocumentMouseUp(event: any) {
      if(self.draggedSlider) {
        self.draggedSlider = null;
        ColorService.updateCurrentColorWrappers(self.colorWrappers);
      }

    }

    function onDocumentMouseMove(event: any) {
      if(!self.draggedSlider || !self.selectedColorSlider) {
        return;
      } else {
        let bbox = self.gradientContainer!.getBoundingClientRect();
        let left = Math.max(Math.min(event.clientX - bbox.x - (self.COLOR_SLIDER_WIDTH / 2), self.gradientContainer!.clientWidth - (self.COLOR_SLIDER_WIDTH / 2)), -(self.COLOR_SLIDER_WIDTH / 2));
        let newPercentage = Math.max((left + -self.COLOR_SLIDER_WIDTH/2) / self.gradientContainer!.clientWidth, 0);
        self.draggedSlider.style.left = left + 'px';
        self.selectedColorSlider.colorWrapper.value = newPercentage;
        self.colorWrappers = self.colorWrappers.sort((a, b) => {
          return a.value < b.value ? -1 : 1;
        })
        self.updateGradientElement();
      }
    }

    function onGradientStopDeleteClick(event: any) {
      if(self.colorWrappers.length <= 2) {
        return;
      }
      if(self.selectedColorSlider) {
        self.deleteGradientSlider(self.selectedColorSlider);
      }
    }
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
  }

  public reset() {
    this.deleteExistingSliders();
    this.colorWrappers = [];
    this.colorSliders = [];
    this.initColorWrappers(true);
    this.initColorSliders();
    this.updateGradientElement();
  }

  public onColorPickerDialogClose(reset: boolean) {
    if(reset) {
      if(this.selectedColorSlider && this.previousStopColor) {
        this.selectedColorSlider.colorWrapper.color = this.previousStopColor;
        let colorString = this.getRgbaString(this.selectedColorSlider.colorWrapper.color)
        this.colorInput.style.background = colorString;
        let innerSliderElement = this.selectedColorSlider.slider.querySelector('.color-slider-inner') as HTMLElement;
        innerSliderElement.style.background = colorString;
      }
    } else {
      ColorService.updateCurrentColorWrappers(this.colorWrappers);
    }
  }



  private deleteExistingSliders() {
    let sliders = this.innerContainer.querySelectorAll('.color-slider-wrapper');
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
      if(this.colorSliders.length) {
        this.selectColorSlider(this.colorSliders[0]);
      }
      if(this.colorWrappers.length <= 2) {
        this.gradientStopDeleteButton.classList.add('disabled');
      }
    }
    ColorService.updateCurrentColorWrappers(this.colorWrappers);
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
    ColorService.updateCurrentColorWrappers(this.colorWrappers);
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
    let sliderMouseDownHandler = {
      func: this.onSliderMouseDown.bind(this, slider),
      element: slider.slider,
      type: 'mousedown'
    };
    this.handlers.push(sliderMouseDownHandler);
    sliderMouseDownHandler.element.addEventListener(sliderMouseDownHandler.type, sliderMouseDownHandler.func);
  }

  private onSliderMouseDown(slider: IColorSlider) {
    this.draggedSlider = slider.slider;
    this.selectColorSlider(slider);
  }

  private selectColorSlider(colorSlider: IColorSlider) {
    this.selectedColorSlider = colorSlider
    ColorService.selectColorSlider(this.selectedColorSlider);
    this.colorInput!.style.background = this.getRgbaString(this.selectedColorSlider.colorWrapper.color);
  }

  public cleanUp() {
    for(let handler of this.handlers) {
      handler.element.removeEventListener(handler.type, handler.func);
    }
    for(let subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
  }
}