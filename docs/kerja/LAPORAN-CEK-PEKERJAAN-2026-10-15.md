# LAPORAN-CEK-PEKERJAAN-2026-10-15 — daftar periksa: sudah, belum, dan persentase

> **Sekilas.** Jenis: laporan pemeriksaan keadaan satu kali (titik waktu). Status: potret 2026-10-15, **bukan** daftar pekerjaan.
> Untuk siapa: pemilik aplikasi yang memutuskan langkah berikutnya.
> Baca kalau: mau tahu "apa yang sudah dan belum selesai, berapa persen".
> **Yang tidak ada di sini:** daftar pekerjaan tetap hanya [`PEKERJAAN.md`](PEKERJAAN.md). Laporan ini **tidak** menggantikannya dan tidak boleh dipakai sebagai sumber urutan kerja.
> **Angka di sini adalah potret bertanggal.** Yang berubah setiap commit (versi, jumlah tes, baris berkas) tidak ditulis sebagai keadaan hari ini; cara mengukurnya ada di [`SERAH-TERIMA.md`](SERAH-TERIMA.md) §2.

---

## 1. Sasaran, kriteria terima, dan batas putaran ini

| Hal | Isi |
|---|---|
| Sasaran | Menghitung dan memeriksa **apa yang sudah dan belum selesai** di daftar pekerjaan, bukan mengerjakan pekerjaan itu |
| Kriteria terima | Laporan berbentuk daftar periksa "sudah / belum" beserta **persentase**, dengan tiap angka bisa ditelusuri ke berkas dan barisnya |
| Batas (lingkup) | Hanya **dokumen** dan **git**. **Tidak** menelusuri seluruh berkas kode. Titik mulai: dokumen starter |
| Yang **tidak** dilakukan | Tidak ada berkas kode yang disentuh. Tidak ada pekerjaan di `PEKERJAAN.md` §3–§5 yang dikerjakan atau dicentang |
| Gate yang dijalankan | `npm run check:docs` — **sekali**, di akhir |

**Cara menghitung yang dipakai di laporan ini** (supaya bisa diulang, bukan dari ingatan):

| Angka | Sumber | Cara memeriksa |
|---|---|---|
| Hitungan tugas | [`PEKERJAAN.md`](PEKERJAAN.md) §2 | tabel keadaan, potret 2026-10-11 |
| Butir daftar periksa manual | [`PEKERJAAN.md`](PEKERJAAN.md) §5 | `grep` atas `✅`, `⏳`, `⏭` pada baris bernomor |
| Butir pekerjaan di luar gelombang | [`PEKERJAAN.md`](PEKERJAAN.md) §4 | kolom "Keadaan dan catatan" tiap baris tabel |
| Kebenaran dokumen | — | `npm run check:docs` |

---

## 2. Persentase ringkas (potret 2026-10-15)

> **Potret ini sudah bergerak pada hari yang sama, dan angkanya sengaja TIDAK ditulis ulang di sini.** Sesudah laporan ini, putaran yang sama menjalankan keputusan pemilik atas 25 butir temuan: bentuk "Isi Semua dengan AI" diubah, jejak audit sesi ditambah, dan butir daftar periksa yang dilaporkan lulus 2026-10-15 ditandai. **Angka yang berlaku sekarang dibaca dari `npm run check:docs`** (pemeriksa `scripts/check-docs-checklist.mjs`), bukan dari tabel di bawah — dan itu memang aturan yang lahir dari temuan §5: penghitungnya mesin, bukan kalimat. Keadaan sesudah putaran itu: **44 butir · ✅ 36 · ⏭ 1 · tanpa tanda 6** (butir 8 dan 9 hanya punya catatan agen; sisanya belum diperiksa), sedangkan §4 bertambah pekerjaan baru dan beberapa barisnya ditutup.

| Kelompok pekerjaan | Selesai | Seluruhnya | Persentase | Dasar angka |
|---|---|---|---|---|
| Tugas bergelombang (Gelombang 1–3) | 30 | 32 | **93,8 %** | `PEKERJAAN.md` §2 — "30 selesai, 2 belum dinyatakan tuntas" |
| Butir daftar periksa manual (mata pemilik) — **potret pagi 2026-10-15** | 23 | 44 | **52,3 %** | §5 — 22 baris bertanda `✅` **+ butir 42** (barisnya memuat `⏳` **dan** `✅` sekaligus, lihat §5 di bawah) |
| Butir pekerjaan di luar gelombang (§4) — **potret pagi 2026-10-15** | 10 | 29 | **34,5 %** | §4 — 10 baris `SELESAI`, 14 `Belum`, 5 `Sebagian`/menunggu bukti |

Angka gabungan **tidak** dihitung di sini, dan itu disengaja: kelompok-kelompok di atas **bukan** pekerjaan sejenis. Tugas bergelombang sebagian besar pekerjaan kode agen, sedangkan 44 butir daftar periksa manual hanya bisa ditutup pemilik di perangkat. Menjumlahkan keduanya menghasilkan satu angka yang tidak berarti apa-apa saat dipakai memutuskan. Yang berlaku adalah tiga angka terpisah itu.

---

## 3. Sudah selesai

### 3.1 Tugas bergelombang — 30 dari 32

| Gelombang | Jumlah | Keadaan |
|---|---|---|
| Gelombang 1, kebersihan dan aksesibilitas | 11 | selesai |
| Gelombang 2, fondasi tampilan dan uang | 11 | selesai |
| Gelombang 3, alur kerja | 10 | G3-01…G3-08 tuntas; **G3-09** terpasang dan gate mesin hijau; **G3-10** 4 dari 5 butir |

### 3.2 Butir daftar periksa manual — 23 bertanda `✅`

| Butir | Dasar tanda |
|---|---|
| 4 · 5 · 6 · 24 · 25 | dilihat pemilik di perangkat **2026-10-07** |
| 26 · 27 · 28 · 29 | dilihat pemilik di perangkat **2026-10-08** ("sudah sangat oke") |
| 30 · 31 · 32 · 33 | dilihat pemilik di **HP 2026-10-10** ("sesuai rencana") |
| 34 · 35 · 36 · 37 · 38 · 40 · 41 · 43 · 44 | dilihat pemilik di **server pengembangan 2026-10-14** |
| 42 (bagian a) | "Coba lagi membuka modal biaya" — tertutup bersama butir 41; **bagian b masih terbuka**, lihat §4 |

### 3.3 Butir §4 yang sudah tuntas — 10 baris

D4 (cakupan penjaga tampilan + jejak warna) · D6 (judul H1/H2 layar Keuangan) · D2 (nominal manual tidak tertimpa saat sesi dicatat, v1.103.0) · "sisa lama" yang sengaja tidak dikerjakan · flake beban-tinggi guard tampilan (2026-10-14) · lipatan "Siklus Tagihan" (v1.104.0) · pemilih gaya Draft AI (v1.109.0) · perkuat AI per bagian + ringkasan bertahap (v1.105.0) · narasi sesi tidak lagi disunting di layar Laporan (v1.105.0) · G3-01 butir 9 (v1.102.0).

---

## 4. Belum selesai

### 4.1 Menunggu mata pemilik — 1 butir (+ 1 butir ringan)

| Butir | Yang ditunggu |
|---|---|
| **42 (bagian b)** | Bukti bahwa **percobaan ulang panggilan AI akhirnya berhasil** sesudah v1.105.0 + v1.107.0. Tombolnya sendiri sudah ada; yang belum terbukti adalah keberhasilannya |
| **Keluhan "warna biru pemilih gaya tidak berpindah"** (§4) | **Satu tangkapan layar** modal Draft AI sesudah menekan Perluas. Keluhannya sudah diukur di Chromium dan **tidak bisa direproduksi**, jadi tidak bisa ditutup maupun dibenarkan tanpa bukti dari perangkat |

### 4.2 Butir daftar periksa manual tanpa tanda — 19 butir

1, 2, 3, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23 — **kecuali 10 butir yang sudah dilaporkan lulus pemilik 2026-10-15** (10 · 11 · 13 · 14 · 15 · 17 · 19 · 20 · 21 · 23), yang masih menunggu **centangnya**, bukan pengujiannya.

Butir **3** meleset pada putaran itu (temuan: dua mapel dipilih, daftar topik hanya memuat mapel pertama) dan sudah masuk §4 sebagai bug. Butir **7–9** juga punya temuan turunan di §4 (pemetaan ulang langkah kondisi, keadilan skor engagement).

### 4.3 Butir 39 — dilewati atas keputusan pemilik

Tanda `⏭` "DILEWATI atas keputusan pemilik 2026-10-15". **Bukan "lulus"**: tidak ada bukti runtime bahwa jalur reset bekerja di perangkat. Ini juga menutup butir 5 G3-10 dengan cara yang sama.

### 4.4 Butir §4 yang belum atau baru sebagian — 19 baris (14 `Belum`, 5 `Sebagian`)

| Sumber | Pekerjaan | Keadaan |
|---|---|---|
| 2026-10-15 (butir 1–3) | Dua mapel dipilih → topik hanya mapel pertama | **Belum — bug**, temuan terpenting untuk kode |
| 2026-10-15 (butir 7–8) | Petakan ulang langkah kondisi | Belum — keputusan pemilik |
| 2026-10-15 (butir 9) | Hitung ulang keadilan skor engagement | Belum diputuskan — butuh data sesi nyata |
| 2026-10-15 (config) | D10 belum diterapkan ke `playwright.uiux.config.ts` dan `playwright.sw.config.ts` | Belum — terduga, belum terukur |
| D3 | Tinjau seluruh peta alias | Sebagian — dua kasus terjelas sudah benar |
| D8 | Kegagalan test saat beban tinggi | Belum |
| Katalog topik | 58 dari 167 pasangan belum punya katalog | Sebagian |
| D5 | Periksa katalog IB ke panduan resmi | Belum |
| Backlog | Jejak audit untuk perubahan sesi | Belum |
| Backlog | Temuan audit tampilan sisa audit 2026-10-01 | Sebagian — 73 tetap, 18 sebagian |
| G3-02 butir 2 | Pemilih sub-layar keuangan | Belum |
| 2026-10-08 (G3-05) | `e2e` tidak pernah benar-benar hijau di mesin ini (`SchemaError: DexieError`) | Belum |
| 2026-10-08 (G3-05) | Katalog tangkapan layar tidak lagi cocok dengan spec | Belum — perlu keputusan pemilik |
| 2026-10-14 (D2) | `rescheduleSession` membuang nominal manual | Belum — **menyentuh uang**, dua pilihan sudah dicatat |
| 2026-10-11 (G3-08) | Sub-layar `?tab=ringkasan` tidak masuk cakupan penjaga tampilan | Belum |
| 2026-10-11 (G3-07) | `useWebWorker: true` 10× lebih lambat, hasil identik | Belum diputuskan |
| 2026-10-11 (G3-07) | Baris target `StudentDetail.tsx` ≤700 vs ≤800 | Sebagian — rangkuman sudah benar |
| 2026-10-15 (butir 42) | Keluhan warna biru pemilih gaya | Belum — butuh tangkapan layar |
| D9/D10 | (lihat `SERAH-TERIMA.md` §4.16–4.17) | Sudah ditutup di kode; sisa di baris config di atas |

---

## 5. Temuan pemeriksaan: dokumen yang saling bertentangan

Ini bagian yang paling berguna dari putaran ini — dan **tidak satu pun** di antaranya bisa ditangkap gate mesin yang ada sekarang.

| # | Berkas | Pertentangan | Keadaan yang benar |
|---|---|---|---|
| 1 | `SERAH-TERIMA.md` §5 butir 2 | Menulis "sisanya **dua puluh dua butir**", lalu menyebut **39** dan **42** sebagai yang masih menunggu mata — padahal **42 sudah diberi tanda** di `PEKERJAAN.md` §5 | Yang benar **dua puluh satu**: 19 butir tanpa tanda + 39 (⏭) + 42 (⏳), **tanpa** menghitung butir daftar periksa Pengaturan yang belum dibuat |
| 2 | `SERAH-TERIMA.md` §5 butir 3 | Menyebut **D2** sebagai "satu-satunya sisa yang menyentuh uang" | D2 **sudah ditutup** di `PEKERJAAN.md` §4 (v1.103.0, 2026-10-14) |
| 3 | `PEKERJAAN.md` §5 catatan penghitung | Menulis 44 − 21 = "dua puluh butir tanpa tanda" | Aritmetikanya keliru: 44 − 21 = **23**, dan daftar 20 butirnya memang tidak memuat 39 dan 42 |
| 4 | `PEKERJAAN.md` §4 (4 baris) | Baris berlabel "Belum" padahal di ujung baris yang sama tertulis "SELESAI 2026-10-15 (v1.105.0/v1.109.0)" — perkuat AI, narasi sesi, pemilih gaya, dan mapel/topik | Baris itu **selesai**; labelnya yang tertinggal |
| 5 | `SERAH-TERIMA.md` §2 | Mengutip "butir 1–23 masih terbuka" sebagai hitungan sisa | `PEKERJAAN.md` §5 sudah menyatakan kutipan itu **tidak boleh dipakai lagi** sebagai penghitung |
| 6 | Gate R2 `check:docs` | Lulus **0 pelanggaran** | Diketahui **lulus secara hampa** (`SERAH-TERIMA.md` §2): tidak ada dokumen aktif yang masih punya kepala YAML `versi_app`/`test`, jadi R2 tidak memeriksa apa pun |
| 7 | `scripts/` | — | **Tidak ada** `check-docs.selftest.mjs`; jadi tidak ada bukti gate ini pernah gagal saat seharusnya gagal |

**Akar masalahnya satu, dan sudah tercatat dua kali di repo:** hitungan status ditulis **dari ingatan**, bukan dari penelusuran. Empat dari tujuh temuan di atas adalah kelas kesalahan yang sama dengan yang sudah pernah dilaporkan 2026-10-14 dan 2026-10-15 — jadi aturan "selaraskan status pada putaran yang sama" belum cukup; yang belum ada adalah **pemeriksa mesin** yang menghitung ulang `✅`/`⏳`/`⏭` dan membandingkannya dengan kalimat penghitung di dokumen.

**Rekomendasi (belum dikerjakan, dan bukan wewenang saya untuk memutuskan):** menambahkan pemeriksa itu ke `npm run check:docs` **plus self-test-nya** — atau, kalau ditolak karena `ATURAN-AI.md` §1 butir 4 melarang penjaga baru tanpa alasan regresi, menghapus seluruh **kalimat penghitung** dari dokumen dan hanya menyimpan tandanya per butir. Dua pilihan itu sama-sama menutup temuan 1–5; yang tidak menutupnya adalah membiarkannya seperti sekarang.

---

## 6. Batas kejujuran

1. **Angka §2 berasal dari dokumen, bukan dari pengukuran kode.** Saya tidak menjalankan suite tes dan tidak membaca kode — lingkupnya dokumen dan git. Kalau ada butir yang dokumennya salah, angka di laporan ini ikut salah.
2. **Klasifikasi baris §4 saya lakukan dengan membaca teks kolom terakhirnya**, bukan lewat alat yang dipakai repo. Baris yang isinya bercampur ("Belum" di depan, "SELESAI" di ujung) saya hitung selesai dan saya laporkan di §5.
3. **Persentase §2 bukan ukuran kemajuan proyek.** Ia hanya menjawab "berapa banyak butir yang punya bukti", dan untuk daftar periksa manual buktinya adalah **mata pemilik**, bukan test.
4. **Butir 42 dihitung sekali** walaupun barisnya memuat `✅` dan `⏳` sekaligus, dan itu **beda** dengan cara `PEKERJAAN.md` §5 menghitung (22 baris `✅`). Kalau aturan yang dikehendaki adalah "satu butir = satu tanda", butir 42 harus diberi satu tanda saja lebih dulu.

---

## 7. Gate yang dijalankan

`npm run check:docs` — **lulus, 0 pelanggaran**, dijalankan sekali di akhir putaran. Keluaran angkanya ada di keluaran perintah, bukan disalin ke sini.
