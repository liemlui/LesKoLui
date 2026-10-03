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

| Fakta | Nilai | Lokasi |
|---|---:|---|
| Kelas warna hardcode | **904** (target ≤190) — angka kontrak lama **471** berasal dari perintah **tidak rekursif** yang hanya menjangkau 38 berkas; angka terkoreksi 2026-10-01 | `Get-ChildItem -Recurse src -Include *.tsx -File` + `Select-String` |
| Dark mode | **mati — permanen, light-only (Q4 2026-10-01)** | `src/index.css` (cari `Dark mode DEAKTIVASI`) |
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
npm run e2e:uiux  # guard metrik UI (G1-11) — 7 layar × 2 project; BUKAN bagian CI utama (Q10 = A),
                  # spec-nya di `e2e-uiux/` supaya `npm run e2e` tidak ikut melambat
```

Penghitung khusus (angka wajib dilaporkan sebelum → sesudah langkah):

```powershell
# TASK-04 — utang kelas warna (REKURSIF — perintah lama "src\**\*.tsx" hanya menjangkau 38 berkas → 470)
(Get-ChildItem -Recurse src -Include *.tsx -File | Select-String -Pattern "bg-white|bg-gray-|text-gray-|border-gray-").Count
# baseline 2026-10-01 = 904 (git grep = 902) · target ≤190

# TASK-05 — pipeline harus TETAP ADA & tetap diimpor (Q3 2026-10-01: redesign, bukan bubarkan)
(Get-ChildItem -Recurse src -Include *.tsx -File | Select-String -Pattern "FinancePipelineBoard").Count
# harapan: TIDAK kosong

# TASK-07 — jalur AI harus satu (REKURSIF — pola lama "src\**\*.tsx" tidak menjangkau subfolder)
Get-ChildItem -Recurse src -Include *.tsx -File | Select-String -Pattern "AiCostConfirmModal|AiCostModal"

# TASK-08 — kebocoran uang harus 0 (REKURSIF di dalam src\screens saja)
Get-ChildItem -Recurse src\screens -Include *.tsx -File | Select-String -Pattern "formatRupiah|totalCost|rateSnapshot" |
  Where-Object { $_.Line -notmatch "useMoneyVisible|money-safe|formatRupiahDisplay" }
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

### 6.2 Smart Gating — gate menurut blast radius tugas (berlaku mulai `G2-01`)

**Kenapa ada.** Satu gate untuk semua tugas membuang waktu. Gelombang 1 menghabiskan **±2 menit gate
di setiap tugas** (tsc + lint + 691 tes + build + `md-links` + Playwright), padahal mayoritas tugas
hanya menyentuh 1–2 berkas. Itu **±20 menit per gelombang**; dengan 20 tugas tersisa
(`G2-01…G2-10`, `G3-01…G3-10`) menjadi **±40 menit** tes berulang — untuk kode yang tidak mungkin
patah karena tugasnya tidak menyentuhnya.

**Tier ditentukan SEBELUM mulai**, dari blast radius tugas:

| Tier | Kondisi | Gate |
|---|---|---|
| **Tier 1** | Tugas menyentuh <3 berkas **dan** TIDAK menyentuh infrastruktur | `npx tsc -b` · `npx eslint src` · **tes yang berkaitan saja** (vitest `-t` / berkas tes terkait) · spec Playwright terkait (kalau ada) |
| **Tier 2** | Tugas menyentuh infrastruktur: `src/components/**`, `src/lib/**`, `src/db/**`, `src/hooks/**`, **atau** layar yang dipakai >3 layar lain | Tier 1 + `npm run test:sandbox` **PENUH** |
| **Tier 3** | Tugas terakhir gelombang **atau** tugas yang mengubah `package.json`/`scripts`/config | Tier 2 + `npx playwright test` **SEMUA spec** di `e2e/` |

**Aturan tambahan (mengikat):**

1. **Ragu tier → ambil tier lebih tinggi.** Gate berlebih hanya kehilangan menit; gate kurang bisa
   meloloskan regresi ke pengguna nyata.
2. **Wajib menulis `Tier: X — alasan: …`** di checklist kerja laporan. Tier tanpa alasan = gate
   tidak sah, dan tugasnya dianggap belum diverifikasi.
3. **Naik tier di tengah jalan itu wajar; turun tidak.** Kalau ternyata tugas menyentuh infra:
   naikkan tier, **update checklist**, dan tandai langkah baru dengan **"BARU"**.
4. **Full suite tetap dijalankan di tugas terakhir tiap gelombang (Tier 3)** — `npx playwright test`
   semua spec di `e2e/` sebagai jaring akhir. Smart gating **tidak** menghapus gate itu.
5. **`npm run e2e:uiux` tidak berubah.** Tetap dijalankan pada tugas yang menyentuh metrik UI
   (kontras, tap target, emoji di kontrol, heading, kontrak tab) dan pada checkpoint gelombang.
   Spec-nya tetap di `e2e-uiux/` (Q23) supaya `npm run e2e` tidak ikut melambat.
6. **Tugas dokumen-saja = Tier 1 termurah.** Kalau yang berubah hanya `docs/**` dan `*.md`
   (tidak ada kode, tidak ada script), cukup `node scripts/check-md-links.mjs` → **rusak = 0**.
   tsc/lint/test/build/Playwright dilewati dan alasan itu ditulis di laporan. *(Preseden: `G2-00`.)*
7. **Smart gating tidak berlaku surut.** Gelombang 1 sudah tuntas pada gate penuh (v1.85.0) dan
   tidak diuji ulang. §6 di atas **tidak berubah** — perintahnya tetap sama; yang berubah hanya
   **kapan** masing-masing dijalankan.

> **Kaidah pemutus:** kalau sebuah tugas menyentuh berkas di §2.1, tiernya **bukan** soal pilihan —
> tugas itu **salah lingkup** (§7). Berhenti dan lapor; **jangan** naikkan tier untuk menutupinya.

**Tier ditetapkan ulang sebelum tiap tugas dimulai** dan ditulis di checklist laporan tugas itu —
tier **bukan** warisan dari tugas sebelumnya. Contoh penentuan tier untuk gelombang 2 ada di
[`GELOMBANG-2.md`](GELOMBANG-2.md) §2; kolom `Tier` permanen per tugas **belum** ditambahkan
(dilaporkan ke pemilik; **tidak** dikerjakan di `G2-00`).

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
