import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: './dist',
    lib: {
      entry: './src/index.ts',
      name: 'leafletGlVectorLayer',
      formats: ['es'],
      fileName: (format) => `index.js`
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
        entryFileNames: (fileInfo) => {
          if(fileInfo.name === 'index') {
            return 'index.js'
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