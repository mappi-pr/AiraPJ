import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // すべてのネットワークインターフェースでリッスン（スマホ実機アクセス用）
    port: 5173,
    proxy: {
      // Docker環境ではサービス名を使用、ローカル開発では環境変数で切り替え可能
      '/api': process.env.VITE_API_PROXY || 'http://localhost:4000',
      '/uploads': process.env.VITE_API_PROXY || 'http://localhost:4000',
    },
  },
})
