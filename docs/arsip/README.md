# ARSIP DOKUMENTASI — satu daftar, dibekukan

> **Sekilas** · Isi: **35 dokumen** yang tidak berlaku lagi (24 di folder ini + 11 di `arsitektur/`) · Status: **dibekukan**
> · Terakhir dirapikan: **2026-10-05**.
> **Untuk siapa:** siapa pun yang bertanya "kenapa dulu diputuskan begitu?" atau "apa yang sudah dikerjakan?".
> **Baca kalau:** dokumen aktif tidak menjawab, atau butuh jejak audit/keputusan lama.
> **Yang TIDAK ada di sini:** apa pun yang masih berlaku — kontrak di [`../kerja/ATURAN-AI.md`](../kerja/ATURAN-AI.md),
> daftar kerja di [`../kerja/PEKERJAAN.md`](../kerja/PEKERJAAN.md), peta kode di [`../06-ARSITEKTUR-KODE.md`](../06-ARSITEKTUR-KODE.md).

**Tidak ada dokumen yang dihapus.** Yang tidak berlaku dipindahkan ke sini dan didaftarkan di bawah.

---

## 1. Aturan arsip (berlaku surut — keputusan pemilik 2026-10-05)

1. **Yang masuk arsip:** dokumen yang **selesai** (pekerjaannya tuntas), **digantikan**, atau **usang**
   (isinya tidak lagi cocok dengan kode). Tidak perlu menunggu rapi — yang penting *tidak menyesatkan*.
2. **Isi dibekukan.** Temuan, angka, dan keputusan tetap seperti saat ditulis. Yang boleh berubah hanya
   **rujukan path**, supaya tautan tidak menunjuk lokasi lama (mis. `../kerja/X.md` → `X.md`).
   **Angka di arsip tidak pernah diperbarui** — kalau Anda mengutipnya, sebut tanggal dokumennya.
3. **Nama berkas tidak diganti.** Mengganti nama memutus rujukan antar-dokumen lama dan jejak pencarian.
4. **Pekerjaan terbuka tidak boleh "ikut terarsip".** Kalau dokumen yang diarsipkan masih memuat butir
   yang belum selesai, butir itu **dipindah** ke [`../kerja/PEKERJAAN.md`](../kerja/PEKERJAAN.md) pada
   putaran yang sama, dan banner arsipnya menyebutkan hal itu.
5. **Setiap berkas yang diarsipkan diberi banner** di baris paling atas: kapan diarsipkan, kenapa, dan
   ke mana penggantinya.
6. **Penomoran temuan bisa berbeda antar dokumen.** Beberapa audit menomori ulang temuan yang sama
   (`C-xx`, `K-xx`, `L-xx`), jadi satu ID bisa berarti dua hal berbeda. **Yang mengikat untuk tugas yang
   sedang dikerjakan adalah penomoran di [`../kerja/PEKERJAAN.md`](../kerja/PEKERJAAN.md) §3** — pernah
   bikin salah baca 2026-10-05 (audit `C-08` = kontras warna, `GELOMBANG-3` `C-08` = tombol "Lewati").

---

## 2. Inventaris — folder ini (urut kronologis)

| # | Dokumen | Tanggal | Status akhir | Kenapa masih berguna |
|---|---|---|---|---|
| 01 | [`DOC-AUDIT.md`](DOC-AUDIT.md) | 2026-06-26 | ✅ historis | Audit dokumentasi vs kode v1.12.1. **Jangan** dipakai sebagai acuan schema (saat itu `homeworks` masih tabel) |
| 02 | [`CHECKLIST.md`](CHECKLIST.md) | 2026-06-26 | ✅ historis | Checklist status per area pada v1.12.1 |
| 03 | [`PROMPT-AI-IKLAN.md`](PROMPT-AI-IKLAN.md) | 2026-07-03 | historis (pemasaran) | Prompt materi iklan Instagram — bukan dokumentasi produk |
| 04 | [`AUDIT-CHECKLIST.md`](AUDIT-CHECKLIST.md) | 2025-07-16, rev. 2026-08-28 | ✅ 26/26 (H-2 di-waive) | **Satu-satunya catatan waiver keamanan yang disetujui sadar**: H-2 (API key AI bisa dicuri pemilik perangkat). Rujukannya masih dipakai `../02-PANDUAN-BACKUP-DRIVE-SENYAP.md` |
| 05 | [`PANDUAN-PENUNTASAN-CATAT-SESI.md`](PANDUAN-PENUNTASAN-CATAT-SESI.md) | 2026-08-29 | ✅ selesai | Pola refactor yang masih dipakai: state besar dipecah ke hook per tanggung jawab |
| 06 | [`UI-UX-ANALYSIS.md`](UI-UX-ANALYSIS.md) | 2026-09-01 | ✅ sebagian besar | Sudut pandang **data-viz/chart** — sengaja tidak mengulang dua audit berikutnya |
| 07 | [`UI-UX-AUDIT-2026-09-04.md`](UI-UX-AUDIT-2026-09-04.md) | 2026-09-04 | ✅ Fase 1 | Sudut pandang **interaksi/navigasi/a11y/design system** |
| 08 | [`UI-UX-REDUNDANSI-AUDIT-2026-09-05.md`](UI-UX-REDUNDANSI-AUDIT-2026-09-05.md) | 2026-09-05 | ✅ dieksekusi | Sudut pandang **redundansi & arsitektur informasi** (R1–R17) |
| 09 | [`WA-MESSAGE-ADJUSTMENT-2026-09-05.md`](WA-MESSAGE-ADJUSTMENT-2026-09-05.md) | 2026-09-05 | ✅ selesai | Alasan pesan ke orang tua ditulis hangat, bukan seperti penagih |
| 10 | [`UI-UX-AUDIT-VISUAL-2026-09-11.md`](UI-UX-AUDIT-VISUAL-2026-09-11.md) | 2026-09-11 | ✅ 14/14 | Menetapkan **format tabel temuan** + legend severitas 🔴🟠🟡🟢 yang dipakai audit berikutnya |
| 11 | [`AUDIT-UIUX-KEUANGAN-2026-09-12.md`](AUDIT-UIUX-KEUANGAN-2026-09-12.md) | 2026-09-12 | ✅ 10/10 | Metodenya (jalankan app dengan data realistis → ukur DOM → tulis sebelum→sesudah) jadi standar audit berikutnya |
| 12 | [`AUDIT-UIUX-CATAT-SESI-2026-09-12.md`](AUDIT-UIUX-CATAT-SESI-2026-09-12.md) | 2026-09-12 | ✅ 17/17 | §9.3 mencatat **2 penyimpangan yang disengaja** (bottom-nav & chip teks) — masih berlaku sebagai keputusan. ⚠️ **Penomoran `C-xx` di berkas ini BUKAN yang dipakai tugas G3** — lihat §1 aturan 6 |
| 13 | [`AUDIT-KONDISI-LES-DAN-TOPIK-2026-09-13.md`](AUDIT-KONDISI-LES-DAN-TOPIK-2026-09-13.md) | 2026-09-13 | ✅ P0–P3 | Satu-satunya audit soal **isi pilihan** (katalog topik vs nama mapel). Berguna saat menambah mapel baru |
| 14 | [`03-capture-flow.md`](03-capture-flow.md) | — | ⚠️ **usang** | Alur Catat Sesi versi lama. **Jangan dipakai** sebagai acuan perilaku |
| 15 | [`TODO-2026-09-13.md`](TODO-2026-09-13.md) | rev. 2026-09-13 | ⚠️ dipindah | Utang teknis yang dulu di akar repo; daftar aktifnya kini di `../kerja/PEKERJAAN.md` |
| 16 | [`06-AUDIT-UIUX-2026-10-01.md`](06-AUDIT-UIUX-2026-10-01.md) | 2026-10-03 | ✅ diarsipkan | Audit UI/UX v1.79.3: 73 temuan tetap, 18 sebagian, 1 klaim dibatalkan. **Baca `07` lebih dulu** |
| 17 | [`07-VALIDASI-RENCANA-2026-10-01.md`](07-VALIDASI-RENCANA-2026-10-01.md) | 2026-10-03 | ✅ diarsipkan | Validasi + rencana 3 gelombang; amandemen Q1–Q14 dikunci dari sini |
| 18 | [`GELOMBANG-2.md`](GELOMBANG-2.md) | 2026-10-03 | ⚠️ digantikan | Peta 11 tugas G2 (fondasi token/uang/jadwal) → kini `../kerja/PEKERJAAN.md` |
| 19 | [`GELOMBANG-3.md`](GELOMBANG-3.md) | 2026-10-03 | ⚠️ digantikan | Peta 10 tugas G3 (alur: sesi/keuangan/AI/laporan) → kini `../kerja/PEKERJAAN.md` |
| 20 | [`GELOMBANG-1.md`](GELOMBANG-1.md) | 2026-10-05 | ✅ tuntas (v1.85.0) | 11 tugas G1-01…G1-11 lengkap dengan bukti & preseden prosedur |
| 21 | [`PROMPT-LANJUTAN-G3.md`](PROMPT-LANJUTAN-G3.md) | 2026-10-05 | ⚠️ basi | Contoh bentuk "prompt serah-terima antar-sesi". **Angkanya potret 2026-10-04** · jebakan lingkungan/alatnya sudah dinaikkan ke `../kerja/ATURAN-AI.md` §6.4 (2026-10-05) |
| 22 | [`CHECKLIST-VISUAL-2026-10-04.md`](CHECKLIST-VISUAL-2026-10-04.md) | 2026-10-05 | ✅ diperiksa pemilik | Checklist manual per titik (14 butir) — bentuk yang dipakai lagi untuk rilis berikutnya |
| 23 | [`ROADMAP.md`](ROADMAP.md) | 2026-10-05 | ⚠️ digantikan | Peta gelombang 2 & 3 + catatan gate; digantikan `../kerja/PEKERJAAN.md` |
| 24 | [`RIWAYAT-PEKERJAAN-2026-10.md`](RIWAYAT-PEKERJAAN-2026-10.md) | 2026-10-05 | ⚠️ digantikan | Isi lama §4 `docs/README.md`: tabel Q9–Q28 + daftar periksa manual 2026-10-04 |

## 3. Inventaris — `arsitektur/` (potret v1.70–v1.75)

| Dokumen | Isi | Catatan |
|---|---|---|
| [`arsitektur/README.md`](arsitektur/README.md) | pintu masuk seri + peringatan | mulai dari sini kalau butuh konteks |
| `arsitektur/01-architecture-and-stack.md` | stack, dependensi, struktur proyek | potret v1.70.5 |
| `arsitektur/02-data-model.md` | skema Dexie, tipe, repositori | potret v1.70.5, **schema 14** (kini lebih tinggi) |
| `arsitektur/04-template-engine.md` | 20 tema × 5 layout, renderer, paginasi | — |
| `arsitektur/05-rotation-logic.md` | jaminan tidak berulang per murid | — |
| `arsitektur/06-ai-generation.md` | DeepSeek langsung dari browser, prompt | potret v1.71.1 |
| `arsitektur/07-export-and-share.md` | render PNG/PDF & bagikan | — |
| `arsitektur/08-backup-and-pwa.md` | backup terenkripsi, PWA offline, font | potret v1.73.0 |
| `arsitektur/09-build-phases.md` | runbook & peta fase | potret v1.73.0 |
| `arsitektur/10-conventions-and-pitfalls.md` | aturan koding & jebakan | sebagian **masih berlaku** — tapi kontrak resminya `../kerja/ATURAN-AI.md` |
| `arsitektur/11-uiux-ai-cost-dan-privasi.md` | kontrak UI/UX + biaya AI + privasi | potret v1.75.1; **aturan yang masih mengikat sudah dinaikkan ke `../kerja/ATURAN-AI.md` §1 & §3** |

**Pengganti seri ini:** [`../06-ARSITEKTUR-KODE.md`](../06-ARSITEKTUR-KODE.md) — peta kode + daftar hal
yang akan merusak data/uang. Sengaja **tanpa angka**, supaya tidak ikut basi.

---

## 4. Yang SENGAJA tetap aktif (bukan lupa — dicek 2026-10-05)

| Dokumen | Alasan tidak diarsipkan |
|---|---|
| [`../01-PANDUAN-TAGIHAN.md`](../01-PANDUAN-TAGIHAN.md) | panduan fitur yang masih dipakai (kapan sebuah sesi ditagih) |
| [`../02-PANDUAN-BACKUP-DRIVE-SENYAP.md`](../02-PANDUAN-BACKUP-DRIVE-SENYAP.md) | panduan setup yang masih dipakai saat backup Drive gagal |
| [`../03-PLAYBOOK-AUDIT-UIUX-VISUAL.md`](../03-PLAYBOOK-AUDIT-UIUX-VISUAL.md) | **prosedur** audit berikutnya, bukan hasil audit |
| [`../04-RENCANA-KETAHANAN-DATA.md`](../04-RENCANA-KETAHANAN-DATA.md) | satu kriteria masih terbuka (uji dua build PWA) → tercatat di `../kerja/PEKERJAAN.md` §4 |
| [`../05-ARSITEKTUR-REPLIKASI-OFFLINE.md`](../05-ARSITEKTUR-REPLIKASI-OFFLINE.md) | cetak biru replikasi; referensi, bukan catatan pekerjaan |
| [`../06-ARSITEKTUR-KODE.md`](../06-ARSITEKTUR-KODE.md) | pengganti seri arsitektur (2026-10-05) |
| [`../kerja/TASK-01…TASK-11`](../kerja/) | dokumen tugas: **satu** masih memegang pekerjaan (TASK-01, dua target ukuran), sisanya `done` tetapi dijaga sebagai rujukan cara kerja |

## 5. Riwayat pengarsipan

| Tanggal | Yang dipindah | Cara |
|---|---|---|
| 2026-09-12 | 8 berkas audit/panduan dari akar repo (AUDIT-CHECKLIST, PANDUAN-PENUNTASAN-CATAT-SESI, PROMPT-AI-IKLAN, UI-UX-*, WA-MESSAGE-*) + 4 dari folder induk | dipindahkan; riwayat git setiap berkas tetap utuh |
| 2026-09-13 | `AUDIT-KONDISI-LES-DAN-TOPIK-2026-09-13.md`, `arsitektur/03-capture-flow.md`, `TODO.md` | dipindahkan; daftar periksa manualnya dipromosikan ke indeks |
| 2026-10-03 | `06-AUDIT-UIUX-2026-10-01.md`, `07-VALIDASI-RENCANA-2026-10-01.md`, `GELOMBANG-2.md`, `GELOMBANG-3.md` | digantikan `ROADMAP.md` |
| **2026-10-05** | `GELOMBANG-1.md` (tuntas), `PROMPT-LANJUTAN-G3.md` (basi), `CHECKLIST-VISUAL-2026-10-04.md` (sudah diperiksa), `ROADMAP.md` (digantikan), `RIWAYAT-PEKERJAAN-2026-10.md` (dari §4 indeks), **seluruh `arsitektur/01`–`11`** | berlaku surut; tiap berkas dapat banner; dijelaskan di [`../kerja/ATURAN-AI.md`](../kerja/ATURAN-AI.md) §9 **A20** |

> **Catatan line ending.** Beberapa dokumen lama di-checkout sebagai CRLF di Windows (`core.autocrlf`)
> sementara isi index-nya LF — periksa `git ls-files --eol`, kolom **`i/`**. Isi repo sudah benar
> (**0 `i/crlf`**); yang terlihat di working copy hanyalah artefak checkout lokal.
