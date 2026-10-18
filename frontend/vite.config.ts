import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,

        configure(proxy) {
          proxy.on('proxyRes', (proxyRes, _req, res) => {
            const contentType = proxyRes.headers['content-type']

            if (!contentType?.includes('text/event-stream')) {
              return
            }

            function closeClient() {
              if (!res.writableEnded && !res.destroyed) {
                res.destroy()
              }
            }

            proxyRes.once('error', closeClient)

            proxyRes.once('close', () => {
              if (!proxyRes.complete) {
                closeClient()
              }
            })

            res.once('close', () => {
              if (!proxyRes.complete && !proxyRes.destroyed) {
                proxyRes.destroy()
              }
            })
          })
        },
      },
    },
  },
})