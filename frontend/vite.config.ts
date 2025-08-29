import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: process.env.PORT,
        proxy: {
            '/api': {
                target: 'http://api:' + process.env.BACKEND_PORT,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '')
            }
        }
    }
})
