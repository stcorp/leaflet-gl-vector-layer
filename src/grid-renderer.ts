import {BaseRenderer} from "./base-renderer";
import {LeafletGlVectorLayerOptions} from "./types/leaflet-gl-vector-layer-options";
import {Map} from "leaflet";
import {DataHelper} from "./helpers/data-helper";
import {IData} from "./types/data";
import {IPolygon, IQuad, ITriangle} from "./types/polygon";

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
        let lonCellOffset = 0;
        let latCellOffset = 0;
        if(this.data.longitudes.length >= 2) {
            lonCellOffset = Math.abs((this.data.longitudes[1] - this.data.longitudes[0])) / 2;
        }
        if(this.data.latitudes.length >= 2) {
            latCellOffset = Math.abs((this.data.latitudes[1] - this.data.latitudes[0])) / 2;
        }
        for(let latIndex = 0; latIndex < this.data.latitudes.length; latIndex++) {
            for (let lonIndex = 0; lonIndex < this.data.longitudes.length; lonIndex++) {
                let index = latIndex*this.data.longitudes.length + lonIndex;
                if(!this.data.values[index] && this.data.values[index] !== 0) {
                    continue;
                }
                let longitudes = [this.data.longitudes[lonIndex] - lonCellOffset, this.data.longitudes[lonIndex] + lonCellOffset];
                let isBelowAntiMeridian = longitudes.some(longitude => (longitude <= -160));
                let isAboveAntiMeridian = longitudes.some(longitude => (longitude >= 160))
                let isCrossAntimeridian = isBelowAntiMeridian && isAboveAntiMeridian;
                let isAbove180 = longitudes.some(longitude => (longitude > 180));
                let isBelow180 = longitudes.some(longitude => (longitude < 180));

                let polygon: IQuad = [
                    [this.data.latitudes[latIndex] + latCellOffset, this.data.longitudes[lonIndex] - lonCellOffset],
                    [this.data.latitudes[latIndex] + latCellOffset, this.data.longitudes[lonIndex] + lonCellOffset],
                    [this.data.latitudes[latIndex] - latCellOffset, this.data.longitudes[lonIndex] + lonCellOffset],
                    [this.data.latitudes[latIndex] - latCellOffset, this.data.longitudes[lonIndex] - lonCellOffset]
                ];
                let value = this.normalizeValue(this.data.values[index]);

                let triangles: ITriangle[] = [];
                if(isBelow180 && isAbove180) {
                    let newPolygons = this.cutPolygonOver180Longitude(polygon);
                    triangles = this.createTrianglesFromPolygons(newPolygons);
                } else if(isCrossAntimeridian) {
                    let newPolygons = this.cutPolygon(polygon);
                    triangles = this.createTrianglesFromPolygons(newPolygons);
                } else {
                    triangles = this.createTrianglesFromQuad(polygon);
                }

                this.addTrianglesToVertices(triangles, value)
            }
        }
        this.numPoints = this.vertices.length / 6;
        callback();
    }

    private cutPolygonOver180Longitude(polygon: IPolygon): [IPolygon, IPolygon] {
        let newNegativePolygon: IPolygon = [];
        let newPositivePolygon: IPolygon = [];
        for(let i = 0; i < polygon.length; i++) {
            if(polygon[i][1] <= 180) {
                newPositivePolygon.push(polygon[i]);
                let nextIndex = (i + 1) % polygon.length;
                let nextLongitude = polygon[nextIndex][1];
                if(nextLongitude > 180) {
                    let halfwayPoint = (polygon[i][0] + polygon[nextIndex][0]) / 2;
                    newNegativePolygon.push([halfwayPoint, -180])
                    newPositivePolygon.push([halfwayPoint, 180])
                }
            } else {
                newNegativePolygon.push([polygon[i][0], polygon[i][1] - 360]);
                let nextIndex = (i + 1) % polygon.length;
                let nextLongitude = polygon[nextIndex][1];
                if(nextLongitude < 180) {
                    let halfwayPoint = (polygon[i][0] + polygon[nextIndex][0]) / 2;
                    newPositivePolygon.push([halfwayPoint, 180])
                    newNegativePolygon.push([halfwayPoint, -180])
                }
            }
        }
        return [newNegativePolygon, newPositivePolygon];
    }

}
