# PANDUAN-CEK-DI-HP — memeriksa layar Murid dari HP (rilis v1.98.0)

> **Sekilas.** Jenis: panduan pemeriksaan untuk pemilik. Status: **berlaku** — bagian A menunggu Anda (foto murid, butir 34–35).
> Untuk siapa: pemilik aplikasi, dengan HP di tangan.
> **Ini bukan daftar pekerjaan.** Daftarnya tetap [`PEKERJAAN.md`](PEKERJAAN.md); butir yang dicentang ada di §5 berkas itu.
> Alasan panduan ini ada: saat dibuat, seluruh tab Murid yang baru **belum pernah dilihat mata manusia** — yang ada baru bukti mesin
> (suite tes, `e2e:uiux` 64 lulus / 0 gagal, dan pengukuran baris). Bukti mesin **tidak** membuktikan tampilannya enak dipakai.
> **Riwayat pemakaian:** pemeriksaan pertama (butir 30–33, tab Murid) **selesai 2026-10-10** dan hasilnya sesuai rencana.
> Sekarang berkas ini dipakai lagi untuk foto murid (butir 34–35, rilis v1.98.0); bagian lama tetap disimpan di bagian A′.

---

## 0. Sebelum mulai — jangan dilewati

**0.1 Alamat aplikasinya.** Bukalah alamat produksi Anda di HP. Saya **tidak** menemukan alamatnya tercatat di
dokumen mana pun, jadi saya tidak mengarangnya: proyek Vercel-nya bernama `les-ko-lui` (tercatat di `.vercel/project.json`),
dan yang membuktikan deployment-nya sudah jalan adalah langkah 0.2.

**0.2 Pastikan HP Anda benar-benar memuat v1.98.0.** Ini langkah paling penting: kalau HP masih memuat versi lama,
**semua** butir di bawah akan tampak "gagal" padahal kodenya belum ada di sana.

- Begitu aplikasi terbuka, harus muncul jendela **Catatan perubahan** dengan:
  - tanggal **2026-10-11**,
  - judul **"Foto murid: unggah, tampil bulat di daftar dan halaman murid, hapus dengan konfirmasi"**,
  - baris **Versi v1.98.0** di bawah judul.
- Tutup dengan tombol **Mengerti, Terima Kasih**. Jendela ini muncul **sekali per versi**, jadi kalau Anda sudah menutupnya
  ia tidak muncul lagi — itu wajar.
- **Kalau jendela itu TIDAK muncul sama sekali:** kemungkinan besar HP masih memuat versi lama (atau Vercel belum selesai
  men-deploy, karena push-nya baru saja). Tutup aplikasi lalu buka lagi, atau muat ulang halaman.
  **Kalau tetap tidak muncul, hentikan pemeriksaan dan beri tahu saya** — melanjutkan hanya akan menghasilkan laporan palsu.

**0.3 Data apa yang dipakai.** Aplikasi ini menyimpan data **di HP Anda sendiri**. Di alamat online **tidak ada pemuat
data contoh**: `seedDummy` hanya hidup di server pengembangan (dipasang `src/main.tsx` di dalam `import.meta.env.DEV`).
Jadi yang Anda periksa adalah **data asli Anda** — bukan data contoh, meski butir daftar periksa di `PEKERJAAN.md` §5
menulis "memakai data contoh" (kalimat itu ditulis untuk server pengembangan).

Konsekuensinya, tiga larangan untuk sesi pemeriksaan ini:

1. **Jangan menekan "Hapus" pada murid asli**, dan jangan sentuh **Hapus Semua Data** di Pengaturan.
2. **Jangan mengubah tarif murid asli** — mengubah tarif memunculkan pertanyaan tentang sesi lama yang belum ditagih.
3. **Untuk butir foto, pakai satu murid yang memang sudah punya foto atau memang Anda siapkan fotonya** — dan perhatikan
   bahwa di butir 35 Anda akan **benar-benar menghapus** foto itu di akhir. Kalau foto itu Anda sayangkan, pakai murid
   percobaan, bukan murid asli.

**0.4 Perkiraan waktu.** Bagian A ±5 menit (dua butir foto). Bagian A′ dan B arsip/opsional.

---

## Bagian A — dua butir foto murid yang menunggu Anda (34–35)

### Butir 34 — foto murid bisa dipilih dan tampil bulat di dua tempat

1. Buka pintu **Murid**, lalu buka salah satu murid dan tekan **Edit** (atau tombol pensil di kartunya).
2. Gulir ke bawah sampai ketemu bagian **Foto Murid** — letaknya **di antara Kontak Murid dan Tarif Les**.
   Di dalamnya ada avatar bulat, tombol **Pilih foto**, dan tiga baris keterangan.
3. Tekan **Pilih foto**, lalu pilih **foto dari kamera HP** (bukan dari galeri) supaya ukurannya benar-benar besar.
   - Prosesnya butuh **beberapa detik** dan tombolnya berubah menjadi **Memproses…** — itu wajar untuk foto kamera 12 MP.
   - Setelah selesai, avatar bulatnya harus berubah menjadi foto itu.
4. Perhatikan dua hal pada hasilnya:
   - **Bentuknya benar-benar bulat** dan fotonya tidak tampak gepeng atau melar.
   - Bagian foto yang keluar dari lingkaran **terpotong rapi** — itu memang disengaja (fotonya sendiri tidak dipotong,
     hanya tampilannya). Yang tidak boleh terjadi: fotonya tampak miring, atau ada bingkai putih di tepinya.
5. Tekan **Simpan**, lalu tekan **Kembali ke Daftar Murid**.
6. **Yang harus terlihat:** kartu murid itu sekarang memakai **foto** sebagai avatar, sedangkan murid lain tetap memakai
   **inisial huruf berwarna**. Ukuran avatar di daftar tetap sama seperti sebelumnya (kartunya tidak berubah tinggi).
7. Buka lagi murid itu (tekan kartunya). **Di sebelah namanya** harus tampil foto yang sama, dalam ukuran lebih besar.
   Judul namanya tetap terbaca dan tidak terdorong keluar layar.

**Kalau salah satu langkah tidak sesuai, catat apa yang Anda lihat** — cukup satu kalimat per butir.

### Butir 35 — menghapus foto, termasuk membatalkannya

Butir ini sengaja memeriksa **dua kali batal** sebelum benar-benar menyimpan, karena itulah satu-satunya bagian yang
tidak bisa dibuktikan oleh tes otomatis.

1. Buka murid yang fotonya baru Anda pasang, tekan **Edit**, gulir ke bagian **Foto Murid**.
2. Tekan **Hapus foto**. Muncul pertanyaan konfirmasi **di dalam formulir** — **bukan** kotak peringatan bawaan peramban
   (yang biasanya muncul di tengah layar dengan tulisan alamat situs di atasnya). Isinya menyebut bahwa foto baru
   hilang **setelah Simpan ditekan**.
3. Tekan **Batal** pada pertanyaan itu. **Yang harus terlihat:** fotonya masih ada, tidak ada yang berubah.
4. Tekan **Hapus foto** lagi, lalu tekan **Ya, hapus foto**. **Yang harus terlihat:** avatarnya berubah menjadi **inisial**.
5. **Sekarang tekan Batal** (tombol di bawah formulir, bukan tombol di pertanyaan konfirmasi). Formulir tertutup.
   Buka lagi murid itu: **fotonya harus MASIH ADA.** Kalau di langkah ini fotonya sudah hilang, berarti Batal tidak
   benar-benar membatalkan — laporkan, itu bug.
6. Ulangi sekali lagi: **Edit → Hapus foto → Ya, hapus foto → Simpan.**
7. **Yang harus terlihat:** foto hilang dari kartu di daftar murid, dan di kepala halaman detail avatarnya kembali
   menjadi inisial berwarna. Buka juga **Pengaturan → Penyimpanan Lokal**: di situ ada satu baris yang menyebut foto
   murid dan foto sesi ikut terhitung dan ikut masuk berkas backup.

---

## Bagian A′ — arsip: butir tab Murid (30–33), sudah dicentang 2026-10-10

> Bagian ini **tidak perlu diulang** kalau layar Murid tidak berubah sejak v1.97.0. Isinya disimpan apa adanya
> karena inilah bukti yang mendasari centang butir 30–33 di `PEKERJAAN.md` §5, dan karena panduan ini akan
> dipakai lagi kalau layar Murid berubah. Sisa Bagian A (foto murid) ada di atas.

### Butir 30 — daftar murid bisa diurutkan dan disaring

1. Buka pintu **Murid** di navigasi bawah.
2. **Yang harus terlihat:** di bawah pemilih **Aktif / Historis** ada tiga hal baru — kotak **Urutkan**, tombol
   **Butuh perhatian (N)**, dan satu baris keterangan.
3. Ganti **Urutkan** ke **Nama (A–Z)** → susunan kartu berubah jadi alfabetis, dan baris keterangan berubah menjadi
   mis. "Menampilkan 12 murid · **urutan Nama (A–Z)**".
4. Ganti ke **Terbaru bergabung** → murid yang paling akhir Anda tambahkan ada di paling atas.
5. Tekan **Butuh perhatian (N)** → daftar menyusut: yang tersisa hanya murid yang punya badge **follow-up** atau
   **tagihan belum dibayar**. Tombolnya berubah jadi **Tampilkan semua**, dan baris keterangan menambah
   "· hanya yang butuh perhatian".
6. Tekan **Tampilkan semua** → daftar penuh kembali.
7. Perhatikan juga: kalau tidak ada murid yang butuh perhatian, tombolnya berbunyi **Butuh perhatian (0)** dan setelah
   ditekan muncul kalimat "Tidak ada murid aktif yang butuh perhatian saat ini."

**Catat kalau meleset:** tombol/kotak terpotong di layar sempit · urutan tidak berubah · angka (N) tidak cocok dengan
jumlah kartu yang punya badge · keterangan urutan tidak ikut berubah.

### Butir 31 — kartu murid tiga baris

Lihat satu kartu murid di daftar yang sama. Isinya **tepat tiga baris keterangan**:

| Baris | Isi yang harus terlihat |
|---|---|
| 1 | Nama + penanda keadaan: jadwal terdekat (mis. "📅 Besok 16:00"), tanda **nonaktif** bila muridnya nonaktif, jumlah **follow-up**, jumlah **tagihan belum dibayar** |
| 2 | Label **pendek** kurikulum + kelas + sekolah, mis. "IGCSE · Grade 10 · SMA Tunas" |
| 3 | "**aktif sejak Agustus 2026**" + "Bulan ini 4 sesi · 6j" atau "Belum ada sesi bulan ini" |

**Yang sengaja TIDAK lagi ada di kartu:** chip mata pelajaran, nama orang tua, dan tulisan "N bulan bersama".
Ketiganya tetap ada di halaman Detail Murid — itu keputusan yang saya ambil dan catat.

**Periksa khusus:** buka murid yang baru Anda tambahkan minggu ini. Baris ketiganya harus menyebut **bulan dan tahun**
yang benar (mis. "aktif sejak Oktober 2026"), bukan "0 bulan bersama".

**Catat kalau meleset:** baris saling menumpuk/terpotong di layar sempit · nama panjang meluber keluar kartu ·
label kurikulum muncul sebagai kode aneh · baris ketiga kosong padahal muridnya jelas punya sesi bulan ini.

### Butir 32 — formulir murid: urutan bagian + siklus tagihan yang terlipat

1. Tekan **+ Tambah Murid**.
2. **Yang harus terlihat, berurutan dari atas:** **IDENTITAS** (Nama Murid → Kurikulum → Kelas/Grade + Sekolah →
   Mata Pelajaran) → **Kontak Orang Tua** → **Kontak Murid** → **Tarif Les** → tombol **Siklus Tagihan** dalam keadaan
   **terlipat**, dengan tulisan di sisi kanannya seperti "Bulanan · Buka".
3. Isi **Nama Murid** = `Cek HP 2026-10-10`, dan **No. WhatsApp Orang Tua** (dua kolom itu wajib; sisanya boleh kosong).
4. Tekan tombol **Siklus Tagihan** → bagiannya terbuka (tulisan tombolnya jadi "Sembunyikan"), pilih
   **Setiap N pertemuan**, isi jumlahnya misalnya 8, lalu tekan tombolnya lagi untuk **menutup**, lalu tekan **Simpan**.
   - **Yang harus terjadi: muridnya benar-benar tersimpan** — jendela tertutup dan kartu barunya muncul di daftar.
   - Kalau tombol **Simpan** tampak tidak melakukan apa-apa, atau muncul keluhan validasi tentang kolom yang tidak
     terlihat di layar, itu **bug yang saya cari** — catat persis apa yang terjadi.
5. Buka murid itu lagi lewat ikon pensil (**Edit**) → **Siklus Tagihan harus langsung terbuka**, dan pilihannya masih
   **Setiap 8 pertemuan**.
6. **Bersihkan:** tutup formulirnya, pada kartu `Cek HP 2026-10-10` tekan **Kelola murid** → **Hapus** → masukkan PIN.
   Murid itu tidak punya sesi atau tagihan, jadi tidak ada data lain yang ikut hilang. **Kalau Anda ragu, tekan
   "Nonaktifkan" saja** dan saya bereskan sisanya.

### Butir 33 — empat tab di halaman satu murid

Buka satu murid yang **sudah punya sesi**, lalu periksa keempat tabnya:

- **Ringkas** — kartu **Perlu Tindakan** di paling atas (mis. "Ada jadwal yang sudah lewat", "Sesi hari ini",
  "Perlu diulang di sesi berikutnya", "3 tagihan belum lunas", "1 tindak lanjut menunggu"). Setiap baris bisa ditekan
  dan membuka tempat mengerjakannya. **Kalau tidak ada yang menunggu, kartu itu tidak muncul — itu benar, bukan bug.**
  Di bawahnya blok **Uang** berisi **Tarif les** dan rincian biaya sesi selesai. Kalau uang sedang terkunci, angkanya
  tampil tersamarkan; tekan **Buka** dan masukkan PIN untuk melihat angkanya.
- **Sesi** — bukti keaktifan, riwayat sesi, dan jadwal murid. Di sini periksa satu hal khusus: menekan tombol
  **Edit catatan sesi** di dalam kartu **tidak boleh** ikut membuka detail sesinya (dulu bisa, karena tombol ada di
  dalam area yang bisa diklik).
- **Progres** — tabel **Prediksi vs Nilai Akhir** (muncul bila ada sesi yang punya prediksi atau nilai akhir, lengkap
  dengan penanda bila nilai akhir di bawah prediksi), kartu **Kesimpulan** tentang murid itu, dan **isian nilai rapor**
  (pilih semester → isi nilai → simpan). Coba simpan satu nilai rapor percobaan, lalu hapus/perbaiki bila perlu.
- **Proyek** — untuk murid **non-IB** yang belum punya proyek harus muncul kalimat
  "**Belum ada proyek untuk murid ini.**" beserta contoh yang bisa dilacak dan tombol **+ Proyek** — **bukan tab kosong**.
  Tekan **+ Proyek**: pemilih jenisnya sekarang bebas (IA · EE · PP · proyek lain), dan kolom mata pelajaran otomatis
  wajib atau tidak wajib mengikuti jenis yang dipilih.
- **Kepala halaman** (di atas judul): tombol **WhatsApp** ke orang tua, ikon **pensil**, dan menu **⋯** berisi
  nonaktifkan/aktifkan serta hapus.

**Catat kalau meleset:** salah satu tab kosong tanpa penjelasan · tabel/grafik terpotong di layar sempit ·
angka uang terlihat padahal uang sedang terkunci · menu **⋯** tidak menampilkan pilihannya.

---

## Bagian B — opsional: butir lama yang juga belum dicentang (1–23)

Butir-butir ini ditulis untuk layar yang sudah lama berubah, jadi kalau Anda ingin sekalian, lakukan per layar
(bukan per butir) — dan cukup catat layar mana yang terasa aneh:

| Layar | Butir | Inti yang dicek |
|---|---|---|
| Catat Sesi (wizard 6 langkah) | 1–10, 13–20 | Katalog topik sesuai jenjang murid · chip topik tidak berganda · undo hapus topik & tindak lanjut · tombol Simpan ada di langkah 5 dan 6 · tanda seru pada langkah wajib · halaman kembali ke atas saat pindah langkah · warna tombol utama nyaman dibaca · draf tersimpan saat keluar lalu kembali |
| Ekspor CSV | 12 | Ada kolom bab topik dan sumber skor; kolom jenjang berbunyi seperti "IGCSE kelas sepuluh", bukan kode tingkat universitas |
| Beranda — panel **Kelola sesi** | 21–23 | Enam aksi bekerja (simpan · batalkan · hapus · catat · tidak hadir · jadwalkan ulang) · pesan berbeda antara batalkan dan hapus · memindahkan sesi ke murid lain memunculkan peringatan nominal lalu konfirmasi, dan nominal manual tidak hilang |
| Uang | 24–25 | Satu layar tiga blok (Ringkasan · Perlu ditagih · Bulan ini) · tiap sub-layar punya tombol "← Kembali ke Uang" · tabel Rekap tiga kolom nyaman dibaca tanpa geser samping, dan CSV-nya sama seperti dulu |

Butir **26–29** (layar Laporan) sudah dicentang 2026-10-08 dan tidak perlu diulang.

---

## Bagian C — cara melapor ke saya

Cukup satu pesan, dengan bentuk seperti ini:

```
Butir 34: LULUS  (atau: MELESET — <satu kalimat apa yang terlihat>)
Butir 35: LULUS
```

Sertakan tangkapan layar bila ada yang meleset — itu paling cepat saya pakai. Untuk butir foto, tangkapan layar
**daftar murid** (memperlihatkan murid berfoto dan murid berinisial berdampingan) dan **kepala halaman detail**
paling berguna, karena bentuk bulat dan potongannya paling sulit dijelaskan dengan kata-kata.

**Apa yang saya lakukan dengan jawaban Anda:**

1. Butir yang **LULUS** saya centang di `PEKERJAAN.md` §5 dengan tanggal dan bukti "pernyataan pemilik", persis seperti
   butir 24–29 dan 30–33 dicentang.
2. Butir yang **MELESET** saya masukkan ke `PEKERJAAN.md` §4 sebagai temuan bertanggal, lalu saya perbaiki dan
   laporkan; kalau perbaikannya menyentuh lebih dari tiga layar, gate-nya dijalankan penuh.
3. Kalau ada yang tidak jelas **apa yang seharusnya terlihat**, tanyakan — panduan ini boleh diperbaiki.

---

## Riwayat berkas ini

| Tanggal | Perubahan |
|---|---|
| 2026-10-10 | Dibuat setelah rilis v1.97.0, untuk memeriksa tab Murid yang baru (butir 30–33) dari HP. Bagian 0 memuat syarat yang tidak boleh dilewati: nomor versi di jendela Catatan perubahan, dan peringatan bahwa di alamat online **tidak ada** pemuat data contoh sehingga yang diperiksa adalah data asli. |
| 2026-10-10 | **Dipakai.** Pemilik memeriksa tab Murid dari HP dan melaporkan hasilnya sesuai rencana; butir 30–33 dicentang di `PEKERJAAN.md` §5 dengan jenis bukti "pernyataan pemilik" (satu pernyataan untuk keempat butir, bukan tangkapan layar atau pengukuran per butir). Status berkas ini berubah menjadi selesai — tetap dipakai lagi kalau layar Murid berubah. |
| 2026-10-11 | **Dipakai lagi untuk foto murid (rilis v1.98.0, butir 34–35).** Judul, nomor versi, dan syarat di bagian 0 diperbarui ke **v1.98.0** (tanggal Catatan perubahan 2026-10-11 dan judul entrinya). Bagian A diganti dengan dua butir foto; panduan tab Murid yang lama **tidak dihapus** melainkan dipindah menjadi **Bagian A′** sebagai arsip yang mendasari centang butir 30–33. Ditambahkan satu larangan baru di bagian 0.3: untuk butir foto, pakai murid yang fotonya memang siap Anda hapus di akhir butir 35. Butir 35 sengaja memeriksa **dua kali Batal**, karena jalur batal itulah satu-satunya bagian G3-07 yang tidak bisa dibuktikan suite tes (repo ini tidak memasang jsdom sehingga formulir tidak bisa dirender di tes). |
