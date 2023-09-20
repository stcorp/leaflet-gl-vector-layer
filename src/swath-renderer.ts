import {BaseRenderer} from "./base-renderer";
import {LeafletGlVectorLayerOptions} from "./types/typings";
import {DataHelper} from "./helpers/data-helper";
import {IData} from "./types/typings";
import { IQuad, ITriangle} from "./types/typings";
export class SwathRenderer extends BaseRenderer {

    private data: IData;
    private index: number;

    constructor(leafletGlVectorLayerOptions: LeafletGlVectorLayerOptions, map: L.Map, dataHelper: DataHelper, canvas: HTMLCanvasElement) {
        super(leafletGlVectorLayerOptions, map, dataHelper, canvas);
        this.data = leafletGlVectorLayerOptions.data as IData;
        this.map = map;
        this.index = 0;
        this.drawType = WebGLRenderingContext.TRIANGLES;
    }

    public processData(callback: () => void) {
        super.processData();
        this.vertices = [];
        let values = this.data.values
        for(var index = 0; index < this.data.latitudes.length; index += 4) {
            if(!values[index / 4] && values[index/4] !== 0) {
                continue;
            }
            let value = this.normalizeValue(values[index / 4]);
            let longitudesForSquare = [this.data.longitudes[index], this.data.longitudes[index + 1], this.data.longitudes[index + 2], this.data.longitudes[index + 3]]

            let isCrossAntiMeridian = longitudesForSquare.some(longitude => (longitude <= -160) && longitudesForSquare.some(longitude => (longitude >= 60)));

            let polygon: IQuad = [
              [this.data.latitudes[index], this.data.longitudes[index]],
              [this.data.latitudes[index + 1], this.data.longitudes[index + 1]],
              [this.data.latitudes[index + 2], this.data.longitudes[index + 2]],
              [this.data.latitudes[index + 3], this.data.longitudes[index + 3]],
            ]
            let triangles: ITriangle[] = [];
            if(isCrossAntiMeridian) {
                let polygons = this.cutPolygon(polygon);
                triangles = this.createTrianglesFromPolygons(polygons);
            } else {
                triangles = this.createTrianglesFromQuad(polygon)
            }
            this.addTrianglesToVertices(triangles, value);
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
