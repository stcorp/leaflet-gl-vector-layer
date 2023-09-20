import { BaseRenderer } from './base-renderer';
import { LeafletGlVectorLayerOptions } from './types/typings';
import { Map } from 'leaflet';
import { DataHelper } from './helpers/data-helper';
import { IData } from './types/typings';
import { IPolygon, IQuad, ITriangle } from './types/typings';

export class GridRenderer extends BaseRenderer {
  private data: IData;

  constructor(
    leafletGlVectorLayerOptions: LeafletGlVectorLayerOptions,
    map: Map,
    dataHelper: DataHelper,
    canvas: HTMLCanvasElement
  ) {
    super(leafletGlVectorLayerOptions, map, dataHelper, canvas);
    this.map = map;
    this.data = leafletGlVectorLayerOptions.data as IData;
    this.drawType = WebGLRenderingContext.TRIANGLES;
    this.vertices = [];
  }

  public processData(callback: () => void) {
    super.processData();
    this.vertices = [];
    const isMidPoints = this.data.longitudes.length * this.data.latitudes.length === this.data.values.length;
    if (isMidPoints) {
      this.processMidPointData(callback);
    } else {
      this.processCellEdgeData(callback);
    }
  }

  private processCellEdgeData(callback: () => void) {
    for (let latIndex = 0; latIndex < this.data.latitudes.length - 1; latIndex++) {
      for (let lonIndex = 0; lonIndex < this.data.longitudes.length - 1; lonIndex++) {
        const index = latIndex * this.data.longitudes.length + lonIndex;
        const currentValue = this.data.values[index];
        if (!currentValue && currentValue !== 0) {
          continue;
        }
        const longitudes = [this.data.longitudes[lonIndex], this.data.longitudes[lonIndex + 1]] as [number, number];
        const latitudes = [this.data.latitudes[latIndex], this.data.latitudes[latIndex + 1]] as [number, number];
        const polygon = this.createPolygon(latitudes, longitudes);
        const meridianChecks = this.calculateMeridianChecks(longitudes);
        const value = this.normalizeValue(this.data.values[index]);
        let triangles: ITriangle[] = [];
        if (meridianChecks.isCrossAntimeridian) {
          const newPolygons = this.cutPolygon(polygon);
          triangles = this.createTrianglesFromPolygons(newPolygons);
        } else {
          triangles = this.createTrianglesFromQuad(polygon);
        }
        this.addTrianglesToVertices(triangles, value);
      }
    }
    this.numPoints = this.vertices.length / 6;
    callback();
  }

  private processMidPointData(callback: () => void) {
    let lonCellOffset = 0;
    let latCellOffset = 0;
    if (this.data.longitudes.length >= 2) {
      lonCellOffset = Math.abs(this.data.longitudes[1] - this.data.longitudes[0]) / 2;
    }
    if (this.data.latitudes.length >= 2) {
      latCellOffset = Math.abs(this.data.latitudes[1] - this.data.latitudes[0]) / 2;
    }
    for (let latIndex = 0; latIndex < this.data.latitudes.length; latIndex++) {
      for (let lonIndex = 0; lonIndex < this.data.longitudes.length; lonIndex++) {
        const index = latIndex * this.data.longitudes.length + lonIndex;
        if (!this.data.values[index] && this.data.values[index] !== 0) {
          continue;
        }
        const longitudes = [
          this.data.longitudes[lonIndex] - lonCellOffset,
          this.data.longitudes[lonIndex] + lonCellOffset,
        ] as [number, number];
        const latitudes = [
          this.data.latitudes[latIndex] + latCellOffset,
          this.data.latitudes[latIndex] - latCellOffset,
        ] as [number, number];

        const meridianChecks = this.calculateMeridianChecks(longitudes);
        const polygon = this.createPolygon(latitudes, longitudes);
        const value = this.normalizeValue(this.data.values[index]);
        let triangles: ITriangle[] = [];
        if (meridianChecks.isBelow180 && meridianChecks.isAbove180) {
          const newPolygons = this.cutPolygonOver180Longitude(polygon);
          triangles = this.createTrianglesFromPolygons(newPolygons);
        } else if (meridianChecks.isCrossAntimeridian) {
          const newPolygons = this.cutPolygon(polygon);
          triangles = this.createTrianglesFromPolygons(newPolygons);
        } else {
          triangles = this.createTrianglesFromQuad(polygon);
        }

        this.addTrianglesToVertices(triangles, value);
      }
    }
    this.numPoints = this.vertices.length / 6;
    callback();
  }

  private cutPolygonOver180Longitude(polygon: IPolygon): [IPolygon, IPolygon] {
    const newNegativePolygon: IPolygon = [];
    const newPositivePolygon: IPolygon = [];
    for (let i = 0; i < polygon.length; i++) {
      if (polygon[i][1] <= 180) {
        newPositivePolygon.push(polygon[i]);
        const nextIndex = (i + 1) % polygon.length;
        const nextLongitude = polygon[nextIndex][1];
        if (nextLongitude > 180) {
          const halfwayPoint = (polygon[i][0] + polygon[nextIndex][0]) / 2;
          newNegativePolygon.push([halfwayPoint, -180]);
          newPositivePolygon.push([halfwayPoint, 180]);
        }
      } else {
        newNegativePolygon.push([polygon[i][0], polygon[i][1] - 360]);
        const nextIndex = (i + 1) % polygon.length;
        const nextLongitude = polygon[nextIndex][1];
        if (nextLongitude < 180) {
          const halfwayPoint = (polygon[i][0] + polygon[nextIndex][0]) / 2;
          newPositivePolygon.push([halfwayPoint, 180]);
          newNegativePolygon.push([halfwayPoint, -180]);
        }
      }
    }
    return [newNegativePolygon, newPositivePolygon];
  }

  private createPolygon(latitudes: [number, number], longitudes: [number, number]): IQuad {
    return [
      [latitudes[0], longitudes[0]],
      [latitudes[0], longitudes[1]],
      [latitudes[1], longitudes[1]],
      [latitudes[1], longitudes[0]],
    ];
  }

  private calculateMeridianChecks(longitudes: [number, number]) {
    const isBelowAntiMeridian = longitudes.some(longitude => longitude <= -160);
    const isAboveAntiMeridian = longitudes.some(longitude => longitude >= 160);
    const isCrossAntimeridian = isBelowAntiMeridian && isAboveAntiMeridian;
    const isAbove180 = longitudes.some(longitude => longitude > 180);
    const isBelow180 = longitudes.some(longitude => longitude < 180);
    return {
      isBelowAntiMeridian,
      isAboveAntiMeridian,
      isCrossAntimeridian,
      isAbove180,
      isBelow180,
    };
  }

  public cleanUp() {
    super.cleanUp();
    this.vertices = [];
    this.map = undefined;
  }
}
