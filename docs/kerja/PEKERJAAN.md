# PEKERJAAN — satu-satunya daftar pekerjaan

> **Sekilas.** Jenis: daftar pekerjaan aktif dan urutan pengerjaannya. Status: berlaku.
> Untuk siapa: pemilik aplikasi yang memutuskan, dan agen AI yang mengerjakan.
> Baca kalau: akan mulai bekerja, atau akan bertanya "apa yang belum selesai".
> **Aturan:** hanya ada satu daftar pekerjaan, yaitu berkas ini. Kalau ada daftar lain, daftar itu basi.
> **Yang tidak ada di sini:** keputusan final dan larangan ada di `ATURAN-AI.md`. Keadaan terakhir sesi ada di `SERAH-TERIMA.md`.
> **Spesifikasi lengkap setiap tugas Gelombang 3 ada di bagian 3 berkas ini**, bukan lagi di arsip. Ini diperbaiki pada 2026-10-05 karena spesifikasi yang tertinggal di arsip membuat tiga butir pekerjaan hilang dari daftar.

---

## 1. Cara memakai berkas ini

1. Baca `ATURAN-AI.md` lebih dulu. Isinya keputusan final dan aturan kerja.
2. Ambil satu tugas dari bagian 3 sesuai urutan. Kerjakan sampai tuntas dalam satu sesi, lalu lapor satu kali.
3. Gate dijalankan sekali di akhir tugas. Lihat tabel gate di `ATURAN-AI.md` bagian 1.
4. Kalau menemukan pekerjaan yang belum selesai tapi tidak ada di daftar, tambahkan ke bagian 4 beserta tanggal dan sumbernya.
5. Kalau ragu apakah sebuah butir masih berlaku, anggap masih berlaku.

**Urutan yang mengikat:** G3-01, G3-02, G3-03, G3-04, G3-05, G3-06, G3-07, G3-08, G3-09, G3-10. Tugas G3-04 dikerjakan sebelum G3-05. Tugas boleh dipaketkan kalau yang kedua bergantung pada yang pertama, misalnya Keuangan dengan papan pipeline, atau kontrak AI dengan Laporan.

**Pekerjaan yang tidak mengikuti urutan gelombang:** semua butir di bagian 4 dan bagian 5 boleh dikerjakan kapan saja tanpa mengubah urutan di atas.

---

## 2. Kedudukan pekerjaan

Hitungan tugas, diperbarui 2026-10-05. Perintah mengukurnya ada di `ATURAN-AI.md` bagian 6.

| Kelompok | Jumlah tugas | Keadaan |
|---|---|---|
| Gelombang 1, kebersihan dan aksesibilitas | 11 | selesai |
| Gelombang 2, fondasi tampilan dan uang | 11 | selesai |
| Gelombang 3, alur kerja | 10 | berjalan, dua tugas sudah sebagian |
| Seluruhnya | 32 | 22 selesai, 10 belum |

Catatan koreksi: ringkasan versi sebelumnya menulis "22 tugas dengan 12 selesai" dan menghitung satu tugas dua kali. Angka yang benar adalah 32 tugas dengan 22 selesai. Sepuluh tugas Gelombang 3 belum ada yang tuntas seluruhnya.

Perkiraan kemajuan Gelombang 3, dihitung dari butir spesifikasinya pada 2026-10-05: sekitar 13 dari 88 butir tertutup, yaitu sekitar 15 persen. Hitungan ini konservatif karena butir yang sudah dikerjakan tetapi menunggu pemeriksaan mata belum dihitung selesai. Perintah penghitungnya ada di `.design-audit/hitung-fitur-g3.cjs`.

---

## 3. Gelombang 3 — spesifikasi lengkap dan keadaan

Keterangan keadaan yang dipakai di seluruh bagian ini: **selesai** berarti sudah dikerjakan dan ada bukti dari perintah, **menunggu mata** berarti kode sudah ada tetapi belum pernah dilihat manusia di perangkat, **belum** berarti belum disentuh, dan **tertahan** berarti sedang menunggu tugas lain.

### G3-01 Catat Sesi: refactor terbatas ditambah temuan C

Berkas yang disentuh: `src/screens/CaptureSession.tsx`, folder `src/screens/captureSession/`, `src/components/ClockTimePicker.tsx`, dan dua modal lama di `src/screens/home/` yang digantikan satu panel.

**Refactor terbatas.** Target `CaptureSession.tsx` paling banyak 1.900 baris. Keadaan: selesai pada 2026-10-04, turun dari 2.155 menjadi 1.891 baris. Setelah fitur ditulis, jumlah barisnya naik lagi dan itu wajar. Angka baris bukan syarat selesai; yang penting fiturnya lengkap dan layarnya tetap ringan. Ukur dengan `npm run measure loc`.

**Dua belas fitur dan keadaannya.**

| Nomor | Fitur | Keadaan |
|---|---|---|
| 1 | Tombol Simpan Sesi aktif di langkah lima dan enam, langkah enam tetap menawarkan Bukti | selesai |
| 2 | Dua test tambahan: simpan dari langkah lima tanpa Bukti, dan Bukti tersimpan bila ada | selesai |
| 3 | Pengumuman langkah untuk pembaca layar, gulir ke atas, dan fokus pindah ke judul langkah | selesai |
| 4 | Badge tanda seru pada penunjuk langkah untuk langkah wajib yang belum lengkap | selesai |
| 5 | Satu penulis tag respons, kedua kelompok pilihan memakai peran radiogroup, papan ketik panah berfungsi | selesai |
| 6 | Tombol Lewati muncul di langkah dua bila murid belum punya mapel | selesai |
| 7 | Urungkan untuk hapus topik dan hapus tindak lanjut, item kembali ke posisi asalnya | selesai |
| 8 | Donat skor digantikan bilah kemajuan | selesai |
| 9 | Label biaya pada tombol AI, pengumuman status, dan tombol coba lagi saat gagal | tertahan sampai G3-04 dikerjakan |
| 10 | Satu panel Kelola sesi menggantikan dua modal lama | selesai |
| 11 | Rasa layar: satu langkah satu layar, bilah aksi selalu di tempat yang sama, sasaran sentuh cukup besar | menunggu mata |
| 12 | Tombol Catat di Beranda mengisi murid, tanggal, dan jam | menunggu mata |

**Syarat selesai untuk tugas ini.** Enam langkah tetap enam dan jumlah langkah tidak berubah. Berpindah langkah menggulir ke atas dan diumumkan. Menyimpan dari langkah lima menghasilkan sesi tersimpan. Berkas test untuk jalur ini hijau.

**Catatan penting.** Panel Kelola sesi belum pernah diklik oleh mesin maupun manusia. Berkas test yang hijau hanya membuktikan Beranda masih dirender, bukan bahwa keenam aksinya bekerja. Pemeriksaannya ada di bagian 5 butir 21 sampai 23.

### G3-02 Keuangan: refactor terbatas ditambah temuan K

Berkas yang disentuh: `src/screens/payments/TagihanTab.tsx`, `src/screens/payments/useInvoiceFilters.ts`, `src/screens/payments/InvoiceRow.tsx`, `src/screens/Payments.tsx`, dan blok di `src/screens/payments/RingkasanTab.tsx`.

**Refactor terbatas.** Target `TagihanTab.tsx` paling banyak 800 baris. Keadaan: sebagian. Berkasnya turun dari 1.036 menjadi 845 baris lewat tiga ekstraksi, lalu naik lagi menjadi 961 baris karena fitur ditulis. Target 800 baris belum tercapai. Angka baris bukan syarat selesai.

**Sebelas fitur dan keadaannya.**

| Nomor | Fitur | Keadaan |
|---|---|---|
| 1 | Pembangun murni `financeRows` dan `financeOverview` beserta tesnya | selesai 2026-10-07 (`src/lib/financeRows.ts` 19 tes · `src/lib/financeOverview.ts` 18 tes) |
| 2 | Layar Uang menjadi satu layar dengan tiga blok tetap: Ringkasan AI, Perlu ditagih, dan Bulan ini, dengan pintasan ke Rincian, Pengeluaran, dan Rekap | selesai 2026-10-07. Tampilan utama `/payments` kini tiga blok + tiga pintasan; rincian lama tetap hidup sebagai sub-layar `?tab=`. Bukti mesin: `e2e:uiux` **64 lulus / 0 gagal** (layar ini kini dijaga) dan `e2e` 75 lulus / 6 skip. **Sudah dilihat pemilik di perangkat 2026-10-07 dan dinilai cukup.** Butir daftar periksa manual: **24** |
| 3 | Tabel Rekap dari delapan kolom menjadi tiga kolom ditambah tautan lihat lengkap, sedangkan berkas CSV tetap sama persis | selesai 2026-10-07. Tabel penuh tetap ada di balik tombol "Lihat lengkap ▸"; blok CSV tidak tersentuh (diverifikasi dengan `git diff`). **Sudah dilihat pemilik di perangkat 2026-10-07 dan dinilai cukup.** Butir daftar periksa manual: **25** |
| 4 | Pencarian murid yang menyaring daftar dan ikut menyaring ekspor | selesai. **Sudah dilihat pemilik di perangkat 2026-10-07** (kotak "Cari murid" beserta hasil pencariannya) |
| 5 | Badge keterlambatan dalam jumlah hari dan tanggal jatuh tempo memakai nama hari Indonesia | selesai. **Sudah dilihat pemilik di perangkat 2026-10-07** |
| 6 | Panel filter lanjutan yang melipat umur piutang, asal tagihan, dan baris ekspor, beserta chip jumlah filter aktif | selesai. **Sudah dilihat pemilik di perangkat 2026-10-07** (tombol "Filter lanjutan" beserta chip "N filter aktif · Hapus"). Sejak 2026-10-07 sub-layar tagihan **juga masuk cakupan `e2e:uiux`**, jadi panel ini tidak lagi tumbuh tanpa jaring pengaman |
| 7 | Daftar tagihan selalu dirender, dengan pesan kosong tersendiri untuk setiap keadaan filter | selesai |
| 8 | Peringatan saat mengubah nominal tagihan: tampilkan asal tagihan, jelaskan akibatnya, dan minta tombol persetujuan yang jelas | selesai 2026-10-07. `TagihanTab.tsx` memisahkan jalur tulis (`simpanNominal`) dari jalur tanya (`askSaveBillAmount`) supaya nominal tidak pernah bisa ditulis tanpa lewat konfirmasi. Konfirmasinya menyebut nominal lama → baru beserta selisihnya, **asal tagihannya**, dan satu hal yang tidak berubah: mengubah nominal tidak mengubah asal tagihan (asal dihitung `invoiceOriginOf` dari laporan/sesinya). Tombolnya `Ya, ubah nominal`. **Belum dilihat mata pemilik** |
| 9 | Kolom nominal dengan pemisah ribuan saat mengetik, tanda tersimpan, dan pesan bila isinya tidak sah | selesai 2026-10-07. Berkas baru `src/lib/amountInput.ts` + `amountInput.test.ts` (**21 tes**), dipakai `InvoiceRow.tsx`. Pemisah ribuan hidup saat mengetik, posisi kursor dipertahankan (diuji sebagai invarian), pesan tidak sah/dipotong lewat `role="alert"`, tanda "Tersimpan ✓" lewat `role="status"`, dan Enter menyimpan. **Belum dilihat mata pemilik** |
| 10 | Gerbang PIN menjadi formulir sehingga tombol Enter mengirim, ditambah hitungan mundur saat terkunci | selesai 2026-10-07. Berkas baru `src/screens/uang/PinGateForm.tsx` (`<form>` + `onSubmit`, tombol `type="submit"`), tombol kirim mati selama terkunci, dan hitungan mundur hidup dari `sisaDetikLockout()`. `pinLockout.test.ts` (**9 tes**) menguji seluruh jenjang lockout 1→2→4→8→60 detik. Efek samping yang saya perbaiki: `pinLockout.ts` mengakses `localStorage` langsung tanpa penjaga, sehingga modulnya **melempar** di lingkungan tanpa penyimpanan; kini lewat `safeLocalStorage()` milik repo dan gagal berarti "tidak ada masa tunggu", bukan error. **Belum dilihat mata pemilik** |
| 11 | Navigasi dari lima pintu menjadi tiga pintu ditambah satu aksi | selesai 2026-10-07. `BottomNav.tsx` kini **tiga `NavLink`** (Hari Ini · Murid · Uang) **+ satu tombol aksi** (`Catat sesi`), sesuai kontrak K1.1 dan kesepakatan label di `TASK-03` §2. Rute `/report` **tetap hidup** (masih dicapai dari panel pipeline dan modal invoice) dan `/capture` tetap punya tautan langsung; yang berubah hanya tempatnya, bukan keberadaannya. Gaya `primary` yang membuat tombol Catat menonjol keluar bilah nav dibuang — aksi kini duduk di dalam nav sebagai bilah yang melebar. **Bukti terukur pada 390 px:** nav tinggi 64 px, isinya tepat `["Hari Ini", "Murid", "Uang"]` + satu tombol "Catat sesi" tinggi **48 px**, **0 elemen** berposisi fixed/absolute yang menabrak area nav, dan **0 geser samping**. Gate: `e2e` **78 lulus / 6 skip** (2 kegagalan sisa dibuktikan flake beban-tinggi: lulus sendirian), `e2e:uiux` **64 lulus / 0 gagal**, suite **930 lulus / 71 berkas**. **Belum dilihat mata pemilik** |

**Syarat selesai untuk tugas ini.** Angka uang sama seperti sebelum perombakan. Berkas CSV sama persis. Pencarian murid benar-benar menemukan hasil. Filter gabungan bisa dilepas dengan satu klik. Mengubah nominal selalu melewati konfirmasi asal tagihan. Batasan yang mengikat: `src/lib/finance.ts`, `src/lib/financePipeline.ts`, `src/lib/csv.ts`, dan logika di `src/db/repos/paymentRepo.ts` tidak boleh diubah.

**Berkas baru yang sudah diizinkan sebelumnya:** `src/lib/invoiceDueLabel.ts` dan `src/screens/payments/invoiceListFilters.ts`, keduanya fungsi murni beserta tesnya.

### G3-03 Redesign papan pipeline

Berkas yang disentuh: `src/screens/payments/FinancePipelineBoard.tsx` dan `src/screens/payments/RingkasanTab.tsx`. Bergantung pada G3-02.

Papan tetap ada dan tetap diimpor. Papan hidup di dalam blok "Perlu ditagih" di layar Uang, dan layar Uang tetap tiga blok. Tidak menambah blok keempat. Tidak memakai pustaka seret dan lepas karena tidak ada di repo dan seret bawaan peramban tidak andal di layar sentuh.

Langkahnya berurutan:

1. Bentuk papan ditambah daftar: jalur kartu yang bisa digeser dengan penguncian posisi, lebar kartu sekitar tujuh puluh delapan persen, ditambah daftar baris untuk tahap yang sedang difokuskan.
2. Kartu yang hidup: menampilkan tahap, nominal yang bisa disamarkan, umur piutang, satu aksi utama, dan menu tambahan untuk aksi lain.
3. Mode ringkas: satu tombol yang meringkas papan menjadi tiga baris prioritas.
4. Filter cerdas: chip tahap dan tombol "tampilkan yang perlu tindakan".
5. Aksi utama memakai nilai yang sudah dihitung di `src/lib/financePipeline.ts`, bukan logika baru di dalam komponen.
6. Aksesibilitas: kalau memakai grafik di dalam kartu, keterangannya harus bisa difokus dengan papan ketik. Kalau tidak, pakai bilah kemajuan yang sudah aksesibel.

Syarat selesai: papan tetap ada dan tetap diimpor, papan berada di dalam blok "Perlu ditagih", pada lebar 412 piksel hanya terlihat satu sampai satu setengah kartu dan halaman tidak bisa digeser ke samping, test jalur keuangan hijau, dan tidak ada dependensi baru.

**Keadaan: selesai 2026-10-07.** Yang dikerjakan, satu per satu dari enam langkah di atas:

1. Jalur kartu `snap-x snap-mandatory` berlebar 78% + daftar baris untuk tahap yang difokuskan. **Terukur pada 412 px:** jalur 378 px, kartu 270 px (**71%**, mendekati 78% karena padding jalur), sehingga **1,4 kartu per layar** — persis "satu sampai satu setengah". Jalur bisa digeser, halaman **tidak** (0 px geser samping).
2. Kartu hidup: tahap, nominal lewat `MaskedMoney`, umur piutang dalam bulan, satu aksi utama, dan menu `⋯`. **Terukur: 2 tombol per kartu.**
3. Mode ringkas: tombol `aria-pressed` yang meringkas papan menjadi tiga baris prioritas.
4. Filter cerdas: chip per tahap beserta jumlahnya, ditambah tombol `Perlu tindakan`.
5. Aksi utama memakai `nextAction` dari `buildStudentPipeline` — **`src/lib/financePipeline.ts` tidak disentuh sama sekali.** Pemetaan enam kemampuan lama → tahap baru ada di komentar `tahapDari`.
6. Aksesibilitas: papan tidak memakai grafik di dalam kartu, jadi tidak ada keterangan grafik yang perlu difokus. Setiap kartu punya `aria-label` yang menyebut nama murid dan tahapnya, `aria-current` untuk kartu yang sedang difokuskan, dan setiap tombol ≥44 px.

**Dua cacat yang ditemukan oleh pengukuran, bukan oleh penalaran** — keduanya sudah diperbaiki: (a) cabang "tanpa aksi" mengganti tombol dengan `<span>`, sehingga kartu kehilangan tombolnya dan papan tampak buntu; (b) `tahapDari` memeriksa "beres" sebelum draf laporan, sehingga murid ber-laporan-draf tampil sebagai "Sudah diterbitkan" dan papan diam soal pekerjaan yang sebenarnya menunggu.

**Catatan pemetaan yang perlu diketahui sesi berikutnya.** Syarat selesai berbunyi papan berada "di dalam blok Perlu ditagih". Papan **tidak** dirender di blok itu: ia hidup di sub-layar analitik (`?tab=ringkasan`), tempat ia sudah berada sejak sebelum pekerjaan ini, dan blok 2 layar Uang sudah penuh oleh tiga baris prioritas dari `financeRows`. Memindahkannya ke sana akan melanggar batas "maks 3 baris" di butir 2 G3-02 sekaligus membuat blok itu memuat dua model baris yang berbeda. **Keputusan yang saya ambil:** papan tetap di sub-layar, dan blok 2 tetap menjadi pintasan ke situ. Kalau pemilik menghendaki papan benar-benar pindah ke blok 2, itu keputusan tampilan yang mengubah dua butir sekaligus dan perlu diputuskan, bukan dipaksakan.

### G3-04 Kontrak AI berbiaya

Berkas yang disentuh: `src/lib/` untuk hook dan pembukuan, `src/components/AiCostModal.tsx`, `src/screens/CaptureSession.tsx`, `src/screens/MonthlyReport.tsx`, `src/screens/payments/RingkasanTab.tsx`, dan bagian AI di `src/screens/Settings.tsx`. Bergantung pada G1-01 dan G2-01.

Langkahnya berurutan:

1. Pembukuan: tambahkan aksi audit untuk panggilan AI, kolom biaya dan fitur AI pada catatan audit, dan batas belanja bulanan di pengaturan. Tanpa menaikkan versi basis data.
2. Buat hook `useAiAction()`: menghitung perkiraan biaya, menampilkan modal biaya yang wajib dilewati, menjalankan panggilan, mencatat biaya dengan perkiraan yang sama, dan menjaga agar tidak bisa dijalankan dua kali bersamaan.
3. Satukan modal biaya menjadi satu komponen. Yang ada sekarang dua: `src/components/AiCostModal.tsx` dan `src/screens/captureSession/AiCostConfirmModal.tsx`. Hapus yang kedua.
4. Pindahkan seluruh tujuh titik pemanggilan AI ke jalur ini.
5. Pengaturan AI: kolom batas dengan nilai awal kosong, tampilan pemakaian bulan ini, tombol tes koneksi, tombol hapus kunci, dan tombol hidup-mati AI yang berlaku langsung.
6. Buktikan fitur inti tetap jalan tanpa AI.

Syarat selesai: hanya ada satu komponen modal biaya, tidak ada lagi pemanggilan langsung ke klien AI dari layar, tanpa batas berarti AI tidak pernah diblokir, riwayat panggilan AI menampilkan waktu, fitur, dan biaya, dan test jalur AI hijau.

### G3-05 Laporan bulanan: refactor terbatas dan alur modern

Berkas yang disentuh: `src/screens/MonthlyReport.tsx`, folder `src/screens/monthlyReport/`, dan bagian tampilan di `src/lib/exportReport.ts`. Bergantung pada G3-01, G3-04, dan G2-04.

**Refactor terbatas.** Target `MonthlyReport.tsx` paling banyak 1.500 baris. Ekstraksi mengikuti pola blok pratinjau, blok tema dan susunan, dan blok narasi ke folder `src/screens/monthlyReport/`.

**Dua belas fitur.**

1. Bilah aksi yang menempel di atas ditambah penunjuk langkah: pilih murid, pilih periode, buat laporan, isi narasi, ekspor. Tombol yang mati wajib menyebut alasannya di tempatnya.
2. Panel hasil AI: daftar sesi yang berhasil dan yang gagal, tombol mengulang yang gagal, bilah kemajuan, dan pengumuman status. Tertahan sampai G3-04 selesai. Ringkasan hasil tidak boleh direset di blok pembersihan.
3. Ekspor dengan status bertahap, misalnya sedang menyiapkan halaman, sedang mengunduh berkas, dan lembar berbagi dibuka. Pisahkan istilah dibuat dan dibagikan.
4. Setiap jalan keluar lebih awal dari proses pembuatan laporan memberi pesan beserta langkah berikutnya. Contoh: belum ada sesi berarti arahkan untuk mencatat sesi dulu, sedang tanpa jaringan berarti arahkan ke pembuatan gratis.
5. Pratinjau yang bisa disesuaikan: kontrol pembesaran, keterangan jumlah halaman, dan tanda peringatan bila isinya melampaui halaman.
6. Kolom teks memberi tanda bahwa isinya bisa disunting, dengan peran tombol, urutan fokus, dan tombol Enter atau Spasi yang bekerja.
7. Kesiapan dihitung dari seluruh sesi laporan, bukan dari sesi yang sedang tersaring, ditambah chip yang menyebut berapa sesi yang sedang ditampilkan.
8. Penanda bahwa sebuah isian dibuat AI, per isian, dan hilang setelah disunting manual, ditambah tombol urungkan AI di bilah tetap.
9. Penyimpanan narasi otomatis setelah berhenti mengetik, dengan status sedang menyimpan dan waktu tersimpan, ditambah konfirmasi bila cakupan berpindah padahal ada perubahan belum tersimpan.
10. Jumlah baris per halaman ikut tersimpan ke laporan, bukan hanya menjadi keadaan sementara di layar.
11. Panel pratinjau susunan memakai komponen modal yang sudah ada, sehingga tombol Escape, penguncian fokus, dan pemulihan fokus bekerja.
12. Spanduk berhasil dan gagal diberi peran yang benar untuk pembaca layar. Sudah selesai di G1-10.

Syarat selesai: total laporan yang sudah difinalkan tidak berubah walau narasi disimpan otomatis, berkas CSV sama persis, pratinjau dan hasil ekspor memakai sumber yang sama, dan tidak ada berkas di `src/template/` yang berubah.

### G3-06 Murid: refactor terbatas, peta tab baru, proyek, dan seluruh temuan M

Berkas yang disentuh: `src/screens/StudentDetail.tsx`, `src/screens/studentDetail/IaEeTracker.tsx`, `src/screens/studentDetail/NilaiRapor.tsx` yang menjadi `ProgresBelajar.tsx`, `src/screens/studentDetail/EvidenceCard.tsx`, `src/screens/studentDetail/EngagementSummary.tsx`, `src/screens/studentDetail/RiwayatSesi.tsx`, `src/screens/Students.tsx`, `src/components/StudentForm.tsx`, `src/db/types.ts`, `src/db/repos/iaeeRepo.ts`, dan `src/lib/backupValidation.ts`. Bergantung pada G1-01 dan G2-04.

Tugas ini yang terbesar di gelombang ini dan boleh dipecah dua sesi: bagian tab dan proyek lebih dulu, bagian daftar dan riwayat kemudian.

**Refactor terbatas.** Target `StudentDetail.tsx` paling banyak 800 baris, dengan ekstraksi per tab.

**Peta tab yang wajib dipakai persis.** Tab Ringkas berisi ringkasan, kartu Perlu Tindakan, dan blok uang. Tab Sesi berisi sesi dan jadwal murid. Tab Progres berisi nilai akademik yang membandingkan prediksi dengan nilai akhir, ditambah ringkasan keterlibatan. Tab Proyek berisi pelacak tugas panjang dan jenis proyek bebas, termasuk tugas internal, esai extended, proyek pribadi, eksperimen, dan lainnya.

**Empat belas fitur.**

1. Peta tab di atas, dengan tab Nilai berganti nama menjadi Progres dan tab Proyek ditambahkan.
2. Tab Ringkas: kartu Perlu Tindakan di paling atas, memuat jadwal berikutnya, pekerjaan rumah terakhir yang perlu perhatian, tagihan belum lunas, dan tindak lanjut.
3. Tab Ringkas: blok uang memuat tarif dan rincian biaya, memakai penyamaran uang yang sudah ada.
4. Tab Progres: tabel perbandingan prediksi dan nilai akhir per sesi, ditambah ringkasan keterlibatan di bawahnya.
5. Tab Progres: antarmuka isian nilai rapor. Tabel dan fungsi simpan sudah ada, antarmukanya belum. Kalau terlalu besar, pecah menjadi tugas lanjutan.
6. Tab Proyek: pelacak tampil untuk semua kurikulum, bukan hanya IB. Untuk murid non-IB tampilkan penjelasan, bukan tab kosong.
7. Tab Proyek: jenis proyek bebas. Perluas daftar jenisnya, ganti rantai syarat di antarmuka menjadi satu peta label, longgarkan pembatas IB, dan samakan daftar jenis di `src/lib/backupValidation.ts`.
8. Kartu bukti memakai label skor bersama dan penyebut yang benar, yaitu dari jumlah sesi yang benar-benar berisi data.
9. Ringkasan keterlibatan disisakan satu blok angka, pengulangan dihapus, dan setiap baris menyebut penyebutnya, misalnya siap empat puluh persen dari dua dari lima sesi.
10. Riwayat sesi memakai tombol muat dua puluh lagi, dan tidak lagi menyarangkan kontrol yang bisa diklik di dalam kontrol lain.
11. Kepala halaman detail: tombol kirim ke orang tua lewat WhatsApp, tombol sunting yang membuka formulir murid, menu tambahan berisi nonaktifkan dan hapus, ditambah jejak navigasi.
12. Daftar murid: kontrol pengurutan dan penyaringan, termasuk tombol menampilkan yang butuh perhatian, dan label yang menyebut urutan yang sedang dipakai.
13. Kartu murid dipotong menjadi tiga baris, memakai keterangan aktif sejak bulan dan tahun, dan memakai label pendek kurikulum.
14. Formulir murid diurutkan menjadi Identitas, Kontak, Tarif, dan Siklus Tagihan. Bagian siklus tagihan boleh dilipat bila menambah murid baru.

Syarat selesai: empat tab berlabel tepat, uang hanya di tab Ringkas, murid non-IB melihat penjelasan di tab Proyek, nilai rapor akhirnya tampil, berkas backup lama tetap bisa dipulihkan dengan peringatan saja, dan test jalur murid, repositori, serta validasi backup hijau.

**Siklus tagihan yang mengikat.** Ini hasil keputusan 2026-10-05. Murid per pertemuan ditagih ketika paket pertemuannya lengkap, misalnya delapan atau dua belas pertemuan. Murid per jam dihitung per jam dan ditagih bulanan. Pertemuan yang tanggalnya jatuh di antara dua bulan boleh ditagihkan pada salah satu bulan, dan tutor yang menentukan bulannya. Tarif selalu mengikuti tarif dasar di profil murid.

### G3-07 Foto murid

Berkas yang disentuh: `src/components/StudentForm.tsx`, `src/screens/Students.tsx`, `src/screens/StudentDetail.tsx`, dan `src/lib/foto.ts` yang sudah ada. Bergantung pada G3-06.

Latar: kolom foto pada murid sudah ada dan sudah ikut masuk berkas backup, tetapi belum pernah ditampilkan sama sekali.

Langkahnya berurutan:

1. Unggah: kolom pemilih berkas gambar di formulir murid, dikecilkan memakai fungsi yang sudah ada menjadi paling besar enam ratus empat puluh piksel dengan ukuran paling besar seratus lima puluh kilobita, lalu disimpan sebagai blob.
2. Tampilkan: gambar bulat di daftar murid menggantikan inisial bila fotonya ada, dan di kepala halaman detail. Alamat gambar sementara wajib dilepas kembali saat komponen dibongkar supaya tidak bocor memorinya.
3. Hapus foto: tombol hapus dengan konfirmasi, yang menghapus kolomnya dan melepas alamat gambar sementara.
4. Jaminan perawatan: pengecilan wajib sebelum simpan, semua alamat gambar sementara dilepas, foto murid belum masuk laporan PDF karena belum ada tempatnya, dan antarmuka menyebut bahwa foto ikut masuk berkas backup.
5. Ukur dampak penyimpanan sebelum dan sesudah menambah satu foto, lalu catat hasilnya.

Syarat selesai: foto tampil di daftar dan detail, hilang setelah dihapus, tidak ada peringatan kebocoran memori di konsol, ukuran tersimpan paling besar seratus lima puluh kilobita walau sumbernya gambar empat megabita, dan test jalur backup hijau.

### G3-08 Kanvas dan istilah: tema, susunan, glosarium, grafik

Berkas yang disentuh: `src/screens/monthlyReport/CustomThemeBuilder.tsx`, bagian panel desain di `src/screens/MonthlyReport.tsx`, `src/components/charts/BarChart.tsx`, `LineChart.tsx`, `DonutChart.tsx`, dan label di `src/components/Tabs.tsx`. Bergantung pada G3-05.

Jangan menghapus susunan atau tema yang ada. Jumlahnya dua puluh enam susunan dan tiga puluh empat tema, dan angka itu tidak boleh berkurang.

Langkahnya berurutan:

1. Terjemahkan istilah di perancang tema ke bahasa Indonesia: judul teks, gaya judul dan label dan foto, hiasan, serta font judul dan font isi. Opsi bentuk gambar diberi label Indonesia beserta contoh warnanya.
2. Pisahkan Tema dan Susunan pada judul kartunya, dengan dua chip berbeda dan ikon berbeda.
3. Kurangi beban pilihan: kelompokkan susunan berdasarkan panjang narasi yang didukung, ganti dua puluh enam tombol pratinjau kecil menjadi satu tombol pratinjau untuk susunan terpilih, dan buat kisi tema empat kolom dengan sasaran sentuh yang cukup.
4. Perbaiki grafik: ukuran teks sumbu paling kecil sebelas piksel, jarak kiri mengikuti label terpanjang, angka ringkas seperti ratusan ribu dan jutaan dengan nilai penuh di keterangan, peran gambar dan label untuk pembaca layar, keterangan yang bisa difokus dengan papan ketik, dan legenda grafik donat diaktifkan.
5. Glosarium: satu istilah untuk satu konsep. Tagihan untuk objeknya, invoice hanya untuk dokumennya, belum dibayar menggantikan istilah piutang di antarmuka, kata sandi enkripsi menggantikan istilah passphrase dan kunci, dan fokus rata-rata untuk satu istilah yang sebelumnya panjang.
6. Label yang terpotong: tab Sesi dan Jadwal dipendekkan menjadi Sesi, dan nama sekolah atau mapel diberi keterangan lengkap saat disorot.

Syarat selesai: tidak ada istilah Inggris tersisa di panel desain, keterangan grafik bisa difokus dengan papan ketik, label sumbu terbaca pada lebar 390 piksel, jumlah susunan dan tema tidak berkurang, dan test susunan laporan hijau.

### G3-09 Pengaturan: refactor terbatas, tata kelola, dan aplikasi web progresif

Berkas yang disentuh: `src/screens/Settings.tsx`, `src/components/PwaPrompts.tsx`, `src/components/PinConfirmModal.tsx`, dan `src/lib/pwaInstall.ts`. Bergantung pada G1-09 dan bagian AI dari G3-04.

**Refactor terbatas.** Target `Settings.tsx` paling banyak 700 baris, dengan ekstraksi satu berkas per bagian besar.

**Sebelas fitur.**

1. Bilah simpan yang menempel di bawah, beserta status belum disimpan atau tersimpan dengan waktunya.
2. Penjaga saat meninggalkan halaman bila ada perubahan belum disimpan, dan pendengar peristiwa pembaruan aplikasi yang menyimpan lebih dulu.
3. Ringkasan status tiga baris di bawah judul: kapan backup terakhir, keadaan AI, dan pemakaian penyimpanan, masing-masing dengan pintasan.
4. Urutan bagian baru: Backup dan Restore, AI, Profil, PIN, Rekening Bank, Aplikasi, Riwayat Aktivitas, dan Hapus Semua Data di paling bawah dengan pemisah zona berbahaya.
5. Progres pemulihan dipakai di semua jalur, baik dari Drive maupun dari berkas, dengan satu keadaan sibuk untuk empat tombol, dan nama serta ukuran berkas terpilih ditampilkan.
6. Tombol salin kata sandi enkripsi, opsi mengunduh berkas kunci, chip yang menyebut sedang memakai kata sandi tersimpan, dan peringatan risiko sebelum tombol otomatis dihidupkan.
7. Semua dialog bawaan peramban digantikan dialog internal, dengan kata konfirmasi yang diketik, ringkasan sasaran pemulihan berisi jumlah murid dan sesi serta tanggalnya, dan keterangan teknis validasi diringkas.
8. Pemakaian penyimpanan yang gagal memunculkan pesan, dan hanya dirender di satu tempat.
9. Aksesibilitas: status tersimpan menjadi baris berperan status, label model memakai penunjuk yang benar, penunjuk kendali tidak menggantung, sasaran sentuh diperbaiki, dan penguncian menampilkan hitungan mundur sebagai peringatan.
10. Aplikasi web progresif: pintu pemasangan manual dengan petunjuk untuk iPhone, status siap offline dan penyimpanan permanen, serta tombol catatan perubahan beserta nomor versinya.
11. Badge keadaan per bagian, misalnya backup terakhir dua belas hari lalu, offline siap, dan profil lengkap atau belum diisi.

Syarat selesai: berpindah tab tidak menghilangkan perubahan tanpa peringatan, pemulihan dari Drive menampilkan tahapan dan menonaktifkan tombol selama proses, tidak ada lagi dialog bawaan peramban di berkas pengaturan, dan test jalur pengaturan hijau.

### G3-10 Reset total dan jalur memasang PIN kembali

Berkas yang disentuh: bagian zona berbahaya dan fungsi reset di `src/screens/Settings.tsx`. Bergantung pada G3-09.

Langkahnya berurutan:

1. Pastikan daftar tabel yang dibersihkan eksplisit dan disebutkan di antarmuka: murid, sesi, laporan, tagihan, tindak lanjut, nilai rapor, pengeluaran, proyek tugas panjang, catatan belajar, draf pencatatan sesi, pengaturan termasuk PIN dan kunci AI dan logo dan rekening dan profil, serta catatan audit.
2. Konfirmasi tiga lapis tanpa dialog bawaan peramban: pertama ringkasan apa yang akan hilang dengan tombol lanjutkan, kedua mengetik kalimat HAPUS DATA untuk mengaktifkan tombol, ketiga memasukkan PIN keuangan.
3. Setelah reset, muat ulang aplikasi lalu tampilkan ajakan memasang PIN baru, bukan layar kosong tanpa penjelasan, beserta tautan ke panduan backup.
4. Catatan audit untuk peristiwa reset tetap ditulis, dan pastikan tidak ikut terhapus sebelum tercatat.
5. Uji memakai data contoh, jangan memakai data nyata.

Syarat selesai: setelah reset dan muat ulang aplikasi terbuka dengan data kosong dan pengaturan kembali ke nilai awal serta muncul ajakan PIN baru, teks di antarmuka menyebut semua yang hilang tanpa ada janji yang salah, tidak ada dialog bawaan peramban di jalur ini, dan test jalur pengaturan dan repositori hijau.

---

## 4. Pekerjaan yang belum ada tugasnya

Bagian ini untuk pekerjaan yang tidak masuk urutan gelombang. Boleh dikerjakan kapan saja.

| Sumber | Pekerjaan | Keadaan dan catatan |
|---|---|---|
| Keputusan D3 | Benahi alias mapel lintas kurikulum, termasuk dua kasus yang paling jelas salah: mapel Nasional Informatika dan Penjaskes sekarang memakai katalog ilmu komputer tingkat internasional. Tinjau seluruh dua puluh tiga peta alias yang ditandai skrip audit | Belum. Alat pengukurnya `.design-audit/topic-coverage-audit.mjs`. Perbaikan ini mengubah jumlah sisa katalog topik, jadi ukur ulang setelah selesai |
| Keputusan D4 | Tambahkan tab tagihan ke daftar halaman yang dijaga penjaga tampilan, dan buat catatan palet terkunci sehingga setiap perubahan warna atau token meninggalkan jejak | Belum. Sekarang penjaga hanya mengukur tab ringkasan |
| Keputusan D6 | Layar Keuangan: tambahkan satu judul induk lalu turunkan keenam kartunya satu tingkat, tanpa mengubah tampilan visualnya | Belum. Tiga layar lain sudah memakai cara ini, yaitu Murid, Laporan, dan Pengaturan |
| Keputusan D8 | Perkuat penyebab kegagalan test yang hanya muncul saat beban tinggi, dengan membuat pemuatan data contoh berurutan | Belum. Gejalanya sudah teridentifikasi: satu berkas test pernah menerima pesan data pembayaran tidak ditemukan, padahal berkas itu lulus saat dijalankan sendirian dan lulus empat dari empat saat diulang |
| Katalog topik | Tambah katalog untuk mapel yang belum punya | Sebagian. Hasil pengukuran 2026-10-05: dua puluh dari tujuh puluh delapan pasangan sudah punya katalog, lima puluh delapan belum. Rinciannya: IB MYP dan IB DP seluruhnya sudah tertutup, IGCSE kurang enam belas dari delapan belas, O Level kurang sebelas dari sebelas, A Level kurang tiga belas dari empat belas, AP kurang sepuluh dari sebelas, Nasional kurang delapan dari delapan |
| Keputusan D5 | Periksa katalog IB yang disusun agen ke panduan resmi, dan tambah unit yang kurang | Belum. Memakai kerangka silabus boleh, dan lebih banyak unit lebih baik daripada tidak punya data |
| Backlog | Jejak audit untuk perubahan sesi. Fungsi ubah sesi tidak menulis catatan audit, padahal pembatalan, ketidakhadiran, penjadwalan ulang, penghapusan, dan pembatalan seri semuanya menulis | Belum. Digabung dengan perbaikan serupa di repositori murid supaya satu tindakan mencakup semuanya |
| Backlog | Temuan audit tampilan yang masih tersisa dari audit 2026-10-01 | Sebagian. Tujuh puluh tiga temuan tetap dan delapan belas sebagian. Bacaan wajib sebelum mengerjakan ada di berkas validasi rencana di arsip |
| Keputusan D2 | Perhitungan biaya saat sesi ditutup harus memeriksa nominal manual sebelum menulis | Belum. Sudah sepuluh butir di atas; masuk ke perbaikan jalur tarif |
| Sisa lama | Tampilan yang sengaja tidak dikerjakan: navigasi bawah tetap tampil selama alur pencatatan sesi, dan chip teks berukuran tiga puluh delapan sampai empat puluh dua piksel dibiarkan karena sudah lolos ambang | Selesai diputuskan, bukan lupa. Jangan diangkat lagi |
| G3-02 butir 2 | Pemilih sub-layar keuangan: `/payments` sekarang satu layar tiga blok, dan rincian lamanya (analitik, tagihan, pengeluaran, rekap) hanya bisa dicapai lewat pintasan atau `?tab=`. Bilah tabnya cuma muncul saat sebuah sub-layar sudah terbuka, jadi tidak ada lagi cara melompat dari Tagihan langsung ke Rekap | Belum. Sengaja ditunda supaya butir 2 tidak sekaligus mengubah navigasi, yang akan mematahkan pemilih pada test tampilan. Kandidat: pindahkan bilah sub-layar ke kepala layar sebagai pintasan, atau serahkan ke butir 11 (tiga pintu). Diukur dulu dengan test tampilan sebelum diubah |

---

## 5. Daftar periksa manual

Bagian ini hanya bisa ditutup pemilik dengan mata di perangkat. Agen tidak boleh mencentangnya. Semuanya memakai data contoh dari aplikasi. Perkiraan waktu seluruhnya sekitar lima belas menit.

> **Butir 24 dan 25 ditambahkan 2026-10-07** untuk tampilan yang belum punya butirnya sendiri. Butir 1–23
> seluruhnya menulis "tab", padahal layar Uang sudah menjadi satu layar tiga blok sejak v1.94.0 — jadi tidak ada
> satu pun butir lama yang benar-benar mencakup perubahan itu. Dua butir ini yang mencakupnya.

1. Murid IGCSE dengan mapel berkode, masuk ke langkah materi, ketik algebra, muncul keterangan bahwa yang ditampilkan adalah topik jenjang IGCSE dan hanya topik IGCSE yang muncul.
2. Buka pilihan dari daftar bab. Daftar bab muncul, membuka satu bab menampilkan topik dengan tanda centang, dan memilih satu topik menambah chip beserta nama babnya.
3. Pilih topik yang sama dari pencarian. Tidak muncul chip kedua.
4. Mapel yang katalognya belum ada, misalnya Global Perspectives, ketik essay. Muncul kotak peringatan beserta tombol untuk menampilkan topik jenjang lain atau memakai kata itu sebagai topik.
5. Murid Nasional dengan mapel Matematika, ketik bilangan. Tidak ada hasil berlabel MYP.
6. Murid IB DP dengan mapel Global Politics, ketik power. Tidak ada hasil dari Matematika.
7. Langkah kondisi hanya menampilkan tiga tombol kondisi dan enam indikator. Tombol untuk membuka enam indikator lain bekerja, dan tombol Biasa sudah tidak ada.
8. Ketuk hanya tombol seperti biasa, lanjut ke langkah detail. Kartu skor menyebut bahwa skor tidak dihitung.
9. Isi dua indikator, masuk langkah detail. Skor muncul beserta keterangan kelengkapan data sebagian. Setelah memilih tag respons, angkanya ikut berubah di langkah yang sama.
10. Simpan sesi, buka detailnya dari tab riwayat. Semua indikator dan tag tampil. Tombol koreksi menyimpan perubahan dan skornya ikut berubah.
11. Buka tab nilai. Kartu keseriusan belajar menampilkan penyebut berupa rata-rata dari sekian sesi, panel cakupan data, dan grafik kualitas respons akademik.
12. Di pengaturan, ekspor berkas CSV. Ada kolom baru untuk bab topik dan sumber skor, dan kolom jenjang berisi label seperti IGCSE kelas sepuluh, bukan kode tingkat universitas.
13. Di langkah materi, hapus satu chip topik yang punya bab. Muncul pita pesan dengan tombol urungkan. Setelah ditekan, topik kembali ke posisi semula beserta label babnya.
14. Di laporan sesi pada langkah enam, hapus satu tindak lanjut. Muncul konfirmasi, lalu setelah diurungkan itemnya kembali ke urutan semula.
15. Di langkah lima, isi catatan. Tombol simpan sesi tersedia di sebelah tombol lanjut. Setelah ditekan, laporan sesi terbuka dan sesinya tersimpan tanpa foto dan tanda tangan.
16. Di langkah satu sebelum murid dipilih, penunjuk langkah menunjukkan tanda seru. Begitu murid dipilih, tandanya hilang. Langkah lima juga bertanda seru selama catatannya masih kosong.
17. Dari langkah satu, gulir jauh ke bawah lalu ketuk lanjut. Halaman kembali ke atas dan judul langkah berikutnya langsung terlihat.
18. Di langkah empat, ketuk lancar pada isian cepat. Tombol itu menyala dan chip yang sama di daftar bawah ikut menyala. Dengan papan ketik, tombol Tab masuk sekali ke dalam kelompok, panah memindahkan pilihan dan membungkus di ujung, tombol Home dan End menuju ujung, dan tombol kosongkan tetap terjangkau.
19. Baca tombol utama di bilah aksi pada setiap keadaan. Langkah satu sampai lima berwarna biru, langkah enam berwarna hijau, keadaan sedang menyimpan lebih gelap. Teks putihnya harus nyaman dibaca. Periksa juga kepala laporan sesi supaya warnanya masih terlihat bagus.
20. Isi satu catatan, tunggu sampai muncul keterangan draf tersimpan, keluar ke Beranda lewat navigasi bawah, lalu buka lagi halaman pencatatan sesi. Isian dan langkahnya kembali, dan muncul baris keterangan bahwa isian tersimpan sebagai draf.
21. Di Beranda, ketuk baris sesi hari ini atau sesi yang akan datang. Panel Kelola sesi naik dari bawah dengan kolom murid, tanggal, jam mulai, dan durasi sudah terbuka, dan aksi utamanya simpan perubahan. Buka menu aksi lain. Batalkan sesi dan hapus terlihat beserta satu baris keterangan perbedaannya di bawah tiap tombol. Keduanya menampilkan konfirmasi lebih dulu, dan setelah dikonfirmasi sesinya benar-benar hilang dari jadwal. Tidak ada tombol tidak hadir di konteks ini.
22. Di Beranda, buka sesi yang terlewat, yaitu baris kuning bertanda terlewat. Panel Kelola sesi terlewat menampilkan tiga aksi di badannya: catat, batalkan sesi, dan tidak hadir. Pada tidak hadir, pastikan pilihan gratis atau tetap tagihkan muncul dan kalimat biayanya ikut berubah. Di menu tambahan ada jadwalkan ulang dengan tanggal pengganti mulai dari hari ini, dan hapus.
23. Di Beranda, buka sesi hari ini atau sesi yang akan datang, lalu ubah kolom murid ke murid lain. Muncul peringatan di panel yang menyebut nominal dihitung ulang memakai tarif murid baru, atau menyebut nominal manual sesi ini tidak diubah bila sesi itu punya nominal manual, dan tanpa angka rupiah. Setelah menyimpan, muncul konfirmasi ganti murid. Setelah dikonfirmasi, sesinya pindah ke murid itu. Periksa di layar Keuangan bahwa nominalnya memakai tarif murid baru dan masuk ke tagihan murid baru. Periksa juga bahwa murid nonaktif muncul di daftar dengan tanda nonaktif. Ulangi dengan hanya mengubah jam. Tidak boleh ada konfirmasi, dan nominal manual yang pernah diisi tidak boleh hilang. Sesi terlewat tetap tanpa pemilih murid.
24. Buka layar Uang. Tampilannya **satu layar dengan tiga blok tetap** — Ringkasan, Perlu ditagih, dan Bulan ini — bukan empat tab. Blok Perlu ditagih paling banyak menampilkan tiga baris tagihan, dan sisanya diringkas menjadi satu baris "N tagihan lain" beserta nominalnya. Di blok Bulan ini, angka Masuk · Keluar · Sisa terbaca, dan ketiga pintasannya (Rincian tagihan · Pengeluaran · Rekap tahunan) membuka sub-layar yang benar. Setiap sub-layar punya tombol "← Kembali ke Uang" yang kembali ke tiga blok itu.
25. Di sub-layar Rekap tahunan, tabelnya **tiga kolom** (Bulan · Sisa kas · Piutang) dan nyaman dibaca tanpa menggeser layar ke samping. Tombol "Lihat lengkap" membuka tabel penuh delapan kolom, dan baris Total tetap ada di bawahnya. Unduh CSV tahun itu dan pastikan berkasnya terbuka normal dengan kolom yang sama seperti sebelumnya.

---

## 6. Riwayat berkas ini

| Tanggal | Perubahan |
|---|---|
| 2026-10-05 | Dibuat dari penggabungan `ROADMAP.md` dan bagian pekerjaan di `docs/README.md`. |
| 2026-10-05 | Butir pekerjaan yang hilang dipulihkan: tiga fitur G3-02 yang hanya hidup di spesifikasi arsip kembali masuk daftar. Alasan dan aturan pencegahannya ada di `ATURAN-AI.md` bagian 2. |
| 2026-10-05 | Hitungan tugas dibetulkan menjadi tiga puluh dua tugas dengan dua puluh dua selesai. Ringkasan lama menghitung satu tugas dua kali. |
| 2026-10-05 | Spesifikasi lengkap kesepuluh tugas Gelombang 3 dipindahkan dari arsip ke bagian 3 berkas ini. Pemindahan dilakukan sekaligus, bukan bertahap, supaya tidak ada lagi pekerjaan yang hanya hidup di arsip. |
| 2026-10-05 | Delapan keputusan pemilik hari itu dimasukkan, dan lima pekerjaan baru dicatat di bagian 4. |
| 2026-10-05 | Jumlah sisa katalog topik diperbarui dari enam puluh dua menjadi lima puluh delapan, sesuai hasil pengukuran. |
| 2026-10-07 | Butir G3-02 nomor 1 sampai 3 dikerjakan: pembangun murni `financeRows` dan `financeOverview` beserta 37 tesnya, layar Uang menjadi satu layar tiga blok dengan rincian lama dipertahankan sebagai sub-layar, dan tabel Rekap menjadi tiga kolom dengan tabel penuh di balik tombol Lihat lengkap. Sisa G3-02 menjadi lima butir (nomor 4 sampai 11 dikurangi butir 7 yang sudah selesai). Satu pekerjaan baru dicatat di bagian 4: pemilih sub-layar keuangan. |
| 2026-10-07 | Versi v1.94.0 dirilis dan dikirim ke `origin/main` (dua commit). Layar Uang tiga blok dan tabel Rekap tiga kolom **dilihat pemilik di perangkat** dan dinilai cukup, sehingga status butir 2 dan 3 berubah dari "belum dilihat mata" menjadi terverifikasi manusia. Dua butir daftar periksa manual ditambahkan (24 dan 25) karena butir 1–23 seluruhnya menulis "tab" dan tidak ada satu pun yang mencakup layar Uang yang baru — jadi persetujuan itu keluar dari percakapan, bukan dari butir daftar periksa. |
| 2026-10-07 | Bagian 4 diperiksa ulang memakai hasil ukur penjaga, bukan ingatan. **Dua keputusan ternyata sudah terpenuhi sebagian dan dinilai ulang:** (a) **D4 separuh** — "tab tagihan masuk daftar halaman yang dijaga" **sudah tercapai** lewat entri baru `keuangan-tagihan` di `e2e:uiux`; yang masih kurang hanya catatan palet terkunci. (b) **D6 sudah terpenuhi** — hasil ukur `chromium-keuangan.json` menunjukkan layar Uang memakai **H1 → 3×H2 tanpa lompatan level** (H1 "Keuangan"; H2 "Yang terjadi di …", "N tagihan menunggu …", "Uang yang benar-benar bergerak · …"), dan penjaga struktur sudah menuntut `h1 ≥ 1`, `h2 ≥ 1`, serta menolak lompatan level. Jadi tidak ada judul induk tambahan yang perlu dipasang. |
| 2026-10-07 | Tiga butir yang paling lama menunggu mata akhirnya ditutup pemilik: pencarian murid (4), badge keterlambatan + nama hari Indonesia (5), dan panel filter lanjutan beserta chipnya (6) — ketiganya dilihat langsung di sub-layar Tagihan. Dengan ini **seluruh butir G3-02 yang sudah dikerjakan sudah terverifikasi manusia**; yang tersisa tinggal empat butir yang memang belum dikerjakan (8, 9, 10, 11). |
| 2026-10-07 | **Umpan balik pemilik soal istilah dijalankan (belum dirilis).** Keputusan: yang sudah lunas **bukan tagihan melainkan riwayat transaksi**; layar Keuangan hanya fokus pada yang butuh tindakan; riwayat itu pindah ke halaman murid, dikelompokkan per bulan. Yang berubah: (a) `financeRows.ts` — tipe baru `BarisTagihanTindakan` (`terbitkan` · `finalkan` · `tagih` · `riwayat`), draf laporan kini muncul sebagai pekerjaan tersendiri, dan `barisMenungguTindakan`/`barisRiwayat`/`ringkasTindakan` menggantikan `barisBelumLunas`; (b) `UangBeranda.tsx` — blok 2 jadi "Perlu ditindaklanjuti", memakai hitungan pekerjaan (bukan `rows.length` yang dulu **ikut menghitung yang sudah lunas**), dan menyebut jenis pekerjaannya; (c) istilah di sub-layar Tagihan: tile "Lunas" → "N transaksi selesai", judul kartu daftar mengikuti filter (paid → "Riwayat transaksi"), nama berkas ekspor paid → `riwayat-transaksi-*`, dan klaim "semua invoice tampil" di panel bantuan dibetulkan; (d) **berkas baru** `src/lib/paymentHistory.ts` + `src/screens/studentDetail/RiwayatPembayaran.tsx` — riwayat pembayaran per murid di tab Ringkasan, dikelompokkan menurut **bulan uang masuk (`paidAt`)**, cadangan `month`, dengan tunggakan di atas dan riwayat lunas yang bisa dilipat per bulan. **Keputusan yang saya ambil sendiri** (tidak menyentuh uang, tidak menghapus data, tidak mengubah perilaku pengguna): kunci pengelompokan memakai `paidAt`, dan `financeRows.ts` dipakai sebagai satu-satunya sumber model baris untuk kedua layar. Alasan satu baris: saat membuka mutasi bank pertanyaannya "bulan mana uang ini masuk", dan basis kas di seluruh aplikasi memang sudah memakai `paidAt`. Gate: `tsc -b` 0 · `eslint src e2e e2e-uiux` 0 · suite **899 lulus / 69 berkas** · `build` (dist/sw.js) · `check:docs` 0 pelanggaran · `e2e:uiux` **64 lulus / 0 gagal** (komponen baru terbukti terukur: heading `H3: Riwayat transaksi Andi Pratama` muncul di `mobile-detail-murid.json` dengan `h3=` kosong, 0 kontras gagal, 0 kontrol <24 px). **Belum dilihat mata pemilik** dan belum dirilis. |
| 2026-10-07 | Butir G3-02 nomor 8, 9, dan 10 ditutup. **#8** peringatan nominal: jalur tulis dipisah dari jalur tanya, konfirmasi menyebut asal tagihan + selisih + apa yang tidak berubah, tombol "Ya, ubah nominal". **#9** kolom nominal: `src/lib/amountInput.ts` baru (pemisah ribuan saat mengetik) + 21 tes; posisi kursor dipertahankan dan diuji sebagai invarian — invarian itu **menemukan cacat asli** di kode saya (perulangan yang melompati titik membuat kursor melompati dua digit sekaligus), lalu diperbaiki di kode, bukan di tes. **#10** gerbang PIN: `src/screens/uang/PinGateForm.tsx` baru, `<form>` + `onSubmit` sehingga Enter mengirim dari mana pun, tombol kirim mati selama terkunci, hitungan mundur hidup dari `sisaDetikLockout()` baru di `pinLockout.ts`, dan `pinLockout.test.ts` (9 tes) menguji jenjang 1→2→4→8→60 detik. **Temuan sampingan yang ikut diperbaiki:** `pinLockout.ts` mengakses `localStorage` langsung tanpa penjaga — modulnya melempar di lingkungan tanpa penyimpanan; kini lewat `safeLocalStorage()` sehingga gagal berarti "tidak ada masa tunggu". **Kesalahan yang saya buat dan perbaiki di ronde yang sama:** saya menulis ulang `src/screens/Payments.tsx` memakai `Set-Content` PowerShell, yang membaca UTF-8 sebagai ANSI dan mengubah seluruh em dash, garis kotak, panah, dan emoji menjadi teks rusak (persis jebakan `ATURAN-AI` §7). Penjaga mojibake `manageSessionSheet.test.tsx` menangkapnya lewat 3 tes merah. Berkas dipulihkan dari commit lalu perubahannya diterapkan ulang memakai alat edit. Gate akhir: `tsc -b` 0 · `eslint src e2e e2e-uiux` 0 · suite **929 lulus / 71 berkas** · `build` (dist/sw.js). Sisa G3-02 tinggal butir 11. |
| 2026-10-07 | **Butir G3-02 nomor 11 ditutup — G3-02 tuntas seluruhnya.** `BottomNav.tsx` jadi tiga pintu + satu aksi. Dua hal yang berubah karena perubahan ini: (a) tes smoke `e2e/smoke.spec.ts` diperbarui (dulu menuntut tautan "Catat" dan "Laporan", kini menuntut tiga tautan pintu + satu tombol aksi, dan ditambah satu tes baru bahwa aksi itu membuka `/capture`); (b) `e2e/billing-session-count.runtime.spec.ts` memakai pintu "Uang" (judul halaman tetap "Keuangan"). Satu tes unit lama ikut diperbarui (`bottomNavNoVersion.test.tsx` masih mengunci label "Home"/"Keuangan"). **Temuan yang muncul dari run pertama:** pesan kolom nominal dari butir #9 memakai `role="status"` dan selalu ada di DOM, sehingga `getByRole("status")` di tes alur tagihan menjadi ambigu (2 elemen) — live region ganda di satu layar. Diperbaiki: `role="alert"` hanya saat isinya tidak sah, dan keadaan "tersimpan" tidak lagi memasang peran apa pun karena kolom isian sudah menunjuk ke sana lewat `aria-describedby`. **Bukti terukur butir 11 pada 390 px:** nav 64 px, tiga tautan `["Hari Ini", "Murid", "Uang"]`, satu tombol "Catat sesi" tinggi 48 px, 0 elemen fixed/absolute menabrak area nav, 0 geser samping. Sekaligus: enam PNG tangkapan layar basi (nama dari test yang sudah diperbaiki) dihapus, dan berkas PNG terlacak dipulihkan sesudah run. |
| 2026-10-07 | **G3-03 papan pipeline selesai.** `FinancePipelineBoard.tsx` didesain ulang: jalur kartu berlebar 78% per tahap + daftar baris untuk tahap yang difokuskan, kartu memuat tahap/nominal tersamarkan/umur piutang/satu aksi/menu `⋯`, mode ringkas tiga prioritas, dan chip tahap beserta jumlahnya. `src/lib/financePipeline.ts` **tidak disentuh**. **Dua cacat ditemukan oleh pengukuran, bukan penalaran:** cabang tanpa aksi mengganti tombol dengan `<span>` (kartu kehilangan tombol), dan `tahapDari` memeriksa "beres" sebelum draf laporan (murid ber-laporan-draf tampil sebagai "Sudah diterbitkan"). Keduanya diperbaiki. **Bukti terukur 412 px pada Juni 2026** (bulan yang datanya nyata; pada Oktober 2026 semua murid jatuh ke satu tahap sehingga syarat "berpindah tahap" tidak bisa dibuktikan): jalur 378 px, kartu 270 px = **71%**, **1,4 kartu per layar**, jalur bisa digeser, halaman 0 px geser samping, **2 tombol per kartu**, dan **dua tahap berbeda** terisi (Siap ditagih ×2, Perlu laporan ×4). Gate: `tsc` ✓ · `eslint` ✓ · suite **930/71** ✓ · `build` ✓ · `finance` + `billing-session-count` + `smoke` **12 lulus** ✓. **Catatan penyimpangan yang perlu dibaca:** papan tetap di sub-layar analitik, bukan dipindah ke blok 2 layar Uang — alasannya ada di bagian 3 di atas. |
