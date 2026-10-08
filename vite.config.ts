import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const API_PORT = process.env.API_PORT ?? '3001'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': `http://localhost:${API_PORT}`,
      '/uploads': `http://localhost:${API_PORT}`,
      '/sitemap.xml': `http://localhost:${API_PORT}`,
      '/robots.txt': `http://localhost:${API_PORT}`,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router'],
          motion: ['motion'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
})
