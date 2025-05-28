import { defineConfig } from 'vite'
import deno from '@deno/vite-plugin'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import * as manifest from './site.webmanifest' with { type: "json" }

// https://vite.dev/config/
export default defineConfig({
  plugins: [deno(), react(), VitePWA(manifest)],
  assetsInclude: ["png", "mp3"],
  publicDir: 'src'
})
