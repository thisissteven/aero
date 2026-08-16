import devServer from '@hono/vite-dev-server';
import bunAdapter from '@hono/vite-dev-server/bun';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('shiki')) return 'vendor-shiki';
            if (id.includes('maplibre-gl')) return 'vendor-maplibre';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('@tiptap')) return 'vendor-editor';
            if (id.includes('@heroui') || id.includes('motion'))
              return 'vendor-ui';
          }
        },
      },
    },
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
      exclude: [/^\/(?!api\/).*/],
    }),
    react(),
    tailwindcss(),
  ],
});
