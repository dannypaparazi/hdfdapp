import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Detect which mode based on environment variable or file checking
const isUserMode = process.env.VITE_MODE === 'user'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  build: {
    rollupOptions: {
      input: isUserMode ? './index-user.html' : './index.html'
    }
  },
  define: {
    __VITE_MODE__: JSON.stringify(isUserMode ? 'user' : 'admin')
  }
})
