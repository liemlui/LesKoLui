# PEKERJAAN — satu-satunya daftar pekerjaan (dan cara mengerjakannya)

> **Sekilas** · Jenis: **daftar pekerjaan aktif + urutan eksekusi** · Diperbarui: 2026-10-05 · Status: **aktif**
> **Untuk siapa:** pemilik aplikasi (memutuskan) dan agen AI (mengerjakan).
> **Baca kalau:** akan mulai bekerja, atau akan bertanya "apa yang belum selesai".
> **Aturan:** berkas ini **menggantikan** `ROADMAP.md` dan §4 `docs/README.md`. Kalau ada dua daftar
> pekerjaan, keduanya akan berbeda — jadi hanya ada satu.
> **Yang TIDAK ada di sini:** kontrak & larangan → [`ATURAN-AI.md`](ATURAN-AI.md) · ringkasan per tugas →
> [`CHEATSHEET.md`](CHEATSHEET.md) · riwayat yang sudah selesai → [`../README.md`](../README.md) §5 + [`../arsip/`](../arsip/README.md).

---

## 0. Cara pakai (agar tidak mengulang pembacaan)

1. **Kontrak dulu, selalu:** [`ATURAN-AI.md`](ATURAN-AI.md). Ia memuat keputusan terkunci (B1–B4, A1–A19),
   berkas yang dilarang disentuh (§2.1), dan bentuk laporan (§8).
2. **Tentukan tier SEBELUM mulai** (`ATURAN-AI` §6.2): T0 dokumen · T1 <3 berkas · T2 menyentuh
   `src/components|lib|db|hooks` atau UI · T3 tugas terakhir gelombang / config. Ragu → ambil tier lebih tinggi.
3. **Satu putaran = satu langkah** → verifikasi → lapor (§8) → berhenti. Batch 📦 hanya yang terdaftar di §2.
4. **Detail tugas:** baca **satu** `TASK-NN` yang relevan. Jangan membaca seluruh `docs/`.
5. **Angka tidak dipercaya dari dokumen.** Ukur sendiri; cara mengukurnya ada di [`../06-ARSITEKTUR-KODE.md`](../06-ARSITEKTUR-KODE.md) §4.

**Paralelisasi** hanya sah kalau tidak ada chat lain yang menyentuh berkas yang sama; karena satu tugas
bisa memegang puluhan berkas `src/**`, aturan default = **SERJAL**. Paralel butuh `git worktree` terpisah.

---

## 1. Peta gelombang

| Gelombang | Isi | Status |
|---|---|---|
| **G1** — bersih-bersih & aksesibilitas (G1-01…G1-11) | kontras, nav, label, heading, emoji | ✅ **tuntas** (v1.85.0) — rincian: [`../arsip/GELOMBANG-1.md`](../arsip/GELOMBANG-1.md) |
| **G2** — fondasi token/uang/jadwal (G2-00…G2-10) | token & 7 primitif, satu pintu uang, tap target, Jadwal Hari, jalur galat | ✅ **tuntas** (v1.88.0) |
| **G3** — alur kerja (G3-01…G3-10) | Catat Sesi, Keuangan, papan pipeline, kontrak AI, Laporan, Murid, foto, Kanvas, Pengaturan, reset+PIN | 🟨 **berjalan** — G3-01 sebagian |

**Hitungan:** 22 tugas total · **12 selesai** (G2-00…G2-10) · **10 belum** (G3-01…G3-10) · 1 manual selesai
(G2-05, diperiksa pemilik di Chrome Android 2026-10-04).

---

## 2. Urutan eksekusi & batch

> Urutan mengikat dari `ATURAN-AI` §4 (**A14**): `G3-01 → G3-02 → G3-03 → **G3-04** → G3-05 → … → G3-10`.
> `G3-04` (kontrak AI) **didahulukan** atas laporan `G3-05` karena panel AI di Laporan membutuhkannya.

| Batch | Isi | Catatan |
|---|---|---|
| H | 📦 G3-02 + G3-03 (Keuangan) | G3-03 bergantung pada G3-02 |
| I | 📦 G3-04 + G3-05 (AI + Laporan) | G3-05 bergantung pada G3-04 |
| J | 📦 G3-06 + G3-07 (Murid + foto murid) | G3-07 bergantung pada G3-06 |
| K | 📦 G3-08 + G3-09 + G3-10 (kanvas + Pengaturan) | G3-09 sebelum G3-10 |
| Tutup | **checkpoint G3 (gate T3 penuh)** | jaring akhir: full suite + seluruh spec Playwright |

---

## 3. Gelombang 3 — daftar tugas

| ID | Judul | Tier | Dep | Berkas inti | Est | Status |
|---|---|---|---|---|---|---|
| G3-01 | Catat Sesi (refactor terbatas + C-01…C-13) | T3 | G2-01, G2-06 | `CaptureSession.tsx`, `captureSession/*` | L | 🟨 **sebagian** — refactor ✅ · L8 ✅ · L9 ✅ · L10 (undo, C-13/C-05) ✅ · L7 (simpan dari langkah 5, Q2) ✅ · C-08 ("Lewati" di langkah 2) ✅ · **sisa: C-02 · C-03 · C-04 · C-10 · L4 `ManageSessionSheet` · C-12 ⏸ menunggu G3-04** |
| G3-02 | Keuangan: refactor terbatas `TagihanTab.tsx` + satu layar, cari murid, badge terlambat, filter lanjutan, **K-01** | T3 | G2-04 | `payments/TagihanTab.tsx`, `useInvoiceFilters.ts` | L | ⬜ |
| G3-03 | Redesign papan pipeline (tetap hidup di dalam blok "Perlu ditagih") | T2 | G3-02 | `FinancePipelineBoard.tsx`, `RingkasanTab.tsx` | L | ⬜ |
| G3-04 | Kontrak AI berbiaya — satu jalur `useAiAction()` + satu modal biaya | T3 | G1-01, G2-01 | `useAiAction`, `AiCostModal`, `Settings` | L | ⬜ |
| G3-05 | Laporan modern (`MonthlyReport.tsx` → ≤1.500) | T3 | G3-01, G3-04 | `MonthlyReport.tsx`, `monthlyReport/*` | L | ⬜ |
| G3-06 | Murid: refactor `StudentDetail.tsx` + temuan M | T3 | G1-01, G2-04 | `StudentDetail.tsx`, `IaEeTracker.tsx` | L | ⬜ |
| G3-07 | Foto murid | T2 | G3-06 | `StudentForm.tsx`, `Students.tsx` | M | ⬜ |
| G3-08 | Kanvas & istilah | T2 | G3-05 | `CustomThemeBuilder.tsx`, `charts/*` | M | ⬜ |
| G3-09 | Pengaturan lanjutan (target `Settings.tsx` ≤700) | T3 | G1-09 | `Settings.tsx`, `PwaPrompts.tsx` | M | ⬜ |
| G3-10 | Reset total + PIN ulang | T3 | G3-09 | `Settings.tsx` (zona bahaya) | M | ⬜ |

**Refactor terbatas (Q9/A12–A13)** — dikunci pemilik: dikerjakan **tepat sebelum** gelombangnya, satu berkas
per putaran: `CaptureSession.tsx` ✅ (2.155 → 1.891 saat refactor, sebelum G3-01) · `TagihanTab.tsx` sebelum
G3-02 · `MonthlyReport.tsx` sebelum G3-05 · `StudentDetail.tsx` sebelum G3-06 · `Settings.tsx` sebelum G3-09.
**Angka baris bukan DoD**: fitur boleh menaikkannya (lihat riwayat G3-01 di §6 dokumen tugasnya).

---

## 4. Pekerjaan yang belum punya dokumen tugas (butuh keputusan manusia)

| # | Pekerjaan | Di mana | Kenapa belum selesai |
|---|---|---|---|
| 1 | **Verifikasi PWA dua build berbeda** (halaman lama masih bisa membuka route lazy setelah deploy baru) | [`04-RENCANA-KETAHANAN-DATA.md`](../04-RENCANA-KETAHANAN-DATA.md) §13 | Baru **satu** build produksi yang terbukti; uji dua build butuh deploy kedua → **manusia** |
| 2 | **Verifikasi manual alur Catat Sesi** (§5 di bawah) | §5 berkas ini | Butuh mata manusia di perangkat; sedang dikerjakan bertahap lewat G3-01 |
| 3 | **Katalog topik untuk mapel yang belum punya** (mis. Arts MYP, Group 6 DP, ICT IGCSE) | [`../arsip/AUDIT-KONDISI-LES-DAN-TOPIK-2026-09-13.md`](../arsip/AUDIT-KONDISI-LES-DAN-TOPIK-2026-09-13.md) §7 P3 #19 | Terdaftar sadar di `KNOWN_TOPIcless` (`src/__tests__/topicCoverage.test.ts`); **pengetahuan pemilik** — isi berdasar mapel yang benar-benar diajar, jangan dikejar rata |
| 4 | **2 hal yang sengaja TIDAK dikerjakan** (keputusan, bukan lupa) | [`../arsip/AUDIT-UIUX-CATAT-SESI-2026-09-12.md`](../arsip/AUDIT-UIUX-CATAT-SESI-2026-09-12.md) §9.3 | bottom-nav dibiarkan tampil selama wizard; chip teks 38–42 px dibiarkan (≥24 px, lolos WCAG 2.5.8) |
| 5 | **Timeout Playwright 30 dtk** (penyebab flake saat 2 project + spec generator berjalan bersama) | `playwright.config.ts` | Menunggu izin perubahan config (**Tier 3**) |
| 6 | **CI GitHub Actions tidak berjalan** (kedua job gagal dalam 2 detik, `steps: []`) | `.github/workflows/ci.yml` | Perlu diaktifkan pemilik di GitHub → Settings → Actions. Sementara itu: **jalankan gate lokal** |
| 7 | **Sisa spec basi di `npm run e2e`** — beberapa merah = flake beban, bukan regresi | `.design-audit/g2-gate-2026-10-04.md` | Bisect sudah tuntas (bukan regresi). Kalau sebuah spec merah: **jalankan sendirian dulu** sebelum menyimpulkan |
| 8 | **K-01 — peringatan saat mengubah nominal tagihan** (mengubah nominal memindahkan asal tagihan ke `manual` secara senyap → daftar sesi hilang dari ekspor & WA) | keputusan pemilik #1 (2026-10-01) · [`../arsip/07-VALIDASI-RENCANA-2026-10-01.md`](../arsip/07-VALIDASI-RENCANA-2026-10-01.md) §3 | Dijadwalkan sebagai bagian **G3-02** |
| 9 | **Temuan audit UI/UX yang masih tersisa** dari audit 2026-10-01 | [`../arsip/06-AUDIT-UIUX-2026-10-01.md`](../arsip/06-AUDIT-UIUX-2026-10-01.md) | 73 temuan tetap, 18 sebagian, 1 klaim dibatalkan. **Wajib baca berkas 07 lebih dulu** sebelum mengerjakan |

---

## 5. Daftar periksa manual — alur Catat Sesi (±10 menit)

Satu-satunya cara menutup §4 #2. Jalankan dengan data dev (`seedDummy()` sudah menyiapkan murid IB MYP /
IB DP / Cambridge IGCSE / AP / Nasional). Checklist rinci per titik (lokasi, tanda salah, cara lapor):
[`../arsip/CHECKLIST-VISUAL-2026-10-04.md`](../arsip/CHECKLIST-VISUAL-2026-10-04.md).

- [ ] **1.** Murid **Cambridge IGCSE** → mapel ber-kode → langkah Materi → ketik `algebra` → muncul baris "Menampilkan topik jenjang IGCSE" dan **hanya** topik IGCSE
- [ ] **2.** Buka **"📚 Pilih dari daftar bab"** → daftar bab muncul; membuka satu bab menampilkan topik bercentang; memilih satu topik menambah chip **beserta nama babnya**
- [ ] **3.** Pilih topik yang sama dari **pencarian** → tidak muncul chip kedua (string identik)
- [ ] **4.** Mapel yang katalognya belum ada (mis. `Global Perspectives (0457)`) → ketik `essay` → kotak kuning "Tidak ada topik jenjang IGCSE…" + tombol "Tampilkan topik jenjang lain" / "Pakai … sebagai topik"
- [ ] **5.** Murid **Nasional** + `Matematika` → ketik `bilangan` → tidak ada hasil berlabel `MYP`
- [ ] **6.** Murid **IB DP** + `Global Politics` → ketik `power` → **tidak ada** hasil Matematika (dulu ada)
- [ ] **7.** Langkah Kondisi → hanya **3 tombol kondisi + 6 indikator** terlihat; "6 indikator lain" membuka sisanya; tombol "😐 Biasa" **sudah tidak ada**
- [ ] **8.** Ketuk "Seperti biasa" saja → lanjut ke langkah Detail → kartu "Skor sesi" berkata **skor tidak dihitung**
- [ ] **9.** Isi 2 indikator → langkah Detail → skor muncul + "kelengkapan data: Sebagian"; **isi pilihan respons akademik** → angka berubah di langkah itu juga
- [ ] **10.** Simpan sesi → buka detail dari tab Riwayat → semua indikator & tag tampil; tombol "✏️ Koreksi" menyimpan perubahan dan skor ikut berubah
- [ ] **11.** Tab Nilai → kartu Keseriusan Belajar → ada penyebut ("rata-rata dari N sesi"), panel **cakupan data**, dan grafik **Kualitas Respons Akademik**
- [ ] **12.** Pengaturan → Ekspor CSV → kolom baru "Bab Topik" & "Sumber Skor"; kolom Level berisi label (mis. `IGCSE · Grade 10`), **bukan** `UNIV`
- [ ] **13. (baru 2026-10-05, G3-01 L10)** Langkah Materi → ketuk × pada satu chip topik **berbab** → muncul pita pesan + tombol "↩ Urungkan" → ketuk → topik kembali **di posisi semula** dengan label babnya
- [ ] **14. (baru 2026-10-05, G3-01 L10)** Laporan sesi (langkah 6) → hapus satu tindak lanjut (konfirmasi) → "↩ Urungkan" → item kembali **di urutan semula**

> Sudah ditutup 2026-09-13: verifikasi E2E close-out gagal (Fase B) dan runtime/PWA restore (Fase D)
> dijalankan (`e2e/capture-closeout-failure.spec.ts`, `e2e-pwa/pwa-runtime.spec.ts`). Dari 32 kriteria
> §5–§9 di dokumen ketahanan data, 29 sudah dicentang dengan rujukan tes.
> **Hasil tinjauan visual pemilik 2026-10-04** (16 dari 20 butir ✅, 1 bug ditemukan → diperbaiki v1.89.2):
> [`../README.md`](../README.md) §4.4.1 di riwayat rilis.

---

## 6. Keputusan yang mengikat urutan (jangan diangkat lagi)

| Kode | Isi ringkas |
|---|---|
| **A12/Q9** | Refactor terbatas tepat sebelum gelombangnya (lihat §3) |
| **A13/Q11** | Aturan refactor terbatas juga berlaku untuk `TagihanTab.tsx`, `StudentDetail.tsx`, `Settings.tsx` |
| **A14/Q12** | `G3-04` sebelum `G3-05` (panel AI butuh `useAiAction`) |
| **A18/Q45** | 44 px = kontrol **utama**; chip/kontrol sekunder 24–36 px diterima |
| **A19/Q23** | Letak resmi guard metrik UI: `e2e-uiux/` + `playwright.uiux.config.ts` |
| **Q2** | Sesi boleh disimpan dari langkah 5; **jumlah langkah tetap 6** |
| **Q3** | Papan pipeline **dipertahankan** (di dalam blok "Perlu ditagih") |
| **Q4** | Light-only permanen |

Q baru hanya sah untuk: **(a)** mengubah perilaku pengguna, **(b)** menyentuh berkas §2.1, **(c)** mengubah
DoD/kontrak. Di luar ketiganya: **putuskan sendiri dan cantumkan alasannya** di laporan.

## 7. Riwayat berkas ini

| Tanggal | Perubahan |
|---|---|
| 2026-10-05 | Dibuat dari penggabungan `ROADMAP.md` + §4 `docs/README.md` (keputusan pemilik Q-13 opsi A). `ROADMAP.md` dipindahkan ke `../arsip/`. |
| 2026-10-05 | **Butir §4 #10 ditutup** — URL 404 di dalam teks iklan (`arsip/PROMPT-AI-IKLAN.md:78`) sudah dibetulkan menjadi host yang benar; barisnya dihapus dari daftar karena pekerjaan tuntas tidak boleh tinggal di daftar pekerjaan. |
