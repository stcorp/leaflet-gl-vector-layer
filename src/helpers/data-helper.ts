import {LeafletGlVectorLayer} from "../leaflet-gl-vector-layer";

export class DataHelper {
  private sortedData: Float32Array;
  public minValue: number;
  public currentMinValue: number;
  public currentMaxValue: number;
  public maxValue: number;
  public absoluteCurrentMinValue: number;
  public absoluteCurrentMaxValue: number;
  public mean: number;
  public median: number;

  constructor(private layer: LeafletGlVectorLayer) {
    this.sortedData = this.layer.options.leafletGlVectorLayerOptions.data.values.slice(0).sort();
    let firstNonInfIndex = 0;
    for(let i = 0; i < this.sortedData.length; i++) {
      if(this.sortedData[i] > -Infinity) {
        firstNonInfIndex = i;
        break;
      }
    }

    this.sortedData = this.sortedData.slice(firstNonInfIndex);

    let indexOfLastNonNan;

    for(var i = this.sortedData.length - 1; isNaN(this.sortedData[i]); i--) {
      indexOfLastNonNan = i;
    }
    this.sortedData = this.sortedData.slice(0, indexOfLastNonNan);


    this.getMax();
    this.getMin();
    this.getMean();
    this.getMedian();
  }

  public updateLimits(limits: {min: number, max: number}) {
    this.currentMinValue = limits.min;
    this.currentMaxValue = limits.max;
    this.absoluteCurrentMinValue = Math.abs(this.currentMinValue);
    this.absoluteCurrentMaxValue = Math.abs(this.currentMaxValue);
  }

  public getMax() {
    let existingColorRange = this.layer.options.leafletGlVectorLayerOptions.colorrange;
    this.maxValue = this.sortedData[this.sortedData.length - 1];
    if(existingColorRange?.length) {
      this.currentMaxValue = existingColorRange[1];
    } else {
      this.currentMaxValue = this.maxValue;
    }
    this.absoluteCurrentMaxValue = Math.abs(this.currentMaxValue);
    return this.maxValue;
  }

  public getMin() {
    let existingColorRange = this.layer.options.leafletGlVectorLayerOptions.colorrange;
    this.minValue = this.sortedData[0];
    if(existingColorRange?.length) {
      this.currentMinValue = existingColorRange[0];
    } else {
      this.currentMinValue = this.minValue;
    }
    this.absoluteCurrentMinValue = Math.abs(this.currentMinValue);
    return this.minValue;
  }

  public getMedian() {
    let median = this.sortedData[Math.floor(this.sortedData.length / 2)];
    this.median = parseFloat(median.toFixed(2));
    return this.median;
  }

  public getMean() {
    this.mean = this.sortedData.reduce((a, b) => a + b, 0) / this.sortedData.length;
    this.mean = parseFloat(this.mean.toFixed(2));
    return this.mean;
  }

  public setValue(type: 'currentMinValue'|'currentMaxValue', value: number) {
    this[type] = value;
  }
}