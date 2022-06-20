import {LatLngBounds, Point} from "leaflet";
import {GlCollectionWrapper} from "../base-renderer";

export interface ICanvasOverlayDrawEvent {
    bounds: LatLngBounds;
    offset: Point;
    scale: number;
    size: Point;
    zoomScale: number;
    zoom: number;
    glContextWrapper: GlCollectionWrapper;
}