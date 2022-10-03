import { IColor, IXRGBA } from '../types/colors';
import { IColorEdgePoint } from '../services/color-service';
import chroma from 'chroma-js';

export function colormapToXrgbaColormap(colormap: IColor[]): IXRGBA[] {
  return colormap.map((color: IColor, index: number) => {
    if(color.length === 3) {
      return [index/(colormap.length - 1), color[0], color[1], color[2], 1] as IXRGBA;
    } else if (color.length === 4) {
      return [index/(colormap.length - 1), color[0], color[1], color[2], color[3]] as IXRGBA;
    } else {
      return color as IXRGBA;
    }
  }) as IXRGBA[];
}

export function colorWrappersToXrgbaColormap(colorWrappers: IColorEdgePoint[]): IXRGBA[] {
  return colorWrappers.map((colorEdgePoint: IColorEdgePoint, index: number) => {
    return [colorEdgePoint.value, colorEdgePoint.color[0]/255, colorEdgePoint.color[1]/255, colorEdgePoint.color[2]/255, colorEdgePoint.color[3]] as IXRGBA;
  });
}


export function colormapToEdgePoints(colormap: IXRGBA[]): IColorEdgePoint[] {
  return colormap.map((color) => {
    return {
      value: color[0],
      color: [Math.round(color[1] * 255), Math.round(color[2] * 255), Math.round(color[3] * 255), color[4]]
    }
  })
}

export function getGradientForEdgePoints(colorWrappers: IColorEdgePoint[]): chroma.Scale {
  let colors = getColorScaleString();
  let gradient = chroma.scale(colors).domain([...colorWrappers.map(position => position.value)]);
  return gradient;

  function getColorScaleString() {
    let colors = colorWrappers.map(item => {
      return 'rgba(' + item.color.join(',') + ')'
    })
    return colors;
  }
}

export function fromRGBToWebGl(color: IColor): IColor {
  if(color.length === 3) {
    return [color[0]/255, color[1]/255, color[2]/255];
  } else if (color.length === 4) {
    return [color[0]/255, color[1]/255, color[2]/255, color[3]];
  } else {
    return [color[0], color[1]/255, color[2]/255, color[3]/255, color[4]];
  }
}
