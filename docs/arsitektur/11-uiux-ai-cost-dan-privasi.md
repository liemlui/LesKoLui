# 11 — UI/UX, AI Berbiaya, dan Privasi Uang (kontrak)

> **STATUS:** `final` — keputusan §3 dikunci pemilik 2026-09-25
> **DIBUAT:** 2026-09-25 · **BASELINE:** v1.75.1 (561 tes / 50 berkas)
> **PINTU MASUK AGEN:** [`docs/kerja/ATURAN-AI.md`](../kerja/ATURAN-AI.md) — baca itu lebih dulu;
> berkas ini rinciannya.
> **GUNAKAN INI KETIKA:** menambah layar, menambah fitur AI, atau menampilkan angka uang di mana pun

Dokumen ini **bukan** panduan langkah. Ia adalah **kontrak**: aturan yang tidak boleh dilanggar
oleh tugas mana pun di seri `docs/kerja/TASK-03`…`TASK-09`. Kalau sebuah tugas butuh
menyimpang, penyimpangan itu harus ditulis di dokumen ini lebih dulu.

---

## 1. Kenapa kontrak ini ada

Keadaan v1.75.1 (diukur, bukan dikira-kira):

| Fakta | Angka | Bukti |
|---|---|---|
| Kelas warna hardcode | **904** kemunculan (2026-10-01) — angka **471** di versi sebelumnya berasal dari perintah **tidak rekursif** yang hanya menjangkau 38 berkas | `Get-ChildItem -Recurse src -Include *.tsx -File` + `Select-String` |
| Dark mode | **mati permanen** (sejak 2026-09-11; dikunci light-only 2026-10-01, Q4) | komentar di `src/index.css` baris 48–51 |
| Skala tipografi | tidak ada; `text-xs` (12px) dan `text-sm` (14px) mendominasi | `src/index.css` `@theme` hanya memuat warna |
| Titik pemanggil AI | **7** tempat, **2 modal biaya** berbeda (`AiCostModal`, `AiCostConfirmModal`), **8 fungsi estimasi** | `src/components/AiCostModal.tsx`, `src/screens/captureSession/AiCostConfirmModal.tsx`, `src/lib/aiClient.ts` |
| Gerbang uang | hanya `/payments` | `src/screens/Payments.tsx:107,123` |
| Layar yang menampilkan uang **tanpa** gerbang | **5** — Home, Students, StudentDetail, SessionDetailModal, MonthlyReport | lihat §5 |
| FAB mengambang | menutupi konten di layar padat | terbukti di mockup `docs/mockups/home-2026-09-24.html` frame ② |

Empat kontrak di bawah menutup empat masalah itu secara permanen.

---

## 2. Empat kontrak

### K1 — Arah, bukan kerumitan (arah UI/UX)

1. **Navigasi mengerucut**: 3 pintu (`Hari Ini`, `Murid`, `Uang`) + **1 aksi utama di dalam nav**, bukan FAB mengambang.
   Alasan: FAB mengambang terbukti menutupi konten pada layar padat (mockup Home frame ②), dan posisinya
   tidak konsisten antar layar.
2. **Satu blok keputusan per layar.** Blok itu selalu berbunyi *"apa yang perlu kamu lakukan"*; sisanya fakta.
   Layar tidak boleh punya dua blok yang sama-sama menuntut perhatian.
3. **Urutan blok boleh berubah mengikuti keadaan** (mis. blok keputusan naik ke atas saat ada 3 hal tertunda),
   tetapi **susunan bloknya tetap** — tidak ada blok acak yang muncul-hilang.
4. **Kerumitan dipindah ke belakang, bukan dihapus.** Tabel rinci, 8 kolom, filter, ekspor: tetap ada, tapi
   dicapai lewat `▸`. Yang di depan layar hanya keputusan.
5. **Setiap angka bisa diklik ke sumbernya.** Tidak ada angka tanpa jalan pulang ke sesi/tagihan/murid asalnya.

### K2 — Satu kontrak AI berbiaya

**Semua** panggilan AI wajib lewat satu jalur, tanpa kecuali:

```
komponen  →  useAiAction()  →  estimasi biaya  →  modal konfirmasi  →  aiClient  →  catat pemakaian
```

1. **Tidak ada tombol AI tanpa harga.** Label minimum: `Jalankan · ~Rp60`. Di layar sempit (label panjang),
   harga boleh pindah ke modal — tetapi modal **wajib** tampil sebelum panggilan, tanpa pengecualian.
2. **Modal konfirmasi menyebut:** (a) apa yang akan dilakukan, (b) data apa yang dikirim, (c) apakah nama
   murid / catatan bebas ikut terkirim, (d) perkiraan biaya, (e) pemakaian bulan berjalan + batas (bila diisi).
3. **Batas anggaran bulanan** disimpan di `Settings` tetapi **tidak dipasang secara default** (kosong = tanpa batas;
   *keputusan pemilik 2026-10-01, Q1*). Bila pengguna mengisinya dan terlampaui, tombol AI menonaktif
   dengan alasan yang terlihat (bukan diam-diam gagal).
4. **Setiap panggilan dicatat** sebagai `AuditEntry` dengan aksi baru `ai.call` (lihat §4). Tabel `auditLog`
   sudah ada dan **tidak** ikut backup — sesuai sifatnya sebagai catatan lokal.
5. **Fitur inti tidak boleh bergantung pada AI.** Bila API key belum ada atau anggaran habis, aplikasi tetap
   menghasilkan jawabannya dari aturan lokal. AI hanya memilih, mengurutkan, dan menarasikan.

### K3 — Uang tertutup secara terpusat

1. **Satu hook, satu kebenaran:** `useMoneyVisible()`. Tidak ada layar yang boleh memutuskan sendiri
   apakah uang ditampilkan.
2. **Bentuk terkunci seragam:** nilai uang menjadi `Rp ••••••` + ikon 🔒. Bukan disembunyikan tanpa jejak
   (pengguna harus tahu ada angka dan bisa membukanya), bukan pula angka parsial.
3. **Gerbang berlaku di semua layar**, bukan hanya `/payments`. Daftar lengkap ada di §5.
4. **Sekali buka, berlaku selama aplikasi terbuka** (keputusan **B2**, dikunci 2026-09-25). Tombol `Kunci`
   manual selalu tersedia. `/payments` tetap punya gerbang penuh sebagai lapisan kedua.
5. **Home tidak menampilkan uang sama sekali** (keputusan pemilik). Bukan `***`, bukan `••••`: tidak ada barisnya.
6. **Uang ditutup juga di layar `Murid`** (keputusan **B1**): tarif & rincian biaya sesi ikut tertutup.
6. **PIN tidak pernah disimpan mentah.** Implementasi sekarang sudah benar
   (`src/lib/crypto.ts:92-106`, PBKDF2-SHA256 150.000 iterasi + salt 16 byte acak, format `pbkdf2v2:<salt>:<hash>`).
   Kontrak ini mengunci sifat itu: setiap perubahan cara PIN disimpan **wajib** mempertahankan
   `verifyPin()` yang bisa membaca format lama (ada di `crypto.ts:110-125`).

### K4 — Token, bukan kelas warna langsung

1. Komponen **tidak boleh** memakai `bg-white`, `bg-gray-*`, `text-gray-*`, `border-gray-*` secara langsung.
   Warna diambil dari token (`--surface`, `--line`, `--text-mute`, …). **904** kemunculan (terkoreksi 2026-10-01;
   kontrak lama menulis 471 karena perintahnya tidak rekursif) itu utang yang dilunasi bertahap — lihat `TASK-04`.
2. **Skala tipografi terbatas 4 langkah**: `display` 24 · `title` 18 · `body` 15 · `caption` 13.
   Tidak ada teks di bawah 13px pada konten yang harus dibaca (10–11px hanya untuk label sumbu/grafik).
3. **Elevasi 2 tingkat** (`--e1` datar, `--e2` mengambang). Tidak ada `shadow-sm` bercampur `shadow-xl`.
4. **Target sentuh minimum 44×44** untuk semua kontrol utama.
5. **Hanya 2 pola gerak**: masuk 200ms, panel naik 250ms; hormati `prefers-reduced-motion`
   (sudah ada di `src/index.css:83-90`).
6. **Panel di HP memakai sheet dari bawah**, bukan modal tengah.

---

## 3. Keputusan pemilik — TERKUNCI 2026-09-25

| # | Pertanyaan | **Keputusan** | Di mana diterapkan |
|---|---|---|---|
| B1 | Di `Murid`, uang ditutup juga? | **Ya** — tarif & rincian sesi ikut `useMoneyVisible()` | `TASK-08` Langkah 4 |
| B2 | Setelah uang dibuka, dikunci otomatis setelah 5 menit? | **Tidak** — berlaku selama aplikasi terbuka + tombol `Kunci` | `TASK-08` Langkah 1 & 6 |
| B3 | `[Catat]` dari beranda membuka wizard dengan murid+tanggal+jam terisi? | **Ya** — **tanpa** mengurangi jumlah langkah (tetap 6) | `TASK-06` Langkah 5 |
| B4 | Anggaran AI bulanan default? | **Tidak dipasang** — kolom ada, kosong = tanpa batas (**diubah 2026-10-01, Q1**; sebelumnya Rp 25.000) | `TASK-07` Langkah 5 |

Keputusan lain yang ikut terkunci (karena muncul saat brainstorming):

- **Wizard Catat Sesi dipertahankan** — hanya diperkuat; dilarang menggabung/mengurangi langkah.
  **Sesi boleh disimpan dari langkah 5** (langkah tetap 6, `STEP_META` tidak berubah) — *amandemen 2026-10-01, Q2*.
- **Nav = 3 pintu + 1 aksi di dalam nav** — tanpa FAB mengambang (FAB menutupi konten; bukti di
  `docs/mockups/home-2026-09-24.html` frame ②).
- **Semua panggilan AI lewat modal biaya** — tanpa pengecualian.
- **Home tidak menampilkan uang sama sekali** — bukan `***`, bukan `••••`: tidak ada barisnya.
- **Papan pipeline dipertahankan** (bukan dibubarkan) dan hidup di dalam blok "Perlu ditagih" —
  *amandemen 2026-10-01, Q3*.
- **Light-only permanen** — dark mode tidak dihidupkan lagi — *amandemen 2026-10-01, Q4*.
- **Peta tab layar Murid = Ringkas / Sesi / Progres / Proyek**; uang adalah blok di dalam Ringkas —
  *amandemen 2026-10-01, Q5*.
- **Fokus Android** — tidak ada aturan input 16px demi iOS — *amandemen 2026-10-01, Q7*.
- **Refactor terbatas** `CaptureSession.tsx` (sebelum G3-01) & `MonthlyReport.tsx` (sebelum G3-05) —
  *amandemen 2026-10-01, Q9*.

Daftar amandemen lengkap ada di [`kerja/ATURAN-AI.md`](../kerja/ATURAN-AI.md) §1.

Kalau ada yang ingin diubah, **ubah tabel ini lebih dulu**, baru tugasnya.

---

## 4. Perubahan data yang dikontrakkan

```ts
// src/db/types.ts — AuditAction (baris ~447)
export type AuditAction =
  | ... // yang sudah ada
  | "ai.call";                 // BARU — satu entri per panggilan AI berbayar

// src/db/types.ts — AuditEntry (baris ~464)
export interface AuditEntry {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  timestamp: string;
  details?: string;
  /** BARU — perkiraan biaya rupiah panggilan AI. Hanya untuk action "ai.call". */
  costIdr?: number;
  /** BARU — nama fungsi AI yang dipanggil (mis. "generateFinancialInsights"). */
  aiFeature?: string;
}

// src/db/types.ts — Settings (baris ~473)
export interface Settings {
  ...
  ai: {
    enabled: boolean;
    apiKey?: string;
    model: string;
    /** BARU — batas belanja AI per bulan (rupiah). undefined = tanpa batas. */
    monthlyBudgetIdr?: number;
  };
}
```

Aturan turunannya:

- `costIdr` memakai **estimasi** yang sama dengan yang ditampilkan di modal (§K2.2), bukan hasil rekonsiliasi tagihan.
  Kolomnya sengaja bernama `costIdr` + komentar "perkiraan" supaya tidak dikira angka tagihan.
- Pemakaian bulan berjalan dihitung dari `auditLog` (filter `action === "ai.call"` pada bulan berjalan).
  `auditLog` **tidak ikut backup** — artinya: pemakaian tidak ikut pindah perangkat, dan itu **disengaja**,
  karena anggaran adalah pengaturan per-perangkat.

---

## 5. Daftar gerbang uang (audit K3)

Titik kebocoran yang harus ditutup `TASK-08`. Kolom "jangkar" dipakai untuk mencari lokasinya.

| # | Layar | Jangkar | Yang bocor | Tindakan |
|---|---|---|---|---|
| 1 | `screens/home/Home.tsx` | tombol `💸 Pengeluaran` di header | akses masuk ke uang + ringkasan | **hapus** dari Home |
| 2 | `screens/home/OperationalSnapshot.tsx` | kartu snapshot | angka pendapatan/piutang | hapus angka uang |
| 3 | `screens/Students.tsx` | `settings?.financialPin` di ~baris 558 | tarif murid di daftar | bungkus `useMoneyVisible()` |
| 4 | `screens/StudentDetail.tsx` | `settings?.financialPin` di ~baris 564 | tarif murid | bungkus `useMoneyVisible()` |
| 5 | `screens/studentDetail/SessionDetailModal.tsx` | `settings?.financialPin` di ~baris 437, 461 | biaya sesi | bungkus `useMoneyVisible()` |
| 6 | `screens/MonthlyReport.tsx` | `formatRupiah(d.totalCost)` ~1140, `formatRupiah(payment.totalCost)` ~1403 | total biaya & tagihan | bungkus `useMoneyVisible()` |

> Nomor baris di atas **hanya pembanding**. Jangkar teksnya yang dipakai; nomor bergeser setelah
> langkah pertama mana pun.

---

## 6. Verifikasi kontrak

Setelah `TASK-04`, `TASK-07`, dan `TASK-08` selesai, ketiganya harus lulus perintah ini dari `les-ko-lui/`:

```powershell
# K4 — sisa kelas warna hardcode di komponen (target ≤190, dicatat per gelombang).
# ⚠️ Perintah lama `Select-String "src\**\*.tsx"` TIDAK rekursif: hanya menjangkau 38 berkas → 470.
# Baseline 2026-10-01: 904 (rekursif) · git grep berkas terlacak = 902 (selisih 2 = `src/App.tsx`).
(Get-ChildItem -Recurse src -Include *.tsx -File | Select-String -Pattern "bg-white|bg-gray-|text-gray-|border-gray-").Count

# K3 — layar yang menyentuh format uang tanpa hook uang (target: 0). REKURSIF di dalam src\screens.
Get-ChildItem -Recurse src\screens -Include *.tsx -File | Select-String -Pattern "formatRupiah|totalCost|rateSnapshot" |
  Where-Object { $_.Line -notmatch "useMoneyVisible|money-safe|formatRupiahDisplay" }

# K2 — titik panggilan AI (target: semua lewat useAiAction)
Get-ChildItem -Recurse src -Include *.tsx -File | Select-String -Pattern "AiCostModal|AiCostConfirmModal"

npx tsc -b          # harapan: tanpa keluaran
npx eslint src      # harapan: tanpa keluaran
npm test            # harapan: semua lulus, 0 gagal
npm run build       # harapan: built + dist/sw.js
```

---

## 7. Riwayat

| Tanggal | Perubahan | Versi | Hasil |
|---|---|---|---|
| 2026-09-25 | Kontrak awal ditulis dari hasil brainstorming UI/UX | v1.75.1 | `draft` |
| 2026-09-25 | Keputusan B1–B4 dikunci pemilik · status `final` | v1.75.1 | `final` |
| 2026-10-01 | **Amandemen Q1–Q9**: B4 default kosong (tanpa batas) · pipeline dipertahankan di blok "Perlu ditagih" · light-only permanen · simpan dari langkah 5 · peta tab Murid Ringkas/Sesi/Progres/Proyek · fokus Android · refactor terbatas | v1.79.3 | `final` |
