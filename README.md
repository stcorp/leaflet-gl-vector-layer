# A plugin for creating a GL vector-layer to visualize large amounts of points and polygons

### About

This plugin can be used to visualize large amounts of data on top of a Leaflet-map.
Supports points and polygons.

### Installation

`npm install @stcorp/leaflet-gl-vector-layer`
`yarn add @stcorp/leaflet-gl-vector-layer`

### Usage

```js
// Import leaflet
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';

// Import plugin
import {LeafletGlVectorLayerWrapper, LeafletGlVectorLayer} from '@stcorp/leaflet-gl-vector-layer';
import '@stcorp/leaflet-gl-vector-layer/dist/index.css';
// Create a leaflet-map
const map = L.map('map')
    .setView([50.00, 14.44], 0);

const data = {
    latitudes: [1.0, 2.0, 3.0],
    longitudes: [-3.0, 2.0, 5.0],
    values: [255, 255, 255]
}

const options = {
    leafletGlVectorLayerOptions: {
        data: data,
        plot_type: 'points' //or 'grid'/'swath'
    }
}

// Create wrapper, add it to map, and add a layer to the wrapper.
let wrapper = new LeafletGlVectorLayerWrapper();
let layer = new LeafletGlVectorLayer(options);
wrapper.addTo(map);
wrapper.addlayer(layer);


// Support multiple layers like so:

let wrapper = new LeafletGlVectorLayerWrapper();
let layer = new LeafletGlVectorLayer(options);
let layer2 = new LeafletGlVectorLayer(options2);
wrapper.addTo(map);
wrapper.addlayer(layer);
wrapper.addlayer(layer2);
```