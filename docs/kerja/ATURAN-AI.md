# ATURAN-AI — Kontrak kerja rombak UI/UX (WAJIB dibaca sebelum menyentuh kode)

> **STATUS:** `final` — keputusan pemilik dikunci 2026-09-25
> **BASELINE:** v1.75.1 · **561 tes / 50 berkas** · Dexie v15
> **PANJANG:** pendek sengaja. Rincian ada di berkas yang ditunjuk. **Jangan baca berkas lain
> sebelum membaca ini.**

---

## 0. Cara pakai (hemat token — patuhi)

1. Baca berkas ini **seluruhnya** (±150 baris). Ini satu-satunya bacaan wajib.
2. Buka **hanya satu** `TASK-XX` sesuai pekerjaan aktif, dan **hanya langkah yang sedang dikerjakan**.
3. **Jangan** membaca `TASK-01`, arsip, atau seluruh `arsitektur/`. Rujuk §5 kalau butuh.
4. **Jangan** membaca berkas >500 baris secara utuh (`CaptureSession.tsx` 2.099,
   `MonthlyReport.tsx` 2.097, `Settings.tsx` 1.118, `StudentDetail.tsx` 1.037).
   Pakai **jangkar** yang disebut di tugas: cari teksnya, baca ±40 baris di sekitarnya.
5. **Satu langkah per putaran.** Verifikasi → lapor → berhenti. Jangan lanjut sendiri.
6. **Jangan menambah berkas baru** selain yang disebut kontrak, tanpa persetujuan.

---

## 1. Keputusan pemilik — TERKUNCI, jangan ditawar

| Kode | Keputusan | Konsekuensi yang mengikat |
|---|---|---|
| **B1** | Tarif & rincian sesi di layar `Murid` **ikut ditutup** | Semua layar murid wajib lewat `useMoneyVisible()` |
| **B2** | Uang **tidak** terkunci otomatis setelah 5 menit | Sekali buka = berlaku selama aplikasi terbuka; hanya tombol `Kunci` yang menutup |
| **B3** | `[Catat]` dari beranda **mengisi** murid+tanggal+jam | **Jumlah langkah wizard tetap 6.** Yang dihemat pengisian, bukan langkah |
| **B4** | Batas belanja AI default **Rp 25.000/bulan** | Melewatinya = tombol AI nonaktif dengan alasan terlihat; fitur inti tetap jalan dari aturan lokal |

Keputusan lain yang juga terkunci: **wizard Catat Sesi dipertahankan apa adanya (hanya diperkuat)**;
**Nav = 3 pintu + 1 aksi di dalam nav** (tanpa FAB mengambang); **semua AI lewat modal biaya**;
**Home tidak menampilkan uang sama sekali**.

---

## 2. ❌ JANGAN — daftar tunggal (kalau ragu, berhenti dan tanya)

### 2.1 Berkas yang DILARANG disentuh oleh tugas apa pun di seri ini

| Berkas | Alasan |
|---|---|
| `src/db/db.ts` | versi skema Dexie; migrasi salah = kehilangan data pengguna nyata |
| `src/lib/crypto.ts` | cara PIN disimpan; salah = pengguna terkunci dari datanya |
| `src/lib/format.ts` → isi `formatRupiah()` | juga menyusun **pesan WhatsApp ke orang tua**; masking di sini merusak tagihan |
| `src/lib/waBilling.ts`, `src/lib/invoicePresentation.ts` | pesan keluar harus memuat nominal **asli** |
| `src/lib/engagement.ts` | rumus skor; mengubahnya mengubah arti data historis |
| `src/lib/finance.ts`, `src/lib/financePipeline.ts` | rumus uang yang sudah benar |
| `src/lib/csv.ts` | format ekspor lama harus identik |
| `src/template/**` | mesin laporan (tema/rotation); tugas terpisah |
| `src/screens/captureSession/constants.ts` → `STEP_META` | jumlah langkah dikunci 6 (ada tesnya) |
| Prompt di `src/lib/aiClient.ts` | mutu hasil AI; tugas ini soal jalur, bukan isi |

### 2.2 Perbuatan yang dilarang

| ❌ | Kenapa |
|---|---|
| Menggabung/mengurangi langkah wizard Catat Sesi | keputusan pemilik; merusak mutu data engagement |
| Menghapus kemampuan dengan alasan "menyederhanakan" | paling jauh dipindah ke `⋯` atau sub-layar `▸` |
| Menambah dependensi/pustaka UI atau animasi | fondasi dibangun dari token + CSS |
| `npx tsc -b` / `eslint` / `test` dijalankan lalu **diakali** (menonaktifkan tes, menaikkan batas) | tes adalah buktinya; kalau gagal, perbaiki sebabnya |
| Menulis angka uang langsung di layar | wajib lewat `MaskedMoney` |
| Memanggil `aiClient` langsung dari komponen | wajib lewat `useAiAction` |
| Menulis `bg-white` / `bg-gray-*` / `text-gray-*` / `border-gray-*` di komponen | wajib token |
| Menaikkan versi skema Dexie | tugas ini tidak butuh data baru |
| Mengubah URL `?scheduleId=` dan `?tab=` | deep link & E2E memakainya |
| Melanjutkan ke langkah berikutnya tanpa verifikasi | satu langkah per putaran |

### 2.3 Kalau menemukan konflik antar dokumen

Urutan menang: **1)** berkas ini → **2)** `arsitektur/11-uiux-ai-cost-dan-privasi.md` →
**3)** `TASK-XX` → **4)** dokumen lain. Tulis konfliknya di §8 tugas terkait pada putaran yang sama.

**Konflik yang sudah diselesaikan** (jangan diangkat lagi):
`TASK-04` Langkah 4 **tidak** mengubah jumlah pintu nav; perubahan nav **hanya** di `TASK-05` Langkah 7.
Alasan: selector E2E hanya boleh patah sekali.

---

## 3. Kontrak inti (ringkas — rincian di `arsitektur/11`)

- **K1 Arah** — satu blok keputusan per layar · urutan blok menyesuaikan keadaan, susunannya tetap ·
  kerumitan di balik `▸` · setiap angka bisa diklik ke sumbernya · bahasa manusia, bukan status DB mentah.
- **K2 AI berbiaya** — satu jalur `useAiAction()` · tombol memuat `· ~RpNN` · **modal wajib** sebelum
  panggilan · batas bulanan (B4) · catat tiap panggilan sukses sebagai `ai.call` ·
  **fitur inti tidak boleh bergantung pada AI**.
- **K3 Uang tertutup** — satu hook `useMoneyVisible()` · bentuk terkunci `Rp ••••••` + 🔒 ·
  gerbang di semua layar (6 titik di §5) · sekali buka berlaku selama app terbuka (B2) ·
  **Home tanpa uang sama sekali**.
- **K4 Token & rasa** — tipografi **4 langkah** (24/18/15/13) · konten terbaca **≥13px** ·
  elevasi **2 tingkat** · target sentuh **≥44px** · **2 pola gerak** (200ms/250ms) ·
  panel HP = **sheet dari bawah**.

---

## 4. Peta pekerjaan (satu berkas = satu pekerjaan)

| # | Pekerjaan | Berkas | Prasyarat |
|---|---|---|---|
| 03 | Blueprint (induk: peta layar → nasib) | `docs/kerja/TASK-03-blueprint-uiux.md` | — |
| 04 | Fondasi visual (token, 7 primitif, dark mode) | `docs/kerja/TASK-04-fondasi-visual.md` | 03 |
| 05 | Rombak keuangan + nav 3 pintu | `docs/kerja/TASK-05-rombak-keuangan.md` | 04, 08 |
| 06 | Perkuat Catat Sesi + sheet Kelola sesi | `docs/kerja/TASK-06-perkuat-catat-sesi.md` | 04 |
| 07 | Kontrak AI berbiaya | `docs/kerja/TASK-07-kontrak-ai-berbiaya.md` | 04 |
| 08 | Satu pintu uang (tutup 6 kebocoran) | `docs/kerja/TASK-08-satu-pintu-uang.md` | 04 |
| 09 | Jadwal hari: zoom + mode tangkapan | `docs/kerja/TASK-09-jadwal-hari-zoom.md` | 04 |

**Urutan pengerjaan (risiko terendah dulu):** 04 → 08 → 09 → 06 → 05 → 07.

**Kapan membaca berkas lain:**

| Butuh | Baca |
|---|---|
| aturan penuh tiap kontrak | `docs/arsitektur/11-uiux-ai-cost-dan-privasi.md` |
| melihat usulan tampilan | `docs/mockups/home-2026-09-24.html` · `uang-...` · `hari-...` (buka di browser) |
| apa yang dikirim ke AI per menu | `docs/arsitektur/06-ai-generation.md` |
| cara menulis dokumen tugas | `docs/kerja/TASK-02-format-dokumen-tugas-ai.md` |
| daftar pekerjaan terbuka | `docs/README.md` §4 |

---

## 5. Fakta kode yang mengikat (jangan diukur ulang, hemat token)

| Fakta | Nilai | Lokasi |
|---|---:|---|
| Kelas warna hardcode | **471** (target ≤190) | `src/**/*.tsx` |
| Dark mode | **mati** | `src/index.css` (cari `Dark mode DEAKTIVASI`) |
| Langkah wizard | **6** | `captureSession/constants.ts` → `STEP_META` |
| Kerapatan timeline | `PX_PER_HR = 64` tetap | `home/DayView.tsx:18` |
| 6 kebocoran uang | Home · OperationalSnapshot · Students · StudentDetail · SessionDetailModal · MonthlyReport | rincian + jangkar: `TASK-08` §2 |
| Titik pemanggil AI | **7** · 2 modal berbeda | `TASK-07` §2 |
| Estimator biaya (jangan buat baru) | 7 fungsi `estimate*Cost()` | `src/lib/aiClient.ts` |
| Fungsi repo keuangan (jangan buat baru) | `listPayments`, `listSessionCountBillingProgress`, `getCashSummary`, `markPaymentTransferredById`, `markPaymentUnpaidById`, `updatePaymentAmountById`, `createSessionCountInvoice`, `cancelSessionCountInvoice`, `syncReportPayment` | `src/db/repos/paymentRepo.ts` |
| Cara PIN disimpan | PBKDF2 150k + salt, `pbkdf2v2:` | `src/lib/crypto.ts` (jangan diubah) |

---

## 6. Verifikasi — perintah tetap, jalankan dari `les-ko-lui/`

```powershell
npx tsc -b        # harapan: tanpa keluaran
npx eslint src    # harapan: tanpa keluaran
npm test          # harapan: 561+ lulus, 0 gagal
npm run build     # harapan: built + dist/sw.js
npm run e2e       # harapan: lulus
```

Penghitung khusus (angka wajib dilaporkan sebelum → sesudah langkah):

```powershell
# TASK-04 — utang kelas warna
(Select-String -Path "src\**\*.tsx" -Pattern "bg-white|bg-gray-|text-gray-|border-gray-" -ErrorAction SilentlyContinue).Count

# TASK-05 — pipeline harus hilang
Select-String -Path "src\**\*.tsx" -Pattern "FinancePipelineBoard"

# TASK-07 — jalur AI harus satu
Select-String -Path "src\**\*.tsx" -Pattern "AiCostConfirmModal|AiCostModal"

# TASK-08 — kebocoran uang harus 0
Select-String -Path "src\screens\*.tsx","src\screens\**\*.tsx" -Pattern "formatRupiah|totalCost|rateSnapshot" |
  Where-Object { $_.Line -notmatch "useMoneyVisible|money-safe|formatRupiahDisplay" }
```

**Kegagalan yang BUKAN regresi** (jangan "diperbaiki"):
`npm test`/`npm run e2e` lebih lambat pada putaran pertama (cache vitest/Playwright);
tes kontras `engagementContrast.test.ts` gagal **karena warna memang diubah** → perbaiki pasangan
warnanya di sumber, **jangan** matikan tesnya.

---

## 7. Kalau macet

| Gejala | Tindakan |
|---|---|
| Verifikasi gagal dan sebabnya tidak jelas | **Berhenti.** Tulis di §8 tugas terkait, lapor. Jangan mengakali. |
| Butuh mengubah berkas di §2.1 | **Berhenti.** Itu tanda tugasnya salah lingkup. Lapor. |
| Dua dokumen saling bertentangan | Pakai urutan menang §2.3, catat di §8 |
| Tidak yakin harus lanjut langkah berapa | Baca §9 tugas itu saja (progres). Jangan baca ulang seluruh berkas |
| Solusi terasa butuh "sekalian merapikan" hal lain | **Jangan.** Satu langkah = satu perubahan |
| Tidak tahu apakah sebuah teks termasuk "konten terbaca" | Kalau tutor membacanya untuk bekerja → ≥13px. Kalau label sumbu/badge → boleh 11–12px |

---

## 8. Bentuk laporan yang diminta (agar hemat token)

Setiap putaran, laporkan **hanya** ini:

```
LANGKAH: <TASK-XX L<n>>
UBAH: <berkas + 1 baris apa yang berubah>
ANGKA: <sebelum> → <sesudah>
VERIFIKASI: tsc ✓ | eslint ✓ | test 561 ✓ | build ✓
BLOKIR: tidak ada | <sebab>
```

Jangan menyalin isi berkas, jangan menjelaskan dokumen, jangan merangkum tugas.

---

## 9. Riwayat

| Tanggal | Perubahan | Versi |
|---|---|---|
| 2026-09-25 | Dibuat; B1–B4 dikunci `final` | v1.75.1 |
