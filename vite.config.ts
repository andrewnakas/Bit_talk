import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  // GitHub Pages serves from /Bit_talk/ subpath
  base: '/Bit_talk/',
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        // Split nostr libraries into a separate chunk
        manualChunks: {
          nostr: ['nostr-tools', '@nostr-dev-kit/ndk'],
        },
      },
    },
  },
})
