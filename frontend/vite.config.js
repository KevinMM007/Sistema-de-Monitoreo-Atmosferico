import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    define: {
        // Cambia esto
        'VITE_GOOGLE_MAPS_API_KEY': JSON.stringify('AIzaSyC9Z_dL6OfvW6ORXz6lupP5-8Jc_Sl67z8')
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
                secure: false
            }
        }
    }
});