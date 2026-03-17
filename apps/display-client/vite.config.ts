import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ['displaygrid.test'],
    proxy: {
      '/api':    { target: 'http://localhost:3000', changeOrigin: true },
      '/ws-api': { target: 'ws://localhost:3001',  ws: true, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
  },
});
