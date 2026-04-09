import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
        plugins: [react()],
        server: {
            port: 8001,
            open: true,
            proxy: {
                // Dev convenience: forward to local API when VITE_API_BASE_URL is not set.
                '/api': 'http://localhost:5227',
                '/uploads': 'http://localhost:5227',
            },
        },
        base: './',
    };
});

