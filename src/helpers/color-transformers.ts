import { IColor, IRGB, IRGBA, IXrgbaColor } from '../types/colors';
import { IColorWrapper } from '../types/color-slider';

export function colormapToXrgbaColormap(colormap: IColor[]): IXrgbaColor[] {
  if(colormap[0]?.length === 3) {
    return (colormap as IRGB[]).map((color: IRGB, index: number) => {
      return [index/(colormap.length - 1), color[0], color[1], color[2], 1] as IXrgbaColor;
    });
  } else if (colormap[0]?.length === 4) {
    return (colormap as IRGBA[]).map((color: IRGBA, index: number) => {
      return [index/(colormap.length - 1), color[0], color[1], color[2], color[3]] as IXrgbaColor;
    });
  } else {
    return colormap as IXrgbaColor[];
  }
}

export function colormapsToXrgbaColormaps(colormaps: IColor[][]): IXrgbaColor[][] {
  return colormaps.map((colormap: IColor[]) => colormapToXrgbaColormap(colormap));
}

export function colorWrappersToXrgbaColormap(colorWrappers: IColorWrapper[]): IXrgbaColor[] {
  return colorWrappers.map((colorWrapper: IColorWrapper, index: number) => {
    return [colorWrapper.value, colorWrapper.color[0], colorWrapper.color[1], colorWrapper.color[2], colorWrapper.color[3]] as IXrgbaColor;
  });
}