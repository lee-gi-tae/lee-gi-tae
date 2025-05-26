import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/products': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/accounts': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/articles': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/youtube': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
