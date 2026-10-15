# KEPUTUSAN-PEMILIK — putusan atas temuan 2026-10-15

> **Sekilas.** Jenis: daftar keputusan pemilik atas temuan pemeriksaan. Status: **final dan mengikat** — tidak boleh ditanyakan lagi.
> Untuk siapa: agen AI yang bekerja di repo ini, dan pemilik yang mengawasi.
> Baca kalau: menemukan salah satu kode di berkas ini, atau **sebelum bertanya apa pun ke pemilik**.
> **Aturan tertinggi tetap `ATURAN-AI.md`.** Berkas ini melengkapinya: `ATURAN-AI.md` §4 memuat keputusan yang mengikat pekerjaan, berkas ini memuat **putusan atas temuan** beserta alasannya.
> **Kenapa berkas ini ada:** pemilik menuntut *"semua pekerjaan jangan lupa kamu tulis di md atau docs supaya tidak tanya berulang ke saya"* (2026-10-15). Setiap butir di bawah sudah dijawab; **mengulang pertanyaannya dilarang**.

**Kode butir**: `A1–A8` = yang pemilik periksa sendiri · `B1–B8` = yang butuh keputusan pemilik · `C1–C9` = pekerjaan yang boleh diputuskan agen. Kode ini dipakai di `PEKERJAAN.md` §4 dan di laporan pemeriksaan [`LAPORAN-CEK-PEKERJAAN-2026-10-15.md`](LAPORAN-CEK-PEKERJAAN-2026-10-15.md).

---

## 1. Keputusan atas temuan (mengikat)

| Kode | Putusan pemilik 2026-10-15 | Akibatnya bagi pekerjaan |
|---|---|---|
| A1 | "aman clear" | Butir 43 daftar periksa manual **ditutup**; tidak diuji ulang |
| A2 | **"Isi semua dengan AI masih gagal."** Bentuk yang diminta: tanpa menulis ulang catatan/narasi sesi, **cukup Ringkasan · Catatan Guru · Rencana depan**, dan **"jangan terlalu panjang, orang tua juga males bacanya"** | **Keputusan bentuk final.** Tombol "Isi Semua dengan AI" hanya mengisi tiga isian itu; narasi sesi **tidak** ditulis ulang. Tombol perkuat **Kutipan** dihapus dari layar. Batas panjang: ringkasan **maks 4 kalimat**, catatan guru **maks 3 kalimat**, rencana **maks 3 prioritas** — dan perintah prompt di `aiClient.ts` **boleh diubah** untuk ini (keputusan pemilik menembus larangan §3) |
| A3 | "sudah berhasil" | Keluhan "warna biru pemilih gaya" **ditutup** dengan bukti dari perangkat pemilik; tidak ada pekerjaan sisa |
| A4 | "skip dulu aja, aku percaya pasti berhasil" | Butir 39 tetap berstatus **"dilewati atas keputusan pemilik"** — **bukan** "lulus". Jangan dijalankan agen, jangan diangkat lagi sebagai pertanyaan |
| A5 | "sudah berhasil" | Butir 1, 2, 3, 7–23 **ditutup pemilik**. Tanda ✅ dipasang di `PEKERJAAN.md` §5 |
| A6 | "bisa kok export" | Butir 12 **ditutup**. Lokasi ekspor CSV di dalam **Backup dan Restore** dipertahankan apa adanya — tidak perlu menu tersendiri |
| A7 | "tanda seru merah di materi juga sudah muncul. Sub pembelajaran dengan subjek juga sudah sesuai. Sudah di perkuat oke" | Butir 16 dan 18 **ditutup**. Temuan bug dua mapel → topik (C1) **tidak berlaku lagi** sebagai keluhan: pemilik menyatakan sudah sesuai. Yang tetap berlaku: tulis penjaganya supaya tidak kembali |
| A8 | "hapus jadwal dan batalkan sesi juga membuat binggung" | Pekerjaan baru: **perjelas beda "Batalkan sesi" vs "Hapus"** di antarmuka. Teksnya sekarang nyaris tidak membedakan akibatnya |
| B1 | **"b"** — jangan teruskan nominal manual, tetapi **beri tahu tutor** di konfirmasi | `rescheduleSession` **tidak** meneruskan `costOverride`; konfirmasi jadwalkan-ulang menyebut bahwa nominal manual dilepas. **Tidak mengubah uang diam-diam** |
| B2 | "kamu yang pikirkan terbaik" | Pemetaan ulang langkah kondisi diserahkan ke agen; agen wajib menulis usulan + alasannya satu baris sebelum mengubah perilaku |
| B3 | Pemilik menyerahkan **ekspor CSV** (`Les Ko Lui — Ekspor Data`, 15/10/2026) | Gate engagement tetap **tertahan**: ekspor itu **tidak memuat indikator mentah**. Rinciannya §3 di bawah |
| B4 | "ok" | Bug dua mapel → topik: pekerjaan **diterima** (lihat C1) |
| B5 | "Oke saya ijinkan" | Label "Belum" yang tertinggal di empat baris `PEKERJAAN.md` §4 **boleh dibetulkan** |
| B6 | "itu teknis, kamu putuskan" | Hitungan status: **satu butir satu tanda**, kalimat penghitung dihapus, pemeriksa hitungan + self-test dipasang |
| B7 | "oke" | Katalog tangkapan layar dirapikan (C-lanjutan) |
| B8 | "selidiki di akhir" | Penyelidikan `SchemaError: DexieError` ditaruh di **akhir** antrean, bukan sekarang |
| C1 | "setuju" | Tulis penjaga topik lintas mapel (dua mapel → topik keduanya muncul) |
| C2 | **"nanti kita test"** | **SELESAI DIUJI 2026-10-15** dengan izin sandbox penuh dari pemilik: `npm run e2e:uiux` **72 lulus / 0 gagal** memakai bentuk `npx vite --port 5174` yang baru — dan itu sekaligus **bukti perbaikannya benar-benar bekerja**, sebab bentuk lama (`npm run dev -- --port …`) akan membalas 404 di semua permintaan sehingga seluruh 72 tes gagal. `npm run e2e:pwa` juga sudah dijalankan: **1 lulus / 1 gagal**, dan kegagalannya (restore berkas `.jles`, `pwa-runtime.spec.ts:151`) **gagal identik pada baseline `bf5346b`**, jadi bukan akibat perubahan ini. **Jebakan yang terbukti:** `e2e` dan `e2e:uiux` memakai port 5174 yang sama — jalankan berurutan, jangan bersamaan |
| C3 | "kerjakan" | Katalog topik untuk mapel yang belum punya (58 pasang) |
| C4 | "kerjakan" | Matikan `useWebWorker` pada pengecilan foto (3.270 ms → 325 ms, hasil identik byte-per-byte) |
| C5 | "kerjakan" | Jejak audit untuk perubahan sesi |
| C6 | "ya perkuat" | Sub-layar `?tab=ringkasan` masuk cakupan penjaga tampilan |
| C7 | "setuju" | Tinjau ulang peta alias, daftarnya dibangun ulang lebih dulu |
| C8 | "pasti laksanakan" | Katalog IB diperiksa ke panduan silabus resmi |
| C9 | **"tidak masalah, tidak perlu di refactor lagi"** | Baris target `StudentDetail.tsx` **tidak** diseragamkan; ≤800 di bagian G3-06 tetap sebagai catatan keadaan, ≤700 sebagai sasaran yang berlaku |

---

## 2. Satu tanda per butir (putusan B6) — aturan yang berlaku sekarang

**Masalah yang ditutup.** Butir **42** di `PEKERJAAN.md` §5 memuat `✅` **dan** `⏳` sekaligus di satu baris. Akibatnya dua dokumen menghitung sisanya dengan cara berbeda dan hasilnya berbeda (22 vs 21). Itu jenis kesalahan yang sama dengan 2026-10-14: status ditulis dari ingatan.

**Aturan yang berlaku sekarang:**

1. **Satu butir daftar periksa = satu tanda.** Tanda yang sah hanya `✅` (ditutup dengan bukti) dan `⏭` (dilewati atas keputusan pemilik, **bukan** lulus). Tanda `⏳` **dihapus** dari daftar periksa manual — butir yang belum ditutup cukup **tidak bertanda**.
2. **Kalimat penghitung di dokumen dihapus.** Dokumen menulis tandanya per butir, bukan "dua puluh dua butir sudah bertanda". Penghitungnya mesin, bukan kalimat.
3. **Pemeriksa mesin** (`scripts/check-docs-checklist.mjs`, dijalankan dari `npm run check:docs`) melaporkan: jumlah butir, jumlah tiap tanda, butir yang punya lebih dari satu tanda, dan butir yang hilang nomornya. Ia **tidak** menulis jumlahnya ke dokumen mana pun.
4. **Self-test wajib** (`scripts/check-docs-checklist.selftest.mjs`): membangun daftar periksa sintetis dan memastikan pemeriksa **GAGAL** saat seharusnya gagal (dua tanda di satu butir, butir hilang, tanda tak dikenal) dan **LULUS** saat seharusnya lulus.
5. **Alasan butir 42 tanpa tanda.** Bagian (a)-nya tertutup, bagian (b) "percobaan ulangnya berhasil" belum dibuktikan di perangkat — jadi **satu** tanda yang benar untuk butir 42 adalah **tanpa tanda**, dan catatannya menyebut bagian mana yang sudah tertutup.

---

## 3. Gate engagement (B3) — tertahan, dan apa yang dibutuhkan

**Status: TERTAHAN.** Bukan "belum dikerjakan karena malas, tetapi **datanya tidak ada di ekspor yang dikirim**.

Yang diperiksa dari ekspor 2026-10-15 (`Les Ko Lui — Ekspor Data`, bagian `SESI`):

| Kolom ekspor | Isi | Bisa dipakai menghitung bias skor? |
|---|---|---|
| `Skor` | angka akhir (mis. 3, 6, 10) atau kosong | **Tidak** — hanya hasil, bukan penyusunnya |
| `Sumber Skor` | hanya tiga nilai: "tidak diketahui (data lama)" · "tanpa catatan kondisi" · (kosong) | **Tidak** — ini penanda kelengkapan, bukan indikator |
| `Catatan` | narasi panjang, sering terpotong | Tidak andal — teks bebas |
| `Situasi` | kalimat tutor | Tidak andal |

**Yang tidak ada di ekspor dan dibutuhkan:** kolom per indikator (main HP · mengantuk · perlu pengulangan · PR tidak dikerjakan · telat · sering ke toilet · gelisah · sibuk sendiri), label perilaku, dan kualitas respons akademik. Tanpa itu pertanyaan "seberapa sering tutor menandai lebih dari satu negatif" **tidak bisa dijawab**, dan rumus baru hanya akan menukar satu bias dengan bias lain (`PEKERJAAN.md` §4 sudah menulis ini).

**Tiga jalan keluar, dan hanya satu yang murah:**

1. **Tambahkan kolom indikator ke ekspor CSV** (satu kolom per indikator, isinya 0/1). Ini yang paling menentukan: setelah ada, pertanyaannya bisa dijawab dari data yang sudah dimiliki, tanpa menunggu sesi baru.
2. **Hitung dari basis data Dexie di perangkat** lewat skrip sekali-jalan di konsol — tidak mengubah aplikasi, tetapi butuh pemilik menjalankannya.
3. Biarkan tertahan sampai pemilik menganggap skornya adil. Ini sah, tetapi berarti `PEKERJAAN.md` §4 baris engagement tetap berbunyi "Belum diputuskan".

**Catatan kejujuran:** analisis yang bisa saya lakukan dari ekspor ini terbatas pada **sebaran skor** (berapa sesi berskor rendah) dan **apakah catatan menyebut indikator negatif** — keduanya **bukan** pengganti jawaban yang dibutuhkan. Jangan mengutip angka sebaran itu sebagai bukti keadilan skor.

---

## 4. Pekerjaan yang lahir dari putusan di atas, beserta keadaannya

| Kode | Pekerjaan | Keadaan |
|---|---|---|
| A2 | "Isi Semua dengan AI" hanya menulis Ringkasan · Catatan Guru · Rencana; Kutipan tidak diperkuat lagi; batas panjang | **Dikerjakan 2026-10-15** (lihat riwayat `PEKERJAAN.md` §6) |
| A8 | Beda "Batalkan sesi" vs "Hapus" diperjelas | **Dikerjakan 2026-10-15** |
| B1 | Jadwalkan ulang memberi tahu bahwa nominal manual dilepas, dan tidak meneruskannya | Masuk `PEKERJAAN.md` §4 — **belum dikerjakan** (menyentuh uang, tapi bentuknya sudah diputuskan) |
| B6 | Pemeriksa hitungan daftar periksa + self-test | **Dikerjakan 2026-10-15** |
| B8 | Selidiki `SchemaError: DexieError` | **Di akhir antrean** atas keputusan pemilik |
| C1 | Penjaga topik lintas mapel | Masuk `PEKERJAAN.md` §4 — belum dikerjakan |
| C2 | Config Playwright `uiux` + `sw` | Masuk `PEKERJAAN.md` §4 — belum dikerjakan; pengujian dijadwalkan pemilik |
| C3 · C7 · C8 | Katalog topik · peta alias · katalog IB | Masuk `PEKERJAAN.md` §4 — belum dikerjakan |
| C4 | `useWebWorker` dimatikan | Masuk `PEKERJAAN.md` §4 — belum dikerjakan |
| C5 | Jejak audit perubahan sesi | Masuk `PEKERJAAN.md` §4 — belum dikerjakan |
| C6 | `?tab=ringkasan` masuk penjaga tampilan | Masuk `PEKERJAAN.md` §4 — belum dikerjakan |
| C9 | Baris target `StudentDetail.tsx` | **Ditutup oleh keputusan** — tidak dikerjakan, dan itu yang diminta |

---

## 5. Riwayat berkas ini

| Tanggal | Perubahan |
|---|---|
| 2026-10-15 | Dibuat: memuat putusan pemilik atas 25 butir temuan (A1–A8, B1–B8, C1–C9), aturan **satu tanda per butir** (B6), dan keadaan gate engagement (B3) beserta tiga jalan keluarnya. Alasan dibuat: pemilik menuntut keputusan tercatat di dokumen supaya tidak ditanyakan berulang. |
