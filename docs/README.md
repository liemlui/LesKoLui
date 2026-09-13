# 00 — Mulai di Sini (Indeks Dokumentasi Les Ko Lui)

> **Sekilas** · Versi aplikasi: **v1.73.0** (2026-09-12) · 475 unit test / 47 berkas · `eslint` 0/0 · `tsc` bersih · build produksi sukses.
> Folder ini memuat **dokumentasi operasional aplikasi**. Dokumentasi arsitektur sistem (seri `01`–`10`) ada di folder induk `../`.

---

## 1. "Kalau mau X, buka Y"

| Kalau Anda mau… | Buka | Waktu baca |
|---|---|---|
| tahu kapan sesi ditagih & kenapa sebuah sesi (tidak) masuk tagihan | [`01-PANDUAN-TAGIHAN.md`](01-PANDUAN-TAGIHAN.md) | ±3 menit |
| memasang/memperbaiki backup otomatis ke Google Drive | [`02-PANDUAN-BACKUP-DRIVE-SENYAP.md`](02-PANDUAN-BACKUP-DRIVE-SENYAP.md) | ±10 menit |
| mengaudit tampilan aplikasi secara sistematis (berbasis screenshot) | [`03-PLAYBOOK-AUDIT-UIUX-VISUAL.md`](03-PLAYBOOK-AUDIT-UIUX-VISUAL.md) | ±30 menit (kerja beberapa jam) |
| mengubah backup/restore, draf Catat Sesi, respons AI, atau `saveSettings` | [`04-RENCANA-KETAHANAN-DATA.md`](04-RENCANA-KETAHANAN-DATA.md) | ±20 menit |
| membangun app lain dengan pola offline-first seperti ini | [`05-ARSITEKTUR-REPLIKASI-OFFLINE.md`](05-ARSITEKTUR-REPLIKASI-OFFLINE.md) | ±25 menit |
| tahu **apa yang masih harus dikerjakan** | bagian 3 di halaman ini | ±2 menit |
| mencari keputusan lama (audit & panduan yang sudah selesai) | [`arsip/README.md`](arsip/README.md) | sesuai kebutuhan |

---

## 2. Angka pada nama berkas — artinya apa

| Angka | Letaknya | Artinya |
|---|---|---|
| `00`–`05` | folder ini (`docs/`) | **urutan baca dokumentasi operasional aplikasi.** `00` = halaman ini. |
| `01`–`10` | folder induk (`../`) | seri **arsitektur sistem** (build guide): stack, data model, template engine, dsb. |
| tanpa nomor | `arsip/` | dokumen yang **sudah selesai**. Nama berkasnya dipertahankan apa adanya (lihat bagian 5). |

> Dua daftar angka ini berbeda dan sengaja dipisah: yang satu menjawab "bagaimana saya memakai/merawat aplikasi ini", yang lain menjawab "bagaimana aplikasi ini dibangun".

---

## 3. Yang masih harus dikerjakan

| # | Pekerjaan | Di mana | Kenapa belum selesai |
|---|---|---|---|
| 1 | **Verifikasi E2E close-out gagal (Fase B)** dan **runtime/PWA restore (Fase D)** | [`04-RENCANA-KETAHANAN-DATA.md`](04-RENCANA-KETAHANAN-DATA.md) §5–§9, log §12 | Implementasi + unit test sudah ada; 32 kriteria penerimaan belum dicentang karena skenario E2E/runtime belum dijalankan |
| 2 | **Refactor layar besar + tambah test layar** | [`../TODO.md`](../TODO.md) | Belum diprioritaskan; daftar lengkap ada di sana |
| 3 | **Dua hal yang sengaja TIDAK dikerjakan** (bukan lupa) | [`arsip/AUDIT-UIUX-CATAT-SESI-2026-09-12.md`](arsip/AUDIT-UIUX-CATAT-SESI-2026-09-12.md) §9.3 | bottom-nav dibiarkan tampil selama wizard Catat Sesi (menghindari pengguna terjebak), dan chip teks 38–42 px dibiarkan (≥ 24 px, lolos WCAG 2.5.8) |

---

## 4. Riwayat (jejak lengkapnya ada di arsip)

Ringkas saja; versi lengkap + ringkasan tiap dokumen ada di [`arsip/README.md`](arsip/README.md).

| Tanggal | Peristiwa | Versi |
|---|---|---|
| 2026-06-26 | Audit dokumentasi vs kode: 13 dokumen diselaraskan | v1.12.1 |
| 2026-07 → 08 | Audit keamanan/teknis 4 ronde: 26/26 ditangani (1 di-waive: H-2, API key AI) | v1.37.0 → v1.53.0 |
| 2026-08-29 | Refactor Catat Sesi: state besar dipecah ke 3 hook | v1.64.x |
| 2026-09-01 | Analisis UI/UX (chart/data-viz) + cheat-sheet tagihan | v1.66–1.68 |
| 2026-09-04 | Audit interaksi, navigasi, a11y, design system | v1.70.0 |
| 2026-09-05 | Audit redundansi informasi + humanisasi pesan WhatsApp | v1.70.x |
| 2026-09-05 | **Ketahanan data: 6 fase (A–F) diimplementasikan** (draf Catat Sesi, schema v15, validasi restore, kontrak AI, `saveSettings` atomik) | v1.70.5 |
| 2026-09-08 | Backup senyap ke Google Drive lewat relay | v1.71.x |
| 2026-09-11 | Audit visual 87 screenshot: 14 temuan — semua ditutup | v1.71.0 → v1.71.4 |
| 2026-09-12 | Audit modul Keuangan: 10 item — semua diimplementasikan | v1.72.0 |
| 2026-09-12 | Audit alur Catat Sesi: **17 temuan — semua diimplementasikan** + 2 bug tambahan yang ketemu saat verifikasi | **v1.73.0** |

---

## 5. Aturan pemeliharaan (supaya tetap rapi)

1. **Dokumen selesai → pindahkan ke `arsip/`** dan tambahkan satu baris di [`arsip/README.md`](arsip/README.md): tanggal · target versi · status akhir · hasil. Jangan menimpa dokumen lama dengan dokumen baru — buat dokumen bertanggal baru.
2. **Nama berkas di `arsip/` tidak diganti.** Isi arsip dibekukan (temuan, angka, keputusan tetap seperti saat ditulis); yang berubah hanya rujukan path yang menunjuk lokasi pra-arsip. Karena itu arsip tidak memakai nomor urut — urutannya diatur di tabel inventaris arsip.
3. **Dokumen dengan pekerjaan terbuka tetap di folder ini** dan wajib punya blok `> **Sekilas** …` di baris atas (jenis · status · untuk siapa · baca kalau · isi).
4. **Nomor berkas hanya untuk dokumen operasional di folder ini.** Dokumen baru masuk ke urutan `06`, `07`, … setelah isinya jelas; jangan menyisipkan nomor di tengah.
5. **Rujukan memakai path relatif** ke lokasi sebenarnya; dokumen di folder ini tidak boleh menunjuk lokasi pra-arsip.
6. **Artefak tidak masuk repo**: `dist/`, `test-results/`, `typecheck-output.txt`, dan ekspor data (`leskolui-data-*.csv`) sudah diabaikan `.gitignore` — jangan dilepas dari daftar itu.
