import devServer from '@hono/vite-dev-server';
import bunAdapter from '@hono/vite-dev-server/bun';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

import { terminalDevPlugin } from './server/dev/terminal-dev-plugin';

function previewHostPlugin(): Plugin {
  return {
    name: 'aero-preview-host',

    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const host = req.headers.host ?? '';

        const match = host.match(
          /^([a-f0-9]{32})\.preview\.localhost(?::\d+)?$/i,
        );

        if (!match || !req.url) {
          next();
          return;
        }

        const previewId = match[1];

        /*
         * Turn:
         *
         *   <id>.preview.localhost:5173/assets/foo.js
         *
         * into:
         *
         *   /api/preview/p/<id>/assets/foo.js
         *
         * Hono receives it, resolves the target, and proxies it.
         *
         * The browser still believes it is on:
         *
         *   <id>.preview.localhost:5173
         *
         * so ALL root-relative URLs remain inside
         * the preview automatically.
         */
        req.url = `/api/preview/p/${previewId}${req.url}`;

        next();
      });
    },
  };
}

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },

  plugins: [
    tanstackRouter({
      target: 'react',
      routesDirectory: './app/routes',
      generatedRouteTree: './app/routeTree.gen.ts',
      autoCodeSplitting: true,
    }),

    previewHostPlugin(),

    devServer({
      entry: 'server/index.ts',
      adapter: bunAdapter,

      /*
       * Hono owns /api after the preview-host
       * middleware rewrites preview requests.
       */
      exclude: [/^\/(?!api\/).*/],
    }),

    terminalDevPlugin(),
    react(),
    tailwindcss(),
  ],
});
