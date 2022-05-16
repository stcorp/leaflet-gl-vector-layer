

export interface LeafletGlVectorLayerOptions {
    data: {
        latitudes: Float64Array,
        longitudes: Float64Array,
        values: Float64Array
    },
    plot_type: 'points' | 'grid' | 'swath',
    colorrange?: [number, number],
    pointsize?: number
}
