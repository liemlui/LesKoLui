/// <reference types="vitest/config" />
// Konfigurasi test minimal untuk audit/verifikasi cepat di lingkungan terbatas.
//
// Kenapa ada berkas ini: `npm test` memuat `vite.config.ts`, yang mengimpor
// plugin `@tailwindcss/vite`. Plugin itu memuat binary native Tailwind, dan di
// lingkungan ini binary tersebut gagal dimuat ("stream did not contain valid
// UTF-8" → `failed to load config from vite.config.ts`), sehingga seluruh suite
// tidak bisa jalan sama sekali — bukan karena ada test yang gagal.
//
// Berkas ini menyalakan pengaturan test yang SAMA dengan `vite.config.ts`
// (globals, setupFiles, include, testTimeout) tanpa plugin build yang tidak
// dibutuhkan unit test. Vitest tetap memakai esbuild untuk memuat .ts/.tsx.
import { defineConfig } from "vite";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    globals: true,
    setupFiles: ["./src/setupTests.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    testTimeout: 20_000,
  },
});
