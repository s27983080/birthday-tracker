/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';

export default defineConfig({
  // vuetify() imports each Vuetify component (and its CSS) where a template uses it.
  plugins: [vue(), vuetify()],
  server: {
    // In local dev (`npm run dev`), mirror the nginx /api proxy used in the container.
    proxy: {
      '/api': {
        target: process.env.API_URL ?? 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    // Vuetify's modules import their own CSS, which only works if Vite processes them rather than Node.
    server: { deps: { inline: ['vuetify'] } },
    setupFiles: ['./src/test-setup.ts'],
  },
});
