import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const manifestData = {
  id: '/study-plan/',
  name: '学习工作台',
  short_name: '学习计划',
  description: '计划、记录、笔记与复盘一体化学习工作台',
  start_url: '/study-plan/',
  scope: '/study-plan/',
  display: 'standalone' as const,
  background_color: '#f4f4f5',
  theme_color: '#006fee',
  icons: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' as const }]
}

export default defineConfig({
  base: '/study-plan/',
  server: {
    fs: {
      allow: ['.', '..']
    }
  },
  plugins: [
    react(),
    {
      name: 'serve-manifest',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const cleanUrl = (req as { url?: string }).url?.split('?')[0] || ''
          if (cleanUrl.endsWith('manifest.webmanifest') || cleanUrl.endsWith('manifest.json')) {
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8')
            res.end(JSON.stringify(manifestData))
            return
          }
          next()
        })
      }
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-512.png', 'book.svg'],
      devOptions: { enabled: true },
      manifest: manifestData,
      workbox: {
        navigateFallback: '/study-plan/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [{ urlPattern: /^https:\/\/.*\.supabase\.co\//, handler: 'NetworkOnly' }]
      }
    })
  ]
})
