# SERAH-TERIMA — keadaan terakhir dan langkah berikutnya

> **Sekilas.** Jenis: lembar serah-terima untuk sesi berikutnya. Status: berlaku.
> Untuk siapa: agen AI yang melanjutkan pekerjaan ini, dan pemilik yang ingin tahu keadaan terakhir tanpa membaca seluruh dokumen.
> Berkas ini diperbarui di akhir sesi, bukan di awal.
> **Terakhir diselaraskan: 2026-10-10** (G3-06 Murid tuntas: `StudentDetail.tsx` 1.097 → 678 baris, peta tab Ringkas/Sesi/Progres/Proyek, 14 butir — tiga butir terakhir dikerjakan pada putaran ini; tampilan barunya **belum** dilihat pemilik). Isi historisnya tidak diubah.
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

Catatan keadaan sebagai konteks, **potret 2026-10-05** (jangan dikutip sebagai keadaan hari ini): pohon kerja bersih, cabang `main` sama dengan `origin/main`, dan suite tes lulus penuh dengan enam puluh enam berkas. Keadaan 2026-10-07 sesudah pembenahan dokumen: commit `a390852` sudah di `origin/main`, pohon bersih, suite **849 lulus / 66 berkas**. Keadaan 2026-10-08 sesudah G3-05: suite **982 lulus / 74 berkas**, `e2e:uiux` 64 lulus / 0 gagal, dan `e2e` **69 lulus / 11 gagal / 6 skip** — perincian kegagalannya ada di bagian 4.5, dan **tidak satu pun berasal dari pekerjaan yang sedang dikerjakan**. Keadaan 2026-10-11 sesudah G3-07: suite **1226 lulus / 90 berkas**, `e2e:uiux` **64 lulus / 0 gagal**, dan `e2e` **68 lulus / 12 gagal / 6 skip**. Dua belas kegagalan `e2e` itu **dijalankan dua kali dengan hasil sama** dan perinciannya ada di bagian 4.7: sebelas di antaranya persis daftar warisan 2026-10-08 (`report-export-ratio` 3 layout × 2 project, `report-unlock` × 2, `capture-closeout-failure` × 2, `screenshot-katalog` "11-narasi-per-sesi"), dan yang kedua belas adalah `finance.spec.ts` yang gagal karena batas waktu klik di bawah beban — **bukan** akibat pekerjaan ini, karena tidak satu pun berkas yang disentuh G3-07 dipakai spec itu. Angka-angka itu akan basi — yang dipakai adalah perintahnya.

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

---

## 5. Langkah berikutnya

Kerjakan berurutan, satu tugas sampai tuntas, lalu lapor sekali.

1. **G3-08 Kanvas dan istilah**, karena bergantung pada G3-05 (sudah selesai). Panel desain laporan yang baru ada di `src/screens/monthlyReport/DesignToolbar.tsx`. Jangan kurangi 26 susunan / 34 tema.
2. **G3-09 Pengaturan** (refactor `Settings.tsx` 1.387 → ≤700 + 11 fitur, termasuk mengganti lima `confirm()` bawaan yang masih hidup di berkas itu), lalu **G3-10 reset total dan jalur memasang PIN kembali**.
3. **Foto murid masih menunggu mata pemilik** — butir daftar periksa manual **34–35** ditambahkan 2026-10-11 dan belum dicentang. Butir 35 sengaja memeriksa jalur **Batal** sesudah menghapus foto, karena itulah satu-satunya bagian yang tidak bisa dibuktikan suite (repo ini tidak memasang jsdom sehingga formulir tidak bisa dirender di tes).
4. Pekerjaan di `PEKERJAAN.md` bagian 4 boleh dikerjakan kapan saja tanpa mengubah urutan di atas — termasuk tiga temuan 2026-10-08: kegagalan `e2e` yang tidak hijau di mesin ini (kegagalan warisan ber-`SchemaError: DexieError`), katalog tangkapan layar yang tidak lagi cocok dengan spec, dan pengukuran ulang G3-01 butir 9. Ditambah dua temuan 2026-10-11: `useWebWorker` yang sepuluh kali lebih lambat, dan baris sasaran `StudentDetail.tsx` yang sudah hampir penuh.
5. Daftar periksa manual di `PEKERJAAN.md` bagian 5 (kini **35 butir**) hanya bisa ditutup pemilik di perangkat. **Butir 24–29 dan 30–33 sudah dicentang** (30–33 pada 2026-10-10 sesudah pemeriksaan di HP); **butir 34–35 menunggu**, dan **butir 1–23 masih terbuka** dan boleh dikerjakan kapan saja tanpa mengubah urutan di atas.

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
| 2026-10-11 | **Bagian 2, 4.7, dan 5 ditulis untuk G3-07 yang tuntas (foto murid).** Empat berkas baru dan lima berkas disentuh; enam keputusan pemilik dicatat di 4.7 termasuk pemotongan lewat CSS saja dan hapus-foto-yang-berlaku-saat-Simpan. Angka pengukuran foto masuk apa adanya (22,3 MB → 102,9 KB; 0,45 MB → 20,1 KB; keduanya 480×640 px) beserta alasan antarmuka tidak menjanjikan 150 KB. Satu kesalahan alat dicatat supaya tidak terulang: penjaga yang menghitung pasangan `createObjectURL`/`revokeObjectURL` per baris **salah menuduh kode yang benar di tujuh berkas** lalu diganti pengujian runtime. Bagian 5 diganti: G3-08 lebih dulu, daftar periksa manual bertambah menjadi 35 butir, dan dua temuan baru 2026-10-11 dicatat. |
