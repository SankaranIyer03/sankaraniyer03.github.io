import { rm } from 'node:fs/promises'
import { globSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Everything in public/ is copied into the build verbatim, so a scratch file
 * left there during development would silently deploy. Anything prefixed with
 * `__` is treated as local-only and stripped from the output.
 */
function dropScratchAssets(outDir = 'dist'): Plugin {
  return {
    name: 'drop-scratch-assets',
    apply: 'build',
    async closeBundle() {
      for (const file of globSync(join(outDir, '**/__*'))) {
        await rm(file, { recursive: true, force: true })
      }
    },
  }
}

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), dropScratchAssets()],
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
