import {BaseRenderer} from "./base-renderer";
import {LeafletGlVectorLayerOptions} from "./types/leaflet-gl-vector-layer-options";
import {Map} from "leaflet";
import {DataHelper} from "./helpers/data-helper";
import {IData} from "./types/data";
import {IQuad, ITriangle} from "./types/polygon";

// Assumes that given latitudes and longitudes are center-points of the polygons.
export class GridRenderer extends BaseRenderer {

    private data: IData;
    public map: Map;

    constructor(leafletGlVectorLayerOptions: LeafletGlVectorLayerOptions, canvases: HTMLCanvasElement[], map: Map, dataHelper: DataHelper) {
        super(leafletGlVectorLayerOptions, canvases, map, dataHelper);
        this.map = map;
        this.data = leafletGlVectorLayerOptions.data as IData;
        this.drawType = WebGLRenderingContext.TRIANGLES;
    }

    public processData(callback: () => void) {
        super.processData();
        this.vertices = [];
        let cellOffset = 0;
        if(this.data.longitudes.length >= 2) {
            cellOffset = (this.data.longitudes[1] - this.data.longitudes[0]);
        }
        for(let latIndex = 0; latIndex < this.data.latitudes.length - 1; latIndex++) {
            for (let lonIndex = 0; lonIndex < this.data.longitudes.length - 1; lonIndex++) {
                let index = latIndex*this.data.longitudes.length + lonIndex;
                if(!this.data.values[index] && this.data.values[index] !== 0) {
                    continue;
                }
                let longitudes = [this.data.longitudes[lonIndex], this.data.longitudes[lonIndex + 1]];
                let isBelowAntiMeridian = longitudes.some(longitude => (longitude <= -160));
                let isAboveAntiMeridian = longitudes.some(longitude => (longitude >= 160))
                let isCrossAntimeridian = isBelowAntiMeridian && isAboveAntiMeridian;
                let polygon: IQuad = [
                    [this.data.latitudes[latIndex], this.data.longitudes[lonIndex] - cellOffset],
                    [this.data.latitudes[latIndex], this.data.longitudes[lonIndex + 1] - cellOffset],
                    [this.data.latitudes[latIndex + 1], this.data.longitudes[lonIndex + 1] - cellOffset],
                    [this.data.latitudes[latIndex + 1], this.data.longitudes[lonIndex] - cellOffset]
                ];
                let value = this.normalizeValue(this.data.values[index]);
                let triangles: ITriangle[] = [];
                if(isCrossAntimeridian) {
                    let newPolygons = this.cutPolygon(polygon);
                    triangles = this.createTrianglesFromPolygons(newPolygons);
                } else {
                    triangles = this.createTrianglesFromQuad(polygon);
                }
                this.addTrianglesToVertices(triangles, value)
            }
        }
        this.addMissingColumnOfQuads();
        this.numPoints = this.vertices.length / 6;
        callback();
    }

    private addMissingColumnOfQuads() {
        for(let latIndex = 0; latIndex < this.data.latitudes.length - 1; latIndex++) {
            let longitudes = [this.data.longitudes[this.data.longitudes.length - 2], this.data.longitudes[this.data.longitudes.length - 1]];
            let isBelowAntiMeridian = longitudes.some(longitude => (longitude <= -160));
            let isAboveAntiMeridian = longitudes.some(longitude => (longitude >= 160))
            let isCrossAntimeridian = isBelowAntiMeridian && isAboveAntiMeridian;
            let index = latIndex*this.data.longitudes.length + (this.data.longitudes.length - 1);

            let polygon: IQuad = [
                [this.data.latitudes[latIndex], this.data.longitudes[this.data.longitudes.length - 2]],
                [this.data.latitudes[latIndex], this.data.longitudes[this.data.longitudes.length - 1]],
                [this.data.latitudes[latIndex + 1], this.data.longitudes[this.data.longitudes.length - 1]],
                [this.data.latitudes[latIndex + 1], this.data.longitudes[this.data.longitudes.length - 2]]
            ];
            let value = this.normalizeValue(this.data.values[index]);
            let triangles: ITriangle[] = [];
            if(isCrossAntimeridian) {
                let newPolygons = this.cutPolygon(polygon);
                triangles = this.createTrianglesFromPolygons(newPolygons);
            } else {
                triangles = this.createTrianglesFromQuad(polygon);
            }
            this.addTrianglesToVertices(triangles, value)
        }
    }
}
