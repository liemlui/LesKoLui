# Dokumentasi Les Ko Lui — Indeks Utama

```yaml
jenis: indeks
status: aktif
diperbarui: 2026-10-05
versi_app: v1.91.0
test: tidak ditulis di sini — jalankan `npm run test:sandbox` (angka yang disalin ke dokumen selalu basi; dijaga `npm run check:docs`)
baca_ini_kalau: kamu (manusia atau AI) perlu tahu dokumen mana yang harus dibuka
baca_berurutan: tidak — pakai tabel §2
```

> **Sekilas** · Jenis: **indeks dokumentasi (pintu masuk)** · Status: **aktif** · Diperbarui: 2026-10-05 (v1.91.0).
> **Untuk siapa:** pemilik aplikasi (Ko Lui) dan agen AI yang merawat repo ini.
> **Isi:** peta "mau X → buka Y" (§2) · persyaratan dokumentasi (§3) · aturan penamaan (§4) · **status pekerjaan (§5)** · riwayat rilis (§6) · aturan pemeliharaan (§7).
> **Berkas lain tidak perlu dibaca berurutan.** Tabel §2 adalah router-nya.

---

## 1. Peta folder (di mana apa)

| Folder | Isi | Sifat |
|---|---|---|
| `docs/` (folder ini) | dokumentasi **operasional** yang masih dipakai + indeks + `06-ARSITEKTUR-KODE.md` | aktif |
| `docs/kerja/` | **kontrak + dokumen tugas** untuk agen AI: langkah, jangkar kode, kontrak, verifikasi | aktif (dikerjakan) |
| `docs/mockups/` | **gambar hidup** (HTML mandiri) hasil brainstorming UI/UX — **bukan** kode produksi | usulan |
| `docs/arsip/` | dokumen **tidak berlaku lagi** — dibekukan, hanya untuk sejarah. Termasuk seri `arsitektur/` | beku |

---

## 2. Router: "mau X → buka Y"

### Kalau kamu agen AI yang mau MENGERJAKAN sesuatu

| Mau… | Buka | Catatan |
|---|---|---|
| **memulai pekerjaan apa pun** di rombak UI/UX | [`kerja/ATURAN-AI.md`](kerja/ATURAN-AI.md) | **pintu masuk wajib** — kontrak, keputusan terkunci, daftar larangan, bentuk laporan |
| **lihat daftar pekerjaan & urutan eksekusi** | [`kerja/PEKERJAAN.md`](kerja/PEKERJAAN.md) | **satu-satunya** daftar pekerjaan (menggantikan `ROADMAP.md` + §4 halaman ini) |
| tahu **aturan struktur dokumentasi** (angka, arsip, satu daftar pekerjaan) | [`07-PERSYARATAN-DOKUMENTASI.md`](07-PERSYARATAN-DOKUMENTASI.md) | kontrak dokumen; dijaga `npm run check:docs` |
| **lihat ringkasan TASK-01…TASK-10** | [`kerja/CHEATSHEET.md`](kerja/CHEATSHEET.md) | 1 halaman per tugas |
| tahu **cara menulis dokumen tugas** yang bisa dieksekusi model kecil | [`kerja/TASK-02-format-dokumen-tugas-ai.md`](kerja/TASK-02-format-dokumen-tugas-ai.md) | spesifikasi format + anti-pola |
| mengerjakan **refactor layar besar** (6 langkah, belum selesai) | [`kerja/TASK-01-refactor-layar-besar.md`](kerja/TASK-01-refactor-layar-besar.md) | ikuti urutan §3, jangan improvisasi |
| mengerjakan **rombak UI/UX** (fondasi visual, keuangan, catat sesi, AI berbiaya, privasi uang) | [`kerja/TASK-03-blueprint-uiux.md`](kerja/TASK-03-blueprint-uiux.md) → lalu §5 di berkas itu | **baca `ATURAN-AI.md` dulu**; pekerjaan `TASK-04`–`TASK-09` tidak boleh dijalankan tanpa §2 larangannya |
| tahu **cara aplikasi dibangun** & apa yang dilarang disentuh | [`06-ARSITEKTUR-KODE.md`](06-ARSITEKTUR-KODE.md) | peta kode + daftar perusak data/uang; seri lama ada di [`arsip/arsitektur/`](arsip/arsitektur/README.md) |
| tahu **aturan yang mengikat semua tugas UI/UX** | [`kerja/ATURAN-AI.md`](kerja/ATURAN-AI.md) §1–§3 | kontrak; kalau tugas bertentangan, kontrak yang menang. Versi potret lama: [`arsip/arsitektur/11-uiux-ai-cost-dan-privasi.md`](arsip/arsitektur/11-uiux-ai-cost-dan-privasi.md) |
| melihat **gambar usulan tampilan** sebelum menulis kode | [`mockups/`](mockups/) | HTML mandiri, buka langsung tanpa server |
| tahu **daftar seluruh pekerjaan terbuka** | [`kerja/PEKERJAAN.md`](kerja/PEKERJAAN.md) | |

### Kalau kamu manusia yang memakai/merawat aplikasi

| Mau… | Buka | Waktu |
|---|---|---|
| tahu kapan sesi ditagih & kenapa sebuah sesi (tidak) masuk tagihan | [`01-PANDUAN-TAGIHAN.md`](01-PANDUAN-TAGIHAN.md) | ±3 mnt |
| memasang/memperbaiki backup otomatis ke Google Drive | [`02-PANDUAN-BACKUP-DRIVE-SENYAP.md`](02-PANDUAN-BACKUP-DRIVE-SENYAP.md) | ±10 mnt |
| mengaudit tampilan aplikasi secara sistematis (berbasis screenshot) | [`03-PLAYBOOK-AUDIT-UIUX-VISUAL.md`](03-PLAYBOOK-AUDIT-UIUX-VISUAL.md) | ±30 mnt |
| mengubah backup/restore, draf Catat Sesi, respons AI, atau `saveSettings` | [`04-RENCANA-KETAHANAN-DATA.md`](04-RENCANA-KETAHANAN-DATA.md) | ±20 mnt |
| membangun app lain dengan pola offline-first seperti ini | [`05-ARSITEKTUR-REPLIKASI-OFFLINE.md`](05-ARSITEKTUR-REPLIKASI-OFFLINE.md) | ±25 mnt |
| tahu **bagaimana aplikasi ini dibangun** | [`06-ARSITEKTUR-KODE.md`](06-ARSITEKTUR-KODE.md) | sesuai kebutuhan |
| melihat potret arsitektur lama (v1.70–v1.75) | [`arsip/arsitektur/README.md`](arsip/arsitektur/README.md) | beku — jangan dikutip angkanya |
| mencari keputusan lama (audit & panduan selesai) | [`arsip/README.md`](arsip/README.md) | sesuai kebutuhan |

---

## 3. Persyaratan dokumentasi (kontraknya di berkas sendiri)

Struktur dokumentasi, larangan menyalin angka, aturan arsip, dan cara memeriksanya ada di
[`07-PERSYARATAN-DOKUMENTASI.md`](07-PERSYARATAN-DOKUMENTASI.md) — **berlaku**, dengan ukuran dan
cara verifikasi. Ringkasnya: angka mutakhir lewat perintah (`npm run measure` / `npm run test:sandbox`),
satu daftar pekerjaan (`kerja/PEKERJAAN.md`), satu urutan baca, dan dokumen tak berlaku pindah ke `arsip/`
dengan banner + satu baris inventaris.

---

## 4. Aturan penamaan berkas

| Pola nama | Letak | Arti |
|---|---|---|
| `NN-<JUDUL>.md` | `docs/` | dokumen operasional, urutan baca `01`…`06` (`06` = peta kode/arsitektur) |
| `README.md` | tiap folder | router/pintu masuk folder itu |
| `TASK-NN-<slug>.md` | `docs/kerja/` | dokumen tugas untuk agen AI (lihat `TASK-02` untuk formatnya) |
| `ATURAN-AI.md` | `docs/kerja/` | **pintu masuk wajib** agen: kontrak, keputusan terkunci, larangan (pendek & padat) |
| `PEKERJAAN.md` | `docs/kerja/` | satu-satunya daftar pekerjaan terbuka |
| `<topik>-<tanggal>.html` + `_shared.css` | `docs/mockups/` | mockup tampilan; nama berkas memuat tanggal keputusan |
| `<JUDUL-BEBAS>.md` | `docs/arsip/` | dibekukan; nama dipertahankan, **tidak** diberi nomor |

> **Untuk agen AI:** jangan mengandalkan nomor urut sebagai urutan baca. Pakai §2.
> Nama berkas di `arsip/` sengaja dipertahankan agar tautan lama dan ingatan orang tidak putus.

---

## 5. Pekerjaan terbuka

> **Dipindah 2026-10-05.** Daftar pekerjaan **tidak lagi** ada di halaman ini — ia hidup di satu tempat:
> [`kerja/PEKERJAAN.md`](kerja/PEKERJAAN.md) (gelombang, urutan eksekusi, pekerjaan tanpa dokumen tugas,
> dan daftar periksa manual). Halaman ini memuat **router** (§2), persyaratan (§3), riwayat rilis (§6), dan aturan
> pemeliharaan (§7) saja.
>
> Isi §5 versi lama (termasuk tabel Q9–Q28 dan daftar periksa manual 2026-10-04) dibekukan di
> [`arsip/RIWAYAT-PEKERJAAN-2026-10.md`](arsip/RIWAYAT-PEKERJAAN-2026-10.md).

---

## 6. Riwayat rilis (ringkas — jejak lengkap di `arsip/README.md`)

| Tanggal | Peristiwa | Versi |
|---|---|---|
| 2026-10-05 | **Rilis v1.91.0 — “Kelola sesi” jadi satu panel + gelombang perbaikan Catat Sesi + katalog topik IB MYP.** Satu panel menggantikan **dua** modal lama (`EditSessionModal` + `ResolveMissedSessionModal`; keduanya **dihapus**): aksi menyesuaikan konteks (terlewat: Catat · Batal les · Tidak hadir — terjadwal: Simpan perubahan), aksi jarang ke `⋯`, dan setiap pembatalan/penghapusan lewat konfirmasi. Ikut rilis: simpan sesi dari langkah 5 (Q2) · pindah langkah diumumkan + gulir ke atas (C-02) · keyboard grup radio pola penuh (C-03 c2) · badge `!` langkah belum lengkap (C-04) · “Lewati” di langkah 2 (C-08) · donat skor → `ProgressBar` (C-10) · undo hapus topik & tindak lanjut (C-13/C-05) · baris kepastian draf (Q-B b3) · 10 warna mentah bilah aksi → token (Q-A). **Katalog topik: 6 kelompok mapel IB MYP** (Language & Literature · Language Acquisition · Individuals & Societies · Arts · PHE · Design, MYP 1–5) — 78 → 72 pasangan tanpa katalog. Gate rilis: `tsc` ✓ · `eslint --max-warnings 0` ✓ · **770 lulus / 64 berkas** ✓ · `build` ✓ (`dist/sw.js`) · `check:docs` ✓ · **`e2e` 78 lulus / 6 skip / 0 gagal** ✓. **Belum diverifikasi manusia di perangkat** — daftar periksa `PEKERJAAN.md` §5 (22 butir, dua di antaranya untuk panel baru) masih menunggu centang | v1.91.0 |
| 2026-10-05 | **Keputusan pemilik (Q-A…Q-F, #1…#7) masuk kontrak + dikerjakan sebagian.** Selesai: **QA/B** 10 heks mentah di 2 berkas jadi token — dan itu **memperbaiki** dua kegagalan kontras yang ada (teks putih di tombol langkah 6 `3,30→4,95:1`, keadaan menyimpan `1,80→14,67:1`) · **QB/b3** satu baris kepastian draf (nav bawah tetap tidak diblokir) · **QC/c2** keyboard pola radiogroup (Tab masuk sekali, panah/Home/End) · **#5** batas tes Playwright 60 dtk · **#2** daftar periksa manual jadi 20 butir. Dilanjutkan (bukan sekarang): **#7** semua spec E2E hijau · **#3** katalog topik 78 mapel · **Q-D/d2** rilis + `CHANGELOG` setelah `L4`. Ketetapan: **#6 CI tidak diaktifkan** · **#1** PWA diverifikasi pemilik lewat Vercel · **Q-E** mockup dipertahankan · **Q-F** spesifikasi G3 dipindah bertahap | — |
| 2026-10-05 | **G3-01 hampir tuntas (10 commit, belum dirilis).** Yang berubah: **Q2 "simpan dari langkah 5" ternyata belum ada di kode** (hanya tertulis sebagai keputusan) → sekarang terpasang + 4 tes · C-02 (pindah langkah diumumkan & pandangan kembali ke atas) · C-03 (satu penulis `responseTag`, kedua grup jadi `role="radiogroup"`) · C-04 (badge `!` untuk langkah wajib yang belum lengkap) · C-08 ("Lewati" di langkah 2 bila murid tanpa mapel) · C-10 (donat skor → `ProgressBar` bertoken) · teks konfirmasi hapus tindak lanjut dibetulkan · overlay pudar putih ditokenkan · `ATURAN-AI` §6.4 baru (jebakan alat & git, dinaikkan dari dokumen arsip). Gate: `tsc` ✓ · `eslint` ✓ · suite penuh ✓ · `build` ✓ · **`e2e`/`e2e:uiux` belum dijalankan** (butuh eskalasi) · verifikasi manusia di perangkat **menunggu** | — |
| 2026-10-04 | **Rilis v1.90.0 — Catat Sesi lebih cepat: pilih mapel & topik tanpa panel bersarang.** Menggabungkan dua pekerjaan G3-01: pemilih mapel jadi baris chip datar di langkah 2 (satu mapel **1 ketukan**, dulu 3; mapel kedua +1, dulu +4) dan daftar topik/pencarian diperkuat (panel bab terbuka sejak awal, hasil pencarian tepat di bawah kolom isian, batas 8 bab diberitahukan). **Jumlah langkah tetap 6** — yang berubah cara memilihnya, bukan langkahnya. Gate: `tsc` ✓ · `eslint` ✓ · **706/706 tes** ✓ · `build` ✓ · `e2e` **78 lulus/6 skip/0 gagal** · `e2e:uiux` 56 lulus/0 gagal · `md-links` 0 rusak. Verifikasi manusia di perangkat: **menunggu** (12 kotak §4.3) | v1.90.0 |
| 2026-10-04 | **Ekspor JPG/PNG multi-halaman diperbaiki** — cacat ditemukan pada pemeriksaan visual: aplikasi memicu unduhan berurutan sendiri dan peramban hanya mengizinkan satu unduhan otomatis per gestur, sehingga hanya berkas terakhir tersimpan. Kini berkas pertama tersimpan langsung dan halaman sisanya menjadi tombol **"Unduh halaman N"** (satu ketukan = satu berkas); di HP seluruh halaman dikirim lewat satu kali Web Share. Sekaligus dicatat: **pemeriksaan visual pemilik atas 14 titik selesai, semuanya aman**, dan **Chrome Android aman** → menutup `G2-05`. Gate: `tsc` ✓ · `eslint` ✓ · 698/698 tes ✓ · `build` ✓ · spec ekspor chromium ✓ | v1.89.2 |
| 2026-10-04 | **Daftar topik & pencarian di Catat Sesi diperkuat (G3-01 L9, commit `38eb8c9`)** — (a) panel **"Pilih dari daftar bab" terbuka sejak awal**, jadi katalog topik mapel itu bisa langsung dibaca tanpa satu ketukan pembuka; (b) **hasil pencarian dipindah tepat di bawah kolom isian** — sebelumnya blok ini berada di bawah chip "Topik sesi lalu" dan panel bab, sehingga di layar HP hasil sering berada di luar viewport tepat setelah tutor mengetik; (c) daftar bab menyebut **batas 8 bab** (batas itu sudah ada di `browseTopicsForSubjects(..., maxGroups = 8)` tetapi belum pernah diberitahukan) beserta jalan keluarnya "cari lewat ketikan". Dijaga 2 tes baru `src/__tests__/topicBrowseDefault.test.tsx`. Gate: `tsc` ✓ · `eslint` ✓ · **706/706 tes** ✓ · build ✓ · `e2e` **78 lulus/6 skip/0 gagal** · `e2e:uiux` 56 lulus/0 gagal. **Belum dilihat manusia di perangkat** | — |
| 2026-10-04 | **Pemilih mapel di Catat Sesi jadi lebih cepat (G3-01 L8, commit `4fcbaf4`)** — tombol `+ Tambah Mapel` yang membuka panel dari bawah dihapus; chip mapel sekarang dieja datar di langkah 2, jadi satu mapel **1 ketukan** (dulu 3: buka panel → pilih → `Selesai`) dan dua mapel **2 ketukan** (dulu 5, karena panelnya harus dibuka ulang). Ringkasan "Dipilih (n)" muncul begitu ada mapel terpilih, menggantikan umpan balik tombol `Selesai`. Bentuk modalnya **tetap ada** di komponen (`variant="modal"`), tetapi sudah tidak dipakai dari wizard. Dijaga 6 tes baru `src/__tests__/subjectPickerInline.test.tsx`; hitungan ketukan per langkah dicatat di `TASK-06` §9.1. Gate: `tsc` ✓ · `eslint` ✓ · **704/704 tes** ✓ · build ✓ · `e2e` 76 lulus/6 skip/2 gagal (dua merah jalur laporan **lulus 10/10 sendirian** → flake beban) · `e2e:uiux` 56 lulus/0 gagal. **Belum diverifikasi manusia di perangkat** — 12 kotak `docs/README.md` §4.3 masih menunggu centang | — |
| 2026-10-04 | **Tinjauan visual pemilik** (hasil di §4.4.1): rona chip Kondisi les & badge asal tagihan **jelas**, catatan sesi panjang di laporan **tidak terpotong** (menegaskan §4.2 #28 — yang basi spec-nya, bukan paginasi), dan ikon Pengaturan diminta **bergerigi** → ikon diganti cog (cincin + 8 gigi + lubang tengah). Gate: `tsc` ✓ · `eslint` ✓ · 698/698 tes ✓ · build ✓ | v1.89.1 |
| 2026-10-04 | **G3-01 langkah refactor tuntas (commit `925e4ff`)** — `CaptureSession.tsx` **2.155 → 1.901** baris, target ≤1.900 dari `TASK-01` §2 tercapai; dua ekstraksi murni pemindahan (badan Langkah 4 wizard → `captureSession/ResponseStep.tsx`, modal pemilih mapel → `captureSession/SubjectPickerSheet.tsx`), tanpa state draf yang berpindah dan tanpa teks pengguna yang berubah (dibuktikan baris-per-baris terhadap HEAD: 159 vs 159 identik; 126 vs 126 dengan 10 beda yang semuanya penggantian identifier). Empat angka basi di dokumen kerja dikoreksi dengan hasil ukur 2026-10-04: `CaptureSession.tsx` **2.155** (bukan 2.073/2.099), `MonthlyReport.tsx` **2.351**, `StudentDetail.tsx` **1.083**, `Settings.tsx` **1.308**, `TagihanTab.tsx` **1.035**. Gate: `tsc` ✓ · `eslint` ✓ · **698/698 tes** ✓ · build ✓ · `e2e` **78 lulus / 6 skip / 0 gagal** (merah laporan yang dulu tercatat tidak muncul di run ini) · `e2e:uiux` **56 lulus / 0 skip / 0 gagal** · `md-links` 0 rusak. Fitur G3-01 (C-01…C-13 + TASK-06) menyusul di putaran berikutnya | — |
| 2026-10-04 | **Penutupan Gelombang 2 + pemberesan hutangnya**: (a) **kebijakan emoji dituntaskan** — 6 emoji struktural yang masih lolos (ikon Pengaturan di Beranda, “Murid aktif”, lonceng badge follow-up, ikon kartu badge tagihan, ikon orang tua, pensil judul “Catatan Belajar”) diganti ikon SVG; guard `e2e:uiux` **dijalankan pertama kali** dan menuntut 0 → **48 lulus / 8 skip / 0 gagal**; (b) **Q42/Q43 opsi B** — warna chip Kondisi les, badge asal tagihan, dan pil status bayar dipindah dari berkas data §2.1 ke peta **token** `src/lib/toneStyles.ts` (ketiga berkas dilindungi tidak disentuh; `AGE_BUCKET_CLASS` 0 konsumen); (c) **Q19** — tiga label form terasosiasi (`aria-label` PIN Keuangan, “Ketik mapel lain”, grup “Model”); (d) **Q44/A17 + Q45/A18** dikunci (cakupan §6 K3 dipersempit ke luar `payments/**`; 44 px = kontrol utama, chip 24–36 px diterima); (e) **Q23/A19** — letak resmi spec guard = `e2e-uiux/`; (f) **3 uji laporan basi dibereskan** (asersi kotak 3:4 dihapus karena rasio itu dibatalkan 2026-10-01; race seed diperbaiki; generator audit jadi opt-in) dan **terbukti bukan regresi** lewat bisect 4 commit (merah bahkan di v1.77.0 yang menulis spec itu); (g) **§4.2 #9 ditutup** — 3 kriteria ketahanan data ternyata sudah berujian sejak v1.79.1 (React Testing Library tidak diperlukan); (h) sisa merah `npm run e2e` = **flake beban** (timeout 30 dtk), bukan regresi — `finance` lulus sendirian. Gate: `tsc` ✓ · `eslint` ✓ · **698/698 tes** ✓ · build ✓ · `e2e:uiux` **48/8/0** | v1.89.0 |
| 2026-10-03 | **Sisa Gelombang 2 dikerjakan (5 tugas + 1 sebagian)**: (a) **G2-04 satu pintu uang** — `useMoneyVisible()` (satu status tingkat modul) + `<MaskedMoney/>`; 6 titik kebocoran ditutup (tarif & biaya sesi, total laporan, tautan WA), Beranda kehilangan seluruh akses uang, dan gerbang `/payments` kini **berbagi** status buka-kunci dengan layar lain + tombol `Kunci`; (b) **G2-08 Beranda non-uang** — legenda warna kalender, `aria-label` per tanggal, sel 64→76 px, chip 11 px maks 2 + “+N”, inbox “Perlu Perhatian” persisten di `localStorage`, tombol simpan jadwal menyebut jumlah bentrok, ringkasan minggu **digabung** ke satu blok “Hari Ini”; (c) **G2-06 tap target** — ikon 44 px, chip 32–36 px, `Toggle` 26→32 px rel dengan area 44 px, tautan WA 20→44 px, “Hapus” murid dipisah dari “Nonaktifkan”; (d) **G2-07 DayView** — kerapatan 27/54/97 + tombol `Muat sehari penuh` (18 jam), `PX_PER_HR` dihapus total, batas bawah blok 22 px; (e) **G2-10 jalur galat tunggal** — `useSettingsQuery()` + `<SettingsLoadError/>`, probe/watchdog G1-07 pindah dari `Settings.tsx` ke hook, **6 layar** lain mendapat keadaan gagal yang sama (`role=alert` + “Coba lagi”); (f) **G2-09 + kebijakan TASK-11** — emoji **literal** disapu sampai **0**, termasuk 3 emoji di dalam tombol-tautan WhatsApp; **tipe sesi** (kelompok struktural) pindah ke ikon SVG (Book · Clipboard · Wrench · Lightbulb · Refresh · Star); **13 tombol** kosakata afektif (mood, situasi, indikator perilaku, tag respons, level sesi) ditandai `data-emoji-vocab="affect"`; guard kini **menuntut 0** emoji di kontrol/heading di luar penanda itu (**bukan** lagi `test.fixme`). Pemeriksa mandiri dengan selektor yang sama → **0 pelanggaran**. **Gate yang dijalankan: `npx tsc -b` saja** (keputusan pemilik: tanpa lint/tes/e2e) — lihat `.design-audit/g2-sisa-LAPORAN.md` | v1.88.0 |
| 2026-10-03 | **Warna di seluruh layar diseragamkan**: sekitar **3.000 penulisan warna langsung di 72 berkas** diganti token bertema (**23 token baru**, total 36 dipakai) — warna untuk peran yang sama kini sama di semua layar, dan setiap teks di atas latar terang dibuktikan ≥4,5:1 (rasio terburuk 4,94:1). Ditambah warna khusus status “perlu ditindak” (oranye, terpisah dari kuning “backup menua”, Q33). Opasitas `/NN` dinormalkan dan dibuktikan 34/34 menghasilkan `color-mix`. **Tirai panel dikembalikan ke definisi benar** (17 titik sempat menunjuk `--scrim` yang belum pernah didefinisikan → diperbaiki). Dibuang: `--bg-muted` + skala `--color-brand-*`. Sisa: 42 warna mentah di 3 berkas §2.1 (`engagement.ts` · `invoicePresentation.ts` · `finance.ts`) | v1.87.0 |
| 2026-10-03 | **Skala ukuran teks akhirnya berlaku di tombol & kolom isian**: aturan “kontrol form mewarisi huruf sekitarnya” yang ditulis di luar lapisan gaya dipindah ke `@layer base` — sebelumnya ia mengalahkan seluruh kelas ukuran/ketebalan huruf, sehingga tombol yang ditulis 14px tebal tetap dirender 16px biasa (Q25). Ditambah **fondasi tampilan Gelombang 2**: skala ukuran huruf 13/15/18/24 px, skala jarak kelipatan 4, 2 tingkat bayangan, 2 pola gerak, **4 warna teks bertema** (`--ink-*`) + latarnya yang dibuktikan ≥4,5:1 di semua latar terang (13 titik G1-04 diuji ulang: 5,05–7,13:1), dan **7 primitif** di `src/components/ui/` (G2-01) | v1.86.0 |
| 2026-06-26 | Audit dokumentasi vs kode: 13 dokumen diselaraskan | v1.12.1 |
| 2026-07 → 08 | Audit keamanan/teknis 4 ronde: 26/26 ditangani (1 di-waive: H-2, API key AI) | v1.37.0 → v1.53.0 |
| 2026-08-29 | Refactor Catat Sesi: state besar dipecah ke 3 hook | v1.64.x |
| 2026-09-01 | Analisis UI/UX (chart/data-viz) + cheat-sheet tagihan | v1.66–1.68 |
| 2026-09-04 | Audit interaksi, navigasi, a11y, design system | v1.70.0 |
| 2026-09-05 | Audit redundansi informasi + humanisasi pesan WhatsApp | v1.70.x |
| 2026-09-05 | **Ketahanan data: 6 fase (A–F) diimplementasikan** (draf Catat Sesi, schema v15, validasi restore, kontrak AI, `saveSettings` atomik) | v1.70.5 |
| 2026-09-08 | Backup senyap ke Google Drive lewat relay | v1.71.x |
| 2026-09-11 | Audit visual 87 screenshot: 14 temuan — semua ditutup | v1.71.4 |
| 2026-09-12 | Audit modul Keuangan: 10 item — semua diimplementasikan | v1.72.0 |
| 2026-09-12 | Audit alur Catat Sesi: **17 temuan** + 2 bug tambahan saat verifikasi | v1.73.0 |
| 2026-09-13 | Ketahanan data: E2E close-out gagal (Fase B) + runtime PWA/restore (Fase D) dijalankan | v1.73.0 |
| 2026-09-13 | Audit pilihan topik & kondisi les **P0**: cakupan topik 64 → 93 dari 167 mapel; saran topik lintas-jenjang tidak lagi menyamar | v1.74.0 |
| 2026-09-13 | Audit yang sama **P1–P3**: pilih topik dari daftar bab, langkah Kondisi 3 lapis (60 → 11 kontrol), mood keluar dari skor, rata-rata berpenyebut + cakupan data, detail sesi bisa dikoreksi, jenjang murid tidak lagi `UNIV` | v1.75.0 |
| 2026-09-13 | Refactor putaran 1: `StudentDetail.tsx` 1.429 → 1.039; modul konstanta & helper Catat Sesi; **+31 test** (530 → 561); 2 bug ditemukan test baru | v1.75.1 |
| 2026-09-13 | Dokumentasi ditata ulang: `docs/kerja/` untuk dokumen tugas AI, indeks jadi router, `TODO.md` + `03-capture-flow.md` diarsipkan | v1.75.1 |
| 2026-09-15 | Ketahanan AI dan Settings diperkuat dengan tes; refactor Catat Sesi, detail murid, dan tagihan dilanjutkan | v1.76.0 |
| 2026-09-30 | Tarif sesi lama dibekukan (retroaktif hanya lewat centang eksplisit + audit); tagihan bisa dibatalkan berjejak lalu dipulihkan dari perangkat ini; total laporan final dibekukan; jatuh tempo bisa diubah — semuanya di balik PIN Keuangan | v1.77.0 |
| 2026-09-30 | Laporan final bisa **dibuka kuncinya** menjadi draft untuk diperbaiki (PIN-gated) — jalur yang hilang sebelumnya: membatalkan tagihan saja menghasilkan tagihan identik karena total final membeku; guard: tagihan lunas/manual, paket, laporan susulan | v1.78.0 |
| 2026-10-01 | Foto sesi mengalir di dalam teks (7 layout), pilihan rasio 3:4 dihapus (semua tinggi otomatis), satu tombol **🤖 Isi Semua dengan AI** dengan narasi berbatch (anti-gagal konteks terlalu besar), info terduplikasi di laporan dihapus (chip topik/perhatian), tema & warna diacak (galeri disembunyikan, mode Bandingkan dihapus), menu Laporan bisa membuka riwayat laporan, aksi penagihan jadi satu tombol, tombol kirim laporan+tagihan & WA massal dihapus, entri pemulihan tagihan bisa dihapus, **foto sesi >12 bulan diperkecil otomatis** (data lama tidak membengkak) | v1.79.0 |
| 2026-10-01 | **Kunci periode laporan jadi per SESI, bukan kalender** (memperbaiki laporan murid yang ditolak karena “tanggal 1 September sudah direkap” padahal rekap sebelumnya bukan September); daftar periode terkunci bisa dibuka di layar Laporan; rentang sesi + tombol “Sesuaikan tanggal”; **titik pemulihan tagihan bisa dipilih** (termasuk kembali ke titik lama setelah salah pulihkan); restore file/Drive menampilkan tahapan + tombol cek file + pesan gagal yang jelas; CSP font tema diperbaiki | v1.79.0 |
| 2026-10-01 | **Perbaikan tombol “Isi Semua dengan AI”**: kolom **Catatan Guru** & **Rencana Berikutnya** tidak terisi karena hanya dihasilkan panggilan narasi sementara field laporan ditulis dari panggilan ringkasan — sekarang satu panggilan ringkasan mengisi ringkasan + catatan guru + kutipan + rencana depan, dengan cadangan dari batch penuh bila panggilan itu gagal | v1.79.1 |
| 2026-10-01 | **Filter kategori layout dihapus** (Classic/Visual/Analytic/Modern/Formal/Playful) — panel desain kini cukup: 🎲 Acak, 🎨 Pilih tema, 📐 Layout (semua layout tetap ada, plus pratinjau 👁) | v1.79.2 |
| 2026-10-03 | **Judul layar Murid, Laporan, dan Pengaturan kini terbaca pembaca layar** (tiga layar terakhir yang tadinya hanya punya `h1` — daftar heading-nya kosong untuk navigasi pembaca layar), plus **penjaga regresi metrik UI** `npm run e2e:uiux` (7 layar × 2 ukuran layar: kontras teks, ukuran kontrol, hierarki heading, kontrak tab) yang **tidak** ikut CI utama, spec close-out yang patah sejak G1-06 ditambal, dan 13 tes tab permanen (G1-11) | v1.85.0 |
| 2026-10-03 | **A11y dasar: tab, judul, pesan status, dan tombol "Coba lagi" close-out** — pola tab lengkap di 3 layar bertab (setiap tab menunjuk panel isinya, hanya tab aktif yang kena tombol Tab, panah ←/→ + Home/End memindahkan fokus sekaligus membuka tab), judul blok Beranda jadi heading sungguhan ("Hari Ini"; "Perlu Perhatian" & "Kalender" untuk pembaca layar), banner Laporan dibacakan sebagai status/peringatan, tombol **"Coba lagi"** kegagalan tindak lanjut pindah ke **dalam** laporan sesi (dulu di balik modal yang mengunci fokus keyboard), tombol ✓ follow-up punya nama, dan keterangan reset menyebut "(kecuali satu jejak reset)" (G1-10) | v1.84.0 |
| 2026-10-01 | **Teks jaminan “Hapus Semua Data” diperbaiki & jalur Simpan PIN tidak lagi merusak metadata**: layar Pengaturan berhenti menjanjikan “Pengaturan, profil, dan PIN tetap aman” (padahal PIN Keuangan, kunci API AI, logo, profil, dan rekening bank ikut terhapus) dan menyebut apa yang tetap ada; “Simpan PIN” kini menulis patch, bukan snapshot penuh — `lastBackupAt` dari backup yang lebih baru tidak lagi mundur, badge “Belum disimpan” kembali “Tersimpan ✓”, dan kegagalan menyimpan PIN dilaporkan (G1-09) | v1.83.0 |
| 2026-10-01 | **Aksi yang mengubah uang & menghapus data minta konfirmasi**: tandai lunas/belum dibayar (+ tombol **Urungkan** 8 detik, label “Batalkan pelunasan” → “Tandai belum dibayar”), hapus foto/TTD (Catat Sesi) & tindak lanjut, hapus foto lama (permanen) vs perkecil foto (tanpa konfirmasi), dan “🧹 Bersihkan Cache (butuh internet setelahnya)”; plus baris “Penyimpanan Lokal” tidak lagi hilang diam-diam (G1-08) | v1.82.0 |
| 2026-10-01 | **Beranda & Pengaturan tidak lagi tampak kosong/menggantung**: kartu “Hari Ini” menampilkan rangka selama data belum siap (tidak lagi berkata “Tidak ada sesi hari ini” lebih awal) dan Pengaturan punya rangka + kotak “Pengaturan gagal dimuat” dengan tombol **“Coba lagi”** (batas tunggu 8 detik, G1-07) | v1.81.0 |
| 2026-10-01 | **Kegagalan tidak lagi tampil seperti keberhasilan**: toast sukses/gagal dipisah (Pengaturan & Beranda) + pesan gagal simpan sesi diterjemahkan ke bahasa manusia dengan tombol **“Coba lagi”** yang tahu aksi mana yang harus diulang (v1.80.0, G1-06) | v1.80.0 |
| 2026-10-01 | **Pengingat backup mingguan tidak lagi menutupi konten**: tingginya diukur (`--nag-h`, terukur 116 px) dan dihitung ke jarak bawah halaman (80 → 196 px) + tombol tutup 44 px (tahan 7 hari) + disembunyikan di layar Catat Sesi & saat ada modal (G1-05) | v1.80.0 |
| 2026-10-01 | **Kontras 13 titik terburuk dinaikkan ke ≥4,5:1** (mis. “Besok” 2,07:1 → 4,87:1, “Backup” 2,15:1 → 5,05:1); 14 baris kelas di 12 berkas, sisanya digantikan token pada fondasi visual (G1-04) | v1.79.3 |
| 2026-10-01 | **Banner “Pasang di layar utama” berhenti muncul terus**: penolakan disimpan di perangkat (90 hari; 365 hari setelah tombol Pasang dijalankan) + deteksi mode aplikasi terpasang (`display-mode` standalone/fullscreen, `navigator.standalone`). Sebelumnya penolakan hanya state React, sehingga banner kembali setiap reload — terutama di HP tanpa Google Play Services (Huawei/EMUI) yang tidak pernah menerima event `appinstalled` | v1.79.3 |

---

## 7. Aturan pemeliharaan (supaya tidak berantakan lagi)

### 7.1 Untuk manusia

1. **Dokumen selesai/usang → pindahkan ke `docs/arsip/`** dan tambahkan **satu baris** di
   [`arsip/README.md`](arsip/README.md): tanggal · status akhir · kenapa masih berguna.
   Beri **banner** di baris atas berkasnya: kapan diarsipkan, kenapa, ke mana penggantinya.
2. **Nama berkas di `arsip/` tidak diganti.** Isi arsip dibekukan; yang boleh berubah hanya **rujukan
   path** agar tidak menunjuk lokasi lama. **Angka di arsip tidak pernah diperbarui.**
3. **Pekerjaan terbuka tidak boleh ikut terarsip.** Kalau dokumennya diarsipkan, butir yang belum
   selesai dipindah ke [`kerja/PEKERJAAN.md`](kerja/PEKERJAAN.md) pada putaran yang sama.
4. **Dokumen aktif wajib punya blok "Sekilas"** di baris atas (jenis · status · untuk siapa · baca kalau).
5. **Jangan menaruh dokumentasi penting di luar repo.** Folder induk (`Private Tutor/`) tidak dikelola git.
6. **Artefak tidak masuk repo**: `dist/`, `test-results/`, `typecheck-output.txt`, ekspor `leskolui-data-*.csv` sudah diabaikan `.gitignore`.

### 7.2 Untuk agen AI (dan manusia yang menulis untuk AI)

1. **Sebelum mengerjakan apa pun: [`kerja/ATURAN-AI.md`](kerja/ATURAN-AI.md).** Ia memuat keputusan
   terkunci, berkas yang **dilarang** disentuh (§2.1), perintah verifikasi (§6, termasuk §6.1 lingkungan
   sandbox), gate 4 tier (§6.2), dan bentuk laporan (§8). Urutan menang kalau ada konflik:
   `ATURAN-AI.md` → `06-ARSITEKTUR-KODE.md` → `TASK-XX` → lainnya.
2. **Daftar pekerjaan hanya satu:** [`kerja/PEKERJAAN.md`](kerja/PEKERJAAN.md). Jangan menaruh daftar
   pekerjaan di `README.md` (akar repo maupun halaman ini) — dulu ada `TODO.md` di akar dan tidak pernah terbaca.
3. **Dokumen tugas masuk `docs/kerja/`** dengan format di
   [`kerja/TASK-02-format-dokumen-tugas-ai.md`](kerja/TASK-02-format-dokumen-tugas-ai.md).
4. **Angka mutakhir tidak ditulis di dokumen.** Versi = `package.json`; jumlah tes = `npm run test:sandbox`;
   baris berkas = `npm run measure`. Kalau sebuah angka memang harus muncul, tulis beserta tanggal+versinya.
   Dijaga `npm run check:docs`.
5. **Jangan membaca berkas >500 baris secara utuh.** Pakai jangkar teks, baca ±40 baris di sekitarnya;
   daftar berkasnya lewat `npm run measure`.
6. **Satu langkah per putaran, lalu berhenti.** Jangan melanjutkan ke langkah berikutnya tanpa verifikasi.
7. **Setelah mengubah perilaku:** tambahkan entri di `src/lib/version.ts` (`CHANGELOG`) dan satu baris di §6 halaman ini.
8. **Kalau menemukan fakta yang bertentangan dengan dokumen:** perbaiki dokumennya di putaran yang sama,
   atau catat di `docs/kerja/TASK-*.md` §8. Jangan biarkan dua dokumen saling bertentangan.
9. **Seri `arsitektur/` sudah diarsipkan** (`arsip/arsitektur/`) — ia potret v1.70–v1.75. Untuk keadaan
   hari ini: kode + `package.json` + `src/lib/version.ts` + §6 halaman ini.
