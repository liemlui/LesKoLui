# Les Ko Lui

Aplikasi jurnal les privat & laporan otomatis untuk orang tua — lokal-first PWA.

## Perintah

```powershell
npm.cmd install          # install dependencies
npm.cmd run dev          # dev server (Vite)
npm.cmd test             # vitest (unit/integration)
npm.cmd run build        # tsc + vite build
npm.cmd run lint         # eslint
npm.cmd run e2e          # Playwright E2E alur (Vite dev, SW mati)
npm.cmd run e2e:pwa      # Playwright E2E PWA — jalankan `npm run build` dulu (butuh dist/)
```

## Dokumentasi

**Indeks dokumen (mulai dari sini):** `docs/README.md` — peta "kalau mau X buka Y", daftar pekerjaan yang
masih terbuka, riwayat, dan aturan pemeliharaan. Dokumen di `docs/` bernomor urut baca:

1. `docs/01-PANDUAN-TAGIHAN.md` — kapan sesi ditagih & kenapa sesi (tidak) masuk tagihan
2. `docs/02-PANDUAN-BACKUP-DRIVE-SENYAP.md` — setup backup otomatis ke Google Drive
3. `docs/03-PLAYBOOK-AUDIT-UIUX-VISUAL.md` — prosedur audit tampilan berbasis screenshot
4. `docs/04-RENCANA-KETAHANAN-DATA.md` — rencana + bukti implementasi ketahanan data (Fase A–F)
5. `docs/05-ARSITEKTUR-REPLIKASI-OFFLINE.md` — cetak biru replikasi offline-first

Dokumen yang sudah selesai dibekukan di `docs/arsip/` (12 dokumen: audit keamanan, audit UI/UX, panduan
kerja yang tuntas) — ringkasannya di `docs/arsip/README.md`.

Dokumentasi arsitektur sistem berada di direktori `../` (root `Private Tutor/`, seri `01`–`10`):

1. `01-architecture-and-stack.md` — stack, struktur, konfigurasi
2. `02-data-model.md` — skema Dexie, tipe, repositori
3. `03-capture-flow.md` — alur catat sesi
4. `06-ai-generation.md` — integrasi AI DeepSeek
5. `08-backup-and-pwa.md` — backup terenkripsi + PWA
6. `09-build-phases.md` — fase pembangunan
7. `10-conventions-and-pitfalls.md` — aturan kode

**Rencana ketahanan data:** `docs/04-RENCANA-KETAHANAN-DATA.md` — enam lingkup (Fase A–F)
sudah **diimplementasikan** 2026-09-05 (lihat log §12). Verifikasi E2E close-out gagal (Fase B) dan
runtime/PWA restore (Fase D) **sudah dijalankan** 2026-09-13 (`e2e/capture-closeout-failure.spec.ts`,
`npm run e2e:pwa`): 29 dari 32 kriteria penerimaan dicentang. Sisa 3 kriteria yang butuh tes komponen
dan uji dua build PWA ada di §13 dokumen itu.

## Status

- **Version:** 1.73.0
- **Dexie schema:** v15 — **10 tabel backup** (`students`, `sessions`, `reports`, `payments`, `settings`, `raporGrades`, `followUps`, `expenses`, `iaeeProjects`, `studyNotes`) + 2 tabel **lokal, tidak ikut backup** (`auditLog`, `captureDrafts`)
- **AI model:** DeepSeek V4.1 Flash (`deepseek-flash`, direct dari browser, thinking nonaktif)
- **Framework:** React 19 + TypeScript + Vite + Tailwind v4 + Dexie
- **Platform:** target build `baseline-widely-available` (Vite 8) = **Chrome/Edge 111+, Firefox 114+, Safari/iOS 16.4+**. Install PWA butuh HTTPS (atau `localhost`) + Service Worker + manifest ikon 192/512. **Android 5 (Lollipop) di luar dukungan** — Chrome terakhir untuk Lollipop adalah versi 95; rinciannya di `../08-backup-and-pwa.md`.
