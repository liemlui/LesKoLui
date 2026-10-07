# SERAH-TERIMA — keadaan terakhir dan langkah berikutnya

> **Sekilas.** Jenis: lembar serah-terima untuk sesi berikutnya. Status: berlaku.
> Untuk siapa: agen AI yang melanjutkan pekerjaan ini, dan pemilik yang ingin tahu keadaan terakhir tanpa membaca seluruh dokumen.
> Berkas ini diperbarui di akhir sesi, bukan di awal.
> **Terakhir diselaraskan: 2026-10-07** (G3-02 butir 1–3 dikerjakan: pembangun murni, layar Uang tiga blok, dan tabel Rekap tiga kolom). Isi historisnya tidak diubah.
> **Yang mengikat tetap `ATURAN-AI.md` dan `PEKERJAAN.md`.** Berkas ini hanya menjelaskan keadaan dan temuan, bukan aturan.

---

## 1. Urutan baca untuk sesi baru

1. `docs/kerja/ATURAN-AI.md`. Isinya aturan kerja, keputusan final pemilik, daftar berkas yang dilarang disentuh, perintah yang dipakai, dan jebakan yang sudah pernah memakan waktu.
2. `docs/kerja/PEKERJAAN.md`. Satu-satunya daftar pekerjaan, lengkap dengan spesifikasi kesepuluh tugas Gelombang 3.
3. Berkas ini, bagian 3 dan 4, untuk keadaan dan temuan yang tidak ada di dua berkas di atas.
4. Dokumen tugas `TASK-01` sampai `TASK-11` hanya dibuka kalau perlu detail cara kerja sebuah tugas lama. Sebagian besar sudah selesai dan disimpan sebagai rujukan.

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

Catatan keadaan sebagai konteks, **potret 2026-10-05** (jangan dikutip sebagai keadaan hari ini): pohon kerja bersih, cabang `main` sama dengan `origin/main`, dan suite tes lulus penuh dengan enam puluh enam berkas. Keadaan 2026-10-07 sesudah pembenahan dokumen: commit `a390852` sudah di `origin/main`, pohon bersih, suite **849 lulus / 66 berkas**. Angka-angka itu akan basi — yang dipakai adalah perintahnya.

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
2. **Tiga hal baru di layar tagihan belum pernah dilihat mata**: kotak pencarian murid, badge keterlambatan, dan penulisan tanggal jatuh tempo sebagai nama hari Indonesia. Semuanya punya test murni, tetapi test murni tidak membuktikan tampilannya.
3. **Panel filter lanjutan belum pernah diklik mesin maupun manusia.** Tidak ada satu pun test tampilan yang menyentuh tombol dan chip itu. Setelah keputusan D4, tab tagihan masuk cakupan penjaga, tetapi selama penjaganya belum diperluas, panel itu tumbuh tanpa jaring pengaman otomatis.
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

- Layar tiga blok dan tabel Rekap tiga kolom **belum pernah dilihat mata manusia di perangkat**. Yang sudah ada:
  penjaga otomatis. `e2e:uiux` **64 lulus / 0 gagal** dan `e2e` **75 lulus / 6 skip** sesudah perbaikan, jadi
  kontras, ukuran kontrol, struktur heading, dan alur keuangan sudah terbukti mesin — bukan terbukti mata.
  Bedanya penting: penjaga mengukur apa yang bisa diukur, bukan apakah tampilannya enak dipakai.
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

## 5. Langkah berikutnya

Kerjakan berurutan, satu tugas sampai tuntas, lalu lapor sekali.

1. **Sisa G3-02 Keuangan tinggal lima butir.** Urutan yang masuk akal: peringatan nominal (nomor 8), kolom nominal
   (nomor 9), gerbang PIN (nomor 10), dan terakhir navigasi tiga pintu (nomor 11), karena butir 11 mengubah
   pemilih pada test tampilan dan sebaiknya dikerjakan sekali saja. Butir 4 sampai 7 sudah selesai dan hanya
   menunggu mata pemilik; butir 7 sudah ditutup sepenuhnya.
2. **G3-03 papan pipeline**, karena bergantung pada Keuangan.
3. **G3-04 kontrak AI berbiaya**, lalu **G3-05 laporan**, karena panel AI di laporan membutuhkan kontrak biaya.
4. **G3-06 murid**, **G3-07 foto murid**, **G3-08 kanvas dan istilah**, **G3-09 pengaturan**, **G3-10 reset total dan PIN**.
5. Pekerjaan di `PEKERJAAN.md` bagian 4 boleh dikerjakan kapan saja tanpa mengubah urutan di atas.
6. Daftar periksa manual di `PEKERJAAN.md` bagian 5 hanya bisa ditutup pemilik di perangkat.

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
