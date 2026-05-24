/* 
  Vite Configuration
  Configures the React plugin, official Tailwind CSS v4 Vite compiler, 
  and directs the built assets straight to the backend's public folder.
*/
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    outDir: '../public',
    emptyOutDir: true,
  }
})
