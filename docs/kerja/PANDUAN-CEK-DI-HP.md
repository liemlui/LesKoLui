# PANDUAN-CEK-DI-HP — memeriksa layar dari HP (rilis v1.102.0)

> **Sekilas.** Jenis: panduan pemeriksaan untuk pemilik. Status: **berlaku** — bagian A, B, dan F menunggu Anda.
> Untuk siapa: pemilik aplikasi, dengan HP di tangan.
> **Ini bukan daftar pekerjaan.** Daftarnya tetap [`PEKERJAAN.md`](PEKERJAAN.md); butir yang dicentang ada di §5 berkas itu.
> Alasan panduan ini ada: sebagian tampilan aplikasi ini **belum pernah dilihat mata manusia** — yang ada baru bukti mesin
> (suite tes, `e2e:uiux`, dan pengukuran baris). Bukti mesin **tidak** membuktikan tampilannya enak dipakai.
> **Riwayat pemakaian:** pemeriksaan pertama (butir 30–33, tab Murid) **selesai 2026-10-10** dan hasilnya sesuai rencana;
> pemeriksaan kedua (butir 34–35, foto murid) **belum pernah dijalankan** — bagian A di bawah masih menunggu.
>
> **Keadaan butir per 2026-10-14 sesudah pemeriksaan pemilik di server dev, supaya tidak ada yang dikerjakan dua kali:**
>
> | Butir | Isi | Keadaan |
> |---|---|---|
> | 1, 2, 3, dan 7–23 | layar lama (Catat Sesi · CSV · Beranda) | **terbuka** — panduan ringkasnya di bagian C. Pemilik menilai bagian ini *"terlalu rumit"* dan memilih memperbaiki bug-nya saat muncul saja. **Butir 4 · 5 · 6 sudah dicentang 2026-10-07** (pencarian murid · badge keterlambatan + nama hari Indonesia · panel filter lanjutan) dan tidak lagi termasuk bagian C |
> | 24–29 | Uang tiga blok & Laporan | **sudah dicentang** 2026-10-07/08 — jangan diulang |
> | 30–33 | tab Murid | **sudah dicentang** — 30–33 pada 2026-10-10 di HP, **diperiksa ulang 2026-10-14 di server dev** ("filter aman · aman · aman · aman dan ok") |
> | 34–35 | foto murid | **sudah dicentang 2026-10-14** di server dev — "foto betul sesuai sampai simpan", "hapus foto berhasil, batal juga berhasil" |
> | 36–38 | panel desain laporan & tiga grafik | **sudah dicentang 2026-10-14** — "sudah bagus dan tidak tercampur", "tema, susunan, sampul sudah sangat baik", "bagian ini juga sudah bagus" |
> | 39 | jalur reset total | **sengaja TIDAK dicoba pemilik 2026-10-14** ("reset hampir tidak pernah saya pakai"). Jangan dijalankan di alamat online; kalau kelak mau ditutup, bagian B2 |
> | 40 | backup manual | **sudah dicentang 2026-10-14** — "sudah berhasil kok" |
> | 41 | biaya di kedua tombol AI | **sudah dicentang 2026-10-14** — dengan catatan terpisah bahwa pemilih gaya ringkas/perluas terasa tidak berpengaruh (temuan §4 `PEKERJAAN.md`, belum diperbaiki) |
> | 42 | tombol Coba lagi saat AI gagal | **BELUM — dicoba dan gagal lagi.** Pemilik: *"sudah saya coba saat gagal dan coba ai lagi, ya tetap gagal lagi. Akhirnya ndak pakai ai."* Akarnya konteks yang terlalu panjang, bukan tombolnya (lihat temuan §4) |
> | 43 | biaya di Riwayat Aktivitas | **sudah dicentang 2026-10-14** — "oke sudah baik" |
> | 44 | nominal manual tidak tertimpa | **sudah dicentang 2026-10-14** — mengganti nominal sesi berhasil. Dua bug yang ditemukan saat itu (kolom tersangkut 0 · simpan 0 memakai nominal lama) sudah diperbaiki di v1.104.0 |
>
> **Layar Pengaturan belum punya butirnya sendiri** meskipun v1.100.0–v1.109.0 menyentuhnya. Itu tetap pekerjaan yang menunggu.

### 0.0 Daftar induk — 44 butir, satu halaman

Ini **checklist lengkapnya**, dan ini satu-satunya tempat keempat puluh empat butir terkumpul dalam satu tabel.
Keadaan yang tertulis di sini **potret 2026-10-15**; penandanya yang berlaku tetap di `PEKERJAAN.md` §5, dan
kalau keduanya berbeda, yang menang adalah berkas itu. Kolom "Detail" menunjuk ke bagian di berkas ini —
bagian yang kosong berarti langkahnya **tidak perlu ditulis ulang** karena ringkasan di kolom "Inti" sudah cukup.

| Butir | Keadaan | Layar | Inti yang diperiksa | Detail |
|---|---|---|---|---|
| 1 | ⚠️ lulus, ada cacat lain | Catat Sesi — materi | Katalog topik sesuai jenjang murid — **katalognya sendiri sudah dinilai "oke"**; cacatnya di luar itu (lihat baris 3) | C |
| 2 | ⚠️ lulus, ada cacat lain | Catat Sesi — materi | Daftar bab bisa dibuka; memilih topik menambah chip beserta nama babnya | C |
| 3 | ❌ **MELESET 2026-10-15** | Catat Sesi — materi | Topik yang sama tidak menambah chip kedua (itu lulus) — **tetapi bila dua mapel dipilih, daftar topik hanya memuat mapel pertama**. Sudah masuk daftar pekerjaan | C |
| 4 | ✅ 2026-10-07 | Catat Sesi — materi | Mapel tanpa katalog memunculkan kotak peringatan beserta dua pilihan | — |
| 5 | ✅ 2026-10-07 | Catat Sesi — materi | Murid Nasional tidak pernah melihat hasil berlabel MYP | — |
| 6 | ✅ 2026-10-07 | Catat Sesi — materi | Tidak ada hasil dari mapel lain (Global Politics tidak menarik Matematika) | — |
| 7 | 🔧 **diminta dipetakan ulang** | Catat Sesi — kondisi | Tiga tombol kondisi + enam indikator; tombol "Seperti biasa" masih ada (catatan: butir lama menuntut "Biasa" dihapus — perlu diputuskan). Pemilik meminta langkah ini dipetakan ulang supaya lebih akurat & cepat dipahami | C |
| 8 | 🔧 **diminta dipetakan ulang** | Catat Sesi — kondisi | Tanpa indikator: kartu skor menyatakan skor tidak dihitung | C |
| 9 | 🔢 **diminta dihitung ulang** | Catat Sesi — detail | Dua indikator: skor muncul + keterangan data sebagian; tag mengubah angka di langkah yang sama. Pemilik: "tulisan skor coba dihitung lagi, apa sudah adil" | C |
| 10 | ✅ 2026-10-15 | Murid → Sesi | Sesi tersimpan menampilkan semua indikator & tag; koreksi menyimpan dan mengubah skor | C |
| 11 | ✅ 2026-10-15 | Murid → Nilai | Kartu keseriusan menyebut penyebut "rata-rata dari N sesi", panel cakupan, grafik | C |
| 12 | ❓ belum ketemu 2026-10-15 | Pengaturan → Backup dan Restore | CSV punya kolom bab topik & sumber skor; kolom jenjang berbunyi "IGCSE kelas sepuluh". **Tombolnya bernama "Ekspor data ke CSV (terbaca)" dan ada DI DALAM bagian Backup dan Restore** | C |
| 13 | ✅ 2026-10-15 | Catat Sesi — materi | Hapus chip bertanda bab → pita urungkan → topik kembali ke posisi semula | C |
| 14 | ✅ 2026-10-15 | Catat Sesi — langkah 6 | Hapus tindak lanjut → urungkan → item kembali ke urutan semula | C |
| 15 | ✅ 2026-10-15 | Catat Sesi — langkah 5 | Simpan Sesi tersedia di sebelah Lanjut; laporan sesi terbuka, sesi tersimpan tanpa foto | C |
| 16 | ❓ belum ketemu 2026-10-15 | Catat Sesi — penunjuk langkah | Lingkaran merah berisi `!` di pojok bulatan langkah pada **penunjuk langkah paling atas**, hilang setelah diisi | C |
| 17 | ✅ 2026-10-15 | Catat Sesi — gulir | Pindah langkah menggulir ke atas dan judul langkah berikutnya terlihat | C |
| 18 | 🔧 **lulus, diminta diperkuat** | Catat Sesi — langkah 4 | Isian cepat menyala bersama chip kembarnya; panah/Home/End bekerja. Pemilik: "bisa tapi harus lebih detail, di perkuat" | C |
| 19 | ✅ 2026-10-15 | Catat Sesi — bilah aksi | Tombol utama biru (1–5) / hijau (6) / lebih gelap saat menyimpan; teks putih nyaman dibaca ("semua warna ok") | C |
| 20 | ✅ 2026-10-15 | Catat Sesi — draf | Keluar lalu kembali: isian & langkah pulih beserta keterangan draf tersimpan ("pulih dengan baik") | C |
| 21 | ✅ 2026-10-15 | Beranda — Kelola sesi | Panel naik dengan kolom terisi; batalkan & hapus berbeda dan berkonfirmasi | C |
| 22 | ✅ 2026-10-15 + perlu penjelasan | Beranda — sesi terlewat | Tiga aksi (catat · batalkan · tidak hadir); "tidak hadir" menawarkan gratis/tetap tagihkan. Pemilik meminta **beda "batalkan" dan "tidak hadir" dijelaskan di aplikasi** | C |
| 23 | ✅ 2026-10-15 | Beranda — ganti murid/jam | Peringatan nominal muncul, konfirmasi ganti murid, nominal manual tidak hilang; ganti jam tanpa konfirmasi | C |
| 24 | ✅ 2026-10-07 | Uang | Layar tiga blok tetap + pintasan; tiap sub-layar punya "← Kembali ke Uang" | — |
| 25 | ✅ 2026-10-07 | Uang → Rekap | Tabel tiga kolom tanpa geser samping; CSV tahun sama seperti dulu | — |
| 26 | ✅ 2026-10-08 | Laporan | Bilah aksi menempel + lima langkah; tombol ekspor dan Undo AI di bilah yang sama | — |
| 27 | ✅ 2026-10-08 | Laporan | Murid tanpa sesi: tombol nonaktif beserta satu kalimat alasan di bawahnya | — |
| 28 | ✅ 2026-10-08 | Laporan | Ekspor tidak otomatis menandai "sudah dibagikan" | — |
| 29 | ✅ 2026-10-08 | Laporan — narasi | Status simpan otomatis + konfirmasi "Simpan & lanjut"; penanda ✨ AI hilang setelah disunting | — |
| 30 | ✅ 2026-10-10 | Daftar Murid | Urutkan + tombol Butuh perhatian bekerja, baris keterangan menyebut urutannya | D |
| 31 | ✅ 2026-10-10 | Daftar Murid | Kartu tiga baris; chip mapel dan nama orang tua tidak lagi di kartu | D |
| 32 | ✅ 2026-10-10 | Tambah/Edit Murid | Urutan Identitas → Kontak → Tarif → Siklus; siklus terlipat saat menambah | D |
| 33 | ✅ 2026-10-10 | Detail Murid | Empat tab Ringkas/Sesi/Progres/Proyek; non-IB melihat penjelasan di Proyek | D |
| 34 | ✅ 2026-10-14 | Edit Murid — foto | Foto dari kamera tampil bulat di formulir, daftar, dan kepala detail | A |
| 35 | ✅ 2026-10-14 | Edit Murid — foto | Batal benar-benar membatalkan; hapus baru berlaku setelah Simpan | A |
| 36 | ✅ 2026-10-14 | Laporan — bilah desain | Tema dan Susunan terasa sebagai dua hal berbeda; kisi tema empat kolom | B |
| 37 | ✅ 2026-10-14 | Laporan — tema kustom | Seluruh istilah Indonesia + contoh warna; tema kustom bertahan setelah ditutup | B |
| 38 | ✅ 2026-10-14 | Uang → analitik | Tiga grafik terbaca di 390 px; legenda donat ada; keterangan muncul saat difokus | B |
| 39 | ⏭️ **dilewati** | Pengaturan — Hapus Semua Data | **Diputuskan pemilik 2026-10-15: tidak perlu dijalankan** (jalur reset hampir tidak pernah dipakai). Bukan "lulus" — tidak ada bukti runtime bahwa jalurnya bekerja | B2 |
| 40 | ✅ 2026-10-14 | Pengaturan — Backup | Backup ke File dan ke Drive tidak lagi menolak kata sandi. **Jangan** memulihkan berkasnya | F |
| 41 | ✅ 2026-10-14 | Catat Sesi — tombol AI | Kedua tombol AI menyebut perkiraan biaya, dan modalnya menyebut angka yang sama | F |
| 42 | ⏳ **belum** | Catat Sesi — galat AI | Yang ditunggu: percobaan ulangnya **berhasil** — bukan lagi tombolnya (itu sudah tertutup butir 41) | F |
| 43 | ✅ 2026-10-14 | Pengaturan — Riwayat | Baris "Panggilan AI berbiaya" menyebut fitur + biayanya | F |
| 44 | ✅ 2026-10-14 | Kelola sesi → catat sesi | Nominal manual Anda tetap angka yang Anda isi setelah sesinya dicatat | F |

**Kalau Anda hanya punya waktu sedikit:** kerjakan **butir 42** (satu-satunya ⏳ yang tersisa — menutup temuan yang
menyentuh uang), lalu **butir untuk layar Pengaturan yang belum dibuat**. Butir **1, 2, 3, dan 7–23** boleh kapan
saja: pemilik sendiri sudah menilai bagian itu *"terlalu rumit"* dan memilih memperbaiki bug-nya saat muncul. Dua
di antaranya sudah **dilaporkan lulus 2026-10-15** dan tidak perlu diulang — lihat catatan di bagian C.

---

## 0. Sebelum mulai — jangan dilewati

**0.1 Alamat aplikasinya.** Bukalah alamat produksi Anda di HP. Saya **tidak** menemukan alamatnya tercatat di
dokumen mana pun, jadi saya tidak mengarangnya: proyek Vercel-nya bernama `les-ko-lui` (tercatat di `.vercel/project.json`),
dan yang membuktikan deployment-nya sudah jalan adalah langkah 0.2.

**0.2 Pastikan HP Anda benar-benar memuat v1.102.0.** Ini langkah paling penting: kalau HP masih memuat versi lama,
**semua** butir di bawah akan tampak "gagal" padahal kodenya belum ada di sana.

- Begitu aplikasi terbuka, harus muncul jendela **Catatan perubahan** dengan:
  - tanggal **2026-10-14**,
  - judul **"Backup manual bisa dipakai lagi — dan biaya AI terlihat sebelum tombolnya ditekan"**,
  - baris **Versi v1.102.0** di bawah judul.
- Kalau jendela itu sudah pernah Anda tutup pada versi ini, ia tidak muncul lagi — itu wajar. Cara memastikan nomor
  versinya tetap sama: buka **Pengaturan → Aplikasi**, di situ ada tombol **Catatan perubahan** beserta nomor versi
  yang sedang berjalan.
- **Kalau nomor versinya masih v1.101.0 atau lebih lama:** kemungkinan besar HP masih memuat versi lama (atau Vercel belum
  selesai men-deploy, karena push-nya baru saja). Tutup aplikasi lalu buka lagi, atau muat ulang halaman — atau tekan
  **Perbarui sekarang** di **Pengaturan → Aplikasi**.
  **Kalau tetap tidak berubah, hentikan pemeriksaan dan beri tahu saya** — melanjutkan hanya akan menghasilkan laporan palsu.

**0.3 Data apa yang dipakai.** Aplikasi ini menyimpan data **di HP Anda sendiri**. Di alamat online **tidak ada pemuat
data contoh**: `seedDummy` hanya hidup di server pengembangan (dipasang `src/main.tsx` di dalam `import.meta.env.DEV`).
Jadi yang Anda periksa adalah **data asli Anda** — bukan data contoh, meski butir daftar periksa di `PEKERJAAN.md` §5
menulis "memakai data contoh" (kalimat itu ditulis untuk server pengembangan).

Konsekuensinya, empat larangan untuk sesi pemeriksaan ini:

1. **Jangan menekan "Hapus" pada murid asli**, dan di alamat online **jangan sentuh Hapus Semua Data** di Pengaturan.
2. **Jangan mengubah tarif murid asli** — mengubah tarif memunculkan pertanyaan tentang sesi lama yang belum ditagih.
3. **Untuk butir foto, pakai satu murid yang memang sudah punya foto atau memang Anda siapkan fotonya** — dan perhatikan
   bahwa di butir 35 Anda akan **benar-benar menghapus** foto itu di akhir. Kalau foto itu Anda sayangkan, pakai murid
   percobaan, bukan murid asli.
4. **Butir 39 (reset total) TIDAK boleh dijalankan di alamat online sama sekali.** Butir itu menghapus seluruh data, dan
   di alamat online yang terhapus adalah **data asli Anda** karena tidak ada pemuat data contoh. Butir itu hanya boleh
   dijalankan di **server pengembangan** — caranya ada di bagian B2, dan bagian itu terpisah justru supaya tidak
   tercampur dengan pemeriksaan lain.

**0.4 Perkiraan waktu.** Bagian A ±5 menit (dua butir foto) · bagian B ±6 menit (panel desain + tiga grafik) ·
bagian B2 ±5 menit (**hanya di server pengembangan**) · bagian F ±4 menit (butir 40–44) · **bagian C ±15–25 menit**
bila dikerjakan per butir — tetapi bagian C **boleh dicicil atau dilewati**; kerjakan **per layar**, bukan per butir,
dan cukup catat layar mana yang terasa aneh (pemilik sendiri sudah menilai bagian itu *"terlalu rumit"*). Bagian D
adalah arsip yang sudah dicentang, tidak perlu dibuka lagi.

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

## Bagian B — panel desain laporan dan tiga grafik (36–38)

> Bagian ini **boleh dijalankan di alamat online** dengan data asli Anda: tidak ada langkah yang menghapus apa pun.
> Satu hal yang perlu disiapkan: **satu laporan bulanan yang sudah pernah dibuat** (mis. Juni 2026). Kalau belum ada,
> buat dulu lewat **Laporan → pilih murid + periode → Buat Laporan**.

### Butir 36 — Tema dan Susunan benar-benar terasa sebagai dua hal berbeda

1. Buka **Laporan**, pilih murid Andi dan periode **Juni 2026**, lalu gulir ke bilah desain di bawah pratinjau.
2. **Yang harus terlihat:** judul bilahnya memisahkan dua hal — **`Tema: <nama tema>`** dengan **ikon kilau**, dan
   **`Susunan: <nama susunan>`** dengan **ikon daftar centang**. Bukan satu baris yang mencampur keduanya.
3. Di dalamnya ada **dua tombol terpisah: Tema dan Susunan**. Buka **Tema** — yang terbuka hanya panel Tema. Tutup, lalu
   buka **Susunan** — yang terbuka hanya panel Susunan. *(Ini yang paling mudah "kelihatan gagal": kalau membuka yang
   satu ikut membuka yang lain, laporkan.)*
4. Di panel **Susunan**: chip-nya **dikelompokkan** menjadi **Narasi panjang · Banyak foto · Ringkas**, masing-masing
   dengan satu baris keterangan, dan hanya ada **satu** tombol **Pratinjau susunan terpilih** — **bukan** satu tombol
   pratinjau kecil di tiap susunan seperti dulu.
5. Tekan satu chip susunan: laporannya berganti. Lalu tekan tombol pratinjau: yang tampil adalah contoh susunan yang
   **sedang dipakai** itu.
6. Buka panel **Tema**: kisinya **empat kolom**, nama tiap tema **terbaca utuh** (tidak terpotong), dan tema yang sedang
   dipakai bertanda **centang** — bukan hanya berbeda warna.

**Catat kalau meleset:** salah satu panel tidak bisa dibuka · chip susunan tidak berkelompok · nama tema terpotong ·
tanda centang tidak muncul pada tema yang sedang dipakai.

### Butir 37 — perancang tema berbahasa Indonesia dan contoh warnanya membantu

1. Masih di bilah desain, tekan **Tema kustom**.
2. **Seluruh tulisan di panel itu harus berbahasa Indonesia**, tanpa satu pun istilah Inggris tersisa:
   **Nama tema · Teks judul · Warna latar · Warna aksen · Warna teks · Warna teks sekunder · Bentuk judul · Bentuk label ·
   Bentuk foto · Hiasan · Jenis huruf judul · Jenis huruf isi · Warna palet (4 warna)**.
3. Di bawah **setiap** pilihan bentuk harus ada **deretan contoh warna kecil beserta namanya** (mis. "Balon bal",
   "Klasik sepia sep", "Warna ganda dua"), sehingga Anda bisa membayangkan hasilnya **sebelum** menyimpan.
   *(Pertanyaan yang saya butuh jawabannya: apakah contoh warna itu benar-benar membantu memilih, atau justru menambah
   keramaian? Ini penilaian Anda, bukan penilaian mesin.)*
4. Isi satu tema, tekan **Simpan Tema Kustom**, lalu buka panel **Tema**: tema baru Anda muncul di kisi dan namanya
   tetap terbaca.
5. Tutup panel, lalu buka lagi — tema kustom itu **masih ada**. *(Ini bukti bahwa kunci penyimpanannya tidak berubah,
   sehingga tema yang sudah Anda buat sebelum versi ini pun tidak hilang.)*

### Butir 38 — tiga grafik Keuangan terbaca di layar HP

1. Buka **Uang**, lalu baris pintasan **Analitik lanjutan**, dengan data contoh bulan **Juni 2026**.
2. **Tren kas masuk & pengeluaran:** label sumbu tegak harus **terbaca** dan **tidak bertabrakan** dengan garis sumbu,
   walaupun angkanya ratusan ribu atau jutaan. Sentuh salah satu titik: keterangannya menyebut **nominal penuh**
   (mis. "Uang masuk: Rp 1.200.000"), bukan angka pendek seperti "1,2 jt".
3. **Potensi Sesi per Murid:** nama murid di sumbu datar terbaca, dan tinggi batangnya sesuai.
4. **Pengeluaran per Kategori:** donatnya tampil **beserta legenda** (mis. Platform · Buku · Transport beserta
   persentasenya). **Legenda yang hilang adalah tanda regresi** — di versi-versi sebelumnya legenda itu tidak hidup.
5. **Periksa juga dengan papan ketik** (kalau Anda memakai papan ketik Bluetooth): tekan **Tab** sampai fokus masuk ke
   salah satu batang atau titik grafik — keterangannya harus muncul **sama seperti saat disentuh**.

**Catat kalau meleset:** label sumbu bertabrakan · angka terpotong di tepi layar · keterangan tidak muncul saat disentuh ·
legenda donat hilang · fokus papan ketik tidak masuk ke grafik.

---

## Bagian B2 — jalur reset total, **hanya di server pengembangan** (butir 39)

> ### ⛔ Baca dulu sebelum menekan apa pun
>
> Butir ini **menghapus seluruh data** di perangkat yang menjalankannya. Di **alamat online** yang terhapus adalah
> **data asli Anda**, karena `seedDummy` (pemuat data contoh) hanya hidup di server pengembangan. Karena itu:
>
> - **Jangan jalankan bagian ini di alamat online.** Kalau Anda hanya memakai alamat online, **lewati bagian ini** —
>   lebih baik butir 39 tetap terbuka daripada data asli hilang.
> - Jalankan di **server pengembangan** (`npm run dev` di folder `les-ko-lui`, lalu buka alamat `localhost` yang
>   ditampilkan). Di sana data contoh dimuat sendiri, jadi yang hilang nanti bukan data nyata.
> - Kalau Anda **sudah pernah** menjalankan reset di server pengembangan dan data contoh tidak muncul lagi, muat ulang
>   halaman beberapa saat — pemuat data contoh berjalan sendiri saat basis datanya kosong.
>
> Butir ini sekaligus menutup **butir 5 G3-10** ("uji memakai data contoh, jangan memakai data nyata"), yang tidak bisa
> dijalankan dari sisi saya justru karena alasan di atas.

1. Buka **Pengaturan**, gulir ke paling bawah, dan cari bagian **Hapus Semua Data** — letaknya **di balik pemisah
   bertuliskan "Zona berbahaya"**, bukan di sebelah pengaturan biasa.
2. Tekan tombolnya. **Tiga lapis harus muncul berurutan**, dan **tidak boleh ada satu pun kotak pertanyaan bawaan
   peramban** (kotak yang muncul dengan tulisan alamat situs di bagian atasnya):
   - **Lapis 1:** ringkasan berbentuk **daftar** apa saja yang akan hilang (murid · sesi · laporan · tagihan · tindak
     lanjut · nilai rapor · pengeluaran · proyek tugas panjang · catatan belajar · draf pencatatan sesi · pengaturan
     termasuk PIN, kunci AI, logo, rekening · catatan audit), dengan tombol **Lanjutkan**.
   - **Lapis 2:** kolom yang menuntut Anda mengetik **`HAPUS DATA`** — tombol **Hapus data** baru aktif setelah itu.
   - **Lapis 3:** permintaan **PIN Keuangan**.
3. Konfirmasi. Aplikasi memuat ulang, dan **data kembali kosong**.
4. **Ini bagian terpenting dari butir ini — yang baru dipasang 2026-10-11.** Sesudah muat ulang harus muncul **kotak
   ajakan di atas layar** bertuliskan **"Pasang PIN Keuangan lagi"**, yang menjelaskan bahwa **PIN Keuangan ikut
   terhapus**, beserta dua tombol: **Buat PIN sekarang** dan **Buka backup**.
   *Yang tidak boleh terjadi: layar tampak biasa saja tanpa penjelasan apa pun.* Kalau begitu, laporkan — itu berarti
   yang saya pasang tidak bekerja.
5. Tekan **Buat PIN sekarang**. **Yang harus terlihat:** halaman Pengaturan terbuka **langsung di bagian PIN Keuangan**,
   dan formulir **PIN baru sudah terbuka** — bukan daftar bagian Pengaturan yang semuanya tertutup.
6. Tekan **Batal** tanpa mengisi apa pun, lalu kembali ke layar lain (mis. **Hari Ini**). Kotak ajakannya harus
   **muncul lagi** — ini disengaja, supaya ajakan itu tidak bisa hilang tanpa Anda putuskan.
7. Buat PIN baru sampai **Simpan PIN** berhasil. **Yang harus terlihat:** kotak ajakannya **hilang sendiri**, dan di
   **Pengaturan → Riwayat Aktivitas** ada satu catatan **"Reset semua data"** beserta waktunya.
8. *(Opsional, dan silakan dilewati kalau Anda tidak yakin)* Kalau Anda ingin memastikan pemulihan backup bekerja,
   tekan **Buka backup** pada kotak ajakan itu dan pulihkan dari berkas backup yang sudah Anda unduh. Perlu diketahui:
   **PIN tidak ikut di dalam berkas backup**, jadi pemulihan **tidak** mengembalikan PIN lama.

**Catat kalau meleset:** salah satu dari tiga lapis tidak muncul · muncul kotak bawaan peramban · sesudah muat ulang
tidak ada kotak ajakan · **Buat PIN sekarang** tidak membuka bagian PIN · kotak ajakan tidak muncul lagi sesudah Batal ·
kotak ajakan tidak hilang sesudah PIN disimpan · catatan **"Reset semua data"** tidak ada di Riwayat Aktivitas.

---

## Bagian F — **baru di v1.102.0 dan v1.103.0**: backup, biaya AI, riwayat biaya, dan nominal manual (butir 40–44)

> Empat butir ini lahir dari perbaikan rilis **v1.102.0**. Dua di antaranya menyentuh **uang Anda** (biaya AI) dan
> **keselamatan data** (backup), jadi jangan dilewati. Semuanya bisa dikerjakan **di alamat online** dengan **data asli** —
> **tidak ada satu pun langkah di bagian ini yang menghapus atau mengubah data murid**.

### Butir 40 — Backup manual benar-benar bisa dijalankan lagi

**Kenapa diperiksa:** dua rilis sebelum ini **tidak bisa backup manual sama sekali**. Kolom kata sandi enkripsi sudah
diisi, tetapi isinya tidak pernah sampai ke proses backup, sehingga selalu muncul keluhan "Kata sandi enkripsi minimal
8 karakter!" atau "Masukkan kata sandi backup!" — padahal sandinya panjang. Jadi lulus/tidaknya butir ini bukan soal
tampilan: yang diperiksa adalah **berkas backup-nya benar-benar jadi**.

1. Buka **Pengaturan → Backup dan Restore**.
2. Isi **kata sandi enkripsi** dengan sandi yang Anda pakai biasa (minimal 8 karakter). Perhatikan **penanda keadaan
   kata sandi** di bagian itu — ia menyebut apakah sandi sedang tersimpan di perangkat ini.
3. Tekan **Backup ke File**.
4. **LULUS** bila: tidak muncul keluhan tentang sandi, ada berkas terunduh, dan nama berkasnya masuk akal.
   **MELESET** bila: muncul salah satu dari dua keluhan di atas, atau tidak ada berkas apa pun yang terunduh.
5. Kalau Anda memakai **Backup ke Drive**, ulangi langkah yang sama untuk tombol itu — jalurnya berbeda dan pemeriksaan
   ini belum pernah dijalankan pada keduanya.

> **Catatan apa adanya:** isi berkas backup tidak diperiksa butir ini. Yang diperiksa adalah **jalurnya bekerja lagi** —
> memulihkan (restore) berkas itu ke perangkat ini akan menimpa data asli, jadi **jangan** melakukannya sebagai uji coba.

### Butir 41 — kedua tombol AI menyebut biaya sebelum ditekan

**Kenapa diperiksa:** angka biaya sebelumnya hanya muncul di dalam modal konfirmasi. Sekarang tombolnya sendiri
menyebutkannya, dan itu harus **terbaca** di layar HP — kalau terpotong atau bertabrakan dengan tombol lain, gunanya hilang.
Ada **dua** tombol yang diperiksa, jangan hanya yang pertama.

1. Buka **Catat Sesi**, maju ke langkah **Catatan** (langkah 5), dengan satu murid terpilih.
2. Lihat tombol AI di dekat kotak catatan. **LULUS** bila tombolnya berbunyi seperti **"Draft AI · ±Rp 1"** —
   ada angka biayanya, tidak terpotong, dan tidak menabrak tombol lain.
3. Tekan tombolnya: modal konfirmasi harus menyebut **angka yang sama** dengan yang ada di tombol. Tutup modalnya.
4. Lanjutkan sampai **laporan sesi** terbuka (langkah 6), lalu lihat tombol di bagian **Update Orang Tua**.
   Tombolnya harus berbunyi seperti **"Poles AI · ±Rp 1"** — perlakuan yang sama.
5. **MELESET** bila: salah satu tombolnya hanya berbunyi "Draft AI"/"Poles AI" tanpa angka · angkanya terpotong ·
   atau angka di tombol berbeda dari angka di modal.

> Angka "±Rp 1" itu normal: satu panggilan AI memang di bawah satu rupiah, dan nilainya sengaja dibulatkan **ke atas**
> supaya tidak pernah muncul "Rp 0" — angka yang justru berarti gratis.

### Butir 42 — panggilan AI yang gagal punya tombol "Coba lagi"

Butir ini **butuh panggilan yang gagal**, jadi cara termudah adalah membuatnya gagal dengan sengaja:

1. Buka **Pengaturan → AI**, lalu **kosongkan atau rusak sementara kunci API**-nya (mis. hapus satu huruf di belakang).
2. Kembali ke **Catat Sesi** langkah 5, tekan tombol AI, dan setujui biayanya di modal.
3. **LULUS** bila: muncul pesan galat **beserta tombol "Coba lagi"** di sebelahnya, dan menekan tombol itu membuka
   **modal biaya lagi** (bukan langsung memanggil tanpa konfirmasi — percobaan ulang tetap berbiaya, jadi harganya
   harus tetap terlihat).
4. **MELESET** bila: yang muncul hanya teks galat tanpa tombol · tombolnya tidak melakukan apa-apa · atau panggilan
   berjalan tanpa modal biaya.
5. Kalau Anda sempat, ulangi sekali di **laporan sesi (langkah 6)** pada tombol **Poles AI** — jalur itu memakai
   komponen yang sama tetapi ditempatkan di dalam laporan sesi, jadi pemeriksaannya terpisah.
6. **Kembalikan kunci API Anda** sesudah selesai, lalu ulangi sekali: panggilan harus berhasil seperti biasa.

> Catatan: pesan galat yang Anda lihat berbunyi apa adanya dari penyedia AI. Yang diperiksa butir ini **tombol dan
> alurnya**, bukan bunyi pesannya.

### Butir 43 — Riwayat Aktivitas menyebut fitur dan biaya setiap panggilan AI

**Kenapa diperiksa:** ini yang menjawab pertanyaan "bulan ini uangnya habis untuk apa". Datanya sudah tersimpan sejak
lama, tetapi tidak pernah ditampilkan — jadi jawabannya dulu tidak ada di layar mana pun.

1. Buka **Pengaturan → Riwayat Aktivitas**.
2. Cari baris **"Panggilan AI berbiaya"**.
3. **LULUS** bila barisnya menyebut **fitur** (mis. "Draft catatan" atau "Poles pesan WA") **dan biayanya**
   (mis. "±Rp 1"), di samping jamnya yang sudah ada sejak dulu.
4. Untuk panggilan yang terjadi **sebelum v1.102.0**, barisnya akan berbunyi **"biaya tidak tercatat"** — itu **bukan**
   kesalahan: entri lama memang tidak menyimpan biayanya. **MELESET** hanya bila panggilan **baru** (sesudah versi ini)
   juga berbunyi "biaya tidak tercatat", atau bila biaya tidak muncul sama sekali.

### Butir 44 — nominal manual Anda tidak tertimpa saat sesinya dicatat

**Kenapa diperiksa, dan kenapa butir ini penting:** perbaikan v1.103.0 menyentuh **uang**, dan ini justru hal yang
**tidak bisa dibuktikan suite tes**: apakah angka yang **Anda isi sendiri** benar-benar angka yang tercatat. Bug yang
diperbaiki dulu tidak terlihat dari layar — catatan bahwa nominalnya Anda isi tetap tersimpan, sementara **angka yang
dipakai tagihan** diambil dari kolom lain.

> **Aman dijalankan di alamat online**, tetapi **pakai sesi tiruan/percobaan**, bukan sesi murid sungguhan — langkah ini
> mengubah nominal sebuah sesi. Kalau Anda tidak ingin menyentuh data asli, jalankan di server pengembangan di PC
> (server yang sedang saya nyalakan), tempat datanya data contoh.

1. Siapkan **satu sesi terjadwal** yang boleh Anda ubah (di data contoh sudah ada; kalau tidak ada, buat satu untuk
   murid contoh di tanggal besok).
2. Buka panel **Kelola sesi** untuk sesi itu, lalu **isi nominal manualnya** dengan angka yang **jelas berbeda** dari
   tarif muridnya. Contoh: tarif murid 200.000 → isi **175.000**. Simpan.
3. **Catat sesi itu** seperti biasa (alur Catat Sesi sampai selesai).
4. Buka lagi sesi itu, dan periksa nominalnya.
5. **LULUS** bila nominalnya tetap **angka yang Anda isi** (175.000) — bukan tarif muridnya (200.000).
6. **Pemeriksaan kedua (perilaku lama tidak boleh berubah):** ambil sesi **lain yang tidak Anda beri nominal manual**,
   lalu catat sesinya. Nominalnya harus **tetap** memakai tarif murid — kalau berubah jadi kosong atau nol, itu meleset.
7. **MELESET** bila: nominal manual kembali ke tarif otomatis · atau sesi tanpa nominal manual jadi tidak punya nominal.
   Kalau meleset, tulis tarif muridnya dan angka yang Anda isi di laporan — dua angka itu cukup untuk saya lacak.

---

## Bagian D — arsip: butir tab Murid (30–33), sudah dicentang 2026-10-10

> Bagian ini **tidak perlu diulang** kalau layar Murid tidak berubah sejak v1.97.0. Isinya disimpan apa adanya
> karena inilah bukti yang mendasari centang butir 30–33 di `PEKERJAAN.md` §5, dan karena panduan ini akan
> dipakai lagi kalau layar Murid berubah. Butir yang masih **menunggu** ada di bagian A (foto murid), B (panel
> desain + grafik), dan B2 (reset total, hanya di server pengembangan).

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

## Bagian C — opsional: butir lama yang juga belum dicentang (1, 2, 3, dan 7–23)

> **Hasil pemeriksaan pemilik 2026-10-15 (satu putaran, perangkat pemilik) — dibaca sebelum mengerjakan bagian ini:**
> **LULUS:** 10 · 11 · 13 · 14 · 15 · 17 · 19 ("semua warna ok") · 20 ("pulih dengan baik") · 21 · 23 ("muncul dengan
> baik"). **LULUS dengan permintaan penguatan:** 18 ("langkah cepat bisa tapi harus lebih detail, di perkuat").
> **Tidak lulus / ada cacat:** **1–3** — katalognya sendiri sudah "oke", tetapi **saat dua mapel dipilih, daftar topik
> hanya memuat mapel pertama** (temuan baru, sudah masuk daftar pekerjaan); **7 dan 8** — bukan cacat, melainkan
> permintaan pemilik untuk **memetakan ulang langkah kondisi** supaya lebih akurat dan lebih cepat dipahami;
> **9** — permintaan **menghitung ulang keadilan skor**; **22** — perlu **penjelasan beda "batalkan" dan "tidak hadir"
> di dalam aplikasi**; **12 dan 16** — pemilik tidak menemukan tempatnya, dan **petunjuk lokasinya sudah diperbaiki di
> butir masing-masing di bawah**. Butir **4, 5, dan 6** tidak disebut dalam putaran itu (sudah dicentang 2026-10-07).

Butir-butir ini ditulis untuk layar yang sudah lama berubah. Kerjakan **per layar**, bukan per butir: satu kali
masuk ke Catat Sesi, kerjakan butir 1–3, 7–20 sekaligus. Tidak ada satu pun langkah di bagian ini yang menghapus
data murid, tetapi butir 10 menyimpan perubahan pada sebuah sesi — pakai **sesi contoh/tiruan** bila ada.

> **Kotak centang di bagian ini untuk menandai langkah mana yang sudah Anda kerjakan di HP.** Yang menentukan
> butirnya tertutup atau tidak tetap penanda di `PEKERJAAN.md` §5 — kotak di sini **bukan** penggantinya, dan
> saya yang memindahkan hasilnya ke sana setelah Anda melapor.

### Butir 1 — katalog topik mengikuti jenjang murid

- [ ] Buka **Catat Sesi**, pilih **murid IGCSE** yang mapelnya berkode, lalu masuk sampai **langkah materi** (topik).
- [ ] Ketik `algebra`.
- [ ] **LULUS** bila muncul keterangan bahwa yang ditampilkan adalah topik jenjang **IGCSE** dan **hanya** topik IGCSE yang muncul.
- [ ] **MELESET** bila topik jenjang lain (mis. MYP atau tingkat universitas) ikut tercampur, atau keterangan jenjangnya tidak muncul sama sekali.

### Butir 2 — daftar bab bisa dibuka dan menambah chip bertanda bab

- [ ] Masih di langkah materi, buka pilihan **dari daftar bab**.
- [ ] **LULUS** bila daftar bab muncul, membuka satu bab menampilkan topiknya **dengan tanda centang**, dan memilih satu topik menambah **chip beserta nama babnya**.
- [ ] **MELESET** bila bab terbuka tetapi isinya kosong, centang tidak muncul, atau chip yang masuk tidak menyebut babnya.

### Butir 3 — topik yang sama tidak menambah chip kedua

- [ ] Pilih satu topik **dari pencarian**, lalu pilih topik yang **sama** dari daftar bab.
- [ ] **LULUS** bila chip-nya tetap **satu** (tidak berganda).
- [ ] **MELESET** bila muncul dua chip untuk topik yang sama — ini membuat tutor mengira ada dua topik.

### Butir 7 — tiga tombol kondisi dan enam indikator

- [ ] Masuk **langkah kondisi** (sebelum langkah detail).
- [ ] **LULUS** bila tampil **tiga tombol kondisi** dan **enam indikator**, tombol untuk membuka enam indikator lain bekerja, dan tombol **"Biasa"** sudah **tidak ada**.
- [ ] **MELESET** bila tombol "Biasa" masih ada (tombol itu sudah dihapus dari desain), atau indikatornya tidak bisa dibuka.

### Butir 8 — tanpa indikator, skor tidak dikarang

- [ ] Ketuk **hanya** tombol "seperti biasa", lalu lanjut ke **langkah detail**.
- [ ] **LULUS** bila kartu skor **menyatakan bahwa skor tidak dihitung**.
- [ ] **MELESET** bila tetap muncul angka skor padahal tidak ada satu indikator pun yang diisi.

### Butir 9 — skor muncul dengan keterangan data sebagian

- [ ] Isi **dua indikator**, lalu masuk **langkah detail**.
- [ ] **LULUS** bila skor muncul beserta keterangan **kelengkapan data sebagian**, dan setelah Anda memilih **tag respons**, angkanya **ikut berubah di langkah yang sama** (tidak perlu pindah langkah dulu).
- [ ] **MELESET** bila skor tidak muncul, keterangan "sebagian" tidak ada, atau angkanya baru berubah setelah pindah langkah.

### Butir 10 — sesi tersimpan menyimpan seluruh indikator dan tag

- [ ] **Simpan sesi** itu seperti biasa, lalu buka detailnya dari **Murid → tab Sesi** (riwayat sesi).
- [ ] **LULUS** bila **semua indikator dan tag** tampil di detailnya, dan **tombol koreksi** menyimpan perubahan **beserta skornya ikut berubah**.
- [ ] **MELESET** bila ada indikator/tag yang hilang, atau skor tidak ikut berubah sesudah dikoreksi.

### Butir 11 — kartu keseriusan menyebut penyebutnya

- [ ] Buka **Murid → tab Nilai**.
- [ ] **LULUS** bila kartu keseriusan belajar menampilkan **penyebut berupa rata-rata dari sekian sesi**, ada **panel cakupan data**, dan ada **grafik kualitas respons akademik**.
- [ ] **MELESET** bila angkanya muncul tanpa menyebut dari berapa sesi, atau panel cakupan/grafiknya tidak ada.

### Butir 12 — CSV: kolom baru dan jenjang yang terbaca manusia

> **Lokasi yang benar (pemilik tidak menemukannya 2026-10-15, dan itu wajar):** ekspornya **bukan** menu bernama
> "Ekspor" di Pengaturan. Namanya **"Ekspor data ke CSV (terbaca)"** dan tombolnya berada **di dalam bagian
> "Backup dan Restore"**, di bawah kolom kata sandi enkripsi — keterangannya berbunyi "CSV terbaca tanpa app
> (cadangan tambahan)". Jadi: **Pengaturan → Backup dan Restore → gulir ke bawah → Ekspor data ke CSV (terbaca)**.

- [ ] Buka **Pengaturan → Backup dan Restore**, gulir ke bawah, tekan **Ekspor data ke CSV (terbaca)**.
- [ ] **LULUS** bila ada kolom baru untuk **bab topik** dan **sumber skor**, dan kolom **jenjang** berisi label seperti **"IGCSE kelas sepuluh"** — bukan kode tingkat universitas.
- [ ] **MELESET** bila kolomnya tidak ada, atau jenjangnya masih berbunyi seperti kode (mis. "Grade 10 IB" alih-alih label Indonesia).

### Butir 13 — hapus chip topik bisa diurungkan

- [ ] Di **langkah materi**, hapus **satu chip topik yang punya bab**.
- [ ] **LULUS** bila muncul **pita pesan dengan tombol urungkan**, dan setelah ditekan topiknya **kembali ke posisi semula beserta label babnya**.
- [ ] **MELESET** bila tidak ada tombol urungkan, atau topiknya kembali tetapi **tanpa** label bab dan di urutan yang berbeda.

### Butir 14 — hapus tindak lanjut bisa diurungkan

- [ ] Di **laporan sesi pada langkah enam**, hapus **satu tindak lanjut**.
- [ ] **LULUS** bila muncul konfirmasi lebih dulu, dan setelah diurungkan itemnya **kembali ke urutan semula**.
- [ ] **MELESET** bila tidak ada konfirmasi, atau itemnya kembali tetapi berpindah ke urutan paling bawah.

### Butir 15 — Simpan Sesi tersedia di langkah lima

- [ ] Di **langkah lima**, isi catatan.
- [ ] **LULUS** bila tombol **Simpan Sesi** tersedia **di sebelah tombol Lanjut**, dan setelah ditekan **laporan sesi terbuka** serta **sesinya tersimpan tanpa foto dan tanda tangan**.
- [ ] **MELESET** bila tombolnya tidak ada di langkah lima (harus pindah ke langkah enam dulu), atau sesinya tidak tersimpan.

### Butir 16 — tanda seru pada langkah wajib yang belum lengkap

> **Di mana melihatnya (pemilik menanyakan ini 2026-10-15):** tanda serunya adalah **lingkaran merah kecil berisi
> `!`** yang menempel di **pojok kanan-atas bulatan langkah** pada **penunjuk langkah di bagian paling atas layar
> Catat Sesi** — bukan di dalam isi halaman. Ia juga terbaca pembaca layar sebagai "…, belum lengkap"
> (terbukti di snapshot browser: *"Langkah 1: Jadwal (saat ini), belum lengkap"*).

- [ ] Di **langkah satu**, sebelum murid dipilih: **LULUS** bila lingkarannya bertanda **`!`**, dan tandanya **hilang** begitu murid dipilih.
- [ ] **LULUS** juga bila **langkah lima** bertanda `!` selama catatannya masih kosong.
- [ ] **MELESET** bila tidak ada tanda `!` sama sekali, atau tandanya tidak pernah hilang sehingga tidak lagi menunjuk apa pun.

### Butir 17 — pindah langkah menggulir ke atas

- [ ] Dari langkah satu, **gulir jauh ke bawah**, lalu ketuk **lanjut**.
- [ ] **LULUS** bila halaman kembali ke atas dan **judul langkah berikutnya langsung terlihat**.
- [ ] **MELESET** bila Anda mendarat di tengah halaman baru dan harus menggulir sendiri untuk tahu ada di langkah mana.

### Butir 18 — isian cepat: satu pilihan, dua tempat, papan ketik jalan

- [ ] Di **langkah empat**, ketuk **"lancar"** pada isian cepat.
- [ ] **LULUS** bila tombol itu **menyala** dan **chip yang sama di daftar bawah ikut menyala** (satu pilihan, bukan dua).
- [ ] Kalau Anda memakai papan ketik: tombol **Tab** masuk **sekali** ke dalam kelompok, **panah** memindahkan pilihan dan **membungkus di ujung**, **Home/End** menuju ujung, dan tombol **kosongkan** tetap terjangkau.
- [ ] **MELESET** bila kedua tempat itu tidak sinkron, atau Tab masuk ke setiap tombol satu per satu (artinya perannya bukan satu kelompok pilihan).

> **Permintaan pemilik 2026-10-15:** *"Langkah cepat bisa tapi harus lebih detail, di perkuat."* Artinya isian cepat
> di langkah empat **bekerja**, tetapi dirasa terlalu ringkas untuk dipakai menilai kondisi — sudah masuk daftar
> pekerjaan sebagai permintaan penguatan, bukan bug.

### Butir 19 — warna tombol utama nyaman dibaca

- [ ] Baca tombol utama di **bilah aksi** pada setiap keadaan: langkah satu sampai lima **biru**, langkah enam **hijau**, keadaan sedang menyimpan **lebih gelap**.
- [ ] **LULUS** bila teks putihnya **nyaman dibaca** di ketiga keadaan itu. Periksa juga **kepala laporan sesi** supaya warnanya masih terlihat bagus.
- [ ] **MELESET** bila ada keadaan yang teksnya pudar atau menyatu dengan latarnya — sebutkan yang mana.

### Butir 20 — draf bertahan saat keluar lalu kembali

- [ ] Isi satu catatan, tunggu sampai muncul keterangan **draf tersimpan**, keluar ke **Beranda** lewat navigasi bawah, lalu buka lagi halaman **Catat Sesi**.
- [ ] **LULUS** bila **isian dan langkahnya kembali** seperti semula, dan muncul **baris keterangan bahwa isian tersimpan sebagai draf**.
- [ ] **MELESET** bila isiannya kosong lagi, atau langkahnya kembali ke awal tanpa penjelasan.

### Butir 21 — panel Kelola sesi untuk sesi hari ini / akan datang

> **Catatan penting apa adanya:** panel ini **belum pernah diklik mesin maupun manusia**. Berkas test yang hijau
> hanya membuktikan Beranda masih dirender, bukan bahwa keenam aksinya bekerja — jadi butir ini yang paling perlu
> mata Anda.

- [ ] Di **Beranda**, ketuk baris **sesi hari ini** atau **sesi yang akan datang**.
- [ ] **LULUS** bila panel **Kelola sesi** naik dari bawah dengan kolom **murid, tanggal, jam mulai, dan durasi sudah terbuka**, dan aksi utamanya **simpan perubahan**.
- [ ] Buka **menu aksi lain**: **Batalkan sesi** dan **Hapus** terlihat beserta **satu baris keterangan perbedaannya** di bawah tiap tombol, keduanya menampilkan **konfirmasi lebih dulu**, dan setelah dikonfirmasi sesinya **benar-benar hilang dari jadwal**.
- [ ] **LULUS** juga bila **tidak ada tombol "tidak hadir"** di konteks ini (tidak hadir hanya untuk sesi terlewat — butir 22).
- [ ] **MELESET** bila panel tidak naik, kolomnya kosong, salah satu aksi tidak berkonfirmasi, atau sesinya tidak hilang.

### Butir 22 — panel untuk sesi terlewat

- [ ] Di **Beranda**, buka **sesi yang terlewat** (baris kuning bertanda **terlewat**).
- [ ] **LULUS** bila panel **Kelola sesi terlewat** menampilkan **tiga aksi di badannya: catat · batalkan sesi · tidak hadir**.
- [ ] Pada **tidak hadir**: pilihan **gratis** atau **tetap tagihkan** muncul, dan **kalimat biayanya ikut berubah** saat Anda berganti pilihan.
- [ ] Di **menu tambahan**: ada **jadwalkan ulang** dengan tanggal pengganti **mulai dari hari ini**, dan **hapus**.
- [ ] **MELESET** bila hanya ada satu-dua aksi, kalimat biayanya tidak berubah, atau tanggal pengganti menawarkan tanggal yang sudah lewat.

### Butir 23 — memindahkan sesi ke murid lain, dan mengganti jam

- [ ] Di **Beranda**, buka sesi hari ini / akan datang, lalu **ubah kolom murid** ke murid lain.
- [ ] **LULUS** bila muncul **peringatan di panel** yang menyebut nominal **dihitung ulang memakai tarif murid baru** — atau menyebut **nominal manual sesi ini tidak diubah** bila sesi itu punya nominal manual — dan **tanpa angka rupiah** di peringatan itu.
- [ ] Setelah menyimpan, **muncul konfirmasi ganti murid**; setelah dikonfirmasi **sesinya pindah** ke murid itu.
- [ ] Periksa di **layar Keuangan**: nominalnya memakai **tarif murid baru** dan masuk ke **tagihan murid baru**.
- [ ] Ulangi dengan **hanya mengubah jam**: **tidak boleh ada konfirmasi**, dan **nominal manual yang pernah diisi tidak boleh hilang**.
- [ ] **Sesi terlewat tetap tanpa pemilih murid** — itu benar, bukan cacat.
- [ ] **MELESET** bila peringatan tidak muncul, nominalnya tetap tarif murid lama, atau nominal manual Anda hilang setelah jam diubah.

> **Permintaan pemilik 2026-10-15:** *"Antara batalkan dan tidak hadir ini kasih info jelas bedanya apa."* Bedanya
> sebenarnya sudah tercatat di kode dan sudah diuji, tetapi **belum pernah ditulis di dalam aplikasi**:
> **Batalkan sesi** = sesi tidak jadi berlangsung dan **tidak menagih siapa pun** (dipakai untuk sesi yang batal,
> mis. murid membatalkan lebih dulu). **Tidak hadir** = sesi tetap dihitung sebagai pertemuan yang **telah
> disepakati**, dengan dua pilihan: **gratis** (tidak ditagih) atau **tetap tagihkan** (ditagih seperti sesi biasa).
> Perbedaan inilah yang menentukan muncul atau tidaknya nominal di tagihan murid. Sudah masuk daftar pekerjaan sebagai
> permintaan penjelasan di antarmuka.

---

## Bagian E — cara melapor ke saya

Cukup satu pesan, dengan bentuk seperti ini:

```
Butir 1: LULUS   (atau: MELESET — <satu kalimat apa yang terlihat>, atau: BELUM SAYA COBA)
Butir 2: ...
...
Butir 44: LULUS
```

Bagian C (butir 1, 2, 3, dan 7–23) **tidak wajib dilaporkan per butir** — cukup sebutkan **layar mana** yang terasa
aneh, mis. *"Catat Sesi: bagian kondisi aman, tapi chip topik sempat berganda"*. Kalau sebuah butir Anda lewati,
tulis **LEWAT** — jangan dikosongkan, supaya tidak terbaca sebagai lulus.

Sertakan tangkapan layar bila ada yang meleset — itu paling cepat saya pakai. Untuk butir foto, tangkapan layar
**daftar murid** (memperlihatkan murid berfoto dan murid berinisial berdampingan) dan **kepala halaman detail**
paling berguna, karena bentuk bulat dan potongannya paling sulit dijelaskan dengan kata-kata. Untuk butir 39,
tangkapan layar yang paling berguna adalah **kotak ajakan "Pasang PIN Keuangan lagi"** sesudah muat ulang.

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
| 2026-10-15 | **Daftar induk 44 butir ditambahkan (§0.0), dan Bagian C akhirnya punya langkah per butir.** Sebelum ini panduan berkas ini memuat langkah rinci hanya untuk **butir 34–44** (sebelas butir); dua puluh butir sisanya — **1, 2, 3, dan 7–23** — hanya berupa satu tabel ringkas per layar, sehingga tidak ada satu tempat pun yang memuat keempat puluh empat butir sekaligus. Yang ditambahkan: (a) **§0.0 "Daftar induk — 44 butir, satu halaman"** berisi tabel lengkap (butir · keadaan · layar · inti · bagian detail) dengan keadaan **potret 2026-10-15** dan penegasan bahwa penanda yang berlaku tetap di `PEKERJAAN.md` §5, supaya tabel ini tidak menjadi sumber kebenaran kedua; (b) **Bagian C ditulis ulang per butir** dengan bentuk yang sama seperti Bagian A/B — langkah, **LULUS**, dan **MELESET** — untuk butir 1, 2, 3, dan 7–23, termasuk catatan apa adanya bahwa panel **Kelola sesi** (butir 21) belum pernah diklik mesin maupun manusia; kotak centang di Bagian C **bukan** pengganti penanda di `PEKERJAAN.md` §5. (c) Bagian E diperluas: format laporannya kini menyebut butir 1–44, ditambah opsi **LEWAT**, dan pelaporan Bagian C boleh per **layar**, bukan per butir. (d) Perkiraan waktu §0.4 diperbarui (Bagian C ±15–25 menit bila dikerjakan per butir, dan boleh dicicil). **Tidak ada langkah baru yang mengubah data**: tidak satu pun butir di Bagian C menghapus data murid; butir 10 menyimpan perubahan pada sebuah sesi, jadi pakai sesi contoh bila ada. |
| 2026-10-15 | **Tabel keadaan diselaraskan dengan `PEKERJAAN.md` §5, dan dua barisnya dibetulkan.** Butir **4 · 5 · 6** dan **24 · 25** yang selama ini masih terdaftar "terbuka" di tabel ini ternyata **sudah dicentang pemilik 2026-10-07** — barisnya di `PEKERJAAN.md` §5 baru ikut ditandai pada hari ini, jadi panduan ini sempat menyuruh memeriksa ulang hal yang sudah tertutup. Yang berubah: baris "1–23" menjadi **"1, 2, 3, dan 7–23"** beserta alasan mengapa 4–6 keluar dari daftar, **Bagian C** mengikuti penomoran yang sama (dan baris Uang 24–25 dicoret sebagai sudah dicentang), nomor versi di baris "Layar Pengaturan" diperluas ke **v1.109.0**, dan sebagai konteks: **v1.109.0 menutup keluhan "pemilih gaya terasa tidak berpengaruh"** yang tercatat di baris butir 41 (v1.105.0 perkuat AI per bagian + narasi hanya-baca · v1.107.0 ringkasan sesi untuk AI · v1.109.0 pemilih gaya Draft AI). Larangan dan syarat di bagian 0 **tidak berubah**. |
| 2026-10-11 | **Diperluas menjadi panduan seluruh sisa daftar periksa, dan nomor versinya diperbarui ke v1.101.0.** Sampai hari ini berkas ini hanya memuat butir 30–35, sementara `PEKERJAAN.md` §5 sudah sampai butir 39 dan **butir 1–23 tidak punya panduan sama sekali** — hanya satu tabel ringkas per layar. Yang ditambahkan: (a) **tabel keadaan butir** di kepala berkas, supaya tidak ada pemeriksaan yang diulang (24–29 dan 30–33 sudah dicentang, jangan diulang lagi); (b) **Bagian B** untuk butir 36–38 (panel desain laporan, perancang tema, tiga grafik Keuangan) dengan pertanyaan penilaian yang memang hanya bisa dijawab pemilik, mis. apakah contoh warna itu membantu atau justru menambah keramaian; (c) **Bagian B2** untuk butir 39 (jalur reset total + ajakan PIN baru) yang **dipisah dan diberi peringatan sendiri**, karena butir itu menghapus seluruh data dan **wajib dijalankan di server pengembangan** — di alamat online yang terhapus adalah data asli; (d) **larangan keempat** di bagian 0.3 untuk hal yang sama; (e) bagian arsip tab Murid diganti nama menjadi **Bagian D**, bagian laporan menjadi **Bagian E**, dan bagian lama 1–23 menjadi **Bagian C**, supaya urutannya mengikuti `PEKERJAAN.md` §5. Cara memastikan nomor versi juga ditambah satu jalan kedua lewat **Pengaturan → Aplikasi**, karena jendela Catatan perubahan hanya muncul sekali per versi sehingga tutor yang sudah menutupnya tidak punya cara memeriksa versi. |
