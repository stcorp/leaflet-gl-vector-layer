# A plugin for visualizing large amounts of data on a GL-overlay on top of Leaflet

### About

This plugin can be used to visualize large amounts of data on top of a Leaflet-map.
Supports points, rasterized data, and triangles. 

### Installation

`npm install leaflet-gl-canvas`

### Usage

```js
// Import leaflet
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';

// Import plugin
const GlFeatureLayer = require('leaflet-gl-canvas');

// Create a leaflet-map
const map = L.map('map')
    .setView([50.00, 14.44], 0);

const data = {
    latitudes: [1.0, 2.0, 3.0],
    longitudes: [-3.0, 2.0, 5.0],
    values: [255, 255, 255]
}

const options = {
    glLayerOptions: {
        points: data // or raster or bounds
    }
}
const leafletGlCanvas = new LeafletGlCanvas(options);
leafletGlCanvas.addTo(map);
```