import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En développement, Vite redirige /api, /health et /version vers le backend Node (port 3000)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
      '/version': 'http://localhost:3000',
    },
  },
});
