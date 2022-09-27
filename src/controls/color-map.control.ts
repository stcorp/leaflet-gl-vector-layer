import * as L from 'leaflet';
import { guidGenerator } from '../helpers/guid-generator';
import { BehaviorSubject, Subject } from 'rxjs';
import { IColorWrapper } from '../types/color-slider';
import { IHandler } from '../types/handlers';
import { IXrgbaColor } from '../types/colors';
import isEqual from 'lodash/isEqual';
import { colormapToColorWrapper } from '../helpers/color-maps';
import { ColorService } from '../services/color-service';


export interface IColorMapWrapper {
  colorWrappers: IColorWrapper[];
  colorMapElement: HTMLElement;
  id: string;
}

interface IColorMapControlOptions {
  colormaps?: IXrgbaColor[][],
  defaultColorMap?: IXrgbaColor[],
}

export class ColorMapControl {
  private container;
  private colorMapSubject= new BehaviorSubject<IColorMapWrapper|undefined>(undefined);
  public colorMap$ = this.colorMapSubject.asObservable();
  private handlers: IHandler[] = [];
  private colorMapWrappers: IColorMapWrapper[] = [];

  constructor(private options?: IColorMapControlOptions ) {
    this.container = L.DomUtil.create('div', 'color-map-container');
    let header = L.DomUtil.create('div', 'control-section-header', this.container);
    header.innerHTML = 'Choose from predefined color maps';
    this.addEventListeners();
    this.createColorMapElements();
  }

  private addEventListeners() {
    let containerClickHandler = {
      element: this.container,
      func: (event: any) => {
        event.stopPropagation();
      },
      type: 'click'
    }
    containerClickHandler.element.addEventListener(containerClickHandler.type, containerClickHandler.func);
    this.handlers.push(containerClickHandler);

  }

  private createColorMapElements() {
    let colorMapContainer = L.DomUtil.create('div', 'color-map-container-inner', this.container);
    let defaultRow = L.DomUtil.create('div', 'default-color-map-row', colorMapContainer);


    let indexOfDefault = -1;
    let defaultColorWrappers: IColorWrapper[];
    if(this.options?.defaultColorMap) {
      defaultColorWrappers = colormapToColorWrapper(this.options?.defaultColorMap);
      this.createColorMapElement(defaultRow, defaultColorWrappers);
      if(ColorService.globalColorWrappers?.length) {
        indexOfDefault = ColorService.globalColorWrappers.findIndex((colormap) => {
          return isEqual(colormap, defaultColorWrappers);
        })
      }
    } else if (ColorService.globalColorWrappers?.length) {
      this.createColorMapElement(defaultRow, ColorService.globalColorWrappers[0]);
      indexOfDefault = 0;
    } else {
      defaultColorWrappers = [
        {
          value: 0,
          color: [0, 0, 0, 1]
        },
        {
          value: 1,
          color: [255, 255, 255, 1]
        }
      ]
      this.createColorMapElement(defaultRow, defaultColorWrappers);
    }
    let row;
    for(let i = 0; i < ColorService.globalColorWrappers.length; i++) {
      if(i % 2 === 0) {
        row = L.DomUtil.create('div', 'single-color-map-row', colorMapContainer);
      }
      if(row) {
        let disabled = false;
        if(i === indexOfDefault) {
          disabled = true;
        }
        this.createColorMapElement(row, ColorService.globalColorWrappers[i], disabled);
      }
      if(i === ColorService.globalColorWrappers.length - 1 && i % 2 === 0) {
        L.DomUtil.create('div', 'single-color-map-row-filler', row);
      }
    }
  }

  public getContainer() {
    return this.container;
  }

  private createColorMapElement(row: HTMLElement, colorWrappers: IColorWrapper[], isDisabled = false) {
    let className = 'single-color-map' + (isDisabled ? ' disabled' : '');
    let element = L.DomUtil.create('div', className, row);
    element.id = guidGenerator();
    element.style.background = this.createGradientString(colorWrappers);
    let wrapper = this.createColorMapWrapper(colorWrappers, element);
    this.colorMapWrappers.push(wrapper);
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
    this.colorMapWrappers = [];
  }
}