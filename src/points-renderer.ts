import { BaseRenderer } from './base-renderer';
import { LeafletGlVectorLayerOptions } from './types/typings';
import { Map } from 'leaflet';
import { DataHelper } from './helpers/data-helper';
import { IData } from './types/typings';
export class PointsRenderer extends BaseRenderer {
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
    this.drawType = WebGLRenderingContext.POINTS;
  }

  public processData(callback: () => void) {
    if (!this.map) {
      return;
    }
    super.processData();

    this.vertices = [];
    this.vertexValues = [];
    for (let index = 0; index < this.data.longitudes.length; index++) {
      if (!this.data.values[index] && this.data.values[index] !== 0) {
        continue;
      }
      const pixel = this.map.project([this.data.latitudes[index], this.data.longitudes[index]], 0);
      const value = this.normalizeValue(this.data.values[index]);
      this.vertexValues.push(value);
      const adjustedValue =
        (value - this.dataHelper.currentMinValue) /
        (this.dataHelper.currentMaxValue - this.dataHelper.currentMinValue || 1);
      const color = this.unwrappedGradient[Math.floor(adjustedValue * this.colorFidelity)];
      this.vertices.push(pixel.x, pixel.y, color[0] / 255, color[1] / 255, color[2] / 255, color[3]);
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
