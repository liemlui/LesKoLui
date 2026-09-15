# Les Ko Lui

Aplikasi jurnal les privat & laporan otomatis untuk orang tua — lokal-first PWA.

## Dokumentasi — mulai dari `docs/README.md`

[`docs/README.md`](docs/README.md) adalah **router** (peta "mau X → buka Y"), pemegang **daftar
pekerjaan terbuka**, riwayat rilis, dan aturan pemeliharaan dokumentasi. Jangan mulai dari berkas lain.

| Kebutuhan | Ke mana |
|---|---|
| Saya agen AI dan mau **mengerjakan** sesuatu | [`docs/kerja/`](docs/kerja/) — dokumen tugas dengan langkah, jangkar kode, dan perintah verifikasi |
| Saya mau **memakai/merawat** aplikasi | [`docs/README.md`](docs/README.md) §2 (panduan tagihan, backup Drive, playbook audit) |
| Saya mau tahu **cara aplikasi dibangun** | [`docs/arsitektur/`](docs/arsitektur/README.md) — seri `01`–`10` (sebagian bertanggal, lihat peringatan di berkas itu) |
| Saya mencari **keputusan lama** | [`docs/arsip/README.md`](docs/arsip/README.md) |

## Perintah

```powershell
npm.cmd install          # install dependencies
npm.cmd run dev          # dev server (Vite)
npm.cmd test             # vitest (unit/integration) — 561 test / 50 berkas
npm.cmd run build        # tsc + vite build (WAJIB hijau sebelum dianggap selesai)
npm.cmd run lint         # eslint (target: 0 error, 0 warning)
npm.cmd run e2e          # Playwright E2E alur (Vite dev, SW mati)
npm.cmd run e2e:pwa      # Playwright E2E PWA — jalankan `npm run build` dulu (butuh dist/)
```

## Status

- **Version:** 1.75.1 — riwayat lengkap: `src/lib/version.ts` (`CHANGELOG`) + [`docs/README.md`](docs/README.md) §5
- **Test:** 561 lulus / 50 berkas
- **Dexie schema:** v15 — **10 tabel backup** (`students`, `sessions`, `reports`, `payments`, `settings`, `raporGrades`, `followUps`, `expenses`, `iaeeProjects`, `studyNotes`) + 2 tabel **lokal, tidak ikut backup** (`auditLog`, `captureDrafts`)
- **AI model:** DeepSeek V4.1 Flash (`deepseek-flash`, direct dari browser, thinking nonaktif)
- **Framework:** React 19 + TypeScript + Vite + Tailwind v4 + Dexie
- **Platform:** target build `baseline-widely-available` (Vite 8) = **Chrome/Edge 111+, Firefox 114+, Safari/iOS 16.4+**. Install PWA butuh HTTPS (atau `localhost`) + Service Worker + manifest ikon 192/512. **Android 5 (Lollipop) di luar dukungan** — Chrome terakhir untuk Lollipop adalah versi 95; rinciannya di `docs/arsitektur/08-backup-and-pwa.md`.

> Catatan untuk agen AI: berkas ini sengaja **tidak** memuat daftar pekerjaan. Daftar itu ada di
> [`docs/README.md`](docs/README.md) §4 supaya hanya ada satu sumber kebenaran.
