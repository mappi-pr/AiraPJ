import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:4000';
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': API_BASE_URL,
      '/uploads': API_BASE_URL,
    },
  },
})
