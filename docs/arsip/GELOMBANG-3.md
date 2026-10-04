# GELOMBANG-3 — Alur: catat sesi → keuangan → AI → laporan → murid/proyek (/foto)

> **Sekilas** · Jenis: **dokumen tugas (dapat dieksekusi)** · Diperbarui: 2026-10-01 · Status: **aktif**
> **Untuk siapa:** agen AI pelaksana (satu putaran = satu bagian, jangan improvisasi).
> **Prasyarat wajib dibaca lebih dulu:** [`ATURAN-AI.md`](../kerja/ATURAN-AI.md) → tugas asal tiap pekerjaan
> ([`TASK-05`](../kerja/TASK-05-rombak-keuangan.md) · [`TASK-06`](../kerja/TASK-06-perkuat-catat-sesi.md) · [`TASK-07`](../kerja/TASK-07-kontrak-ai-berbiaya.md))
> → [`TASK-01` §10](../kerja/TASK-01-refactor-layar-besar.md) (refactor terbatas).
> **Dependency gelombang:** **seluruh Gelombang 1 & 2 selesai.**
> **Isi:** 10 tugas. **Tidak ada perubahan skema Dexie** (satu-satunya perubahan tipe: `IaEeType` + `AuditAction`).
> **Estimasi total:** **6×L + 4×M** ≈ 4–6 minggu (L = G3-01…G3-06; M = G3-07…G3-10), **belum termasuk** 5 refactor terbatas di §0 tiap tugas.

## 0. Cara pakai

Sama seperti [`GELOMBANG-1.md`](GELOMBANG-1.md) §0 (satu putaran, gate wajib, laporan 5 baris).
Tambahan khusus gelombang ini:

1. **Lima tugas punya bagian "0. Refactor terbatas"** (G3-01, G3-02, G3-05, G3-06, G3-09). Kerjakan bagian 0
   **sampai gate hijau**, baru bagian 1. Target ukuran diambil dari [`TASK-01` §2](../kerja/TASK-01-refactor-layar-besar.md) —
   **jangan membuat target baru**.
2. **Refactor = memindah, bukan memperbaiki.** Jangan mengubah perilaku, teks yang dilihat pengguna, atau `STEP_META`.
3. **⏸ = menunggu.** Fitur bertanda ⏸ tetap ada di daftar; ia dikerjakan setelah penghambatnya selesai,
   **tidak** dihapus.
4. Bila sebuah fitur ternyata **sudah tertutup** oleh pekerjaan lain, catat di "Catatan" tugas itu dengan
   bukti (commit/berkas) — jangan hapus senyap.

### Larangan tambahan

| ❌ | Kenapa |
|---|---|
| Menggabung/mengurangi langkah wizard | `STEP_META` terkunci 6 (`captureSessionHelpers.test.ts:176`) |
| Mengubah `paymentRepo.ts` **logika**, `finance*.ts`, `csv.ts` | `TASK-05` §7 |
| Menyentuh `src/template/**` (mesin laporan) | `ATURAN-AI` §2.1 |
| Memanggil `aiClient` langsung dari komponen | wajib `useAiAction` (`ATURAN-AI` §2.2) |
| Menaikkan versi skema Dexie | tidak dibutuhkan (field/union saja) |
| Menambah pustaka DnD / animasi | papan pipeline dibangun tanpa pustaka |

---

## 1. Graf dependency

```
G3-01 (Catat Sesi)  ← refactor CaptureSession   ┐
G3-02 (Keuangan)    ← refactor TagihanTab       │
G3-03 (Papan pipeline)                          ├─ butuh Gelombang 1 & 2
G3-04 (Kontrak AI)  ─────────┐                  │
G3-05 (Laporan)     ← refactor MonthlyReport ◄──┘  (panel AI butuh G3-04 → lihat Q12 di §4)
G3-06 (Murid: tab + proyek + seluruh temuan M) ← refactor StudentDetail
G3-07 (Foto murid)  ← setelah G3-06 (StudentDetail sudah dirapikan)
G3-08 (Kanvas & istilah) ← setelah G3-05 (MonthlyReport sudah dirapikan)
G3-09 (Pengaturan)  ← refactor Settings ; butuh G1-09
G3-10 (Reset total + PIN ulang) ← butuh G3-09
```

**Urutan default:** `G3-01 → G3-02 → G3-03 → G3-04 → G3-05 → G3-06 → G3-07 → G3-08 → G3-09 → G3-10`.
`G3-01…G3-03` **tidak terpengaruh Q12**; keputusan itu hanya menyentuh posisi `G3-04` vs `G3-05`.

---

## 2. Daftar tugas

### G3-01 — Catat Sesi: refactor terbatas + seluruh temuan C

| Field | Isi |
|---|---|
| ID | G3-01 |
| Judul | Wizard 6 langkah diperkuat (tetap 6) + refactor `CaptureSession.tsx` |
| Berkas disentuh | `src/screens/CaptureSession.tsx` · `src/screens/captureSession/*` · `src/components/ClockTimePicker.tsx` · `src/screens/home/EditSessionModal.tsx` · `src/screens/home/ResolveMissedSessionModal.tsx` (→ satu `ManageSessionSheet`) |
| Dependency | Gelombang 1 & 2 (khusus `G2-01` primitif, `G2-06` tap target) |
| Latar | **C-01…C-13** + `TASK-06` |
| Estimasi | L |
| Keputusan pemilik | **#2** (simpan dari langkah 5), **Q2** |
| Amandemen terkait | **A4** (Q2), A12 (refactor) |
| Catatan | `C-11` **sudah tertutup oleh `G1-06`** (pesan gagal + "Coba lagi") dan `C-05` sebagian ditutup `G1-08` (konfirmasi) — **jangan kerjakan ulang**, cukup tambahkan undo (C-13) |

#### 0. Refactor terbatas — `CaptureSession.tsx` ≤ **1.900** baris

**Langkah:**
1. Ukur: `(Get-Content src/screens/CaptureSession.tsx).Count` (2.155 baris per 2026-10-04 — **angka "2.073" yang dulu tertulis di sini sudah basi sebelum refactor dimulai**, selisih 82 baris dari pertumbuhan gelombang 1–2).
2. Lanjutkan `TASK-01` §3 Langkah 4 & ekstraksi berikutnya: pindahkan blok JSX besar ke
   `src/screens/captureSession/` (pola `ScheduleStep`, `CloseOutSheet` yang sudah ada).
3. **Jangan** memindahkan state draf (`draftForm` dan kawan-kawan — daftar lengkap di `TASK-01` §5).
4. Setiap ekstraksi: `npx tsc -b` → `npm test` (3 tes draf + `captureSessionHelpers` wajib hijau).

**DoD refactor:**
- [x] `CaptureSession.tsx` ≤ **1.900** baris. → **1.891** saat refactor tuntas (commit `925e4ff`, 2026-10-04; titik awal **2.155**, bukan 2.073) — **dan 1.901 sesudah fitur G3-01 mulai ditulis** (commit `4fcbaf4` pemilih mapel + `38eb8c9` daftar topik), jadi berkasnya kini **1 baris di atas ambang**. Yang memenuhi target adalah langkah **refactor**-nya; fitur lanjutan wajar menambah baris, dan turun lagi hanya lewat ekstraksi — bukan dengan memotong fitur
- [x] `npm test` hijau; tidak ada teks yang dilihat pengguna yang berubah (`git diff` diperiksa manual). → 698/698 tes; badan Langkah 4 dibandingkan byte-per-baris dengan HEAD = **159 vs 159 baris, 0 beda**; modal pemilih mapel **126 vs 126 baris, 10 beda — semuanya penggantian identifier** (`currentStudent`→`student`, `toggleSubject`→`onToggleSubject`, `setShowIBPicker(false)`→`onClose`), literal teks ter-render di modal itu **identik 23/23**
- [x] `STEP_META` tidak berubah (6 langkah). → `captureSessionHelpers.test.ts` 43 tes lulus; berkas `constants.ts` tidak disentuh
- [ ] **Fitur §1 di bawah BELUM dikerjakan** — putaran ini sengaja hanya refactor (urutan §10 aturan 5: refactor → verifikasi hijau → fitur)

#### 1. Fitur (semua wajib ditulis; ⏸ bila menunggu)

| # | Fitur | Temuan | Tanda |
|---|---|---|---|
| 1 | Tombol bilah aksi **"Simpan Sesi" aktif di langkah 5 dan 6**; langkah 6 tetap menawarkan Bukti | C-01 · #2 | |
| 2 | +2 tes: (a) simpan dari langkah 5 tanpa Bukti; (b) Bukti tersimpan bila ada | C-01 · #2 | |
| 3 | `aria-live="polite"` pada teks langkah + `scrollTo(top)` & fokus `<h2 tabIndex={-1}>` saat pindah langkah | C-02 | |
| 4 | `ConfirmSheet` saat keluar dengan isian + badge `!` pada stepper untuk langkah wajib belum valid | C-04 | |
| 5 | Satu penulis `responseTag`: grup "Isi cepat" jadi jalan pintas yang menyorot grup "Kualitas Respons"; keduanya `role="radiogroup"` | C-03 | |
| 6 | "Lewati" muncul di langkah 2 bila murid **tanpa mapel** (tanpa menyentuh `STEP_META`/`constants.ts`) | C-08 | |
| 7 | Undo hapus topik & hapus tindak lanjut (toast `role="status"` + "↩ Urungkan") | C-13 · C-05 | |
| 8 | Donat skor → `ProgressBar`/`RatingIndicator` (+ `role="img"` bila donat dipertahankan) | C-10 | |
| 9 | Label biaya `· ~RpNN` + `role="status"` progres AI + "Coba lagi" pada `aiError` | C-12 | ⏸ `G3-04` |
| 10 | Satu `ManageSessionSheet` menggantikan `EditSessionModal` + `ResolveMissedSessionModal` (aksi: Catat · Batal les · Tidak hadir; "Jadwalkan ulang" ke `⋯`) | `TASK-06` | |
| 11 | Rasa: satu langkah satu layar, bilah aksi selalu di tempat sama, target sentuh ≥44px | `TASK-06` | |
| 12 | `[Catat]` dari Beranda mengisi murid+tanggal+jam (B3, tanpa mengurangi langkah) | `TASK-06` | |

**DoD fitur:**
- [ ] **6 langkah tetap 6**; `captureSessionHelpers.test.ts:176` **tidak** diubah.
- [ ] Pindah langkah: layar menggulir ke atas & pembaca layar mengumumkan langkah.
- [ ] Keluar dari wizard → konfirmasi; simpan dari langkah 5 → sesi tersimpan.
- [ ] `npm run e2e` hijau (khusus `capture-closeout-failure`).
- [ ] Verifikasi manual §4.3 `docs/README.md` (12 kotak) dicentang.

---

### G3-02 — Keuangan: refactor terbatas + satu layar, cari murid, badge terlambat, filter lanjutan, K-01

| Field | Isi |
|---|---|
| ID | G3-02 |
| Judul | Rombak layar Uang (non-pipeline) + perbaikan temuan K |
| Berkas disentuh | `src/screens/payments/TagihanTab.tsx` · `useInvoiceFilters.ts` · `InvoiceRow.tsx` · `Payments.tsx` · `src/screens/payments/RingkasanTab.tsx` (blok, bukan papan) |
| Dependency | Gelombang 1 & 2 (`G2-04` masking) |
| Latar | **K-01, K-03, K-05, K-06, K-07, K-12, K-13** + `TASK-05` L1–L5, L7 |
| Estimasi | L |
| Keputusan pemilik | **#1** (K-01: peringatan + tombol eksplisit), **#10** (papan tetap ada → G3-03) |
| Amandemen terkait | A13 (refactor `TagihanTab`), A2/A9 (papan di blok 2) |
| Catatan | **K-02 sudah tertutup `G1-08`** (konfirmasi lunas). **K-04** (render PDF + progres) = **backlog** §7.2 #5 — jangan dikerjakan di sini |

#### 0. Refactor terbatas — `TagihanTab.tsx` ≤ **800** baris

**Langkah:**
1. Ukur (sekarang 978). Ekstraksi mengikuti pola `TASK-01` §3 Langkah 6 (`InvoiceRow` sudah dipisah; lanjutkan
   kartu/blok berikutnya ke `src/screens/payments/`).
2. Jangan ubah perilaku/teks; setelah tiap ekstraksi jalankan `npm test -- invoiceSessions sessionCountBilling financePipeline`.

**DoD refactor:**
- [ ] `TagihanTab.tsx` ≤ **800** baris; `npm test` hijau; `npm run e2e` hijau.

#### 1. Fitur

| # | Fitur | Temuan | Catatan |
|---|---|---|---|
| 1 | `financeRows.ts` + `financeOverview.ts` (fungsi murni) & 9+ tes | `TASK-05` L1–L3 | jangan buat query Dexie baru |
| 2 | Satu layar **3 blok tetap**: Ringkasan AI · Perlu ditagih · Bulan ini (+ `▸` Rincian/Pengeluaran/Rekap) | `TASK-05` L4 | **jangan improvisasi susunan** |
| 3 | `RekapTab` 8 kolom → 3 kolom + "lihat lengkap"; CSV tetap **byte-identik** | `TASK-05` L5 | jalankan `npm test -- csv` |
| 4 | **Pencarian murid** memakai `searchText` yang sudah ada (pasang `<input type="search" aria-label="Cari murid">`) | K-05 | ekspor ikut tersaring |
| 5 | Badge **"Terlambat N hari"** + tanggal jatuh tempo pakai `dayLabel` (bukan ISO) | K-03 | |
| 6 | **"Filter lanjutan"** yang melipat umur piutang/asal/ekspor; chip "N filter aktif · Hapus" | K-06 | maks 3 kontrol tampil di depan |
| 7 | Daftar **selalu** dirender; tiap filter punya pesan kosong sendiri ("Semua 34 tagihan sudah diterbitkan") | K-07 | hapus `showIssuedList` sebagai pengontrol tampil |
| 8 | **K-01**: sebelum menyimpan nominal baru, tampilkan asal tagihan asli + konfirmasi konsekuensi ("tagihan ini akan menjadi Manual — daftar sesi hilang dari ekspor & WA") + tombol eksplisit "Ya, ubah asal tagihan" | K-01 · **#1** | perubahan **UI saja**; `paymentRepo.ts` tidak diubah |
| 9 | Input nominal: pemisah ribuan saat mengetik + centang "Tersimpan ✓" + pesan inline saat tidak valid | K-12 | jangan ubah `formatRupiah` (terlarang) |
| 10 | Gerbang PIN jadi `<form>` (Enter mengirim) + hitung mundur lockout "Coba lagi dalam N detik" | K-13 · L-14 | |
| 11 | Navigasi: **5 pintu → 3 pintu + 1 aksi** (pintu `Hari Ini` · `Murid` · `Uang`; aksi `+ Catat sesi`) | `TASK-05` L7 | **paling akhir**, sekali saja — selector E2E patah di sini |

**DoD fitur:**
- [ ] Angka uang **sama** dengan sebelum rombak: `npm test -- finance financePipeline sessionCountBilling` hijau.
- [ ] CSV byte-identik; `npm test -- csv` hijau.
- [ ] Cari murid menemukan hasil; filter kombinasi bisa dihapus sekali klik.
- [ ] Ubah nominal **selalu** melewati konfirmasi asal tagihan (uji dengan tagihan ber-`source: "auto"`).
- [ ] `npm run e2e -- finance.spec.ts` hijau setelah perubahan nav.

---

### G3-03 — Redesign papan pipeline (tetap di dalam blok "Perlu ditagih")

| Field | Isi |
|---|---|
| ID | G3-03 |
| Judul | Papan pipeline: board + list, tap-driven, mode ringkas |
| Berkas disentuh | `src/screens/payments/FinancePipelineBoard.tsx` · `src/screens/payments/RingkasanTab.tsx` |
| Dependency | G3-02 |
| Latar | **K-08, K-10** + keputusan **#10** |
| Langkah acuan | `TASK-05` Langkah 6 (versi **Redesign** — sudah diamandemen `G1-01`) |
| Estimasi | L |
| Keputusan pemilik | **#10**, **Q3** |
| Amandemen terkait | **A2**, **A9** |
| Catatan | **Tanpa pustaka DnD** (tidak ada di repo; HTML5 drag tidak andal di sentuh). **Tidak** menambah blok ke-4. `financePipeline.ts` **tidak boleh diubah** — data yang kurang (aging, target paket) dihitung di komponen |

**Langkah (berurutan):**
1. Bentuk **board + list**: rail kartu `snap-x snap-mandatory` (kartu `w-[78%]`) + daftar baris untuk tahap fokus.
2. **Kartu hidup**: tahap, nominal (`MaskedMoney`), umur piutang (`invoiceAgeDays`/`ageBucket` dari `lib/finance.ts`),
   **satu aksi `nextAction`** + menu `⋯` untuk aksi lain.
3. **Mode ringkas**: tombol yang meringkas papan menjadi 3 baris prioritas.
4. **Filter cerdas**: chip tahap (pola `TagihanTab.tsx:270`) + "Tampilkan yang perlu tindakan".
5. **Next action** memakai `row.nextAction` yang sudah ada (7 nilai) — jangan menulis logika aksi di komponen.
6. Aksesibilitas: bila memakai grafik di kartu, perbaiki tooltip agar bisa difokus keyboard (temuan **K-09**;
   detail di `G3-08`) — atau gunakan `ActivityRing`/`ProgressBar` yang sudah aksesibel.

**DoD terverifikasi:**
- [ ] Papan **tetap ada & tetap diimpor** (perintah `ATURAN-AI` §6 mengharapkan hasil **tidak kosong**).
- [ ] Papan berada **di dalam blok "Perlu ditagih"**; layar Uang tetap **3 blok**.
- [ ] 412px: hanya 1–1,5 kartu terlihat; tidak ada scroll horizontal pada **halaman** (rail-nya yang menggulir).
- [ ] `npm test -- financePipeline` + `npm run e2e -- finance.spec.ts` hijau.
- [ ] Tidak ada dependensi baru di `package.json`.

---

### G3-04 — Kontrak AI berbiaya (TASK-07)

| Field | Isi |
|---|---|
| ID | G3-04 |
| Judul | Satu jalur `useAiAction`, satu modal biaya, pemakaian bulan ini, batas opsional |
| Berkas disentuh | `src/lib/` (hook & pembukuan) · `src/components/AiCostModal.tsx` · `src/screens/CaptureSession.tsx` · `src/screens/MonthlyReport.tsx` · `src/screens/payments/RingkasanTab.tsx` · `src/screens/Settings.tsx` (bagian AI) |
| Dependency | `G1-01` (Q1), `G2-01` |
| Latar | **S-09, C-12, R-14** + `TASK-07` |
| Langkah acuan | `TASK-07` Langkah 1–6 |
| Estimasi | L |
| Keputusan pemilik | **#9**, **Q1** (batas **default kosong**) |
| Amandemen terkait | **A1, A1b, A1c** |
| Catatan | **Q12 (di §4)** menyangkut posisi tugas ini relatif `G3-05`. Tes "(c) batas kosong → tidak memblokir" **wajib**; tes "(d) batas diisi → memblokir" **opsional** |

**Langkah (berurutan):**
1. Pembukuan: `AuditAction` + `"ai.call"`, `AuditEntry.costIdr`/`aiFeature`, `Settings.ai.monthlyBudgetIdr`
   (`TASK-07` §4) — **tanpa** menaikkan versi Dexie.
2. `useAiAction()`: estimasi → modal wajib → eksekusi → `logAiCall` (estimasi yang sama) → `busy` guard.
3. Satu `AiCostModal` (hapus `AiCostConfirmModal`); label tombol AI memuat `· ~RpNN`; format biaya dibulatkan
   ke rupiah ("≈ Rp 8", bukan "Rp 8.36" / "$0.000123").
4. Pindahkan **7 titik** pemanggilan AI ke jalur ini (grep `aiClient(` di komponen → 0).
5. Pengaturan AI: kolom batas (**default kosong**), tampilan pemakaian bulan ini, "Tes koneksi",
   "Hapus kunci", toggle AI berlaku langsung (S-09).
6. Buktikan fitur inti tetap jalan tanpa AI: `aiOptionalFallback.test.ts` (3 skenario `TASK-07` §3 Langkah 6).

**DoD terverifikasi:**
- [ ] `grep "AiCostModal|AiCostConfirmModal"` → hanya **satu** komponen.
- [ ] `grep "aiClient(" src/screens` → **0** (semua lewat `useAiAction`).
- [ ] Default tanpa batas: tanpa `monthlyBudgetIdr`, AI **tidak** pernah diblokir.
- [ ] Riwayat `ai.call` menampilkan waktu/fitur/biaya; pemakaian bulan ini akurat.
- [ ] `npm test -- aiSettings aiClient useAiAction aiOptionalFallback` hijau.

---

### G3-05 — Laporan: refactor terbatas + alur modern

| Field | Isi |
|---|---|
| ID | G3-05 |
| Judul | Laporan bulanan: alur modern (tetap "buat dulu → pratinjau") + refactor |
| Berkas disentuh | `src/screens/MonthlyReport.tsx` · `src/screens/monthlyReport/*` · `src/lib/exportReport.ts` (presentasi saja) |
| Dependency | `G3-01`, `G3-04`, `G2-04` |
| Latar | **R-01…R-13** + keputusan **#8** |
| Estimasi | L |
| Keputusan pemilik | **#8** (pertahankan alur, desain modern), **#11** (nama murid dipertahankan) |
| Amandemen terkait | A12 (refactor) |
| Catatan | Batas keras: total laporan **final dibekukan** (D6 `TASK-10`) — autosave narasi **tidak boleh** mengubah total; CSV identik; `src/template/**` terlarang; **R-13 sudah sebagian tertutup `G1-10`** (banner `role`); **R-11 tidak dikerjakan** (#11) |

#### 0. Refactor terbatas — `MonthlyReport.tsx` ≤ **1.500** baris

**Langkah:** ekstraksi mengikuti pola `TASK-01` §3 (blok pratinjau, blok tema/layout, blok narasi) ke
`src/screens/monthlyReport/`. Setelah tiap ekstraksi: `npm test -- reportLayouts reportDisplayStatus reportSessionScope reportUnlock useReportGeneration exportReport`.

**DoD refactor:**
- [ ] `MonthlyReport.tsx` ≤ **1.500** baris; 6 unit + 4 spec laporan hijau; tidak ada teks berubah.

#### 1. Fitur

| # | Fitur | Temuan | Tanda |
|---|---|---|---|
| 1 | **Sticky action bar** + indikator langkah (1 murid → 2 periode → 3 buat → 4 isi → 5 ekspor); tombol mati **wajib** menyebut alasan di tempatnya (`aria-describedby`) | R-01 | |
| 2 | **Panel hasil AI**: daftar sesi ✓/⚠ + tombol "Ulangi yang gagal (N)"; `role="progressbar"` + `aria-live`; ringkasan hasil **tidak** direset di `finally` | R-02 | ⏸ `G3-04` |
| 3 | Ekspor: status bertahap ("Menyiapkan halaman 1/7…", "Mengunduh 3 berkas…", "Sheet berbagi dibuka") + `aria-busy`; pisahkan istilah **Dibuat** vs **Dibagikan** | R-03 | |
| 4 | Tiap early-return `useReportGeneration` memberi pesan + langkah (0 sesi → "rekam sesi dulu" + tautan `/capture`; offline → arahkan ke ⚡ Generate Gratis) | R-04 | |
| 5 | Pratinjau adaptif: kontrol zoom (50% / 100% / 1 halaman), strip meta jumlah halaman, badge peringatan bila `detectOverflow` | R-05 | |
| 6 | Afordansi edit permanen pada field teks (`role="button"`, `tabIndex`, Enter/Space) + ikon ✏️/tautan "Ubah" | R-06 | |
| 7 | Kesiapan dihitung dari `reportSessions` (bukan `filteredSessions`) + chip "Menampilkan 2 dari 8 sesi" | R-09 | |
| 8 | Penanda "✨ AI" **per field** (hilang setelah diedit manual) + Undo AI di bilah tetap (tidak hilang bersama banner) | R-10 | |
| 9 | **Autosave narasi** (debounce 800ms) + status "Menyimpan… / Tersimpan 14:02" + `ConfirmSheet` bila scope berganti dengan perubahan belum tersimpan | R-A | |
| 10 | `entriesPerPage` ikut tersimpan ke laporan (jangan hanya state lokal) | R-B | |
| 11 | Modal pratinjau layout memakai `components/Modal.tsx` (Escape, focus trap, restore fokus) + pakai data murid bila ada | R-12 | |
| 12 | Banner sukses/gagal ber-`role` | R-13 | ✅ `G1-10` |

**DoD fitur:**
- [ ] 6 unit + 4 spec laporan hijau; **total final tidak berubah** (uji: finalkan → autosave narasi → total sama).
- [ ] CSV ekspor identik; `npm test -- csv exportReport` hijau.
- [ ] Pratinjau = sumber ekspor (node DOM yang sama); zoom tidak mengubah hasil ekspor.
- [ ] Manual: tulis narasi → tunggu → status "Tersimpan"; ekspor menampilkan tahapan.
- [ ] Tidak ada berkas `src/template/**` yang berubah.

---

### G3-06 — Murid: refactor terbatas + peta tab baru + proyek + seluruh temuan M

| Field | Isi |
|---|---|
| ID | G3-06 |
| Judul | Tab **Ringkas / Sesi / Progres / Proyek**, nilai rapor hidup, jenis proyek bebas, daftar & detail murid dirapikan |
| Berkas disentuh | `src/screens/StudentDetail.tsx` · `studentDetail/IaEeTracker.tsx` · `studentDetail/NilaiRapor.tsx` → `ProgresBelajar.tsx` · `studentDetail/EvidenceCard.tsx` · `studentDetail/EngagementSummary.tsx` · `studentDetail/RiwayatSesi.tsx` · `src/screens/Students.tsx` · `src/components/StudentForm.tsx` · `src/db/types.ts` · `src/db/repos/iaeeRepo.ts` · `src/lib/backupValidation.ts` |
| Dependency | `G1-01`, `G2-04`, `G3-07` **setelah** tugas ini |
| Latar | **M-01…M-13** + keputusan **#4**, **#7** |
| Estimasi | L (terbesar di gelombang ini — boleh dipecah 2 putaran: 6a tab/proyek, 6b daftar/riwayat) |
| Keputusan pemilik | **#4** (Progres = nilai + engagement), **#7** (tab proyek + jenis bebas), **Q5** |
| Amandemen terkait | **A11** (peta tab + uang di Ringkas), A13 (refactor) |
| Catatan | `StudentDetail.tsx` juga disentuh `G2-04` (masking) — kerjakan **setelah** `G2-04`. `db.ts` **tidak** disentuh (field/union baru tidak butuh versi baru) |

#### 0. Refactor terbatas — `StudentDetail.tsx` ≤ **800** baris

**Langkah:** ekstraksi per tab ke `src/screens/studentDetail/` (pola `RiwayatSesi`/`IaEeTracker` yang sudah ada).
Setelah tiap ekstraksi: `npm test -- studentColor studentLevel`.

**DoD refactor:**
- [ ] `StudentDetail.tsx` ≤ **800** baris; `npm test` hijau; tidak ada teks berubah.

#### 1. Fitur — peta tab (A11, wajib persis)

```
Tab 1  RINGKAS  — overview + KARTU "Perlu Tindakan" + blok UANG (uang murid tinggal di sini)
Tab 2  SESI     — sesi & jadwal murid (RiwayatSesi + UpcomingSchedule)
Tab 3  PROGRES  — nilai akademik (prediksi vs akhir) + engagement
Tab 4  PROYEK   — IaEeTracker + jenis bebas (IA / EE / PP / eksperimen / lainnya)
```

| # | Fitur | Temuan | Tanda |
|---|---|---|---|
| 1 | Peta tab baru di atas (rename "Nilai"→"Progres", tambah "Proyek") | **A11**, #4, #7 | |
| 2 | **Ringkas**: kartu "Perlu Tindakan" paling atas (jadwal berikutnya, PR/`needsWork` terakhir, tagihan belum lunas, follow-up) | M-01 | |
| 3 | **Ringkas**: blok **Uang** (tarif & rincian biaya) memakai `MaskedMoney`/`useMoneyVisible` | #5, A11 | |
| 4 | **Progres**: tabel **prediksi vs nilai akhir per sesi** (`gradeValue`/`isGradeLower`, `gradeDelta`) + `EngagementSummary` di bawahnya | M-02, #4 | |
| 5 | **Progres**: UI input nilai rapor (tabel `raporGrades` + `upsertRaporGrade` sudah ada, **UI belum**) — form cepat per semester; bila terlalu besar, pecah ke tugas lanjutan | M-02 | ⏸ bila dipecah |
| 6 | **Proyek**: `IaEeTracker` tampil untuk **semua** kurikulum (ganti `return null` → `EmptyState` yang menjelaskan) | M-06 | |
| 7 | **Proyek**: **jenis bebas** — perluas `IaEeType` (+`EXPERIMENT`, `OTHER`) **atau** `kindLabel?: string`; ganti ternary UI jadi satu map `{value,label,hint,color,requiresSubject}`; longgarkan gate `isIb`; samakan `IAEE_TYPES` di `lib/backupValidation.ts:38` | M-06, #7 | |
| 8 | `EvidenceCard`: pakai `scoreLabel()` bersama + penyebut benar ("dari {counted} sesi berdata") | M-03 | |
| 9 | `EngagementSummary`: sisakan **satu** blok angka; hapus pengulangan; penyebut per baris ("Siap 40% (2/5 sesi)") | M-09, M-10 | |
| 10 | `RiwayatSesi`: tombol **"Muat 20 lagi"** (atau `pageSize=20`); hilangkan nested interactive (`div role=button` yang memuat tombol Edit) | M-11, M-13 | |
| 11 | Header detail: tombol **💬 WA Ortu** (pola `wa.me` `InvoiceRow.tsx:131`), **✏️ Edit** (buka `StudentForm` di sheet), menu `⋯` (Nonaktifkan/Hapus) + `<Breadcrumb />` | M-12 | |
| 12 | Daftar murid: kontrol urut + filter ("Tampilkan yang butuh perhatian" klikabel) + label "Diurutkan: …" | M-07 | |
| 13 | Kartu murid: potong jadi 3 baris; "Aktif sejak Mar 2026" (bukan "6 bulan bersama"); pakai `CURRICULUM_META.shortLabel` | M-08 | |
| 14 | `StudentForm`: urutkan Identitas → Kontak → Tarif → **Siklus Tagihan** (bungkus dalam `<details>` bila tambah baru) | M-05 | |

**DoD terverifikasi:**
- [ ] Empat tab berlabel tepat seperti blok di atas; uang **hanya** di Ringkas.
- [ ] Tab Proyek: murid non-IB melihat penjelasan (bukan tab kosong); jenis bebas bisa dipilih & tersimpan.
- [ ] Nilai rapor akhirnya tampil (minimal prediksi vs akhir per sesi).
- [ ] Restore file backup lama **tidak** ditolak karena jenis proyek baru (hanya warning).
- [ ] `npm test -- studentColor studentLevel repos backup backupValidation` hijau.
- [ ] Manual: WA ortu terbuka; Edit profil dari halaman detail; tab diakses keyboard.

---

### G3-07 — Foto murid (pakai `Student.photo`)

| Field | Isi |
|---|---|
| ID | G3-07 |
| Judul | Unggah + tampil foto murid, dengan jaminan perawatan |
| Berkas disentuh | `src/components/StudentForm.tsx` · `src/screens/Students.tsx` · `src/screens/StudentDetail.tsx` · `src/lib/foto.ts` (pakai yang ada) |
| Dependency | G3-06 (StudentDetail sudah dirapikan) |
| Latar | **N-3** — `Student.photo` ada & **sudah ikut backup**, tapi **nol render `<img>`** |
| Estimasi | M |
| Keputusan pemilik | **#12** |
| Amandemen terkait | — |
| Catatan | **Risiko ukuran:** backup JSON memakai base64 → **+33%**; ±150 KB/avatar. `photos.shrink/prune` yang ada **hanya menyentuh sesi** — foto murid tidak pernah dikecilkan otomatis |

**Langkah (berurutan):**
1. **Unggah**: input file (`accept="image/*"`, `capture`) di `StudentForm` (pola `StudentDetail.tsx:866-869`) →
   `compressPhoto()` (`lib/foto.ts`, 640px/≤0,15MB/q0,65) → simpan `Blob` ke `Student.photo`.
2. **Tampil**: avatar di `Students.tsx` (ganti inisial bila foto ada) & header `StudentDetail` →
   `URL.createObjectURL` + **revoke** di `useEffect` cleanup (pola `StudentDetail.tsx:281-295`).
3. **Hapus foto**: tombol "Hapus foto" dengan konfirmasi (pola `G1-08`) yang menghapus `photo` & me-revoke URL.
4. **Jaminan perawatan** (tulis di komentar + tugas):
   - kompresi **wajib** ≤150 KB sebelum simpan;
   - semua `createObjectURL` **di-revoke** (tidak ada kebocoran memori);
   - foto murid **tidak** masuk laporan PDF pada tugas ini (slot `ReportData` belum ada → backlog §7.2 #2);
   - sebutkan di UI bahwa foto ikut berkas backup (privasi).
5. Ukur dampak penyimpanan: `navigator.storage.estimate()` sebelum/sesudah 1 foto; catat di §4.

**DoD terverifikasi:**
- [ ] Foto tampil di daftar & detail; hilang setelah dihapus; tidak ada warning kebocoran object URL di konsol.
- [ ] Ukuran tersimpan ≤150 KB per foto (uji dengan gambar 4 MB dari kamera).
- [ ] `npm test -- backup backupValidation repos` hijau (foto murid sudah diuji `backup.test.ts:126`).
- [ ] `npm run e2e` hijau (avatar tidak memecahkan locator kartu murid).

---

### G3-08 — Kanvas & istilah: tema, layout, glosarium, grafik

| Field | Isi |
|---|---|
| ID | G3-08 |
| Judul | Terjemahkan istilah, rapikan beban pilihan desain, perbaiki keterbacaan grafik |
| Berkas disentuh | `src/screens/monthlyReport/CustomThemeBuilder.tsx` · `src/screens/MonthlyReport.tsx` (bagian panel desain) · `src/components/charts/BarChart.tsx` · `LineChart.tsx` · `DonutChart.tsx` · `src/components/Tabs.tsx` (label) |
| Dependency | G3-05 (MonthlyReport sudah dirapikan) |
| Latar | **L-10, L-11, L-12, R-07, R-08, K-09** |
| Estimasi | M |
| Keputusan pemilik | — |
| Amandemen terkait | — |
| Catatan | **Jangan** menghapus layout/tema (30+ dipertahankan). 26 layout & 34 tema = angka sebenarnya (R-08) |

**Langkah (berurutan):**
1. Terjemahkan `CustomThemeBuilder`: "Custom Theme Builder"→"Perancang Tema", "Header Text"→"Teks Judul",
   "Header/Label/Photo Style"→"Gaya Judul/Label/Foto", "Decoration"→"Hiasan", "Display/Body Font"→"Font Judul/Isi";
   opsi "None/Round/Circle/Polaroid" → label Indonesia + swatch.
2. Pisahkan **Tema** dan **Layout** di judul kartu (dua chip berbeda dengan ikon berbeda).
3. Beban pilihan: kelompokkan layout (mis. "Ringkas" vs "Narasi panjang" via `supportsLongNarrative`);
   ganti 26 tombol `👁` 16px dengan **satu** tombol "Pratinjau" untuk layout terpilih; grid tema 4 kolom (≥44px).
4. Grafik: tick ≥11px, padding kiri mengikuti label terpanjang, format ringkas ("150rb"/"1,2jt") dengan nilai
   utuh di tooltip, `role="img"` + `aria-label` berisi nilai, **tooltip dapat difokus keyboard** (`tabIndex`+`onFocus`),
   aktifkan legenda Donut (atau sediakan daftar label setara).
5. Glosarium (L-10): satu istilah per konsep — **Tagihan** (objek), **Invoice** (dokumen saja),
   **Belum dibayar** (ganti "piutang" di UI), **Kata Sandi Enkripsi** (hapus "passphrase"/"kunci"), "Fokus rata-rata".
6. Label terpotong (L-11): tab "Sesi & Jadwal" → "Sesi" (atau izinkan 2 baris); `title` untuk nama sekolah/mapel.

**DoD terverifikasi:**
- [ ] Tidak ada istilah Inggris tersisa di UI panel desain (grep manual).
- [ ] Tooltip grafik bisa difokus keyboard; label sumbu terbaca di 390px (screenshot).
- [ ] Jumlah layout & tema **tidak berkurang** (26 & 34).
- [ ] `npm test -- reportLayouts` hijau.

---

### G3-09 — Pengaturan: refactor terbatas + tata kelola & PWA

| Field | Isi |
|---|---|
| ID | G3-09 |
| Judul | Bilah simpan sticky, ringkasan status, urutan section, restore berprogres, dialog internal |
| Berkas disentuh | `src/screens/Settings.tsx` · `src/components/PwaPrompts.tsx` · `src/components/PinConfirmModal.tsx` · `src/lib/pwaInstall.ts` |
| Dependency | `G1-09`, `G3-04` (bagian AI) |
| Latar | **S-02, S-04, S-05, S-06, S-11, S-12, S-13** (+ S-08 sebagian) |
| Estimasi | M |
| Keputusan pemilik | **#9** (bagian AI), **Q8** ✅ (opsi A: **semua** dialog internal), **Q4** (light-only) |
| Amandemen terkait | A13 (refactor) |
| Catatan | `G1-07` menutup loading/error; `G1-08` menambah konfirmasi hapus cache. Alur PIN di luar lingkup `TASK-05`/`TASK-08` — jangan ubah cara PIN disimpan (`crypto.ts` terlarang) |

#### 0. Refactor terbatas — `Settings.tsx` ≤ **700** baris

**Langkah:** ekstraksi per `Section` ke `src/screens/settings/` (satu berkas per section besar: profil, PIN,
rekening, AI, backup, riwayat, PWA, zona bahaya). Setelah tiap ekstraksi: `npm test -- settingsRepo settingsDirtyPatch settingsSaveButton`.

**DoD refactor:**
- [ ] `Settings.tsx` ≤ **700** baris; 3 tes pengaturan hijau; tidak ada teks berubah.

#### 1. Fitur

| # | Fitur | Temuan |
|---|---|---|
| 1 | **Bilah simpan sticky** (pola `--task-bar-h`) + status "Belum disimpan / Tersimpan 14:02" di bilah itu | S-02 |
| 2 | Guard: `beforeunload` saat `dirty` + listener `leskolui:before-pwa-update` yang mem-flush `handleSave()` | S-02 |
| 3 | **Ringkasan status** 3 baris di bawah `<h1>` ("Backup terakhir: 12 hari lalu ⚠️ · AI: Aktif · Penyimpanan: 34%") + pintasan | S-04 |
| 4 | Urutan section baru: **Backup & Restore → AI → Profil → PIN → Rekening Bank → Aplikasi (PWA) → Riwayat Aktivitas → Hapus Semua Data** (paling bawah, pemisah "Zona berbahaya") | S-04 |
| 5 | Progres restore dipakai **semua** alur (Drive & File); satu state `busy` untuk 4 tombol; tampilkan nama+ukuran berkas terpilih | S-05 |
| 6 | Tombol **"📋 Salin"** kata sandi enkripsi + opsi "📄 Unduh kunci.txt"; chip "memakai kata sandi tersimpan (auto backup)"; peringatan risiko **sebelum** toggle auto aktif | S-06 |
| 7 | Dialog internal menggantikan `confirm()`/`prompt()` (kata konfirmasi diketik di `Modal`), ringkasan target restore (jumlah murid/sesi + tanggal), jargon validasi diringkas `<details>` | S-11 · Q8 |
| 8 | `StorageUsage` gagal → pesan (sudah `G1-07`); render sekali saja (tidak dua tempat) | S-12 |
| 9 | A11y: status "Tersimpan ✓" jadi baris `role="status"` (bukan tombol disabled); label "Model" ber-`aria-labelledby`; `aria-controls` tidak menggantung; tap target kecil; lockout dengan hitung mundur `role="alert"` | S-13 |
| 10 | PWA: pintu pasang manual (iOS: "Bagikan → Tambah ke Layar Utama"), status "Siap offline / Penyimpanan persisten", tombol "Catatan perubahan v{versi}" | S-08 |
| 11 | Badge status per section (Backup "12 hari lalu", PWA "Offline siap", Profil "Lengkap/Belum diisi") | S-04, S-15 |

**DoD terverifikasi:**
- [ ] Edit di section atas lalu pindah tab → **tidak** hilang tanpa peringatan.
- [ ] Restore Drive menampilkan tahapan + tombol disabled selama proses.
- [ ] `grep -n "confirm(\|prompt(" src/screens/Settings.tsx` → 0.
- [ ] `npm test -- settingsRepo settingsDirtyPatch settingsSaveButton settingsDirtyPatch pwaInstall modalAccessibility` hijau.
- [ ] Manual: kata sandi bisa disalin sekali klik; badge "Belum disimpan" terlihat tanpa menggulir.

---

### G3-10 — Reset total + jalur set PIN ulang

| Field | Isi |
|---|---|
| ID | G3-10 |
| Judul | "Hapus Semua Data" benar-benar total, dengan konfirmasi 2 lapis + PIN, lalu tawarkan PIN baru |
| Berkas disentuh | `src/screens/Settings.tsx` (bagian zona berbahaya + `doResetAll`) |
| Dependency | G3-09 |
| Latar | **S-01(b)** + keputusan **#3** |
| Estimasi | M |
| Keputusan pemilik | **#3** (opsi **B**: hapus **total**, konfirmasi 2 lapis + PIN) |
| Amandemen terkait | — |
| Catatan | **Konsekuensi yang harus disampaikan di UI:** setelah reset, **PIN hilang** → jalur "Lupa PIN?" ikut hilang & aplikasi terbuka **tanpa proteksi** sampai PIN baru dipasang. localStorage (`leskolui_drive_pass`, `_relay_secret`) **tidak** dibersihkan — sebutkan bila relevan |

**Langkah (berurutan):**
1. `doResetAll` — pastikan daftar tabel yang dibersihkan **eksplisit** dan terdokumentasi di UI: murid, sesi,
   laporan, tagihan, follow-up, nilai rapor, pengeluaran, proyek IA/EE, catatan belajar, **draf catat sesi**,
   **pengaturan (PIN, kunci AI, logo, rekening, profil)**, **catatan audit**.
2. Konfirmasi **2 lapis + PIN** (semuanya dialog internal dari `G3-09`):
   (1) ringkasan apa yang hilang + tombol "Lanjutkan"; (2) ketik `HAPUS DATA` untuk mengaktifkan tombol;
   (3) PIN Keuangan. **Tanpa** `confirm()`/`prompt()` native.
3. Setelah reset: muat ulang aplikasi lalu tampilkan **ajakan memasang PIN baru** (bukan layar kosong tanpa
   penjelasan), plus tautan ke panduan backup.
4. Log audit `data.reset` tetap ditulis (seperti sekarang) — pastikan tidak ikut terhapus sebelum tercatat.
5. Uji di browser dengan data dev (`seedDummy`) — jangan di data nyata.

**DoD terverifikasi:**
- [ ] Setelah reset + reload: aplikasi terbuka, data kosong, `settings` kembali default, dan muncul ajakan PIN baru.
- [ ] Teks di UI menyebut **semua** yang hilang (termasuk PIN & kunci AI) — tidak ada janji "tetap aman".
- [ ] Tidak ada `confirm()`/`prompt()` native di jalur ini.
- [ ] `npm test` hijau (khusus `settingsRepo`, `crypto`, `repos`).
- [ ] Manual: batalkan di lapisan 1/2/3 → tidak ada data yang terhapus.

---

## 3. Checkpoint akhir Gelombang 3

**Otomatis:** `npx tsc -b` → `npx eslint src` → `npm test` → `npm run build` → `npm run e2e` →
`npm run e2e:uiux` → `npm test -- csv` (byte-identik) → perintah K2 (`grep AiCostModal|AiCostConfirmModal`
= 1 komponen) → perintah K3 (`arsitektur/11` §6 = 0).

**Manual:**
1. **Wizard**: 6 langkah tetap 6; simpan dari langkah 5 berhasil; pindah langkah diumumkan & menggulir ke atas; keluar → konfirmasi.
2. **Keuangan**: ubah nominal → konfirmasi asal tagihan muncul; cari murid; badge "Terlambat";
   filter lanjutan; tandai lunas → konfirmasi.
3. **Papan pipeline**: tetap ada di blok "Perlu ditagih"; rail bisa digeser; satu aksi utama per kartu.
4. **AI**: modal biaya tampil tiap panggilan; label `· ~RpNN`; pemakaian bulan ini; tanpa batas = tidak diblokir.
5. **Laporan**: narasi → "Tersimpan"; ekspor bertahap; total final **tidak** berubah; pratinjau bisa di-zoom.
6. **Murid**: empat tab (Ringkas/Sesi/Progres/Proyek); uang hanya di Ringkas; jenis proyek bebas tersimpan;
   foto murid tampil & bisa dihapus.
7. **Pengaturan**: sticky save + guard; restore berprogres; kata sandi bisa disalin; reset total minta 2 lapis + PIN.

---

## 4. Riwayat, Q12, dan catatan penyimpangan

### Q12 ✅ DIJAWAB 2026-10-01 (opsi A) — posisi `TASK-07` (`G3-04`) vs laporan (`G3-05`)

`ATURAN-AI` §4 semula mengunci urutan `04 → 08 → 09 → 06 → 05 → 07` ("`TASK-07` paling akhir"). Panel hasil AI di
**G3-05** **butuh** `useAiAction` dari **G3-04**, sehingga urutan itu tidak bisa dipakai apa adanya.

- **Keputusan pemilik (Q12 = A):** **`G3-04` dikerjakan sebelum `G3-05`.** Dikunci sebagai **A14** di
  [`ATURAN-AI.md`](../kerja/ATURAN-AI.md) §4.
- **Urutan akhir gelombang 3 (berlaku):** `G3-01 → G3-02 → G3-03 → G3-04 → G3-05 → G3-06 → G3-07 → G3-08 → G3-09 → G3-10`.
- **Konsekuensi yang diterima:** `TASK-07` menyentuh 7 titik pemanggilan AI **sebelum** laporan dirombak —
  titik-titik itu harus sudah stabil saat `G3-05` dimulai.
- **Tidak ada lagi ⏸ yang menunggu Q12**; item AI di `G3-05` dikerjakan langsung setelah `G3-04` selesai.

### Catatan cakupan (penting)

11 temuan modul **M** (M-01, M-03, M-05, M-07…M-13) dan **B-02** tidak punya tugas eksplisit di
`docs/07` §5. Di dokumen ini mereka **dimasukkan** ke `G3-06` (seluruh temuan M) dan `G2-08` (B-02) —
**tanpa menambah tugas baru**, sehingga tidak perlu persetujuan berkas baru. Bila pemilik ingin dipisah
menjadi tugas sendiri, angkat sebagai permintaan baru (bukan improvisasi).

| Tanggal | Tugas | Yang terjadi | Keputusan |
|---|---|---|---|
| | | | |
