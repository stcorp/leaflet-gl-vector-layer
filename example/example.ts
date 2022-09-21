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
    let data2 = GenerateExampleData('grid');
    let leafletGlVectorLayerOptions: any = {
        leafletGlVectorLayerOptions: {
            data: {
                ...data
            },
            plot_type: mode,
            colormap: [[0, 1, 0, 0, 1], [0.5, 0, 1, 0, 1], [1, 0, 0, 1, 1]],
            colormaps: [
                [[0, 0.2, 0.4, 0.6, 1], [0.5, 0.2, 1, 0, 1], [1, 1, 0.2, 1, 1]],
                [[0, 1, 0, 0, 1], [0.2, 0.4, 1, 0.2, 1], [1, 0.8, 0.5, 0, 1]],
            ],
            colorrange: [0, 2]
        }
    }
    let leafletGlVectorLayerOptions2: any = {
        leafletGlVectorLayerOptions: {
            data: {
                ...data2
            },
            plot_type: 'grid'
        }
    }
    let newGL = new LeafletGlVectorLayerWrapper();
    let layer = new LeafletGlVectorLayer(leafletGlVectorLayerOptions);
    let layer2 = new LeafletGlVectorLayer(leafletGlVectorLayerOptions2);
    newGL.addTo(map);
    newGL.addLayer(layer);
    newGL.addLayer(layer2);
}

