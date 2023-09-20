import * as L from 'leaflet';
import { guidGenerator } from '../helpers/guid-generator';
import { Subject } from 'rxjs';
import { IHandler } from '../types/typings';
import isEqual from 'lodash/isEqual';
import { IXRGBA } from '../types/typings';

export interface IColorMapWrapper {
  colors: IXRGBA[];
  colorMapElement: HTMLElement;
  id: string;
}

interface IColorMapControlOptions {
  colormaps: IXRGBA[][];
  defaultColorMap?: IXRGBA[];
}

export class ColorMapControl {
  private container;
  private colorMapSubject = new Subject<IColorMapWrapper>();
  public colorMap$ = this.colorMapSubject.asObservable();
  private handlers: IHandler[] = [];
  private colorMapWrappers: IColorMapWrapper[] = [];

  constructor(private options: IColorMapControlOptions) {
    this.container = L.DomUtil.create('div', 'color-map-container');
    const header = L.DomUtil.create('div', 'control-section-header', this.container);
    header.innerHTML = 'Choose from predefined color maps';
    this.addEventListeners();
    this.createColorMapElements();
  }

  private addEventListeners() {
    const containerClickHandler = {
      element: this.container,
      func: (event: any) => {
        event.stopPropagation();
      },
      type: 'click',
    };
    containerClickHandler.element.addEventListener(containerClickHandler.type, containerClickHandler.func);
    this.handlers.push(containerClickHandler);
  }

  private createColorMapElements() {
    const colorMapContainer = L.DomUtil.create('div', 'color-map-container-inner', this.container);
    const defaultRow = L.DomUtil.create('div', 'default-color-map-row', colorMapContainer);

    let indexOfDefault = -1;
    let defaultColors: IXRGBA[];
    if (this.options?.defaultColorMap) {
      this.createColorMapElement(defaultRow, this.options?.defaultColorMap);
      if (this.options.colormaps?.length) {
        indexOfDefault = this.options.colormaps.findIndex(colormap => {
          return isEqual(colormap, this.options?.defaultColorMap);
        });
      }
    } else if (this.options?.colormaps?.length) {
      this.createColorMapElement(defaultRow, this.options?.colormaps[0]);
      indexOfDefault = 0;
    } else {
      defaultColors = [
        [0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1],
      ];
      this.createColorMapElement(defaultRow, defaultColors);
    }
    let row;
    for (let i = 0; i < this.options.colormaps?.length; i++) {
      if (i % 2 === 0) {
        row = L.DomUtil.create('div', 'single-color-map-row', colorMapContainer);
      }
      if (row) {
        let disabled = false;
        if (i === indexOfDefault) {
          disabled = true;
        }
        this.createColorMapElement(row, this.options.colormaps[i], disabled);
      }
      if (i === this.options.colormaps.length - 1 && i % 2 === 0) {
        L.DomUtil.create('div', 'single-color-map-row-filler', row);
      }
    }
  }

  public getContainer() {
    return this.container;
  }

  private createColorMapElement(row: HTMLElement, colors: IXRGBA[], isDisabled = false) {
    const className = 'single-color-map' + (isDisabled ? ' disabled' : '');
    const element = L.DomUtil.create('div', className, row);
    element.id = guidGenerator();
    element.style.background = this.createGradientString(colors);
    const wrapper = this.createColorMapWrapper(colors, element);
    this.colorMapWrappers.push(wrapper);
    const colorMapClickHandler = {
      element: element,
      func: (event: any) => {
        this.colorMapSubject.next(wrapper);
      },
      type: 'click',
    };
    this.handlers.push(colorMapClickHandler);

    colorMapClickHandler.element.addEventListener(colorMapClickHandler.type, colorMapClickHandler.func);
    return element;
  }

  private createGradientString(colors: IXRGBA[]) {
    let linearGradientString = 'linear-gradient(to right';
    for (let i = 0; i < colors.length; i++) {
      const color = colors[i];
      const rgba = color[1] * 255 + ',' + color[2] * 255 + ',' + color[3] * 255 + ',' + color[4];
      const suffix = `, rgba(${rgba}) ${color[0] * 100}%`;
      linearGradientString += suffix;
    }
    return linearGradientString;
  }

  private createColorMapWrapper(colors: IXRGBA[], colorMapElement: HTMLElement) {
    const colorMapWrapper: IColorMapWrapper = {
      colorMapElement: colorMapElement,
      id: colorMapElement.id,
      colors,
    };
    return colorMapWrapper;
  }

  public cleanUp() {
    for (const handler of this.handlers) {
      if (handler.element) {
        handler.element.removeEventListener(handler.type, handler.func);
      }
    }
    this.container.replaceChildren();
    this.colorMapWrappers = [];
  }
}
