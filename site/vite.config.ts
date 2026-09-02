import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  server: {
    // Native fs events are unreliable for this project path, which left Vite
    // serving stale modules. Polling is slightly heavier but actually works.
    watch: { usePolling: true, interval: 300 },
  },
  build: {
    rollupOptions: {
      output: {
        // Keep the 3D stack in its own chunk so the rest of the page is not
        // held up behind it.
        manualChunks(id: string) {
          if (/node_modules\/(three|@react-three)/.test(id)) return 'three'
          return undefined
        },
      },
    },
  },
})
