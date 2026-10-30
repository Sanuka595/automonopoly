import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        port: 5173,
        host: true,
        proxy: {
            '/socket.io': {
                target: 'http://127.0.0.1:3005',
                ws: true,
                changeOrigin: true,
            },
            '/dev': {
                target: 'http://127.0.0.1:3005',
                changeOrigin: true,
            },
            '/health': {
                target: 'http://127.0.0.1:3005',
                changeOrigin: true,
            },
        },
    },
});
