import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';

export default defineConfig({
  root: '.',
  publicDir: 'src/web/public',
  server: {
    port: 3001,
    strictPort: true,
    proxy: {
      '/api/downloads/ws': {
        target: 'ws://127.0.0.1:3000',
        ws: true,
      },
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '~': '/src/web',
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: 'src/web',
    }),
    viteReact(),
    nitro({
      features: {
        websocket: true,
      },
      serverDir: 'src/web/nitro',
    }),
  ],
});
