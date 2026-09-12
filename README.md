# Les Ko Lui

Aplikasi jurnal les privat & laporan otomatis untuk orang tua — lokal-first PWA.

## Perintah

```powershell
npm.cmd install          # install dependencies
npm.cmd run dev          # dev server (Vite)
npm.cmd test             # vitest (unit/integration)
npm.cmd run build        # tsc + vite build
npm.cmd run lint         # eslint
npm.cmd run e2e          # Playwright E2E (perlu build dulu)
```

## Dokumentasi

**Indeks dokumen (mulai dari sini):** `docs/README.md` — daftar dokumen aktif, pekerjaan yang masih
terbuka, riwayat kronologis, dan aturan pemeliharaan. Dokumen yang sudah selesai dibekukan di `docs/arsip/`
(12 dokumen: audit keamanan, audit UI/UX, panduan kerja yang tuntas).

Dokumentasi arsitektur berada di direktori `../` (root `Private Tutor/`):

1. `01-architecture-and-stack.md` — stack, struktur, konfigurasi
2. `02-data-model.md` — skema Dexie, tipe, repositori
3. `03-capture-flow.md` — alur catat sesi
4. `06-ai-generation.md` — integrasi AI DeepSeek
5. `08-backup-and-pwa.md` — backup terenkripsi + PWA
6. `09-build-phases.md` — fase pembangunan
7. `10-conventions-and-pitfalls.md` — aturan kode

**Rencana ketahanan data:** `docs/RENCANA-KETAHANAN-DATA-2026-09-05.md` — enam lingkup (Fase A–F)
sudah **diimplementasikan** 2026-09-05 (lihat log §12); sisa verifikasi E2E close-out gagal (Fase B)
dan runtime/PWA restore (Fase D).

## Status

- **Version:** 1.73.0
- **Dexie schema:** v15 (10 backup tables + auditLog + studyNotes + local captureDrafts)
- **Backup tables (10):** students, sessions, reports, payments, settings, raporGrades, followUps, expenses, iaeeProjects, studyNotes
- **AI model:** DeepSeek V4.1 Flash (`deepseek-flash`, direct dari browser, thinking nonaktif)
- **Framework:** React 19 + TypeScript + Vite + Tailwind v4 + Dexie
