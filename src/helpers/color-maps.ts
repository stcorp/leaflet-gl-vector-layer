import {getColor} from "./color-map-names";

let s5pPalColorMaps = [
  [[0, 0, 0, 1], [0, 64, 129, 1], [0, 108, 217, 1], [0, 184, 255, 1], [0, 230, 255, 1], [90, 255, 166, 1], [229, 255, 26, 1], [255, 186, 0, 1], [255, 0, 0, 1]],
  [[232, 236, 251, 1], [143, 86, 159, 1], [78, 149, 189, 1], [115, 181, 131, 1], [201, 184, 67, 1], [229, 115, 48, 1], [206, 34, 33, 1], [111, 29, 22, 1], ],
]
export const ColorMaps: [number, number, number, number, number][][] = [
  getColor('gist_rainbow'),
  getColor('gist_stern'),
  getColor('gnuplot'),
  getColor('jet'),
  getColor('ocean'),
  getColor('magma'),
  getColor('Blues'),
  getColor('BrBG'),
  getColor('OrRd'),
  getColor('GnBu'),
  getColor('RdYlGn'),
  getColor('Spectral'),
  s5pPalColorMaps[0].map((color, index) => {
    return [index/(s5pPalColorMaps[0].length - 1), ...color] as [number, number, number, number, number]
  }),
  s5pPalColorMaps[1].map((color, index) => {
    return [index/(s5pPalColorMaps[0].length - 1), ...color] as [number, number, number, number, number]
  })
]
