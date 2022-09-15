import {LatLngBounds, Point} from "leaflet";

export interface ICanvasOverlayDrawEvent {
    bounds: LatLngBounds;
    offset: Point;
    scale: number;
    size: Point;
    zoomScale: number;
    zoom: number;
}