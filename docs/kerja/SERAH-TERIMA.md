# SERAH-TERIMA — keadaan terakhir dan langkah berikutnya

> **Sekilas.** Jenis: lembar serah-terima untuk sesi berikutnya. Status: berlaku.
> Untuk siapa: agen AI yang melanjutkan pekerjaan ini, dan pemilik yang ingin tahu keadaan terakhir tanpa membaca seluruh dokumen.
> Berkas ini diperbarui di akhir sesi, bukan di awal.
> **Terakhir diselaraskan: 2026-10-11** (G3-09 Pengaturan, tahap 1 dan 2: `Settings.tsx` 1.387 → **637 baris**, seluruh bagian besar jadi berkasnya sendiri, enam dialog bawaan peramban digantikan dialog internal, dan **tombol "Perbarui" PWA yang tidak berfungsi diperbaiki**). Isi historisnya tidak diubah.
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

Catatan keadaan sebagai konteks, **potret 2026-10-05** (jangan dikutip sebagai keadaan hari ini): pohon kerja bersih, cabang `main` sama dengan `origin/main`, dan suite tes lulus penuh dengan enam puluh enam berkas. Keadaan 2026-10-07 sesudah pembenahan dokumen: commit `a390852` sudah di `origin/main`, pohon bersih, suite **849 lulus / 66 berkas**. Keadaan 2026-10-08 sesudah G3-05: suite **982 lulus / 74 berkas**, `e2e:uiux` 64 lulus / 0 gagal, dan `e2e` **69 lulus / 11 gagal / 6 skip** — perincian kegagalannya ada di bagian 4.5, dan **tidak satu pun berasal dari pekerjaan yang sedang dikerjakan**. Keadaan 2026-10-11 sesudah G3-08: suite **1.242 lulus / 91 berkas**, `e2e:uiux` **63 lulus / 1 gagal** (gagal = batas waktu gerbang PIN di bawah beban; **lulus 4/4 saat dijalankan sendirian**), dan `e2e` **67 lulus / 13 gagal / 6 skip**. Dua belas dari tiga belas kegagalan `e2e` persis daftar warisan 2026-10-08 (`report-export-ratio` 3 layout × 2 project, `report-unlock` × 2, `capture-closeout-failure` × 2, `finance` × 2, semuanya galat halaman `SchemaError: DexieError` atau batas waktu di bawah beban), dan yang ketiga belas — `screenshot-katalog` "11-narasi-per-sesi" — **lulus saat dijalankan sendirian**. Tidak satu pun berasal dari G3-08. **Keadaan 2026-10-11 sesudah G3-09 tahap 2:** suite **1.355 lulus / 97 berkas**, `tsc -b` bersih, `eslint src` 0, `build` menghasilkan `dist/sw.js`, `check:docs` 0 pelanggaran — dan **`e2e:uiux` belum dijalankan** (lihat bagian 4.9 nomor 1). Angka-angka itu akan basi — yang dipakai adalah perintahnya.

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

Target baris **tercapai**: `src/screens/Settings.tsx` **1.387 → 637 baris** (sasaran ≤700), dan seluruh
bagian besar kini berkasnya sendiri di `src/screens/settings/`. Dua belas fitur terpasang. Yang perlu
diketahui sesi berikutnya:

1. **Gate `e2e:uiux` BELUM dijalankan untuk putaran ini, dan tidak bisa dijalankan dari sesi ini.**
   Perintahnya gagal dengan `spawn EPERM` (sandbox menolak pipa stdio; `ATURAN-AI` §6 sudah mencatat
   bahwa gate itu butuh izin sandbox penuh). **Jangan membaca "tsc + suite + eslint bersih" sebagai
   "tampilan sudah diperiksa".** Sebagai gantinya ada pemeriksa statis di
   `.design-audit/g3-09/periksa-tampilan.mjs` yang membuktikan tiga batasan dari sumber: tidak ada
   emoji di kontrol, setiap token warna yang dipakai benar-benar ada di `src/index.css` (71 token),
   dan setiap tombol punya tinggi yang bisa dijamin (`min-h-*`, `py-*`, atau kotak `h-N w-N`).
   **Itu bukan pengganti penjaga tampilan** — kontras terukur dan ukuran ter-render hanya bisa
   dibuktikan dengan menjalankannya.

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

8. **Batas kejujuran putaran ini.** Yang **belum** dibuktikan: `e2e:uiux` (lihat nomor 1),
   `e2e` penuh, `e2e:pwa`, dan tampilan bagian Pengaturan yang baru **belum pernah dirender dan
   dilihat mata**. Sebelas fitur G3-09 **sudah terpasang semuanya**; yang belum ada adalah
   **butir daftar periksa manual untuk Pengaturan** (belum dibuat, dan hanya pemilik yang bisa
   menutupnya) serta pembuktian tampilan di perangkat.

---

## 5. Langkah berikutnya

Kerjakan berurutan, satu tugas sampai tuntas, lalu lapor sekali.

1. **G3-09 Pengaturan — sisa yang belum tuntas.** Target baris **sudah tercapai** (637 ≤ 700) dan
   kesebelas fitur **sudah terpasang**, tetapi belum ditutup karena: `e2e:uiux` belum dijalankan
   (butuh izin sandbox penuh), tampilan barunya belum dilihat mata, dan butir daftar periksa manual
   untuk Pengaturan belum dibuat. Setelah itu **G3-10 reset total dan jalur memasang PIN kembali**.

2. **Menunggu mata pemilik — total lima butir, jangan dikerjakan agen:** **34–35** (foto murid,
   ditambahkan 2026-10-11) dan **36–38** (panel desain laporan, perancang tema, dan tiga grafik
   Keuangan, ditambahkan 2026-10-11 bersama G3-08). Butir 35 memeriksa jalur **Batal** sesudah
   menghapus foto, dan butir 36–38 memeriksa hal yang memang tidak bisa dinilai dari kode.

3. Pekerjaan di `PEKERJAAN.md` bagian 4 boleh dikerjakan kapan saja tanpa mengubah urutan di atas —
   termasuk tiga temuan 2026-10-08: kegagalan `e2e` yang tidak hijau di mesin ini (kegagalan warisan
   ber-`SchemaError: DexieError`), katalog tangkapan layar yang tidak lagi cocok dengan spec, dan
   pengukuran ulang G3-01 butir 9. Ditambah temuan 2026-10-11: `useWebWorker` yang sepuluh kali lebih
   lambat, baris sasaran `StudentDetail.tsx` yang sudah hampir penuh, **sub-layar `?tab=ringkasan`
   yang belum masuk cakupan penjaga tampilan**, dan **gate R2 `check:docs` yang lulus secara hampa**
   (tidak ada dokumen aktif yang masih punya kepala YAML `versi_app`/`test`).

4. Daftar periksa manual di `PEKERJAAN.md` bagian 5 (kini **38 butir**) hanya bisa ditutup pemilik di
   perangkat. **Butir 24–29 dan 30–33 sudah dicentang** (30–33 pada 2026-10-10 sesudah pemeriksaan di
   HP); **butir 34–38 menunggu**, dan **butir 1–23 masih terbuka** dan boleh dikerjakan kapan saja
   tanpa mengubah urutan di atas.

---

## 6. Riwayat berkas ini

| Tanggal | Perubahan |
|---|---|
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
