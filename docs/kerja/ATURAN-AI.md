# ATURAN-AI — kontrak kerja, aturan, dan daftar keputusan pemilik

> **Sekilas.** Jenis: kontrak kerja. Status: berlaku. Untuk siapa: agen AI yang mengerjakan aplikasi ini, dan pemilik yang mengawasi.
> Baca kalau: sebelum mengerjakan apa pun, atau sebelum bertanya apa pun ke pemilik.
> **Aturan tertinggi:** kalau ada dokumen lain yang bertentangan dengan berkas ini, berkas ini yang menang.

---

## 1. Cara bekerja (menggantikan aturan lama yang membuat pekerjaan tercicil)

**Prinsip yang mengikat: waktu pemilik adalah komponen termahal di proyek ini.** Semua aturan di bawah ini adalah turunan dari prinsip itu, bukan kerapian belaka.

1. **Satu tugas dikerjakan sampai tuntas, lalu lapor satu kali.** Aturan lama "satu putaran satu langkah, lapor, berhenti" dicabut. Laporan per langkah membuat pemilik membayar berkali-kali untuk satu pekerjaan.
2. **Gate dijalankan sekali di akhir tugas**, bukan setiap langkah. Menjalankan ulang gate untuk perubahan yang sama adalah pemborosan, bukan kehati-hatian.
3. **Jangan mengulang test untuk membuktikan hal yang sama.** Kalau satu berkas uji merah padahal sendirian hijau, itu gagal karena beban kerja mesin. Catat satu baris, lanjutkan. Jangan menjalankan seluruh suite berkali-kali.
4. **Jangan menambah penjaga baru tanpa alasan yang menyentuh uang, data, atau regresi yang benar-benar pernah terjadi.** Penjaga yang sudah ada boleh dan sebaiknya disederhanakan. Penjaga yang menghambat perubahan yang jelas baik harus dibuang.
5. **Jangan bertanya ke pemilik untuk hal yang tidak mengubah uang, tidak mengubah perilaku pengguna, dan tidak menghapus data.** Putuskan sendiri, catat alasannya satu baris di riwayat tugas. Yang wajib ditanyakan hanya tiga hal itu.
6. **Angka mutakhir tidak ditulis di dokumen.** Tulis perintah cara mengukurnya. Angka yang disalin akan basi dan menyesatkan sesi berikutnya.
7. **Kalau menemukan pekerjaan yang belum selesai tapi tidak ada di daftar**, langsung tambahkan ke daftar dengan tanggal dan sumbernya. Jangan menunggu izin, dan jangan membiarkannya hilang.

**Gate dua tingkat (menggantikan sistem empat tier lama):**

| Jenis perubahan | Yang dijalankan |
|---|---|
| Dokumen saja | `npm run check:docs` sekali |
| Kode biasa (satu sampai tiga berkas, tidak menyentuh uang) | `npx tsc -b` sekali di akhir tugas |
| Kode yang menyentuh uang, data tersimpan, atau lebih dari tiga layar | `npx tsc -b`, suite tes, dan `npm run build` masing-masing sekali di akhir tugas |
| Tampilan | Test Playwright dijalankan sekali per tugas besar, tidak per langkah |

Tidak ada kewajiban menjalankan `eslint` di setiap putaran. Jalankan sekali sebelum menutup tugas besar.

---

## 2. Integritas dokumen (aturan baru — memperbaiki kesalahan pembersihan dokumen)

**Kejadian nyata yang tidak boleh terulang.** Saat dokumen dirapikan beberapa waktu lalu, isi diringkas sampai butir pekerjaan yang belum selesai ikut hilang dari daftar. Contoh yang terbukti: tiga butir pekerjaan Keuangan (G3-02) — pembangun `financeRows` dan `financeOverview`, layar Keuangan menjadi satu layar dengan tiga blok tetap, dan tabel Rekap dari delapan kolom menjadi tiga kolom — hanya hidup di spesifikasi arsip dan tidak pernah muncul di daftar pekerjaan setelah penggabungan dokumen. Akibatnya pekerjaan itu hampir dinyatakan selesai padahal belum tersentuh.

**Aturan yang berlaku sekarang:**

1. **Jangan menghapus berkas dokumen.** Pindahkan ke `docs/arsip/`, dan tambahkan satu baris di peta pemindahan di `docs/arsip/README.md` yang menyebut berkas asal, berkas tujuan, tanggal, dan alasan.
2. **Jangan meringkas isi yang masih dikerjakan.** Kalau dua dokumen digabung, setiap butir pekerjaan yang belum selesai wajib muncul di berkas tujuan. Isi yang sudah selesai boleh diringkas, tetapi wajib tetap punya jejak di bagian riwayat.
3. **Menutup butir tidak sama dengan menghapus barisnya.** Setiap butir yang ditutup meninggalkan satu baris riwayat berisi tanggal dan alasan.
4. **Kalau ragu apakah sesuatu masih dikerjakan, anggap masih dikerjakan.** Salah karena terlalu banyak pekerjaan di daftar jauh lebih murah daripada salah karena pekerjaan hilang dari daftar.

---

## 3. Berkas yang dilarang disentuh

Berkas berikut memuat rumus, teks keluar, atau data yang sudah dibekukan. Tugas apa pun dilarang mengubah isinya. Kalau sebuah tugas menuntut mengubahnya, tugas itu salah lingkup: berhenti dan laporkan.

- `src/db/db.ts`
- `src/lib/crypto.ts`
- isi fungsi `formatRupiah()`
- `src/lib/waBilling.ts`
- `src/lib/invoicePresentation.ts`
- `src/lib/engagement.ts`
- `src/lib/finance.ts`
- `src/lib/financePipeline.ts`
- `src/lib/csv.ts`
- seluruh isi `src/template/`
- `STEP_META` di `src/screens/captureSession/constants.ts`
- prompt di `src/lib/aiClient.ts`

**Perbuatan yang dilarang tanpa keputusan pemilik:** menambah pustaka baru, mengubah `playwright.config.ts` atau `vite.config.ts`, mengubah jumlah langkah wizard dari enam, menghidupkan mode gelap, dan mengaktifkan integrasi berkelanjutan di GitHub.

---

## 4. Keputusan pemilik yang sudah final

Daftar ini adalah satu-satunya tempat keputusan pemilik dicatat. **Semua keputusan di sini sudah final dan tidak boleh ditanyakan lagi.** Kalau sebuah keputusan membuat pekerjaan menjadi sulit, yang berubah adalah cara mengerjakannya, bukan keputusannya.

### 4.1 Konstitusi produk

| Kode | Keputusan |
|---|---|
| B1 | Tarif dan rincian sesi di seluruh layar Murid ikut ditutup. Setiap layar murid wajib lewat `useMoneyVisible()`. |
| B2 | Uang tidak terkunci otomatis setelah lima menit. Sekali dibuka, berlaku selama aplikasi terbuka. Hanya tombol Kunci yang menutupnya. |
| B3 | Tombol Catat di Beranda mengisi murid, tanggal, dan jam. Jumlah langkah wizard tetap enam. Yang dihemat pengisiannya, bukan langkahnya. |
| B4 | Batas belanja AI tidak dipasang secara default. Kolomnya ada, kosong berarti tanpa batas. Kalau diisi dan terlampaui, tombol AI nonaktif dengan alasan yang terlihat. |
| Tetap | Wizard Catat Sesi dipertahankan bentuknya, hanya diperkuat. Navigasi tiga pintu ditambah satu aksi di dalam navigasi, tanpa tombol mengambang. Semua panggilan AI lewat modal biaya. Beranda tidak menampilkan uang sama sekali. |
| Tetap | Sesi boleh disimpan dari langkah lima maupun langkah enam, dan langkah enam tetap menawarkan Bukti. |
| Tetap | Papan pipeline dipertahankan, bukan dibubarkan, dan hidup di dalam blok "Perlu ditagih" di layar Uang. Tidak menambah blok keempat. |
| Tetap | Aplikasi terang saja secara permanen. Mode gelap tidak dihidupkan lagi. |
| Tetap | Peta tab layar Murid: Ringkas, Sesi, Progres, Proyek. Uang menjadi blok di dalam tab Ringkas. |
| Tetap | Fokus Android. Aturan ukuran huruf enam belas piksel untuk iOS tidak dipakai, ukuran dasar tetap lima belas piksel. |
| Tetap | Refactor terbatas dikerjakan tepat sebelum gelombang fiturnya, satu berkas besar per gelombang. |
| Tetap | Semua dialog konfirmasi memakai komponen internal, bukan `confirm()` atau `prompt()` bawaan peramban. |

### 4.2 Keputusan yang sudah diambil dan tetap mengikat pekerjaan hari ini

Keputusan lama bernomor Q1 sampai Q45 (2026-09-25 sampai 2026-10-04) sudah final seluruhnya. Yang masih menentukan pekerjaan hari ini sudah disalin ke bawah ini; daftar lengkapnya ada di tiga berkas arsip, yaitu `docs/arsip/GELOMBANG-1.md`, `docs/arsip/GELOMBANG-2.md`, dan `docs/arsip/RIWAYAT-PEKERJAAN-2026-10.md`.

| Hal | Keputusan |
|---|---|
| Urutan tugas Gelombang 3 | G3-01, G3-02, G3-03, G3-04, G3-05, G3-06, G3-07, G3-08, G3-09, G3-10. Tugas G3-04 dikerjakan sebelum G3-05 karena panel AI di Laporan membutuhkannya. |
| Letak berkas penguji tampilan | Folder `e2e-uiux/` dengan konfigurasi `playwright.uiux.config.ts`. |
| Cakupan perintah pemeriksaan kebocoran uang | Folder `src/screens/payments/` dikecualikan, karena isinya hanya bisa dirender setelah gerbang PIN lolos. |
| Ukuran sasaran sentuh | Empat puluh empat piksel untuk kontrol utama. Chip dan kontrol sekunder boleh dua puluh empat sampai tiga puluh enam piksel. |
| Batas waktu satu test Playwright | Enam puluh detik. Jangan dinaikkan lagi tanpa alasan terukur. |
| Integrasi berkelanjutan | Tidak diaktifkan. Gate lokal adalah satu-satunya penjaga. Jangan menawarkannya lagi. |
| Nama berkas laporan | Nama murid dipertahankan di dalam nama berkas. |
| Folder usulan tampilan | `docs/mockups/` dipertahankan, tidak diarsipkan, paling tidak sampai tugas Laporan selesai. |
| Katalog topik mapel | Dikerjakan agen, bukan pengetahuan pemilik. Cari topik sebanyak mungkin, topik yang sama boleh dipakai lintas mapel yang serupa. |
| Verifikasi dua build aplikasi web progresif | Dikerjakan pemilik lewat Vercel. Bukan tugas agen. Jangan diangkat lagi. |
| Tampilan emoji | Dilonggarkan pada 2026-10-05. Emoji boleh dipakai kalau tampilannya bagus di HP pemilik. Ketidakkonsistenan antarperanti bukan masalah. Penjaga yang menuntut nol emoji tidak lagi wajib. |

### 4.3 Keputusan pemilik 2026-10-05 (putaran terakhir)

| Nomor | Keputusan | Akibat yang mengikat |
|---|---|---|
| D1 | Tiga butir pekerjaan Keuangan yang hilang dari daftar tetap berlaku dan masuk daftar sisa: pembangun murni `financeRows` dan `financeOverview`, layar Keuangan menjadi satu layar dengan tiga blok tetap, dan tabel Rekap dari delapan kolom menjadi tiga kolom. | Sisa tugas Keuangan menjadi tujuh butir, bukan empat. Spesifikasi lengkapnya sekarang ada di `PEKERJAAN.md` bagian 3, tidak lagi hanya di arsip. |
| D2 | Tarif selalu mengikuti tarif dasar di profil murid. Murid per pertemuan ditagih ketika paket pertemuannya lengkap, misalnya delapan atau dua belas pertemuan. Murid per jam dihitung per jam dan ditagih bulanan. Nominal manual yang pernah diisi tutor adalah koreksi yang disadari dan tidak boleh tertimpa oleh perhitungan otomatis. | Perhitungan biaya saat sesi ditutup wajib memeriksa nominal manual sebelum menulis. Salah satu bagian kode saat ini mengabaikannya, dan itu harus dibetulkan. Pertemuan yang tanggalnya jatuh di antara dua bulan boleh ditagihkan pada salah satu bulan, dan tutor yang menentukan bulannya. |
| D3 | Alias mapel lintas kurikulum dibenahi dengan penyaringan yang tepat. | Mapel Nasional Informatika dan Penjaskes tidak boleh lagi memakai katalog ilmu komputer tingkat internasional. Dua puluh tiga peta alias yang ditandai skrip audit ditinjau seluruhnya, bukan sebagian. |
| D4 | Cakupan penjaga tampilan diperluas, dan perubahan warna atau token wajib meninggalkan catatan bahwa tampilan sudah dipatenkan. | Tab tagihan di layar Uang masuk daftar halaman yang dijaga. Setiap perubahan warna, token, atau ukuran yang disengaja dicatat di bagian riwayat tugas dengan alasan dan tanggal. |
| D5 | Katalog topik IB harus benar-benar diperiksa. Memakai kerangka silabus boleh. Lebih banyak unit data lebih baik daripada tidak punya data. | Katalog IB MYP dan IB DP tidak lagi berstatus belum diverifikasi. Kekurangan unit ditambah, bukan dikurangi. |
| D6 | Hierarki judul layar Keuangan memakai pilihan yang lebih mudah dibaca sesuai kaidah tampilan. | Satu judul induk ditambahkan, keenam kartu diturunkan satu tingkat, dan tampilan visualnya tidak berubah. |
| D7 | Emoji boleh dipertahankan kalau tampilannya bagus. | Kebijakan emoji dilonggarkan seperti tercatat di bagian 4.2. |
| D8 | Kegagalan test yang muncul hanya saat beban tinggi diperkuat penyebabnya, bukan dibiarkan. | Pemuatan data contoh dibuat berurutan supaya tidak berlomba dengan test. |

### 4.4 Cara menutup pertanyaan baru

Pertanyaan baru ke pemilik hanya sah untuk tiga hal: mengubah uang, mengubah perilaku pengguna, dan menghapus data. Di luar tiga hal itu, putuskan sendiri dan tulis alasannya satu baris. Pertanyaan yang sudah pernah dijawab tidak boleh diajukan lagi, termasuk dalam bentuk yang sedikit berbeda.

---

## 5. Fakta kode yang mengikat

- Skor sesi dihitung dari indikator yang terisi, dan penyebutnya disebutkan di antarmuka. Sesi tanpa indikator tidak dihitung.
- Uang tidak pernah ditampilkan di Beranda. Bukan disamarkan, tetapi tidak ada barisnya.
- Perhitungan tagihan, ekspor CSV, dan total laporan yang sudah difinalkan dibekukan. Perubahan tampilan tidak boleh mengubah angkanya.
- `costOverride` adalah pernyataan eksplisit tutor dan tidak boleh dihitung ulang oleh mesin.
- `rateSnapshot` adalah tarif yang menempel pada sesi dan menentukan angka akhir saat sesi ditutup.
- Versi aplikasi dibaca dari `package.json`. Catatan perubahan dibaca dari `src/lib/version.ts`.

---

## 6. Perintah yang dipakai di mesin ini

Jalankan dari folder `les-ko-lui`.

```
npx tsc -b                    pemeriksaan tipe
npm run test:sandbox          seluruh suite tes, cara resmi di mesin ini
npm run build                 membangun aplikasi, keluaran dist/sw.js
npm run check:docs            memeriksa fakta dan tautan dokumen
npm run measure loc           mengukur jumlah baris berkas besar
npm run e2e                   test tampilan, butuh izin sandbox penuh
npm run e2e:uiux              penjaga tampilan, butuh izin sandbox penuh
```

> **`npm run release-check` tidak ada di `package.json` dan tidak pernah ada di riwayat git.** Perintah itu dicantumkan di berkas ini dan di laporan TASK-06 sebagai gate yang lulus. Artinya gate itu **tidak bisa dibuktikan pernah berjalan**. Rilis di repo ini memang dikerjakan manual atas tiga berkas sekaligus: `package.json` (versi), `src/lib/version.ts` (entri `CHANGELOG`), dan `docs/RIWAYAT-RILIS.md` (baris riwayat rilis). Kalau konsistensi ketiganya mau dijaga mesin, itu **penjaga baru** — dan §1 butir 4 melarang menambah penjaga tanpa keputusan pemilik. Sampai ada keputusan, jangan mengutip `release-check` sebagai bukti gate.

**Lingkungan sandbox.** Di mesin ini Vite memanggil perintah sistem lewat pipa yang dilarang sandbox, sehingga `npm test`, `npm run test:sandbox`, dan `npm run build` gagal dengan galat `spawn EPERM` sebelum satu tes pun berjalan.

Jalan keluarnya sudah tersedia di repo: berkas shim **`.dsh-vitest-shim.cjs`** di **akar folder induk** (`Private Tutor/`), dipanggil dari dalam `les-ko-lui/` lewat jalur relatif. Cukup satu pemanggilan PowerShell:

```powershell
$env:NODE_OPTIONS = "--require=../.dsh-vitest-shim.cjs"
npm run test:sandbox
```

Dua jebakan yang sudah memakan waktu: (a) jalur absolut Windows **gagal** karena `NODE_OPTIONS` memakan garis miring terbalik (`Cannot find module 'C:Userslieml…'`) — pakai jalur relatif; (b) shim harus dipasang di dalam proses PowerShell yang sama dengan perintah npm-nya, karena `NODE_OPTIONS` hanya berlaku selama proses itu.

Yang tetap butuh izin sandbox penuh dan tidak bisa disiasati: `npm run e2e`, `npm run e2e:uiux`, dan `git push`.

**Akhir baris berkas wajib LF.** Jangan membiarkan satu berkas bercampur CRLF dan LF.

---

## 7. Jebakan yang sudah pernah memakan waktu

- Perintah `git commit` kadang mencetak sukses tetapi keluar dengan kode satu karena git menulis peringatan ke saluran galat. Commit-nya berhasil. Buktikan dengan melihat riwayat, jangan mengulang commit.
- Perintah `npm run e2e` menulis ulang berkas gambar tangkapan layar yang ikut dilacak git, dan membuat berkas gambar baru. Pulihkan setelah selesai dan pastikan tidak ada yang ikut terkirim.
- Keluaran PowerShell bisa menampilkan teks beraksen sebagai karakter rusak karena membaca UTF-8 sebagai ANSI. Untuk menilai apakah sebuah berkas benar-benar rusak, ukur byte-nya, jangan menilai dari tampilan.
- Blok JSX kondisional ditutup pada baris terpisah. Memotong blok besar dengan penggantian teks sederhana menghasilkan penutup ganda. Pakai skrip pemotong yang memeriksa bentuk sebelum memotong.
- Baris tabel markdown jangan disunting dengan jangkar pendek. Jangkar harus satu baris utuh, dan teks pengganti tidak boleh memuat teks jangkar.
- Berkas `.mjs` dan `.cjs` untuk alat bantu ditaruh di `.design-audit/`, yang tidak dilacak git. Jangan ditaruh di folder sementara.
- **Menomori ulang bagian sebuah kontrak bisa memutus rujukan nomor bagian di dokumen lain.** Revisi berkas ini 2026-10-07 meniadakan §0, §2.1, §2.2, §2.3, §6.1–§6.4, dan §9 yang dulu ada; enam rujukan di dokumen lain langsung menunjuk bagian yang tidak ada lagi. **Kalau menomori ulang, perbaiki seluruh rujukan nomor bagiannya pada putaran yang sama.** `npm run check:docs` **tidak** memeriksa hal ini: gate itu hanya menguji tautan `.md`, bukan nomor bagian atau nama jangkar.

---

## 8. Bentuk laporan yang diminta

Satu laporan di akhir tugas, bukan per langkah. Isinya cukup empat hal:

1. Apa yang berubah, dalam bahasa manusia.
2. Perintah apa yang dijalankan dan hasilnya, sekali saja.
3. Apa yang belum selesai atau apa yang ditemukan tapi belum dikerjakan.
4. Kalau ada keputusan yang diambil sendiri, satu baris alasannya.

Tidak perlu mengulang isi dokumen. Tidak perlu menyalin angka yang sudah ada di keluaran perintah.
