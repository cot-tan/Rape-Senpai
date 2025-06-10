import { defineConfig } from "vite";
import deno from "@deno/vite-plugin";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    deno(),
    react(),
    VitePWA({
      manifest: {
        "name": "昏睡レイプ！野獣と化した先輩",
        "short_name": "雷普先輩",
        "icons": [
          {
            "src": "/android-chrome-192x192.png",
            "sizes": "192x192",
            "type": "image/png",
          },
          {
            "src": "/android-chrome-512x512.png",
            "sizes": "512x512",
            "type": "image/png",
          },
        ],
        "theme_color": "#ffffff",
        "background_color": "#ffffff",
        "display": "standalone",
        "start_url": ".",
        "screenshots": [
          {
            "src": "/android-sc.png",
            "sizes": "1216x2562",
            "type": "image/png",
            "form_factor": "narrow",
          },
        ],
      },
    }),
  ],
  assetsInclude: ["png", "mp3"],
  publicDir: "src",
});
