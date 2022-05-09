import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import '../src/styles/index.scss';
import {FileParser} from "./fileParser";
import {LeafletGlVectorLayerWrapper} from "../src";
import {LeafletGlVectorLayer} from "../src";

const map = L.map('map', {})
  .setView([50.00, 14.44], 0);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
  .addTo(map);
// TODO: Clean up


let data: any;
initData('swath');
async function initData(mode: 'points'|'grid'|'swath'|'antimeridian') {
    // Init data
    data = await FileParser(mode);
    let data2 = await FileParser('points');
    let data3 = await FileParser('grid');
    // Create overlay on the map
    let dataMode = mode === 'antimeridian' ? 'swath' : mode;
    let leafletGlVectorLayerOptions: any = {
        leafletGlVectorLayerOptions: {
            data: {
                ...data
            },
            plot_type: dataMode
        }
    }
    let leafletGlVectorLayerOptions2: any = {
        leafletGlVectorLayerOptions: {
            data: {
                ...data2
            },
            plot_type: 'points'
        }
    }
    // @ts-ignore
    data3.values[0] = -Infinity;
    let leafletGlVectorLayerOptions3: any = {
        leafletGlVectorLayerOptions: {
            data: {
                ...data3
            },
            plot_type: 'grid'
        }
    }
    let newGL = new LeafletGlVectorLayerWrapper();
    let layer3 = new LeafletGlVectorLayer(leafletGlVectorLayerOptions3);
    // let layer2 = new LeafletGlVectorLayer(leafletGlVectorLayerOptions);
    // let layer1 = new LeafletGlVectorLayer(leafletGlVectorLayerOptions2);
    newGL.addTo(map);
    // newGL.addLayer(layer1);
    // newGL.addLayer(layer2);
    newGL.addLayer(layer3);
    // newGL.addLayer(layer2);
    // newGL.addLayer(layer1);
}

