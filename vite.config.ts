/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// The whole stylesheet is a few kilobytes, so inlining it into index.html saves
// a render-blocking request on slow mobile connections.
function inlineCss(): Plugin {
  return {
    name: 'quiet-zone:inline-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const html = bundle['index.html'];
      if (html?.type !== 'asset' || typeof html.source !== 'string') return;
      for (const [fileName, file] of Object.entries(bundle)) {
        if (file.type !== 'asset' || !fileName.endsWith('.css')) continue;
        const link = new RegExp(`<link rel="stylesheet"[^>]*href="/${fileName}"[^>]*>`);
        if (!link.test(html.source)) continue;
        html.source = html.source.replace(link, () => `<style>${String(file.source)}</style>`);
        delete bundle[fileName];
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    inlineCss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        name: 'Quiet Zone',
        short_name: 'Quiet Zone',
        description:
          'Make and style QR codes in the browser, and check they scan before you print them.',
        theme_color: '#f4f1ea',
        background_color: '#f4f1ea',
        display: 'standalone',
        start_url: '/',
        scope: '/',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Only link previews use the share image; the app doesn't need it offline.
        globIgnores: ['og.png'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
