/// <reference types="vitest/config" />
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { parsePrograms } from './src/lib/parsePrograms.ts'
import { renderSeedModule } from './src/lib/seedSource.ts'

const programsPath = fileURLToPath(new URL('./programs.md', import.meta.url))
const seedPath = fileURLToPath(new URL('./src/db/seed.ts', import.meta.url))

/** Regenerates src/db/seed.ts from programs.md (build time only; the app never parses markdown). */
function seedFromPrograms(): Plugin {
  const generate = () => {
    const source = renderSeedModule(parsePrograms(readFileSync(programsPath, 'utf8')))
    if (!existsSync(seedPath) || readFileSync(seedPath, 'utf8') !== source) writeFileSync(seedPath, source)
  }
  return {
    name: 'seed-from-programs',
    buildStart() {
      this.addWatchFile(programsPath)
      generate()
    },
    configureServer(server) {
      server.watcher.add(programsPath)
      server.watcher.on('change', (file) => {
        if (file === programsPath) generate()
      })
    },
  }
}

const THEME = '#000000'

export default defineConfig({
  // GitHub Pages serves the site at /<repo>/
  base: '/gym-app/',
  plugins: [
    seedFromPrograms(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered from src/main.tsx
      manifest: {
        name: 'Gym',
        short_name: 'Gym',
        description: 'Personal training log',
        lang: 'en',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        theme_color: THEME,
        background_color: THEME,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the whole app so it works with no signal.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
})
