# SERAH-TERIMA — keadaan terakhir dan langkah berikutnya

> **Sekilas.** Jenis: lembar serah-terima untuk sesi berikutnya. Status: berlaku.
> Untuk siapa: agen AI yang melanjutkan pekerjaan ini, dan pemilik yang ingin tahu keadaan terakhir tanpa membaca seluruh dokumen.
> Berkas ini diperbarui di akhir sesi, bukan di awal.
> **Terakhir diselaraskan: 2026-10-19** (sesudah **v1.114.0**) — putaran ini mengubah **tampilan invoice dan teks laporan**: rincian Invoice Profesional kini hanya memuat info pertemuan (tanggal · jam · mapel · durasi) dengan dasar tagihan **jam pertemuan**, invoice bisa diunduh sebagai **JPG** (belum lunas maupun lunas), dan tombol **Perkuat AI untuk Kutipan** dipasang kembali (**D18**). **Batas kejujuran putaran ini:** `npx tsc -b`, suite **1616 lulus / 114 berkas**, `npm run build`, dan `npm run check:docs` (0 pelanggaran) sudah dijalankan dan lulus; yang **belum** adalah `npm run e2e` dan pemeriksaan mata atas invoice (termasuk lebar 320 px) serta hasil ekspor JPG-nya.
> **Sebelumnya, 2026-10-18** (sesudah **v1.113.0**) — putaran itu mengubah **uang yang tampil**: tarif DeepSeek dan kurs USD→IDR tidak lagi ditanam di kode, melainkan ditarik dari sumber resminya lewat **Pengaturan → AI — DeepSeek → Kelola tarif AI**. Kalkulator biaya kini membedakan tiga pos biaya (cache hit · cache miss · output) dan dua periode (peak/off-peak; jendela jamnya dibaca dari kalimat halaman resmi, bukan ditanam), dan kurs cadangan naik **Rp16.000 → Rp18.031** mengikuti kurs pasar 2026-10-18 (Frankfurter/ECB 18.031 · exchangerate-api 18.014,6) sehingga **taksiran rupiah ke depan naik ~12,7%**; entri biaya yang **sudah** tercatat tidak dihitung ulang. Yang **belum** ditutup dan tidak boleh diklaim selesai: jalur **"Terapkan angka baru"** belum pernah dieksekusi di browser (dev tidak punya `/api`), `npm run e2e` penuh tidak dijalankan pada rilis ini, libur nasional Tiongkok belum dikecualikan (taksiran memakai tarif peak pada hari libur itu — terlalu tinggi, bukan terlalu rendah), dan `aiClient` masih belum membaca `usage` nyata sehingga seluruh angka biaya tetap perkiraan.
> **Sebelumnya, 2026-10-15** (sesudah **v1.109.0**) — dan putaran ini **tidak mengubah kode**: yang dikerjakan hanya menyelaraskan status butir antara bagian 3/4 dan daftar periksa manual (§5), karena lima butir yang penutupannya sudah lama tercatat di dokumen ini belum pernah ikut ditandai di baris checklist-nya. Dua rilis pada hari yang sama: **v1.107.0** menutup temuan bahwa bahan yang dikirim ke AI jauh lebih besar dari perkiraan sekaligus menemukan **narasi sesi tidak pernah ikut ke laporan**; **v1.108.0** menutup **D9** (memperbaiki durasi sesi tidak boleh menghapus nominal manual tutor) dan **D10** (`webServer` `playwright.config.ts` boleh diperbaiki — bentuk lamanya tidak pernah bisa jalan karena npm menelan `--port`, sehingga `npm run e2e` selalu 404). Sebelumnya v1.106.0 titik rilis resmi, v1.105.0 perkuat AI per bagian, dan v1.104.0 empat perbaikan dari pemeriksaan pemilik. Satu keadaan yang tetap berlaku: jangan menaikkan nomor versi untuk perubahan yang **sudah** ada di versi sebelumnya — `ChangelogModal` membandingkan `localStorage` dengan versi aplikasi, jadi setiap kenaikan memunculkannya lagi di perangkat pemilik (antara v1.101.0–v1.105.0 itu terjadi lima kali berturut-turut tanpa kabar berarti).
> **Sebelumnya, 2026-10-14:** putaran **verifikasi ke kode** atas seluruh butir pekerjaan terbuka, lalu dua rilis: **v1.102.0** dan **v1.103.0**. Termasuk baris yang sebelumnya **salah**: "38 butir" daftar periksa manual, "dua puluh dari tujuh puluh delapan pasangan katalog", alat ukur `.design-audit/topic-coverage-audit.mjs` yang tidak ada, dan baris `Settings.tsx`/`CaptureSession.tsx` yang basi. **v1.103.0 menutup keputusan D2** — `markSessionDone` tidak pernah memeriksa `costOverride`, sehingga nominal manual yang diisi tutor pada sesi terjadwal hilang tepat saat sesinya dicatat. **Tiga butir yang dokumen ini dan `PEKERJAAN.md` tulis "selesai" ternyata belum terpasang** (G3-01 butir 9, syarat riwayat AI di G3-04, dan perbaikan sandi backup yang dikomit tanpa nomor versi) — lihat §4.11 dan §4.12.
> **Sebelumnya, 2026-10-11:** G3-10 butir 3 (ajakan memasang PIN baru sesudah reset total, rilis **v1.101.0**; **koreksi penting** — butir 1, 2, dan 4 G3-10 ternyata sudah ada sejak G3-09 dan dokumen sempat menulis tugas itu "belum"). Ditambah G3-09 Pengaturan: `Settings.tsx` 1.387 → 637 baris, seluruh bagian besar jadi berkasnya sendiri, enam dialog bawaan peramban digantikan dialog internal, **tombol "Perbarui" PWA yang tidak berfungsi diperbaiki**, dan **gate `e2e:uiux` hijau 64/0**.
> **Yang mengikat tetap `ATURAN-AI.md` dan `PEKERJAAN.md`.** Berkas ini hanya menjelaskan keadaan dan temuan, bukan aturan.

---

## 1. Urutan baca untuk sesi baru

1. `docs/kerja/ATURAN-AI.md`. Isinya aturan kerja, keputusan final pemilik, daftar berkas yang dilarang disentuh, perintah yang dipakai, dan jebakan yang sudah pernah memakan waktu.
2. `docs/kerja/PEKERJAAN.md`. Satu-satunya daftar pekerjaan, lengkap dengan spesifikasi kesepuluh tugas Gelombang 3.
3. Berkas ini, bagian 3 dan 4, untuk keadaan dan temuan yang tidak ada di dua berkas di atas.
4. `docs/kerja/PROMPT-SESI-BERIKUTNYA.md` — **titik masuk untuk sesi DSH baru.** Isinya salinan yang
   bisa langsung disalin sebagai pesan pertama: keadaan terukur, perintah gate beserta cara
   menjalankannya di sandbox, urutan enam tugas sisa Gelombang 3, jebakan terverifikasi, larangan,
   dan dua izin yang diberikan pemilik 2026-10-07 (mencentang daftar periksa manual, dan push ke `main`).
5. Dokumen tugas `TASK-01` sampai `TASK-11` hanya dibuka kalau perlu detail cara kerja sebuah tugas lama. Sebagian besar sudah selesai dan disimpan sebagai rujukan.

---

## 2. Keadaan repository

Periksa sendiri, jangan percaya tulisan di sini, karena keadaan berubah setiap commit.

| Hal | Cara memeriksa |
|---|---|
| Versi aplikasi | `node -p "require('./package.json').version"` |
| Selisih dengan repo jauh | `git status -sb` dan `git rev-parse main origin/main` |
| Jumlah test | `npm run test:sandbox` |
| Baris berkas besar | `npm run measure loc` |
| Kebenaran dokumen | `npm run check:docs` |

Catatan keadaan sebagai konteks, **potret 2026-10-05** (jangan dikutip sebagai keadaan hari ini): pohon kerja bersih, cabang `main` sama dengan `origin/main`, dan suite tes lulus penuh dengan enam puluh enam berkas. Keadaan 2026-10-07 sesudah pembenahan dokumen: commit `a390852` sudah di `origin/main`, pohon bersih, suite **849 lulus / 66 berkas**. Keadaan 2026-10-08 sesudah G3-05: suite **982 lulus / 74 berkas**, `e2e:uiux` 64 lulus / 0 gagal, dan `e2e` **69 lulus / 11 gagal / 6 skip** — perincian kegagalannya ada di bagian 4.5, dan **tidak satu pun berasal dari pekerjaan yang sedang dikerjakan**. Keadaan 2026-10-11 sesudah G3-08: suite **1.242 lulus / 91 berkas**, `e2e:uiux` **63 lulus / 1 gagal** (gagal = batas waktu gerbang PIN di bawah beban; **lulus 4/4 saat dijalankan sendirian**), dan `e2e` **67 lulus / 13 gagal / 6 skip**. Dua belas dari tiga belas kegagalan `e2e` persis daftar warisan 2026-10-08 (`report-export-ratio` 3 layout × 2 project, `report-unlock` × 2, `capture-closeout-failure` × 2, `finance` × 2, semuanya galat halaman `SchemaError: DexieError` atau batas waktu di bawah beban), dan yang ketiga belas — `screenshot-katalog` "11-narasi-per-sesi" — **lulus saat dijalankan sendirian**. Tidak satu pun berasal dari G3-08. **Keadaan 2026-10-11 sesudah G3-09 tahap 2:** suite **1.363 lulus / 98 berkas**, `tsc -b` bersih, `eslint src` 0, `build` menghasilkan `dist/sw.js`, `check:docs` 0 pelanggaran, dan **`e2e:uiux` 64 lulus / 0 gagal** — dirinci di bagian 4.9 nomor 1. Versi **v1.100.0**. **Keadaan 2026-10-11 sesudah G3-10 butir 3 (v1.101.0):** `npx tsc -b` bersih, `npx eslint src` bersih (0 error, 0 warning), berkas penjaga baru 22 lulus, suite penuh dan `check:docs` dijalankan sekali di akhir putaran (angkanya di keluaran perintah, bukan di sini) — dan **`e2e:uiux` tidak dijalankan pada putaran itu**, sehingga halaman `/settings` yang berubah tidak punya penjaga tampilan di putaran tersebut. **Keadaan 2026-10-14 sesudah putaran verifikasi + v1.102.0:** `npx tsc -b` bersih · `npx eslint src` bersih · suite **1.406 lulus / 101 berkas** (0 gagal) · `check:docs` 0 pelanggaran · **`e2e:uiux` 64 lulus / 0 gagal** (5,8 menit) sesudah flake gerbang PIN-nya diperbaiki pada putaran yang sama. Versi **v1.102.0**. Angka-angka itu akan basi — yang dipakai adalah perintahnya.

> **Temuan alat 2026-10-11: gate R2 `check:docs` lulus secara hampa.** Aturan R2 memeriksa
> `versi_app:` dan `test: N` di **kepala YAML** setiap dokumen aktif, tetapi setelah pembenahan
> dokumen **tidak ada satu pun dokumen aktif yang masih punya kepala itu** — `grep "versi_app"`
> hanya menemukan berkas di `docs/arsip/`, dan berkas arsip sengaja dilewati gate. Jadi gate itu
> sekarang selalu melaporkan 0 pelanggaran untuk R2 tanpa memeriksa apa pun. **Ini bukan cacat
> pekerjaan G3-09** dan tidak diperbaiki di sini: memperbaikinya berarti menambah kepala YAML ke
> puluhan dokumen, dan itu keputusan pemilik (aturan §1 butir 4). Dicatat supaya tidak ada yang
> membaca "check:docs 0 pelanggaran" sebagai "versi dan jumlah tes di dokumen sudah benar".

**Gate di mesin ini hanya lokal.** Integrasi berkelanjutan di GitHub tidak diaktifkan dan tidak akan diaktifkan. Jangan menawarkannya lagi.

---

## 3. Yang berubah pada putaran 2026-10-05

Putaran ini bukan putaran fitur, melainkan putaran pembenahan dokumen dan keputusan.

1. **Delapan keputusan pemilik dicatat** dan langsung dimasukkan ke `ATURAN-AI.md` bagian 4.3 sebagai keputusan D1 sampai D8.
2. **Tiga butir pekerjaan Keuangan yang hilang dipulihkan** ke daftar pekerjaan. Butir itu adalah pembangun murni `financeRows` dan `financeOverview`, layar Uang menjadi satu layar dengan tiga blok, dan tabel Rekap dari delapan kolom menjadi tiga kolom. Ketiganya hanya hidup di spesifikasi arsip dan hampir dinyatakan selesai padahal belum tersentuh.
3. **Aturan kerja diubah** supaya pekerjaan tidak lagi tercicil. Aturan lama yang berbunyi satu putaran satu langkah, lapor, lalu berhenti dicabut. Sekarang satu tugas dikerjakan sampai tuntas dan dilaporkan sekali.
4. **Gate disederhanakan** dari empat tingkat menjadi dua tingkat, dan dijalankan sekali di akhir tugas, bukan setiap langkah.
5. **Aturan integritas dokumen ditambahkan.** Dokumen tidak boleh dihapus, dan penggabungan dokumen tidak boleh menghilangkan butir pekerjaan yang belum selesai.
6. **Spesifikasi kesepuluh tugas Gelombang 3 dipindahkan dari arsip ke `PEKERJAAN.md`** sekaligus, tidak lagi bertahap.
7. **Kebijakan emoji dilonggarkan.** Emoji boleh dipakai kalau tampilannya bagus di HP pemilik. Penjaga yang menuntut nol emoji tidak lagi wajib.
8. **Hitungan tugas dibetulkan** menjadi tiga puluh dua tugas dengan dua puluh dua selesai.

---

## 4. Temuan yang harus dibaca sebelum bekerja

Semua di bawah ini nyata terjadi, bukan dugaan.

### 4.1 Cara memakai mesin ini

- Perintah `npm test`, `npm run test:sandbox`, dan `npm run build` gagal dengan galat `spawn EPERM` karena sandbox melarang pipa keluaran antarproses. **Cara yang terbukti jalan (diuji 2026-10-07):** pakai shim yang sudah ada di repo, `.dsh-vitest-shim.cjs` di akar folder induk, dengan `NODE_OPTIONS` berjalur **relatif**, di dalam satu pemanggilan PowerShell: `$env:NODE_OPTIONS = "--require=../.dsh-vitest-shim.cjs"` lalu `npm run test:sandbox`. Jangan memakai jalur absolut Windows — `NODE_OPTIONS` memakan garis miring terbalik dan gagal dengan `Cannot find module 'C:Userslieml…'`. Membuat shim baru di folder sementara sudah tidak perlu.
- Perintah `npm run e2e`, `npm run e2e:uiux`, dan `git push` butuh izin sandbox penuh dan tidak bisa disiasati.
- Keluaran PowerShell bisa menampilkan teks beraksen sebagai karakter rusak. Untuk menilai kerusakan berkas, ukur byte-nya.
- `git commit` kadang mencetak sukses lalu keluar dengan kode satu. Commit-nya berhasil. Buktikan dari riwayat, jangan mengulang commit.
- `npm run e2e` menulis ulang berkas gambar tangkapan layar yang ikut dilacak git. Setelah selesai, pulihkan berkas itu supaya tidak ikut terkirim.

### 4.2 Batas kejujuran yang tidak boleh diklaim beres

1. **Panel Kelola sesi belum pernah diklik oleh mesin maupun manusia.** Berkas test yang hijau hanya membuktikan Beranda masih dirender, bukan bahwa keenam aksinya bekerja.
2. **Tiga hal baru di layar tagihan belum pernah dilihat mata.** ~~Semuanya punya test murni, tetapi test murni tidak membuktikan tampilannya.~~ **DITUTUP 2026-10-07:** ketiganya dilihat pemilik di perangkat — kotak `Cari murid` beserta hasil pencariannya, badge **"Terlambat N hari"** beserta tanggal jatuh tempo berbahasa Indonesia, dan tombol `Filter lanjutan`.
3. **Panel filter lanjutan belum pernah diklik mesin maupun manusia.** ~~Tidak ada satu pun test tampilan yang menyentuh tombol dan chip itu.~~ **DITUTUP 2026-10-07:** pemilik sudah mengkliknya, **dan** sub-layar tagihan sudah masuk cakupan `e2e:uiux` lewat entri `keuangan-tagihan` — jadi panel itu kini punya bukti mata sekaligus jaring pengaman otomatis. Nomor bagian di daftar ini sengaja tidak digeser supaya rujukan nomor yang sudah ada di dokumen lain tetap sah.
4. **Katalog topik IB disusun agen mengikuti kerangka silabus, belum dibandingkan dengan panduan resmi.** Keputusan D5 meminta ini diperiksa sungguh-sungguh. Selama belum diperiksa, jangan menyebutnya terverifikasi.
5. **Satu test tampilan pernah merah di bawah beban kerja tinggi** dengan pesan data pembayaran tidak ditemukan, padahal lulus saat dijalankan sendirian dan lulus empat dari empat saat diulang. Gejalanya sudah teridentifikasi, penyebabnya belum diperbaiki. Keputusan D8 meminta ini diperkuat.
6. **Dua alias mapel Nasional menunjuk katalog kurikulum lain.** Mapel Informatika dan Penjaskes memakai katalog ilmu komputer tingkat internasional. Sudah masuk daftar pekerjaan lewat keputusan D3.
7. **Lima puluh dua kontrol lebih kecil dari empat puluh empat piksel** adalah pengecualian tertulis yang sudah diputuskan. Jangan diperbaiki tanpa keputusan baru.
8. **Perhitungan biaya saat sesi ditutup mengabaikan nominal manual.** Nominal manual yang pernah diisi tutor pada sesi terjadwal bisa tertimpa. Keputusan D2 meminta ini dibetulkan. Rinciannya ada di [`PEKERJAAN.md`](PEKERJAAN.md) bagian 4 dan di `TASK-06` riwayat 2026-10-05.

### 4.3 Pelajaran dari kesalahan pembersihan dokumen

Saat dokumen dirapikan, isi diringkas sampai butir pekerjaan yang belum selesai ikut hilang. Contoh yang terbukti adalah tiga butir pekerjaan Keuangan yang hanya hidup di spesifikasi arsip. Riwayat git menunjukkan hanya dua berkas dokumen yang benar-benar dihapus sepanjang umur repository, yaitu `TODO.md` dan `.design-sync/NOTES.md`, jadi masalahnya bukan penghapusan berkas, melainkan penggabungan yang tidak melacak isinya.

Aturan pencegahannya sudah masuk `ATURAN-AI.md` bagian 2: dokumen tidak dihapus, pemindahan dicatat di peta pemindahan di `docs/arsip/README.md`, dan penggabungan tidak boleh menghilangkan butir yang belum selesai.

---

### 4.4 Yang berubah pada putaran 2026-10-07 (G3-02 butir 1–3)

Tiga butir Keuangan yang dipulihkan lewat keputusan D1 sudah dikerjakan. Yang perlu diketahui sesi berikutnya:

1. **Pembangun murni sudah ada.** `src/lib/financeRows.ts` dan `src/lib/financeOverview.ts`, keduanya tanpa impor Dexie.
   Angka uang di layar Uang sekarang berasal dari satu sumber aturan, bukan dari perhitungan ulang di tiap blok.
   Tanggal acuan bisa ditimpa lewat opsi `hariIni` — dipakai tes supaya hasilnya tidak bergantung jam mesin.
2. **Layar Uang sekarang satu layar dengan tiga blok tetap.** Empat tab lamanya **tidak dihapus**, tetapi menjadi
   sub-layar di `?tab=ringkasan|tagihan|pengeluaran|rekap`. Konsekuensi yang perlu diingat: **pemilih sub-layar
   hanya muncul setelah sebuah sub-layar terbuka**, jadi tidak ada lagi cara melompat dari Tagihan langsung ke
   Rekap. Ini dicatat sebagai pekerjaan tersendiri di `PEKERJAAN.md` bagian 4, bukan dibiarkan tanpa jejak.
3. **Tabel Rekap tahunan sudah tiga kolom.** Tabel penuh delapan kolom tetap ada di balik tombol `Lihat lengkap ▸`.
   Blok penulisan CSV tidak disentuh, jadi berkas CSV tetap sama persis.

**Batas kejujuran baru yang harus dibaca sebelum mengklaim butir ini beres:**

- Layar tiga blok dan tabel Rekap tiga kolom **sudah dilihat pemilik di perangkat pada 2026-10-07** dan dinilai
  cukup ("cukup oke"). Perlu dicatat apa adanya: daftar periksa manual **belum punya butir untuk layar Uang** saat
  pemeriksaan itu dilakukan — butir 1–23 semuanya menulis "tab", padahal layar Uang sudah menjadi satu layar tiga
  blok — sehingga persetujuan itu keluar dari percakapan, **bukan** dari butir daftar periksa. Dua butir baru
  (24 dan 25) ditambahkan 2026-10-07 supaya tampilan ini punya butirnya sendiri; centangnya tetap milik pemilik.
  Tiga hal di sub-layar Tagihan (pencarian murid, badge keterlambatan + nama hari Indonesia, dan panel filter
  lanjutan beserta chipnya) juga sudah dilihat pemilik pada hari yang sama — itulah yang menutup butir 4.2 nomor 2
  dan 3. Yang sudah terbukti mesin: `e2e:uiux` **64 lulus / 0 gagal** dan `e2e` 75 lulus / 6 skip, jadi kontras,
  ukuran kontrol, struktur heading, dan alur keuangan juga terbukti otomatis.
- Cakupan penjaga sudah diperluas sesuai keputusan D4: `e2e:uiux` kini mengukur `/payments` polos (tiga blok)
  **dan** sub-layar `?tab=tagihan`. Sebelum 2026-10-07 entri keuangan menunjuk `?tab=ringkasan` saja, sehingga
  tampilan utama tidak pernah diukur dan panel filter lanjutan di sub-layar tagihan tumbuh tanpa jaring pengaman.
- **Tiga temuan penjaga yang langsung muncul dari perluasan itu, semuanya sudah diperbaiki lalu diverifikasi
  ulang:** kontras nomor halaman pada lembar PDF tersembunyi (2,54:1) dan badge "Belum dibayar" (2,86:1) di
  `InvoicePdfPages.tsx`, serta tombol "+ Tagihan Manual" yang terukur 348×20 px di `ManualInvoiceForm.tsx`.
  Ketiganya pra-eksisting, bukan akibat pekerjaan ini — hanya saja belum pernah terukur karena belum ada yang
  menjaga layar itu.
- Satu tautan "Rekap tahunan" **sebaris** di blok 3 terukur 84×16 px dan gagal ambang kontrol. Tautannya dihapus
  dari kalimat karena blok itu sudah punya baris pintasan "Rekap tahunan" sendiri; kalimatnya tetap, tanpa tautan.
- **Satu regresi yang sempat saya buat dan sudah diperbaiki:** `e2e/finance.spec.ts` membuka `/payments` polos
  dan memeriksa kartu `Uang masuk · …` serta membuka "Analitik lanjutan" — keduanya kini hidup di sub-layar,
  jadi test itu merah sampai alurnya disesuaikan. Pelajarannya: test alur yang menyentuh sebuah layar **wajib
  dijalankan pada putaran yang sama** dengan perubahan layar itu, bukan ditunda.
- Flake beban-tinggi yang sudah terdokumentasi masih ada dan **bukan** milik pekerjaan ini:
  `report-export.spec.ts:85` dan `screenshot-katalog.spec.ts:139` gagal saat suite penuh berjalan paralel,
  tetapi **lulus di HEAD tanpa perubahan apa pun** dan lulus saat dijalankan sendirian. Itu hasil pengukuran
  (diuji 2026-10-07 memakai `git stash`), bukan dugaan.
- Blok 1 "Ringkasan AI" **belum memanggil AI**. Ia memakai padanan lokal (`ringkasLokal` + `sorotan`) dan
  menyatakannya di layar. Jalur `AiCostModal` masih hidup di sub-layar analitik. Memindahkannya ke dalam blok 1
  menunggu G3-04, karena aturannya satu jalur `useAiAction`.

---

### 4.5 Yang berubah pada putaran 2026-10-08 (G3-05 Laporan bulanan)

G3-05 tuntas: refactor terbatas **2.361 → 1.470 baris** (target ≤1.500) ditambah 11 butir fitur. Yang perlu diketahui sesi berikutnya:

1. **Halaman Laporan sekarang tersusun dari blok-blok di `src/screens/monthlyReport/`.** `ReportActionBar` (bilah aksi tetap + penunjuk lima langkah) · `ReportScopeControls` · `ReportStatusPanel` · `ReportPreviewPanel` · `DesignToolbar` + `ScaledPreview` · `ReportNarrativePanel` + `useNarrativeAutosave` · `ReportTextsPanel` + `EditableText` · `ReportPlanPanel` · `ReportHistoryPanel` · `ReportAiResultPanel` · `ReportMessageBanner`, ditambah dua modul murni `reportAvailability.ts` (aturan ketersediaan periode) dan `aiFieldMarks.ts` (penanda isian buatan AI), serta `useReportData.ts` (penyusun `ReportData`).
2. **Tombol "Buat/Update Laporan" sekarang SELALU ada di bilah tetap, dan nonaktif bila periodenya belum bisa direkap.** Ini mematahkan pola lama pada enam spec Playwright yang memakai *keberadaan* tombol itu sebagai penanda "murid ini punya sesi di bulan itu". Semuanya sudah diperbarui menjadi memeriksa tombolnya **aktif** (`await expect(...).toBeEnabled({ timeout })`).
3. **Tiga field baru di tipe data, tanpa menaikkan versi skema Dexie** (semuanya opsional dan tidak diindeks): `MonthlyReport.entriesPerPage`, `MonthlyReport.lastExportedAt` + `MonthlyReport.sharedAt` + `MonthlyReport.aiFieldHashes`, dan `Session.aiNarrativeTextHash`. Laporan lama tetap terbaca; yang tidak punya field itu hanya kehilangan penanda/keadaan barunya.
4. **Ekspor tidak lagi menandai laporan "sudah dibagikan".** `useReportExport` menulis `lastExportedAt`; pernyataan "sudah dibagikan" tetap tindakan eksplisit tutor (`sharedAt`, dan `pdfGeneratedAt` untuk kompatibilitas). Akibat yang terlihat: laporan yang sudah diekspor **tetap muncul** di antrean "belum dibagikan" di Keuangan sampai tombolnya ditekan. Itu perubahan perilaku yang disengaja (butir 3 G3-05 meminta istilahnya dipisah) dan sudah masuk daftar periksa pemilik sebagai butir 28.
5. **`updateSession` tetap tidak menyentuh uang saat narasi disimpan otomatis.** Diperiksa di `sessionRepo.ts:245-303`: `cost`/`rateSnapshot` hanya ditulis ulang bila patch memuat `durationHours`, `costOverride`, atau `studentId` — penyimpanan narasi tidak memuat satu pun.

**Batas kejujuran baru yang harus dibaca sebelum mengklaim G3-05 beres:**

- **Tampilan barunya sudah dilihat mata pemilik — batas ini DITUTUP 2026-10-08.** Pemilik memeriksa layar Laporan di perangkat dan menilai **"sudah sangat oke"**, sehingga butir daftar periksa manual **26–29** dicentang pada hari yang sama (bukti: pernyataan pemilik sesudah keempat butir dibacakan, bukan pengukuran per butir). Butir 28 memuat pertanyaan preferensi soal ekspor yang tidak lagi menandai "sudah dibagikan"; persetujuannya keluar dari percakapan, bukan dari jawaban khusus atas pertanyaan itu — kalau pemilik menghendaki perilaku lama, itu satu baris di `useReportExport.ts`.
- **Yang sudah terbukti mesin:** `e2e:uiux` **64 lulus / 0 gagal** (termasuk layar Laporan: kontras, ukuran kontrol, struktur heading, emoji), dan spec `report-export.spec.ts` + `report-ratio-fixed.spec.ts` **lulus penuh** — artinya membuat laporan, merender pratinjau, dan mengekspor JPG/PDF masih bekerja sesudah pratinjau diberi pembesaran.
- **Gate `e2e` tidak hijau di mesin ini, dan itu bukan akibat pekerjaan ini.** Terukur 2026-10-08: **69 lulus / 11 gagal / 6 skip**. Perinciannya: 8 kegagalan (`report-export-ratio` 3 layout × 2 project dan `report-unlock` × 2) **dibuktikan gagal identik di HEAD tanpa perubahan apa pun** (diuji `git stash`), semuanya berupa galat halaman `SchemaError: DexieError`; 2 kegagalan (`capture-closeout-failure` × 2) juga gagal saat dijalankan sendirian **dan di HEAD**, dengan galat halaman `DexieError` yang sama; 1 kegagalan (`screenshot-katalog` 11-narasi-per-sesi) **lulus saat dijalankan sendirian** sehingga masuk kategori flake beban-tinggi. Pekerjaan penyelidikannya dicatat di `PEKERJAAN.md` bagian 4.
- **Katalog tangkapan layar yang dilacak git sudah tidak cocok dengan yang dihasilkan spec** (19 PNG baru tak terlacak; yang terlacak masih memuat nama dari struktur tab lama dan folder project `mobile-dark` yang sudah dihapus). Setelah tiap `npm run e2e`, berkas PNG terlacak dipulihkan dengan `git checkout -- e2e/screenshots/` dan PNG tak terlacak yang baru muncul dihapus — itu yang dilakukan putaran ini. Merapikan set terlacaknya sendiri dicatat sebagai pekerjaan tersendiri di `PEKERJAAN.md` bagian 4, menunggu keputusan pemilik.
- **Kesalahan alat yang terulang, dan kali ini tidak tertangkap penjaga otomatis.** Saya menulis ulang `MonthlyReport.tsx` memakai `Set-Content` PowerShell; PowerShell membaca UTF-8 sebagai ANSI sehingga 35 titik em dash, tanda kutip, dan centang berubah menjadi teks rusak (persis jebakan `ATURAN-AI` §7, sama seperti `Payments.tsx` 2026-10-07). Kerusakannya di dalam string sehingga penjaga mojibake tidak melihatnya; yang memunculkannya adalah peringatan git soal CRLF. Pemulihannya: membalik pemetaan CP1252 → UTF-8 (0 karakter pengganti), menormalkan akhir baris ke LF, lalu memverifikasi byte — bukan menilai dari tampilan konsol. **Pelajaran untuk sesi berikutnya: jangan pernah menyentuh berkas ber-UTF-8 dengan `Get-Content` + `Set-Content`; pakai alat edit, atau `ReadAllText`/`WriteAllText` dengan `UTF8Encoding($false)` dan jalur absolut.**

---

### 4.6 Yang berubah pada putaran 2026-10-10 (G3-06 Murid)

G3-06 tuntas: `StudentDetail.tsx` **1.097 → 678 baris** (target ≤800), peta tab Ringkas/Sesi/Progres/Proyek, dan 14 butir. Yang perlu diketahui sesi berikutnya:

1. **Tiga butir terakhir dikerjakan pada putaran ini** — #12 pengurutan + penyaringan daftar murid lewat modul murni baru `src/lib/studentList.ts`, #13 kartu murid dipotong menjadi tiga baris (label pendek kurikulum + "aktif sejak bulan tahun"), #14 urutan kelompok formulir murid dan bagian Siklus Tagihan yang terlipat saat menambah murid baru. Butir #1–#11 dikerjakan 2026-10-09/10 di commit `63dc7e9`…`1f03e21`.
2. **Penyimpangan yang sudah disetujui pemilik pada butir #10:** pola halaman (Sebelumnya/Berikutnya) **dipertahankan**, bukan diganti tombol "muat 20 lagi" — jawaban K5 pemilik 2026-10-09. Yang wajib diperbaiki di butir itu, kontrol bersarang di `RiwayatSesi.tsx`, sudah dihapus (`e1106dd`).
3. **Pemotongan `StudentDetail.tsx` ditempuh lewat ekstraksi modal, bukan pemecahan per tab.** `docs/mockups/RENCANA-G3-06.md` §3 mengusulkan `RingkasTab.tsx`/`SesiTab.tsx`/`ProgresTab.tsx`/`ProyekTab.tsx`; itu **tidak** dikerjakan karena target ≤800 sudah tercapai dan memecah tabpanel akan menambah berkas tanpa manfaat terukur. Jangan mengutip §3 sebagai keadaan hari ini.
4. **Satu bug nyata ditemukan penjaga tampilan, bukan oleh penalaran.** `useState` untuk menu aksi di `StudentDetail.tsx` diletakkan **setelah** gerbang `!student`, sehingga render pertama menjalankan hook yang lebih sedikit daripada render kedua: React melempar *"Rendered more hooks than during the previous render"* dan seluruh layar Detail Murid jatuh ke batas galat. Bug ini sudah ada sejak butir #11 (`1f03e21`) dan **lolos dari `tsc` maupun suite tes** — yang menangkapnya `npm run e2e:uiux` (gejalanya muncul sebagai "layar tanpa h1", karena yang terukur panel galat). Diperbaiki 2026-10-10 dengan memindahkan state itu ke atas bersama state lain. **Pelajaran:** jalankan `npx eslint src` sebelum menutup tugas; aturan `react-hooks/rules-of-hooks`-lah yang menunjuk barisnya, bukan tipe maupun tes.
5. **`react-refresh/only-export-components` juga merah** di `studentDetail/PerbandinganNilai.tsx` karena berkas itu mengekspor komponen **dan** fungsi biasa; aturan barisnya dipindah ke `studentDetail/perbandinganNilaiRows.ts`. Jebakan penamaan yang ditemukan saat itu: di Windows `.ts` menutupi `.tsx` yang berbeda hanya besar-kecil huruf, jadi modul itu **tidak boleh** dinamai `perbandinganNilai.ts` — impor `./PerbandinganNilai` dari `NilaiRapor.tsx` langsung gagal dengan TS1192.
6. **Batas kejujuran — DITUTUP 2026-10-10.** Seluruh tampilan tab Murid yang baru — kartu Perlu Tindakan, blok uang, tabel Prediksi vs Nilai Akhir, isian nilai rapor, dan tab Proyek untuk murid non-IB — beserta tiga butir terakhir sudah **diperiksa pemilik di HP** dan dinilai sesuai rencana, sehingga butir daftar periksa manual **30–33 dicentang** pada hari yang sama. Catatan apa adanya yang harus dibaca bersama centang itu: buktinya **satu pernyataan pemilik** untuk keempat butir (bukan tangkapan layar, bukan pengukuran per butir — sama kelasnya dengan butir 24–29), dan **butir 1–23 masih terbuka**. Panduan pemeriksaan yang dipakai ada di [`PANDUAN-CEK-DI-HP.md`](PANDUAN-CEK-DI-HP.md).

### 4.7 Yang berubah pada putaran 2026-10-11 (G3-07 Foto murid)

G3-07 tuntas. Empat berkas baru, lima berkas disentuh, 28 tes penjaga baru. Yang perlu diketahui sesi berikutnya:

1. **Foto murid akhirnya benar-benar dipakai.** Kolom `photo` sudah ada di `db/types.ts` dan sudah ikut berkas backup sejak lama, tetapi belum pernah ditampilkan. Sekarang: `StudentPhotoField.tsx` (unggah + hapus di formulir), `StudentAvatar.tsx` (foto bulat kalau ada, inisial berwarna kalau tidak), `useBlobUrl.ts` (satu-satunya tempat URL blob dibuat dan dilepas), dan `studentPhoto.ts` (aturan murni inisial).
2. **Enam keputusan pemilik 2026-10-11 yang mengikat pekerjaan berikutnya.** (a) Pemotongan bulat **hanya lewat CSS** — isi blob tidak pernah dipotong, supaya berkas backup tidak kehilangan bagian gambar; (b) tombol **Hapus foto baru berlaku saat Simpan** (Batal tetap berarti "tidak ada yang berubah"); (c) pemilih foto jadi berkas komponen sendiri, bukan ditambahkan ke `StudentForm.tsx`; (d) sasaran baris `StudentDetail.tsx` yang berlaku **≤700**, bukan ≤800; (e) batas 150 KB diperlakukan sebagai **sasaran yang diukur**, bukan jaminan yang diklaim di antarmuka; (f) lingkup putaran hanya G3-07.
3. **`StudentDetail.tsx` sekarang 698 baris — hanya 2 baris di bawah sasarannya.** Penambahan apa pun di berkas itu harus lewat komponen terpisah. Ini bukan preferensi gaya: keputusan pemilik memilih ≤700, dan berkas itu sudah menyentuh langit-langitnya.
4. **Angka dari pengukuran foto, dan kenapa antarmukanya tidak menjanjikan 150 KB.** Diukur di Chromium sungguhan (`.design-audit/g3-07/measure.mjs` + `ukur.html`, memakai pustaka `browser-image-compression` yang sama dengan aplikasi dan parameter yang sama dengan `compressPhoto()`): sumber 3.000×4.000 px 22,3 MB → **102,9 KB / 480×640 px**; sumber 3.000×4.000 px 0,45 MB → **20,1 KB / 480×640 px**. Perhatikan **480×640**, bukan 640×853: `maxSizeMB` menekan mutu lebih dulu, sehingga jumlah piksel hasilnya ikut turun. Karena itu kalimat antarmuka menyebut batas piksel yang benar-benar dijamin mesin, lalu menyebut kisaran ukuran hasilnya.
5. **Temuan sampingan yang dicatat, belum diputuskan:** `useWebWorker: true` membuat pengecilan **3.270 ms**, sedangkan tanpa web worker **325 ms**, dengan hasil **identik byte-per-byte**. Berlaku untuk `compressPhoto()`, yang dipakai juga oleh foto sesi dan logo. Alat ukurnya tinggal dipakai; keputusannya belum diambil karena menyentuh tiga jalur sekaligus dan berada di luar lingkup G3-07.
6. **Satu kesalahan saya di ronde ini, supaya tidak terulang.** Penjaga pertama untuk foto mencocokkan jumlah `createObjectURL` dengan `revokeObjectURL` per berkas dan **salah menuduh kode yang benar di tujuh berkas**: `useBlobUrl.ts` memasang URL di dalam `try` dan melepasnya lewat cleanup `useEffect` di baris lain; `foto.ts` membuat **satu** URL dan melepasnya di **dua** jalur (sukses dan `onerror`). Penjaga itu dibuang dan diganti pengujian runtime pada hook + invarian struktural. **Pelajaran:** pemasangan/pelepasan yang dipisah fungsi tidak bisa diperiksa dengan menghitung baris; kalau sebuah invarian tidak bisa diuji runtime, lebih baik diuji di peramban (`e2e:uiux`) daripada ditebak dari teks sumber.

7. **`e2e` masih tidak hijau, dan perinciannya harus dibaca sebelum ada yang mengklaim sebaliknya.** Terukur 2026-10-11, **dua kali run dengan hasil sama**: **68 lulus / 12 gagal / 6 skip**. Dua belas kegagalannya:
   - `e2e/report-export-ratio.spec.ts` — 3 layout × 2 project = **6**, semuanya `SchemaError: DexieError`;
   - `e2e/report-unlock.spec.ts` — × 2 = **2**, `DexieError`;
   - `e2e/capture-closeout-failure.spec.ts` — × 2 = **2**, `DexieError`;
   - `e2e/billing-session-count.runtime.spec.ts` — **1** (chromium), batas waktu klik;
   - `e2e/finance.spec.ts` — **1** (chromium), `locator.click` batas waktu 60 detik di bawah beban (kedua project berjalan bersamaan).

   Sepuluh yang pertama persis daftar warisan 2026-10-08. Dua yang terakhir **berbeda antar-run** — pada 2026-10-08 yang muncul `screenshot-katalog` "11-narasi-per-sesi" (lulus sendirian), pada 2026-10-11 yang muncul `finance` dan `billing-session-count.runtime`. Keduanya spec yang menyentuh **layar Keuangan**, dan **tidak satu pun berkas yang disentuh G3-07 dipakai spec itu**. `e2e/finance.spec.ts` sudah **dijalankan sendirian dan lulus 2/2** (15,5 detik), jadi penyebabnya beban mesin, bukan regresi. **Jangan mengklaim "e2e hijau" tanpa perincian ini**, dan jangan mengklaim G3-07 menyebabkan atau memperbaiki salah satunya.

### 4.8 Yang berubah pada putaran 2026-10-11 (G3-08 Kanvas dan istilah)

G3-08 tuntas dalam satu putaran: enam langkah sekaligus. Tiga berkas murni baru, tiga berkas komponen baru, 16 tes penjaga, dan satu cacat yang hanya bisa ditemukan mata. Yang perlu diketahui sesi berikutnya:

1. **Jumlah pilihan TIDAK berkurang, dan itu dijaga dari sumbernya.** 34 tema dan 26 susunan tetap utuh; batas bawahnya dijaga `reportDesignPanel.test.ts` dengan membaca `THEMES.length` dan `LAYOUTS.length`, bukan angka yang diketik di dokumen. Kalau kelak ada tema atau susunan yang dihapus, tes itu merah — dan itu memang tujuannya.
2. **Tiga berkas murni baru, semuanya tanpa DOM dan tanpa Dexie:** `src/screens/monthlyReport/susunanLaporan.ts` (kelompok susunan dari metadata `supportsLongNarrative` + `recommendedPhotoCount`, hitungan, ringkasan susunan terpilih), `src/components/charts/grafikAngka.ts` (`formatRupiahRingkas` · `perkiraanLebarTeks` · `jarakKiriGrafik`), dan `kartuIdentitasLengkap()` di `src/lib/studentList.ts`.
3. **Dua chip di bilah desain laporan sekarang terpisah** — `Tema` (`SparkleIcon`, panel `#panel-tema-laporan`) dan `Susunan` (`ChecklistIcon`, panel `#panel-susunan-laporan`) — dengan keadaan buka yang juga terpisah. Prop `previewLayoutId`/`onPreviewLayout` **dihapus** dari `DesignToolbar`; pratinjau selalu menampilkan susunan yang sedang dipakai, lewat satu tombol "Pratinjau susunan terpilih".
4. **Chip susunan berubah PERAN, bukan hanya nama.** Ia kini `role="radio"` di dalam `radiogroup`, sehingga `getByRole("button", …)` tidak akan pernah menemukannya lagi. Dua spec e2e sudah disesuaikan (`e2e/layout-review.spec.ts`, `e2e/report-export-ratio.spec.ts`). **Kalau kelak ada spec baru yang menyentuh pemilih susunan, pakai peran radio.**
5. **Glosarium antarmuka yang berlaku sekarang:** tagihan (objek) · invoice (dokumen saja) · belum dibayar (menggantikan "piutang" di antarmuka) · umur tagihan · kata sandi enkripsi (menggantikan "passphrase") · fokus rata-rata (menggantikan "rata-rata engagement"). **Nama variabel dan kolom data TIDAK diubah** (`cash.piutang`, `r.piutang`, `agedPiutang`, `piutangDetail` tetap) dan **isi CSV tidak disentuh** karena formatnya dibekukan `csv.test.ts`; yang berubah hanya teks yang dibaca tutor.
6. **Satu cacat milik pekerjaan ini, dan cara menemukannya yang penting.** Perhitungan jarak kiri `LineChart` semula diletakkan sebelum `yRange` dideklarasikan, sehingga **seluruh layar Keuangan jatuh ke batas galat** (`Cannot access 'yRange' before initialization`). `npx tsc -b` lulus, seluruh suite lulus, dan `e2e:uiux` juga tidak menangkapnya karena blok grafik hidup di sub-layar `?tab=ringkasan` yang **tidak masuk cakupan penjaga**. Yang menemukannya adalah tangkapan layar di `.design-audit/g3-08/`. Ini kelas yang sama dengan bug urutan hook G3-06: **perubahan tampilan wajib dilihat, bukan hanya diuji.**
7. **Cakupan penjaga tampilan punya lubang yang baru terlihat:** `e2e:uiux` mengukur `/payments` polos dan sub-layar `?tab=tagihan`, **bukan** `?tab=ringkasan` tempat tiga grafik itu hidup. Konsekuensinya nyata: cacat urutan nomor 6 lolos dari semua penjaga otomatis. Menambahkan `?tab=ringkasan` ke cakupan adalah **penjaga baru** yang butuh keputusan pemilik (`ATURAN-AI` §1 butir 4), jadi hal ini dicatat di `PEKERJAAN.md` bagian 4, belum dikerjakan.
8. **Alat pemeriksa visual untuk putaran ini ada di `.design-audit/g3-08/`** (tidak dilacak git): `audit.config.ts` + `visual-check.spec.ts` + `shots/`. Ia menangkap layar panel tema, panel susunan, perancang tema, dan tiga blok grafik pada lebar 390 px. **Catatan pemakaian yang sudah memakan waktu:** jangan `page.goto()` lagi sesudah PIN Keuangan dibuka — keputusan B2 membuat buka-kunci berlaku selama aplikasi terbuka, dan memuat ulang mengembalikannya ke gerbang PIN.
9. **Batas kejujuran baru yang belum ditutup:** butir daftar periksa manual **36–38** ditambahkan 2026-10-11 dan **belum dicentang**. Ketiganya menyentuh hal yang tidak bisa dinilai dari kode: apakah dua chip terasa berbeda, apakah contoh warna benar-benar membantu memilih, dan apakah angka grafik terbaca di layar 390 piksel. **Butir 1–23 masih terbuka**, dan butir 34–35 (foto murid) juga masih menunggu.

---

### 4.9 Yang berubah pada putaran 2026-10-11 (G3-09 Pengaturan, tahap 1 dan 2)

Target baris **tercapai**: `src/screens/Settings.tsx` **1.387 → 576 baris** (sasaran ≤700), dan seluruh
bagian besar kini berkasnya sendiri di `src/screens/settings/`. Dua belas fitur terpasang. Yang perlu
diketahui sesi berikutnya:

1. **Gate `e2e:uiux` HIJAU: 64 lulus / 0 gagal** (3,1 menit, project `chromium` dan `mobile`, 8 layar × 4 penjaga).
   Ini menutup batas kejujuran yang sempat ditulis di putaran sebelumnya ("belum dijalankan") — dan
   cara menutupnya penting untuk dicatat: perintahnya tetap gagal `spawn EPERM` di sandbox biasa
   (`ATURAN-AI` §6 sudah menyebut gate itu butuh izin sandbox penuh), lalu **berhasil saat dijalankan
   dengan izin lebih luas**. Jadi kesimpulan putaran lalu benar (tidak bisa dari sandbox biasa) tetapi
   **belum lengkap** (masih bisa dari sesi yang sama dengan izin lebih luas).
   **Angka terukur layar `/settings`** (artefak `../.design-audit/uiux-guard/{chromium,mobile}-pengaturan.json`,
   di luar git) — sama di kedua viewport: `h1Count` 1 · `h2Count` 1 · **`contrastCount` 0** ·
   **`smallControlsCount` 0** · `emojiInControlsCount` 0 · `tinyCount` 0. `under44Count` 2 dan
   `truncCount` 1 tidak diuji ambangnya oleh penjaga (kontrol sekunder boleh 24–36 px menurut keputusan
   pemilik 4.2), jadi keduanya **bukan** pelanggaran, tetapi angkanya belum saya periksa satu per satu.
   Pemeriksa statis `.design-audit/g3-09/periksa-tampilan.mjs` tetap berguna sebagai penjaga cepat
   sebelum gate dijalankan — dan statusnya sekarang: **pelengkap, bukan pengganti.**

2. **Empat spec e2e disesuaikan, bukan dilonggarkan.** Judul bagian berubah (G3-09 butir 4:
   "Backup & Restore" → "Backup dan Restore", "Aplikasi (PWA)" → "Aplikasi") dan `confirm()` di jalur
   restore digantikan dialog internal, sehingga empat spec (`smoke`, `loading-states`,
   `screenshot-audit`, `home-exit`) serta `e2e-pwa/pwa-runtime.spec.ts` menunggu hal yang sudah tidak
   ada. Penjaganya kini **bertambat pada `data-bagian`**, bukan pada teks judul — supaya perubahan kata
   tidak mematahkannya lagi. **Yang perlu diketahui: `e2e-pwa/pwa-runtime.spec.ts` sekarang menuntut
   dialog internal "Pulihkan dari berkas ini?" beserta baris "Ukuran berkas", bukan lagi `dialog.accept()`.**

3. **Dua cacat nyata ditemukan saat memindahkan blok, bukan oleh `tsc` atau suite:**
   (a) **blok terduplikasi** di bagian Backup — baris tahap pemulihan dan dua dialog konfirmasi
   tertulis **dua kali**, sehingga aplikasi merender dua dialog dengan nama aksesibilitas identik
   (pembaca layar mengumumkannya dua kali; Playwright akan menemukan dua elemen untuk satu peran);
   (b) **`useMemo` setelah `return` bersyarat** saat `aksiBackup` pertama dipasang — aturan hook React
   dilanggar, dan **eslint** yang menangkapnya (bukan `tsc`). Keduanya sudah diperbaiki.
   Pelajarannya berulang dari G3-06 dan G3-08: **kode yang dipindah wajib dibaca ulang, bukan hanya
   dipindahkan.**

4. **Enam dialog bawaan peramban di berkas ini sudah nol** (`confirm()` ×5 + `prompt()` ×1 di `HEAD`
   2026-10-11). Dua di antaranya peringatan validasi impor, dan penggantinya bukan kosmetik:
   `onValidationWarnings` sekarang mengembalikan Promise yang baru selesai setelah tutor menekan tombol,
   sehingga **impor benar-benar tertahan** — dulu `confirm()` memblokir utas, sekarang tidak ada impor
   yang berjalan dengan asumsi.

5. **Perbaikan PWA di luar G3-09** (permintaan pemilik 2026-10-11, commit `6fac628`): tombol "Perbarui"
   tidak berfungsi karena `applyUpdate` **menelan galatnya dengan `console.warn`**. Akar penyebabnya
   di perangkat pemilik **tidak berhasil direproduksi dari sini** dan tidak diklaim; yang diperbaiki
   adalah **cara gagalnya terlihat**. Sekarang ada tombol tutup (penolakan disimpan 7 hari, dan
   **tidak** mematikan kemampuan memasang), serta jalur perbarui manual + status penyimpanan permanen
   + status siap offline di Pengaturan → Aplikasi. **Klaim "tombol Perbarui bekerja" belum punya bukti
   runtime** — hanya bukti unit (23 tes) dan build.

6. **Artefak suite diperbarui dengan angka yang benar-benar dijalankan:** `.design-audit-suite.json`
   **1.226/90 → 1.355/97**. Sebelum diperbarui, gate `check:docs` hanya bisa membandingkan dokumen
   dengan artefak yang basi — dan itu sebabnya laporan gate menampilkan angka lama.

7. **Berkas baru dan perannya.** Di `src/screens/settings/`: `Section.tsx` (akordeon + pemisah zona
   bahaya), `sections.ts` (daftar urutan bagian), `BackupSection.tsx` + `backupHandlers.ts`,
   `AiSection.tsx`, `ProfileBankSections.tsx`, `AppSection.tsx`, `SettingsSaveBar.tsx`,
   `SettingsStatusSummary.tsx`, `PinSection.tsx`, `DangerZoneSection.tsx` + `dangerZoneRows.ts` +
   `dangerZoneActions.ts`, `ConfirmActionModal.tsx`, `useBackupSection.ts`, `StorageUsage.tsx`,
   `PhotoMaintenance.tsx`, `AuditLogViewer.tsx`. Di `src/lib/`: `passphrase.ts`,
   `recoveryPresentation.ts`, `settingsStatus.ts`, `appSettingsStatus.ts`, `auditDisplay.ts`,
   `settingsSaveBar.ts`, `pwaUpdate.ts`. Di `src/hooks/`: `usePwaUpdate.ts`, `useStorageEstimate.ts`.
   Di `src/components/`: `PwaUpdateUi.tsx`. **Empat ekspor non-komponen dipisah ke berkasnya sendiri**
   (`sections.ts`, `dangerZoneRows.ts`, `dangerZoneActions.ts`, dan `sisaHariPenolakan` yang dibuang)
   karena aturan `react-refresh/only-export-components` — jebakan yang sama dengan G3-06.

8. **Batas kejujuran putaran ini.** Yang **sudah** dibuktikan: `tsc -b`, `eslint src`, suite
   **1.363 lulus / 98 berkas**, `build` (`dist/sw.js`), `check:docs` 0 pelanggaran, dan
   **`e2e:uiux` 64 lulus / 0 gagal**. Yang **belum**: `e2e` penuh dan `e2e:pwa` tidak dijalankan di
   putaran ini, tampilan Pengaturan yang baru **belum pernah dilihat mata** (yang diukur adalah angka,
   bukan penilaian), dan **butir daftar periksa manual untuk Pengaturan belum dibuat** — hanya pemilik
   yang bisa menutupnya.

9. **Dua sub-butir yang SEMPAT saya lewatkan, dan cara menemukannya patut diingat.** Di laporan
   putaran sebelumnya saya menulis "sebelas fitur terpasang", padahal dua sub-butir belum ada di layar:
   **chip "sedang memakai kata sandi tersimpan"** (butir 6) dan **pintu pemasangan manual beserta
   petunjuk iPhone** (butir 10). Modul murninya **sudah ada dan sudah dites** (`installInstructions`,
   18 tes), tetapi **tidak dipanggil siapa pun** — dan tidak ada gate yang menangkapnya, karena `tsc`
   hanya mengeluh soal impor yang tidak dipakai, bukan soal fungsi yang tidak pernah dipanggil.
   Yang menemukannya adalah **membaca ulang daftar butir di `PEKERJAAN.md` §3 lalu memeriksa satu per
   satu ke kode** (`grep installInstructions` → 0 pemakaian di `.tsx`). Pelajarannya: **"fitur
   terpasang" harus dibuktikan dengan menelusuri butirnya, bukan dengan mengingat apa yang
   dikerjakan.** Keduanya kini terpasang — chip selalu tampil (termasuk saat TIDAK tersimpan, supaya
   tutor tahu tidak ada sandi yang tertinggal), dan petunjuk pemasangan muncul per peramban dengan
   deteksi `maxTouchPoints` untuk iPadOS yang mengaku macOS.

10. **Satu batas yang diukur tetapi belum ditutup: `truncCount` 1.** Artefak penjaga mencatat **satu**
    elemen teks terpotong (`overflow: hidden` + `scrollWidth > clientWidth`) di layar `/settings` pada
    kedua viewport. Penjaga **tidak menguji** angka itu, dan keputusan pemilik 4.2 sudah menerima
    chip/kontrol sekunder 24–36 px, jadi ini **bukan pelanggaran** — tetapi **elemen mana** yang
    terpotong belum saya periksa. Teks terpotong di HP pernah memicu pekerjaan tersendiri (G3-08
    butir 6), jadi ini dicatat, belum dikerjakan. `under44Count` 2 juga tidak diuji ambangnya.

---

### 4.10 Yang berubah pada putaran 2026-10-11 (G3-10 butir 3 — ajakan PIN baru sesudah reset)

G3-10 butir 3 tuntas, rilis **v1.101.0**. Yang perlu diketahui sesi berikutnya, terutama karena
**dokumen ini sempat salah tentang G3-10**:

1. **Koreksi yang harus dibaca lebih dulu: G3-10 bukan tugas yang "belum".** Empat dari lima butirnya
   sudah ada di kode sejak G3-09, dan tidak ada gate yang pernah memberi tahu hal itu — `tsc` tidak
   mengeluh soal fitur yang tidak pernah ditulis, dan suite tidak punya tes untuknya. Yang benar-benar
   belum hanya **butir 3**. Bukti per butir ada di tabel keadaan `PEKERJAAN.md` bagian 3 (G3-10).
   **Pelajaran alatnya:** status sebuah tugas yang ditulis dari ingatan bisa salah selama berhari-hari;
   yang menemukannya adalah `grep` ke kode, bukan membaca ulang dokumen. Sebelum mengerjakan tugas yang
   ditandai "belum", periksa dulu apakah butir-butirnya sudah ada.

2. **Yang dipasang untuk butir 3.** Berkas murni baru `src/lib/pinReset.ts` dan komponen baru
   `src/components/PinResetInvite.tsx`, dirender di **`Layout`** (`App.tsx`) — bukan di Beranda, karena
   reset bisa berakhir di rute mana pun dan syaratnya berbunyi "bukan layar kosong tanpa penjelasan".
   Penandanya (`leskolui_pin_reset_pending`) hidup di **`localStorage`, bukan di tabel** — tabel
   `settings` yang memuat PIN Keuangan ikut dibersihkan reset, jadi penanda di dalamnya mustahil dibaca
   sesudahnya. Ini **kebalikan** dari `leskolui_last_auto_backup_prompt` yang justru sengaja dibuang
   supaya pengingatnya muncul lagi; jangan menyeragamkan keduanya.

3. **Ajakan itu menuntut DUA syarat** (`tampilkanAjakanPin(penandaAda, adaPin)`): penandanya ada **dan**
   PIN-nya memang belum terpasang. Karena itu penandanya dibuang di jalur **penyimpanan PIN yang
   berhasil** (`simpanPin` di `Settings.tsx`), **bukan** di tombol menuju Pengaturan — supaya tutor yang
   membuka Pengaturan lalu menutupnya tanpa menyimpan tetap melihat ajakannya.

4. **Dua sambungan kecil yang membuat ajakannya berguna, bukan sekadar ada.** (a) `Settings.tsx`
   (576 → **566** baris) membaca hash alamat `#bagian-pin` sekali saat dipasang dan membuka bagian itu;
   id bagiannya (`bagian-<id>`) memang dipasang `settings/Section.tsx`, jadi tidak ada teks yang disalin.
   (b) `PinSection.tsx` menerima prop `autoStart` yang **hanya** mengaktifkan formulir "Buat PIN" bila PIN
   belum ada — jalur "Ganti PIN" yang meminta PIN lama **tidak boleh** dilewati. Keduanya diuji lewat
   pembacaan sumber `?raw`.

5. **Klaim urutan audit DIVERIFIKASI, bukan diasumsikan.** `dangerZoneActions.ts` menulis jejak audit
   sesudah membersihkan tabel, dan itu benar karena `logAudit` (`db/repos/auditRepo.ts`) hanya menulis ke
   `db.auditLog` dan **tidak membaca `settings`**. Ia juga menelan galatnya sendiri (`console.warn`),
   sehingga kegagalan menulis jejak tidak menggagalkan reset. Jangan mengubah urutan itu tanpa memeriksa
   ulang sifat ini.

6. **Penjaga baru `src/__tests__/pinResetInvite.test.ts` (22 tes) bekerja dua lapis, dan lapis kedua yang
   penting.** Lapis pertama menguji fungsi murni dengan `Storage` palsu (termasuk penyimpanan yang
   melempar, karena mode privat tidak boleh menjatuhkan layar). Lapis kedua membaca **berkas sumber**
   (`?raw`) untuk membuktikan penanda itu benar-benar **ditulis** saat reset dan **dibaca** saat halaman
   dibuka. Tanpa lapis kedua, modul yang benar tetapi tidak dipanggil siapa pun akan tampak hijau —
   persis bagaimana butir ini bisa terlewat selama ini.

7. **Batas kejujuran putaran ini.** Yang **sudah** dibuktikan: `npx tsc -b` bersih · `npx eslint src`
   bersih (0 error, 0 warning) · berkas tes baru **22 lulus** · suite penuh beserta `check:docs`
   dijalankan sekali di akhir (angkanya ada di bagian 2). Yang **belum**: ajakan itu **belum pernah
   dilihat mata** di perangkat, dan tampilannya memang tidak bisa dibuktikan suite ini (repo tidak
   memasang jsdom, dan `renderToStaticMarkup` tidak menjalankan `useEffect` yang membuka bagian).
   `e2e:uiux` **tidak** dijalankan pada putaran ini, sehingga halaman `/settings` yang berubah tidak
   punya penjaga tampilan di putaran ini. Karena itu **butir 39** ditambahkan ke daftar periksa manual,
   dan **butir 5 G3-10** (uji memakai data contoh) ikut ditutup lewat butir yang sama.

8. **Butir 39 wajib dijalankan di server pengembangan, dan itu terbalik dari panduan HP.** Di alamat
   online tidak ada pemuat data contoh (`seedDummy` hidup di dalam `import.meta.env.DEV`), jadi
   menjalankan tombol **Hapus Semua Data** di sana akan menghapus **data asli pemilik**. Peringatan
   §0.3 di `PANDUAN-CEK-DI-HP.md` berlaku terbalik untuk butir ini.

### 4.11 Yang berubah pada putaran 2026-10-14 (verifikasi ke kode + rilis v1.102.0)

Putaran ini **bukan putaran fitur baru**: pemilik meminta seluruh butir pekerjaan terbuka diperiksa ulang ke kode, dan yang bisa ditutup ditutup supaya dokumen tidak lagi menyajikan keadaan yang tidak akurat. Hasilnya, dalam urutan kepentingannya:

1. **Tiga butir yang dokumen tulis "selesai" ternyata belum terpasang, dan sekarang sudah.** Semuanya punya pola yang sama: **statusnya ditulis dari ingatan, bukan dari `grep` ke kode.**
   - **G3-01 butir 9** berdiri "tertahan sampai G3-04 dikerjakan" sejak 2026-10-04. G3-04 tuntas 2026-10-07 sehingga penahannya hilang, tetapi **tidak ada yang pernah memeriksa apakah ketiga syaratnya ada** — dan tidak satu pun ada: tombol AI hanya berbunyi `Draft AI` tanpa angka biaya, pesan galat AI tidak punya peran aksesibilitas apa pun, dan tidak ada tombol coba lagi untuk jalur AI (yang ada hanya `Coba lagi` untuk kegagalan **simpan sesi**). Sekarang: label biaya di **kedua** tombol AI (`Draft AI · ±Rp …` di langkah 5 lewat `labelBiayaAi()` di `captureSession/helpers.ts`, dan `Poles AI · ±Rp …` di laporan sesi lewat `CloseOutSheet`), pengumuman `aria-live` + `role="alert"`, dan tombol **Coba lagi** yang mengulang panggilan lewat `useAiAction` yang sama — jadi modal biaya tetap tampil lebih dulu. Satu cacat lama yang ikut ditutup: galat "Draft AI" dulu bisa **terbawa** ke laporan sesi karena keadaannya dipakai bersama, sehingga tutor melihat pesan galat lama di tempat yang salah; sekarang dibersihkan saat laporan sesi ditutup.
   - **G3-04, syarat "riwayat panggilan AI menampilkan waktu, fitur, dan biaya"** dianggap selesai sejak 2026-10-07 padahal saat itu yang ada baru **waktunya**. Kolom `aiFeature` dan `costIdr` memang **ditulis** ke entri audit `ai.call`, tetapi **tidak dibaca satu layar pun** — jadi pertanyaan "bulan ini uangnya habis untuk apa" belum bisa dijawab dari Riwayat Aktivitas. Sekarang `auditAiDetail()` (`src/lib/auditDisplay.ts`, 6 tes) menampilkannya di `settings/AuditLogViewer.tsx`. Tiga hal yang sengaja diikat tesnya: biaya di bawah satu rupiah dibulatkan **ke atas** (ke bawah akan menghasilkan "Rp 0", angka yang berarti gratis), entri lama tanpa kolom biaya disebut **"biaya tidak tercatat"** alih-alih dikira-kira, dan biaya tidak ditampilkan untuk aksi yang bukan panggilan AI.
   - **Regresi sandi backup (commit `80af587`)** sudah diperbaiki lebih dulu pada hari yang sama, tetapi **ditinggal tanpa nomor versi** — sehingga satu-satunya cara mengetahui perbaikan itu ada adalah membuka `git log`. Sekarang dirilis sebagai **v1.102.0** (`package.json` · `CHANGELOG` di `src/lib/version.ts` · baris rilis di `RIWAYAT-RILIS.md`). Perbaikan itu sendiri menyentuh uang-nyawa data: **dua rilis terakhir tidak bisa backup manual sama sekali** karena keadaan kata sandi ikut pindah ke `BackupSection.tsx` sementara pengubahnya membaca keadaan kosong yang terkunci harfiah.

2. **Dua butir ditutup karena ternyata sudah terpenuhi — tidak ada pekerjaan tersisa.**
   - **D6.** Terukur di `.design-audit/uiux-guard/chromium-keuangan.json` + `mobile-keuangan.json`: **H1 "Keuangan" → 3×H2** tanpa lompatan level, `h1Count` 1 · `h2Count` 3. Judul induk yang diminta sudah ada; menambah satu lagi akan membuat dua H1 di satu layar.
   - **D4.** Entri `keuangan-tagihan` ada di `SCREENS` (`e2e-uiux/uiux-metrics.spec.ts:224`), dan "jejak perubahan warna/token" memang sudah dijalankan lewat riwayat 2026-10-03 (≈3.000 warna langsung → token bertema), G3-08, G3-09, dan G3-10. **Tidak ada berkas "palet terkunci" yang perlu dibuat** — keputusan pemilik berbunyi *"dicatat di bagian riwayat tugas dengan alasan dan tanggal"*, yaitu kewajiban pencatatan, bukan barang di kode.

3. **Satu baris angka yang salah, dan alat ukurnya diganti.** Baris "Katalog topik" menulis "dua puluh dari tujuh puluh delapan pasangan sudah punya katalog" dengan alat ukur `.design-audit/topic-coverage-audit.mjs` yang **tidak ada di repositori** — jadi angka itu tidak bisa direproduksi siapa pun. Alat penggantinya `src/__tests__/topicGapCount.test.ts` (selalu lulus, mencetak angkanya; **bukan** penjaga baru karena tidak menuntut ambang apa pun). Hasil 2026-10-14: **109 dari 167 pasangan punya katalog · 58 belum**. Angka 58-nya kebetulan sama dengan yang lama, tetapi **penyebutnya salah selama ini** (167, bukan 78). Rinciannya ada di `PEKERJAAN.md` §4.

4. **D3 dinilai ulang dan tidak lagi berbunyi "Belum".** Dua kasus yang paling jelas salah **sudah benar di kode**: `resolveSubjectAliases("Informatika")` → `["informatika"]` dan `("Penjaskes")` → `["penjaskes"]`, sehingga keduanya tidak lagi menarik katalog ilmu komputer tingkat internasional (dan "Penjaskes" tidak dipetakan ke PHE/SEHS). Yang tetap terbuka hanyalah peninjauan **seluruh** peta alias — dan itu belum bisa dimulai karena daftar "23 peta alias" berasal dari skrip yang sudah hilang; **angka 23 tidak boleh dikutip lagi.**

5. **Batas kejujuran putaran ini.**
   **Yang sudah dibuktikan:** `npx tsc -b` bersih · `npx eslint src` bersih · suite penuh **1.406 lulus / 101 berkas** (0 gagal) · `check:docs` 0 pelanggaran · **`e2e:uiux` dijalankan penuh: 64 lulus / 0 gagal** (5,8 menit, project chromium + mobile). Dua layar yang diubah punya artefak terukurnya dan keduanya bersih di kedua viewport: **`/capture`** — `h1` 1 · `h2` 1 · **kontras 0 pelanggaran** · kontrol <24 px 0 · emoji 0 · teks <12 px 0 · teks terpotong 0; **`/settings`** — sama, dengan `under44Count` 2 dan `truncCount` 1 yang **tidak diuji ambangnya** oleh penjaga (kontrol sekunder boleh 24–36 px menurut keputusan pemilik 4.2, dan elemen mana yang terpotong belum saya periksa satu per satu).
   **Yang belum:** tidak satu pun dari empat perubahan terlihat pada putaran ini sudah **dilihat mata pemilik** di perangkat — butir daftar periksa **40–43** ditambahkan untuk itu, dan panduan langkahnya ada di `PANDUAN-CEK-DI-HP.md` **bagian F**.

6. **Satu flake penjaga tampilan diperbaiki pada putaran ini, bukan sekadar dicatat.** Run `e2e:uiux` pertama pada 2026-10-14 menghasilkan **61 lulus / 3 gagal**, ketiganya **bukan** pada layar yang saya ubah: dua di sub-layar Tagihan dan satu di layar Keuangan, semuanya berhenti di `openPin()` dengan `element is not enabled` pada kolom PIN lalu `element was detached from the DOM`. Penyebabnya persis yang sudah dicatat sejak 2026-10-10: kolom PIN muncul sebelum PIN contoh benar-benar tersimpan, dan `pin.fill()` **memakai batas waktu test (60 detik)** sehingga satu momen "belum aktif" memakan seluruh anggaran waktu dan keenam percobaan di lingkaran itu tidak pernah benar-benar berjalan. Perbaikan: `fill()` dan `click()` di dalam lingkaran itu diberi batas **2 detik** (bukan menaikkan batas 60 detik, yang dilarang keputusan pemilik). Sesudah perbaikan, kedelapan tes "Tagihan" lulus (48,9 detik) dan **run penuh berikutnya 64 lulus / 0 gagal**, sehingga `e2e:uiux` kembali hijau untuk pertama kali sejak 2026-10-11.

### 4.12 Yang berubah pada putaran 2026-10-14 (D2 — nominal manual tidak tertimpa, v1.103.0)

Sisa terakhir yang menyentuh uang ditutup pada hari yang sama, dan cara menemukannya patut diingat karena **tidak satu pun penjaga yang ada bisa melihatnya**:

1. **Bug-nya.** `markSessionDone` (`src/db/repos/sessionRepo.ts`) menulis `cost: sessionCost(session.rateSnapshot, duration, perSession)` **tanpa pernah melihat `session.costOverride`**. Akibatnya nominal manual yang diisi tutor dari panel "Kelola sesi" pada sesi **terjadwal** hilang **tepat saat sesinya dicatat** — momen ketika angkanya mulai dipakai untuk menagih.

2. **Kenapa sulit terlihat.** `costOverride` **tetap tersimpan**; hanya kolom `cost` yang berbeda, dan **yang dibaca tagihan adalah `cost`**. Jadi layar pengaturan sesi tampak benar sementara tagihannya memakai angka lain. `updateSession` sudah punya komentar "Manual cost override takes precedence over auto-calculation" dan memang menghormatinya — yang bocor adalah jalur **penutupan** sesi, bukan jalur penyuntingan.

3. **Dibuktikan lebih dulu sebagai tes merah, baru diperbaiki.** Dengan murid **per pertemuan** (tarif flat) supaya nominal manual dan hitungan otomatisnya tidak mungkin kebetulan sama: override 175.000 → `cost` tercatat **200.000**. Tiga tes mengunci perilakunya sekarang: bertahan saat durasi ikut dikirim ke `markSessionDone`, bertahan saat durasi tidak dikirim, dan sesi **tanpa** nominal manual tetap dihitung dari tarif (perilaku lama tidak berubah).

4. **Urutan yang mengikat di kode:** nominal manual diperiksa **sebelum** hitungan otomatis, dan hanya nilai `> 0` yang dianggap override (nilai `0`/`null` berarti tutor melepasnya, dan itu tetap dihormati oleh `updateSession`).

5. **Temuan terpisah yang dicatat, belum dikerjakan: `rescheduleSession` masih membuang `costOverride`.** Fungsi itu membuat sesi pengganti dengan `cost: sessionCost(...)` (`sessionRepo.ts:517-531`), jadi menjadwalkan ulang sesi yang punya nominal manual membuat nominalnya kembali ke hitungan otomatis **tanpa pemberitahuan**. Ini jalur berbeda dari D2 dan **sengaja tidak saya kerjakan pada putaran yang sama**: kalau durasinya ikut berubah (mis. 1,5 → 2 jam), nominal manual lama mungkin tidak lagi sesuai — meneruskannya bisa salah, membuangnya juga bisa salah. Dua pilihan dicatat di `PEKERJAAN.md` §4; pilihan yang lebih kecil risikonya adalah **memberi tahu tutor di konfirmasi** bahwa nominal manual akan dilepas.

6. **Batas kejujuran putaran ini.** Sudah dibuktikan: `npx tsc -b` bersih · `npx eslint src` bersih · suite **1.409 lulus / 101 berkas**, 0 gagal · `check:docs` 0 pelanggaran. Belum: **`e2e:uiux` tidak dijalankan** pada putaran ini (perubahan hanya di repositori, bukan tampilan), dan yang paling penting — **butir 44 daftar periksa manual belum dicentang**, karena hanya pemilik yang bisa membuktikan bahwa angka yang ia isi sendiri memang angka yang tercatat di perangkatnya.

### 4.13 Yang berubah pada putaran 2026-10-14 (pemeriksaan pemilik di server dev + v1.104.0)

Pemilik memeriksa butir 30–44 langsung di server pengembangan. Hasilnya: **34–38, 40, 41, 43, dan 44 dicentang**; **42 tidak dicentang** (dicoba, gagal lagi); **39 sengaja tidak dicoba**. Dua bug yang ditemukan pada saat itu sudah diperbaiki dan dirilis **v1.104.0**; sisanya dicatat sebagai temuan yang menunggu keputusan.

1. **Bug: kolom "💰 Biaya" di modal catatan sesi tersangkut angka 0.** Dilaporkan: *"saat hapus nilai awalnya sampai habis, textbox bernilai 0 terus dan susah buat nulis nilai baru. Saat nilai nol di save, masih pakai data lama."* Penyebabnya: isian kosong ditulis sebagai `setCostOverride(0)`, dan nol itu lalu dianggap "tidak berubah" sehingga niat melepas nominal manualnya tidak pernah tersampaikan — **nominal lama tetap dipakai**. Perbaikan dipindah ke modul murni `src/screens/studentDetail/sessionCostPatch.ts` dengan **12 tes** (isian kosong/nol = kembali ke hitungan otomatis; pelepasan dikirim sebagai `costOverride: null` yang eksplisit; `1e5` tidak lagi dibaca sebagai 1).

2. **Bug: panel "Laporan tersimpan" menampilkan laporan semua murid.** Pemilik: *"kok munculkan semua laporan. Mending ndak perlu, sebab fokus di laporan ini ya anak yang lagi kita amati."* Panel itu memuat `listAllReports()` beserta pemilih murid; sekarang `listReportsByStudent(studentId)`, pemilihnya dihapus, judulnya "Riwayat laporan <nama murid>". Keputusan pemilik 2026-10-01 yang mendasarinya tetap terjaga: laporan murid yang sama masih bisa dibuka dari daftar ini.

3. **Temuan yang menunggu keputusan pemilik (belum dikerjakan), semuanya tercatat di `PEKERJAAN.md` §4:**
   - **Panggilan AI "perkuat" gagal karena konteks terlalu panjang, dan Coba lagi hanya mengulang muatan yang sama.** Ini temuan terpenting. **SUDAH DIKERJAKAN 2026-10-15 (v1.105.0)** — lihat §4.14. **Butir 42 (Coba lagi) tinggal dicoba pemilik di perangkat.**
   - **Narasi sesi tidak perlu disunting lagi di layar Laporan** (fokus: kesimpulan · kutipan guru · rencana). **SUDAH DIKERJAKAN 2026-10-15 (v1.105.0)** — panel narasi kini hanya-baca, dan prop penyuntingannya dihapus dari panel itu.
   - **Pemilih gaya Rapikan · Perluas · Ringkas terasa tidak berpengaruh.** Bukan bug: tombolnya hanya menyimpan pilihan, dan gaya itu dipakai pada panggilan **berikutnya**. Yang kurang adalah umpan baliknya. **Masih terbuka.**
   - **Saat mencatat sesi, mapel & topik belum mengikuti muridnya.** **SELESAI 2026-10-14 (v1.104.0).**
   - **Tombol lipatan "Siklus Tagihan" tidak menyembunyikan isinya pada murid yang sudah ada.** **SELESAI 2026-10-14 (v1.104.0).**

4. **Batas kejujuran putaran ini.** Sudah dibuktikan: `npx tsc -b` bersih · `npx eslint src` bersih · berkas uji baru **12 tes** hijau · suite penuh dijalankan sekali di akhir. Belum: **`e2e:uiux` tidak dijalankan** pada putaran ini, dan pemeriksaan pemilik dilakukan di **server pengembangan dengan data contoh** — bukan di HP dengan data asli.

### 4.14 Yang berubah pada putaran 2026-10-15 (perkuat AI per bagian + ringkasan bertahap, v1.105.0)

Dua keputusan pemilik 2026-10-14 dikerjakan pada putaran ini.

> **Dilanjutkan pada hari yang sama oleh §4.15** — dan klaim di §4.14 nomor 3 ternyata **terlalu luas**: jalur ringkasan bertahap hanya dipasang untuk Kesimpulan, sedangkan tiga isian lain masih mengirim seluruh kolom sesi. Baca §4.15 sebelum mengutip §4.14.

1. **Perkuat AI per bagian.** `generateReportField(field, input)` di `lib/aiClient.ts` dengan prompt **turunan** `SYSTEM_PROMPT_REPORT_SUMMARY` — kalimat penilaiannya dipertahankan apa adanya supaya mutu keluarannya tidak berubah, bukan aturan baru. Validatornya hanya menuntut isian yang diminta. Tombolnya dipasang di tempat bagiannya: `ReportTextsPanel` (Kesimpulan · Catatan Guru · Kutipan) dan `ReportPlanPanel` (Rencana), masing-masing menyebut perkiraan biaya dari `estimateReportFieldCost`.

2. **Yang paling penting: perkuat satu bagian tidak menyentuh bagian lain.** `isiBagian()` mengembalikan `undefined` untuk isian yang tidak diminta — **bukan `""`** — sebab `""` akan **mengosongkan tulisan tutor** yang sudah ada. Ada tes khusus untuk itu (`useReportGeneration.test.ts`, +4 tes), termasuk kasus keluaran AI kosong: tidak ada penulisan sama sekali dan tutor diberi tahu.

3. **Ringkasan bertahap.** `ringkasanBertahap()` adalah orchestrator **murni** dengan dua fungsi yang disuntikkan (`ringkasBatch`, `susunAkhir`), sehingga aturan "berapa panggilan" bisa diuji tanpa jaringan — dan `generateStagedSummary()` menyusun kesimpulan dari ringkasan tiap batch **beserta fakta angka** (jumlah sesi, rentang tanggal, mapel, rata-rata fokus). Dipakai di `handlePerkuatBagian("summaryText")` **dan** `handleGenerateAll`. **Laporan kecil tidak berubah:** bila seluruh sesi muat dalam satu batch, jalur bertahap mengembalikan `null` dan panggilan tunggal yang lama tetap dipakai — invarian ini punya tesnya sendiri.

4. **Narasi sesi hanya-baca di layar Laporan.** Prop penyuntingan (`editingId` · `draftText` · `onStartEdit` · `onDraftChange` · `onFinishEdit` · `saveState` · `savedLabel`) **dihapus** dari `ReportNarrativePanel`, bukan sekadar disembunyikan lewat CSS — supaya tidak ada dua tempat yang bisa berbeda pendapat soal apakah editor boleh muncul. Narasi tetap tampil dan tetap tercetak di PDF. **Catatan teknis:** `useNarrativeAutosave` beserta tesnya masih ada di repo tetapi **tidak lagi terpakai** layar Laporan; menghapusnya adalah keputusan terpisah karena menyentuh berkas uji.

5. **Batas kejujuran putaran ini.** Sudah dibuktikan: `npx tsc -b` bersih · `npx eslint src` bersih · suite **1.434 lulus / 103 berkas**, 0 gagal · `check:docs` 0 pelanggaran. Belum: **`e2e:uiux` tidak dijalankan** pada putaran ini meskipun markup layar Laporan berubah (tombol baru + panel narasi), dan **butir 42 belum bisa dicentang** sampai pemilik mencoba "Coba lagi" lagi di perangkat.

### 4.15 Yang berubah pada putaran 2026-10-15 (ringkasan sesi untuk AI, v1.107.0)

Pemilik bertanya kenapa "perkuat AI" masih bisa kelebihan konteks padahal tombolnya sudah per bagian. Jawabannya terbukti dari kode, dan **klaim §4.14 nomor 3 terlalu luas**: jalur ringkasan bertahap hanya dipasang untuk **Kesimpulan**.

1. **Sebabnya.** Catatan Guru, Kutipan, dan Rencana memakai `generateReportField` (per bagian, benar) tetapi bahannya tetap `buildReportAiInput` yang mengirim **sebelas kolom per sesi**. Diukur dengan alat ukur sementara terhadap muatan asli: **±620–1.230 karakter per sesi**; laporan 40 sesi × catatan 800 karakter = **42.552 karakter**.

2. **Temuan sampingan yang lebih penting daripada ukurannya: narasi sesi tidak pernah ikut ke laporan.** `buildReportAiInput` mengirim `shortNote` saja. Narasi yang pemilik tulis setiap hari di alur Catat Sesi — dan yang memang lebih rapi — **tidak terpakai** saat menyusun kesimpulan. Jadi pekerjaan harian itu hanya muncul di PDF, tidak masuk bahan AI.

3. **Perbaikan yang dipakai (pilihan A yang disetujui pemilik: ringkasan lokal padat, tanpa panggilan AI tambahan).** `buildSessionDigest()` + `compactSessionText()` + `DIGEST_TEXT_MAX` (240) di `lib/reportSessionScope.ts`. Satu sesi kini mengirim **tanggal · mapel · topik · inti (±240 karakter, dipotong di batas kata) · skor fokus sebagai angka**. Aturan yang mengikat, masing-masing beralasan: **inti diambil dari narasi bila ada** (kalau tidak, dari catatan) sehingga satu sesi tidak pernah mengirim dua cerita; **angka yang sudah menjadi kolom tidak diulang ke dalam kalimat** — ini jawaban atas permintaan *"setiap sesi jangan sampai ada info mengulang jadi lebih ringkas"*; **bagian kosong tidak dikirim** sebagai kunci tanpa isi.

4. **Hasil terukur:** 40 sesi × catatan 800 karakter → **42.552 → 14.951 karakter (65% lebih kecil, 374 char/sesi)**. Angka ini dicetak oleh tesnya sendiri, jadi tidak bisa basi tanpa terlihat.

5. **Estimator biaya dibetulkan.** `estimateReportFieldCost` memakai patokan tetap ±120 token per sesi yang terukur **1,7–2,6× terlalu kecil**; sekarang ia menerima bahan sesi dan menghitung dari muatan yang benar-benar akan dikirim (`perkiraanTokenTeks`, ±3,6 karakter per token), dengan patokan tanpa bahan dinaikkan ke ±150 token per sesi.

6. **Tombol kedua di Catat Sesi TIDAK dikerjakan, dan itu keputusan pemilik sendiri.** Pemilik mengusulkan *"tombol submit catat sesi ada 2, bagian untuk ringkas semua info di sesi dengan ai aja"*, tetapi pada pesan yang sama ia menyatakan sudah memakai AI setiap hari di alur Catat Sesi — sehingga tombol kedua akan menggandakan panggilan yang sama. **Jalur yang tersisa tetap ada:** sesi yang narasinya belum dibuat diisi lewat "Isi Semua dengan AI" (`pickDirtyNarrativeSessions` sudah memisahkan sesi kosong dari sesi yang narasinya sudah ada), dan `isBagian()` tidak pernah mengosongkan isian lain.

7. **Batas kejujuran putaran ini.** Sudah dibuktikan: `npx tsc -b` bersih · `npx eslint src` bersih · suite **1.447 lulus / 104 berkas**, 0 gagal · `npm run build` ✓ · `check:docs` 0 pelanggaran. Belum: **`e2e:uiux` tidak dijalankan**, dan **mutu keluaran AI dari bahan yang kini lebih ringkas belum diperiksa pemilik** — ini yang paling perlu dilihat: kalau kesimpulan/kutipan terasa lebih dangkal, ambang `DIGEST_TEXT_MAX` (240) yang harus dinaikkan, dan itu satu angka di satu berkas.

### 4.16 Yang berubah pada putaran 2026-10-15 (kolom biaya + durasi sesi, v1.108.0)

Pemilik melaporkan: *"Pada bagian student, Sesi. Edit Sesi. Pada saat mau edit tarif sesi secara manual, saat hapus semua, justru kembali terisi penuh."* Yang **tidak** boleh dilewatkan dari putaran ini adalah **cara pembuktiannya**, karena inilah kelas bug yang tidak terlihat dari kode.

1. **Dibuktikan di peramban asli lebih dulu, bukan disimpulkan dari kode.** Sesi Rp 500.000 → klik Edit → Ctrl+A lalu Delete → kolom **kembali berisi "500000"**; mengetik "250000" sesudahnya menghasilkan **"500000250000"**, dan angka itu **tersimpan** ke `cost` dan `costOverride` (dibuktikan dengan membandingkan tabel `sessions` di IndexedDB sebelum/sesudah simpan).

2. **Penyebabnya satu baris yang sudah "diperbaiki" pada v1.104.0 tetapi tidak pernah benar-benar bekerja.** `value` kolom diisi nilai turunan yang jatuh balik ke `session.cost` setiap kali teksnya kosong, sehingga aturan "kosong = kembali otomatis" di `sessionCostPatch.ts` **tidak pernah bisa dicapai lewat mengetik**. Pelajarannya: perbaikan yang hanya diuji di lapisan fungsi murni bisa tampak selesai padahal jalur masuknya (kolom isian) masih memakai aturan lama.

3. **Dua cacat lain di kolom yang sama ikut ditutup**, ditemukan saat memperbaiki: tombol durasi menulis ke kolom biaya (menekan "3j" pada sesi otomatis membuatnya tersimpan sebagai nominal manual), dan perilaku menyimpan saat kolom kosong.

4. **D9 (keputusan pemilik).** Memperbaiki durasi sesi **tidak boleh** menghapus nominal manual tutor. `updateSession` dan `updateSeriesSessions` menulis `cost` **berpasangan** dengan `costOverride`, sehingga keduanya tidak pernah bertentangan. Perilaku lama W3/W7 (TASK-10 L1) yang menuntut "durasi berubah → override dilepas" **dicabut**, dan tes `sessionPricing.test.ts` yang menuntut perilaku itu **dibalik**. Modal menampilkan catatan `[data-catatan="biaya-manual-durasi"]` berisi kedua angka + tombol "↺ Pakai hitungan otomatis".

5. **Pagar regresinya `e2e/session-cost-manual.spec.ts` (12 tes, chromium + mobile).** Bukti bahwa pagar itu menggigit ada dua lapis, dan keduanya terukur: (a) menurut catatan rilis, pada kode lama ia gagal; (b) pada 2026-10-15 pagar itu **terbukti gagal 10/10** ketika sebuah sesi verifikasi menjalankannya terhadap **versi spec yang lebih tua** di keadaan kode yang lebih tua — jadi angkanya bukan klaim. Catatan teknis: spec berjalan dengan `fullyParallel: true`, sehingga hasil **per-projek** bisa berbeda dari hasil **gabungan**; yang berlaku adalah hasil gabungan (`npx playwright test e2e/session-cost-manual.spec.ts` → **12 lulus**).

### 4.17 Yang berubah pada putaran 2026-10-15 (D10 — `npm run e2e` tidak lagi 404)

**D10 (keputusan pemilik): `playwright.config.ts` boleh diperbaiki pada bagian `webServer`.** Bentuk lamanya `command: "npm run dev -- --port 5174 --strictPort"` **tidak pernah bisa jalan**: npm menelan `--port` (peringatan resminya *Unknown cli config --port*) sehingga Vite membaca `5174` sebagai **root direktori** dan membalas **404 di semua permintaan** — sambil tetap mencetak `Local: http://localhost:5174/`, sehingga gejalanya menyesatkan. Sekarang `npx vite --port 5174 --strictPort`. Ini **membuka larangan §3 untuk satu baris itu saja**, bukan izin mengubah konfigurasi lain.

**Konsekuensi yang perlu diketahui sesi berikutnya:** jangan menjalankan Vite kedua di repo ini — keduanya berbagi `node_modules/.vite` dan server yang lama mulai membalas `504 (Outdated Optimize Dep)`.

---

## 5. Langkah berikutnya

Kerjakan berurutan, satu tugas sampai tuntas, lalu lapor sekali.

1. **Gelombang 3 secara fungsional sudah tuntas; yang tersisa adalah pekerjaan tangan pemilik.**
   G3-09 Pengaturan: target baris **tercapai** (637 ≤ 700), kesebelas fitur **terpasang**, dan gate mesin
   sudah hijau (`tsc` · `eslint` · suite · `build` · `check:docs` · **`e2e:uiux` 64/0**) — yang tersisa
   hanya **tampilannya yang belum pernah dilihat mata**, dan itu hanya bisa ditutup pemilik.
   G3-10: **empat dari lima butir selesai**; butir 3 (ajakan PIN baru) ditutup 2026-10-11 di v1.101.0,
   dan **butir 5** (uji memakai data contoh) sudah dipindahkan menjadi **butir 39** daftar periksa
   manual karena hanya bisa dijalankan pemilik di server pengembangan.
   **Tidak ada tugas kode tersisa di Gelombang 3.** Di luar gelombang, **D2 ditutup 2026-10-14**
   (v1.103.0), dan **B1 — sisa terakhir yang menyentuh uang — ditutup 2026-10-17**: kalimat
   konfirmasi jadwalkan-ulang kini memberi tahu tutor bahwa nominal manualnya dilepas (tanpa
   mengubah angkanya), dan jalur konfirmasinya tidak lagi jatuh ke cabang pembatalan sesi.

2. **Menunggu mata pemilik — jangan dikerjakan agen.** Jangan menghitung sendiri sisanya: `npm run check:docs` melaporkan jumlah butir dan jumlah tiap tanda, dan sejak keputusan **D13** (2026-10-15) penghitungnya mesin. Keadaan sesudah putaran 2026-10-15: **34 butir bertanda ✅**, **1 bertanda ⏭** (butir 39, dilewati atas keputusan pemilik), dan **butir 8 dan 9 tanpa tanda** karena yang ada untuk keduanya hanya catatan agen — bukan pernyataan pemilik. Yang benar-benar menunggu mata pemilik:
   - **42** — bukti bahwa percobaan ulang panggilan AI **berhasil** sesudah bentuk baru D11 (*"Isi semua dengan AI masih gagal"* dijawab pemilik 2026-10-15, sehingga bentuknya diubah, bukan ditambal);
   - **8 dan 9** — dua butir yang pemilik laporkan lulus 2026-10-15 bersama butir lain, tetapi buktinya hanya catatan agen; kalau pemilik mengulang pernyataannya, keduanya bisa langsung ditandai;
   - **butir daftar periksa untuk layar Pengaturan yang belum dibuat sama sekali** (v1.100.0–v1.110.0 menyentuh layar itu tanpa butirnya sendiri — sama persis dengan keadaan layar Uang sebelum butir 24–25 dibuat 2026-10-07);
   - **C2 — SUDAH DIJALANKAN 2026-10-15, baris ini tertinggal basi.** `npm run e2e:uiux` **72 lulus / 0 gagal** dan
     `npm run e2e:pwa` **2 lulus / 0 gagal** dengan bentuk `npx vite --port …` yang baru; keduanya sekaligus
     membuktikan perbaikan D10 bekerja (bentuk lama akan membalas 404 di semua permintaan). Jangan dijalankan
     ulang sebagai "bukti C2" — yang perlu dijalankan ulang adalah pengujian atas perubahan **baru**.
   **Larangan yang tetap berlaku:** butir 40 tidak boleh diuji dengan memulihkan berkas backupnya; butir 39 tidak boleh dijalankan di alamat online; dan butir 42 tidak perlu diuji ulang bagian (a)-nya (sudah tertutup bersama butir 41).

3. Pekerjaan di `PEKERJAAN.md` bagian 4 boleh dikerjakan kapan saja tanpa mengubah urutan di atas —
   termasuk tiga temuan 2026-10-08: kegagalan `e2e` yang tidak hijau di mesin ini (kegagalan warisan
   ber-`SchemaError: DexieError`), katalog tangkapan layar yang tidak lagi cocok dengan spec, dan
   **D2** (biaya saat sesi ditutup mengabaikan nominal manual — satu-satunya sisa yang menyentuh uang).
   Ditambah temuan 2026-10-11: `useWebWorker` yang sepuluh kali lebih lambat, baris sasaran
   `StudentDetail.tsx` yang sudah hampir penuh (698 dari ≤700), **sub-layar `?tab=ringkasan` yang belum
   masuk cakupan penjaga tampilan**, dan **gate R2 `check:docs` yang lulus secara hampa**.
   **Yang sudah tidak ada di daftar ini lagi (ditutup 2026-10-14):** pengukuran ulang G3-01 butir 9
   (sudah diukur **dan** dikerjakan), syarat riwayat AI G3-04, **D6**, **D4**, dan status D3 yang
   berbunyi "belum" untuk dua kasus terjelasnya.

   **Keadaan 2026-10-17 — sisi pengujian, yang sebelumnya paling tidak terpercaya di repo ini.**
   Kegagalan `e2e` yang berpindah-pindah **tidak lagi diterangkan sebagai "flake beban"**. Terukur:
   helper tesnya sendiri yang menebak — ia memperlakukan "data belum dimuat" sama dengan "periode
   memang tidak bisa direkap", kandidatnya tidak menyaring murid berpaket (laporan paket hanya bisa
   diterbitkan dari layar Keuangan), dua spec sengaja memakai murid tertentu lalu **berpindah** ke
   murid lain, dan penantian seed memakai satu event konsol yang bisa terlewat. Sesudah diperbaiki:
   suite penuh dijalankan **empat kali** — 91/1/6 → 88/4/6 → 91/1/6 → **92 lulus / 0 gagal / 6 skip**
   (run terakhir, dari keadaan final; baseline sebelum putaran ini 86/6/6) — dan **semua** kegagalan
   yang muncul di run antara **lulus saat dijalankan sendirian**, jadi sisanya sensitif beban dan
   **sebabnya belum dipastikan**. Tiga spec laporan: **12/12 lulus pada tiga run berturut-turut**.
   "92/0" adalah satu run, bukan jaminan. Alat ukurnya permanen: `catatJejakKetersediaanLaporan`
   + `sintesisJejakLaporan` menyebutkan **kode keputusan** di pesan kegagalan, jadi kegagalan
   berikutnya tidak perlu ditebak. **Masih ada dua kegagalan beban** (`capture-closeout-failure`,
   `screenshot-audit 05-report`) yang lulus sendirian; keduanya **belum** dipastikan, dan menaikkan
   batas waktu **bukan** jalan yang dibenarkan. **Jangan menyunting `src/` selama suite e2e berjalan** —
   Vite memuat ulang modul di tengah tes dan kegagalannya tidak sah (terjadi 2026-10-17).

4. Daftar periksa manual di `PEKERJAAN.md` bagian 5 (**44 butir**) hanya bisa ditutup pemilik di perangkat, dan **angkanya kini dibaca dari `npm run check:docs`**, bukan dari kalimat di dokumen — keputusan **D13** mencabut tanda `⏳` dan kalimat penghitung karena satu butir pernah memuat `✅` dan `⏳` sekaligus sehingga dua dokumen menghitung sisanya dengan hasil berbeda. Aturan yang berlaku: **`✅`** = ditutup dengan bukti, **`⏭`** = dilewati atas keputusan pemilik (bukan lulus), dan butir yang belum ditutup **tanpa tanda**.
   **Yang masih menunggu: butir 42** (bentuk barunya harus dibuktikan berhasil di perangkat), **butir 8 dan 9** (hanya catatan agen), dan **butir daftar periksa untuk layar Pengaturan yang belum dibuat sama sekali**.
   **Butir 39 khusus: wajib di server pengembangan, bukan alamat online; butir 40 dan 41, 43, serta 44
   sebaliknya — boleh di alamat online dengan data asli, dan butir 40 tidak boleh diuji dengan memulihkan
   berkas backupnya; butir 42 juga boleh di alamat online, tetapi jangan lupa mengembalikan kunci API
   sesudah mencobanya.**

---

## 6. Riwayat berkas ini

| Tanggal | Perubahan |
|---|---|
| 2026-10-17 | **Sisa kegagalan `e2e` akhirnya diterangkan dengan alat ukur, bukan dugaan — dan sebabnya ada di helper tes, bukan di produk maupun beban.** Instrumennya `catatJejakKetersediaanLaporan` (aktif hanya di DEV dan hanya bila fixture `e2e` memintanya; mencatat **kode cabang** keputusan layar Laporan, tanpa nama murid dan tanpa nominal) beserta `sintesisJejakLaporan`, yang **menyebutkan kode itu di pesan kegagalan**. Yang terbukti sesudahnya, satu per satu: (a) `pilihMuridYangBisaDirekap` memperlakukan "data belum dimuat" sama dengan "periode tidak bisa direkap", sehingga seluruh murid dinyatakan "ada-alasan" dalam milidetik — ironisnya komentar helper itu sendiri menyebut pembedaan ini sebagai syarat; (b) kandidatnya tidak menyaring murid berpaket, dan laporan paket memang **hanya bisa diterbitkan dari layar Keuangan** (di seed dev: Citra Dewanti), sehingga tombolnya benar-benar mati menurut desain; (c) `report-export-ratio` dan `report-ratio-fixed` sengaja memakai Andi Pratama lalu helper **berpindah ke murid lain**, jadi yang diuji bukan yang dimaksud; (d) penantian seed memakai satu event konsol yang bisa tiba sebelum penungguan dipasang. **Sesudah perbaikan:** suite penuh **91 lulus / 1 gagal / 6 skip** pada run bersih (baseline 86/6/6), tiga spec laporan **12/12 tiga run berturut-turut**, dan `billing-session-count` (yang ternyata gagal sendirian — `getByRole("status")` cocok ke dua elemen karena banner kilat "1 foto lama diperkecil" muncul bersamaan) **2/2 lulus** sesudah locatornya terlingkup. **Dua kegagalan beban masih tersisa** (`capture-closeout-failure`, `screenshot-audit 05-report`) dan **belum dipastikan**; menaikkan batas waktu bukan jalan yang dipakai. **Pelajaran proses yang dicatat:** suite penuh sempat dijalankan sementara `src/` disunting, dan Vite memuat ulang modul di tengah tes — kegagalan run itu tidak sah, jadi **jangan menyunting `src/` selama suite e2e berjalan**. Ikut ditutup pada putaran yang sama: **B1** (kalimat jadwalkan-ulang, beserta cacat `jalankanKonfirmasi` yang akan membatalkan sesi), **C3 sebagian** (AP 34/34 · Nasional 19/19, total 127/167), dan **C7 sebagian** (peta alias kini daftar yang dihitung ulang dari kode, dan daftar itu menemukan tujuh mapel Nasional yang daftar topiknya kosong). |
| 2026-10-15 | **Dua cacat nyata ditemukan oleh pengujian penuh dan sudah ditutup; `e2e` 13 gagal → 8 gagal.** **(1) "Restore dari File" tidak pernah memulihkan apa pun.** Perutean PIN-nya tidak punya cabang `restore` — menekan PIN menutup modal lalu tidak memanggil apa pun, tanpa galat dan tanpa pesan. Bukti: probe di build produksi (`.jles` dibuat, satu murid ditambah, restore → tabel `students` tetap 2 baris). Perbaikan: perutean pindah ke `src/screens/settings/pinActions.ts` sebagai **peta bertipe**, sehingga peta yang kehilangan satu aksi **ditolak compiler** (dibuktikan: `TS2741: Property 'restore' is missing`); berkas `.jles` ikut dikirim bersama permintaan PIN; modal PIN menutup **sebelum** pekerjaan panjang supaya tahapnya terlihat. Pagar: `pinActions.test.ts` (6 tes) + asersi IndexedDB di `e2e-pwa/pwa-runtime.spec.ts` — yang menuntut tabel `students` **tepat satu baris** sesudah restore, karena tes lama **lulus palsu**. **`e2e:pwa` 2/0.** **(2) `SchemaError: KeyPath action on object store auditLog is not indexed`.** `aiUsage.ts` men-query `auditLog.where("action")` padahal indeksnya tak pernah didaftarkan; Dexie melemparnya sebagai penolakan janji tak tertangani yang selama ini hanya terbaca sebagai nama `DexieError`. Skema naik ke **v16** (menambah indeks saja), dan `report-unlock.spec.ts` kini merekam **isi** janji yang ditolak. **Sisa 8 kegagalan `e2e`** (`finance` 2 · `report-export` 2 · `report-export-ratio` 3 hanya mobile · `billing-session-count.runtime` 1) — **sebabnya sudah ditemukan, dan itu bukan produk maupun beban paralel, melainkan data uji yang menumpuk.** Dua hipotesis salah dibuang lebih dulu: (a) "flake beban-tinggi" (yang tercatat di `playwright.config.ts`) tidak terbukti — membatasi `workers` ke 2 hanya mengurangi 8 → 6; (b) menjalankan spec sendirian membuat `report-export` lulus, tetapi menjalankannya lagi sesudah suite tetap gagal. Bukti yang menentukan: dengan profil peramban **bersih** (`--clean`), `report-export` dan `billing-session-count` **lulus**. Sebabnya `src/dev/seedDummy.ts` — seed **dilewati** begitu ada data murid, sementara semua berkas spec memakai database peramban yang sama, sehingga laporan yang dibuat tes sebelumnya membuat tombol "Buat Laporan" nonaktif ("periode sudah pernah direkap"). **Perbaikannya menyentuh cara kerja tes** (penyiapan per-berkas / per-test), jadi butuh keputusan pemilik; `finance.spec.ts` masih gagal walau profil bersih dan belum ada penjelasannya. |
| 2026-10-15 | **Putusan pemilik atas 25 butir temuan dijalankan; bentuk "Isi Semua dengan AI" berubah, dan daftar periksa manual kini dihitung mesin.** Keputusannya ada di [`KEPUTUSAN-PEMILIK-2026-10-15.md`](KEPUTUSAN-PEMILIK-2026-10-15.md) dan `ATURAN-AI.md` §4.6 (D11–D17). **Yang berubah di kode:** "Isi Semua dengan AI" tidak lagi menulis ulang narasi sesi — hanya Ringkasan · Catatan Guru · Rencana depan, dengan batas panjang di prompt (`useReportGeneration.ts`, `aiClient.ts`, `MonthlyReport.tsx`, `ReportTextsPanel.tsx`); "Batalkan sesi" vs **"Hapus permanen"** dibedakan kalimatnya (`manageSession.ts`); `updateSession` menulis jejak **`session.update`** (`sessionRepo.ts`, `types.ts`, `auditDisplay.ts`); `useWebWorker` dimatikan (`foto.ts`); config Playwright `uiux`/`sw` disamakan dengan bentuk D10; sub-layar `?tab=ringkasan` masuk cakupan `e2e:uiux`. **Penjaga baru:** `topicMultiSubject.test.ts` (5 tes, dibuktikan bisa gagal lewat mutasi), `sessionAuditTrail.test.ts` (9 tes), blok D11 di `useReportGeneration.test.ts` (6 tes), satu tes di `manageSessionSheet.test.tsx`, dan **`scripts/check-docs-checklist.mjs` + self-test-nya** yang kini dijalankan `npm run check:docs`. **Bagian 4 dan 5 dokumen kontrak diselaraskan:** kalimat penghitung §5 diganti cara mengukur, tanda `⏳` dicabut, butir yang dilaporkan lulus 2026-10-15 ditandai, dan **dua baris tabel §4 yang rusak lama dibetulkan** (satu memuat `\|` yang dihitung sebagai pemisah kolom, satu lagi adalah dua baris yang tergabung — jenis kerusakan yang justru dilarang §2 karena menyembunyikan pekerjaan). **Tidak dikerjakan, dengan alasan satu baris masing-masing:** C9 (pemilik: tidak perlu refactor lagi), B8 (pemilik: selidiki di akhir), C3/C7/C8 (katalog topik · peta alias · katalog IB — pekerjaan besar), dan kalimat pemberitahuan jadwalkan-ulang (B1). Gate dijalankan sekali di akhir; angkanya ada di keluaran perintah, bukan di sini. |
| 2026-10-15 | **Umpan balik pemeriksaan pemilik atas butir 1–23 dan 42 — dua bug, dua permintaan penguatan, satu keputusan, dan satu keluhan yang TIDAK bisa direproduksi.** Pemilik memeriksa layar Catat Sesi dan Beranda di perangkatnya. **Dilaporkan lulus** (tidak perlu diulang): 10 · 11 · 13 · 14 · 15 · 17 · 19 · 20 · 21 · 23, dan katalog topik sendiri dinilai "oke". **Masuk daftar pekerjaan:** (a) **bug — saat dua mapel dipilih, daftar topik hanya memuat mapel pertama** (jalur penggabungan topik; katalognya tidak perlu disentuh); (b) permintaan pemilik **memetakan ulang langkah kondisi** supaya lebih akurat dan lebih cepat dipahami, dengan fakta yang sudah terverifikasi di kode: lapisan **"Kondisi les hari ini"** dan **"Suasana hati"** **tidak** menghitung skor, sedangkan **"Yang menonjol hari ini"** plus **observasi lanjutan** yang menghitung; (c) permintaan **menghitung ulang keadilan skor** (bias arahnya terukur: positif berhenti di +5, negatif bisa −12); (d) permintaan **penjelasan beda "batalkan" vs "tidak hadir" di antarmuka**. **Dua pertanyaan lokasi dijawab dengan memperbaiki panduan:** ekspor CSV bernama **"Ekspor data ke CSV (terbaca)"** dan berada **di dalam bagian Backup dan Restore**; badge `!` ada di **penunjuk langkah paling atas** (terbukti di snapshot browser: "Langkah 1: Jadwal (saat ini), belum lengkap"). **Butir 42 diperiksa di browser sungguhan dan keluhannya tidak terulang** — highlight pemilih gaya berpindah (`aria-checked` + warna latar pindah Rapikan → Perluas → Ringkas, kalimat "Akan ditulis dengan gaya …" ikut berubah); yang dibutuhkan sekarang satu tangkapan layar pemilik. **Keputusan pemilik:** butir **39** dan **butir 5 G3-10** dianggap selesai **tanpa menjalankan reset** — ditulis sebagai "dilewati atas keputusan pemilik", bukan "lulus". **Temuan sampingan:** `playwright.uiux.config.ts` masih memakai bentuk `npm run dev -- --port 5174` yang sama dengan bug D10 (terduga, belum diukur). |
| 2026-10-15 | **Status butir diselaraskan antara bagian 3/4 dan daftar periksa manual — tanpa perubahan kode.** Lima butir yang penutupannya oleh pemilik sudah lama tercatat di dokumen ini **tetapi barisnya di `PEKERJAAN.md` §5 tidak pernah ikut ditandai** sekarang bertanda beserta tanggal dan sumbernya: **4 · 5 · 6** (dilihat pemilik 2026-10-07, sumber §4.4 dan bagian 3 G3-02) dan **24 · 25** (layar Uang tiga blok dan tabel Rekap tiga kolom, "cukup oke" 2026-10-07). Akibatnya pernyataan lama **"butir 1–23 masih terbuka" menjadi tidak akurat apa adanya** dan diganti dengan rumusan yang bisa dihitung: 44 butir = **22 bertanda** + **20 tanpa tanda (1, 2, 3, 7–23)** + **2 ⏳ (39, 42)**. **Butir 42 dipisah dua bagian** supaya ⏳-nya menunjuk hal yang benar: syarat "Coba lagi membuka modal biaya" sudah tertutup bersama butir 41, sedangkan yang masih menunggu adalah bukti bahwa percobaan ulangnya **berhasil** sesudah v1.105.0/v1.107.0 — pemilik mencobanya 2026-10-14 dan panggilan AI-nya masih gagal karena konteks terlalu panjang, sebab yang baru ditutup pada dua rilis itu. **Butir 8, 9, dan 23 sengaja TIDAK dicentang**: yang ada untuk ketiganya hanya catatan agen ("butir 8 dan 9 selesai", "butir 10 belum dilihat mata"), dan mencentangnya berarti mengarang bukti. Perubahan lain di berkas ini: bagian 3 G3-09 kini punya baris keadaan (sebelumnya hanya syarat selesai, sehingga keadaannya hanya hidup di `SERAH-TERIMA.md`), dan bagian 5 butir 2 dibetulkan — angka "sebelas butir" di barisnya tidak pernah cocok dengan daftar yang mengikutinya. Gate: `npm run check:docs` lulus (sekali di akhir). |
| 2026-10-15 | **Kepala berkas diselaraskan ke v1.108.0, dan §4.16–§4.17 ditulis** untuk dua putaran yang belum punya catatan di berkas ini: **D9** (memperbaiki durasi sesi tidak boleh menghapus nominal manual tutor — `cost` ditulis berpasangan dengan `costOverride`, perilaku lama W3/W7 dicabut dan tesnya dibalik) dan **D10** (`webServer` `playwright.config.ts` memakai `npx vite --port 5174 --strictPort`; bentuk lama tidak pernah bisa jalan karena npm menelan `--port` sehingga Vite membaca `5174` sebagai root direktori dan membalas 404 di semua permintaan, sambil tetap mencetak URL yang tampak benar). §4.16 sekaligus mencatat **cara pembuktian** yang membuat temuan itu kuat: direproduksi di peramban asli, dan penyebabnya satu baris yang **sudah tercatat diperbaiki pada v1.104.0 tetapi tidak pernah benar-benar bekerja** — jalur masuknya (kolom isian) masih memakai nilai turunan, sehingga aturan "kosong = kembali otomatis" tidak pernah bisa dicapai lewat mengetik. Ditambahkan juga: pagar regresinya 12 tes e2e yang **terbukti gagal 10/10** pada keadaan lama, dan catatan bahwa spec berjalan `fullyParallel: true` sehingga hasil per-projek berbeda dari hasil gabungan. |
| 2026-10-14 | **Bagian 4.12 dan kepala berkas ditulis untuk D2 yang tuntas (v1.103.0).** Satu-satunya sisa yang menyentuh uang ditutup: `markSessionDone` tidak pernah memeriksa `costOverride`, sehingga nominal manual pada sesi terjadwal hilang tepat saat sesinya dicatat. Dibuktikan lebih dulu sebagai tes merah (murid per pertemuan: 175.000 → 200.000), lalu diperbaiki dan dikunci **tiga tes**. **Temuan terpisah dicatat, belum dikerjakan:** `rescheduleSession` masih membuang `costOverride` saat membuat sesi pengganti — dua pilihan perbaikannya ada di `PEKERJAAN.md` §4, dan yang lebih kecil risikonya adalah memberi tahu tutor di konfirmasi. Butir daftar periksa manual bertambah menjadi **44**, dan butir 44 khusus menyentuh uang sehingga tidak boleh dijawab dari kode. |
| 2026-10-14 | **Bagian 2, 4.11, 5, dan kepala berkas ditulis untuk putaran verifikasi ke kode + rilis v1.102.0.** Kepala berkas diperbarui: angka baris yang basi dibetulkan dengan hasil ukur sendiri (`Settings.tsx` **637**, bukan 576; `CaptureSession.tsx` **2.108**, bukan 2.077), dan penyebut daftar periksa manual ditegaskan **43 butir** (39 sebelum butir 40–43 ditambahkan bersama v1.102.0). **Tiga butir yang dokumen tulis "selesai" ternyata belum ada di kode** dan ditutup pada putaran ini: G3-01 butir 9 (label biaya tombol AI · pengumuman status · tombol coba lagi — **tidak satu pun** terpasang, padahal penahannya sudah selesai sejak G3-04 tuntas 2026-10-07), syarat "riwayat panggilan AI menampilkan waktu, fitur, dan biaya" di G3-04 (kolom `aiFeature`/`costIdr` ditulis sejak 2026-10-07 tetapi **tidak dibaca satu layar pun**), dan perbaikan sandi backup yang sudah dikomit **tanpa nomor versi**. Dua butir ditutup karena ternyata sudah terpenuhi: **D6** (H1 → 3×H2 tanpa lompatan level, terukur) dan **D4** (tab tagihan sudah dijaga; tidak ada berkas "palet terkunci" yang perlu dibuat karena keputusannya berbunyi "dicatat di riwayat"). Satu baris angka dibetulkan bersama alat ukurnya: katalog topik **109/167 · 58 belum** (dulu ditulis "20 dari 78" dengan skrip yang **tidak ada di repositori**), dan penggantinya `src/__tests__/topicGapCount.test.ts`. **D3** tidak lagi berbunyi "Belum" untuk dua kasus terjelasnya, dan angka "23 peta alias" **dicabut** karena daftarnya tidak bisa direproduksi. Pelajaran proses yang ditulis di 4.11: status butir di dokumen yang ditulis dari ingatan **bisa salah berhari-hari**; yang menentukan hanya `grep` ke kode. |
| 2026-10-11 | **Bagian 2, 4.10, dan 5 ditulis untuk G3-10 butir 3 yang tuntas (ajakan PIN baru sesudah reset, v1.101.0)** — sekaligus **mengoreksi keadaan G3-10**: butir 1, 2, dan 4 ternyata sudah ada di kode sejak G3-09, dan dokumen ini sempat menulis tugas itu "belum". Yang dipasang: `lib/pinReset.ts` + `components/PinResetInvite.tsx` (dirender di `Layout`), penanda di `localStorage` **karena tabel `settings` ikut dibersihkan reset**, dua syarat tampil, dan dua sambungan (`Settings.tsx` membaca hash `#bagian-pin`; `PinSection.tsx` menerima `autoStart` yang hanya berlaku bila PIN belum ada). Penjaga baru **22 tes** yang bekerja dua lapis, lapis kedua membaca berkas sumber `?raw` supaya modul yang benar tetapi tidak dipanggil siapa pun tidak bisa lolos. Klaim urutan audit diverifikasi di `auditRepo.ts`, bukan diasumsikan. Butir 5 G3-10 dipindahkan menjadi **butir 39** daftar periksa manual (wajib di server pengembangan), sehingga daftar itu kini **39 butir**. |
| 2026-10-05 | Dibuat sebagai pengganti berkas arahan lanjutan yang sudah beku. |
| 2026-10-05 | Diperbarui berkali-kali mengikuti pekerjaan Keuangan dan panel Kelola sesi. |
| 2026-10-05 | Ditulis ulang mengikuti perubahan besar: aturan kerja baru, delapan keputusan pemilik, pemulihan tiga butir pekerjaan yang hilang, dan pemindahan spesifikasi Gelombang 3 ke daftar pekerjaan. |
| 2026-10-07 | Diselaraskan dengan cara menjalankan suite di sandbox dan rujukan bagian setelah penomoran `ATURAN-AI.md` berubah. |
| 2026-10-07 | Bagian 3 dan 4 ditambah: G3-02 butir 1–3 selesai (pembangun murni `financeRows`/`financeOverview`, layar Uang tiga blok, tabel Rekap tiga kolom), beserta batas kejujuran barunya. Bagian 5 diperbarui: sisa G3-02 menjadi lima butir. |
| 2026-10-07 | Bagian 4.4 diperbarui sesudah penjaga dijalankan: `e2e:uiux` diperluas mengukur `/payments` dan `?tab=tagihan` (keputusan pemilik), tiga temuan pra-eksisting diperbaiki, dan satu regresi `e2e/finance.spec.ts` yang sempat terjadi sudah ditutup. Batas kejujuran berubah dari "penjaga belum dijalankan" menjadi "terbukti mesin, belum terbukti mata". |
| 2026-10-07 | Pemilik memverifikasi tampilan di perangkat: layar Uang tiga blok, tabel Rekap tiga kolom, dan tiga hal di sub-layar Tagihan (pencarian murid, badge keterlambatan + nama hari Indonesia, panel filter lanjutan beserta chipnya). Butir 4.2 nomor 2 dan 3 **ditutup** (dicoret beserta tanggalnya, nomornya tidak digeser supaya rujukan lama tetap sah), dan bagian 4.4 berubah dari "terbukti mesin, belum terbukti mata" menjadi terbukti keduanya. |
| 2026-10-08 | Bagian 2, 4.5, dan 5 ditulis untuk G3-05 yang tuntas: refactor `MonthlyReport.tsx` 2.361 → 1.470 baris + 11 butir fitur, tiga field opsional baru tanpa kenaikan skema Dexie, ekspor yang tidak lagi menandai laporan "sudah dibagikan", dan batas kejujuran barunya (termasuk perincian 11 kegagalan `e2e` yang **bukan** akibat pekerjaan ini, serta kesalahan `Set-Content` yang saya ulangi dan perbaiki). Bagian 5 diganti dengan urutan baru: G3-06 lebih dulu. |
| 2026-10-08 | **Batas kejujuran 4.5 nomor 1 ditutup:** pemilik memeriksa layar Laporan di perangkat dan menilai "sudah sangat oke", sehingga butir daftar periksa manual 26–29 dicentang pada hari yang sama. Catatan apa adanya tetap disimpan: persetujuan itu pernyataan pemilik sesudah butir dibacakan, bukan pengukuran per butir, dan butir 28 memuat pertanyaan preferensi yang tidak dijawab terpisah. |
| 2026-10-10 | **Bagian 2, 4.6, dan 5 ditulis untuk G3-06 yang tuntas.** Sisa tiga butir terakhir dikerjakan (pengurutan/penyaringan daftar murid lewat `src/lib/studentList.ts`, kartu murid tiga baris, urutan kelompok formulir + siklus terlipat). Dua temuan alat masuk ke 4.6: bug urutan hook di `StudentDetail.tsx` yang menjatuhkan seluruh layar Detail Murid ke batas galat (lolos dari `tsc` dan suite, tertangkap `e2e:uiux`) dan pelanggaran `react-refresh/only-export-components` di `PerbandinganNilai.tsx` beserta jebakan penamaan `.ts` vs `.tsx` di Windows. Bagian 5 diganti: G3-07 lebih dulu, dan daftar periksa manual bertambah menjadi 33 butir. |
| 2026-10-11 | **Aturan baru `ATURAN-AI.md` §1.1: goal dan todos wajib dibuat setiap pekerjaan** (keputusan pemilik). Ditulis di kontrak karena pemilik memantau kemajuan dari pelacak yang hidup: sebelum langkah pertama, agen DSH wajib `create_goal` dengan sasaran yang bisa diperiksa dan `todo_write` dengan seluruh langkahnya; todo ditandai selesai begitu langkahnya beres, dan goal **ditutup dengan `complete`** saat pekerjaannya tuntas. Aturan ini **tidak** bertentangan dengan "satu tugas tuntas lalu lapor sekali" — yang dilarang adalah melapor per langkah, bukan mencatat kemajuan. Salinannya ditaruh di titik masuk (`PROMPT-SESI-BERIKUTNYA.md`), di router (`docs/README.md` §2), dan di `CHEATSHEET.md` di atas tabel gate. |
| 2026-10-11 | **Bagian 2, 4.8, dan 5 ditulis untuk G3-08 yang tuntas (kanvas dan istilah).** Enam langkah dalam satu putaran: istilah panel desain diterjemahkan + contoh warna per opsi, chip Tema dan chip Susunan dipisah, susunan dikelompokkan dengan satu tombol pratinjau, galeri tema empat kolom, grafik diperbaiki (teks 11 px, jarak kiri ikut label terpanjang, angka ringkas + nilai penuh di keterangan, fokus papan ketik, legenda donat hidup), dan glosarium antarmuka diberlakukan. Bagian 5 diganti: G3-09 lebih dulu, daftar periksa manual bertambah menjadi 38 butir, dan satu temuan baru dicatat — sub-layar `?tab=ringkasan` belum masuk cakupan penjaga tampilan, sehingga cacat urutan `yRange` pada `LineChart` lolos dari tipe, suite, **dan** `e2e:uiux`, lalu ditemukan oleh tangkapan layar. |
| 2026-10-11 | **Bagian 2, 4.7, dan 5 ditulis untuk G3-07 yang tuntas (foto murid).** Empat berkas baru dan lima berkas disentuh; enam keputusan pemilik dicatat di 4.7 termasuk pemotongan lewat CSS saja dan hapus-foto-yang-berlaku-saat-Simpan. Angka pengukuran foto masuk apa adanya (22,3 MB → 102,9 KB; 0,45 MB → 20,1 KB; keduanya 480×640 px) beserta alasan antarmuka tidak menjanjikan 150 KB. Satu kesalahan alat dicatat supaya tidak terulang: penjaga yang menghitung pasangan `createObjectURL`/`revokeObjectURL` per baris **salah menuduh kode yang benar di tujuh berkas** lalu diganti pengujian runtime. Bagian 5 diganti: G3-08 lebih dulu, daftar periksa manual bertambah menjadi 35 butir, dan dua temuan baru 2026-10-11 dicatat. |
