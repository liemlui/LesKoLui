# TASK-02 — Format Dokumen Tugas untuk AI (spesifikasi + contoh)

> **STATUS:** `done` — spesifikasi ini dipakai oleh `TASK-01` dan tugas-tugas berikutnya
> **PEMILIK:** siapa pun yang menulis tugas untuk dikerjakan agen AI
> **DIBUAT:** 2026-09-13 · **BASELINE:** v1.75.1
> **GUNAKAN INI KETIKA:** Anda ingin agen AI (termasuk model kecil) mengerjakan tugas panjang tanpa keluar jalur

---

## 1. Kenapa format ini ada

Dokumen tugas biasa gagal dipakai model kecil karena lima sebab. Format di bawah menutup kelimanya satu per satu:

| Sebab gagal | Gejala di lapangan | Yang menutupnya |
|---|---|---|
| Tujuan tidak bisa diukur | AI berhenti di tengah dan mengaku selesai | §Kriteria penerimaan berbentuk perintah yang bisa dijalankan |
| Langkah terlalu besar | AI menggabung 3 langkah, sulit dilacak saat gagal | "satu langkah per putaran" + urutan eksplisit |
| Lokasi kode tidak pasti | AI menebak, memindahkan blok yang salah | **Jangkar** (kutipan komentar/kode) + catatan bahwa nomor baris bergeser |
| Tidak ada batas larangan | AI "sekalian merapikan" hal lain → regresi senyap | Tabel ❌ JANGAN |
| Tidak ada jalan keluar saat macet | AI mengarang solusi, merusak lebih banyak | §Kalau macet + §Catatan penyimpangan |

---

## 2. Kerangka wajib (salin apa adanya)

Nama berkas: `docs/kerja/TASK-NN-<slug-singkat>.md` (contoh: `TASK-01-refactor-layar-besar.md`).

````markdown
# TASK-NN — <Judul singkat, kata kerja>

> **STATUS:** `todo` | `in_progress` | `blocked` | `done`
> **PEMILIK:** <siapa/agen apa>
> **DIBUAT:** <YYYY-MM-DD> · **BASELINE:** <versi + jumlah test lulus>
> **PERKIRAAN:** <N langkah × M menit>

## 0. Cara pakai berkas ini
- aturan kerja (satu langkah per putaran, jangan improvisasi)
- **perintah verifikasi** yang harus dijalankan sesudah setiap langkah, beserta keluaran yang diharapkan

## 1. Tujuan & definisi selesai
- kenapa tugas ini ada (1 paragraf)
- "selesai" berarti apa, dalam ukuran yang bisa diperiksa

## 2. Kondisi awal (angka nyata)
- tabel: berkas | baris sekarang | target | status
- cara mengukur ulang

## 3. Urutan langkah
Urutan dari risiko TERENDAH ke tertinggi. Untuk setiap langkah:
- **Tujuan** (satu kalimat)
- **Jangkar**: kutipan komentar/kode untuk menemukan lokasi — BUKAN nomor baris saja
- **Yang dipindahkan/diubah**: batas blok, cara menemukan penutupnya
- **Berkas baru** + **kontrak (prop/parameter/nilai balik)** dalam blok kode yang bisa disalin
- **Cara menyambungkan** di berkas lama
- **Selesai bila**: ukuran + perintah verifikasi

## 4. Pola umum (kalau ada pekerjaan berulang)
- pola A/B/C yang harus dipakai konsisten; larang menciptakan cara baru

## 5. Jebakan yang sudah pernah terjadi
- tabel: jebakan | gejala | cara menghindar (ambil dari kejadian nyata, bukan karangan)

## 6. Kalau macet
- daftar gejala → sebab → tindakan; diakhiri "jangan menutupi dengan test baru"

## 7. Progres
- checklist per langkah, dengan ukuran hasil

## 8. Catatan penyimpangan
- tabel kosong: tanggal | langkah | yang terjadi | keputusan

## 9. Riwayat tugas
- tabel: tanggal | perubahan | versi | hasil
````

---

## 3. Aturan penulisan (ini yang menentukan berhasil/tidak)

### 3.1 Jangkar, bukan nomor baris

Nomor baris **selalu** bergeser setelah langkah pertama. Selalu tulis jangkar berupa teks yang benar-benar ada di kode, dan sebut nomor baris hanya sebagai pembanding sekunder:

```markdown
**Jangkar:** cari komentar `CLOSE-OUT LAPORAN SESI`
**Referensi baris saat panduan ditulis:** 2278–2463 (hanya untuk memastikan blok benar)
```

Cara memverifikasi jangkar masih ada (dari folder `les-ko-lui/`):

```bash
grep -n "CLOSE-OUT LAPORAN SESI" src/screens/CaptureSession.tsx       # Linux/macOS
Select-String -Path src\screens\CaptureSession.tsx -Pattern "CLOSE-OUT"  # PowerShell
```

### 3.2 Setiap langkah harus punya ukuran hasil

Bukan "pindahkan komponen X", tetapi "pindahkan komponen X **sehingga berkas Y turun ≈ N baris**". Angka itu membuat AI bisa tahu ia benar-benar selesai.

### 3.3 Kontrak kode harus bisa disalin

Tulis blok `interface Props` lengkap dengan komentar asal setiap prop. AI yang lemah tidak bisa menyimpulkan prop dari prosa:

```tsx
interface CloseOutSheetProps {
  studentName: string;
  session: { id: string; date: string; /* ... */ };
  onDone: () => void;          // ← handleCloseOutDone di induk
}
```

### 3.4 Sebut yang JANGAN dipindah

Bagian tersulit dari refactor adalah **state yang harus tetap di induk** (mis. karena dipakai draf). Tulis daftarnya secara eksplisit; ini mencegah kerusakan yang tidak tertangkap test.

### 3.5 Sertakan cara verifikasi yang bisa dijalankan mesin

Selalu dalam blok kode yang bisa disalin:

```bash
npx tsc -b          # harapan: tanpa keluaran
npx eslint src      # harapan: tanpa keluaran
npm test            # harapan: N test lulus, 0 gagal
npm run build       # harapan: built + dist/sw.js
```

Tambahkan penjelasan **kegagalan yang bukan regresi** (mis. test lambat yang timeout), supaya AI tidak panik dan "memperbaiki" hal yang tidak rusak.

### 3.6 Larangan harus konkret

Bukan "hati-hati", tetapi daftar berkas yang tidak boleh disentuh + alasan + "butuh tugas terpisah".

---

## 4. Anti-pola (jangan ditulis dalam dokumen tugas)

| Anti-pola | Kenapa buruk |
|---|---|
| "Rapikan sekalian kalau perlu" | AI akan mengubah hal di luar lingkup; review jadi tidak mungkin |
| "Pindahkan komponen besar" tanpa nama & kontrak | AI mengarang batas blok dan nama prop |
| Hanya nomor baris tanpa jangkar | Panduan jadi salah begitu satu baris ditambah |
| "Pastikan test tetap lulus" tanpa perintahnya | AI tidak tahu cara menjalankan; hasilnya klaim tanpa bukti |
| Daftar temuan tanpa langkah | Itu dokumen audit, bukan dokumen tugas — simpan di `docs/` atau `docs/arsip/` |
| Menyembunyikan ketidakpastian | Tulis "kalau X tidak terpenuhi, berhenti dan catat" — lebih baik berhenti daripada merusak |

---

## 5. Perbedaan dokumen tugas vs dokumen audit

| | Dokumen audit (`docs/`, `docs/arsip/`) | Dokumen tugas (`docs/kerja/`) |
|---|---|---|
| Menjawab | "apa yang salah & kenapa" | "apa yang harus dilakukan, dalam urutan apa" |
| Isi | temuan, bukti, angka | langkah, jangkar, kontrak, verifikasi |
| Boleh panjang | ya (tabel temuan) | **tidak** — pecah per tugas, maksimal ±400 baris |
| Setelah selesai | dipindah ke `docs/arsip/` | status diubah `done` + baris di §Riwayat; berkas tetap di `docs/kerja/` sebagai contoh pola |
| Untuk AI lemah | kurang berguna (tidak ada instruksi) | inilah bentuknya |

---

## 6. Daftar periksa terakhir sebelum menyerahkan tugas ke AI

- [ ] Setiap langkah punya jangkar teks yang **sudah saya cek ada** di kode
- [ ] Setiap langkah punya ukuran hasil (baris/target)
- [ ] Setiap kontrak ditulis sebagai blok kode yang bisa disalin
- [ ] Daftar "state yang tidak boleh dipindah" sudah ditulis
- [ ] Perintah verifikasi lengkap + penjelasan kegagalan yang bukan regresi
- [ ] Tabel larangan konkret (nama berkas + alasan)
- [ ] §Kalau macet berisi minimal 4 gejala nyata
- [ ] Urutan langkah dari risiko terendah
- [ ] Ada §Catatan penyimpangan (tabel kosong) untuk laporan AI
