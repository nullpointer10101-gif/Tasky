import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: 'https://tasky-v3.vercel.app/',
  plugins: [react()],
  server: {
    port: 5176
  }
})
