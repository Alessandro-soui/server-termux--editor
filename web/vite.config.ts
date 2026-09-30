import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // O build vai direto para a pasta que o Express serve (express.static('public')).
  build: {
    outDir: '../public',
    emptyOutDir: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/icons': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
