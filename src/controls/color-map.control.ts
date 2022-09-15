import * as L from 'leaflet';
import { guidGenerator } from '../helpers/guid-generator';
import { Subject } from 'rxjs';
import { IColorWrapper } from '../types/color-slider';
import { ColorService } from '../services/color-service';
import { IHandler } from '../types/handlers';


export interface IColorMapWrapper {
  colorWrappers: IColorWrapper[];
  colorMapElement: HTMLElement;
  id: string;
}

export class ColorMapControl {
  private container;
  private colorMaps: IColorMapWrapper[] = [];
  private colorMapSubject= new Subject<IColorMapWrapper>();
  public colorMap$ = this.colorMapSubject.asObservable();
  private handlers: IHandler[] = [];
  constructor() {
    this.container = L.DomUtil.create('div', 'color-map-container');
    let containerClickHandler = {
      element: this.container,
      func: (event: any) => {
        event.stopPropagation();
      },
      type: 'click'
    }
    this.handlers.push(containerClickHandler);
    containerClickHandler.element.addEventListener(containerClickHandler.type, containerClickHandler.func);

    let header = L.DomUtil.create('div', 'control-section-header', this.container);
    header.innerHTML = 'Choose from predefined color maps';
    let dropdownInner = L.DomUtil.create('div', 'color-map-container-inner', this.container);
    let colorWrappers = ColorService.getColorWrappers();
    let row;
    for(let i = 0; i < colorWrappers.length; i++) {
      if(i % 2 === 0) {
        row = L.DomUtil.create('div', 'single-color-map-row', dropdownInner);
      }
      if(row) {
        this.createColorMapElement(row, colorWrappers[i]);
      }
    }
  }

  public getContainer() {
    return this.container;
  }

  private createColorMapElement(row: HTMLElement, colorWrappers: IColorWrapper[]) {
    let element = L.DomUtil.create('div', 'single-color-map', row);
    element.id = guidGenerator();
    element.style.background = this.createGradientString(colorWrappers);
    let wrapper = this.createColorMapWrapper(colorWrappers, element);
    this.colorMaps.push(wrapper);
    let colorMapClickHandler = {
      element: element,
      func: (event: any) => {
        this.colorMapSubject.next(wrapper)
      },
      type: 'click'
    }
    this.handlers.push(colorMapClickHandler);

    colorMapClickHandler.element.addEventListener(colorMapClickHandler.type, colorMapClickHandler.func)
    return element;
  }

  private createGradientString(colorWrapper: IColorWrapper[]) {
    let linearGradientString = 'linear-gradient(to right';
    for(let i = 0; i < colorWrapper.length; i++) {
      let colors = colorWrapper[i].color;
      let rgba = colors[0] + ',' + colors[1] + ',' + colors[2] + ',' + colors[3];
      let suffix = `, rgba(${rgba}) ${colorWrapper[i].value * 100}%`
      linearGradientString += suffix;
    }
    return linearGradientString;
  }

  private createColorMapWrapper(colorWrappers: IColorWrapper[], colorMapElement: HTMLElement) {
    let colorMapWrapper: IColorMapWrapper = {
      colorMapElement: colorMapElement,
      id: colorMapElement.id,
      colorWrappers
    }
    return colorMapWrapper;
  }

  public cleanUp() {
    for(let handler of this.handlers) {
      handler.element.removeEventListener(handler.type, handler.func);
    }
    this.container.replaceChildren();
  }
}