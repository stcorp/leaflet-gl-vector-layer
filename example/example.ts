import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import '../src/styles/index.scss';
import {LeafletGlVectorLayer, LeafletGlVectorLayerWrapper} from '../src';
import { GenerateExampleData } from './data-generator';

const map = L.map('map', {})
  .setView([50.00, 14.44], 0);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
  .addTo(map);


let data: any;
initData('points');
async function initData(mode: 'points'|'grid'|'swath') {
    data = GenerateExampleData(mode);
    let leafletGlVectorLayerOptions: any = {
        leafletGlVectorLayerOptions: {
            data: {
                ...data
            },
            plot_type: mode
        }
    }
    let newGL = new LeafletGlVectorLayerWrapper();
    let layer = new LeafletGlVectorLayer(leafletGlVectorLayerOptions);
    newGL.addTo(map);
    newGL.addLayer(layer);
}

