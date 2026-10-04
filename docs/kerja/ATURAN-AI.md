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
4. **Jangan** membaca berkas >500 baris secara utuh (`CaptureSession.tsx` 1.931 — 2.155 → 1.891 lewat refactor G3-01, lalu naik lagi oleh tiga langkah fitur L8/L9/L10,
   `MonthlyReport.tsx` 2.351, `Settings.tsx` 1.308, `StudentDetail.tsx` 1.083).
   Pakai **jangkar** yang disebut di tugas: cari teksnya, baca ±40 baris di sekitarnya.
5. **Satu langkah per putaran.** Verifikasi → lapor → berhenti. Jangan lanjut sendiri.
6. **Jangan menambah berkas baru** selain yang disebut kontrak, tanpa persetujuan.
7. **Baca CHEATSHEET.md dulu, bukan TASK-XX.** `docs/kerja/CHEATSHEET.md` memuat 1 halaman per tugas (TASK-01…TASK-10) yang cukup untuk 95% kasus. Buka TASK-XX utuh kalau perlu detail lebih.
8. **Kalau DSH baru:** baca urutan ini saja: §0 · §1 (B1–B4) · §2.1 (larangan berkas) · §6.2 (gate 4-tier) · ROADMAP.md · CHEATSHEET.md. Sisanya referensi.
9. **ROADMAP.md menggantikan GELOMBANG-2/3.md** (keduanya sudah diarsipkan).

---

## 1. Keputusan pemilik — TERKUNCI, jangan ditawar

| Kode | Keputusan | Konsekuensi yang mengikat |
|---|---|---|
| **B1** | Tarif & rincian sesi di layar `Murid` **ikut ditutup** | Semua layar murid wajib lewat `useMoneyVisible()` |
| **B2** | Uang **tidak** terkunci otomatis setelah 5 menit | Sekali buka = berlaku selama aplikasi terbuka; hanya tombol `Kunci` yang menutup |
| **B3** | `[Catat]` dari beranda **mengisi** murid+tanggal+jam | **Jumlah langkah wizard tetap 6.** Yang dihemat pengisian, bukan langkah |
| **B4** | Batas belanja AI **tidak dipasang secara default** (kolom tetap ada; kosong = tanpa batas) — **diubah 2026-10-01 (Q1)** | Bila pengguna **mengisi** batas: melewatinya = tombol AI nonaktif dengan alasan terlihat. Bila kosong: tidak ada penolakan. Fitur inti tetap jalan dari aturan lokal |

Keputusan lain yang juga terkunci: **wizard Catat Sesi dipertahankan apa adanya (hanya diperkuat)**;
**Nav = 3 pintu + 1 aksi di dalam nav** (tanpa FAB mengambang); **semua AI lewat modal biaya**;
**Home tidak menampilkan uang sama sekali**.

**Amandemen 2026-10-01 (Q1–Q9) — ikut terkunci:**

- **Sesi boleh disimpan dari langkah 5** (tombol `Simpan Sesi` aktif di langkah 5 **dan** 6). **Jumlah langkah tetap 6**,
  `STEP_META` tidak berubah, dan langkah 6 tetap menawarkan Bukti (foto/TTD). *(Q2)*
- **Papan pipeline dipertahankan**, bukan dibubarkan; hidup **di dalam blok "Perlu ditagih"** pada layar Uang
  (tidak menambah blok ke-4). *(Q3)*
- **Light-only permanen** — dark mode tidak dihidupkan lagi. *(Q4)*
- **Peta tab layar Murid = Ringkas / Sesi / Progres / Proyek**; uang menjadi **blok di dalam tab Ringkas**
  (bukan tab terpisah, bukan di Progres). *(Q5)*
- **Fokus Android** — tidak ada aturan input 16px demi iOS; token `body` tetap 15px. *(Q7)*
- **Refactor terbatas sebelum wave fitur**: `CaptureSession.tsx` sebelum G3-01 dan `MonthlyReport.tsx`
  sebelum G3-05; berkas lain tidak disentuh. Fitur tetap ditulis lengkap di dokumen tugas. *(Q9)*

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
| Menggabung/mengurangi langkah wizard Catat Sesi | keputusan pemilik; merusak mutu data engagement. **Menyimpan dari langkah 5 BUKAN pelanggaran** (Q2 2026-10-01): `STEP_META` tetap 6 |
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
  **Home tanpa uang sama sekali** · **cakupan perintah §6 = `src/screens` DI LUAR `src/screens/payments/**`** —
  modul keuangan hanya bisa dirender setelah gerbang penuh `Payments.tsx` lolos (Q44/A17).
- **K4 Token & rasa** — tipografi **4 langkah** (24/18/15/13) · konten terbaca **≥13px** ·
  elevasi **2 tingkat** · target sentuh **≥44px untuk kontrol utama** (aksi primer, nav, ikon aksi) —
  chip & kontrol sekunder **24–36 px diterima** (ambang keras WCAG 2.5.8 = 24 px) (Q45/A18) ·
  **2 pola gerak** (200ms/250ms) · panel HP = **sheet dari bawah**.

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

**Urutan pengerjaan (risiko terendah dulu):** 04 → 08 → 09 → 06 → 05 → 07 → **tetapi `TASK-07` naik sebelum Langkah laporan `TASK-05`** — lihat **A14**.

> **A14 — urutan `TASK-06`/`TASK-05`/`TASK-07` (keputusan pemilik 2026-10-01, Q12 = A).**
> Urutan kerja bergelombang yang berlaku: `G3-01 (TASK-06) → G3-02 (TASK-05 non-papan) → G3-03 (papan pipeline) →
> **G3-04 (TASK-07) → G3-05 (laporan `TASK-05`)** → G3-06 → …`
> **Alasan:** panel hasil AI di layar Laporan **butuh** `useAiAction` dari `TASK-07`, sehingga `TASK-07`
> tidak bisa benar-benar "paling akhir". Konsekuensi yang diterima: `TASK-07` menyentuh 7 titik pemanggilan AI
> **sebelum** laporan dirombak — titik-titik itu harus sudah stabil saat laporan dikerjakan.
> Urutan lama (`06 → 05 → 07`) tetap berlaku untuk pekerjaan **non-laporan** di `TASK-05`.

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

> **⚠️ Angka baris berkas BUKAN fakta yang mengikat — anggap semua basi kecuali terukur hari ini.**
> Riwayat nyata (2026-10-04): `CaptureSession.tsx` tertulis **2.099** di beberapa dokumen, dokumen lain
> menulis **2.073**; pengukuran sesungguhnya **2.155** — lalu turun ke **1.891** lewat refactor G3-01 dan
> naik lagi ke **1.901** begitu fiturnya ditulis. Selisih 82 baris itu sudah ada sebelum ada yang mengerjakan.
> **Selalu ukur sendiri** sebelum memakai angka apa pun: `(Get-Content <berkas>).Count`, lalu perbarui
> **semua** tempat yang menyebutnya di putaran yang sama. Jangan menyalin angka dari dokumen ini.
> Terukur terakhir 2026-10-04 (setelah G3-01 L10 — undo hapus topik & tindak lanjut): `CaptureSession.tsx` **1.931** · `MonthlyReport.tsx` **2.351** ·
> `Settings.tsx` **1.308** · `StudentDetail.tsx` **1.083** · `payments/TagihanTab.tsx` **1.035**.

| Fakta | Nilai | Lokasi |
|---|---:|---|
| Kelas warna di luar berkas §2.1 | **0** (G2-02, v1.87.0) — target ≤190 dicabut, target resmi = **0**; baseline terukur 2026-10-03 = **2976**. Angka kontrak lama **471** berasal dari perintah **tidak rekursif** yang hanya menjangkau 38 berkas. Sisa kelas warna hidup **hanya** di tiga berkas §2.1: `engagement.ts:135-148` · `invoicePresentation.ts:37-40,82` · `finance.ts:108-110` — keputusan Q42/Q43 di `docs/README.md` §4.2 #26. **Q42/Q43 = opsi B (2026-10-04):** pemakaian kelas itu oleh UI sudah dipindah ke peta **token-only** `src/lib/toneStyles.ts`, jadi string di tiga berkas itu kini **tidak terpakai** (dibiarkan karena berkasnya dilindungi). **Batas lingkup penghitung:** `g2-02-scan.mjs` tidak mencakup stop gradien — dan pada 2026-10-04 dua gradien terakhir (kartu changelog: biru-600 → indigo-600; kartu langkah Catat Sesi: abu-terang → putih) **sudah ditokenkan** (`--brand-solid` → `--accent-solid`; `--surface` → `--surface-strong`), sehingga **0 stop palet mentah** di seluruh `src`. Catatan penting untuk agen berikutnya: Tailwind v4 memindai **teks mentah** berkas proyek (termasuk `docs/*.md`), jadi **menulis nama kelas palet di dokumen pun** ikut mencetak utility-nya ke bundel — sebut warnanya, jangan nama kelasnya | `Get-ChildItem -Recurse src -Include *.tsx -File` + `Select-String` |
| Residual K3 di `payments/**` | **109 baris** memakai `formatRupiah`/`totalCost`/`rateSnapshot` tanpa penanda di `src/screens/payments/**` — **dikecualikan dari §6** (Q44/A17). Rincian: `RingkasanTab` 29 · `TagihanTab` 29 · `RekapTab` 24 · `PengeluaranTab` 6 · `ManualInvoiceForm` 6 · `InvoiceModal` 4 · `FinancePipelineBoard` 4 · `InvoiceRow` 3 · `InvoicePdfPages` 2 · `Payments` 2. Terukur 2026-10-04; masking modul = opsi lanjutan, belum dijadwalkan | perintah §6 (versi 2026-10-04) |
| Dark mode | **mati — permanen, light-only (Q4 2026-10-01)** | `src/index.css` (cari `Dark mode DEAKTIVASI`) |
| Langkah wizard | **6** | `captureSession/constants.ts` → `STEP_META` |
| Kerapatan timeline | `PX_PER_HR = 64` tetap | `home/DayView.tsx:18` |
| 6 kebocoran uang | Home · OperationalSnapshot · Students · StudentDetail · SessionDetailModal · MonthlyReport | rincian + jangkar: `TASK-08` §2 |
| Titik pemanggil AI | **7** · 2 modal berbeda | `TASK-07` §2 |
| Estimator biaya (jangan buat baru) | 7 fungsi `estimate*Cost()` | `src/lib/aiClient.ts` |
| **Warna heks mentah di luar konteks kanvas/SVG** — temuan 2026-10-04, **belum dikerjakan** | Audit seluruh `src/` menemukan ~40 berkas memakai `#RRGGBB` mentah. **Sebagian besar SAH dan bukan pelanggaran K4** karena konteksnya tidak bisa dijangkau token CSS: `<canvas>` (`SignaturePad.tsx`, `lib/foto.ts`, `dev/seedDummy.ts`), atribut SVG (`charts/*`, `ActivityRing.tsx`, `ClockTimePicker.tsx`), palet data yang disimpan sebagai nilai (`lib/engagement.ts` `scoreInfo.color/bg`, `lib/studentColor.ts`, `RatingIndicator`/`ActivityRing` `colors`), dan gaya cetak/PDF lepas (`payments/InvoiceModal.tsx`, `InvoicePdfPages.tsx`). **Yang benar-benar sisa sapu token** (elemen biasa dengan kelas Tailwind, tapi warna lewat atribut `style`): (a) `CaptureSession.tsx:1809` — latar tombol utama bilah aksi (`saving` + 2 gradien 6 warna); (b) `captureSession/CloseOutSheet.tsx:56` — gradien kepala sheet "Laporan sesi"; (c) `components/ChangelogModal.tsx:73` — gradien penutup daftar di modal catatan perubahan (memakai **putih mentah**, padahal tetangganya di baris 51 sudah bertoken). Sapu G2-02 tidak menangkap ketiganya karena penghitungnya memeriksa **kelas**, bukan atribut `style` — jadi "0 stop palet mentah" di baris atas tetap benar untuk kelas, tetapi **bukan** untuk `style`. Belum ada tugas/ID; usul: bersihkan saat menyentuh berkasnya | `Get-ChildItem src -Recurse -Include *.tsx,*.ts \| Select-String -Pattern '#[0-9a-fA-F]{6}\|rgba?\('` |
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
npm run e2e:uiux  # guard metrik UI (G1-11) — 7 layar × 2 project; BUKAN bagian CI utama (Q10 = A),
                  # letak RESMI spec = e2e-uiux/ + playwright.uiux.config.ts (Q23/A19)
```

Penghitung khusus (angka wajib dilaporkan sebelum → sesudah langkah):

```powershell
# TASK-04 — utang kelas warna (REKURSIF — perintah lama "src\**\*.tsx" hanya menjangkau 38 berkas → 470)
(Get-ChildItem -Recurse src -Include *.tsx -File | Select-String -Pattern "bg-white|bg-gray-|text-gray-|border-gray-").Count
# baseline 2976 → 0 (G2-02, v1.87.0). Target ≤190 dicabut.

# TASK-05 — pipeline harus TETAP ADA & tetap diimpor (Q3 2026-10-01: redesign, bukan bubarkan)
(Get-ChildItem -Recurse src -Include *.tsx -File | Select-String -Pattern "FinancePipelineBoard").Count
# harapan: TIDAK kosong

# TASK-07 — jalur AI harus satu (REKURSIF — pola lama "src\**\*.tsx" tidak menjangkau subfolder)
Get-ChildItem -Recurse src -Include *.tsx -File | Select-String -Pattern "AiCostConfirmModal|AiCostModal"

# TASK-08 — kebocoran uang harus 0 (REKURSIF di src\screens, DI LUAR src\screens\payments)
# `src\screens\payments\**` DIKECUALIKAN — keputusan pemilik 2026-10-04 (Q44/A17): modul itu hanya
# bisa dirender setelah gerbang penuh `Payments.tsx` lolos (K3.4 lapisan kedua). Residual yang
# diterima: 109 baris (daftar berkas + angka ada di §5). Masking modul keuangan = opsi lanjutan,
# belum dijadwalkan.
Get-ChildItem -Recurse src\screens -Include *.tsx -File |
  Where-Object { $_.FullName -notmatch "\\payments\\" } |
  Select-String -Pattern "formatRupiah|totalCost|rateSnapshot" |
  Where-Object { $_.Line -notmatch "useMoneyVisible|money-safe|formatRupiahDisplay" }
# harapan: 17 baris — semuanya BUKAN tampilan uang (terukur 2026-10-04):
#   MonthlyReport 12 → `totalCost` sebagai variabel/prop
#   StudentDetail 3  → import `formatRupiah` (1) · `rateSnapshot` di logika setter (1) ·
#                      1 baris yang SUDAH memakai <MaskedMoney/> (false positive perintah)
#   Payments 2       → `report.totalCost` di predikat & agregasi, bukan tampilan
# Catatan: `src/screens/Payments.tsx` TIDAK ikut dikecualikan — yang dikecualikan hanya folder
# `src/screens/payments/**`.
```

**Kegagalan yang BUKAN regresi** (jangan "diperbaiki"):
`npm test`/`npm run e2e` lebih lambat pada putaran pertama (cache vitest/Playwright);
tes kontras `engagementContrast.test.ts` gagal **karena warna memang diubah** → perbaiki pasangan
warnanya di sumber, **jangan** matikan tesnya.

### 6.1 Kalau dijalankan di sandbox (workaround, BUKAN default)

Di sandbox yang melarang proses anak dengan pipa stdio, `npm test` **tidak bisa start**:
Vite (Windows) memanggil `child_process.exec("net use")` di `optimizeSafeRealPathSync()` → `spawn EPERM`,
lalu pool `forks` milik vitest menggantung. Pakai skrip ini sebagai gantinya:

```powershell
npm run test:sandbox      # = vitest run --pool=threads --maxWorkers=2
```

Kalau Vite masih berhenti di `spawn EPERM` sebelum tes jalan, tambahkan shim di **direktori temp**
(bukan di repo) yang menjawab `exec` seperti cabang gagal milik Vite, lalu jalankan lagi:

```powershell
# 1) buat sekali: %TEMP%\dsh-no-exec.cjs — override child_process.exec/execFile agar mengembalikan
#    galat EPERM tanpa spawn (perilaku Vite saat "net use" gagal: peta drive jaringan dibiarkan kosong)
# 2) pakai:
$env:NODE_OPTIONS="--require $env:TEMP\dsh-no-exec.cjs"; npm run test:sandbox
```

`npm run e2e` (Playwright) **tetap butuh akses lebih luas**: browser dan dev server harus
di-spawn. Di sandbox, jalankan dengan eskalasi, atau lewati dan catat di §8 tugas terkait —
**jangan** mengubah `vite.config.ts` atau `playwright.config.ts` demi sandbox.

### 6.2 Smart Gating — 4 tier (revisi 2026-10-03)

**Kenapa 4 tier:** 3 tier lama terlalu gemuk — T2 & T3 sama-sama jalankan 691 tes, padahal blast radius berbeda. 4 tier menurunkan ~40% waktu gate tanpa mengurangi cakupan.

| Tier | Kondisi | Gate | Durasi |
|---|---|---|---|
| T0 | Dokumen saja (docs/**, *.md) | `node scripts/check-md-links.mjs` | ~2 dtk |
| T1 | <3 berkas, tidak sentuh infra | `tsc -b` · `eslint src` · `vitest <berkas terkait>` | ~15 dtk |
| T2 | Sentuh src/components/lib/db/hooks ATAU layar dipakai >3 layar | T1 + smoke suite (6 tes) + `e2e:uiux` bila menyentuh UI | ~45 dtk |
| T3 | Tugas terakhir gelombang ATAU sentuh package.json/config ATAU blast radius seluruh aplikasi (token/ui/**) | T2 + full suite (691) + playwright semua spec | ~5 mnt |

**Aturan wajib (7 butir):**
1. Tentukan tier SEBELUM mulai, tulis `Tier: X — alasan: …` di laporan. Tier tanpa alasan = gate tidak sah.
2. Ragu tier → ambil tier lebih tinggi.
3. Naik tier di tengah jalan = wajar; turun = tidak. Tandai langkah baru "BARU".
4. T3 = tugas terakhir gelombang ATAU mengubah package.json/scripts/config ATAU blast radius seluruh aplikasi (mis. token/primitif ui/** yang dipakai hampir semua layar). Selain itu T2 maksimum.
5. `npm run e2e:uiux` tidak berubah — tetap dijalankan pada tugas yang menyentuh metrik UI.
6. Batch 📦 — tugas kecil boleh digabung 1 putaran. Terdaftar di ROADMAP.md.
7. Tidak berlaku surut. Gelombang 1 tuntas di gate penuh; tidak diuji ulang.

**Smoke suite = 6 tes inti:** engagementContrast · captureSessionHelpers · repos · backup · finance · settingsRepo.

**Kaidah pemutus:** kalau tugas menyentuh berkas §2.1 → tugasnya salah lingkup, bukan soal tier. Berhenti dan lapor.

### 6.3 Line Endings (CRLF/LF) — WAJIB LF

**Aturannya.** Setiap berkas teks yang DSH **tulis atau edit** disimpan dengan **LF (`\n`)** — bukan CRLF.
Berlaku sama dari Windows, Linux, maupun macOS; tidak ada pengecualian per-OS.

**Yang mengunci.** `.gitattributes` di akar repo memuat `* text=auto eol=lf`: isi index dinormalkan ke LF
**dan** checkout tetap LF di OS apa pun. Pengecualian yang disengaja: `*.bat text eol=crlf` (batch Windows),
dan berkas biner ditandai `binary` (`*.png` · `*.jpg` · `*.jpeg` · `*.gif` · `*.ico` · `*.woff` · `*.woff2`
· `*.ttf` · `*.pdf` · `*.zip`) supaya line ending-nya tidak pernah disentuh.

**1. Menemukan CRLF atau campur (mixed) → JANGAN commit.** Perbaiki dulu ke LF, lalu **LAPORKAN** di
checklist sebagai temuan (berkas + jumlah). Periksa dengan:

```powershell
git ls-files --eol   # i/ = isi index · w/ = checkout kerja · attr/ = atribut yang berlaku
```

**2. Jangan mengubah line ending berkas yang tidak disentuh tugas.** Refactor terbatas (Q9 = C): yang
diubah hanya berkas di lingkup tugas. Menormalkan seluruh repo sekaligus memicu diff ratusan baris dan
merusak `git blame` — itu keputusan pemilik, bukan agen.

**3. Gate gagal karena CRLF → perbaiki akarnya, jangan dilewati.** Gejalanya: pesan aneh yang memuat `\r`,
`bad interpreter: /bin/sh^M`, atau parser gagal pada baris yang terlihat benar. Itu **bukan** alasan
menjalankan `--no-verify`, melewati pre-commit, atau mematikan gate.

> **Jebakan yang mudah salah baca.** `core.autocrlf=true` (default Git for Windows) tetap men-checkout CRLF
> di mesin Windows meskipun atributnya `eol=lf` — **sampai berkas itu di-checkout ulang**. Jadi
> `git ls-files --eol` bisa menampilkan `w/crlf` untuk berkas yang isi index-nya sudah LF. Periksa kolom
> **`i/`** lebih dulu: `i/lf` berarti isi repo bersih dan yang terlihat hanyalah artefak working tree lokal.

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
| 2026-10-01 | **Amandemen Q1–Q9**: B4 default kosong · pipeline dipertahankan (di dalam blok "Perlu ditagih") · light-only permanen · simpan dari langkah 5 (6 langkah tetap) · peta tab Murid Ringkas/Sesi/Progres/Proyek · fokus Android (tanpa aturan 16px) · refactor terbatas sebelum wave fitur · penghitung kelas warna dibuat rekursif (baseline 904) | v1.79.3 |
| 2026-10-03 | **A15** — Smart Gating: gate tes **3 tier** menurut *blast radius* tugas (diputuskan `G2-00`/Q27) · rujuk §6.2 | — |
| 2026-10-03 | **A16** — Line Endings: semua berkas teks **WAJIB LF**, dikunci `.gitattributes` · rujuk §6.3 | — |
| 2026-10-04 | **A17 (Q44)** — cakupan K3 §6 dipersempit: `src/screens/payments/**` **dikecualikan** karena hanya bisa dirender setelah gerbang penuh `Payments.tsx` lolos; residual 109 baris diterima & didaftarkan di §5 | — |
| 2026-10-04 | **A18 (Q45)** — definisi tap target K4 ditegaskan: **≥44 px hanya untuk kontrol utama** (aksi primer, nav, ikon aksi); chip & kontrol sekunder **24–36 px diterima** (WCAG 2.5.8 ambang keras 24 px). Residual 52 kontrol (proksi statis `g2-06-scan.cjs`) ditutup sebagai pengecualian tertulis | — |
| 2026-10-04 | **A19 (Q23)** — letak **resmi** spec guard metrik UI: `e2e-uiux/` + `playwright.uiux.config.ts` (`testDir: "./e2e-uiux"`), dijalankan lewat `npm run e2e:uiux`. DoD G1-11 yang menyebut `e2e/uiux-metrics.spec.ts` **ditandai usang**; `playwright.config.ts` tidak disentuh. Konsisten dengan Q10 = A (guard UI bukan bagian CI utama) | — |
