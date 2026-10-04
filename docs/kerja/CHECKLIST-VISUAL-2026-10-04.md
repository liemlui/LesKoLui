# Checklist visual — v1.89.1 (pemeriksaan manual pemilik)

> **Untuk siapa:** pemilik aplikasi · **Dibuat:** 2026-10-04 · **Diperiksa:** v1.89.1 (commit `85182fd`)
> **Kenapa manual:** gate otomatis hanya mengukur kontras, ukuran sentuh, dan emoji. Ia **tidak** menilai
> bentuk ikon, rasa, dan keterbacaan. Empat belas titik di bawah ini butuh mata manusia.
> **Cara lapor:** sebut **nomor bagian** + apa yang terlihat. Contoh: `A2: ikon dua orang turun ke baris
> kedua di lebar 360 px`. Tidak perlu rapi — nomor + gejala sudah cukup.
>
> **HASIL pemeriksaan 2026-10-04 (pemilik):** seluruh titik **aman** kecuali **G3** — ekspor JPG/PNG
> multi-halaman hanya menyimpan berkas terakhir → **diperbaiki di v1.89.2** (berkas pertama tersimpan
> langsung, sisanya jadi tombol "Unduh halaman N"). Ringkasan lengkap: `docs/README.md` §4.4.1.
> Pemeriksaan **H (Chrome Android)** menutup `G2-05`.

---

## 0. Menyiapkan (pilih salah satu)

| Cara | Perintah | Catatan |
|---|---|---|
| **Dev di laptop** | `npm run dev` → `http://localhost:5173` | Data contoh **masuk otomatis** saat database kosong (murid IB MYP/DP, Cambridge IGCSE, AP, Nasional) · **PIN Keuangan = `123456`** |
| **Dari HP** | `npm run dev -- --host` → buka `http://<IP-laptop>:5173` dari HP (satu Wi-Fi) | Untuk uji "pasang aplikasi"/PWA, pakai `npm run build` + `npm run preview -- --host` |
| **Situs** | leskolui.vercel.app | Hanya setelah Vercel selesai membangun dari `main` |

- Saat pertama dibuka, modal **"Catatan perubahan"** muncul (versi baru). Tekan **Mengerti** dulu.
- Kalau data contoh tidak muncul: buka DevTools → Console → ketik `seedDummy(true)` lalu Enter.
- Warna v1.89.1 = tampilan masa kini; kalau Anda membandingkan dengan HP yang masih versi lama, muat ulang dulu.

**Tabel centang cepat**

| # | Bagian | Selesai? |
|---|---|---|
| A1 | Ikon Pengaturan (Beranda) | ☐ |
| A2 | Ikon "Murid aktif" (Beranda) | ☐ |
| B1 | Badge & ikon di daftar Murid | ☐ |
| B2 | Banner "butuh perhatian" (Murid) | ☐ |
| C1 | Judul "Catatan Belajar" (Detail murid) | ☐ |
| C2–C3 | Warna chip "Kondisi les" & suasana hati | ☐ |
| D1–D3 | Chip & tombol alur Catat Sesi (langkah 3, 6, sheet) | ☐ |
| D4 | Kolom CUSTOM (langkah 2) | ☐ |
| E1–E2 | Badge asal tagihan & pil status (Keuangan) | ☐ |
| F1–F3 | Label pembaca layar (TalkBack) | ☐ |
| G1–G4 | Laporan: catatan panjang · layout · ekspor · modal changelog | ☐ |
| H1–H5 | Chrome Android (menutup `G2-05`) | ☐ |
| I | 12 langkah Catat Sesi (`docs/README.md` §4.3) | ☐ |

---

## A. Beranda — `/`

### A1. Tombol **Pengaturan** — kanan atas header
- **Di mana:** baris paling atas. Kiri: judul **"Les Ko Lui"** + tanggal kecil. Kanan: **satu tombol ikon kotak 44×44 px** (satu-satunya kontrol di baris itu).
- **Sebelumnya:** emoji ⚙️ berwarna → lalu di v1.89.0 jadi ikon garis penyesuaian → **sekarang gerigi (cog)**.
- **Yang benar:** bentuknya terbaca sebagai **gerigi**: cincin luar, **8 gigi** rapi mengelilingi, dan lingkaran kecil di tengah (lubang). Gigi tidak saling tumpang tindih dan tidak terlihat seperti matahari/bintang. Warnanya abu keunguan (`--ink-muted`), dan saat disentuh muncul latar abu lembut.
- **Tanda salah (lapor):** gigi tampak menempel jadi satu blok; ikon terlihat gepeng/terpotong; ikon terlalu besar sehingga menyentuh tepi tombol; bentuknya masih garis-garis (berarti versi lama masih terpasang — muat ulang dengan cache kosong).

### A2. Kartu **"Murid aktif"** — di blok ringkasan operasional
- **Di mana:** di bawah header, kartu dengan **garis tebal biru di sisi kiri**, label kapital kecil **"MURID AKTIF"**, angka besar, deskripsi *"Kelola jadwal & follow-up."*, dan baris **"Lihat murid ›"**.
- **Sebelumnya:** emoji 👥. **Sekarang:** ikon SVG **dua orang** (14 px) di **kanan atas kartu**, sebaris dengan label.
- **Yang benar:** ikon sejajar **tengah** dengan label kapital (bukan naik/turun), tidak terpotong tepi kartu, dua figur terbaca (satu kepala di depan, satu di belakang).
- **Tanda salah:** ikon membesar sehingga kartu jadi lebih tinggi; ikon menempel di bawah label; label "MURID AKTIF" terpotong.

### A3. Kartu lain di blok yang sama (pembanding)
- Lihat kartu lain di blok itu: apakah tinggi, jarak, dan warna aksennya masih konsisten dengan kartu "Murid aktif" setelah ikonnya diganti.

---

## B. Daftar Murid — `/students`

### B1. Baris setiap murid — tiga tempat kecil
| Tempat | Teks yang terlihat | Ikon baru |
|---|---|---|
| Badge kuning | "**N follow-up**" | lonceng kecil (11 px) di depan angka |
| Badge merah | "**N tagihan belum dibayar**" | ikon kartu/struk (11 px) di depan angka |
| Baris statistik | "**Nama orang tua**" (di baris yang sama dengan "Bulan ini: N sesi · Nj") | ikon orang (12 px) di depan nama |

- **Yang benar:** ikon **sejajar dengan teksnya** (agak tenggelam sedikit, bukan naik), ada jarak ±4 px dari teks, dan **badge tetap satu baris** (tidak melipat dua). Nama orang tua yang panjang tetap dipotong dengan "…".
- **Tanda salah:** badge melipat dua baris; angka terpisah jauh dari ikonnya; ikon lebih besar dari tinggi teks sehingga badge ikut meninggi; nama orang tua mendorong baris jadi dua baris.
- **Uji lebar sempit:** kecilkan jendela sampai selebar HP (±360 px) dan ulangi — ini yang paling sering memunculkan masalah.

### B2. Banner **"N murid butuh perhatian (follow-up atau tagihan)"**
- **Di mana:** tepat di atas daftar murid, kotak kuning lembut.
- **Sebelumnya:** emoji 🔔. **Sekarang:** ikon lonceng 14 px berwarna kuning tua di kiri teks.
- **Yang benar:** ikon sejajar dengan dua baris teks bila teksnya melipat; tidak ada emoji tersisa berbentuk lonceng berwarna.

---

## C. Detail murid — `/students/:id`

### C1. Judul kartu **"Catatan Belajar"**
- **Di mana:** gulir ke bawah, kartu dengan kolom teks catatan belajar (di bawahnya ada tulisan kecil *"Topik sekolah, PR dari sekolah, progres belajar…"*).
- **Sebelumnya:** judul `<h2>` "📝 Catatan Belajar". **Sekarang:** **ikon pensil 13 px** di dalam `<h2>` + teks "Catatan Belajar" (tanpa emoji).
- **Yang benar:** pensil sejajar tengah dengan teks judul, jarak ±6 px, tinggi baris judul **tidak berubah**, dan tidak ada emoji 📝 di mana pun di kartu itu.
- **Tanda salah:** judul turun satu baris; pensil lebih besar dari teks judul; alignment meleset (pensil agak naik/turun jelas).

### C2. Panel koreksi sesi → bagian **"Kondisi les"** (3 chip: Lancar · Biasa · Berat)
- **Cara ke sana:** buka satu sesi di daftar riwayat → tombol ubah/koreksi → panel muncul dengan bagian **"KONDISI LES"**.
- **Yang berubah:** **warnanya** (diambil dari warna bertema, bukan daftar warna mentah). Isi tetap: emoji keadaan (✅ 🌤️ ⚠️) **memang sengaja tetap emoji** — jangan dilaporkan.
- **Yang benar, per chip:**
  - **Lancar** = hijau (terpilih: latar hijau tua + teks putih; tidak terpilih: latar terang + garis hijau + teks hijau tua).
  - **Biasa** = netral (terpilih: latar abu sangat tua + teks putih; tidak terpilih: latar terang + garis abu).
  - **Berat** = oranye (terpilih: latar oranye tua + teks putih; tidak terpilih: latar terang + garis oranye).
- **Yang benar secara umum:** chip terpilih vs tidak terpilih **langsung terlihat bedanya**; teks tetap terbaca di keempat keadaan (dua keadaan × warna); saat kursor di atas chip tidak terpilih, latarnya berubah lembut.
- **Tanda salah:** chip terpilih dan tidak terpilih sulit dibedakan; teks hilang/nyaris tidak terbaca; muncul warna di luar hijau/netral/oranye.

### C3. Panel yang sama → bagian **"Suasana hati"** (5 chip emoji)
- Pastikan chip ini **tidak terpengaruh** perubahan warna di atas (ia memang tetap emoji + warna abu/biru standar).

---

## D. Catat Sesi — `/capture` (wizard 6 langkah)

Langkah: **1 Jadwal · 2 Materi · 3 Kondisi · 4 Detail · 5 Catatan · 6 Bukti**.

### D1. Langkah 3 **(Kondisi)** → chip level besar
- **Di mana:** tiga tombol besar bersusun, tiap tombol punya emoji + judul ("Lancar"/"Biasa"/"Berat") + satu baris keterangan kecil.
- **Yang berubah:** **warnanya** (token). Bentuk, urutan, dan jumlahnya **tidak** berubah.
- **Yang benar:** chip terpilih jelas (latar pekat + teks putih, baris keterangan agak transparan namun tetap terbaca); saat tidak terpilih latar terang dengan garis tipis; jarak antar tombol tetap rapi (tidak berdempetan).
- **Tanda salah:** keterangan kecil jadi tidak terbaca saat chip terpilih; chip "Biasa" menyatu dengan latar halaman (tidak terlihat sebagai tombol).

### D2. Langkah 6 **(Bukti)** → tombol aksi utama di bawah
- **Sebelumnya:** "✅ Simpan Sesi". **Sekarang:** **"Simpan Sesi"** (tanpa lambang centang).
- **Yang benar:** tombol tetap penuh lebar, teks rata tengah, tidak ada spasi ganjil di awal teks, warna gradien hijau tidak berubah.

### D3. Setelah menyimpan → sheet **"Laporan sesi"** → tombol paling bawah
- **Sebelumnya:** "🏁 Selesai & Lihat Profil". **Sekarang:** **"Selesai & Lihat Profil"** (tanpa emoji, tanpa spasi di depan).
- **Yang benar:** teks rata tengah; saat menekan, label sementara berubah menjadi "Menyimpan..." **tanpa spasi di depan**.

### D4. Langkah 2 **(Materi)** → panel pemilih mapel → bagian **CUSTOM**
- **Cara ke sana:** langkah 2 → buka pemilih mapel → gulir ke bawah panel sampai ada label kapital **"CUSTOM"** dengan kolom isian bertuliskan **"Ketik mapel lain..."**.
- **Yang berubah:** hanya untuk pembaca layar (tak terlihat). **Yang benar secara visual:** kolom tetap sama seperti sebelumnya (lebar penuh, tinggi sama, teks petunjuk abu).

---

## E. Keuangan — `/payments` (PIN `123456` untuk data contoh)

### E1. Tab **Tagihan** (`/payments?tab=tagihan`) → setiap baris tagihan
| Elemen | Sebelumnya | Sekarang |
|---|---|---|
| Badge kecil di kiri baris: **Paket / Bulanan / Laporan / Manual** | indigo · biru muda (sky) · biru · abu | indigo lembut · **biru lebih pekat** · biru muda · abu |
| Pil di kanan baris: **Lunas / Belum dibayar** | hijau lembut / kuning lembut | hijau lembut / kuning lembut (rona sedikit beda) |

- **Yang benar:** keempat badge **masih bisa dibedakan satu sama lain** pada pandangan sekilas; teks kecil di dalamnya terbaca; pil "Lunas" jelas berbeda dari "Belum dibayar".
- **Yang perlu Anda putuskan:** badge **Bulanan** dan **Laporan** sekarang sama-sama keluarga biru — bedanya hanya kepekatan latar. Kalau menurut Anda terlalu mirip, saya bisa beri keluarga warna lain.
- **Tanda salah:** dua badge tampak identik; badge memudar sampai teksnya sulit dibaca; warna pil "Belum dibayar" tampak sama dengan "Lunas".

### E2. Layar PIN Keuangan (kunci)
- **Di mana:** `/payments` saat masih terkunci → kotak PIN di tengah.
- **Yang berubah:** hanya pembaca layar (lihat bagian **F1**). **Yang benar secara visual:** kotak PIN tetap lebar tetap, teks rata tengah, dan yang penting: **5 spec otomatis mencari kolom ini lewat teks "PIN (6 digit)"** — jadi teks petunjuk itu harus tetap terlihat sama.
- **Tanda salah:** teks petunjuk berubah/hilang.

---

## F. Pembaca layar (butuh TalkBack/VoiceOver — tidak ada perubahan visual)

Aktifkan TalkBack di HP (Setelan → Aksesibilitas), lalu:

| # | Layar | Yang harus diumumkan |
|---|---|---|
| F1 | `/payments` saat terkunci | Kolom PIN dibacakan sebagai **"PIN Keuangan (6 digit)"** (sebelumnya hanya "PIN (6 digit)" dari teks petunjuk) |
| F2 | `/capture` langkah 2 → CUSTOM | Kolom dibacakan sebagai **"Ketik mapel lain"** |
| F3 | `/settings` → bagian **AI & DeepSeek** → baris **Model** | Saat masuk ke blok nilai Model, dibacakan **"Model"** sebagai nama grup (sebelumnya label itu tidak menempel pada apa pun) |

- **Tanda salah:** dibacakan sebagai "kolom tanpa nama"; dibacakan dua kali; nama grup tidak muncul.

---

## G. Laporan — `/report`

Data contoh: pilih murid **Andi Pratama** + bulan **Juni 2026** → tombol **Buat Laporan**.

### G1. Catatan sesi panjang tidak terpotong *(sudah Anda nyatakan OK — ulangi cepat sebagai konfirmasi versi baru)*
- **Yang benar:** semua teks catatan terbaca penuh, tidak ada yang terpotong di batas halaman; halaman **bertinggi mengikuti isi** (tidak ada kotak potret).
- **Catatan:** pemilih rasio **3:4 sudah dihapus** (keputusan Anda 1 Oktober) — jadi ketiadaan pemilih rasio itu **benar**, bukan bug.

### G2. Daftar layout
- **Cara:** tab **"Ubah tema & layout ▸"** → tombol **"Layout"** → muncul **26 chip** layout (Infografis Expert, Cards, Timeline, … Snapshot).
- **Yang benar:** semua chip terlihat, bisa diklik, ada tanda chip yang sedang aktif; setelah diklik muncul pesan **"Layout diganti!"**.
- **Tanda salah:** chip kosong/terpotong; pesan tidak muncul; halaman laporan jadi kosong.

### G3. Ekspor
- Klik **JPG**, lalu **PNG**, lalu **PDF**: pastikan berkas benar-benar terunduh dan isinya tidak terpotong.

### G4. Modal **Catatan perubahan**
- Muncul sekali setelah versi berubah. Entri **teratas harus "v1.89.1"**. Gulir isinya: **tidak boleh ada emoji** di judul/tombol modal, dan teksnya terbaca.

---

## H. Chrome Android — menutup `G2-05` (terblokir sejak awal)

Prasyarat: `npm run build` lalu `npm run preview -- --host`, buka dari HP.

| # | Yang diperiksa | Tanda benar |
|---|---|---|
| H1 | Ketuk kolom isian (mis. nama murid, catatan sesi) | Halaman **tidak** melompat/zoom; papan ketik muncul tanpa menutupi kolom |
| H2 | Ketuk kolom PIN Keuangan | Papan ketik angka muncul; 6 angka muat tanpa terpotong |
| H3 | Tombol ikon di Beranda & daftar Murid | Mudah dikenai jempol (tidak salah tekan tombol sebelahnya) |
| H4 | Navigasi bawah (Beranda · Murid · Uang · + Catat) | Tidak menutupi tombol aksi terakhir di halaman; tab aktif terlihat jelas |
| H5 | Chip level di langkah 3 Catat Sesi | Tersentuh tanpa salah tekan; perbedaan terpilih/tidak terpilih terlihat |

---

## I. Alur Catat Sesi versi baru (12 langkah)

Jalankan daftar periksa di **`docs/README.md` §4.3** (12 kotak). Ini menutup pekerjaan manual yang tertunda
(§4.2 #11) — soal perilaku, bukan tampilan, tetapi sekalian.

---

## J. Yang SENGAJA tidak berubah — jangan dilaporkan sebagai bug

1. **Emoji kosakata keadaan** tetap emoji: suasana hati (5 chip), chip situasi (7), indikator perilaku (12), tag respons (26), dan level sesi (✅ 🌤️ ⚠️). Ini keputusan pemilik (TASK-11 opsi A).
2. **Tidak ada pemilih rasio 3:4** di Laporan (dihapus 2026-10-01).
3. **Emoji dekoratif** tetap ada: label grafik, teks banner, keadaan kosong (🎉), dan templat laporan.
4. Modal changelog memuat entri **lama** yang masih beremoji — itu arsip, biarkan apa adanya.
