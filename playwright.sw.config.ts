import { defineConfig, devices } from "@playwright/test";

/**
 * Verifikasi runtime PWA memakai **build produksi** (`npm run build` → `vite preview`).
 *
 * `playwright.config.ts` sengaja memakai Vite dev, dan di dev service worker
 * dimatikan (`devOptions.enabled: false`) — jadi skenario offline/update/restore
 * tidak bisa dibuktikan lewat config itu. Config ini melayani `dist/` di port
 * terpisah dengan profil browser terisolasi.
 *
 * Jalankan: `npm.cmd run build` lalu `npm.cmd run e2e:pwa`.
 */
export default defineConfig({
  testDir: "./e2e-pwa",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4174",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chrome-prod", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run preview -- --port 4174 --strictPort",
    url: "http://localhost:4174",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
