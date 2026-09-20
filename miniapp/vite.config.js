import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      'framer-motion': path.resolve(__dirname, './src/framer-motion-dummy.jsx')
    }
  },
  build: {
    // No source maps in production — saves ~50% of JS bundle size
    sourcemap: false,
    // Minify with esbuild (default, fast)
    minify: 'esbuild',
    // Warn if a chunk is > 500KB
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Split vendor libs into separate chunks so they get cached long-term
        // Users only re-download app code when it changes, not all libs
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ton': ['@tonconnect/ui-react'],
          'http': ['axios'],
        }
      }
    }
  }
})