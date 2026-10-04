import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#eef3f8' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#eef3f8' } },
  },
  images: ['public/favicon.svg'],
});
