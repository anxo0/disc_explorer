// @ts-check
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

export default defineConfig({
  site: 'https://disc-explorer.vercel.app',
  integrations: [svelte()],
  // Rutas relativas: el mismo build sirve para Vercel y para la app de escritorio (Electron).
  build: { assets: 'assets', format: 'file' },
  vite: {
    // ffmpeg.wasm crea su propio worker; Vite no debe pre-empaquetarlo.
    optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] },
    worker: { format: 'es' },
  },
});
