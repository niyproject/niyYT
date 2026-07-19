import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png'], // Mengamankan logo agar tidak kena hash dan masuk cache
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      },
      manifest: {
        name: 'niyTube',
        short_name: 'niYTube',
        description: 'Localhost Audio Mixer & Player',
        theme_color: '#1a1a1a',
        background_color: '#111111',
        display: 'standalone',
        icons: [
          {
            src: '/logo.png', // Jalur diperbaiki langsung ke root public/
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo.png', // Jalur diperbaiki langsung ke root public/
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/get-direct-url': 'http://localhost:4000',
      '/stream-video': 'http://localhost:4000',
      '/search': 'http://localhost:4000',
      '/trending': 'http://localhost:4000',
      '/playlist': 'http://localhost:4000'
    }
  },
  preview: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/get-direct-url': 'http://localhost:4000',
      '/stream-video': 'http://localhost:4000',
      '/search': 'http://localhost:4000',
      '/trending': 'http://localhost:4000',
      '/playlist': 'http://localhost:4000'
    }
  }
});
