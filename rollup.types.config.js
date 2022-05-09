import dts from "rollup-plugin-dts";

export default {
    input: 'dist/types/src/leaflet-gl-vector-layer.d.ts',
    plugins: [
        dts()
    ],
    output: [
        {
            file: 'dist/typings.d.ts',
            format: "es"
        }
    ]
}
