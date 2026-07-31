import { default as tailwindcss } from '@tailwindcss/vite';
import { default as react } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL?.replace(/\/$/, '') ?? '';

const rewriteAssetUrls = () => ({
  enforce: 'pre' as const,
  name: 'namespace-rewrite-asset-urls',
  transform(code: string, id: string) {
    if (!cdnUrl || !/\.[cm]?[jt]sx?$/.test(id) || !code.includes('/assets/'))
      return;

    const assetBase = `${cdnUrl}/`;

    return code
      .replaceAll('"/assets/', `"${assetBase}`)
      .replaceAll("'/assets/", `'${assetBase}`)
      .replaceAll('`/assets/', `\`${assetBase}`);
  },
});

export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  plugins: [rewriteAssetUrls(), react(), tailwindcss()],
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
