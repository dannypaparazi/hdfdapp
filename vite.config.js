import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isUserMode = process.env.VITE_MODE === 'user'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  build: {
    // Use different entry points based on mode
    rollupOptions: {
      input: isUserMode ? './index-user.html' : './index.html'
    }
  }
})
