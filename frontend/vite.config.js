import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), './src'),
      },
    },
    server: {
      port: 5173
    },
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: {
      'process.env.NEXT_PUBLIC_API_URL': (env.NEXT_PUBLIC_API_URL || env.VITE_API_URL)
        ? JSON.stringify(env.NEXT_PUBLIC_API_URL || env.VITE_API_URL)
        : '(typeof window !== "undefined" && window.location && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? "https://api.between.indevs.in/api/v1" : "http://127.0.0.1:8000/api/v1")'
    }
  }
})
