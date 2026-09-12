# Dokumentasi Les Ko Lui — Indeks & Riwayat

> **Versi aplikasi saat dokumen ini diperbarui:** v1.73.0 (2026-09-12) · 475 unit test / 47 berkas · `eslint` 0/0 · `tsc` bersih · build produksi sukses.
> Dokumen arsitektur tingkat sistem (stack, data model, template engine, dsb.) ada di direktori induk `../` (seri `01`–`10` + `../README.md`).

Folder ini punya dua wilayah, dan bedanya penting:

| Wilayah | Isi | Aturan |
|---|---|---|
| `docs/` (folder ini) | dokumen yang **masih berlaku** | boleh diperbarui bila kode berubah |
| `docs/arsip/` | dokumen yang **sudah selesai** atau historis | **dibekukan** — isi tidak diubah; hanya rujukan path yang boleh disesuaikan saat pengarsipan |

Tujuan pemisahan ini: satu tempat untuk hal yang harus dibaca sebelum mengubah kode, dan satu tempat untuk jejak keputusan lama yang tidak boleh hilang.

---

## 1. Dokumen aktif

| Dokumen | Jenis | Terakhir | Status | Ubah/lihat kapan |
|---|---|---|---|---|
| `RENCANA-KETAHANAN-DATA-2026-09-05.md` | rencana kerja (instruksi) | 2026-09-05 | **6 fase (A–F) selesai diimplementasikan**; sisa: verifikasi E2E Fase B & runtime/PWA Fase D — 32 kriteria penerimaan di §5–§9 belum dicentang | Sebelum mengubah backup/restore, draf Catat Sesi, kontrak respons AI, atau `saveSettings` |
| `ZERO-TOUCH-BACKUP.md` | panduan setup | 2026-09-08 | panduan aktif (relay Google Drive) | Saat memasang/memperbaiki backup senyap ke Drive |
| `PANDUAN-TAGIHAN.md` | panduan fitur (cheat-sheet) | 2026-09-01 | panduan aktif (3 siklus tagihan) | Saat mengubah alur laporan → tagihan |
| `ARSITEKTUR-REPLIKASI-OFFLINE.md` | cetak biru/referensi | 2026-08-03 | referensi (baseline v1.37.0) | Bila membangun app offline-first baru dengan pola yang sama |
| `UI-UX-VISUAL-AUDIT-PLAYBOOK.md` | prosedur (dapat diulang) | 2026-09-11 | prosedur aktif; penerapan 2026-09-11 sudah selesai dan hasilnya diarsipkan | Sebelum menjalankan audit UI/UX visual baru |
| `../README.md` (app) | titik masuk repo app | 2026-09-12 | aktif | Pertama kali membuka repo |
| `../TODO.md` | pelacak utang teknis | 2026-08-29 | aktif (refactor & test coverage) | Saat memilih pekerjaan refactor berikutnya |

**Pekerjaan yang benar-benar masih terbuka** (jangan tertukar dengan dokumen arsip):

1. `RENCANA-KETAHANAN-DATA` §5–§9 — kriteria penerimaan yang belum dicentang; implementasinya sudah ada dan diuji unit, yang belum: skenario E2E close-out gagal (Fase B) dan verifikasi runtime/PWA restore (Fase D).
2. `../TODO.md` — pemecahan layar besar (`StudentDetail`, `CaptureSession`, `Payments`, `Settings`) dan penambahan test layar.
3. Utang yang tercatat di audit terakhir dan **sengaja tidak dikerjakan**: bottom-nav tidak disembunyikan selama wizard Catat Sesi, dan chip teks 38–42 px dibiarkan (alasan ada di `arsip/AUDIT-UIUX-CATAT-SESI-2026-09-12.md` §9.3).

---

## 2. Riwayat kronologis

Semua baris di bawah sudah selesai; dokumennya ada di `arsip/` (kecuali yang ditandai *aktif*).

| Tanggal | Dokumen | Yang terjadi | Versi |
|---|---|---|---|
| 2026-06-20–21 | `arsip/…` seri spec `04`–`07` (root) | Template engine, rotasi, export ditulis | v1.8–1.9 |
| 2026-06-26 | `arsip/DOC-AUDIT.md`, `arsip/CHECKLIST.md` | Audit dokumen vs kode: 9 kategori gap diperbaiki, 13 dokumen diselaraskan | v1.12.1 |
| 2025-07-16 → 2026-08-28 | `arsip/AUDIT-CHECKLIST.md` | Audit keamanan/teknis 4 ronde: 26/26 ditangani (1 di-waive sesuai threat model solo) | v1.37.0 → v1.53.0 |
| 2026-08-02 | `docs/ARSITEKTUR-REPLIKASI-OFFLINE.md` | Cetak biru replikasi offline-first (diturunkan dari v1.37.0) | v1.37.0 |
| 2026-08-29 | `arsip/PANDUAN-PENUNTASAN-CATAT-SESI.md` | Refactor Catat Sesi: 3 hook diekstrak (engagement, brief, draf) + polish P1 | v1.64.x |
| 2026-09-01 | `arsip/UI-UX-ANALYSIS.md`, `docs/PANDUAN-TAGIHAN.md` | Analisis data-viz/chart (sebagian besar diimplementasikan) + cheat-sheet tagihan | v1.66–1.68 |
| 2026-09-04 | `arsip/UI-UX-AUDIT-2026-09-04.md` | Audit interaksi/navigasi/a11y/design system; quick wins dieksekusi | v1.70.0 |
| 2026-09-05 | `arsip/UI-UX-REDUNDANSI-AUDIT-2026-09-05.md` | Audit redundansi & penataan informasi; dieksekusi, diverifikasi ulang 2026-09-12 (R1–R17) | v1.70.x |
| 2026-09-05 | `docs/RENCANA-KETAHANAN-DATA-2026-09-05.md` | Enam lingkup ketahanan data dieksekusi: panduan selaras, follow-up transaksional, draf Catat Sesi (schema v15), validasi restore, validasi respons AI, `saveSettings` atomik | v1.70.5 |
| 2026-09-05 | `arsip/WA-MESSAGE-ADJUSTMENT-2026-09-05.md` | Humanisasi pesan WhatsApp ke orang tua; penghapusan Reminder AI | v1.70.x |
| 2026-09-08 | `docs/ZERO-TOUCH-BACKUP.md` | Backup senyap ke Google Drive lewat relay (koreksi: tidak bisa lewat cron server) | v1.71.x |
| 2026-09-11 | `docs/UI-UX-VISUAL-AUDIT-PLAYBOOK.md`, `arsip/UI-UX-AUDIT-VISUAL-2026-09-11.md` | Audit visual berbasis 87 screenshot: 14 temuan (V-01…V-14) — **semua ditutup** | v1.71.0 → v1.71.4 |
| 2026-09-12 | `arsip/AUDIT-UIUX-KEUANGAN-2026-09-12.md` | Audit modul Keuangan: 10 item prioritas, semuanya diimplementasikan (tab dinamai ulang, 63 tagihan dari ±27 layar → ±3 layar) | v1.72.0 |
| 2026-09-12 | `arsip/AUDIT-UIUX-CATAT-SESI-2026-09-12.md` | Audit alur Catat Sesi: 17 temuan (C-01…C-17) — **semua diimplementasikan**; 2 bug tambahan ditemukan saat verifikasi. Keluhan pengguna "layar berkedip" = C-17 (draf ditulis 108×/menit tanpa perubahan data) | v1.73.0 |

---

## 3. Aturan pemeliharaan

Supaya folder ini tidak kembali berantakan:

1. **Audit/hasil kerja yang sudah dieksekusi → pindahkan ke `arsip/`** dan catat satu baris di `arsip/README.md` (tanggal, target versi, status akhir, hasil). Jangan menimpa audit lama dengan audit baru — buat dokumen bertanggal baru.
2. **Panduan kerja (instruksi untuk AI/engineer) diarsipkan setelah seluruh fasenya selesai.** Kalau masih ada fase/kriteria yang terbuka, dokumennya tetap di `docs/` dan **wajib** punya blok `> Status:` di baris atas.
3. **Dokumen arsip dibekukan.** Tidak ada penyuntingan isi. Satu-satunya pengecualian: rujukan path disesuaikan saat pemindahan (mis. `docs/X.md` → `arsip/X.md`), dan itu dicatat di `arsip/README.md`.
4. **Setiap dokumen baru wajib menyebut dirinya**: tanggal, target versi, status (`aktif` / `selesai` / `historis`), dan apa yang harus dilakukan pembaca berikutnya.
5. **Rujukan antar dokumen memakai path relatif** ke lokasi sebenarnya; dokumen aktif tidak boleh menunjuk ke lokasi pra-arsip.
6. **Artefak tidak masuk repo**: `dist/`, `test-results/`, `typecheck-output.txt`, dan ekspor data (`leskolui-data-*.csv`) sudah diabaikan `.gitignore` — jangan dilepas dari daftar itu.
