import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  test: {
    // Pure domain/utility tests only — no browser globals needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  plugins: [
    react(),
    VitePWA({
      // 'prompt' = new SW waits; never auto-reloads the page on deploy.
      // This prevents SW updates from causing the random refresh symptom.
      registerType: 'prompt',
      // Don't list icons here — globPatterns already catches them from public/.
      // Listing them in both places causes duplicate entries in the pre-cache manifest.
      includeAssets: [],
      manifest: {
        name: 'Jernie — Maine Coast',
        short_name: 'Jernie',
        description: 'Your personal travel guide.',
        theme_color: '#0D2B3E',
        background_color: '#0D2B3E',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Pre-cache all build assets including trip.json, icons, and the app shell.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        // clientsClaim: SW takes control of ALL open pages immediately after activation,
        // not just pages navigated to after the SW was installed. Without this, the
        // very first page load (which triggered the SW install) is never controlled
        // by the SW — meaning a force-close on that first visit leaves the app unable
        // to serve cached content on the next offline open.
        clientsClaim: true,
        // trip.json is already pre-cached by globPatterns. The runtime route is
        // kept here as a secondary fallback with StaleWhileRevalidate — serves cache
        // instantly while revalidating in the background when online.
        runtimeCaching: [
          {
            urlPattern: /\/trip\.json$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'trip-data' },
          },
        ],
      },
    }),
  ],
})
