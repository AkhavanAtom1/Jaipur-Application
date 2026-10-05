import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run dev:worker` (wrangler dev) listens on 8787.
const SERVER = process.env.JAIPUR_SERVER ?? 'http://localhost:8787';

export default defineConfig({
  root: 'client',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    fs: { allow: ['..'] },
    proxy: {
      '/ws': { target: SERVER, ws: true, changeOrigin: true },
      '/api': { target: SERVER, changeOrigin: true },
    },
  },
  build: { outDir: '../dist/client', emptyOutDir: true },
});
