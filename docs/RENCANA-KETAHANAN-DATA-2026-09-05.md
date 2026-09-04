# Rencana implementasi ketahanan data Les Ko Lui

Tanggal: 2026-09-05. Status: **enam lingkup disetujui pengguna; implementasi belum dikerjakan melalui dokumen ini**.

Dokumen ini adalah instruksi kerja untuk AI pelaksana. Kerjakan per fase, buktikan hasilnya, lalu lanjut. Jangan menganggap kotak checklist sebagai selesai sebelum ada perubahan kode dan bukti pengujian.

## 1. Tujuan dan persetujuan

Pengguna menyetujui enam usulan berikut:

| ID audit | Hasil yang harus dicapai | Urutan fase |
|---|---|---|
| 6 | Panduan aktif sesuai kode aktual | A |
| 2 | Kegagalan simpan tindak lanjut tidak membuang isian; retry tidak menggandakan data | B |
| 1 | Isian Catat Sesi dipulihkan dari draf lokal; pembaruan PWA tidak membuang pekerjaan | C |
| 3 | Restore memvalidasi isi, relasi, dan kompatibilitas sebelum mengganti database | D |
| 4 | Respons AI diperiksa saat runtime sebelum mengubah tulisan pengguna | E |
| 5 | Penyimpanan pengaturan bersamaan tidak menimpa perubahan yang tidak terkait | F |

Prioritas tinggi: B, C, D. Prioritas menengah: E, F. A menjadi landasan agar instruksi lama tidak menyesatkan implementasi.

Persetujuan meliputi implementasi lokal dan tes yang diperlukan. Ini tidak mengizinkan menghapus data pengguna, melakukan restore pada profil browser pengguna, mengirim WhatsApp, memakai API AI berbayar, mengunggah backup, atau deployment. Pengujian memakai data sintetis dan profil browser terisolasi.

## 2. Fakta dasar dan batas audit

Audit membaca kode kerja, termasuk perubahan pengguna yang belum di-commit. Pada audit awal, `npm.cmd test -- --reporter=dot` menghasilkan **33 file tes / 351 tes lulus**, dan `npm.cmd run build` berhasil. Hasil tersebut bukan bukti bahwa skenario kegagalan di dokumen ini sudah tertangani. Audit awal tidak menjalankan E2E maupun memverifikasi PWA di HP.

Lokasi proyek aplikasi adalah direktori `les-ko-lui/`. Semua path di dokumen ini relatif terhadap direktori tersebut kecuali diawali `../`.

Fakta kode pada saat penulisan:

- `src/db/db.ts`: database `jurnalles`, skema terbaru 14. Tambahkan versi berikut yang tersedia saat implementasi; jangan mengedit migrasi yang sudah pernah dirilis.
- Sepuluh tabel di `BACKUP_TABLES`: `students`, `sessions`, `reports`, `payments`, `settings`, `raporGrades`, `followUps`, `expenses`, `iaeeProjects`, `studyNotes`.
- `auditLog` lokal per perangkat dan sengaja tidak ikut backup. `studyNotes` memakai primary key `studentId`; tabel domain lainnya memakai `id`.
- `monthClosings` sudah dihapus pada skema 14. Restore saat ini mengabaikan tabel legacy tersebut.
- Format backup sekarang versi 2; versi payload backup berbeda dari versi skema Dexie. Format 1 masih didukung.
- `CaptureSession.tsx`: form berada di React state. `handleCloseOutDone` menyimpan follow-up satu per satu dan reset/navigasi berada di `finally`.
- `vite.config.ts`: `registerType: "autoUpdate"`. `PwaPrompts.tsx` memeriksa update berkala dan saat tab terlihat kembali.
- `backup.ts`: validasi baris baru memeriksa struktur array, primary key, dan duplikasi; metadata versi skema diperiksa sebagai integer tetapi belum dibandingkan dengan versi aplikasi.
- `aiClient.ts`: `callAI<T>` mengembalikan `JSON.parse(text) as T`; type assertion bukan validasi runtime.
- `settingsRepo.ts`: `saveSettings` membaca lalu menulis di luar satu transaksi baca-tulis. Beberapa pemanggil juga mengirim objek Settings lengkap yang mungkin sudah basi.

Temuan adalah jalur kegagalan dan risiko yang terlihat dari kode, bukan pernyataan bahwa data pengguna sudah hilang. Baca ulang fungsi terkait sebelum mengedit karena workspace bisa terus berubah.

## 3. Aturan kerja untuk AI pelaksana

1. Periksa `AGENTS.md` yang berlaku, `git status --short`, dan diff file sasaran. Pertahankan perubahan pengguna. Jangan reset, checkout ulang, atau menimpa seluruh file untuk mempermudah pekerjaan.
2. Mulai dari fase A, kemudian B, C, D, E, F. Selesaikan dan uji satu fase sebelum memperluas perubahan.
3. Gunakan Dexie untuk data domain dan draf. Jangan menyimpan catatan, foto, atau tanda tangan di localStorage/sessionStorage.
4. Pertahankan perhitungan biaya, cakupan sesi invoice, snapshot invoice lunas/manual, kebijakan paket, dan rotasi template yang sudah berjalan.
5. Jangan menambah portal, sinkronisasi perangkat, provider AI baru, desain ulang UI, atau refactor besar yang tidak diperlukan.
6. Gunakan fungsi tanggal di `src/lib/format.ts` bila sesuai. Jangan menjadikan tanggal kalender WIB bergeser lewat konversi UTC.
7. Gunakan komponen modal, toast, dan pola aksesibilitas yang sudah ada. Pesan kegagalan harus menyatakan apa yang tersimpan dan apa yang perlu dicoba ulang.
8. Jangan menelan error dengan catch kosong, menandai sukses sebelum commit, atau menurunkan ekspektasi tes agar lulus.
9. Tes baru harus membuktikan perilaku terhadap kegagalan nyata, bukan sekadar mengulang implementasi.
10. Bila fakta kode berubah, sesuaikan detail teknis dan catat alasannya di log akhir dokumen. Jangan memperluas tujuan yang disetujui.

## 4. Fase A — Selaraskan panduan aktif (ID 6)

### File yang dibaca dan diperbarui

- `../README.md`, `../01-architecture-and-stack.md`, `../02-data-model.md`.
- `../03-capture-flow.md`, `../06-ai-generation.md`, `../08-backup-and-pwa.md`.
- `../09-build-phases.md`, `../10-conventions-and-pitfalls.md`, `../CHECKLIST.md`, `../DOC-AUDIT.md`.
- `README.md` aplikasi yang masih berupa template Vite.
- Dokumen lain di root dan `docs/` hanya bila memuat instruksi aktif yang bertentangan.

### Langkah

1. Cocokkan daftar tabel dengan `db.ts` dan `BACKUP_TABLES`, lalu buat satu bagian status aktual yang mudah ditemukan.
2. Koreksi klaim backup 11 tabel lama, homework sebagai tabel aktif, dan Tutup Bulan sebagai fitur aktif. Bedakan data legacy dari fitur yang harus dibangun.
3. Cocokkan klaim fitur IA/EE, notifikasi, serta alur backup dengan route dan pemanggil yang benar-benar ada. Keberadaan tipe atau komentar saja tidak membuktikan fitur aktif.
4. Jangan mengubah kode supaya sesuai panduan usang. Jangan menghidupkan kembali route `/catatan` yang telah dihapus dalam perubahan pengguna.
5. Pertahankan dokumen audit historis sebagai rekaman; beri penanda historis/tergantikan bila perlu, bukan mengubah seolah audit lama memeriksa kode terbaru.
6. Tambahkan tautan dari README aplikasi ke dokumen ini dan perintah dev/build/test yang benar. Klaim implementasi fase B–F tetap pending sampai selesai.

### Penerimaan

- [ ] Panduan aktif membedakan 10 tabel backup dan tabel lokal yang tidak diekspor.
- [ ] Tidak ada instruksi aktif untuk membangun kembali fitur yang sudah dihapus tanpa persetujuan baru.
- [ ] AI baru dapat menemukan entry point aplikasi, aturan data, serta urutan fase dari README.
- [ ] Tidak ada perubahan perilaku aplikasi dalam fase A.

## 5. Fase B — Simpan tindak lanjut secara utuh (ID 2)

### File sasaran

`src/screens/CaptureSession.tsx`, `src/db/repos/followUpRepo.ts`, `src/db/repos/index.ts`; tes repo dan E2E capture yang relevan.

### Masalah dan hasil yang diinginkan

Sesi sudah tersimpan sebelum close-out dibuka. Jika follow-up kedua gagal, follow-up pertama dapat tetap masuk, sedangkan `finally` membuang seluruh isian dan menavigasi keluar. Hasil yang diinginkan: sesi tetap tersimpan, batch tindak lanjut seluruhnya commit atau seluruhnya rollback, dan formulir tetap tersedia saat gagal.

### Langkah implementasi

1. Ubah model item close-out dari string polos menjadi item dengan ID stabil dan teks. Buat UUID saat item ditambahkan, bukan setiap kali tombol simpan ditekan.
2. Tambahkan fungsi repo untuk menyimpan satu batch. Validasi studentId, sourceSessionId, hubungan sesi dengan murid, serta teks nonkosong sebelum penulisan.
3. Gunakan satu transaksi Dexie `rw` dengan semua tabel yang dibaca/ditulis di dalamnya. Jangan melakukan network request, kompresi foto, atau pekerjaan non-DB di transaksi.
4. Buat retry idempotent memakai ID item yang sama. Jika ID sudah tersimpan dan identitas/isi sama, perlakukan sebagai sudah berhasil. Jika berbeda, tolak sebagai konflik; jangan overwrite follow-up yang sudah selesai.
5. Pasang guard sinkron berbasis ref untuk mencegah dua submit sebelum React sempat memperbarui state; disable tombol sebagai umpan balik UI.
6. Pindahkan reset, tutup modal, dan navigasi ke jalur sukses. `finally` hanya melepas status loading/guard.
7. Pada error, tampilkan pesan seperti “Sesi sudah tersimpan. Tindak lanjut belum tersimpan; coba lagi.” Pertahankan daftar item dan teks yang belum ditambahkan.
8. Jika pengguna boleh melewati close-out, buat aksi eksplisit. Membuang tindak lanjut yang sudah diisi harus memerlukan konfirmasi; jangan menghapus sesi yang telah tersimpan.
9. Batch kosong boleh selesai tanpa menulis baris. Hormati navigasi dan konteks murid yang sudah ada.

### Tes penerimaan

- [ ] Dua item valid menghasilkan tepat dua follow-up milik sesi/murid yang benar.
- [ ] Gagalkan write kedua secara deterministik di tes: tidak satu pun item baru tertinggal setelah rollback.
- [ ] Setelah kegagalan, modal dan semua teks tetap ada; tidak ada navigasi sukses.
- [ ] Retry setelah gagal menyimpan tepat satu batch; submit ulang dengan ID sama tidak menambah duplikat.
- [ ] Konflik ID tidak menimpa data lama atau membuka kembali follow-up completed.
- [ ] Sesi awal tidak dihapus maupun dibuat ulang ketika close-out gagal.

## 6. Fase C — Draf Catat Sesi dan pembaruan PWA (ID 1)

### File sasaran

`src/db/db.ts`, `src/db/types.ts`, repo draf baru dan barrel export; `src/screens/CaptureSession.tsx`, `src/screens/captureSession/useEngagement.ts`; hook draf baru di folder capture; `src/components/PwaPrompts.tsx`, `vite.config.ts`; jalur restore/reset/delete murid yang menyentuh siklus hidup draf.

### Keputusan desain

- Tambahkan tabel lokal `captureDrafts` pada versi skema baru. Jangan menyamarkan draf sebagai sesi DONE atau menyimpannya dalam Settings.
- Draf **lokal per perangkat, tidak ikut backup** pada lingkup ini. UI harus mengatakan “Draf tersimpan di perangkat ini”, bukan menjanjikan pemulihan setelah kehilangan HP.
- Gunakan draftId stabil, formatVersion draf, revision, updatedAt, scopeKey, studentId opsional, scheduleId opsional, phase (`editing`/`closeout`), dan savedSessionId bila sesi sudah tersimpan.
- scopeKey membedakan `schedule:<id>`, `student:<id>` untuk sesi baru dengan preselect, dan `new` untuk sesi baru tanpa konteks. Hindari satu slot global yang menimpa draf murid lain.
- Simpan state form sebagai data bertipe eksplisit. Foto/tanda tangan berupa Blob, bukan object URL. Simpan flags engagement mentah; hitung kembali skor menggunakan helper yang sudah ada.
- Draf bukan mekanisme backup lengkap. Tidak boleh ada klaim “tidak mungkin kehilangan satu karakter”; indikator tersimpan hanya muncul setelah write selesai.

### Langkah implementasi

1. Definisikan `CaptureDraft` dengan field yang benar-benar diperlukan untuk memulihkan form: step, murid/jadwal, tanggal, durasi, mapel, topik terpilih dan teks pencarian belum di-commit, catatan, needsWork, predictedGrade, mood, flags/tags/respons, situasiNote, sessionType bila digunakan, foto, tanda tangan.
2. Simpan close-out dalam draf: savedSessionId, data tampilan sesi, item ber-ID stabil dari fase B, dan teks follow-up belum ditambahkan. Jangan menyimpan loading, error sementara, object URL, atau objek DOM.
3. Sediakan API hidrasi engagement yang mengembalikan seluruh flags/tags/mood/situasi secara konsisten. Jangan memulihkan skor dengan menyimpan angka yang bisa tidak sesuai flags.
4. Saat membuka capture, baca draf sebelum autosave diaktifkan. Draf kosong default tidak boleh menimpa draf yang sedang dimuat. Tawarkan “Lanjutkan draf” dan “Buang draf”; tampilkan murid/tanggal untuk mencegah salah konteks.
5. Perubahan scope harus flush scope lama, lalu memuat scope baru. Jika scope tujuan sudah memiliki draf, jangan overwrite diam-diam. Pergantian murid harus mereset/memulihkan konteks mapel dan engagement secara konsisten.
6. Autosave teks dengan debounce sekitar 500 ms dan antrean write berurutan; perubahan Blob disimpan setelah kompresi/stamping selesai. Revision harus mencegah write lama menimpa snapshot lebih baru.
7. Flush saat pindah step dan sebelum navigasi yang dikendalikan aplikasi. Pasang perlindungan navigasi saat write pending/gagal. `beforeunload` boleh menjadi fallback peringatan, bukan satu-satunya mekanisme penyimpanan async.
8. Jika tab yang sama/scope yang sama diedit di dua tab, gunakan compare-and-set revision dalam transaksi. Pada konflik, pertahankan isian lokal dan minta pengguna memuat versi terbaru; jangan last-write-wins diam-diam.
9. Simpan sesi dan ubah draf menjadi `closeout` dalam satu transaksi agar crash setelah commit tidak membuat sesi baru ketika pengguna kembali. Adaptasi repo seminimal mungkin untuk menerima identitas stabil/berjalan dalam transaksi luar; pertahankan validasi tarif dan jadwal.
10. Saat submit close-out sukses, simpan batch follow-up dan hapus draf dalam transaksi yang sama. Batalkan timer autosave serta invalidasi antrean lama agar draf tidak muncul lagi setelah dihapus.
11. Jika kuota habis atau DB write gagal, pertahankan form, tampilkan status belum tersimpan, dan sediakan coba ulang. Jangan tampilkan badge tersimpan atau reload otomatis.
12. Saat murid/jadwal sumber tidak ada lagi, jelaskan bahwa draf tidak dapat diterapkan ke sumber tersebut. Jangan otomatis membuat sesi pada murid lain. Bersihkan draf terkait dalam jalur hapus murid; nonaktifkan murid tidak perlu membuang draf.
13. Restore/reset sukses harus membersihkan draf lokal agar tidak diterapkan ke dataset yang berbeda. Pembersihan draf berada dalam transaksi penggantian/reset data; restore gagal harus mempertahankan draf. Cantumkan dampak ini di konfirmasi restore/reset.

### Pembaruan PWA

1. Baca registrasi SW dan alasan `autoUpdate` saat ini sebelum mengganti konfigurasi.
2. Gunakan alur update yang meminta pengguna menerapkan pembaruan, tanpa reload paksa saat form/draf belum aman. Flush draf yang relevan sebelum memanggil mekanisme update/reload.
3. Jika flush gagal, pembaruan ditunda dan form tetap terbuka. Pengguna dapat mencoba menyimpan lagi.
4. Jangan sekadar mengganti `autoUpdate` menjadi `prompt` lalu menganggap selesai. Verifikasi halaman lama masih dapat membuka route lazy setelah deploy baru; tangani kegagalan chunk dengan pesan pembaruan dan pemulihan draf, tanpa loop reload. Catat kebutuhan retensi aset deployment bila itu diperlukan di lingkungan nyata.
5. Bersihkan listener visibility dan interval melalui cleanup React yang benar; jangan mengandalkan return callback registrasi jika kontrak library tidak menggunakannya.
6. E2E dev biasa menonaktifkan SW. Untuk klaim update/offline gunakan build produksi dengan server lokal, profil terisolasi, dan dua build berbeda. Bila belum bisa, laporkan verifikasi ini pending secara eksplisit.

### Tes penerimaan

- [ ] Isi teks, mapel, flags, foto, tanda tangan; tunggu status tersimpan; refresh memulihkan semua nilai dan Blob.
- [ ] Navigasi ke layar lain lalu kembali menawarkan draf yang sesuai; draf murid A tidak menimpa B.
- [ ] Autosave tidak berjalan sebelum hidrasi selesai; write lama tidak menimpa write baru.
- [ ] Konflik dua tab terdeteksi dan tidak menghilangkan isian tanpa pemberitahuan.
- [ ] Reload setelah simpan sesi membuka close-out dari savedSessionId; jumlah sesi tetap satu.
- [ ] Close-out selesai menghapus draf; timer terlambat tidak menghidupkannya kembali.
- [ ] Kegagalan penyimpanan menampilkan belum tersimpan dan tidak memicu reload/navigasi otomatis.
- [ ] Update produksi ditunda saat draf belum aman; setelah update, draf dapat dipulihkan.
- [ ] Restore/reset sukses membersihkan draf; restore gagal mempertahankan data dan draf.
- [ ] Upgrade dari skema sebelumnya mempertahankan sesi, invoice, settings, dan foto yang sudah ada.

## 7. Fase D — Validasi restore sebelum penggantian data (ID 3)

### File sasaran

`src/lib/backup.ts`, validator baru misalnya `src/lib/backupValidation.ts`, `src/__tests__/backup.test.ts`, tes validator baru; alur inspect/restore di `src/screens/Settings.tsx`.

### Kontrak validasi

Validasi dilakukan atas `unknown`. Jangan mengandalkan casting `as Student` dan seterusnya. Pisahkan validator murni dari dekripsi/DB agar sebagian besar tes tidak perlu menjalankan PBKDF2.

Urutan pipeline: dekripsi → periksa format/envelope/versi dan struktur dasar → migrasi legacy yang sudah didukung → decode media → validasi data hasil migrasi dan relasi → ringkasan preview → backup sebelum restore → transaksi penggantian data.

`inspectBackup` dan `importBackup` harus memakai pipeline validasi yang sama. Import memvalidasi ulang file yang benar-benar akan dipakai, bukan mengandalkan preview lama.

| Area | Aturan minimum |
|---|---|
| Versi | Tolak versi payload tidak didukung, versi skema noninteger/tidak positif, serta versi skema lebih tinggi dari `db.verno`. Format v1 tetap mengikuti jalur legacy tanpa metadata skema. |
| Identitas | Primary key benar, tidak kosong dan tidak duplikat; `studyNotes.studentId` tetap PK. Settings boleh kosong untuk kompatibilitas, atau tepat satu row dengan id `app`; lebih dari itu ditolak. |
| Tipe data | Validasi field wajib berdasarkan schema/legacy yang didukung, array berisi tipe yang benar, nested objects, boolean dan enum bila ada. Field optional boleh tidak ada. |
| Angka | Harus finite dan memenuhi makna field: nominal/durasi tidak negatif, kuota paket integer positif bila berlaku, skor sesuai domain. Jangan menghitung ulang invoice atau tarif historis saat restore. |
| Tanggal | Tanggal kalender sungguhan, bukan regex saja; bulan 01–12; rentang start <= end. Pisahkan tanggal WIB dari timestamp ISO. |
| Media | Marker Blob benar, base64 valid, field media hasil decode sesuai tipe. Jangan menolak backup historis hanya karena MIME berbeda yang sudah didukung renderer. |
| Relasi inti | Sesi/laporan/payment/study note/rapor/proyek/follow-up harus memiliki pemilik murid yang sesuai. Report/payment yang saling tertaut tidak boleh menunjuk murid berbeda. |
| Relasi historis | Referensi sesi di snapshot laporan dan sourceSessionId follow-up perlu dibedakan dari relasi wajib: periksa perilaku delete yang sudah didukung sebelum menetapkan hard error. |
| Field ekstra | Jangan membuang field tak dikenal secara diam-diam. Tabel tak dikenal tetap ditolak kecuali pengecualian legacy terdokumentasi seperti monthClosings. Field ekstra pada schema yang didukung boleh dipertahankan jika tidak memengaruhi validasi. |

### Kompatibilitas dan keputusan relasi

1. Pertahankan migrasi periode laporan legacy dan dueAt. Jangan mengubah status lunas, sumber manual, nilai invoice, atau cakupan laporan karena validator baru.
2. Jangan mewajibkan field modern pada backup lama sebelum normalisasi. Bila mendukung field legacy `subject`, migrasikan secara eksplisit ke `subjects` sesuai migrasi DB yang relevan dan tambahkan fixture.
3. Audit jalur penghapusan sebelum menolak referensi hilang. Contoh konkret: `deleteStudent` saat ini tidak menghapus expenses terkait. Backup dari data yang sah menurut perilaku aplikasi lama bisa memiliki `expense.studentId` yatim.
4. Untuk referensi historis/opsional yang bisa yatim karena perilaku aplikasi, kembalikan warning pada preview dengan tabel, ID dan field. Pertahankan data asli; jangan diam-diam menghapus expense atau menyetel nominal nol. Minta pengguna mengakui warning sebelum restore melalui kedua jalur file dan Drive.
5. Untuk relasi wajib hilang, referensi lintas murid, atau data yang tidak dapat dirender aman, tolak sebelum penggantian data. Pesan memuat lokasi seperti `sessions[id].durationHours`, bukan seluruh isi catatan atau rahasia.
6. Jika kebijakan warning membutuhkan perluasan `BackupSummary`, gunakan field tambahan yang jelas dan perbarui semua caller. Jangan mengganti daftar count yang sudah dipakai UI.
7. Jangan memasukkan captureDrafts ke BACKUP_TABLES. Pembersihan draf setelah restore mengikuti fase C dan tetap atomik.
8. Jangan menaikkan versi payload hanya karena validator lebih ketat. Jika format berubah, jelaskan perubahan dan dukungan format lama; penambahan tabel lokal saja tidak mengubah format backup.

### Tes penerimaan

- [ ] Round-trip semua tabel backup, foto, tanda tangan, dan logo tetap lulus.
- [ ] Backup v1 dan v2 pra-v11/pra-v13 yang didukung tetap dimigrasikan dengan benar.
- [ ] Payload JSON valid dengan nominal string, array salah bentuk, tanggal mustahil, enum salah, atau Settings non-app ditolak dengan pesan lokasi.
- [ ] Future databaseVersion ditolak meski tableCounts dan payload version cocok.
- [ ] Relasi lintas murid/relasi wajib hilang ditolak; referensi opsional historis mendapat warning sesuai kebijakan tertulis.
- [ ] Unknown legacy table monthClosings tetap diperlakukan sesuai kontrak lama.
- [ ] Kegagalan validasi tidak menjalankan clear/write pada DB ataupun callback backup sebelum restore.
- [ ] Kegagalan backup sebelum restore membatalkan penggantian data.
- [ ] Kegagalan bulkAdd di tengah restore membatalkan seluruh penggantian, termasuk pembersihan draf.
- [ ] Fixture invoice PAID/manual tidak berubah nominal, status, paidAt, dan keterkaitan sesinya akibat validasi.

## 8. Fase E — Kontrak respons AI yang dapat dipercaya (ID 4)

### File sasaran

`src/lib/aiClient.ts`, validator baru misalnya `src/lib/aiValidation.ts`, `src/screens/monthlyReport/useReportGeneration.ts`, `src/screens/monthlyReport/helpers.ts`, serta seluruh caller fitur AI yang masih aktif. Tambahkan tes validator dan tes kegagalan caller yang mengubah DB.

### Langkah implementasi

1. Inventaris fungsi exported dan interface output di aiClient. Cakup narasi laporan, ringkasan, draf catatan sesi, pesan WA, insight murid, draf study note, serta financial insight bila masih memiliki caller.
2. Ubah kontrak internal `callAI` menjadi menerima parser `(value: unknown) => T`, atau mengembalikan unknown yang wajib diparse oleh wrapper fitur. Tidak boleh ada jalur sukses yang hanya `JSON.parse(...) as T`.
3. Validasi envelope HTTP: content harus string berisi JSON yang dapat diparse. Content hilang/null/empty tidak boleh diganti dengan `{}` sebagai hasil sukses. Respons terpotong dilaporkan sebagai tidak lengkap bila metadata mendukungnya.
4. Setiap parser memeriksa field wajib, tipe string nonkosong untuk hasil utama, array/item object, dan nested plan. Optional field yang tidak ada boleh diterima; optional field dengan tipe salah harus ditolak sebelum mutasi.
5. Narasi per sesi hanya boleh merujuk ID yang diminta, tidak boleh duplikat, dan harus lengkap untuk subset sesi yang dikirim. Jangan mewajibkan sesi lain yang sengaja dilewati oleh incremental generation.
6. Validasi seluruh batch sebelum menyimpan hasil apa pun. Jika hasil disimpan ke beberapa sesi/laporan, gunakan transaksi untuk mencegah separuh batch tersimpan saat DB gagal. API call dilakukan sebelum transaksi DB.
7. Jika AI mengembalikan ringkasan kosong atau bentuk salah, pertahankan summary/narrative/quote/plan lama beserta fingerprint. Jangan menandai fingerprint baru karena request yang gagal.
8. Field optional yang tidak diberikan AI tidak menghapus tulisan lama. Penghapusan sengaja oleh pengguna tetap boleh melalui editor biasa.
9. Pertahankan request invalidation saat pengguna berganti murid/periode. Respons terlambat tidak boleh memperbarui scope lain, termasuk setelah validasi selesai.
10. Pertahankan fitur Undo yang ada dan jalur usulan draf sebelum diterapkan. Validasi bentuk tidak menjamin kebenaran fakta; jangan mengklaim bebas halusinasi.
11. Gunakan retry manual dengan pesan jelas. Jangan menambahkan retry otomatis tanpa batas atau panggilan berbayar untuk tes. Pertahankan konfigurasi model dan estimasi biaya yang sudah disepakati.

### Tes penerimaan

- [ ] JSON valid tetapi `{}`, `null`, array root, string root, atau field utama bertipe object ditolak.
- [ ] Respons valid tiap fitur lolos dengan optional field absen sesuai kontraknya.
- [ ] Plan dengan priorities bukan array atau target bukan string gagal sebelum `.filter`/`.trim` dijalankan.
- [ ] Narasi dengan ID asing, duplikat, atau ID diminta yang hilang ditolak tanpa perubahan DB.
- [ ] Respons gagal mempertahankan teks lama dan hash lama; retry sukses baru memperbaruinya.
- [ ] Kegagalan write di tengah batch merollback semua perubahan AI.
- [ ] Respons terlambat setelah pergantian scope tidak menimpa scope lama/baru tanpa otorisasi alur yang benar.
- [ ] Semua tes memakai mock fetch/fixture, tanpa API key nyata atau request berbayar.

## 9. Fase F — Pengaturan atomik dan patch yang tepat (ID 5)

### File sasaran

`src/db/repos/settingsRepo.ts`, caller `saveSettings` di `src/screens/Settings.tsx`, `src/lib/driveBackup.ts`, `src/App.tsx`, dan caller lain hasil pencarian. Tambahkan `src/__tests__/settingsRepo.test.ts` atau perluas tes repo yang sesuai.

### Dua masalah yang harus diselesaikan

**Masalah 1:** read–merge–put di luar transaksi memungkinkan dua patch membaca row lama yang sama. **Masalah 2:** transaksi saja tidak cukup bila form mengirim seluruh snapshot Settings lama dan membawa lastBackupAt/driveBackup yang basi.

### Langkah implementasi

1. Bungkus pembacaan row terbaru, merge, dan put dalam satu `db.transaction("rw", db.settings, ...)`. Semua caller memakai jalur tersebut; id selalu `app`.
2. Pastikan inisialisasi/migrasi tidak menulis snapshot basi. Hash PIN/WebCrypto diselesaikan di luar transaksi lalu gunakan pemeriksaan nilai asal sebelum menerapkan hasil; jangan membuka transaksi yang menunggu crypto atau network.
3. Tentukan patch API bertipe yang menerima partial nested object untuk `ai`, `tutorProfile`, `bankAccounts`, `templatePref`, dan `driveBackup` sesuai kebutuhan caller. Hindari deep-merge generik untuk Blob/array.
4. Semantik: key absen dipertahankan; scalar yang dikirim mengganti; nested field absen dipertahankan; array yang dikirim mengganti seluruh array. Definisikan cara menghapus field optional secara eksplisit, misalnya undefined yang diperiksa melalui own-property. Jangan sampai merge membuat PIN/API key tidak bisa dihapus.
5. Untuk nested object yang belum ada, pakai default yang valid atau wajibkan data pembentuk lengkap. Jangan menghasilkan `driveBackup` berisi backupAt tanpa fileId yang diwajibkan tipe.
6. Form Settings mengirim hanya field yang diedit pengguna. Metadata operasional seperti lastBackupAt/driveBackup tidak boleh ikut patch form umum. Untuk nested field gunakan perbandingan dengan snapshot awal form atau dirty-field tracking, bukan sekadar kirim objek lengkap.
7. Jika dua aksi sengaja mengubah field yang sama, write terakhir yang commit menang. Jaminan utama adalah perubahan ke field berbeda tidak hilang.
8. Hindari mutasi objek DEFAULT_SETTINGS bersama; gunakan factory/salinan nested yang diperlukan untuk fallback.
9. Pertahankan penyimpanan PIN hashed dan kemampuan mematikan AI/menghapus key/reset preferensi. Jangan menampilkan rahasia dalam log pengujian.

### Tes penerimaan

- [ ] `Promise.all` dua patch berbeda (profil dan lastBackupAt) menghasilkan kedua perubahan; gunakan sinkronisasi tes yang benar-benar menguji overlap, bukan mengandalkan keberuntungan scheduling.
- [ ] Patch nested `ai.enabled` dan `ai.apiKey` bersamaan tidak saling menghapus.
- [ ] Form dibuka, backup selesai, lalu form profil disimpan: metadata backup terbaru tetap utuh.
- [ ] Menghapus field optional bekerja sesuai kontrak, termasuk PIN/key bila alur UI mengizinkan.
- [ ] Array preferensi mengganti array lama, bukan menggabungkannya tidak sengaja.
- [ ] Dua inisialisasi bersamaan tetap menghasilkan satu row `app`.
- [ ] Migrasi PIN tidak mengembalikan PIN lama ketika pengguna sudah menggantinya.
- [ ] Gagal put tidak menghasilkan notifikasi sukses atau perubahan parsial.

## 10. Strategi verifikasi dan perintah

Jalankan dari `les-ko-lui/`. Pada PowerShell gunakan `npm.cmd`/`npx.cmd` bila npm.ps1 diblok execution policy. Jangan mengubah execution policy sistem untuk menjalankan tes.

```powershell
git status --short
npm.cmd test -- --reporter=dot
npm.cmd run build
npm.cmd run lint
```

Selama tiap fase, jalankan tes terarah yang baru/terdampak dahulu. Setelah integrasi, jalankan suite lengkap dan build. Lint belum dijalankan dalam audit awal: jika ada kegagalan lama, catat dan bedakan dari perubahan sendiri; jangan menyembunyikannya.

E2E memakai Playwright konfigurasi yang sudah ada. Tambahkan kasus capture recovery dan failure handling pada file terfokus, lalu jalankan file tersebut. Skenario SW perlu konfigurasi produksi terpisah; `playwright.config.ts` utama memakai Vite dev dengan SW mati. Server/profil pengujian harus terisolasi dari sesi pengguna, terutama saat menguji clear/restore.

Untuk inspeksi browser, ikuti skill browser yang tersedia di lingkungan pelaksana. Jangan menyimpulkan PWA aman hanya dari tes fake-indexeddb atau render statis React.

Bukti minimum akhir:

| Area | Bukti |
|---|---|
| Database | Tes rollback batch follow-up, settings race, restore validation, migrasi draf |
| Capture | E2E refresh, salah scope, close-out retry, sesi tidak duplikat |
| AI | Parser malformed response, batch rollback, teks lama tetap utuh |
| PWA | Verifikasi dua build produksi dan pemulihan draf, atau status pending yang jujur |
| Regresi | Suite lama tetap lulus, build berhasil, lint ditinjau |
| Dokumentasi | Panduan aktif dan checklist mencerminkan implementasi final |

## 11. Checklist serah terima

- [ ] A: panduan aktif diselaraskan.
- [ ] B: close-out atomik dan retry idempotent.
- [ ] C: draf tersimpan/pulih, isolasi konteks, lifecycle restore/reset, update PWA aman terverifikasi.
- [ ] D: validasi restore dan kebijakan warning legacy teruji.
- [ ] E: seluruh output AI aktif tervalidasi sebelum mutasi.
- [ ] F: transaksi settings serta patch caller basi ditangani.
- [ ] Tes terarah, suite lengkap, build, dan lint dicatat hasilnya.
- [ ] Verifikasi runtime/PWA dicatat terpisah dari unit test.
- [ ] Tidak ada data pengguna yang dipakai untuk restore/reset pengujian.
- [ ] Tidak ada perubahan pengguna yang dibatalkan dan tidak ada deployment otomatis.

Laporan akhir AI pelaksana harus menyebut: fase selesai, file utama yang berubah, hasil tes aktual, batas verifikasi, dan pekerjaan yang masih pending. Jangan menulis “semua selesai” bila tes produksi PWA masih belum dilakukan.

## 12. Log implementasi — diisi pelaksana

| Tanggal | Fase | Perubahan konkret | Verifikasi aktual | Pending/kendala |
|---|---|---|---|---|
| 2026-09-05 | Perencanaan | Enam lingkup disetujui; dokumen instruksi dibuat | Audit awal: 351 tes lulus dan build berhasil; bukan verifikasi implementasi rencana | Fase A–F belum dikerjakan melalui dokumen ini |

