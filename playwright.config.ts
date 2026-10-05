import { defineConfig, devices } from "@playwright/test";

// E2E smoke tests. Server: vite dev (SW dinonaktifkan di dev → tak ganggu test).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  /**
   * Batas waktu satu tes: 30 dtk (bawaan Playwright) → **60 dtk**.
   *
   * Keputusan pemilik 2026-10-05 (#5): dinaikkan **hanya** karena flake beban —
   * saat `mobile` + `chromium` berjalan bersamaan, spec yang lulus sendirian
   * (`finance`, `report-export`) timeout di 30 dtk. Menaikkan batas ini **tidak**
   * memperlambat suite yang hijau (ia hanya menentukan kapan sebuah tes menyerah),
   * dan sengaja dipilih 60 (bukan 120) supaya tes yang benar-benar lambat tetap
   * ketahuan. `webServer.timeout` di bawah **tidak** diubah — itu waktu tunggu
   * menyalanya dev server, bukan waktu tes.
   */
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"], deviceScaleFactor: 2 } },
    // Project `mobile-dark` DIHAPUS 2026-10-01 (keputusan pemilik Q4): aplikasi light-only permanen,
    // sehingga screenshot mode gelap selalu identik byte-per-byte dengan mode terang (terbukti 29/37 file).
  ],
  webServer: {
    // Port di-pin agar cocok dengan baseURL — tanpa ini vite default ke 5173
    // dan webServer timeout menunggu 5174.
    command: "npm run dev -- --port 5174 --strictPort",
    url: "http://localhost:5174",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
