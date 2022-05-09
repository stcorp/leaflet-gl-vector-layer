import { defineConfig } from 'vite'
export default defineConfig({
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:8051',
                changeOrigin: true,
                secure: false,
                ws: true
            }
        },
        port: 8050
    },
    plugins: [

    ]
})