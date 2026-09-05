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

Dokumentasi arsitektur berada di direktori `../` (root `Private Tutor/`):

1. `01-architecture-and-stack.md` — stack, struktur, konfigurasi
2. `02-data-model.md` — skema Dexie, tipe, repositori
3. `03-capture-flow.md` — alur catat sesi
4. `06-ai-generation.md` — integrasi AI DeepSeek
5. `08-backup-and-pwa.md` — backup terenkripsi + PWA
6. `09-build-phases.md` — fase pembangunan
7. `10-conventions-and-pitfalls.md` — aturan kode

**Data Resilience Plan:** lihat `docs/RENCANA-KETAHANAN-DATA-2026-09-05.md` untuk enam lingkup ketahanan data (Fase A–F) yang sedang berjalan.

## Status

- **Version:** 1.71.0
- **Dexie schema:** v15 (10 backup tables + auditLog + studyNotes + local captureDrafts)
- **Backup tables (10):** students, sessions, reports, payments, settings, raporGrades, followUps, expenses, iaeeProjects, studyNotes
- **AI model:** DeepSeek v4 Flash (direct dari browser)
- **Framework:** React 19 + TypeScript + Vite + Tailwind v4 + Dexie
