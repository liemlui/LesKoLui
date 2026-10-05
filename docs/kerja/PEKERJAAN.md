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

1. **Kontrak dulu, selalu:** [`ATURAN-AI.md`](ATURAN-AI.md). Ia memuat keputusan terkunci (§1: B1–B4 +
   seluruh amandemen `A1–…`, daftar terbaru di §9 berkas itu), berkas yang dilarang disentuh (§2.1), dan
   bentuk laporan (§8). *(Jangan hafalkan nomor terakhirnya — rentang yang ditulis di dokumen cepat basi;
   §9 `ATURAN-AI` adalah daftarnya.)*
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
| G3-01 | Catat Sesi (refactor terbatas + C-01…C-13) | T3 | G2-01, G2-06 | `CaptureSession.tsx`, `captureSession/*` | L | 🟨 **sebagian** — refactor ✅ · L8 ✅ · L9 ✅ · L10 (undo, C-13/C-05) ✅ · L7 (simpan dari langkah 5, Q2) ✅ · C-08 ("Lewati" di langkah 2) ✅ · C-03 (satu penulis `responseTag` + `role="radiogroup"`) ✅ · C-04 (badge `!` di stepper) ✅ · C-02 (`aria-live` + gulir & fokus saat pindah langkah) ✅ · C-10 (donat skor → `ProgressBar`) ✅ · C-03 lanjutan **opsi c2** (keyboard grup radio: Tab sekali + panah/Home/End) ✅ · **L4 `ManageSessionSheet` ✅ (2026-10-05: satu sheet menggantikan dua modal lama — `home/manageSession.ts` + `home/manageSessionForm.ts` + `home/ManageSessionSheet.tsx`, 37 tes; `Select-String "EditSessionModal\|ResolveMissedSessionModal"` = **0**)** · **sisa: C-12 ⏸ menunggu G3-04** |
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

**Di mana langkah rinci tiap tugas G3 (hemat pembacaan).** Rincian langkah `G3-02`…`G3-10` — termasuk item
`K-01`…`K-13` dan sisa `C-xx` — ada di [`../arsip/GELOMBANG-3.md`](../arsip/GELOMBANG-3.md) §G3-02…§G3-10.
Baca berkas itu sebagai **spesifikasi langkah**, bukan sumber angka: ia beku, dan angkanya potret 2026-10-01
(lihat §4 #15 — spesifikasi itu seharusnya sudah pindah ke dokumen hidup).

> **Batas ID yang mengikat (pernah bikin salah baca 2026-10-05).** Item `C-xx` yang dipakai di §3 dan
> `TASK-06` mengikuti penomoran **`GELOMBANG-3`**, **bukan** penomoran audit
> [`../arsip/AUDIT-UIUX-CATAT-SESI-2026-09-12.md`](../arsip/AUDIT-UIUX-CATAT-SESI-2026-09-12.md) — di berkas
> audit itu `C-02`/`C-04`/`C-08` berarti hal yang sama sekali lain (mis. `C-08` di audit = kontras warna,
> di `GELOMBANG-3` = tombol "Lewati" di langkah 2).

---

## 4. Pekerjaan tanpa dokumen tugas (butuh keputusan pemilik, izin, atau belum dijadwalkan)

> **Ditutup 2026-10-05** — nomor lamanya dipertahankan di [`ATURAN-AI.md`](ATURAN-AI.md) §1 "Amandemen
> 2026-10-05" supaya rujukan tidak putus: **#1** verifikasi PWA → ditangani pemilik lewat Vercel ·
> **#5** timeout Playwright → dinaikkan ke 60 dtk · **#6** CI GitHub → **tidak** diaktifkan ·
> **#11** 10 hex mentah → sudah jadi token · **#12** konfirmasi nav bawah → opsi b3 (baris kepastian draf) ·
> **#13** panah radiogroup → selesai (opsi c2) · **#16** mockup → dipertahankan (opsi e1).
>
> **#7 ditutup 2026-10-05 (putaran yang sama).** `npm run e2e` dijalankan **seluruhnya** dengan eskalasi
> sandbox: **78 lulus · 6 skip · 0 gagal** (4,8 menit, 2 project `chromium` + `mobile`, batas 60 dtk).
> **Tidak ada spec merah**, jadi langkah "jalankan sendirian" tidak perlu dipakai dan **tidak ada** yang
> diperbaiki — suite-nya sudah hijau. Efek samping §6.4 terjadi seperti yang ditulis dan sudah dibereskan:
> **58 PNG ter-track** di `e2e/screenshots/audit/**` ditulis ulang + **13 PNG baru** di `e2e/screenshots/`
> dibuat spec katalog → semuanya dipulihkan/dihapus, **tidak satu pun di-commit** (`git status` bersih
> sesudahnya). Karena `e2e` kini hijau **termasuk Beranda**, hasil ini sekaligus bukti tidak langsung untuk
> L4: `Home.tsx` masih merender dan spec Beranda lulus — tetapi **klik** pada sheet baru tetap butuh
> butir manual §5 21–22 (tidak ada spec yang menekan baris sesi).

| # | Pekerjaan | Di mana | Kenapa belum selesai |
|---|---|---|---|
| 2 | **Verifikasi manual alur Catat Sesi** (§5 di bawah — 22 butir; 13–20 baru 2026-10-05, 21–22 dari L4 `ManageSessionSheet`) | §5 berkas ini | Butuh mata manusia di perangkat |
| 3 | **Katalog topik untuk 78 mapel yang belum punya** — **selesai 16/78 (IB MYP 6 + IB DP 10), sisa 62** | [`../arsip/AUDIT-KONDISI-LES-DAN-TOPIK-2026-09-13.md`](../arsip/AUDIT-KONDISI-LES-DAN-TOPIK-2026-09-13.md) §7 P3 #19 · daftar sadarnya di `KNOWN_TOPIcless` (`src/__tests__/topicCoverage.test.ts`) | **Keputusan #3 (2026-10-05): dikerjakan agen.** **Putaran 1:** keenam kelompok IB MYP. **Putaran 2:** sepuluh mapel IB DP (Philosophy · Global Politics · Digital Society · Design Technology · SEHS · Visual Arts · Music · Theatre · Film · Dance) — jadi **seluruh kurikulum IB kini tertutup** (MYP + DP). **Ukur ulang dengan skrip, jangan menebak:** `.design-audit/topic-coverage-audit.mjs` mencetak mapel indeks per level, status 78 pasangan, **dan** peta alias lintas kurikulum. Sisa: **Cambridge IGCSE 16 · A Level 13 · O Level 11 · AP 10 · National 8** (prioritas turun — tutor mengajar IB MYP/DP). Jaga `npm run test:sandbox -- topicCoverage` hijau (27 tes) |
| 4 | **2 hal yang sengaja TIDAK dikerjakan** (keputusan, bukan lupa) | [`../arsip/AUDIT-UIUX-CATAT-SESI-2026-09-12.md`](../arsip/AUDIT-UIUX-CATAT-SESI-2026-09-12.md) §9.3 | bottom-nav dibiarkan tampil selama wizard; chip teks 38–42 px dibiarkan (≥24 px, lolos WCAG 2.5.8) |
| 8 | **K-01 — peringatan saat mengubah nominal tagihan** (mengubah nominal memindahkan asal tagihan ke `manual` secara senyap → daftar sesi hilang dari ekspor & WA) | keputusan pemilik #1 (2026-10-01) · [`../arsip/07-VALIDASI-RENCANA-2026-10-01.md`](../arsip/07-VALIDASI-RENCANA-2026-10-01.md) §3 | Dijadwalkan sebagai bagian **G3-02** |
| 9 | **Temuan audit UI/UX yang masih tersisa** dari audit 2026-10-01 | [`../arsip/06-AUDIT-UIUX-2026-10-01.md`](../arsip/06-AUDIT-UIUX-2026-10-01.md) | 73 temuan tetap, 18 sebagian, 1 klaim dibatalkan. **Wajib baca berkas 07 lebih dulu** sebelum mengerjakan |
| 14 | ~~**Rilis gelombang 3 + satu entri `CHANGELOG`**~~ — **SELESAI 2026-10-05: rilis v1.91.0** (satu entri `CHANGELOG` untuk seluruh gelombang: L7 · C-02 · C-03 · C-04 · C-08 · C-10 · C-13/C-05 · Q-A/Q-B · **L4** · katalog topik MYP) | `package.json` + `src/lib/version.ts` + [`../README.md`](../README.md) §6 | Dikerjakan atas permintaan pemilik. **Catatan:** `Q-D = d2` menunda rilis sampai G3-01 tuntas; permintaan pemilik mengalahkan penundaan itu, dan **C-12 tetap terbuka** (menunggu G3-04) — jadi ini rilis gelombang **tanpa** C-12, bukan G3-01 yang tuntas. Entri gelombang berikutnya menyusul saat C-12 selesai |
| 15 | **Spesifikasi langkah G3-02…G3-10 masih tinggal di [`../arsip/GELOMBANG-3.md`](../arsip/GELOMBANG-3.md)** | §3 berkas ini | **Keputusan Q-F = bertahap:** pindahkan **satu tugas per pemindahan**, dikerjakan saat gelombang itu mulai (angkanya di arsip sudah beku) |

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
- [ ] **15. (baru 2026-10-05, Q2/L7)** Langkah 5 (Catatan) → isi catatan → tombol **Simpan Sesi** tersedia di sebelah "Lanjut →" → ketuk → laporan sesi terbuka dan sesi tersimpan **tanpa foto & tanda tangan** (periksa di detail sesi)
- [ ] **16. (baru 2026-10-05, C-04)** Di langkah 1 sebelum murid dipilih → stepper langkah 1 menunjukkan badge `!`; begitu murid dipilih → badge hilang. Langkah 5 juga berbadge `!` selama catatannya masih kosong
- [ ] **17. (baru 2026-10-05, C-02)** Dari langkah 1 gulir jauh ke bawah → ketuk "Lanjut →" → halaman **kembali ke atas** dan judul langkah berikutnya ("Materi") langsung terlihat
- [ ] **18. (baru 2026-10-05, C-03)** Langkah 4 → ketuk "Lancar" di "Isi cepat" → tombol itu **menyala** dan chip yang sama di daftar bawah ikut menyala. Lalu pakai keyboard: **Tab** masuk **sekali** ke grup, **panah ←/→/↑/↓** memindahkan pilihan (membungkus di ujung), **Home/End** ke ujung, dan **Kosongkan** tetap terjangkau Tab
- [ ] **19. (baru 2026-10-05, QA)** Baca tombol utama bilah aksi di tiap keadaan: langkah 1–5 (biru), langkah 6 (hijau), saat menyimpan (gelap) — teks putihnya harus enak dibaca; dan kepala **laporan sesi** (hijau) — kini lebih gelap dari versi sebelumnya, pastikan masih terlihat bagus
- [ ] **20. (baru 2026-10-05, QB)** Isi satu catatan → tunggu "Draf tersimpan ✓" → keluar ke Beranda lewat nav bawah → buka lagi Catat Sesi → **isian dan langkah kembali**, dan baris "Isian sesi ini tersimpan sebagai draf…" muncul
- [ ] **21. (baru 2026-10-05, L4)** Beranda → ketuk baris sesi **hari ini/akan datang** → sheet "Kelola sesi" naik dari bawah dengan **`Simpan perubahan`**; buka **`⋯ Aksi lain (2)`** → **`Batalkan sesi`** dan **`Hapus`** terlihat; `Batalkan sesi` menampilkan konfirmasi lebih dulu, `Hapus` juga (dan sesudah "Ya, hapus" sesi benar-benar hilang dari jadwal). **Tidak ada** tombol `Tidak hadir`/`Batal les` di konteks ini
- [ ] **22. (baru 2026-10-05, L4)** Beranda → sesi yang **terlewat** (baris kuning "Terlewat") → sheet "Kelola sesi terlewat" dengan tiga aksi di badan sheet: **`Catat`** (membuka wizard Catat Sesi lewat `/capture?scheduleId=…`) · **`Batal les`** · **`Tidak hadir`**. Di `Tidak hadir` pastikan pilihan **"Gratis / tidak tagih"** vs **"Tetap tagihkan"** muncul dan kalimat biayanya ikut berubah; di `⋯` ada **`Jadwalkan ulang`** (tanggal pengganti mulai dari **hari ini**) dan **`Hapus`**

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
| 2026-10-05 | **#3 putaran 2: katalog IB DP diisi (10 mapel, 78 → 62 belum) — kurikulum IB tuntas.** Mapel: `Philosophy` · `Global Politics` · `Digital Society` · `Design Technology` · `SEHS` · `Visual Arts` · `Music` · `Theatre` · `Film` · `Dance` — ditambahkan ke `IB_TOPICS` pada level `DP` (nilai level harus **persis "DP"** supaya lolos `curriculumLevelFilter`) + 10 kelompok alias baru; kesepuluhnya dihapus dari `KNOWN_TOPIcless`. **Kelompok 6 (Arts) sengaja TIDAK meminjam katalog MYP "Arts"** — isi dan levelnya beda. **Dua tes penjaga gagal karena sedang membaik, bukan karena regresi:** `topicCoverage.test.ts` memakai "Global Politics" sebagai contoh mapel *tanpa* katalog DP; contohnya diganti properti kontrak (mapel yang masih di `KNOWN_TOPIcless`: "Marine Science", "French (0520)") **dan** ditambah satu tes yang menuntut kebalikannya (mapel DP ber-katalog tidak lagi memakai topik level lain). **Temuan akar masalah artefak suite:** `test-results/` adalah direktori keluaran Playwright → artefak fakta suite dipindah ke `.design-audit-suite.json` (akar repo), pembaca `check-docs.mjs`/`measure.mjs` diperbarui, dan `check-docs` kini **berteriak** bila berkas lama masih ada. |
| 2026-10-05 | **#3 putaran 1: katalog IB MYP diisi (6 mapel, 78 → 6 dari 78 belum).** Mapel: `Language & Literature` · `Language Acquisition` · `Individuals & Societies` · `Arts` · `PHE` · `Design` — ditambahkan ke `IB_TOPICS` pada level MYP 1…MYP 5 (lengkap, bukan sebagian) + enam kelompok alias baru di `TOPIC_SUBJECT_ALIASES`; keenamnya **dihapus dari `KNOWN_TOPIcless`**. Level MYP sebelumnya hanya punya **4** nama indeks (mathematics · sciences · matematika · bahasa indonesia), jadi enam kelompok resmi MYP memang tidak bisa menemukan topiknya. **Temuan lintas kurikulum yang membuat dua alias dibatalkan sebelum sempat bocor:** alias `"Penjaskes"`/`"PJOK"` untuk PHE **tidak** didaftarkan (keduanya mapel **Nasional** — mendaftarkannya membuat murid Nasional menerima topik MYP, persis kasus "Matematika" yang sudah terdokumentasi), dan alias `"Seni"` untuk Arts juga dibatalkan (membuat `National :: Seni Budaya` memakai topik MYP Arts). **Temuan lama yang BELUM diperbaiki (bukan regresi putaran ini):** `National :: Informatika` dan `National :: Penjaskes` bermuara ke `computer science` (level AP/DP/IGCSE/A Level) — alias lama; hanya terlihat karena skrip audit baru melaporkan peta alias lintas kurikulum. Peta itu dicetak oleh `.design-audit/topic-coverage-audit.mjs` (gitignored) agar keputusan atribusi bisa ditinjau, bukan tersembunyi. |
| 2026-10-05 | **#7 ditutup: seluruh suite `npm run e2e` hijau.** Dijalankan dengan eskalasi sandbox — **78 lulus · 6 skip · 0 gagal** (4,8 menit, project `chromium` + `mobile`, batas 60 dtk). Tidak ada spec merah, jadi tidak ada yang diperbaiki. Efek samping PNG (§6.4) dibereskan: 58 ter-track dipulihkan, 13 baru dihapus, nol di-commit. Butir #7 dihapus dari tabel §4, ringkasannya diangkat ke catatan atas §4. |
| 2026-10-05 | **L4 `ManageSessionSheet` tuntas** (G3-01): dua modal lama dihapus, satu sheet dengan aksi menurut konteks; §3 diperbarui (sisa G3-01 = **C-12** saja), §5 bertambah butir **21–22** untuk sheet baru. Rincian + gate: `TASK-06` §9.2/§10. |
| 2026-10-05 | **§4 dirapikan setelah keputusan pemilik (Q-A…Q-F, #1…#7):** 7 butir ditutup (#1 · #5 · #6 · #11 · #12 · #13 · #16) dengan nomor lamanya dipertahankan di `ATURAN-AI` §1 · #3 berubah jadi pekerjaan agen (cari topik untuk 78 mapel) · #7 dinaikkan jadi target "semua spec E2E hijau" · #14 dijadwalkan setelah `L4` (Q-D = d2) · #15 dikerjakan bertahap (Q-F). **§5 bertambah 6 butir pemeriksaan manual (13–20)** untuk L10 lama + L7 · C-02 · C-03 · C-04 · QA · QB. **§3:** catatan bahwa spec `G3-02`…`G3-10` ada di arsip + batas penomoran ID. |
