import { IColorMap } from '../types/colors';

export function isListOfColorMaps(colormap: IColorMap|IColorMap[]) {
  return colormap.some((element: any) => {
    return Array.isArray(element[0]);
  })
}