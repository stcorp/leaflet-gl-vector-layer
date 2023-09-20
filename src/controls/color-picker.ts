import { guidGenerator } from '../helpers/guid-generator';
import * as L from 'leaflet';
import { ColorService, IColorEdgePoint, IColorSlider } from '../services/color-service';
import { IHandler } from '../types/typings';
import { ReplaySubject, Subject, Subscription, takeUntil } from 'rxjs';
import { IroColor } from '@irojs/iro-core/dist/color';
import { IRGBA } from '../types/typings';
import { getGradientForEdgePoints } from '../helpers/color-transformers';
export class ColorPicker {
  private colorEdgePointsUpdateSubject = new Subject<IColorEdgePoint[]>();
  private innerContainer: HTMLElement;
  private colorPickerContainer: HTMLElement;
  private gradientContainer: HTMLElement;
  private gradientElement: HTMLCanvasElement;
  private colorInputContainer: HTMLElement;
  private gradientStopDeleteButton: HTMLElement;
  private colorInput: HTMLElement;
  private draggedSlider: HTMLElement | null;
  private selectedColorSlider: IColorSlider | null;
  private COLOR_SLIDER_WIDTH: number = 10;
  private previousStopColor: IRGBA | null | undefined;
  private handlers: IHandler[] = [];
  private subscriptions: Subscription[] = [];
  private destroyed$ = new ReplaySubject(1);
  private gradient: chroma.Scale;
  public colorEdgePoints: IColorEdgePoint[] = [];
  public colorSliders: IColorSlider[] = [];
  public colorEdgePointsUpdated$ = this.colorEdgePointsUpdateSubject.asObservable();

  constructor(private colorService: ColorService) {
    const selectedColorChangedSubscription = this.colorService.selectedColorChanged$.subscribe((color: any) => {
      this.onSelectedColorChange(color);
    });
    const colorPickerDialogSubscription = this.colorService.colorPickerDialog$.subscribe(data => {
      this.onColorPickerDialogClose(data.isReset);
    });

    this.colorService.gradient$.pipe(takeUntil(this.destroyed$)).subscribe(gradientData => {
      this.gradient = gradientData.gradient;
      this.updateGradientElement();
    });

    this.subscriptions.push(selectedColorChangedSubscription);
    this.subscriptions.push(colorPickerDialogSubscription);
  }

  public setEdgePoints(edgePoints: IColorEdgePoint[]) {
    if (edgePoints.length && this.innerContainer) {
      this.colorEdgePoints = edgePoints;
      this.onColorWrappersChanged();
      this.updateGradientElement();
    }
  }

  private onColorWrappersChanged() {
    this.deleteExistingSliders();
    this.colorSliders = [];
    this.selectedColorSlider = null;
    for (let i = 0; i < this.colorEdgePoints.length; i++) {
      this.insertColorSlider(this.colorEdgePoints[i], i);
    }
    this.selectColorSlider(this.colorSliders[0]);
    this.updateGradientElement();
  }

  public initialize() {
    this.innerContainer = L.DomUtil.create('div', 'color-picker-inner-container');
    this.colorPickerContainer = L.DomUtil.create('div', 'color-picker-container', this.innerContainer);
    this.colorInputContainer = L.DomUtil.create('div', 'color-input-container', this.colorPickerContainer);
    this.colorInput = L.DomUtil.create('div', 'color-input-inner', this.colorInputContainer);
    this.gradientStopDeleteButton = L.DomUtil.create(
      'div',
      'gradient-stop-delete-button disabled',
      this.colorInputContainer
    );
    this.gradientContainer = L.DomUtil.create('div', 'gradient-container', this.colorPickerContainer);
    this.gradientElement = L.DomUtil.create('canvas', 'gradient-element', this.gradientContainer);
    this.addEventListeners();
    return this.innerContainer;
  }

  private addEventListeners() {
    const self = this;
    const gradientStopDeleteHandler = {
      func: onGradientStopDeleteClick,
      element: this.gradientStopDeleteButton,
      type: 'click',
    };
    this.handlers.push(gradientStopDeleteHandler);
    gradientStopDeleteHandler.element.addEventListener(gradientStopDeleteHandler.type, gradientStopDeleteHandler.func);

    const onDocumentMouseMoveHandler = {
      func: onDocumentMouseMove,
      element: document,
      type: 'mousemove',
    };
    this.handlers.push(onDocumentMouseMoveHandler);
    onDocumentMouseMoveHandler.element.addEventListener(
      onDocumentMouseMoveHandler.type,
      onDocumentMouseMoveHandler.func
    );

    const onDocumentMouseUpHandler = {
      func: onDocumentMouseUp.bind(this),
      element: document,
      type: 'mouseup',
    };
    this.handlers.push(onDocumentMouseUpHandler);
    onDocumentMouseUpHandler.element.addEventListener(onDocumentMouseUpHandler.type, onDocumentMouseUpHandler.func);

    const gradientDblClickHandler = {
      func: onGradientContainerDblClick,
      element: this.gradientContainer,
      type: 'dblclick',
    };
    this.handlers.push(gradientDblClickHandler);
    gradientDblClickHandler.element.addEventListener(gradientDblClickHandler.type, gradientDblClickHandler.func);

    const onColorInputClickHandler = {
      func: onColorInputClick.bind(this),
      element: this.colorInput,
      type: 'click',
    };
    this.handlers.push(onColorInputClickHandler);
    onColorInputClickHandler.element.addEventListener(onColorInputClickHandler.type, onColorInputClickHandler.func);

    function onColorInputClick(event: any) {
      self.previousStopColor = self.selectedColorSlider?.edgePoint?.color;
      self.colorService.openColorPickerDialog();
    }

    function onGradientContainerDblClick(event: any) {
      const bbox = self.gradientContainer!.getBoundingClientRect();
      const percentage = (event.clientX - bbox.x) / bbox.width;
      self.addNewColor(percentage);
    }

    function onDocumentMouseUp(event: any) {
      if (self.draggedSlider) {
        self.draggedSlider = null;
        self.colorEdgePointsUpdateSubject.next(self.colorEdgePoints);
      }
    }

    function onDocumentMouseMove(event: any) {
      if (!self.draggedSlider || !self.selectedColorSlider) {
        return;
      } else {
        const bbox = self.gradientContainer!.getBoundingClientRect();
        const left = Math.max(
          Math.min(
            event.clientX - bbox.x - self.COLOR_SLIDER_WIDTH / 2,
            self.gradientContainer!.clientWidth - self.COLOR_SLIDER_WIDTH / 2
          ),
          -(self.COLOR_SLIDER_WIDTH / 2)
        );
        const newPercentage = Math.max(left / self.gradientContainer!.clientWidth, 0);
        self.draggedSlider.style.left = left + 'px';
        self.selectedColorSlider.edgePoint.value = newPercentage;
        self.colorEdgePoints = self.colorEdgePoints.sort((a, b) => {
          return a.value < b.value ? -1 : 1;
        });
        self.updateGradientElement();
      }
    }

    function onGradientStopDeleteClick(event: any) {
      if (self.colorEdgePoints.length <= 2) {
        return;
      }
      if (self.selectedColorSlider) {
        self.deleteGradientSlider(self.selectedColorSlider);
      }
    }
  }

  public onSelectedColorChange(color: IroColor) {
    const colorArray = [color.rgba.r, color.rgba.g, color.rgba.b, color.rgba.a] as IRGBA;
    if (this.selectedColorSlider) {
      this.selectedColorSlider.edgePoint.color = colorArray;
    }
    const colorString = this.getRgbaString(colorArray);
    this.colorInput!.style.background = colorString;
    const innerSliderElement = this.selectedColorSlider!.slider.querySelector('.color-slider-inner') as HTMLElement;
    innerSliderElement!.style.background = colorString;
    this.updateGradientElement();
  }

  public onColorPickerDialogClose(reset: boolean) {
    if (reset) {
      if (this.selectedColorSlider && this.previousStopColor) {
        this.selectedColorSlider.edgePoint.color = this.previousStopColor;
        const colorString = this.getRgbaString(this.selectedColorSlider.edgePoint.color);
        this.colorInput.style.background = colorString;
        const innerSliderElement = this.selectedColorSlider.slider.querySelector('.color-slider-inner') as HTMLElement;
        innerSliderElement.style.background = colorString;
        this.updateGradientElement();
      }
    } else {
      this.colorEdgePointsUpdateSubject.next(this.colorEdgePoints);
    }
  }

  private deleteExistingSliders() {
    if (this.innerContainer) {
      const sliders = this.innerContainer.querySelectorAll('.color-slider-wrapper');
      for (let i = 0; i < sliders.length; i++) {
        sliders[i].remove();
      }
      this.gradientStopDeleteButton.classList.add('disabled');
    }
  }

  private deleteGradientSlider(slider: IColorSlider) {
    const index = this.colorSliders.findIndex(wrapper => {
      return wrapper.slider.id === slider.slider.id;
    });
    this.gradientContainer.removeChild(slider.slider);

    if (index > -1) {
      this.colorSliders.splice(index, 1);
      this.colorEdgePoints.splice(index, 1);
      if (this.colorSliders.length) {
        this.selectColorSlider(this.colorSliders[0]);
      }
      if (this.colorEdgePoints.length <= 2) {
        this.gradientStopDeleteButton.classList.add('disabled');
      }
    }
    this.colorEdgePointsUpdateSubject.next(this.colorEdgePoints);
    this.updateGradientElement();
  }

  private updateGradientElement() {
    if (!this.gradientElement) {
      return;
    }
    const context = this.gradientElement.getContext('2d');
    if (context) {
      context.clearRect(0, 0, this.gradientElement.width, this.gradientElement.height);
      const gradient = context.createLinearGradient(0, 0, this.gradientElement.width, 0);

      if (context) {
        context.clearRect(0, 0, this.gradientElement.width, this.gradientElement.height);
        const gradient = context.createLinearGradient(0, 0, this.gradientElement.width, 0);
        for (let i = 0; i <= 255; i++) {
          context.beginPath();
          const color = this.gradient(i / 255).rgba();
          gradient.addColorStop(i / 255, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`);
        }
        context.fillStyle = gradient;
        context.fillRect(0, 0, this.gradientElement.width, this.gradientElement.height);
      }

      context.fillStyle = gradient;
      context.fillRect(0, 0, this.gradientElement.width, this.gradientElement.height);
    }

    if (this.colorSliders.length > 2) {
      this.gradientStopDeleteButton.classList.remove('disabled');
    }
  }

  public addNewColor(percentage: number) {
    let index = this.colorEdgePoints.findIndex((item, index) => {
      const isSmaller = item.value < percentage;
      if (index === this.colorEdgePoints.length - 1) {
        return index;
      } else {
        return isSmaller && this.colorEdgePoints[index + 1].value > percentage;
      }
    });
    index += 1;
    const gradient = getGradientForEdgePoints(this.colorEdgePoints);
    const colorAtPosition = gradient(percentage);
    const color = colorAtPosition.rgba();
    const newColorWrapper = {
      color,
      value: percentage,
    };
    this.colorEdgePoints.splice(index, 0, newColorWrapper);
    const slider = this.insertColorSlider(newColorWrapper, index);
    this.selectColorSlider(slider);

    if (this.colorSliders.length > 2) {
      this.gradientStopDeleteButton.classList.remove('disabled');
    }
    this.colorEdgePointsUpdateSubject.next(this.colorEdgePoints);
  }

  private insertColorSlider(colorEdgePoint: IColorEdgePoint, index: number) {
    const slider = document.createElement('div');
    slider.classList.add('color-slider-wrapper');
    slider.id = guidGenerator();
    const bbox = this.gradientContainer!.getBoundingClientRect();
    slider.style.left = bbox.width * colorEdgePoint.value - this.COLOR_SLIDER_WIDTH / 2 + 'px';
    const sliderTriangle = document.createElement('div');
    sliderTriangle.classList.add('color-slider-triangle');
    slider.appendChild(sliderTriangle);

    const sliderInner = document.createElement('div');
    sliderInner.classList.add('color-slider-inner');
    sliderInner.style.background = this.getRgbaString(colorEdgePoint.color);
    slider.appendChild(sliderInner);

    this.gradientContainer!.appendChild(slider);

    const newColorSlider = {
      slider,
      edgePoint: colorEdgePoint,
    };
    if (index !== null && index !== undefined) {
      this.colorSliders.splice(index, 0, newColorSlider);
    } else {
      this.colorSliders.push(newColorSlider);
    }
    this.addClickListenerToColorSlider(newColorSlider);
    return newColorSlider;
  }

  private getRgbaString(rgbaArray: number[]) {
    const colorArray = rgbaArray;
    if (rgbaArray.length === 3) {
      colorArray.push(1.0);
    }
    return `rgba(${colorArray.join(',')})`;
  }

  private addClickListenerToColorSlider(slider: IColorSlider) {
    const sliderMouseDownHandler = {
      func: this.onSliderMouseDown.bind(this, slider),
      element: slider.slider,
      type: 'mousedown',
    };
    this.handlers.push(sliderMouseDownHandler);
    sliderMouseDownHandler.element.addEventListener(sliderMouseDownHandler.type, sliderMouseDownHandler.func);
  }

  private onSliderMouseDown(slider: IColorSlider) {
    this.draggedSlider = slider.slider;
    this.selectColorSlider(slider);
  }

  private selectColorSlider(colorSlider: IColorSlider) {
    this.selectedColorSlider = colorSlider;
    this.colorService.selectColorSlider(this.selectedColorSlider);
    this.colorInput!.style.background = this.getRgbaString(this.selectedColorSlider.edgePoint.color);
  }

  public cleanUp() {
    for (const handler of this.handlers) {
      if (handler.element) {
        handler.element.removeEventListener(handler.type, handler.func);
      }
    }
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
  }
}
