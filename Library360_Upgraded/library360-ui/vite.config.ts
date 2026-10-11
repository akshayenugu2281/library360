import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': { target: 'http://localhost:8081', changeOrigin: true },
      '/actuator': { target: 'http://localhost:8081', changeOrigin: true },
      '/v3/api-docs': { target: 'http://localhost:8081', changeOrigin: true },
      '/swagger-ui': { target: 'http://localhost:8081', changeOrigin: true },
    },
  },
})
