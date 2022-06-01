import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: './dist',
    lib: {
      entry: './src/index.ts',
      name: 'leafletGlVectorLayer',
      formats: ['es', 'umd'],
      fileName: (format) => `index.${format}.js`
    },
    rollupOptions: {
      external: ['leaflet'],
      output: {
        assetFileNames: (assetInfo) => {
          if(assetInfo.name === 'style.css') {
            return 'index.css';
          }
          return assetInfo.name as string;
        },
        globals: {
          'leaflet': 'L'
        }
      }
    }
  }
})