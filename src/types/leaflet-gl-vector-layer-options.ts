import { IColor, IXrgbaColor } from './colors';


export interface LeafletGlVectorLayerOptions {
    data: {
        latitudes: Float32Array,
        longitudes: Float32Array,
        values: Float32Array
    },
    plot_type: 'points' | 'grid' | 'swath';
    colorrange?: [number, number];
    pointsize?: number;
    colormap?: IColor[];
}

export interface LeafletGlVectorLayerProcessedOptions extends LeafletGlVectorLayerOptions {
    colormap?: IXrgbaColor[];
}