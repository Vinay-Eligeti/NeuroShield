import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Flask audio server (must be listed BEFORE the generic /api rule)
      '/api/transcribe': {
        target: "https://neuroshield-1-6ei3.onrender.com",
        changeOrigin: true
      },
      // Node.js backend
      '/api': {
        target: "https://neuroshield-5yad.onrender.com",
        changeOrigin: true
      }
    }
  }
})
