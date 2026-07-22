import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA installable (Lot 5). Règle ferme : /api n'est JAMAIS mis en cache
    // (données personnelles) — le service worker ne gère que les statiques.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Trackly',
        short_name: 'Trackly',
        description: 'Ta bibliothèque de jeux, séries et films — et le temps qu’il te reste.',
        lang: 'fr',
        display: 'standalone',
        start_url: '/',
        background_color: '#0f1115',
        theme_color: '#3b5bdb',
        icons: [
          { src: '/pwa-64.png', sizes: '64x64', type: 'image/png' },
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Shell précaché ; navigation hors ligne vers l'app
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Jaquettes et affiches : cache-first, la bibliothèque reste belle hors ligne
            urlPattern: /^https:\/\/(image\.tmdb\.org|images\.igdb\.com)\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'media-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 3600 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    // Même chemin /api en dev (proxy) et en prod (nginx) : pas de CORS à gérer
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  // vite preview sert le build aux tests E2E : même proxy /api
  preview: {
    port: 4173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
