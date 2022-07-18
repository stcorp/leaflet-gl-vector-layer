import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import '../src/styles/index.scss';
import {LeafletGlVectorLayer, LeafletGlVectorLayerWrapper} from '../src';
import {FileParser} from "./fileParser";

const map = L.map('map', {})
  .setView([50.00, 14.44], 0);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
  .addTo(map);


let data: any;
initData('grid');
async function initData(mode: 'points'|'grid'|'swath'|'antimeridian') {
    data = await FileParser(mode);
    let dataMode = mode === 'antimeridian' ? 'swath' : mode;
    let leafletGlVectorLayerOptions: any = {
        leafletGlVectorLayerOptions: {
            data: {
                ...data
            },
            plot_type: dataMode
        }
    }
    let newGL = new LeafletGlVectorLayerWrapper();
    let layer = new LeafletGlVectorLayer(leafletGlVectorLayerOptions);
    newGL.addTo(map);
    newGL.addLayer(layer);
}

