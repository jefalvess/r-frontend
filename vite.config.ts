import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    // GitHub Pages serve this app under /r-frontend/
    base: mode === 'production' ? '/r-frontend/' : '/',

    plugins: [
      figmaAssetResolver(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        manifest: {
          name: 'Restaurante Frontend',
          short_name: 'Restaurante',
          description: 'Sistema de restaurante com suporte offline por cache PWA.',
          theme_color: '#111827',
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/r-frontend/',
          start_url: '/r-frontend/',
        },
        workbox: {
          navigateFallback: '/r-frontend/index.html',
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === 'script' || request.destination === 'style',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-resources',
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
            {
              urlPattern: ({ request }) => request.destination === 'image' || request.destination === 'font',
              handler: 'CacheFirst',
              options: {
                cacheName: 'media-assets',
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24 * 90,
                },
              },
            },
          ],
        },
      }),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})