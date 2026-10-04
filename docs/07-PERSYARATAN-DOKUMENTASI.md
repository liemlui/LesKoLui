# 07 — Persyaratan dokumentasi (kontrak, bukan saran)

> **Sekilas** · Jenis: **kontrak dokumentasi** · Dibuat: 2026-10-05 · Status: **aktif**
> **Untuk siapa:** siapa pun (manusia atau AI) yang menulis, memindahkan, atau mengarsipkan dokumen.
> **Baca kalau:** akan mengubah struktur dokumentasi, atau bertanya "kenapa dokumennya begini".
> **Berasal dari:** permintaan pemilik 2026-10-05 — *"ubah docs yang tidak valid, arsipkan, buat
> pekerjaan membacanya tidak berulang, rangkum setingkat maksimal agar efisien, tata ulang struktur
> sesuai kenyataan"* — lalu dikunci sebagai keputusan **Q-9…Q-17 opsi A** dan **A20** (`kerja/ATURAN-AI.md` §9).

Aturan ini **berlaku** karena dokumentasi sebelumnya gagal dengan cara yang terukur (§1). Setiap
persyaratan punya **cara memeriksanya**; yang tidak bisa diperiksa bukan persyaratan, hanya harapan.

---

## 1. Kenapa aturan ini ada (ukuran, bukan kesan)

| Gejala yang terukur 2026-10-05 | Angka |
|---|---|
| Jumlah tes tertulis di dokumen | **18 tempat / 13 berkas**, hanya **3** yang benar |
| Angka baris `CaptureSession.tsx` di dokumen | 22 tempat, hanya **2** yang benar |
| Cap versi yang tertulis di dokumen | 4 nilai berbeda (v1.70.5 · v1.73.0 · v1.75.1 · v1.78.0) untuk repo yang `package.json`-nya v1.90.0 |
| Daftar pekerjaan | **2** tempat yang sama-sama mengaku "satu sumber kebenaran" |
| Dokumen yang tidak berlaku tapi masih di folder aktif | **4** (satu di antaranya berkas 896 baris berlabel "tuntas") |
| Seri arsitektur | 11 berkas / 1.664 baris, dipatok **v1.70–v1.75** |

Akibatnya bukan cuma "kotor": setiap sesi baru harus **membaca ulang** untuk tahu keadaan, dan tiap
putaran kerja menuntut **menyunting angka di belasan tempat** — pekerjaan yang sudah pasti akan salah lagi.

---

## 2. Persyaratan

| # | Persyaratan | Cara memeriksa |
|---|---|---|
| **P1** | **Angka mutakhir tidak ditulis di dokumen.** Versi = `package.json`; jumlah tes = `npm run test:sandbox`; baris berkas = `npm run measure`. | `npm run check:docs` (menolak klaim versi yang salah di kepala dokumen aktif) |
| **P2** | **Kalau sebuah angka memang harus muncul**, tulis sebagai **potret** beserta tanggal + versinya ("potret 2026-10-04, v1.90.0"), bukan sebagai keadaan hari ini. | tinjauan saat menulis; R2 `check-docs` |
| **P3** | **Satu daftar pekerjaan.** Hanya `kerja/PEKERJAAN.md`. Dilarang membuat daftar kedua di indeks/README. | R3 `check-docs` untuk tautan; tinjauan: cari tabel berisi status tugas |
| **P4** | **Urutan baca tunggal.** `ATURAN-AI` → `CHEATSHEET` (ringkas per tugas) → **satu** `TASK-XX` bila perlu. Tidak ada dokumen yang menyuruh urutan berbeda. | tinjauan §0 `ATURAN-AI` vs §6.2 `docs/README.md` |
| **P5** | **Satu berkas = satu pekerjaan.** Dokumen yang tuntas/digantikan/usang → `docs/arsip/` + banner + satu baris inventaris. | `arsip/README.md` §2/§3; tiap berkas arsip baru punya banner |
| **P6** | **Pekerjaan terbuka tidak boleh ikut terarsip.** Dipindah ke `PEKERJAAN.md` pada putaran yang sama. | tinjauan banner; `PEKERJAAN.md` §4 |
| **P7** | **Arsip dibekukan**: isinya tidak diperbarui; yang boleh berubah hanya rujukan path. Angka di arsip selalu diberi tanggal dokumennya. | tinjauan; `check-md-links` (tautan pindah harus hidup) |
| **P8** | **Semua tautan hidup.** Dokumen yang dipindah wajib memperbaiki tautan masuk **dan** tautan di dalamnya. | `npm run check:docs` (bagian `check-md-links`) |
| **P9** | **Dokumen aktif wajib punya blok "Sekilas"** (jenis · status · untuk siapa · baca kalau). | tinjauan baris atas tiap berkas aktif |
| **P10** | **Berkas yatim tidak boleh menetap.** Dokumen yang sudah digantikan tapi tidak diarsipkan = utang; catat di `PEKERJAAN.md` §4. | tinjauan |
| **P11** | **Aturan yang menang tidak boleh jadi yang paling basi.** Kalau A menang atas B (§2.3 `ATURAN-AI`), isi A wajib mutakhir atau pindah ke dokumen yang mutakhir. | tinjauan; kasus 2026-10-05: `arsitektur/11` dipatok v1.75.1 → kontraknya dinaikkan ke `ATURAN-AI` §1 & §3 |

## 3. Struktur yang berlaku sekarang

| Lokasi | Isi | Sifat |
|---|---|---|
| `README.md` (akar repo) | pintu masuk repo + perintah + status tanpa angka | aktif |
| `docs/README.md` | **router** + riwayat rilis + aturan pemeliharaan | aktif |
| `docs/01-PANDUAN-*` … `docs/05-*` | panduan operasional & prosedur (tagihan, backup Drive, playbook audit, ketahanan data, cetak biru replikasi) | aktif |
| `docs/06-ARSITEKTUR-KODE.md` | peta kode + apa yang merusak data/uang | aktif |
| `docs/07-PERSYARATAN-DOKUMENTASI.md` | berkas ini | aktif |
| `docs/kerja/ATURAN-AI.md` | kontrak kerja (keputusan terkunci, larangan, gate, bentuk laporan) | aktif — **pintu masuk** |
| `docs/kerja/PEKERJAAN.md` | **satu-satunya daftar pekerjaan** + urutan eksekusi + daftar periksa manual | aktif |
| `docs/kerja/CHEATSHEET.md` | ringkasan 1 halaman per tugas | aktif |
| `docs/kerja/TASK-01…11` | dokumen tugas (hanya yang masih memegang pekerjaan wajib; sisanya rujukan) | aktif sebagian |
| `docs/mockups/*.html` | gambar usulan tampilan (bukan kode produksi) | usulan |
| `docs/arsip/**` | **tidak berlaku lagi** — dibekukan; 35 dokumen terdaftar di `arsip/README.md` | beku |

## 4. Kalau ragu

1. **Dokumen ini vs berkas lain** → dokumen ini yang menentukan **struktur**; `kerja/ATURAN-AI.md` yang
   menentukan **cara kerja**.
2. **Mau menaruh daftar pekerjaan baru** → jangan; tambahkan ke `kerja/PEKERJAAN.md`.
3. **Mau menulis angka mutakhir** → tulis perintahnya.
4. **Mau mengarsipkan dokumen yang masih memegang pekerjaan** → pindahkan pekerjaannya lebih dulu (P6),
   lalu arsipkan.
5. **Mau mengubah struktur besar** (memindahkan folder, menggabung dokumen) → itu keputusan pemilik:
   tanyakan sebagai pertanyaan bernomor, jangan dijalankan sendiri.

## 5. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-05 | Dibuat dari keputusan pemilik Q-9…Q-17 (opsi A). Menggantikan `arsitektur/README.md` sebagai penentu struktur dokumentasi. |
