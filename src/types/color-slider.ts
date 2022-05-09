export interface IColorWrapper {
  value: number,
  color: number[]
}

export interface IColorSlider {
  slider: HTMLElement,
  colorWrapper: IColorWrapper
}