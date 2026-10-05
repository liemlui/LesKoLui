# ATURAN-AI — Kontrak kerja rombak UI/UX (WAJIB dibaca sebelum menyentuh kode)

> **STATUS:** `final` — keputusan pemilik dikunci 2026-09-25
> **BASELINE (potret saat berkas ini dibuat):** v1.75.1 · 561 tes / 50 berkas · Dexie v15 —
> jumlah hari ini: `npm run test:sandbox` (lihat §5).
> **PANJANG:** pendek sengaja. Rincian ada di berkas yang ditunjuk. **Jangan baca berkas lain
> sebelum membaca ini.**

---

## 0. Cara pakai (hemat token — patuhi)

1. Baca berkas ini **seluruhnya** — panjangnya **ukur sendiri**, jangan percaya angka yang tertulis di
   dokumen: `(Get-Content docs/kerja/ATURAN-AI.md).Count`. Ini satu-satunya bacaan wajib; sisanya referensi.
2. **Buka [`CHEATSHEET.md`](CHEATSHEET.md) dulu, bukan `TASK-XX`.** Ia memuat 1 halaman per tugas dan cukup untuk ~95% kasus. Buka `TASK-XX` utuh hanya kalau butuh detail lebih, dan **hanya langkah yang sedang dikerjakan**.
3. **Jangan** membaca seluruh `TASK-01`, seluruh `../arsip/`, atau berkas >500 baris secara utuh. Pakai **jangkar** yang disebut tugas: cari teksnya, baca ±40 baris di sekitarnya.
4. **Jangan** membaca berkas >500 baris secara utuh. Daftar + perintah pengukurnya:
   `npm run measure` (baris `MonthlyReport.tsx`, `CaptureSession.tsx`, `Settings.tsx`, `StudentDetail.tsx`, `TagihanTab.tsx`).
   Angka baris **bukan** DoD — ia hanya penanda apakah berkas sudah dipecah.
5. **Satu langkah per putaran.** Verifikasi → lapor → berhenti. Jangan lanjut sendiri.
6. **Jangan menambah berkas baru** selain yang disebut kontrak, tanpa persetujuan.
7. **Kalau DSH baru:** baca urutan ini saja: §0 · §1 (B1–B4) · §2.1 (larangan berkas) · §6 (perintah) + §6.1 (sandbox) + §6.2 (gate 4-tier) + **§6.3 (LF)** + **§6.4 (jebakan alat & git — hemat waktu, jangan dilewati)** · [`PEKERJAAN.md`](PEKERJAAN.md) (daftar pekerjaan aktif, **termasuk** di mana langkah rinci tiap G3 berada) · [`CHEATSHEET.md`](CHEATSHEET.md). Sisanya referensi.
8. **[`PEKERJAAN.md`](PEKERJAAN.md) adalah satu-satunya daftar pekerjaan** — ia menggantikan `ROADMAP.md` (kini di `../arsip/`) **dan** §4 `docs/README.md` (kini di `../arsip/RIWAYAT-PEKERJAAN-2026-10.md`).
9. **Angka mutakhir tidak ditulis di dokumen.** Versi = `package.json`; jumlah tes = `npm run test:sandbox`; baris berkas = `npm run measure`. `npm run check:docs` menolak klaim versi/angka yang salah.

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

**Amandemen 2026-10-05 (Q-A…Q-F, #1…#7) — ikut terkunci.** Dijawab pemilik pada putaran pemeriksaan
dokumentasi; rincian angkanya ada di riwayat berkas terkait.

- **Q-A = B — 10 warna heks mentah diganti token** (bilah aksi `CaptureSession.tsx` · kepala sheet &
  tombol `CloseOutSheet.tsx`). **Selesai** (commit `ccffa3c`). Diterima sadar: kepala sheet laporan kini
  hijau lebih gelap. Efek samping yang **memperbaiki**: teks putih di atas dua nilai lama gagal ambang —
  langkah 6 `3,30:1` → `4,95:1`, keadaan menyimpan `1,80:1` → `14,67:1`. Kalau keadaan "menyimpan" terlihat
  terlalu gelap, itu pilihan sadar (token terdekat menurut jarak RGB tetap gagal: `1,49:1`).
- **Q-B = b3 — nav bawah TIDAK diblokir.** Keluar lewat nav tidak menghilangkan isian (draf tersimpan +
  langkah dipulihkan). Yang ditambahkan hanya **satu baris kepastian** saat draf berstatus tersimpan.
  Opsi b2 (konfirmasi di nav) **ditolak** — jangan ditawarkan lagi; kalau nanti diinginkan, itu keputusan baru.
- **Q-C = c2 — grup radio pakai pola keyboard penuh.** Tab masuk **sekali** ke pilihan aktif, panah
  ←/→/↑/↓ memindahkan pilihan (membungkus), `Home`/`End` ke ujung. **Selesai** (commit `82bb758`; aturan
  murni `nextRadioIndex()` + 5 tes). Perpindahan fokus sesungguhnya **belum diuji** — calon spec E2E.
- **Q-D = d2 — rilis ditunda.** Versi **tidak** dinaikkan sampai G3-01 tuntas (`L4 ManageSessionSheet`);
  lalu **satu** entri `CHANGELOG` untuk seluruh gelombang 3, bukan satu per langkah. Selama itu aplikasi
  di Vercel tetap memperbarui diri (SW), hanya modal "Catatan perubahan" yang belum muncul.
- **Q-E = e1 — `docs/mockups/` DIPERTAHANKAN**, tidak diarsipkan, minimal sampai G3-05 (laporan) selesai.
- **Q-F = bertahap — spesifikasi `G3-02`…`G3-10` dipindah dari arsip ke dokumen hidup satu tugas per
  pemindahan**, dikerjakan saat gelombang itu mulai. Sampai itu, penunjuknya ada di `PEKERJAAN.md` §3.
- **#5 — batas waktu satu tes Playwright 30 → 60 dtk** (commit `67f2c35`). "Tetap fokus kecepatan": **60,
  bukan 120**; jangan dinaikkan lagi tanpa alasan terukur, dan `webServer.timeout` tidak diubah.
- **#6 — CI GitHub TIDAK diaktifkan.** Gate lokal (`tsc` · `eslint` · `test:sandbox` · `build`) adalah
  satu-satunya penjaga. **Jangan menyarankan mengaktifkan CI lagi**; `ci.yml` dibiarkan apa adanya dan
  **tidak perlu diperbaiki** (isinya sudah benar).
- **#1 — verifikasi PWA dua build ditangani pemilik lewat Vercel.** Bukan tugas agen; jangan diangkat lagi.
- **#2 — daftar periksa manual ditambah** butir untuk perubahan 2026-10-05 (lihat `PEKERJAAN.md` §5).
- **#3 — katalog topik 78 mapel dikerjakan agen**, bukan lagi "pengetahuan pemilik": cari topik
  **sebanyak mungkin**, topik yang sama boleh dipakai lintas mapel/serupa. Jaga `topicCoverage` tetap hijau.
- **#7 — semua spec E2E harus hijau.** Mulai dari menjalankan `npm run e2e` (butuh eskalasi sandbox);
  spec yang merah **jalankan sendirian dulu** sebelum disebut regresi; baru perbaiki yang benar-benar gagal.

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

Urutan menang: **1)** berkas ini → **2)** `docs/06-ARSITEKTUR-KODE.md`
(aturan yang mengikat seluruh kode) → **3)** `TASK-XX` → **4)** dokumen lain.
Tulis konfliknya di §8 tugas terkait pada putaran yang sama.

> **Catatan (2026-10-05).** Penengah lama di sini adalah `arsitektur/11-uiux-ai-cost-dan-privasi.md`.
> Dokumen itu **dipatok v1.75.1** dan sejak 2026-10-05 **diarsipkan** — dokumen pemenang konflik tidak
> boleh jadi dokumen yang paling basi. Isi kontraknya yang masih berlaku sudah dinaikkan ke berkas ini
> (§1 keputusan terkunci · §3 kontrak inti); sisanya potret sejarah.

**Konflik yang sudah diselesaikan** (jangan diangkat lagi):
`TASK-04` Langkah 4 **tidak** mengubah jumlah pintu nav; perubahan nav **hanya** di `TASK-05` Langkah 7.
Alasan: selector E2E hanya boleh patah sekali.

---

## 3. Kontrak inti (ringkas — rincian yang masih berlaku ada di berkas ini; potret lama di `../arsip/arsitektur/11-…`)

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
| **daftar pekerjaan terbuka & urutan eksekusi** | [`PEKERJAAN.md`](PEKERJAAN.md) |
| apa yang dilarang disentuh + peta kode | `docs/06-ARSITEKTUR-KODE.md` |
| melihat usulan tampilan | `docs/mockups/home-2026-09-24.html` · `uang-…` · `hari-…` (buka di browser) |
| cara menulis dokumen tugas | `docs/kerja/TASK-02-format-dokumen-tugas-ai.md` |
| potret lama (jangan dikutip sebagai keadaan sekarang) | `docs/arsip/arsitektur/11-uiux-ai-cost-dan-privasi.md` · `…/06-ai-generation.md` |

---

## 5. Fakta kode yang mengikat

> **⚠️ Sejak 2026-10-05, angka MUTAKHIR tidak lagi ditulis di sini.** Dokumen ini memuat **perintah
> pengukurnya**; hasilnya selalu basi begitu ada commit. Riwayat nyata: `CaptureSession.tsx` pernah
> tertulis **2.099** di satu dokumen dan **2.073** di dokumen lain, padahal saat itu **2.155**.
>
> | Yang mau diketahui | Perintahnya |
> |---|---|
> | versi aplikasi | `node -p "require('./package.json').version"` |
> | jumlah tes & berkas uji | `npm run test:sandbox` (angka resmi = keluaran vitest) |
> | baris berkas besar | `npm run measure` |
> | versi skema Dexie | `Select-String -Path src/db/db.ts -Pattern "this\.version\(" \| Select-Object -Last 1` |
>
> Kalau sebuah angka **harus** muncul di dokumen (mis. potret sebuah rilis), tulis beserta **tanggal +
> versinya** — jangan sebagai "keadaan hari ini".

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
| **Warna heks mentah di luar konteks kanvas/SVG** — temuan 2026-10-04, **sebagian 2026-10-05** | ~40 berkas memakai `#RRGGBB`; **sebagian besar SAH** karena token CSS memang tidak menjangkaunya: `<canvas>` (`SignaturePad`, `lib/foto`, `dev/seedDummy`), atribut SVG (`charts/*`, `ActivityRing`, `ClockTimePicker`), palet data yang tersimpan sebagai nilai (`engagement.ts` `scoreInfo`, `studentColor`, `RatingIndicator`/`ActivityRing`), gaya cetak/PDF (`payments/InvoiceModal`, `InvoicePdfPages`). Sapu G2-02 melewatinya karena menghitung **kelas**, bukan `style` — "0 stop palet mentah" tetap benar untuk kelas, **bukan** untuk `style`. **Hasil sapuan 2026-10-05 (terukur, `CaptureSession.tsx` kini `:1932`):** pudar putih sudah bertoken (`ChangelogModal.tsx:73` + `ScheduleStep.tsx:81` → `--surface-strong`, **nol perubahan warna**). Sisa **10 nilai di 2 berkas**: `CaptureSession.tsx:1932` (`#93c5fd` · `#16a34a` · `#15803d` · `#2563eb` · `#1d4ed8`) · `CloseOutSheet.tsx:56` (`#059669` · `#10b981` · `#34d399`) · **`CloseOutSheet.tsx:108`** (`#1f2937` · `#374151` — tombol "Selesai & Lihat Profil", baru terdaftar 2026-10-05). Sebabnya token repo = palet Tailwind **v4**, hex itu palet **v3**: hanya `#1f2937` punya kembaran nyaris identik (`--surface-inverse` `#1e2939`, ΔRGB **3**), sisanya berjarak **ΔRGB 30–173** (mis. `#15803d` vs `#008236` = 30 · `#2563eb` vs `#155dfc` = 39 · `#10b981` vs apa pun ≥ 146). Menggantinya **mengubah warna yang terlihat** → keputusan pemilik, bukan pembersihan | pengukur: `.design-audit/a3-hex-token-match.cjs` (oklch→hex, divalidasi putih/hitam/gray-100) · pemindai: `Get-ChildItem src -Recurse -Include *.tsx,*.ts \| Select-String -Pattern '#[0-9a-fA-F]{6}\|rgba?\('` |
| Fungsi repo keuangan (jangan buat baru) | `listPayments`, `listSessionCountBillingProgress`, `getCashSummary`, `markPaymentTransferredById`, `markPaymentUnpaidById`, `updatePaymentAmountById`, `createSessionCountInvoice`, `cancelSessionCountInvoice`, `syncReportPayment` | `src/db/repos/paymentRepo.ts` |
| Cara PIN disimpan | PBKDF2 150k + salt, `pbkdf2v2:` | `src/lib/crypto.ts` (jangan diubah) |

---

## 6. Verifikasi — perintah tetap, jalankan dari `les-ko-lui/`

> **Di mesin ini (sandbox DSH) perintah yang WAJIB dipakai adalah yang ber-`sandbox`.** `npm test` polos
> tidak bisa start di sini (Vite memanggil `child_process.exec("net use")` → `spawn EPERM`). Aturan
> lengkap + shim: §6.1. Perintah tanpa `sandbox` hanya berlaku di mesin/CI biasa.

```powershell
.\node_modules\.bin\tsc.cmd -b                              # harapan: tanpa keluaran (jangan `npx`: EPERM _cacache)
.\node_modules\.bin\eslint.cmd src --max-warnings 0          # harapan: tanpa keluaran
npm run test:sandbox                                        # harapan: lulus, 0 gagal   ← ini yang resmi di sini
node scripts/measure.mjs                                    # cetak jumlah tes, baris berkas besar, versi
npm run build                                               # harapan: built + dist/sw.js (butuh shim, §6.1)
npm run check:docs                                          # tautan md + klaim versi/angka di dokumen
npm run e2e                                                 # harapan: lulus (butuh spawn browser → minta eskalasi)
npm run e2e:uiux                                            # guard metrik UI — 7 layar × 2 project;
                                                            # BUKAN CI utama (Q10 = A); letak RESMI e2e-uiux/ (Q23/A19)
```

**Jangan menyalin hasil `npm run test:sandbox` ke dokumen.** Tulis perintahnya. Angka yang disalin
selalu basi — terukur 2026-10-05: jumlah tes pernah tertulis di **18 tempat / 13 berkas**, dan hanya
**3** yang benar. `npm run check:docs` kini menolak klaim versi yang salah di kepala dokumen aktif.

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

### 6.1 Lingkungan terbatas (sandbox DSH) — INILAH DEFAULT DI MESIN INI

> **Status aturan ini: resmi, bukan lagi "workaround".** Diputuskan pemilik 2026-10-05 (Q-15 opsi A).
> Alasan: sebelum ini setiap sesi baru harus menemukan ulang jalan keluarnya, dan §6 menyuruh
> perintah yang pasti gagal.

**Gejalanya.** Di sandbox yang melarang proses anak dengan pipa stdio, `npm test` **tidak bisa start**:
Vite (Windows) memanggil `child_process.exec("net use")` di `optimizeSafeRealPathSync()` → `spawn EPERM`,
lalu pool `forks` milik vitest menggantung. Gejala yang sama muncul untuk `npm run build`.

**Cara yang berlaku (urutan ini):**

```powershell
# 1) Shim kecil di TEMP (BUKAN di repo): menjawab exec/execFile dengan galat EPERM tanpa spawn —
#    persis perilaku Vite saat "net use" gagal (peta drive jaringan dibiarkan kosong).
#    $env:TEMP berubah tiap sesi, jadi shim HILANG antar-sesi → buat ulang kalau gagal EPERM.
$shim = Join-Path $env:TEMP "dsh-no-exec.cjs"
@'
const cp = require("child_process");
function epErr() { const e = new Error("spawn EPERM"); e.code = "EPERM"; return e; }
const oE = cp.exec;
cp.exec = function (cmd, opts, cb) {
  if (typeof opts === "function") { cb = opts; opts = {}; }
  if (typeof cb === "function") { process.nextTick(() => cb(epErr(), "", "")); return { on() {}, kill() {} }; }
  return oE.apply(this, arguments);
};
const oF = cp.execFile;
cp.execFile = function (file, args, opts, cb) {
  if (typeof args === "function") { cb = args; args = []; opts = {}; }
  else if (typeof opts === "function") { cb = opts; opts = {}; }
  if (typeof cb === "function") { process.nextTick(() => cb(epErr(), "", "")); return { on() {}, kill() {} }; }
  return oF.apply(this, arguments);
};
'@ | Set-Content -Encoding utf8 $shim

# 2) Pakai untuk tes DAN build
$env:NODE_OPTIONS="--require $shim"
npm run test:sandbox      # = vitest run --pool=threads --maxWorkers=2
npm run build
```

**Yang tetap butuh eskalasi sandbox** (bukan bisa disiasati): `npm run e2e`, `npm run e2e:uiux`,
`npx playwright test …` (browser + dev server harus di-spawn), dan `git push` (kredensial Windows /
schannel). Bukti push yang sah: baris keluaran `abc..def  main -> main` **dan** `git status -sb` tanpa
penanda ahead/behind — `git fetch` tetap gagal meski di-eskalasi, jadi jangan menunggu fetch.

**Jangan** mengubah `vite.config.ts`, `playwright.config.ts`, atau skrip di `package.json` demi sandbox
(config = keputusan pemilik / Tier 3).

### 6.2 Smart Gating — 4 tier (revisi 2026-10-03)

**Kenapa 4 tier:** 3 tier lama terlalu gemuk — T2 & T3 sama-sama menjalankan seluruh suite, padahal blast radius berbeda. 4 tier menurunkan ~40% waktu gate tanpa mengurangi cakupan.

| Tier | Kondisi | Gate | Durasi |
|---|---|---|---|
| T0 | Dokumen saja (`docs/**`, `*.md`) | `npm run check:docs` | ~2 dtk |
| T1 | <3 berkas, tidak sentuh infra | `tsc -b` · `eslint src` · `vitest <berkas terkait>` | ~15 dtk |
| T2 | Sentuh `src/components`/`lib`/`db`/`hooks` ATAU layar dipakai >3 layar | T1 + smoke suite (§ di bawah) + `e2e:uiux` bila menyentuh UI | ~45 dtk |
| T3 | Tugas terakhir gelombang ATAU sentuh `package.json`/config ATAU blast radius seluruh aplikasi (token/`ui/**`) | T2 + **seluruh** suite + playwright semua spec | ~5 mnt |

**Aturan wajib (7 butir):**
1. Tentukan tier SEBELUM mulai, tulis `Tier: X — alasan: …` di laporan. Tier tanpa alasan = gate tidak sah.
2. Ragu tier → ambil tier lebih tinggi.
3. Naik tier di tengah jalan = wajar; turun = tidak. Tandai langkah baru "BARU".
4. T3 = tugas terakhir gelombang ATAU mengubah package.json/scripts/config ATAU blast radius seluruh aplikasi (mis. token/primitif ui/** yang dipakai hampir semua layar). Selain itu T2 maksimum.
5. `npm run e2e:uiux` tidak berubah — tetap dijalankan pada tugas yang menyentuh metrik UI.
6. Batch 📦 — tugas kecil boleh digabung 1 putaran. Terdaftar di PEKERJAAN.md §2.
7. Tidak berlaku surut. Gelombang 1 tuntas di gate penuh; tidak diuji ulang.

**Smoke suite = berkas inti berikut.** Perintahnya (jalankan dari `les-ko-lui/`, dengan shim §6.1):

```powershell
npm run test:sandbox -- engagementContrast captureSessionHelpers repos backup finance settingsRepo
```

(Urutan argumen tidak penting; vitest mencocokkan potongan nama berkas. Perintah ini **menjaring lebih
dari 6 berkas** — terukur 2026-10-05: **8 berkas / 177 tes lulus** — karena nama seperti `repos`
juga cocok dengan `captureDraftRepo`. Itu wajar: yang penting cepat dan mencakup inti.)

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

### 6.4 Jebakan alat & git di mesin ini (semuanya pernah memakan waktu)

Dulu daftar ini hanya hidup di prompt serah-terima yang kini **diarsipkan** — jadi sesi baru harus
menemukannya ulang. Sejak 2026-10-05 ia tinggal di sini.

| Gejala | Sebab sebenarnya | Tindakan |
|---|---|---|
| `git commit` mencetak baris sukses tetapi **exit 1** | git menulis peringatan CRLF ke stderr (atribut `eol=lf` vs checkout Windows); commit-nya **berhasil** | **Jangan ulangi commit.** Buktikan: `git log --oneline -1` + `git status --porcelain` |
| `git status` menampilkan ` M <berkas>` padahal isinya tidak berubah | stat-cache/racy-timestamp sesudah berkas ditulis ulang di luar git | Bandingkan hash: `git hash-object -- <berkas>` vs `git ls-files -s -- <berkas>`; bersihkan: `git add --renormalize -- <berkas>` |
| `node`/`npm` gagal `spawn EPERM` | shim §6.1 hilang karena `$env:TEMP` berganti tiap sesi | Buat ulang shim **di dalam satu pemanggilan pwsh** yang memakainya |
| Skrip pengukur di `$env:TEMP` tidak ketemu / hilang | alat tulis DSH dan pwsh memakai `$env:TEMP` berbeda | Taruh skrip di `.design-audit/` (gitignored, tetap ada antar-sesi) |
| `edit` gagal `ReplaceFileW EIO` (Win32 1175) | transien Windows | Ulangi perintah yang sama |
| `edit` menolak "file has not been read" | berkas belum dibaca dengan alat **`read`** (membaca lewat `Get-Content` tidak dihitung) | `read` berkasnya dulu, baru edit |
| **Baris tabel dokumen tertimpa/rusak** sesudah `edit` | jangkar (`old_string`) terlalu pendek sehingga cocok di tempat lain | Pakai **seluruh baris** sebagai jangkar; sesudah edit, periksa `git diff` dan baca ulang 3 baris di sekitarnya |
| `npm run e2e` meninggalkan perubahan yang tidak diminta | spec menulis ulang 59 PNG ter-track di `e2e/screenshots/` + membuat berkas baru | `git checkout -- e2e/screenshots`, hapus yang baru, **jangan** di-commit · *(dibawa dari `../arsip/PROMPT-LANJUTAN-G3.md` §7 — belum dijalankan ulang 2026-10-05)* |
| Dua penomoran untuk satu ID (`C-02`/`C-04`/`C-08` berarti hal berbeda) | `GELOMBANG-3` menomori ulang temuan `AUDIT-UIUX-CATAT-SESI-2026-09-12` | Yang mengikat untuk tugas G3 adalah **`GELOMBANG-3`**; lihat [`PEKERJAAN.md`](PEKERJAAN.md) §3 |

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
| 2026-10-05 | **A20 — penataan dokumentasi (keputusan pemilik Q-9…Q-17 opsi A).** (a) **Angka mutakhir tidak ditulis di dokumen**: §5 diganti tabel perintah pengukur; alat baru `npm run measure` + `npm run check:docs` (menolak klaim versi/angka yang salah; `check-md-links` kini keluar non-nol saat ada tautan rusak — sebelumnya selalu 0). (b) **Lingkungan sandbox jadi resmi** (§6.1): `npm run test:sandbox` + shim `dsh-no-exec.cjs` adalah perintah default di mesin ini, bukan "workaround". (c) **Seri `arsitektur/01`–`11` diarsipkan**; penggantinya `docs/06-ARSITEKTUR-KODE.md` (tanpa angka) — penengah konflik §2.3 tidak lagi dokumen yang paling basi. (d) **[`PEKERJAAN.md`](PEKERJAAN.md) = satu-satunya daftar pekerjaan**; `ROADMAP.md` + §4 `docs/README.md` diarsipkan. (e) **Aturan arsip berlaku surut**: dokumen tuntas/usang pindah ke `../arsip/` (GELOMBANG-1, PROMPT-LANJUTAN-G3, CHECKLIST-VISUAL-2026-10-04, dan isi lama §4). (f) §0 diperbaiki: panjang berkas sebenarnya (**bukan** ±150 baris) dan urutan baca **satu** (CHEATSHEET sebelum TASK-XX) | v1.90.0 |
| 2026-10-05 | **A21 — jebakan alat/git naik ke §6.4 + aturan baru: keputusan terkunci wajib punya bukti.** (a) **§6.4 baru**: commit yang cetak sukses tapi `exit 1`, `git status` ` M` palsu (stat-cache) & cara membersihkannya, shim `$env:TEMP`, skrip scratch di `.design-audit/`, `ReplaceFileW EIO`, wajib `read` sebelum `edit`, **jangkar tabel harus satu baris utuh** (nyata: satu baris riwayat tertimpa di `TASK-06`), efek samping `npm run e2e` pada screenshot, dan penomoran ID ganda `GELOMBANG-3` vs audit. Dulu semuanya hanya hidup di `../arsip/PROMPT-LANJUTAN-G3.md` yang beku. (b) **Temuan yang mengubah aturan:** keputusan terkunci **Q2** ("simpan dari langkah 5") selama ini **hanya ada di §1 berkas ini** — tidak di kode dan tanpa tes, jadi tutor yang tidak butuh Bukti tetap dipaksa melewati langkah 6. Konsekuensi yang mengikat sekarang: setiap keputusan di §1 wajib menyebut **bukti yang bisa dijalankan** (nama tes atau baris di `PEKERJAAN.md`), bukan hanya kalimat | — |
| 2026-10-05 | **A22 — Amandemen Q-A…Q-F + #1…#7 dikunci di §1.** Ringkas: **Q-A=B** 10 heks mentah → token (kontras teks putih naik: langkah 6 `3,30→4,95:1`, menyimpan `1,80→14,67:1`) · **Q-B=b3** nav bawah tidak diblokir, cukup satu baris kepastian draf (b2 ditolak) · **Q-C=c2** keyboard pola radiogroup (Tab sekali + panah/Home/End, aturan `nextRadioIndex()` + 5 tes) · **Q-D=d2** rilis ditunda sampai G3-01 tuntas, satu entri `CHANGELOG` per gelombang · **Q-E=e1** mockup dipertahankan · **Q-F** spesifikasi G3-02…G3-10 dipindah dari arsip **bertahap** · **#5** batas tes Playwright 60 dtk (jangan naikkan lagi tanpa alasan) · **#6 CI tidak diaktifkan** (jangan tawarkan lagi; `ci.yml` tidak perlu diperbaiki) · **#1** PWA diverifikasi pemilik lewat Vercel · **#2** daftar periksa manual jadi 20 butir · **#3** katalog topik 78 mapel jadi pekerjaan agen · **#7** semua spec E2E harus hijau | — |