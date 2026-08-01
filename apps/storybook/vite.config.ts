import { default as tailwindcss } from '@tailwindcss/vite';
import { default as react } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  optimizeDeps: {
    include: ['@mdx-js/react'],
    exclude: ['sb-vite'],
  },
});
