import point_latitudes from "./points/latitudes_short.txt?url";
import point_longitudes from "./points/longitudes_short.txt?url";
import point_values from "./points/values_short.txt?url";

import bounds_latitudes from "./bounds/latitudes_bounds.txt?url";
import bounds_longitudes from "./bounds/longitudes_bounds.txt?url";
import bounds_values from "./bounds/values_bounds.txt?url";

import raster_latitudes from "./raster/latitudes_grid.txt?url";
import raster_longitudes from "./raster/longitudes_grid.txt?url";
import raster_values from "./raster/values_grid.txt?url";

import antimeridian_latitudes from "./antimeridian/latitudes.txt?url"
import antimeridian_longitudes from "./antimeridian/longitudes.txt?url"
import antimeridian_values from "./antimeridian/values.txt?url"

export async function FileParser(mode: 'swath'|'grid'|'points'|'antimeridian') {
  if(mode === 'points') {
    let latitudes: number[] = await outputPointFileAsArray(point_latitudes) as number[]
    let longitudes: number[] = await outputPointFileAsArray(point_longitudes) as number[]
    let values: number[] = await outputPointFileAsArray(point_values) as number[]

    return {
      latitudes: new Float64Array(latitudes),
      longitudes: new Float64Array(longitudes),
      values: new Float64Array(values.flat())
    }
  } else if (mode === 'grid') {
    let latitudes: number[] = await outputFileAsArray(raster_latitudes) as number[]
    let longitudes: number[] = await outputFileAsArray(raster_longitudes) as number[]
    let values: number[][] = await output2DFileAsArray(raster_values) as number[][]
    return {
      latitudes: new Float64Array(latitudes),
      longitudes: new Float64Array(longitudes),
      values: new Float64Array(values.flat()),
    }
  } else if (mode === 'swath') {
    let latitudes: number[][] = await output2DFileAsArray(bounds_latitudes) as number[][]
    let longitudes: number[][] = await output2DFileAsArray(bounds_longitudes) as number[][]
    let values: number[] = await outputValuesForBounds(bounds_values) as number[]
    return {
      latitudes: new Float64Array(latitudes.flat()),
      longitudes: new Float64Array(longitudes.flat()),
      values: new Float64Array(values),
    }
  } else if (mode === 'antimeridian') {
    let latitudes: number[][] = await outputAntimeridian2DFileAsArray(antimeridian_latitudes) as number[][]
    let longitudes: number[][] = await outputAntimeridian2DFileAsArray(antimeridian_longitudes) as number[][]
    let values: number[] = await outputAntimeridianValuesForBounds(antimeridian_values) as number[]
    return {
      latitudes: new Float64Array(latitudes.flat()),
      longitudes: new Float64Array(longitudes.flat()),
      values: new Float64Array(values),
    }
  }
}

async function outputPointFileAsArray(file: any) {
  var newSplitText: any = [];
  await fetch(file)
    .then(async (response) => {
      let text = await response.text();
      let split = text.split(',');
      newSplitText = split.map(subItem => {
        return parseFloat(subItem.replace(/\s/g,''))
      }).filter(x => {
        return !isNaN(x);
      })
      return newSplitText;
    })
  return newSplitText;
}
async function outputValuesForRaster(file: any) {
  var newSplitText: any = [];
  await fetch(file)
    .then(async (response) => {
      let text = await response.text();
      let split = text.split('\n');
      newSplitText = split.map(subArray => {
        return eval(subArray);
      });
      return newSplitText;
    })
  return newSplitText;
}

async function output2DFileAsArray(file: any) {
  var newSplitText: any = [];
  await fetch(file)
    .then(async (response) => {
      let text = await response.text();
      let split = text.split(',');
      newSplitText = split.map(subArray => {
        return subArray.split(' ').map(subArrayItem => {
          return parseFloat(subArrayItem.replace(/\s/g,''))
        }).filter(filteredSubArrayItem => {
          return !isNaN(filteredSubArrayItem);
        });
      })

      return newSplitText;
    })
  return newSplitText;
}

async function outputAntimeridian2DFileAsArray(file: any) {
  var newSplitText: any = [];
  await fetch(file)
    .then(async (response) => {
      let text = await response.text();
      let split = text.split('\n');
      newSplitText = split.map(subArray => {
        return subArray.split(' ').map(subArrayItem => {
          return parseFloat(subArrayItem.replace(/\s/g,''))
        }).filter(filteredSubArrayItem => {
          return !isNaN(filteredSubArrayItem);
        });
      })

      return newSplitText;
    })
  return newSplitText;
}
async function outputAntimeridianValueFileAsArray(file: any) {
  var newSplitText: any = [];
  await fetch(file)
    .then(async (response) => {
      let text = await response.text();
      let split = text.split('\n');
      newSplitText = split.map(subArray => {
        return subArray.split(' ').map(subArrayItem => {
          return parseFloat(subArrayItem.replace(/\s/g,''))
        }).filter(filteredSubArrayItem => {
          return !isNaN(filteredSubArrayItem);
        });
      })

      return newSplitText;
    })
  return newSplitText;
}

async function outputValuesForBounds(file: any) {
  var newSplitText: any = [];
  await fetch(file)
    .then(async (response) => {
      let text = await response.text();
      let split = text.split(',');
      newSplitText = split.map(item => {
        return parseFloat(item.replace(/\s/g,''))
      })
    })
  return newSplitText;
}

async function outputFileAsArray(file: any): Promise<number[]|number[][]> {
  var newSplitText: number[] = [];
  await fetch(file)
    .then(async (response) => {
      let text = await response.text();
      let split = text.split('\n');
      newSplitText = split.map(item => {
        return parseFloat(item.replace(/\s/g,''))
      })
    })
  return newSplitText;
}

async function output2DFileAsArrayAntimeridian(file: any) {
  var newSplitText: any = [];
  await fetch(file)
    .then(async (response) => {
      let text = await response.text();
      let split = text.split('\n');
      newSplitText = split.map(subArray => {
        return subArray.split(' ').map(subArrayItem => {
          return parseFloat(subArrayItem.replace(/\s/g,''))
        }).filter(filteredSubArrayItem => {
          return !isNaN(filteredSubArrayItem);
        });
      })

      return newSplitText;
    })
  return newSplitText;
}

async function outputAntimeridianValuesForBounds(file: any) {
  var newSplitText: any = [];
  await fetch(file)
    .then(async (response) => {
      let text = await response.text();
      let split = text.split('\n');
      newSplitText = split.map(item => {
        return parseFloat(item.replace(/\s/g,''))
      })
    })
  return newSplitText;
}
