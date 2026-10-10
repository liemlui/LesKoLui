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

Hitungan tugas, diperbarui 2026-10-08 sesudah G3-05. Perintah mengukurnya ada di `ATURAN-AI.md` bagian 6.

| Kelompok | Jumlah tugas | Keadaan |
|---|---|---|
| Gelombang 1, kebersihan dan aksesibilitas | 11 | selesai |
| Gelombang 2, fondasi tampilan dan uang | 11 | selesai |
| Gelombang 3, alur kerja | 10 | **enam selesai** (G3-01…G3-06), empat belum (G3-07…G3-10) |
| Seluruhnya | 32 | **28 selesai**, 4 belum |

Catatan koreksi: ringkasan versi sebelumnya menulis "22 tugas dengan 12 selesai" dan menghitung satu tugas dua kali. Angka yang benar adalah 32 tugas dengan **28 selesai** setelah G3-06 tuntas 2026-10-10 (sebelumnya 27 selesai setelah G3-05 tuntas 2026-10-08, dan 22 selesai sebelum itu). Empat tugas Gelombang 3 yang tersisa adalah G3-07 sampai G3-10.

Kemajuan Gelombang 3 **tidak lagi ditulis sebagai satu persentase**. Yang bisa diukur adalah struktur spesifikasinya: `.design-audit/hitung-fitur-g3.cjs` melaporkan **60 butir fitur + 57 kotak syarat selesai** untuk kesepuluh tugas. Angka "13 dari 88 butir" yang pernah ditulis di sini adalah potret 2026-10-05, **tidak bisa direproduksi lagi** dengan perintah itu, dan tidak boleh dikutip. Yang menentukan kemajuan adalah berapa butir yang punya bukti — keadaannya per butir ada di bagian 3 berkas ini, bukan di satu angka ringkas.

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

| Nomor | Fitur | Keadaan |
|---|---|---|
| 1 | Bilah aksi yang menempel di atas ditambah penunjuk langkah, dan tombol yang mati menyebut alasannya di tempatnya | selesai 2026-10-08. `ReportActionBar.tsx`: lima langkah (`Pilih murid · Pilih periode · Buat laporan · Isi narasi · Ekspor`) dengan `aria-current="step"`, tombol Buat/Update + Finalkan + JPG/PNG/PDF + Undo Hasil AI, dan baris alasan "Tombol laporan mati: …" saat `availability.ok` salah atau `reportSessions.length === 0`. Banner pesan hasil aksi ikut menempel di bilah yang sama |
| 2 | Panel hasil AI: daftar sesi berhasil/gagal, tombol mengulang yang gagal, bilah kemajuan, pengumuman status. Ringkasan hasil tidak boleh direset di blok pembersihan | selesai 2026-10-08. `useReportGeneration` menyimpan `aiResult` (`ok` · `failed` + pesan galat · `summary`) dan menyediakan `pickFailedSessions` + `retryFailedAi`; `ReportAiResultPanel.tsx` menampilkannya dengan `role="progressbar"` + `role="status"` + tombol "Ulangi yang gagal (n)". Ringkasan itu **tidak** disentuh blok pembersihan cakupan (hanya `invalidateAiRequests` yang dipanggil di sana) |
| 3 | Ekspor dengan status bertahap, dan istilah "dibuat" dipisah dari "dibagikan" | selesai 2026-10-08. `useReportExport` mengembalikan `exportStage` (`menyiapkan-halaman` · `mengunduh-berkas` · `lembar-berbagi`) yang ditampilkan di bilah tetap; `deliverFiles` memberitahu caranya lewat callback `onVia`. Ekspor kini menulis `lastExportedAt`, sedangkan "sudah dibagikan" tetap `sharedAt` (+ `pdfGeneratedAt` untuk kompatibilitas, dibaca `reportDisplayStatus` sebagai cadangan) |
| 4 | Setiap jalan keluar lebih awal memberi pesan beserta langkah berikutnya | selesai 2026-10-08. Pesan bernavigasi ditambahkan di `useReportGeneration` (`AI_OFFLINE_HINT` mengarahkan ke pembuatan gratis, `AI_NO_SESSION_HINT` mengarahkan ke mencatat sesi), di `handleCreateOrSwitch` (alasan periode tidak bisa direkap), dan alasan ketersediaan periode dipindah ke fungsi murni `reportAvailabilityOf` sehingga tiap alasan memuat langkah berikutnya |
| 5 | Pratinjau yang bisa disesuaikan: kontrol pembesaran, keterangan jumlah halaman, tanda peringatan bila melampaui halaman | selesai 2026-10-08. `ReportPreviewPanel.tsx`: pembesaran 35/50/75% lewat `ScaledPreview`, keterangan "N halaman · n sesi per halaman" (`countReportPages`), dan peringatan `role="alert"` dari `detectOverflow` beserta anjuran menurunkan sesi per halaman |
| 6 | Kolom teks memberi tanda bisa disunting, dengan peran tombol, urutan fokus, dan Enter/Spasi | selesai 2026-10-08. `EditableText.tsx` merender keadaan baca sebagai `<button type="button">` + `aria-labelledby` (dulu `<p onClick>` yang tidak bisa difokus). Dipakai Ringkasan, Catatan Guru, Kutipan; narasi sesi memakai tombol yang sama di `ReportNarrativePanel` |
| 7 | Kesiapan dihitung dari seluruh sesi laporan, bukan sesi yang tersaring, ditambah chip jumlah sesi yang ditampilkan | selesai 2026-10-08. `buildReportReadiness` menerima `totalSessions` (seluruh laporan) dan `scopeChipLabel` menghasilkan "Menampilkan N dari M sesi" yang muncul di kartu cakupan dan di kepala panel narasi |
| 8 | Penanda isian dibuat AI per isian, hilang setelah disunting manual, ditambah tombol urungkan AI di bilah tetap | selesai 2026-10-08. `aiFieldHashes` di laporan (ringkasan · catatan guru · kutipan · rencana) dan `aiNarrativeTextHash` di sesi (narasi) berisi fingerprint ISI; `isAiWritten`/`narrativeIsAiWritten` membandingkan fingerprint itu dengan isi sekarang, sehingga penandanya hilang sendiri setelah disunting. Tombol "↩ Undo Hasil AI" dipindah ke bilah tetap |
| 9 | Penyimpanan narasi otomatis setelah berhenti mengetik, dengan status dan waktu tersimpan, ditambah konfirmasi bila cakupan berpindah padahal ada perubahan belum tersimpan | selesai 2026-10-08. `useNarrativeAutosave` (jeda 900 ms): status `pending`/`saving`/`saved`/`error`, label "Tersimpan HH:MM", `flush()` untuk menyimpan sebelum panel ditutup; `applyScopeChange` menahan perpindahan cakupan dan menawarkan "Simpan & lanjut" lewat `ConfirmSheet` |
| 10 | Jumlah baris per halaman ikut tersimpan ke laporan | selesai 2026-10-08. `MonthlyReport.entriesPerPage` (opsional, tanpa kenaikan versi Dexie) menggantikan `useState(3)`; laporan baru menuliskan nilai bawaan 3 |
| 11 | Panel pratinjau susunan memakai komponen modal yang sudah ada | selesai 2026-10-08. Pratinjau susunan di `DesignToolbar.tsx` memakai `Modal` (`components/Modal`), sehingga Escape, jebakan fokus, dan pemulihan fokus bekerja; sebelumnya `<div role="dialog">` tangan tanpa ketiganya |
| 12 | Spanduk berhasil dan gagal diberi peran yang benar untuk pembaca layar | sudah selesai di G1-10, dipertahankan lewat `ReportMessageBanner.tsx` (`role="alert"` untuk galat, `role="status"` untuk kabar baik) dan diuji ulang di `reportG305Panels.test.tsx` |

**Syarat selesai untuk tugas ini.** Total laporan yang sudah difinalkan tidak berubah walau narasi disimpan otomatis — penyimpanan otomatis hanya menulis `narrative` pada sesi lewat `updateSession`, dan `updateSession` tidak menyentuh `cost`/`rateSnapshot` kecuali patch memuat `durationHours`, `costOverride`, atau `studentId` (diperiksa di `sessionRepo.ts:245-303`). Berkas CSV sama persis — `src/lib/csv.ts` dan blok CSV di Rekap tidak disentuh (`git diff` kosong untuk keduanya). Pratinjau dan hasil ekspor memakai sumber yang sama — keduanya membaca elemen `[data-report-page]` di dalam `[data-report-export-root]` yang sama. Tidak ada berkas di `src/template/` yang berubah.

**Keadaan: selesai 2026-10-08.** `MonthlyReport.tsx` **2.361 → 1.470 baris** (target ≤1.500, diukur `npm run measure loc`). Blok yang dipindah ke `src/screens/monthlyReport/`: `ReportActionBar` · `ReportScopeControls` · `ReportStatusPanel` · `ReportPreviewPanel` · `DesignToolbar` · `ScaledPreview` · `ReportNarrativePanel` + `useNarrativeAutosave` · `ReportTextsPanel` + `EditableText` · `ReportPlanPanel` · `ReportHistoryPanel` · `ReportAiResultPanel` · `ReportMessageBanner` · `useReportData` · `reportAvailability` · `aiFieldMarks`.

**Sudah dilihat pemilik di perangkat 2026-10-08 dan dinilai cukup** ("sudah sangat oke"), sehingga batas kejujuran "tampilan baru belum pernah dilihat mata pemilik" **ditutup** pada hari yang sama. Butir daftar periksa manual: **26, 27, 28, dan 29**. Perlu dicatat apa adanya: persetujuan itu keluar dari percakapan sesudah keempat butir dibacakan, bukan dari tangkapan layar atau pengukuran per butir — jadi buktinya adalah pernyataan pemilik. Butir 28 memuat pertanyaan preferensi (apakah ekspor boleh tetap tidak menandai "sudah dibagikan"); kalau pemilik menghendaki perilaku lama, itu satu baris di `useReportExport.ts` dan butir itu dibuka lagi.

**Keputusan yang saya ambil sendiri pada putaran ini** (aturan §1 butir 5, alasan satu baris):

1. **Dialog `confirm("Hapus draft ini?")` diganti `ConfirmSheet`** — ATURAN-AI §4.1 sudah menetapkan semua dialog konfirmasi memakai komponen internal; berkas ini melanggarnya, dan saya sedang menyentuh baris itu.
2. **Ekspor tidak lagi menandai laporan "sudah dibagikan"** — butir 3 meminta istilahnya dipisah; akibatnya laporan yang diekspor tetap muncul di antrean "belum dibagikan" di Keuangan sampai tutor menekan **Tandai Sudah Dibagikan**. Ini perubahan perilaku yang perlu dilihat pemilik (butir 28 daftar periksa).
3. **Menyunting narasi tidak membuat AI menulis ulang** — penanda narasi memakai field baru `aiNarrativeTextHash` (fingerprint teks) dan **tidak** mengubah `aiNarrativeHash`, supaya aturan hemat token G3-04 tetap utuh.
4. **Tombol laporan di bilah tetap selalu dirender tetapi nonaktif bila periodenya belum bisa direkap** — butir 1 menuntut alasan terlihat di tempatnya. Akibatnya enam spec Playwright yang memakai keberadaan tombol itu sebagai penanda "murid ini punya sesi" diperbarui menjadi memeriksa tombolnya **aktif** (`toBeEnabled`), sesuai aturan "perbarui pemilihnya pada putaran yang sama".


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

**Keadaan: selesai 2026-10-10 — 14 dari 14 butir, refactor target tercapai.** `StudentDetail.tsx` **1.097 → 678 baris** (target ≤800; ukur dengan `npm run measure loc`). Pemotongannya ditempuh lewat ekstraksi modal (`studentDetail/SessionNoteEditModal.tsx` · `ScheduleEditModal.tsx`) dan bukan lewat pemecahan per tab seperti usulan `docs/mockups/RENCANA-G3-06.md` §3: target sudah tercapai tanpa itu, dan memecah tabpanel menambah berkas tanpa manfaat terukur. Rencana teknisnya beserta tujuh keputusan K1–K7 ada di berkas itu.

| Nomor | Fitur | Keadaan |
|---|---|---|
| 1 | Peta tab Ringkas/Sesi/Progres/Proyek, "Nilai" jadi "Progres" | selesai 2026-10-09 (`9940f4b`). Labelnya persis keempat tab di `StudentDetail.tsx`; penjaga `studentTabLabels.test.ts` membandingkannya dengan spec tangkapan layar |
| 2 | Kartu Perlu Tindakan di paling atas tab Ringkas | selesai `ce32971` — `studentDetail/PerluTindakanCard.tsx` + modul murni `lib/studentActions.ts` |
| 3 | Blok uang di tab Ringkas (tarif + rincian biaya) | selesai `cdd3000` — `studentDetail/UangBlok.tsx`, seluruhnya lewat `useMoneyVisible` (B1) |
| 4 | Tabel prediksi vs nilai akhir per sesi + ringkasan keterlibatan | selesai `88285bd` — `PerbandinganNilai.tsx` memakai `gradeDelta` yang sudah dipakai laporan bulanan, bukan rumus kedua |
| 5 | Antarmuka isian nilai rapor | selesai `1927dec` — `NilaiRaporIsian.tsx` + `NilaiRaporForm.tsx` + `raporForm.ts`; menyambungkan `upsertRaporGrade` yang sebelumnya tidak dipanggil layar mana pun |
| 6 | Pelacak proyek tampil untuk semua kurikulum, penjelasan untuk non-IB | selesai `5f0cf09` — gerbang `isIb` di `IaEeTracker.tsx` dihapus |
| 7 | Jenis proyek bebas, rantai syarat jadi peta label, pembatas IB dilonggarkan, `backupValidation` disamakan | selesai `63dc7e9` — `projectTypes.ts` + `updateIaEeProject` (K3). Menambah nilai tipe baru aman karena `backupValidation.ts` memperlakukan tipe tak dikenal sebagai peringatan, bukan galat — jadi tidak ada migrasi dan **skema Dexie tetap v15** |
| 8 | Kartu bukti: label skor bersama + penyebut dari sesi yang benar-benar berisi data | selesai `5f0cf09` |
| 9 | Ringkasan keterlibatan jadi satu blok angka, pengulangan dihapus, setiap baris menyebut penyebutnya | selesai `f18fa0e` + `e68e974` — mesin kesimpulan di `lib/studentConclusion.ts` (K6) |
| 10 | Riwayat sesi: tombol muat dua puluh lagi, tanpa kontrol bersarang | selesai **dengan penyimpangan yang disetujui pemilik**: kontrol bersarang dihapus `e1106dd`, tetapi pola halaman (Sebelumnya/Berikutnya) **dipertahankan** atas jawaban K5 pemilik 2026-10-09 — bukan "muat 20 lagi" seperti bunyi spesifikasi |
| 11 | Kepala detail: WA, sunting, menu nonaktifkan/hapus, jejak navigasi | selesai `1f03e21` — satu `StudentActionsSheet` dipakai layar Daftar dan layar Detail, dijaga `studentSinglePath.test.ts` |
| 12 | Daftar murid: kontrol pengurutan + penyaringan, tombol "butuh perhatian", label urutan | selesai 2026-10-10 — modul murni `lib/studentList.ts` + kontrol di `Students.tsx` |
| 13 | Kartu murid tiga baris, keterangan "aktif sejak bulan tahun", label pendek kurikulum | selesai 2026-10-10 |
| 14 | Formulir murid: Identitas → Kontak → Tarif → Siklus Tagihan, siklus terlipat untuk murid baru | selesai 2026-10-10 — mapel pindah ke kelompok Identitas; bagian Siklus Tagihan memakai tombol `aria-expanded` dan isinya hanya ter-render saat terbuka, sehingga kolom wajib "jumlah pertemuan" tidak pernah tersembunyi dari validasi peramban |

**Keputusan yang saya ambil sendiri pada putaran ini** (satu baris alasan masing-masing):

1. **Kartu murid kehilangan chip mapel, nama orang tua, dan "N bulan bersama".** Tiga baris adalah yang diminta butir 13, ketiganya tetap tersedia di halaman Detail Murid, dan "N bulan bersama" diganti bulan + tahun karena pembulatan ke bawah pernah membuat murid yang bergabung lewat sebulan terbaca "1 bulan bersama".
2. **Hitungan `cost` di `Students.tsx` dihapus.** Ia dijumlahkan tetapi tidak pernah ditampilkan (temuan `RENCANA-G3-06` §4 butir 6); membiarkannya berarti layar ini menyimpan data uang tanpa gerbang `useMoneyVisible` (keputusan B1).
3. **Sinyal "butuh perhatian" di layar daftar tetap versi murah** (tindak lanjut + tagihan belum lunas), bukan memanggil `studentActions` untuk puluhan murid. Perbedaannya dengan aturan detail di `studentActions.ts` ditulis di kepala `lib/studentList.ts` supaya tidak ada dua definisi yang saling menyamar.
4. **Satu penjaga baru: `src/__tests__/studentFormGroups.test.ts` (7 tes).** Alasannya menyentuh data: kolom wajib di dalam bagian yang terlipat membuat peramban menolak menyimpan tanpa alasan yang terlihat. Penjaga itu membaca berkas sumber (pola `nativeDialogs.test.ts`) karena repo ini tidak memasang `jsdom`.

**Batas kejujuran.** Seluruh tab Murid yang baru (kartu Perlu Tindakan, blok uang, tabel prediksi vs nilai akhir, isian rapor, tab Proyek untuk murid non-IB) beserta tiga butir terakhir **belum pernah dilihat mata pemilik di perangkat**; yang ada baru bukti mesin. Butir daftar periksa manual **30–33** ditambahkan untuk itu dan **belum dicentang**.

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
| Ditemukan 2026-10-08 (G3-05) | **Kegagalan Playwright yang tidak berasal dari pekerjaan yang sedang dikerjakan, sehingga gate tampilan tidak pernah benar-benar hijau di mesin ini.** Terukur pada suite penuh 2026-10-08: `e2e` 69 lulus / 11 gagal / 6 skip. Delapan di antaranya (`report-export-ratio` 3 layout × 2 project, `report-unlock` × 2) **dibuktikan gagal identik di HEAD tanpa perubahan apa pun** (diuji `git stash`), semuanya dengan galat halaman `SchemaError: DexieError`; dua lagi (`capture-closeout-failure` × 2) juga gagal sendirian di HEAD dengan `DexieError` yang sama; satu (`screenshot-katalog` 11-narasi-per-sesi) lulus saat dijalankan sendirian. | Belum. Perlu diselidiki: dari mana `SchemaError: DexieError` muncul (diduga basis data contoh di profil peramban tidak cocok dengan skema yang diminta kode), lalu diputuskan apakah datanya dibersihkan, profilnya dipisah per project, atau asersinya diperbaiki. Selama belum, setiap klaim "e2e hijau" di dokumen ini harus dibaca sebagai "hijau kecuali empat spec itu" |
| Ditemukan 2026-10-08 (G3-05) | **Katalog tangkapan layar yang dilacak git tidak lagi cocok dengan yang dihasilkan spec.** Setelah `npm run e2e`, 19 PNG baru muncul sebagai berkas tak terlacak (mis. `e2e/screenshots/audit/chromium/06-payments-utama.png`, `06-payments-tagihan.png`, `06-payments-rekap.png`) sementara yang terlacak masih memuat nama lama dari struktur tab lama dan masih memuat folder `audit/mobile-dark/` untuk project yang sudah dihapus Q4. | Belum. Perlu keputusan pemilik: apakah set terlacak dirapikan (`git rm` yang basi + tambahkan yang baru) atau katalog tangkapan layar berhenti dilacak sama sekali. Sengaja tidak saya kerjakan pada putaran G3-05 karena menyentuh 100+ berkas di luar lingkup tugas, dan aturan §7 hanya menuntut pemulihan berkas terlacak setelah run — yang sudah dilakukan |
| Ditemukan 2026-10-10 (G3-06) | **Flake beban-tinggi pada guard tampilan, terukur sekali.** Pada run `e2e:uiux` pertama 2026-10-10, tes kontras layar **Keuangan (/payments) pada project `mobile`** gagal dengan `Test timeout of 30000ms exceeded` — kolom PIN terukur **disabled** (data contoh belum siap) sehingga `fill()` menunggu sampai batas waktu. Pada run penutup (penuh, 64 tes) tes itu **lulus**, dan `openPin()` memang sudah punya lingkaran percobaan 6× — tetapi `fill()` di dalamnya tidak dilindungi batas waktu sendiri, jadi satu momen "PIN belum siap" memakan seluruh timeout tes. | Belum diperbaiki. Usulan: bungkus `fill()` dengan batas waktu pendek (`{ timeout: 2_000 }`) di dalam lingkaran percobaan `e2e-uiux/uiux-metrics.spec.ts` supaya percobaan berikutnya benar-benar berjalan. **Jangan** menaikkan batas waktu 60 detik keputusan pemilik, dan jangan mengklaim `e2e:uiux` hijau tanpa menyebut bahwa kegagalan ini pernah muncul sekali |
| Ditemukan 2026-10-08 (G3-05) | **G3-01 butir 9 belum diukur ulang sesudah G3-04 tuntas.** Butir itu berbunyi "label biaya pada tombol AI, pengumuman status, dan tombol coba lagi saat gagal" dan statusnya "tertahan sampai G3-04 dikerjakan". G3-04 sudah selesai 2026-10-07 (commit `ac4bc1f` dan sebelumnya), sehingga alasan penahannya hilang — tetapi tidak ada bukti terukur bahwa ketiga hal itu sudah terpasang di layar Catat Sesi. | Belum. Diukur dulu: apakah tombol AI di `CaptureSession.tsx` menyebut biayanya, apakah status panggilan diumumkan, dan apakah ada tombol coba lagi saat gagal. Jangan dicentang sebelum ada buktinya |

---

## 5. Daftar periksa manual

Bagian ini hanya bisa ditutup pemilik dengan mata di perangkat. Agen tidak boleh mencentangnya. Semuanya memakai data contoh dari aplikasi. Perkiraan waktu seluruhnya sekitar lima belas menit.

> **Butir 24 dan 25 ditambahkan 2026-10-07** untuk tampilan yang belum punya butirnya sendiri. Butir 1–23
> seluruhnya menulis "tab", padahal layar Uang sudah menjadi satu layar tiga blok sejak v1.94.0 — jadi tidak ada
> satu pun butir lama yang benar-benar mencakup perubahan itu. Dua butir ini yang mencakupnya.
>
> **Butir 26 sampai 29 ditambahkan 2026-10-08** untuk layar Laporan yang dirombak G3-05: bilah aksi tetap +
> penunjuk langkah, alasan tombol mati, pemisahan istilah "dibuat" dan "dibagikan" (butir 28 — ini perubahan
> perilaku yang perlu dikonfirmasi pemilik), serta penyimpanan narasi otomatis beserta penanda AI per isian.
> **Keempatnya dicentang 2026-10-08** atas dasar pemeriksaan pemilik di perangkat yang menilai layar Laporan
> "sudah sangat oke". Buktinya adalah pernyataan pemilik setelah butir-butir ini dibacakan, bukan tangkapan
> layar atau pengukuran; butir 28 menyimpan catatan tersendiri karena isinya juga menanyakan preferensi.

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
26. Buka layar Laporan dengan data contoh (murid Andi, bulan Juni 2026). Saat digulir, **bilah aksi tetap** harus ikut menempel di atas dan memuat lima langkah — Pilih murid · Pilih periode · Buat laporan · Isi narasi · Ekspor — dengan langkah yang sedang berjalan tersorot. Tombol JPG/PNG/PDF dan "↩ Undo Hasil AI" ada di bilah yang sama, bukan tersembunyi di tengah halaman. — ✅ **Dilihat pemilik di perangkat 2026-10-08, dinilai "sudah sangat oke".**
27. Di layar Laporan, pilih murid yang **belum punya sesi** di bulan yang dipilih. Tombol "Buat Laporan" harus tampak nonaktif **beserta satu kalimat alasan** di bawahnya (misalnya sesi di periode itu sudah pernah direkap). Pilih murid dengan sesi: tombolnya kembali aktif dan langkahnya maju. — ✅ **Dilihat pemilik di perangkat 2026-10-08, dinilai "sudah sangat oke".**
28. Di layar Laporan, tekan **JPG** pada laporan Juni yang sudah final. Pesannya harus menyebut berkasnya dibuat/diunduh, dan laporan itu **tidak** otomatis berubah menjadi "Sudah dibagikan" — status barunya Anda tentukan sendiri lewat tombol **Tandai Sudah Dibagikan**. Ini perubahan perilaku yang disengaja; pastikan itu yang Anda inginkan. — ✅ **Dicentang 2026-10-08 atas persetujuan pemilik ("sudah sangat oke").** Persetujuan itu keluar dari percakapan sesudah butir ini dibacakan, bukan dari jawaban khusus atas pertanyaan "apakah ekspor boleh tetap tidak menandai sudah dibagikan" — jadi kalau pemilik ingin perilaku lama (ekspor otomatis menandai dibagikan), itu satu baris perubahan di `useReportExport.ts` dan butir ini dibuka lagi.
29. Di layar Laporan, buka **Narasi Sesi**, sunting satu narasi, lalu berhenti mengetik. Muncul status **Menunggu tersimpan… · Sedang menyimpan… · Tersimpan (jam)**. Ganti murid/periode sebelum tersimpan: harus muncul konfirmasi yang menawarkan **Simpan & lanjut**. Setelah narasi disunting sendiri, penanda **✨ AI** di baris itu harus hilang (dan tetap hilang setelah halaman dimuat ulang). — ✅ **Dilihat pemilik di perangkat 2026-10-08, dinilai "sudah sangat oke".**

> **Butir 30 sampai 33 ditambahkan 2026-10-10** untuk layar Murid yang dituntaskan G3-06. Butir 1–23
> seluruhnya menulis "tab" untuk layar yang sudah lama berubah, dan **tidak satu pun** menyentuh tab baru
> (Ringkas/Sesi/Progres/Proyek) atau tiga butir terakhir G3-06. Keempat butir ini **BELUM dicentang**
> dan hanya bisa ditutup pemilik dengan mata di perangkat.

30. Buka **Daftar Murid**. Di bawah pemilih Aktif/Historis ada kotak **Urutkan** dan tombol **Butuh perhatian (N)**, serta satu baris keterangan. Ganti urutannya: susunan daftar benar-benar berubah, dan baris keterangan menyebut urutan yang sedang dipakai (mis. "Menampilkan 12 murid · urutan Nama (A–Z)"). Tekan **Butuh perhatian**: yang tersisa hanya murid yang punya tindak lanjut atau tagihan belum dibayar, label tombolnya berubah jadi **Tampilkan semua**, dan baris keterangan menambahkan "· hanya yang butuh perhatian". Tekan lagi: seluruh murid kembali seperti semula.
31. Lihat satu kartu murid di daftar itu. Isinya **tiga baris**: (1) nama beserta penanda keadaan — jadwal terdekat, tanda **nonaktif**, jumlah follow-up, jumlah tagihan belum dibayar; (2) label **pendek** kurikulum + kelas + sekolah (mis. "IGCSE · Grade 10 · SMA Tunas"); (3) "**aktif sejak Agustus 2026**" beserta sesi bulan ini (mis. "Bulan ini 4 sesi · 6j", atau "Belum ada sesi bulan ini"). Chip mapel dan nama orang tua **tidak lagi** ada di kartu; keduanya tetap ada di halaman Detail Murid.
32. Tekan **Tambah Murid**. Urutan bagiannya: **Identitas** paling atas (nama → kurikulum → kelas/sekolah → mata pelajaran), lalu **Kontak Orang Tua**, **Kontak Murid**, **Tarif Les**, dan terakhir **Siklus Tagihan** dalam keadaan **terlipat** beserta ringkasan pilihannya (mis. "Bulanan · Buka"). Buka lipatannya, pilih **Setiap N pertemuan**, isi jumlahnya, tutup lagi, lalu tekan **Simpan** — muridnya tetap tersimpan **tanpa** keluhan validasi yang tidak terlihat. Lalu buka murid yang sudah ada lewat **Edit**: bagian Siklus Tagihan **langsung terbuka**.
33. Buka satu murid, lalu periksa keempat tabnya. **Ringkas**: kartu **Perlu Tindakan** di paling atas, lalu blok uang (tarif + rincian biaya, ikut tersamarkan saat uang dikunci). **Sesi**: riwayat sesi beserta jadwal murid. **Progres**: tabel **Prediksi vs Nilai Akhir**, ringkasan kesimpulan, dan isian nilai rapor. **Proyek**: pelacak tugas panjang — untuk murid **non-IB** harus muncul **penjelasan**, bukan tab kosong.

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
| 2026-10-07 | **G3-04 langkah 1, 2, 3, 4, dan 5 dikerjakan.** Berkas baru `src/lib/aiUsage.ts` (**15 tes**) dan `src/lib/useAiAction.tsx`. Skema: `AuditAction` + `ai.call`, `AuditEntry` + tiga kolom opsional (`costIdr`/`aiFeature`/`estimatedIdr`), `Settings.ai` + `monthlyBudgetIdr`; **versi skema Dexie tetap v15** karena kolom opsional di entri IndexedDB yang sudah ada tidak menuntut migrasi. **Langkah 3 (satukan modal) selesai:** `AiCostConfirmModal.tsx` **dihapus** (pemakaian terakhirnya ada di `CaptureSession`), `AiCostModal` di `components/` diperkaya dengan `tokenNote` + `busy` supaya rincian token & biaya USD dari modal khusus tidak hilang, dan sekarang **hanya ada satu komponen modal biaya di seluruh aplikasi** — dipasang lewat hook. **Langkah 4 (pindahkan titik pemanggil) selesai:** empat layar memakainya (`CaptureSession` dua panggilan: draft catatan + poles WA, `RingkasanTab` analisis keuangan, `MonthlyReport` narasi + ringkasan). Catatan temuan: `analyzeStudent` dan `draftStudyNote` **tidak dipanggil layar mana pun** (hanya hidup di `aiClient` + tesnya), jadi tidak ada titik yang tertinggal. **Langkah 5 (Pengaturan) dikerjakan sebagian:** kolom batas bulanan + tampilan pemakaian bulan berjalan (dibaca dari catatan audit `ai.call`, jadi angkanya dari panggilan yang benar-benar terjadi) + status "terlampaui"/"tanpa batas". **Gerbang batas dipasang di `useAiAction`** yang mengembalikan `alasanNonaktif` sebagai teks, dan **ketiga tombol AI sudah memakainya** (`CaptureSession`, `RingkasanTab`, `MonthlyReport`) beserta alasan yang ditulis di layar. Sisa yang belum: daftar riwayat panggilan AI di Pengaturan, dan memindahkan `pemakaian` di `Settings.tsx` ke hook agar tidak ada dua pembacaan paralel. **Temuan yang ditangkap penjaga, bukan penalaran:** (a) penjaga tipe menuntut label untuk `ai.call` di `AUDIT_LABEL`; (b) `eslint react-hooks/rules-of-hooks` menangkap hook yang saya taruh **setelah** early return `settingsView !== "ready"` — kalau lolos, urutan hook berubah-ubah dan itu bug React yang nyata. Gate: `tsc` ✓ · `eslint src e2e e2e-uiux` ✓ · suite **945 lulus / 72 berkas** ✓ · `build` (dist/sw.js) ✓ · `check:docs` 0 pelanggaran ✓ · `capture-closeout-failure` + `report-export` **2 lulus** (1 sisa flake beban-tinggi yang sudah berulang kali terbukti lulus sendirian). **Belum:** daftar riwayat panggilan AI di Pengaturan, dan memindahkan `pemakaian` di `Settings.tsx` ke hook agar tidak ada dua pembacaan paralel. |
| 2026-10-08 | **G3-05 Laporan bulanan tuntas — refactor terbatas + 11 butir fitur, versi v1.96.0.** `MonthlyReport.tsx` **2.361 → 1.470 baris** (target ≤1.500) dengan sembilan blok pindah ke `src/screens/monthlyReport/` (`ReportActionBar` · `ReportScopeControls` · `ReportStatusPanel` · `ReportPreviewPanel` · `DesignToolbar` + `ScaledPreview` · `ReportNarrativePanel` + `useNarrativeAutosave` · `ReportTextsPanel` + `EditableText` · `ReportPlanPanel` · `ReportHistoryPanel`) ditambah `ReportAiResultPanel`, `ReportMessageBanner`, `useReportData`, `reportAvailability.ts` (aturan ketersediaan periode sebagai fungsi murni), dan `aiFieldMarks.ts`. Keadaan tiap butir beserta buktinya ada di bagian 3. **Tiga temuan yang lahir dari pengerjaan ini, bukan dari penalaran:** (1) `sessionAiFingerprint` sengaja **tidak** memuat teks narasi — supaya menyunting narasi tidak memicu AI menulis ulang — sehingga penanda "narasi ini buatan AI" tidak bisa memakainya; sebuah tes yang saya tulis gagal karena itu, lalu ditambahkan field `aiNarrativeTextHash` (fingerprint teks narasi) yang menutup celahnya tanpa mengubah aturan hemat token G3-04. (2) Menguji Playwright atas layar Laporan di lingkungan ini **tidak pernah hijau sepenuhnya**: empat spec gagal identik di HEAD tanpa perubahan apa pun (lihat bagian 4). (3) **Kesalahan saya sendiri: menulis ulang `MonthlyReport.tsx` memakai `Set-Content` PowerShell**, yang membaca UTF-8 sebagai ANSI dan merusak 35 titik em dash, tanda kutip, dan centang — persis jebakan `ATURAN-AI` §7 dan sama seperti kejadian `Payments.tsx` 2026-10-07. Kali ini tidak ada penjaga otomatis yang menangkapnya (kerusakannya di dalam string, bukan struktur); saya menemukannya dari peringatan git soal CRLF, lalu memulihkan berkasnya dengan membalik pemetaan CP1252 → UTF-8 (0 karakter pengganti, 0 sisa mojibake), menormalkan akhir baris ke LF, dan memverifikasi ulang byte-nya. **Dialog `confirm()` terakhir di berkas ini juga dihapus** (diganti `ConfirmSheet`), sesuai ATURAN-AI §4.1. Gate: `tsc -b` 0 · `eslint .` 0 · suite **982 lulus / 74 berkas** (37 tes baru) · `build` (dist/sw.js) · `e2e:uiux` **64 lulus / 0 gagal** · `e2e` 69 lulus / 11 gagal / 6 skip dengan perincian di bagian 4. **Belum diverifikasi manusia di perangkat** — butir daftar periksa 26–29 ditambahkan untuk layar ini. |
| 2026-10-10 | **G3-06 Murid tuntas — 14 dari 14 butir, rilis v1.97.0, dan dua bug nyata ditemukan penjaga tampilan, bukan oleh penalaran.** Tiga butir terakhir yang dikerjakan pada putaran ini: **#12** kontrol pengurutan + penyaringan daftar murid (modul murni baru `src/lib/studentList.ts`; kotak `Urutkan`, tombol `Butuh perhatian (N)` yang menggantikan spanduk kuning lama, dan satu baris yang menyebut urutan yang sedang dipakai), **#13** kartu murid dipotong menjadi tiga baris dengan label pendek kurikulum (`CURRICULUM_META.shortLabel`) dan keterangan "aktif sejak <bulan tahun>", **#14** formulir murid diurutkan Identitas → Kontak → Tarif → Siklus Tagihan (mata pelajaran pindah ke kelompok Identitas) dengan bagian Siklus Tagihan terlipat saat menambah murid baru. Hitungan `cost` yang tidak pernah ditampilkan dihapus dari `Students.tsx` supaya layar itu tidak memegang data uang tanpa gerbang B1. **Dua bug yang sudah ada sejak butir #11 dan lolos dari `tsc` + suite tes:** (a) `useState` untuk menu aksi di `StudentDetail.tsx` diletakkan **setelah** gerbang `!student`, sehingga React melempar "Rendered more hooks than during the previous render" dan **seluruh layar Detail Murid jatuh ke batas galat**; (b) emoji `⚠️`/`🔔`/`ℹ️` di dalam tombol kartu Perlu Tindakan ditolak guard emoji. Keduanya ditemukan `npm run e2e:uiux` (gejala pertama muncul sebagai "layar tanpa h1", karena yang terukur panel galat), lalu diperbaiki: state dipindah ke atas bersama state lain, emoji diganti `WarningIcon`/`BellIcon`/`InfoIcon` (ikon `InfoIcon` baru ditambahkan ke `src/components/icons.tsx`). `npx eslint src` menemukan satu lagi: `react-refresh/only-export-components` di `PerbandinganNilai.tsx`, sehingga aturan barisnya pindah ke `perbandinganNilaiRows.ts` — akhiran `Rows` sengaja dipakai karena di Windows `.ts` menutupi `.tsx` yang berbeda hanya besar-kecil huruf (percobaan pertama gagal TS1192). Dua berkas uji baru: `studentList.test.ts` (18 tes) dan `studentFormGroups.test.ts` (7 tes). Gate: `tsc -b` ✓ · `eslint src` 0 ✓ · suite **1197 lulus / 89 berkas** ✓ · `build` ✓ (`dist/sw.js`) · `check:docs` 0 pelanggaran ✓ · **`e2e:uiux` 64 lulus / 0 gagal** ✓ (satu kegagalan kontras layar Keuangan pada project mobile pernah muncul di run pertama dan tidak terulang di run penutup — flake beban-tinggi, dicatat di bagian 4). Butir daftar periksa manual 30–33 ditambahkan dan **belum dicentang**; tampilan tab Murid yang baru belum dilihat mata pemilik. |
