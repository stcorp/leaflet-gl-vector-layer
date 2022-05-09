import {BaseRenderer} from "./base-renderer";
import {LeafletGlVectorLayerOptions} from "./types/leaflet-gl-vector-layer-options";
import {Map} from "leaflet";
import {DataHelper} from "./helpers/data-helper";
import {IData} from "./types/data";
export class PointsRenderer extends BaseRenderer {

    private data: IData;
    public map: Map;

    constructor(leafletGlVectorLayerOptions: LeafletGlVectorLayerOptions, canvas: HTMLCanvasElement, map: Map, dataHelper: DataHelper) {
        super(leafletGlVectorLayerOptions, canvas, map, dataHelper);
        this.map = map;
        this.data = leafletGlVectorLayerOptions.data as IData;
        this.drawType = this.gl.POINTS;

    }

    public processData(callback: () => void) {
        super.processData();

        this.vertices = [];
        this.vertexValues = [];
        for(var index = 0; index < this.data.longitudes.length; index++) {
            if(!this.data.values[index] && this.data.values[index] !== 0) {
                continue;
            }
            let pixel = this.map.project([this.data.latitudes[index], this.data.longitudes[index]], 0);
            let value = this.normalizeValue(this.data.values[index]);
            this.vertexValues.push(value);
            this.vertices.push(...super.buildPixel(pixel, value));
        }
        this.numPoints = this.vertices.length / 6;
        callback();

    }
}
