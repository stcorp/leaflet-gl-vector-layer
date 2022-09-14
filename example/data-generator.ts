export function GenerateExampleData(mode: 'grid'|'swath'|'points') {
  if(mode === 'grid') {
    return generateGridData();
  } else if (mode === 'swath') {
    return generateSwathData();
  } else if (mode === 'points') {
    return generatePointData();
  } else {
    console.error('Unknown mode');
  }
}

function generateGridData() {
  let lons = Array.from({length: 180}, (v, i) => (i - 90));
  let lats = Array.from({length: 85}, (v, i) => i);
  let vals: number[] = [];
  for(let i = 0; i < lons.length; i++) {
    for(let j = 0; j < lats.length; j++) {
      vals.push(Math.random() );
    }
  }
  return {longitudes: new Float32Array(lons), latitudes: new Float32Array(lats), values: new Float32Array(vals)};
}

function generateSwathData() {
  let lons = Array.from({length: 10000}, (v, i) => ((Math.random() * 360) - 180));
  let lats = Array.from({length: 10000}, (v, i) => ((Math.random() * 180) - 90));
  let newLons = lons.map(lon => {
    return [lon - Math.random(), lon + Math.random(), lon + Math.random(), lon - Math.random()];
  })
  let newLats = lats.map(lat => {
    return [lat + Math.random(), lat + Math.random(), lat - Math.random(), lat - Math.random()];
  })
  let newVals = lons.map(lon => Math.random());
  return {longitudes: new Float32Array(newLons.flat()), latitudes: new Float32Array(newLats.flat()), values: new Float32Array(newVals)};

}

function generatePointData() {
  let lons = Array.from({length: 200}, (v, i) => Math.random() * 360 - 180);
  let lats = Array.from({length: 200}, (v, i) => Math.random() * 180 - 90);
  let vals = lons.map(lon => Math.random());
  return {longitudes: lons, latitudes: lats, values: vals};
}