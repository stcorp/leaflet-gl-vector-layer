import { LatLngBounds, Point } from 'leaflet';

export type IPolygon = [number, number][];
export type IQuad = [[number, number], [number, number], [number, number], [number, number]];
export type ITriangle = [[number, number], [number, number], [number, number]];
export interface IPoint {
  x: number;
  y: number;
}

export interface LeafletGlVectorLayerOptions {
  data: {
    latitudes: Float32Array;
    longitudes: Float32Array;
    values: Float32Array;
  };
  plot_type: 'points' | 'grid' | 'swath';
  colorrange?: [number, number];
  pointsize?: number;
  colormap?: IColorMap;
  label?: string;
}

export interface IHandler {
  element?: HTMLElement | Document;
  func: (event: any) => void;
  type: string;
}

export interface IData {
  latitudes: Float32Array;
  longitudes: Float32Array;
  values: Float32Array;
}

export type IRGBA = [number, number, number, number];
export type IXRGBA = [number, number, number, number, number];
export type IRGB = [number, number, number];
export type IColorWithLabel = [string, (IRGBA | IXRGBA | IRGB)[]];

export type IColor = IRGBA | IXRGBA | IRGB;
export type IColorMap = (IRGBA | IXRGBA | IRGB)[] | IColorWithLabel;

export interface ICanvasOverlayDrawEvent {
  bounds: LatLngBounds;
  offset: Point;
  scale: number;
  size: Point;
  zoomScale: number;
  zoom: number;
}
