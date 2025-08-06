import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: "/single_line_diagram/",
  build: {
    outDir: 'dist',
    sourcemap: mode === 'development' // Only generate source maps in development
  },
  css: {
    devSourcemap: mode === 'development' // Only generate CSS source maps in development
  },
  esbuild: {
    sourcemap: mode === 'development' // Only generate esbuild source maps in development
  },
  server: {
    hmr: mode === 'development' // Only enable HMR in development
  }
}))  