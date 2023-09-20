import { IColorMap } from '../types/typings';

export function isListOfColorMaps(colormap: IColorMap|IColorMap[]) {
  return colormap.some((element: any) => {
    return Array.isArray(element[0]);
  })
}