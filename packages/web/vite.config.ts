import devServer from '@hono/vite-dev-server';
import bunAdapter from '@hono/vite-dev-server/bun';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
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
    devServer({
      entry: 'server/index.ts',
      adapter: bunAdapter,
      // Only route /api/* through Hono — everything else (the React app,
      // HMR client, assets) falls through to Vite's normal dev handling.
      exclude: [/^\/(?!api\/).*/],
    }),
    react(),
    tailwindcss(),
  ],
});
