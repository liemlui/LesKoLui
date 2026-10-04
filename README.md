# Les Ko Lui

Aplikasi jurnal les privat & laporan otomatis untuk orang tua — lokal-first PWA.

## Dokumentasi — mulai dari `docs/README.md`

[`docs/README.md`](docs/README.md) adalah **router** (peta "mau X → buka Y"), riwayat rilis, dan aturan
pemeliharaan dokumentasi. Daftar **pekerjaan terbuka** pindah ke `docs/kerja/PEKERJAAN.md` (dibuat pada
langkah yang sama dengan pemindahannya — sampai saat itu daftarnya masih di `docs/README.md` §4).

| Kebutuhan | Ke mana |
|---|---|
| Saya agen AI dan mau **mengerjakan** sesuatu | [`docs/kerja/`](docs/kerja/) — kontrak + dokumen tugas + daftar pekerjaan |
| Saya mau **memakai/merawat** aplikasi | [`docs/README.md`](docs/README.md) §2 (panduan tagihan, backup Drive, playbook audit) |
| Saya mau tahu **cara aplikasi dibangun** | `docs/arsitektur/` — **diarsipkan**; ringkasannya di `docs/06-ARSITEKTUR-KODE.md` |
| Saya mencari **keputusan lama** | [`docs/arsip/README.md`](docs/arsip/README.md) |

> **Angka tidak disalin ke dokumen.** Versi aplikasi = `package.json`. Jumlah tes = keluaran
> `npm run test:sandbox`. Baris berkas = `(Get-Content <berkas>).Count`. Yang disimpan di dokumen
> adalah **cara mengukurnya** + tanggal ukur terakhir — dijaga `npm run check:docs`.

## Perintah

```powershell
npm.cmd install            # install dependencies
npm.cmd run dev            # dev server (Vite)

# Gate di mesin ini (sandbox): pakai test:sandbox, BUKAN `npm test` polos.
# Alasan lengkap: docs/kerja/ATURAN-AI.md §6.1
npm.cmd run test:sandbox   # vitest (unit/integration) — pool threads, 2 worker
npm.cmd run check:docs     # tautan md + fakta dokumentasi (versi/angka)
npm.cmd run build          # tsc + vite build (WAJIB hijau sebelum dianggap selesai)
npm.cmd run lint           # eslint (target: 0 error, 0 warning)
npm.cmd run e2e            # Playwright E2E alur (Vite dev, SW mati) — butuh spawn browser
npm.cmd run e2e:uiux       # guard metrik UI (7 layar × 2 project)
npm.cmd run e2e:pwa        # Playwright E2E PWA — jalankan `npm run build` dulu (butuh dist/)
```

## Status

- **Versi & riwayat lengkap:** `package.json` + `src/lib/version.ts` (`CHANGELOG`) + [`docs/README.md`](docs/README.md) §5
- **Jumlah tes:** keluaran `npm run test:sandbox` — **tidak** ditulis di dokumen (dulu disalin ke 18 tempat, hanya 3 yang benar)
- **Dexie schema:** lihat `src/db/db.ts` (versi terakhir = blok `this.version(N)` tertinggi) — jangan kutip angkanya dari dokumen
- **AI model:** DeepSeek V4.1 Flash (`deepseek-flash`, direct dari browser, thinking nonaktif)
- **Framework:** React 19 + TypeScript + Vite + Tailwind v4 + Dexie
- **Platform:** target build `baseline-widely-available` (Vite 8) = **Chrome/Edge 111+, Firefox 114+, Safari/iOS 16.4+**. Install PWA butuh HTTPS (atau `localhost`) + Service Worker + manifest ikon 192/512. **Android 5 (Lollipop) di luar dukungan** — Chrome terakhir untuk Lollipop adalah versi 95; rinciannya di `docs/arsip/arsitektur/08-backup-and-pwa.md`.

> Catatan untuk agen AI: berkas ini sengaja **tidak** memuat daftar pekerjaan. Daftar itu ada di
> `docs/kerja/PEKERJAAN.md` supaya hanya ada satu sumber kebenaran.
