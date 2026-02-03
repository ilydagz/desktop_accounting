import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 1. Vite'ın portunu ve sunucu ayarlarını Tauri'ye göre sabitliyoruz:
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. Tauri backend dosyaları değişirse frontend'i yenileme
      ignored: ["**/src-tauri/**"],
    },
  },

  // 2. @ işaretini tanıması için gereken ayar:
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})