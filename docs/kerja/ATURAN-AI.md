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

---

### 1.1 Goal dan todos wajib dibuat setiap pekerjaan (keputusan pemilik 2026-10-11)

**Aturan ini wajib, bukan anjuran.** Pemilik memantau kemajuan dari pelacak yang hidup, bukan dari laporan lisan. Pekerjaan yang tidak punya goal dan todos **tidak meninggalkan jejak kemajuan yang bisa dibaca** — dan justru itu gunanya pelacakan bagi pemilik.

Setiap kali memulai sebuah pekerjaan, agen DSH **wajib**, sebelum menyentuh berkas apa pun:

1. **Membuat goal** dengan `create_goal` yang memuat sasaran konkret pekerjaan itu — bukan "mengerjakan tugas", melainkan hasil yang bisa diperiksa (mis. "menurunkan `Settings.tsx` menjadi ≤700 baris dan memasang sebelas fitur G3-09 beserta bukti gate-nya").
2. **Membuat daftar todos** yang memuat seluruh langkah pekerjaan itu sejak awal, satu todo per langkah yang bisa diselesaikan.

Ketentuan yang mengikat:

| Hal | Ketentuan |
|---|---|
| Cakupan "setiap pekerjaan" | Berikut **setiap** tugas dari `PEKERJAAN.md`, **setiap** butir di bagian 4, **setiap** permintaan pemilik yang mengubah berkas (termasuk perubahan dokumen), dan **setiap** penyelidikan yang berujung pada keputusan. Sekecil apa pun pekerjaannya. |
| Saat membuat | **Sebelum** langkah pertama dikerjakan, bukan sesudah. Goal dan todos yang dibuat di tengah pekerjaan tidak bisa dipakai memantau pekerjaan itu. |
| Saat memperbarui | Satu todo ditandai `completed` **segera** setelah langkahnya benar-benar selesai. Satu todo berstatus `in_progress` pada satu waktu; beberapa hanya bila langkahnya memang berjalan paralel. |
| Saat menemukan pekerjaan baru | Tambahkan todo-nya **pada putaran yang sama**, dan perbarui goal bila sasarannya ikut berubah. |
| Saat pekerjaan tuntas | **Wajib** menutup goal dengan `complete`. Goal yang dibiarkan terbuka setelah pekerjaannya selesai merusak pemantauan, karena ia tampak seperti pekerjaan yang masih berjalan. Setelah itu tutup todos yang tersisa — tidak boleh ada todo yang masih `in_progress`/`pending` pada pekerjaan yang sudah dilaporkan selesai. |
| Kalau tertahan | Tandai `blocked` **hanya** setelah penghambat yang sama bertahan tiga putaran berturut-turut, dan tulis penghambatnya secara konkret. Kesulitan, ketidakpastian, atau sisa pekerjaan **bukan** alasan `blocked`. |

**Ini tidak bertentangan dengan §1 butir 1** ("satu tugas dikerjakan sampai tuntas, lalu lapor satu kali"). Yang dilarang butir 1 adalah **melapor** per langkah kepada pemilik; yang diwajibkan di sini adalah **mencatat** kemajuan pada alat pelacak. Goal dan todos adalah alat pemantauan, bukan laporan, sehingga memperbaruinya **tidak** memerlukan izin pemilik dan **tidak** memutus pekerjaan.

**Kalau alatnya tidak tersedia, katakan apa adanya.** Bila sesi DSH tidak memiliki `create_goal`/`update_goal` atau `todo_write`, tulis itu di laporan sebagai batas kejujuran (bentuk laporan §8) dan jangan mengaku sudah melacak apa pun. Pekerjaan tetap dikerjakan; yang tidak boleh adalah mengklaim punya jejak pelacakan padahal tidak.

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

### 4.5 Keputusan pemilik 2026-10-14 (sesi verifikasi kolom biaya sesi)

> Ditambahkan sebagai bagian **baru di akhir §4** — bukan disisipkan di tengah — supaya nomor
> bagian yang sudah dirujuk dokumen lain (§4.1–§4.4, §5–§8) tidak bergeser. Jebakan penomoran
> ulang ada di §7.

| Nomor | Keputusan | Akibat yang mengikat |
|---|---|---|
| D9 | **Memperbaiki durasi sesi tidak boleh menghapus nominal manual tutor.** Modal catatan sesi menampilkan catatan berisi kedua angka — nominal manual yang tetap dipakai dan perkiraan hitungan otomatis untuk durasi baru — beserta satu tombol untuk berpindah ke hitungan itu. | `updateSession` dan `updateSeriesSessions` menulis `cost` berpasangan dengan `costOverride` (bukan menghitung ulang lalu membuang nominalnya). Perilaku ini bertabrakan dengan perilaku lama W3/W7 di TASK-10 L1, yang karena itu **dicabut**: tes `sessionPricing.test.ts` yang dulu menuntut "durasi berubah → override dilepas" sekarang menuntut sebaliknya, dan sisi lainnya (sesi tanpa nominal manual tetap menghitung ulang) dijaga tes terpisah. Penjaga browser: `e2e/session-cost-manual.spec.ts`. |
| D10 | **`playwright.config.ts` boleh diperbaiki pada bagian `webServer`.** | Perintahnya menjadi `npx vite --port 5174 --strictPort`. Bentuk lama `npm run dev -- --port 5174 --strictPort` tidak pernah bisa jalan: npm menelan `--port` sehingga Vite membaca `5174` sebagai root direktori dan membalas 404 di semua permintaan. Ini keputusan yang membuka larangan §3 untuk satu baris itu saja — bukan izin mengubah konfigurasi lain. |

### 4.6 Keputusan pemilik 2026-10-15 (bentuk teks laporan + putusan atas temuan)

> Bagian **baru di akhir §4**, bukan sisipan — nomor §4.1–§4.5 dan §5–§8 tidak bergeser (jebakan §7).

| Nomor | Keputusan | Akibat yang mengikat |
|---|---|---|
| D11 | **"Isi Semua dengan AI" di laporan bulanan hanya menulis Ringkasan · Catatan Guru · Rencana depan — tidak menulis ulang catatan atau narasi sesi.** Alasan pemilik: *"orang tua juga males bacanya"*. | Tombol itu **tidak** memanggil `generateNarratives` lagi; narasi sesi tetap apa adanya. Tombol perkuat **Kutipan** dihapus dari layar. Batas panjang wajib: ringkasan **maks 4 kalimat**, catatan guru **maks 3 kalimat**, rencana **maks 3 prioritas**. |
| D12 | **Prompt di `src/lib/aiClient.ts` boleh diubah untuk menegakkan batas panjang D11** — dan hanya untuk itu. | Ini keputusan yang membuka larangan §3 untuk berkas itu **pada bagian `PANDUAN_RINGKASAN`, `PANDUAN_CATATAN_GURU`, dan `PANDUAN_RENCANA`**. Bukan izin mengubah prompt fitur lain (draft catatan, poles WA, analisis keuangan) tanpa keputusan baru. |
| D13 | **Satu butir daftar periksa manual = satu tanda.** Tanda yang sah hanya `✅` (ditutup dengan bukti) dan `⏭` (dilewati atas keputusan pemilik). | Tanda `⏳` **dihapus** dari daftar periksa. Kalimat penghitung ("dua puluh dua butir sudah bertanda") **dihapus** dari dokumen — penghitungnya mesin. Pemeriksa + self-test dipasang di `npm run check:docs`. |
| D14 | Butir **39** (reset total) tetap **dilewati** atas keputusan pemilik, dan butir **42** tetap **tanpa tanda** karena bagian (b)-nya belum dibuktikan di perangkat. | Jangan menjalankan reset total, dan jangan mencentang butir 42. Keduanya **tidak boleh ditanyakan lagi**. |
| D15 | Temuan **dua mapel → daftar topik** dinyatakan pemilik **sudah sesuai**; yang diminta tinggal penjaganya. | Yang dikerjakan adalah **tes penjaga** (dua mapel → topik kedua mapel ikut muncul), bukan perbaikan perilaku. |
| D16 | **"Batalkan sesi" dan "Hapus" harus dibedakan jelas** di antarmuka — pemilik menyebut keduanya *"membinggungkan"*. | Teks akibat tiap aksi wajib menyebut bedanya: batalkan = tetap terlihat di riwayat, tidak masuk tagihan; hapus = hilang dari jadwal **dan** riwayat, tidak bisa dikembalikan. |
| D17 | Jadwalkan ulang **tidak** meneruskan nominal manual, tetapi **memberi tahu tutor** bahwa nominalnya dilepas (pilihan (b) pemilik). | `rescheduleSession` tidak meneruskan `costOverride`; konfirmasi menyebutnya lebih dulu. Dilarang mengubah angka yang ditagih tanpa pemberitahuan. |

**Putusan lengkap atas 25 butir temuan 2026-10-15** (A1–A8 · B1–B8 · C1–C9) beserta alasan dan keadaan pekerjaannya ada di [`KEPUTUSAN-PEMILIK-2026-10-15.md`](KEPUTUSAN-PEMILIK-2026-10-15.md). Berkas itu yang dibaca sebelum bertanya; bagian ini hanya menegaskan yang mengikat.

### 4.7 Keputusan pemilik 2026-10-19 (kutipan laporan bulanan)

> Bagian **baru di akhir §4**, bukan sisipan — nomor §4.1–§4.6 dan §5–§8 tidak bergeser (jebakan §7).

| Nomor | Keputusan | Akibat yang mengikat |
|---|---|---|
| D18 | **Tombol "Perkuat AI" untuk Kutipan dipasang kembali** di panel Teks Laporan. Permintaan pemilik 2026-10-19: *"Perkuat kutipan di laporan bulanan. Atau isian tanpa ai."* Keputusan ini **menggantikan bagian D11 yang menghapus tombol Kutipan**; sisa D11 tetap berlaku. | Kutipan kembali punya tombol perkuat sendiri (satu panggilan kecil; keluarannya satu kalimat), di samping isian manual tanpa AI yang memang sudah ada. **"Isi Semua dengan AI" tetap tidak menulis kutipan**, dan batas panjang D11 (ringkasan maksimal 4 kalimat, catatan guru maksimal 3 kalimat, rencana maksimal 3 prioritas) tidak berubah. Penjaga `reportSessionUiContract.test.ts` dibalik: yang dijaga sekarang **adanya** tombol Kutipan, bukan ketiadaannya. |

---

## 5. Fakta kode yang mengikat

- Skor sesi dihitung dari indikator yang terisi, dan penyebutnya disebutkan di antarmuka. Sesi tanpa indikator tidak dihitung.
- Uang tidak pernah ditampilkan di Beranda. Bukan disamarkan, tetapi tidak ada barisnya.
- Perhitungan tagihan, ekspor CSV, dan total laporan yang sudah difinalkan dibekukan. Perubahan tampilan tidak boleh mengubah angkanya.
- `costOverride` adalah pernyataan eksplisit tutor dan tidak boleh dihitung ulang oleh mesin — **termasuk saat durasi sesi diubah.** `updateSession` dan `updateSeriesSessions` mempertahankan nominal manual dan menulis `cost` berpasangan dengannya; yang dilepas hanya sesi yang memang tidak punya nominal manual. Untuk kembali ke hitungan otomatis, tutor melepasnya sendiri lewat `costOverride: null` (tombol "↺ Pakai hitungan otomatis" di modal catatan sesi).
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
- **`npm run dev -- --port 5174 --strictPort` tidak pernah memakai port yang diminta.** npm menelan `--port` (peringatannya: *Unknown cli config --port*), sehingga Vite menerima `5174` sebagai **root direktori**: server tetap menyala dan tetap mencetak `Local: http://localhost:5174/`, tetapi setiap permintaan dibalas **404** dengan halaman kosong dan `window.seedDummy` tidak ada. Gejalanya menipu — terbaca seperti aplikasi yang rusak, padahal servernya salah melayani. Sudah diperbaiki di `playwright.config.ts` (§4.5 D10). Untuk menjalankan sendiri: `npx vite --port <port> --strictPort`. **Sebelum menyalahkan aplikasi, buktikan servernya** (`GET /` harus 200 dan memuat `<!doctype html>`).
- **Jangan menjalankan dev server kedua di repo yang sama tanpa memisahkan `cacheDir`.** Keduanya berbagi `node_modules/.vite`; server yang sedang jalan lalu mulai membalas `504 (Outdated Optimize Dep)` dan halaman menampilkan "Ada yang tidak beres — Failed to fetch dynamically imported module". Pakai server yang sudah jalan, atau jalankan instance terpisah dengan `cacheDir` sendiri.
- **Seeder DEV menulis bertahap** (terukur: murid muncul ±2 detik, sesi lengkap ±6 detik). Tes browser harus menunggu pesan selesai `[seedDummy] Data dummy berhasil dimasukkan ✓` di console, bukan sekadar "muridnya sudah ada" — kalau tidak, tab Sesi dibuka sebelum sesinya dibuat. Jangan pula membuka IndexedDB sebelum Dexie membuatnya: `indexedDB.open("jurnalles")` tanpa versi lebih dulu menciptakan DB kosong versi 1 dan menabrak migrasinya.
- **Tombol di dalam sheet atau modal bisa berada di luar viewport** (mis. catatan perubahan yang panjang), dan `force: true` **tidak** menolong — Playwright gagal dengan "Element is outside of the viewport". Klik lewat DOM: `locator.evaluate((el: HTMLElement) => el.click())`.
- **Uang: buka lewat gerbang PIN di layar Uang**, bukan gembok di blok Uang layar murid — gembok itu disembunyikan selama setelan PIN belum terbaca (`hideUnlock={needsSetup}`), sehingga kadang belum ada saat dibutuhkan. Status buka-kunci hidup di **memori modul**, jadi sesudah terbuka jangan `page.goto` lagi: reload menguncinya kembali. Pakai klik (navigasi sisi klien).
- **Helper tes wajib menutup dengan assertion, bukan `return` diam-diam**, dan jangan menebak baris data yang sedang diuji: ambil snapshot seluruh tabel, diff, lalu ikat baris yang berubah ke sesuatu yang tampil di layar (mis. tanggal di header modal). Dua kebiasaan itu sudah pernah menghasilkan kesimpulan "tidak ada dampak" yang salah dan kegagalan di tempat yang menyesatkan.
- **PowerShell di mesin ini 5.1**: `Set-Content -Encoding utf8NoBOM` tidak ada (enum-nya beda). Tulis UTF-8 tanpa BOM lewat `[System.IO.File]::WriteAllText($p, $c, (New-Object System.Text.UTF8Encoding($false)))`, lalu **verifikasi dengan membaca kembali berkasnya**. Mencetak "berhasil" dari niat sendiri pernah menipu: perintahnya gagal, berkasnya tidak ada, dan laporannya sudah bilang "ditulis".
- **Pelajaran verifikasi lintas proyek** disimpan sebagai skill DSH `browser-bug-verification` (`~/.dsh/skills/browser-bug-verification/`) — berisi daftar kesalahan, kendala sandbox, dan kerangka harness Playwright. Yang **mengikat repo ini tetap §7 di berkas ini**, bukan salinan di luar repo.

---

## 8. Bentuk laporan yang diminta

Satu laporan di akhir tugas, bukan per langkah. Isinya cukup empat hal:

1. Apa yang berubah, dalam bahasa manusia.
2. Perintah apa yang dijalankan dan hasilnya, sekali saja.
3. Apa yang belum selesai atau apa yang ditemukan tapi belum dikerjakan.
4. Kalau ada keputusan yang diambil sendiri, satu baris alasannya.

Tidak perlu mengulang isi dokumen. Tidak perlu menyalin angka yang sudah ada di keluaran perintah.
