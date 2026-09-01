# Panduan Cepat Tagihan (Cheat-Sheet)

Satu murid punya **satu siklus tagihan** (bisa diubah kapan saja). Laporan & tagihan saling terhubung: sesi yang sudah masuk laporan **sah** tidak akan ditagih dua kali.

## 1. Tiga siklus tagihan murid

| Siklus | Cara kerja | Kapan dipakai |
|---|---|---|
| **Bulanan** | Laporan Perkembangan disahkan → invoice diterbitkan dari tahap **Siap Ditagih** di tab Tagihan | Murid reguler yang ditagih per bulan kalender |
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

## 5. Istilah penting

- **Draft** = laporan belum sah, bisa dihapus. **Sahkan** = laporan final masuk antrean **Siap Ditagih**; invoice diterbitkan setelah nominal diperiksa.
- **Jatuh tempo** = invoice baru diberi tenggat tujuh hari kalender sejak diterbitkan. Umur piutang dibaca dari tenggat ini; data lama tetap memakai akhir periode tagihan.
- **FIFO** = antrean paket menagih sesi tertua lebih dulu (sesi lama tidak boleh terdampar).
- **Tutup Buku** = mengunci bulan; sesi di bulan itu tidak bisa direkap/ditagih lagi lewat jalur lain.
