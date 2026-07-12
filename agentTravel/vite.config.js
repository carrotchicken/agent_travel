import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve:{
    alias:{
      '@':fileURLToPath(new URL('./src',import.meta.url))
    }
  },
  server: {
    proxy: {
      // 所有 /api 开头的请求转发到后端 3300 端口，解决跨域
      '/api': {
        target: 'http://127.0.0.1:3300',
        changeOrigin: true
      }
    }
  }
})
