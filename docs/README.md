# Dokumentasi Les Ko Lui — Indeks Utama

> **Sekilas.** Jenis: pintu masuk dokumentasi. Status: berlaku.
> Untuk siapa: pemilik aplikasi dan agen AI yang merawat repository ini.
> Isi: peta ke mana harus membuka sesuatu (bagian 2), persyaratan dokumentasi (bagian 3), aturan penamaan berkas (bagian 4), catatan pekerjaan (bagian 5), riwayat rilis (bagian 6), dan aturan pemeliharaan (bagian 7).
> **Cara pakai: tidak perlu dibaca berurutan.** Pakai tabel di bagian 2.
> **Angka keadaan aplikasi tidak ditulis di halaman ini.** Versi dibaca dari `package.json`, jumlah tes dari `npm run test:sandbox`, jumlah baris berkas dari `npm run measure`.

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

| Mau | Buka | Catatan |
|---|---|---|
| Memulai pekerjaan apa pun | [`kerja/ATURAN-AI.md`](kerja/ATURAN-AI.md) | Pintu masuk wajib. Aturan kerja, keputusan final pemilik, berkas yang dilarang disentuh, perintah, dan jebakan. |
| Melihat daftar pekerjaan beserta spesifikasi lengkapnya | [`kerja/PEKERJAAN.md`](kerja/PEKERJAAN.md) | Satu-satunya daftar pekerjaan. Spesifikasi kesepuluh tugas Gelombang 3 ada di dalamnya, bukan di arsip. |
| Tahu keadaan terakhir dan apa yang belum selesai | [`kerja/SERAH-TERIMA.md`](kerja/SERAH-TERIMA.md) | Keadaan repository, temuan sesi terakhir, dan langkah berikutnya. |
| Melihat jangkar kode, jebakan, dan perintah verifikasi sebuah tugas | [`kerja/CHEATSHEET.md`](kerja/CHEATSHEET.md) | Catatan teknis per tugas. Daftar pekerjaan dan spesifikasinya tetap di `PEKERJAAN.md`. |
| Tahu aturan struktur dokumentasi | [`07-PERSYARATAN-DOKUMENTASI.md`](07-PERSYARATAN-DOKUMENTASI.md) | Dijaga `npm run check:docs`. |
| Tahu cara aplikasi dibangun dan apa yang dilarang disentuh | [`06-ARSITEKTUR-KODE.md`](06-ARSITEKTUR-KODE.md) | Peta kode. Seri lama ada di [`arsip/arsitektur/`](arsip/arsitektur/README.md). |
| Menulis dokumen tugas baru | [`kerja/TASK-02-format-dokumen-tugas-ai.md`](kerja/TASK-02-format-dokumen-tugas-ai.md) | Spesifikasi format dan anti-pola. |
| Melihat cara kerja refactor layar besar | [`kerja/TASK-01-refactor-layar-besar.md`](kerja/TASK-01-refactor-layar-besar.md) | Enam langkahnya masih dipakai untuk tugas Laporan, Murid, dan Pengaturan. |
| Melihat gambar usulan tampilan sebelum menulis kode | [`mockups/`](mockups/) | Berkas HTML mandiri, bisa dibuka langsung tanpa server. |
| Mencari keputusan atau audit lama | [`arsip/README.md`](arsip/README.md) | Ada peta pemindahan isi di berkas itu. |

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

## 6. Riwayat rilis

Riwayat rilis **dipindah ke berkasnya sendiri** pada 2026-10-07 supaya halaman ini tetap jadi router:
[`RIWAYAT-RILIS.md`](RIWAYAT-RILIS.md). Berkas itu **aktif** dan terus ditambah setiap rilis; yang tinggal
di sini hanya penunjuknya.

**Ringkasan tonggak** (jejak lengkap dan seluruh entri ada di berkas itu):

| Tanggal | Peristiwa | Versi |
|---|---|---|
| 2026-10-01 → 2026-10-07 | Gelombang 1 & 2 tuntas, fondasi visual, lalu Gelombang 3 alur kerja berjalan | v1.79.0 → v1.94.0 |
| 2026-10-03 | Gelombang 2 ditutup: satu pintu uang, Beranda non-uang, kerapatan DayView, jalur galat tunggal | v1.88.0 → v1.89.0 |
| 2026-10-05 | Jadwal hari bisa disunting & dipindah murid; tarif ikut pemilik baru | v1.92.0 → v1.93.0 |
| 2026-10-07 | Layar Uang jadi satu layar tiga blok; rekap tahunan terbaca di HP; penjaga tampilan kini mencakup halaman keuangan | v1.94.0 |

> Daftar di atas adalah **empat tonggak**, bukan riwayat. Jangan menambah entri rilis di sini — tambahkan di
> [`RIWAYAT-RILIS.md`](RIWAYAT-RILIS.md).

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

1. **Sebelum mengerjakan apa pun, buka [`kerja/ATURAN-AI.md`](kerja/ATURAN-AI.md).** Isinya aturan kerja, keputusan final pemilik, berkas yang dilarang disentuh, perintah yang dipakai di mesin ini, dan jebakan yang sudah pernah memakan waktu. Urutan yang menang kalau ada konflik: `ATURAN-AI.md`, lalu `06-ARSITEKTUR-KODE.md`, lalu `PEKERJAAN.md`, lalu dokumen tugas.
2. **Daftar pekerjaan hanya satu:** [`kerja/PEKERJAAN.md`](kerja/PEKERJAAN.md). Jangan menaruh daftar pekerjaan di halaman ini atau di README akar. Spesifikasi tugas Gelombang 3 juga ada di berkas itu, bukan di arsip.
3. **Kerjakan satu tugas sampai tuntas, lalu lapor sekali.** Aturan lama yang berbunyi satu langkah per putaran lalu berhenti sudah dicabut pada 2026-10-05 karena membuat pekerjaan tercicil dan membuang waktu pemilik.
4. **Gate dijalankan sekali di akhir tugas, bukan setiap langkah.** Jangan mengulang test untuk membuktikan hal yang sama. Rinciannya di `ATURAN-AI.md` bagian 1.
5. **Jangan menambah penjaga baru tanpa alasan yang menyentuh uang, data, atau regresi yang benar-benar pernah terjadi.**
6. **Jangan bertanya ke pemilik untuk hal yang tidak mengubah uang, tidak mengubah perilaku pengguna, dan tidak menghapus data.** Putuskan sendiri dan catat alasannya satu baris. Pertanyaan yang sudah pernah dijawab tidak boleh diajukan lagi.
7. **Jangan menghapus dokumen dan jangan meringkas isi yang masih dikerjakan.** Pindahkan ke `docs/arsip/`, lalu catat di peta pemindahan di [`arsip/README.md`](arsip/README.md): berkas asal, berkas tujuan, tanggal, dan alasan. Penggabungan dokumen wajib memindahkan seluruh butir pekerjaan yang belum selesai ke `PEKERJAAN.md`. Contoh kejadian yang harus tidak terulang ada di `ATURAN-AI.md` bagian 2.
8. **Dokumen tugas baru masuk `docs/kerja/`** dengan format di [`kerja/TASK-02-format-dokumen-tugas-ai.md`](kerja/TASK-02-format-dokumen-tugas-ai.md).
9. **Angka mutakhir tidak ditulis di dokumen.** Versi dibaca dari `package.json`, jumlah tes dari `npm run test:sandbox`, jumlah baris berkas dari `npm run measure`. Kalau sebuah angka memang harus muncul, tulis beserta tanggalnya. Dijaga `npm run check:docs`.
10. **Jangan membaca berkas yang sangat panjang secara utuh.** Pakai pencarian jangkar dan baca sekitarnya. Daftar berkas beserta jumlah barisnya lewat `npm run measure`.
11. **Setelah mengubah perilaku yang terlihat pengguna:** tambahkan satu entri di `src/lib/version.ts` dan satu baris di [`RIWAYAT-RILIS.md`](RIWAYAT-RILIS.md).
12. **Kalau menemukan fakta yang bertentangan dengan dokumen:** perbaiki dokumennya di sesi yang sama. Jangan biarkan dua dokumen saling bertentangan.
13. **Kalau menemukan pekerjaan yang belum selesai tetapi tidak ada di daftar:** langsung tambahkan ke `PEKERJAAN.md` bagian 4 beserta tanggal dan sumbernya. Jangan menunggu izin.
14. **Seri `arsitektur/` sudah diarsipkan** dan isinya adalah potret lama. Untuk keadaan hari ini, yang berlaku adalah kode, `package.json`, `src/lib/version.ts`, dan riwayat rilis di [`RIWAYAT-RILIS.md`](RIWAYAT-RILIS.md).
