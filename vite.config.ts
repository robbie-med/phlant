import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { webcrypto } from 'node:crypto';
// Node 18 has no global crypto; workbox-build needs it.
if (!(globalThis as any).crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true, writable: true });

// Ports are governed by /home/user/Projects/PORTS.md: 3917 = Vite dev, 3510 = preview.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      minify: false,
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Phlant — moon & tradition planting almanac',
        short_name: 'Phlant',
        description: 'Seven planting traditions, one sky. Compare what each says about today, computed from real ephemeris.',
        theme_color: '#1b2a1f',
        background_color: '#0f1a13',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
      }
    })
  ],
  server: { host: '127.0.0.1', port: 3917, strictPort: true },
  preview: { host: '127.0.0.1', port: 3510, strictPort: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'] }
} as any);
