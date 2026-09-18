import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: 'https://tasky-d81s.vercel.app/admin/',
  plugins: [react()],
  server: {
    port: 5176
  }
})
