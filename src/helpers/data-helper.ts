import { LeafletGlVectorLayerOptions } from '../types/typings';

export class DataHelper {
  private sortedData: Float32Array;
  public minValue: number;
  public currentMinValue: number;
  public currentMaxValue: number;
  public maxValue: number;
  public mean: number;
  public median: number;
  private options: LeafletGlVectorLayerOptions;

  constructor(options: LeafletGlVectorLayerOptions) {
    this.options = {
      ...options
    };
    this.sortedData = options.data.values.slice(0).sort();
    let firstNonInfIndex = 0;
    for(let i = 0; i < this.sortedData.length; i++) {
      if(this.sortedData[i] > -Infinity) {
        firstNonInfIndex = i;
        break;
      }
    }

    this.sortedData = this.sortedData.slice(firstNonInfIndex);

    let indexOfLastNonNan;

    for(let i = this.sortedData.length - 1; isNaN(this.sortedData[i]); i--) {
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
  }

  public getMax() {
    let existingColorRange = this.options.colorrange;
    this.maxValue = this.sortedData[this.sortedData.length - 1];
    if(existingColorRange?.length) {
      this.currentMaxValue = existingColorRange[1];
    } else {
      this.currentMaxValue = this.maxValue;
    }
    return this.maxValue;
  }

  public getMin() {
    let existingColorRange = this.options.colorrange;
    this.minValue = this.sortedData[0];
    if(existingColorRange?.length) {
      this.currentMinValue = existingColorRange[0];
    } else {
      this.currentMinValue = this.minValue;
    }
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

  public setValue(type: 'min'|'max', value: number) {
    if(type === 'min') {
      this.currentMinValue = value;
    } else {
      this.currentMaxValue = value;
    }
  }

  public cleanUp() {
    this.sortedData = new Float32Array([]);
  }
}