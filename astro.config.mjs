// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import { pruneUnusedAssets } from './tools/prune-unused-assets.mjs';

const API_ORIGIN = process.env.API_ORIGIN ?? 'http://127.0.0.1:4000';

export default defineConfig({
  site: 'https://andrika-aliva.my.id',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [pruneUnusedAssets()],
  vite: {
    plugins: [tailwindcss()],
    server: {
      // The invitation always talks to /api on its own origin. In production
      // Caddy forwards that path to the Node API; dev mirrors the same shape
      // so the fetch code never needs an environment switch.
      proxy: {
        '/api': { target: API_ORIGIN, changeOrigin: false },
      },
    },
  },
});
