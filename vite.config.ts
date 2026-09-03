import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          about: path.resolve(__dirname, 'about/index.html'),
          privacyPolicy: path.resolve(__dirname, 'privacy-policy/index.html'),
          terms: path.resolve(__dirname, 'terms/index.html'),
          contact: path.resolve(__dirname, 'contact/index.html'),
          cookiePolicy: path.resolve(__dirname, 'cookie-policy/index.html'),
          faq: path.resolve(__dirname, 'faq/index.html'),
          instagramRayBanStory: path.resolve(__dirname, 'instagram-ray-ban-story/index.html'),
          rayBanMetaImageFormat: path.resolve(__dirname, 'ray-ban-meta-image-format/index.html'),
          rayBanMetaExif: path.resolve(__dirname, 'ray-ban-meta-exif/index.html'),
          photoConverter3024: path.resolve(__dirname, '3024x4032-photo-converter/index.html'),
          howToUse: path.resolve(__dirname, 'how-to-use-ray-ban-meta-photo-converter/index.html'),
          spinEffectFix: path.resolve(__dirname, 'ray-ban-meta-instagram-spin-effect/index.html'),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
