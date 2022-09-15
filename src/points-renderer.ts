import {BaseRenderer} from "./base-renderer";
import {LeafletGlVectorLayerOptions} from "./types/leaflet-gl-vector-layer-options";
import {Map} from "leaflet";
import {DataHelper} from "./helpers/data-helper";
import {IData} from "./types/data";
export class PointsRenderer extends BaseRenderer {

    private data: IData;

    constructor(leafletGlVectorLayerOptions: LeafletGlVectorLayerOptions, map: Map, dataHelper: DataHelper, canvas: HTMLCanvasElement) {
        super(leafletGlVectorLayerOptions, map, dataHelper, canvas);
        this.map = map;
        this.data = leafletGlVectorLayerOptions.data as IData;
        this.drawType = WebGLRenderingContext.POINTS;

    }

    public processData(callback: () => void) {
        if(!this.map) {
            return;
        }
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
            let adjustedValue = (value + this.dataHelper.absoluteCurrentMinValue) / (this.dataHelper.currentMaxValue + this.dataHelper.absoluteCurrentMinValue);
            let color = this.unwrappedGradient[Math.floor(adjustedValue * this.colorFidelity)];
            this.vertices.push(pixel.x, pixel.y, color[0], color[1], color[2], color[3]);
        }
        this.numPoints = this.vertices.length / 6;
        callback();

    }

    public cleanUp() {
        super.cleanUp();
        this.vertices = [];
        this.map = undefined;
    }
}
