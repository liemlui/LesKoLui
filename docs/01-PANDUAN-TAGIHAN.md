# 01 — Panduan Cepat Tagihan (Cheat-Sheet)

> **Sekilas** · Jenis: panduan fitur (cheat-sheet) · Diperbarui: 2026-09-30 · Status: **aktif**
> **Untuk siapa:** tutor/pemilik app yang mengurus tagihan murid.
> **Baca kalau:** ingin tahu kapan sesi ditagih, kenapa sebuah sesi (tidak) muncul di tagihan, atau apa arti tiap status tagihan.
> **Isi:** 3 siklus tagihan murid (bagian 1) · hubungan laporan ↔ tagihan (bagian 2) · tarif & pembekuan (bagian 5–6) · pembatalan/pemulihan + batas R1 (bagian 7) · jatuh tempo (bagian 8).

Satu murid punya **satu siklus tagihan** (bisa diubah kapan saja). Laporan & tagihan saling terhubung: sesi yang sudah masuk laporan **sah** tidak akan ditagih dua kali.

## 1. Tiga siklus tagihan murid

| Siklus | Cara kerja | Kapan dipakai |
|---|---|---|
| **Bulanan** | Laporan Perkembangan disahkan → invoice diterbitkan dari tahap **Siap Ditagih** di sub-layar Tagihan (layar Uang → **Rincian tagihan**) | Murid reguler yang ditagih per bulan kalender |
| **Paket per N pertemuan** | Tagihan dibuat setiap N pertemuan (8, 10, 12, dst). Sesi **tertua** ditagih lebih dulu | Murid yang bayar per paket/batch |
| **Manual** | Invoice nominal bebas, tidak mengambil sesi otomatis | Pembayaran khusus / di luar siklus |

> Ubah siklus di **Murid → Edit Profil → Siklus Tagihan**. Hanya sesi yang **belum ditagih** yang terpengaruh; invoice lama tetap utuh.

## 2. Cara menagih per siklus

### Bulanan
1. Buka **Keuangan → Tagihan**.
2. Pilih bulan.
3. **Tutup Bulan** → invoice otomatis dibuat untuk semua murid Bulanan.

### Paket per N pertemuan
1. Buka **Keuangan → Tagihan → "Tagihan per Pertemuan"**.
2. Saat antrean penuh (N sesi) → tombol **"Terbitkan Paket"** membuat invoice + laporan sekaligus.
3. Sisa yang belum genap → tunggu sampai N terpenuhi, atau gunakan **"Tagihan Penutup"** (muncul saat mengubah siklus) untuk menagih sisa 1–N-1.

### Manual
1. **Keuangan → Tagihan → "Tambah Tagihan Manual"** (nominal bebas).

## 3. Laporan per rentang tanggal (mulai tengah bulan)

Kalau murid baru mulai, mis. **minggu ke-4 September**, dan mau ditagih sekaligus **September + Oktober**:

1. Murid tetap **Bulanan**; **jangan** Tutup Buku September (biarkan terbuka).
2. **Laporan → Mode "Rentang"** → tanggal awal = sesi pertama (mis. 22 Sep), akhir = 31 Okt.
3. **Sahkan** → laporan rentang menjadi **Siap Ditagih**. Di **Keuangan → Tagihan**, periksa nominalnya lalu pilih **Terbitkan Invoice**; satu invoice akan mencakup sesi Sep (minggu ke-4) + seluruh Okt.

⚠️ Buat laporan rentang **sebelum** menutup Oktober. Bulan yang sudah **Tutup Buku** tidak bisa dimasukkan ke laporan/rentang baru.

## 4. Mengubah siklus murid — dua pengaman

- **Bulanan → Paket** dengan sesi lama belum ditagih: sistem menolak kecuali centang **"Masukkan sesi lama ke antrean paket"** (agar tidak dobel).
- **Paket → Bulanan/Manual** saat masih ada sisa paket: jadi **"peralihan tertunda"** — terus tagih paket sampai antrean habis lalu otomatis pindah, atau pakai **Tagihan Penutup** untuk menuntaskan sekarang.

## 5. Tarif sesi — kapan berubah, kapan dibekukan

Tarif **historis dibekukan**. Menyimpan profil murid (nama, telepon, mapel) **tidak pernah** mengubah `rateSnapshot`, `cost`, atau waktu ubah sesi mana pun, dan membuka rekap/laporan juga tidak.

Retroaktif (tarif baru berlaku untuk sesi lama yang belum ditagih) hanya lewat **dua jalur eksplisit**:

| Jalur | Di mana | Catatan |
|---|---|---|
| Centang **"Masukkan sesi lama ke antrean paket"** | Edit profil murid → Siklus Tagihan, saat pindah **Bulanan → Paket** | Sekaligus mengubah sesi lama ke tarif per pertemuan |
| Centang **"Terapkan tarif baru ke N sesi lama…"** | Edit profil murid (blok Tarif Les) **atau** detail murid → ✏️ Edit tarif | Muncul hanya bila tarif benar-benar berubah dan ada sesi yang belum ditagih |

Aturan yang dipegang saat repricing:

- sesi yang **sudah ditagih** (masuk paket/invoice) tidak pernah tersentuh;
- sesi dengan **nominal manual** (diedit sendiri) dilewati, tidak ditimpa;
- sesi yang tarifnya sudah sama **tidak ditulis ulang** (waktu ubah tidak melompat);
- setiap batch retroaktif mencatat **satu entri** di **Pengaturan → Riwayat Aktivitas** berisi tarif tujuan, jumlah sesi, daftar sesi, dan **histogram tarif lama** — karena sesi lama bisa berangkat dari tarif yang berbeda-beda.

## 6. Total laporan final dibekukan

- **Draft** boleh dihitung ulang: total jam & biaya mengikuti sesi terbaru.
- **Final** membekukan `totalJam`, `totalBiaya`, dan daftar sesinya (**D6**). Angka yang sudah dikirim ke orang tua tidak berubah hanya karena sesi dihitung ulang.
- Kalau ada selisih, laporan final menampilkan pemberitahuan "Total laporan final ini dibekukan di Rp …".
- **Jalur perbaikan laporan final** (bukan diam-diam). Pilih sesuai jenis kesalahannya:
  - **Yang salah tagihannya** (nominal) → rapikan nominalnya langsung di **Keuangan → Tagihan**.
  - **Yang salah laporannya** (sesi/periodenya) → **batalkan dulu tagihannya** (kalau belum lunas) di **Keuangan → Tagihan**, lalu tekan **🔓 Buka kunci laporan** di layar **Laporan** → perbaiki sesi/periode → **finalkan lagi** → terbitkan tagihan baru. Membatalkan tagihan **tanpa** membuka kunci tidak menolong: laporan final membekukan totalnya, jadi tagihannya akan sama.
  - **Sesinya menyusul setelah kirim** → terbitkan **laporan susulan**, jangan buka kunci.

### Buka kunci laporan (mengembalikan final → draft)

| Syarat | Keterangan |
|---|---|
| Laporan berstatus **final** | Draft tidak perlu dibuka; final legacy (tanpa field status) ikut dihitung final |
| **PIN Keuangan** | Konfirmasi → PIN, sama seperti aksi destruktif lain |
| **Tidak punya tagihan belum lunas** | Batalkan dulu di Keuangan supaya jejak pemulihannya tetap ada |

Yang **tetap** ditolak, walaupun sudah menekan tombol:

- tagihan laporan itu **sudah lunas** (uangnya sudah diterima) atau **nominalnya sudah diedit manual** — angkanya sudah dipakai;
- laporan **paket per pertemuan** — buka kuncinya dari **Keuangan → Tagihan per Pertemuan** (sesi kembali ke antrean, lalu terbitkan paket yang benar);
- laporan yang sudah punya **laporan susulan** — perbaiki lewat laporan susulan itu agar sesinya tidak terhitung dua kali;
- laporan yang sudah ditandai **dibagikan** butuh konfirmasi tambahan. Saat kunci dibuka, tanda "sudah dibagikan" **dilepas** supaya versi lama tidak terbaca sebagai versi yang sudah dikirim.

Setelah dibuka, laporan kembali menghitung ulang dari sesi terbaru (draft), jadi angka hasil perbaikan itulah yang dipakai saat difinalkan lagi. Semua pembukaan kunci tercatat di **Pengaturan → Riwayat Aktivitas** (`report.unlock`) beserta total dan status "sudah dibagikan" sebelumnya.

## 7. Membatalkan & memulihkan tagihan

Semua aksi di bawah meminta **konfirmasi + PIN Keuangan** dan selalu menyarankan **Backup ke File** lebih dulu.

| Aksi | Syarat | Yang terjadi |
|---|---|---|
| **Batalkan tagihan** (invoice laporan) | Laporan berstatus **final eksplisit**, belum lunas, nominal masih otomatis | Baris tagihan hilang; **laporan tetap final** dan kembali muncul di **Siap ditagih** |
| **Batalkan tagihan paket** | Paket `UNPAID` yang masih otomatis | Tagihan **dan** laporan paket dihapus; sesinya kembali ke antrean; siklus murid dikembalikan sesuai keadaan sebelum paket |
| **Hapus tagihan manual** | Tanpa laporan, belum lunas | Baris tagihan hilang dari daftar piutang |
| **Pulihkan tagihan** | Snapshot masih ada di perangkat ini | Tagihan (dan laporan paket) kembali dengan **ID & nilai yang sama** |

Yang **tidak** bisa dibatalkan: tagihan `PAID`, tagihan yang nominalnya sudah diedit manual, invoice laporan **legacy** yang belum pernah berstatus final eksplisit, dan tagihan paket yang sudah lunas.

### Batas pemulihan (penting)

- Pemulihan memakai catatan lokal di perangkat ini (**R1**). Catatan itu **tidak ikut backup**, **hilang** saat **Hapus Semua Data**, dan tidak berpindah perangkat.
- Jadi **R1 bukan pengganti backup.** Untuk salinan permanen, pakai **Pengaturan → Backup & Restore → Backup ke File** sebelum melakukan pembatalan besar.
- Pemulihan **ditolak** (tanpa menimpa apa pun) bila setelah pembatalan: sesi sudah dihapus, laporan/cakupan sesi berubah, paket pengganti sudah terbit, invoice laporan sudah terbit ulang, siklus murid berubah, atau sudah ada tagihan manual lain pada murid+bulan yang sama. Pesannya menyebut alasannya.
- Memulihkan dua kali tidak menimpa apa-apa: bila seluruh data pasangan sudah identik, aksinya berhenti sebagai **no-op**.

## 8. Mengubah jatuh tempo

- Hanya untuk tagihan **belum dibayar**; tanggal harus valid.
- Yang berubah **hanya** tanggal jatuh tempo: nominal, status, pembayaran, laporan, dan sesi tidak tersentuh.
- Dampaknya: **umur piutang** dan **nada pesan WA** ikut berubah. Perubahannya tercatat di **Riwayat Aktivitas**.

## 9. Istilah penting


- **Draft** = laporan belum sah, bisa dihapus. **Sahkan** = laporan final masuk antrean **Siap Ditagih**; invoice diterbitkan setelah nominal diperiksa.
- **Jatuh tempo** = invoice baru diberi tenggat tujuh hari kalender sejak diterbitkan. Umur piutang dibaca dari tenggat ini; data lama tetap memakai akhir periode tagihan.
- **FIFO** = antrean paket menagih sesi tertua lebih dulu (sesi lama tidak boleh terdampar).
- **Tutup Buku** = mengunci bulan; sesi di bulan itu tidak bisa direkap/ditagih lagi lewat jalur lain.
