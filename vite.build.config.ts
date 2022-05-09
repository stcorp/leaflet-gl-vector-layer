import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

function toSnakeCase(name: string) {
  return name.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}
export default defineConfig({
  build: {
    outDir: './dist',
    lib: {
      entry: './src/index.ts',
      name: 'leafletGlVectorLayer',
      fileName: (format) => `index.${format}.js`
    },
    rollupOptions: {
      external: ['leaflet'],
      output: {
        assetFileNames: (assetInfo) => {
          if(assetInfo.name === 'style.css') {
            return 'leaflet-gl-vector-layer.css';
          }
          return assetInfo.name as string;
        },
        entryFileNames: (fileInfo) => {
          if(fileInfo.name === 'index') {
            return 'leaflet-gl-vector-layer.[format].js'
          } else {
            return fileInfo.name;
          }
        },
        globals: {
          'leaflet': 'L'
        }
      }
    }
  }
})