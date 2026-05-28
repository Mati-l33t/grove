import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { readFileSync } from 'fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Grove',
        short_name: 'Grove',
        description: 'Your family, growing together',
        theme_color: '#18181b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        importScripts: ['sw-custom.js'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/_/, /^\/pb_/],
        runtimeCaching: [
          {
            // PocketBase API — network first with a short timeout so the app
            // never shows stale data when online.  Falls back to cache only
            // when the network is genuinely unavailable (offline mode).
            urlPattern: /\/api\/collections\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pb-api-cache',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 },
            },
          },
        ],
      },
      includeAssets: ['icons/*.png', 'offline.html'],
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8090', changeOrigin: true },
      '/_': { target: 'http://localhost:8090', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
