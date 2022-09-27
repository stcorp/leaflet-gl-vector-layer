import { IRGBA } from './colors';

export interface IColorWrapper {
  value: number,
  color: IRGBA
}

export interface IColorSlider {
  slider: HTMLElement,
  colorWrapper: IColorWrapper
}