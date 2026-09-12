# Audit UI/UX — Modul Keuangan (Les Ko Lui v1.71.4)

Tanggal audit: 2026-09-12 · Metode: aplikasi dijalankan dengan data realistis 12 bulan (6 murid, 359 sesi, 87 laporan, 63 invoice, 52 pengeluaran), lalu diukur langsung dari DOM (tinggi section, lebar container, jumlah overflow) + pembacaan kode sumber.

> **Status: SELESAI DIIMPLEMENTASI (2026-09-12).** Semua 10 item prioritas di bawah sudah dikerjakan. Hasil terukur ada di [Bagian 6](#bagian-6--hasil-setelah-perbaikan). Verifikasi: 458 unit test lulus (43 berkas), `eslint` bersih, `tsc -b` bersih, build produksi berhasil.

## Ringkasan eksekutif

Masalahnya bukan pada estetika, tetapi pada **tiga hal struktural**:

1. **Tab mencampur dua jenis navigasi.** Satu tab ("Bulan Ini") adalah *filter waktu*, tiga sisanya adalah *area kerja*. Label tab juga berbeda dari judul konten di dalamnya.
2. **Angka disajikan tanpa satuan periode yang eksplisit.** Beberapa kartu menghitung bulan terpilih, beberapa menghitung lintas bulan, dan keduanya diletakkan bersebelahan tanpa label periode.
3. **Konsep alur (Sesi → Laporan → Tagihan → Lunas → Dibagikan) muncul di 3 tempat dengan 3 kosakata berbeda**, sehingga pengguna harus menerjemahkan sendiri.

Konsekuensi terukur (sebelum perbaikan): tab **Penagihan** menghasilkan halaman setinggi **20.479 px (± 27 layar ponsel)** untuk 63 invoice; tab **Bulan Ini** 2.820 px (± 4 layar); dan ada **bug tata letak nyata** yang membuat teks "Kolektibilitas invoice" terjepit menjadi kolom selebar **29 px**.


---

## Bagian 1 — Struktur tab

### 1.1 Bukti pengukuran

| Tab | Label tombol | `key` internal | Judul konten di dalam | Tinggi halaman | Pemilih bulan |
|---|---|---|---|---|---|
| Bulan Ini | `Bulan Ini` | `ringkasan` | "Status pendapatan" + "Arus kas" | 2.820 px | ✅ ada |
| Penagihan | `Tagihan` (mobile) / `Penagihan` | `tagihan` | "Penagihan · Semua Periode" | **20.479 px** | ❌ disembunyikan |
| Pengeluaran | `Keluar` (mobile) / `Pengeluaran` | `pengeluaran` | "Pengeluaran periode {bulan}" | 1.114 px | ✅ ada |
| Rekap Tahunan | `Rekap` (mobile) / `Rekap Tahunan` | **`audit`** | "Rekap Tahunan" + pemilih tahun | 1.202 px | ❌ (diganti pemilih tahun) |

Di lebar 416 px (setara konten ponsel 430 px), tab bar memakai label pendek: **"Bulan Ini" · "Tagih" · "Keluar" · "Rekap"**.
Di lebar desktop, tab bar **overflow 2 px** (`scrollWidth` 418 px vs `clientWidth` 416 px).

### 1.2 Masalah

**P1 — Tab "Bulan Ini" bukan tab, melainkan filter waktu.**
Labelnya menduplikasi label pemilih bulan tepat di atasnya ("BULAN INI · SEPTEMBER 2026" dan kartu "BULAN KEUANGAN / September 2026 / Bulan ini"). Akibatnya kalimat **"Bulan ini" muncul 3× dalam satu layar** dengan 3 arti berbeda (nama tab, nama bulan terpilih, nama tombol reset).

**P2 — Label tab ≠ judul konten.**
`Penagihan` (tab) vs `Penagihan · Semua Periode` (konten) vs `Tagihan Terbit` (daftar). `Rekap Tahunan` (tab) vs `Rekap Tahunan` (konten) — dan `key` internalnya `audit`, sisa penamaan lama. Label mobile **"Keluar"** dan **"Rekap"** adalah singkatan yang ambigu: "Keluar" bisa dibaca sebagai *log keluar*, "Rekap" tidak memberi tahu bahwa cakupannya **setahun**.

**P3 — Pemilih bulan hilang di 2 dari 4 tab.**
Ini akar kebingungan utama. Di tab Bulan Ini/Pengeluaran pemilih bulan terlihat; begitu pindah ke Penagihan, pemilih **dihilangkan** (`Payments.tsx:176-185`) tetapi **tidak ada pengganti yang menyatakan "semua periode"**. Pengguna tidak punya cara mengetahui apakah yang dilihat berlaku untuk bulan terpilih atau seluruh riwayat.

**P4 — Dua elemen mengklaim dirinya utama.**
Penagihan punya judul kartu besar "Penagihan" yang duplikat dengan nama tab, padahal isi tab sudah jelas dari tab itu sendiri.

### 1.3 Rekomendasi

Ganti kerangka tab menjadi **satu filter bar tetap + 3 area kerja**, dengan hierarki: *[Area] · [Periode] · [Aksi]*.

```
Keuangan                              [ 2026-09 ▾ ]   ← selalu terlihat, 1 pemilih
─────────────────────────────────────────────────────────────────────────
Ringkasan   |   Tagihan   |   Pengeluaran   |   Rekap & Ekspor
```

Aturan yang disarankan:

1. **Pisahkan periode dari area.** Pemilih periode pindah ke header halaman (sticky), bukan di dalam tab. Tab hanya berisi *area kerja*.
2. **Beri setiap tab satu kalimat cakupan** yang selalu terlihat, tepat di bawah judul:

| Tab baru | Kalimat cakupan |
|---|---|
| Ringkasan | "Angka untuk **September 2026** (bulan terpilih)." |
| Tagihan | "Semua periode — tidak mengikuti bulan terpilih." |
| Pengeluaran | "Pengeluaran **September 2026** (bulan terpilih)." |
| Rekap & Ekspor | "Januari–Desember **2026** (tahun terpilih)." |

3. **Ganti label tab** agar bukan singkatan: `Ringkasan` · `Tagihan` · `Pengeluaran` · `Rekap & Ekspor`. Hilangkan `compactLabel` "Keluar"/"Rekap", atau ganti dengan `Tagihan`/`Tahunan`.
4. **Buang judul kartu duplikat** ("Penagihan" di dalam tab Penagihan).

---

## Bagian 2 — Angka yang tampak saling bertentangan

Ini keluhan "rumit dipahami manusia" yang paling sering muncul, dan **memang benar** ada masalah nyata.

### 2.1 Bukti dari data uji

**Tab Bulan Ini — bagian "Status pendapatan", bulan = September 2026:**

| Kartu | Nilai |
|---|---|
| Potensi dari sesi | Rp 5.775.000 (23 jam sesi selesai) |
| Tagihan diterbitkan | Rp **5.850.000** |
| Invoice lunas | Rp **0** |
| Piutang (belum dibayar) | Rp **5.850.000** |

Bagian "Arus kas": **Kas diterima Rp 0**, Pengeluaran Rp 796.700, **Arus kas bersih −Rp 796.700**.

Pengguna melihat: bulan ini tidak ada uang masuk sama sekali, padahal 63 invoice sudah diterbitkan dan 56 di antaranya **lunas** (89%). Ini bukan bug perhitungan — ini **masalah penamaan periode**.

**Akar masalah 1 — nilai berbeda, label mirip.**
`cash.tagihan` (Tagihan diterbitkan) hanya menjumlahkan invoice dengan `payment.month === bulan`. Tetapi invoice paket (`billingPolicy: session_count`) di-anchor ke bulan **batch terakhir**, bukan ke bulan sesinya.

Bukti langsung pada data uji, invoice September milik Eka Nugroho (Rp 2.475.000) berisi **6 pertemuan yang tersebar lintas bulan**:

```
2026-08-23, 2026-08-26, 2026-09-01, 2026-09-03, 2026-09-05, 2026-09-07
→ 2 pertemuan Agustus (Rp 825.000) + 4 pertemuan September (Rp 1.650.000)
```

Sementara papan pantau untuk murid yang sama menulis **"4 sesi · Rp 1.650.000 potensi"** dan **"Rp 2.475.000 piutang"** — dua angka dari periode berbeda dalam satu baris. Selisih "Potensi 5.775.000 vs Tagihan 5.850.000" berasal persis dari pencampuran periode ini.

**Akar masalah 2 — "Kas diterima" (arus kas) dan "Tagihan diterbitkan" (akrual) diletakkan setara.**
Ini pilihan desain yang sah (`RingkasanTab.tsx:384-391` menjelaskannya dalam 2 baris kecil), tetapi penjelasannya **di bawah** angka, berukuran `text-xs`, dan pengguna sudah lebih dulu menyimpulkan "angkanya salah".

### 2.2 Rekomendasi

1. **Beri setiap kartu angka label periode eksplisit**, dan satukan satu periode per kartu:

```
STATUS PENDAPATAN · September 2026
┌────────────────────────────┬────────────────────────────┐
│ Potensi sesi September     │ Tagihan jatuh tempo Sept.  │
│ Rp 5.775.000               │ Rp 5.850.000               │
│ 16 pertemuan · 23 jam      │ ⚠ termasuk 2 sesi Agustus   │
└────────────────────────────┴────────────────────────────┘
```

2. **Pisahkan tegas jalur akrual dan jalur kas** menjadi dua blok berjudul jelas, bukan dua section yang bersebelahan:
   - **"Yang ditagih (akrual)"** — Potensi sesi → Tagihan → Lunas → Piutang. Semua berbasis *periode sesi*.
   - **"Yang masuk rekening (kas)"** — Uang masuk → Pengeluaran → Sisa. Semua berbasis *tanggal pembayaran*.
   Tambahkan satu baris di judul blok kas: *"Berbeda dengan tagihan karena mengikuti tanggal transfer, bukan tanggal les."*

3. **Jangan tampilkan "Tagihan diterbitkan" untuk invoice paket lintas bulan di kolom yang sama.** Beri penanda pada nilai: `Rp 5.850.000` + chip kecil `termasuk paket lintas bulan` yang bisa diketuk untuk melihat rinciannya.

4. **Untuk paket (`session_count`), jangan pakai anchor bulan.** Tampilkan laporan paket di tab Tagihan berdasarkan **jumlah pertemuan belum ditagih**, dan jangan masukkan ke kartu bulanan sama sekali. Ini sekaligus menghilangkan baris ganda "4 sesi" vs "2.475.000 piutang" di papan pantau.

### 2.3 Kosakata yang tidak konsisten

Satu nilai punya 2–3 nama berbeda di modul yang sama:

| Nilai | Nama di Ringkasan | Nama di Rekap | Nama di kartu |
|---|---|---|---|
| Uang yang sudah masuk | Kas diterima | **Uang Masuk** | Kas Masuk Hari Ini |
| Belum dibayar | Piutang (belum dibayar) | **Belum Dibayar** | Piutang lintas bulan |
| Tagihan | Tagihan diterbitkan | Pendapatan | Tagihan |

**Rekomendasi:** pakai satu istilah kanonik — **"Uang masuk"**, **"Piutang"**, **"Tagihan"** — dan definisikan sekali di tab Rekap sebagai glosarium 2 baris. "Pendapatan" hanya boleh dipakai untuk makna akrual, dan harus selalu disandingkan dengan "Uang masuk" agar bedanya terlihat.

---

## Bagian 3 — Bug tata letak nyata (prioritas tinggi)

### 3.1 Collision pada kartu "Kolektibilitas invoice" — Penagihan

Diukur langsung dari DOM pada lebar konten 382 px:

```
Baris luar (flex)              w=382
├── ActivityRing (flex)        w= 97   ← tidak punya flex-shrink-0
│   ├── cincin 56px            w= 56
│   └── blok teks              w= 29   ← HANYA 29 PIXEL
└── paragraf penjelas          w=247
```

Akibatnya label **"Kolektibilitas invoice"** membungkus menjadi kolom selebar ±4 karakter dan memaksa tinggi baris melonjak ke **134 px**. Terlihat jelas pada tangkapan layar sebagai teks robek ("Kolektibilitas / invoice / 56/63 / 7 / invoice / masih / menjadi..."). Ini terjadi karena blok penjelas di sebelahnya (paragraf `min-w-0` selebar 247 px) "menang" dalam pembagian ruang, sementara `ActivityRing` tidak punya `flex-shrink-0` (`TagihanTab.tsx:301-314`, `ActivityRing.tsx:33`).

**Perbaikan:**
```tsx
// TagihanTab.tsx — beri ring ruang tetap dan susun vertikal di layar sempit
<div className="mt-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5
                flex flex-col gap-2 min-[380px]:flex-row min-[380px]:items-center min-[380px]:gap-3">
  <ActivityRing ... />
  <p className="min-w-0 text-xs leading-relaxed text-slate-500">…</p>
</div>
```
```tsx
// ActivityRing.tsx — jangan pernah boleh menyusut
<div className="flex items-center gap-3 min-w-0 shrink-0">
  …
  <div className="min-w-0 whitespace-nowrap">   // label tidak boleh pecah per ~4 karakter
```

### 3.2 Tabel Rekap Tahunan terpotong di ponsel

Tabel 8 kolom dipaksa `min-w-[800px]` (`AuditTab.tsx:153`) di dalam kartu selebar 416 px. Kolom **Uang Masuk, Pengeluaran, Laba, Belum Dibayar** tidak terlihat tanpa scroll horizontal, dan tidak ada indikator bahwa tabel bisa di-scroll.

**Perbaikan:** naikkan breakpoint tabel dari `md:` ke `lg:`, dan di bawahnya gunakan kartu per bulan yang lebih ringkas — mis. baris dua tingkat: baris 1 = bulan + Laba (angka terbesar, `text-base`), baris 2 = `Pendapatan · Uang masuk · Pengeluaran · Piutang` dalam satu baris `flex-wrap` dengan label kecil di atas nilai. (Kartu `md:hidden` saat ini sudah ada tetapi terlalu tinggi: 5 baris per bulan × 12 bulan.)

### 3.3 Tab bar overflow 2 px di desktop

`Tabs.tsx:36-44` memakai `flex-1 min-w-max` + `sm:min-w-0`. Pada lebar konten 416 px, `scrollWidth` 418 px > `clientWidth` 416 px, sehingga tepi kanan tab terakhir terpotong halus. Perbaikan: tambah `min-w-0` pada label dan `px-2` → `px-1.5`, atau pakai `grid grid-cols-4` alih-alih `flex-1`.

---

## Bagian 4 — Kepadatan konten per tab

### 4.1 Penagihan: 20.479 px untuk 63 invoice

Setiap invoice memakai kartu dengan **±7 field status + 5 tombol**:

```
Nama murid                    [Lunas/Belum dibayar] [≤30 hari]
[chip asal: Bulanan/Paket/Laporan/Manual] [chip Laporan: Final]
🗓 Periode sesi: 1 Sep 2026 – 30 Sep 2026
🧾 Bulan tagihan: September 2026
Rp [___________]  ← input yang selalu aktif
[💬 Tagih WA]  [✓ Sudah Transfer]
[📋 Buka Laporan] [📄 Invoice] [Batalkan Tagihan Paket]
2 sesi · 3j · dibayar 2026-09-18
```

Kartu "sudah lunas" pun menampilkan input nominal (disabled), tombol "Buka Laporan", tombol "Invoice", dan dua baris periode — padahal tidak ada lagi yang perlu dilakukan. Untuk 56 invoice lunas, ini ±18.000 px ruang yang nyaris tidak berguna.

**Rekomendasi — daftar ringkas + detail saat diketuk:**

```
September 2026 · LUNAS
Andi Pratama                       Rp 1.500.000   ✓ 18 Sep   ›
Bella Sari                         Rp 1.200.000   ✓ 18 Sep   ›
```
- Satu baris per invoice: nama · nominal · status · tanggal · chevron.
- Aksi (WA, tandai lunas, invoice PDF, batalkan) pindah ke dalam panel detail yang terbuka saat diketuk.
- Aksi massal: "Kirim WA ke 3 murid yang belum bayar".
- Filter status jadi segmented control: **Belum dibayar (7) · Lunas (56) · Semua**, dengan default **Belum dibayar**.
- Target: 63 invoice ≈ 1.500 px (2 layar), bukan 27 layar.

### 4.2 Bulan Ini: 9 blok berturut-turut, urutan tidak mengikuti kepentingan

Urutan saat ini: Papan pantau (950 px) → Status pendapatan → Arus kas → Kas hari ini/minggu ini → Piutang lintas bulan → Kesehatan keuangan → `<details> Analitik lanjutan`.

Masalah: info paling mendesak (piutang Rp 10,66 juta dari 7 invoice, dan tagihan Rp 5,85 juta belum dibayar) baru muncul di tengah halaman, di bawah papan pantau per murid.

**Rekomendasi urutan baru:**
1. **Perlu tindakan 3 baris** — "7 invoice belum dibayar · Rp 10,66 jt" + satu tombol ke Tagihan. (Paling atas.)
2. Arus kas bulan ini (4 angka).
3. Status tagihan bulan ini (akrual).
4. Papan pantau per murid — **hanya baris yang butuh tindakan** (4 dari 6 di data uji), sisanya di balik "Lihat 2 murid lain yang sinkron".
5. Analitik (prediksi, AI, tren, donut kategori, per murid) — tetap di `<details>`, sudah benar.

### 4.3 Papan pantau: 4 chip dengan status berulang

Setiap murid menampilkan 4 chip: `4 sesi` · `Laporan dibagikan` · `Belum bayar` · `Sudah dibagikan`. Dua chip terakhir **berbicara hal yang sama** dan sering tampak berlawanan dengan kolom status di baris yang sama (data uji: `Belum bayar` bersamaan dengan `Lunas` di kolom lain).

**Rekomendasi:** ringkas menjadi satu kalimat keadaan, dan sorot hanya langkah yang menghambat:

```
Eka Nugroho · Paket
4 pertemuan September · 2 belum ditagih
→ Kirim pengingat WA · Piutang Rp 2.475.000                [Tindak lanjuti]
```

Label tombol sebaiknya menyebut aksinya, bukan hanya "Tindak lanjuti di Penagihan": **"Kirim WA"**, **"Tandai lunas"**, **"Terbitkan invoice"**, **"Bagikan laporan"**. `FinancePipelineBoard.tsx:30-40` sebenarnya sudah punya `PipelineNextAction` yang spesifik — informasinya hilang saat dipetakan ke satu label seragam.

Istilah **"Sahkan Laporan"** (`confirm-report`) juga tidak lazim dalam bahasa Indonesia bisnis. Ganti: **"Periksa & finalkan laporan"**.

### 4.4 Pengeluaran: 3 kartu kas duplikat

Tab Pengeluaran menampilkan kembali `Kas diterima · Belum dibayar · Pengeluaran` — sama persis dengan kartu di tab Bulan Ini. Ini menambah tinggi 56 px + konteks yang harus diterjemahkan, untuk data yang sudah ada di tab lain.

**Rekomendasi:** hapus 3 kartu itu; cukup pertahankan `Total Pengeluaran` dan `Jumlah Transaksi`, tambahkan `Sisa kas bulan ini` (uang masuk − pengeluaran) sebagai satu angka konteks.

### 4.5 Rekap Tahunan: 4 kartu besar tanpa jelaskan tujuan

`Pendapatan Rp 92.325.000` dan `Uang Masuk Rp 81.662.500` bersebelahan tanpa satu kalimat pun yang menjelaskan bedanya (padahal selisih Rp 10,66 juta persis = piutang). Chip `Margin 88%` dan `256 sesi · 374 jam` muncul tanpa keterkaitan visual dengan kartu di atasnya.

**Rekomendasi tambahkan satu baris di bawah kartu:**
> "Pendapatan dihitung saat les berlangsung (Rp 92,3 jt). Uang masuk dihitung saat transfer diterima (Rp 81,7 jt). Selisih Rp 10,66 jt masih menjadi piutang."

Dan buat ke-4 kartu bisa diketuk: `Pendapatan` → daftar bulan; `Uang Masuk` → daftar pembayaran; `Piutang` → daftar invoice terbuka. Kartu yang bisa diketuk mengubah angka dari laporan pasif menjadi kontrol.

---

## Bagian 5 — Prioritas perbaikan

| # | Perbaikan | Dampak | Effort | Berkas utama |
|---|---|---|---|---|
| 1 | Perbaiki collision `ActivityRing` (kolom 29 px) | Tinggi — bug nyata | S | `TagihanTab.tsx:301`, `ActivityRing.tsx:33` |
| 2 | Pindahkan pemilih periode ke header sticky, beri kalimat cakupan per tab | Tinggi — akar kebingungan | M | `Payments.tsx:145-199`, `FinancePeriodPicker.tsx` |
| 3 | Label periode eksplisit + pisahkan blok "akrual" vs "kas" | Tinggi | M | `RingkasanTab.tsx:349-411` |
| 4 | Ganti daftar invoice 20.479 px → baris ringkas + panel detail | Tinggi | L | `TagihanTab.tsx:552-722` |
| 5 | Satukan kosakata (Uang masuk / Piutang / Tagihan) | Sedang | S | `RingkasanTab`, `AuditTab`, `Payments` |
| 6 | Ringkas papan pantau (hapus chip duplikat, label aksi spesifik) | Sedang | S | `FinancePipelineBoard.tsx` |
| 7 | Tabel Rekap: kartu ringkas di bawah `lg:` | Sedang | M | `AuditTab.tsx:128-200` |
| 8 | Hapus 3 kartu kas duplikat di Pengeluaran | Rendah–Sedang | S | `PengeluaranTab.tsx:63-72` |
| 9 | Ganti label tab + buang judul kartu duplikat | Rendah | S | `Payments.tsx:188-199` |
| 10 | Perbaiki overflow 2 px tab bar | Rendah | S | `Tabs.tsx:36-44` |

Urutan eksekusi yang disarankan: **1 → 2 → 3 → 5 → 6** (murah, langsung terasa), lalu **4** dan **7** sebagai pekerjaan struktur.

---

## Lampiran — Metode & keterbatasan

- Aplikasi dijalankan dari build produksi `les-ko-lui/dist` pada server statis lokal; data uji disuntikkan ke IndexedDB (Dexie `jurnalles`) dan dihapus setelah audit. Tidak ada berkas proyek yang diubah.
- Pengukuran dilakukan pada lebar viewport 1267 px (Chrome sesi) dengan lebar konten aplikasi 416 px. Emulasi lebar ponsel 430 px dilakukan dengan mengukur ulang tab bar di dalam kontainer 398 px (memaksa cabang `max-sm`).
- **Keterbatasan:** tampilan ponsel sungguhan tidak dapat difoto karena Chromium tambahan tidak dapat dijalankan pada lingkungan ini (`mojo platform_channel: Access denied`). Semua klaim mobile di atas berasal dari pengukuran DOM + pembacaan kelas Tailwind, bukan dari tangkapan layar perangkat.

---

## Bagian 6 — Hasil setelah perbaikan

Diukur ulang dari DOM pada data uji yang sama (6 murid, 359 sesi, 87 laporan, 63 invoice).

### 6.1 Tinggi halaman

| Tab | Sebelum | Sesudah | Perubahan |
|---|---|---|---|
| Ringkasan (dulu "Bulan Ini") | 2.820 px | 2.718 px | −4 % (urutan konten diperbaiki, blok "Perlu ditindaklanjuti" naik ke atas) |
| Tagihan (dulu "Penagihan") | **20.479 px** | **2.252 px** | **−89 %** |
| Pengeluaran | 1.114 px | 904 px | −19 % (kartu kas duplikat dihapus) |
| Rekap (dulu "Rekap Tahunan") | 1.202 px | 1.458 px | +21 % (kartu ringkas per bulan untuk layar sempit **dan** satu baris penjelas selisih) |

Tab Tagihan turun dari ±27 layar menjadi ±3 layar karena daftar 63 invoice berubah dari kartu penuh menjadi baris ringkas satu baris, dengan aksi di panel yang dibuka saat diketuk.

### 6.2 Bug tata letak

| Metrik | Sebelum | Sesudah |
|---|---|---|
| Lebar blok teks `ActivityRing` | **29 px** (teks robek 7–8 baris) | **172 px**, label utuh satu baris |
| Lebar catatan penjelas di baris yang sama | 247 px (mengalahkan cincin) | **357 px** (selebar kartu, jadi baris terpisah) |
| Tinggi baris cincin | 156 px dengan teks terjepit | rapi, tanpa tabrakan |

Perubahan: `ActivityRing` tidak lagi memakai `shrink-0` (diganti `min-w-fit` agar tidak pernah menyusut di bawah lebar labelnya sendiri, tapi tetap boleh menyusut sampai min-content sehingga tidak meluber), dan cincin + catatannya ditumpuk alih-alih dipaksa satu baris.

### 6.3 Tab bar

| Metrik | Sebelum | Sesudah |
|---|---|---|
| Label | Bulan Ini · Penagihan · Pengeluaran · Rekap Tahunan | Ringkasan · Tagihan · Pengeluaran · Rekap |
| Overflow bar | 2–3 px (tepi terpotong) | **0 px** |
| Label terpotong | "Pengeluaran", "Rekap Tahunan" | **tidak ada** |

Pada lebar konten 398 px (ponsel 430 px) keempat tab muat tanpa terpotong dan tanpa scroll horizontal.

### 6.4 Angka lintas periode kini eksplisit

Baris tagihan paket untuk Eka Nugroho, sebelum vs sesudah:

| | Tampilan |
|---|---|
| Sebelum | `Paket · Rp 1.650.000 potensi · Rp 2.475.000 piutang` (dua periode berbeda dalam satu baris, tanpa penjelasan) |
| Sesudah | `Paket — 6 pertemuan · 9 jam · 23 Agustus – 8 September 2026 — Rp 2.475.000 Belum dibayar` |

Tab Ringkasan menambahkan blok khusus untuk paket lintas bulan:

> **Rp 2.475.000** dari tagihan di atas berasal dari **paket lintas bulan** — pertemuannya tidak semuanya di September 2026, bukan Rp 4.575.000 yang murni bulan ini.

dan tab Rekap menambahkan:

> Selisih **Rp 10.662.500** antara pendapatan dan uang masuk adalah piutang: sudah dihitung sebagai pendapatan, tetapi transfernya belum diterima pada 2026.

### 6.5 Kosakata

Satu istilah kanonik sekarang dipakai konsisten di seluruh modul:

| Konsep | Sebelum (3 nama berbeda) | Sesudah |
|---|---|---|
| uang yang sudah masuk | Kas diterima · Uang Masuk · Kas Masuk | **Uang masuk** |
| belum dibayar | Piutang · Belum Dibayar · Belum dibayar | **Piutang** (nilai) / **Belum dibayar** (status baris) |
| hasil | Laba | **Sisa kas** (dengan penjelas "Uang masuk − pengeluaran") |

Istilah "sahkan" diganti **"finalkan"**, dan "tahap" pada panduan alur diganti **"langkah"**.

### 6.6 Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| Unit test (`npm test`) | **458 lulus / 43 berkas** — sama seperti baseline |
| `eslint .` | bersih, tanpa peringatan |
| `tsc -b` | bersih |
| `npm run build` | berhasil (PWA 137 entri ter-precache) |
| Interaksi diuji di browser | filter 4 langkah (7 → 56 → 63 → 7 baris), buka/tutup panel baris, perluasan/pelipatan daftar murid sinkron |

### 6.7 Berkas yang diubah

| Berkas | Perubahan |
|---|---|
| `src/screens/Payments.tsx` | header lengket (bulan + kalimat cakupan), label tab, alias `tab=audit` → `rekap`, komponen `RekapTab` |
| `src/screens/payments/RingkasanTab.tsx` | urutan ulang (perlu tindakan → uang masuk → tagihan → papan pantau), blok paket lintas bulan, kosakata |
| `src/screens/payments/TagihanTab.tsx` | strip 4 langkah, daftar invoice ringkas + panel, cincin/catatan ditumpuk, ekspor pindah ke daftar |
| `src/screens/payments/RekapTab.tsx` | diganti nama dari `AuditTab.tsx`, kartu ringkas per bulan, penjelas selisih, tabel pindah ke `lg:` |
| `src/screens/payments/PengeluaranTab.tsx` | kartu kas duplikat → kartu "Sisa kas bulan ini" |
| `src/screens/payments/FinancePipelineBoard.tsx` | hanya baris yang perlu tindakan, kata kerja aksi spesifik, empat chip → satu kalimat |
| `src/screens/payments/useInvoiceFilters.ts` | status default `unpaid`, tambah status `all` |
| `src/components/FinancePeriodPicker.tsx` | jadi kontrol periode ringkas untuk header lengket |
| `src/components/Tabs.tsx` | label tidak lagi terpotong, `title` untuk makna penuh |
| `src/components/dashboard/ActivityRing.tsx` | `min-w-fit`, label `whitespace-nowrap`, prop `className` |
| `src/lib/invoicePresentation.ts` | label asal tagihan dipendekkan agar tidak menekan nama murid |

### 6.8 Catatan untuk pekerjaan lanjutan

1. **Verifikasi di perangkat ponsel.** Tampilan mobile diverifikasi lewat pengukuran DOM, bukan tangkapan layar perangkat (lihat keterbatasan di atas). Perlu sekali dicek di ponsel/emulator sungguhan, khususnya daftar invoice ringkas dan strip 4 langkah.
2. **Preset pemilih periode.** Header lengket masih memakai input bulan; tombol pintas "3 bulan terakhir" / "Tahun ini" akan mengurangi jumlah ketukan pada Rekap.
3. **Nominal tagihan paket tanpa laporan.** `invoiceOriginOf` menandai invoice `source: "auto"` tanpa `reportId` sebagai "Bulanan". Di alur aplikasi normal invoice paket selalu membawa laporan paketnya, tetapi bila muncul data lama seperti itu, labelnya akan menyesatkan.

