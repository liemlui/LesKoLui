import { defineConfig, devices } from "@playwright/test";

/**
 * Config KHUSUS guard metrik UI (G1-11) — sengaja terpisah dari
 * `playwright.config.ts` (keputusan pemilik **Q10 = A**).
 *
 * Kenapa terpisah: spec metrik memerlukan ±3 menit tambahan. Ia adalah alat
 * diagnosa yang dijalankan saat menyentuh UI, BUKAN bagian CI utama —
 * `npm run e2e` tidak boleh ikut melambat.
 *
 * Perhatikan: `npm run e2e` memakai `testDir: "./e2e"` **rekursif**, jadi spec
 * ini diletakkan di luar folder itu (`e2e-uiux/`) supaya tidak ikut terbawa
 * tanpa harus mengubah `playwright.config.ts`.
 *
 * Jalankan: `npm run e2e:uiux`
 */
export default defineConfig({
  testDir: "./e2e-uiux",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"], deviceScaleFactor: 2 } },
    // `mobile-dark` tidak ada di sini: light-only permanen (Q4).
  ],
  webServer: {
    // Port dipin agar cocok dengan baseURL (vite default 5173).
    // **Bentuk `npx vite`, bukan `npm run dev --`** — keputusan D10 diperluas ke
    // berkas ini 2026-10-15 (butir C2): npm menelan `--port`, sehingga Vite
    // membaca `5174` sebagai root direktori dan membalas 404 di semua permintaan
    // sambil tetap mencetak URL yang tampak benar. Perbaikannya menyamakan bentuk
    // dengan `playwright.config.ts`; pengujiannya dijadwalkan pemilik.
    command: "npx vite --port 5174 --strictPort",
    url: "http://localhost:5174",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
