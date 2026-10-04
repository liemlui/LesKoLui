# 07 — Laporan Validasi & Rencana Eksekusi — Audit UI/UX v1.79.3

> **Sekilas** · Jenis: **validasi + rencana (pekerjaan terbuka)** · Diperbarui: 2026-10-01 · Status: **aktif**
> **Untuk siapa:** pemilik (Ko Lui) dan agen AI yang akan mengeksekusi perbaikan.
> **Baca kalau:** sebelum mengerjakan apa pun dari [`06-AUDIT-UIUX-2026-10-01.md`](06-AUDIT-UIUX-2026-10-01.md).
> **Isi:** §1 ringkasan eksekutif · §2 hasil verifikasi 92 temuan · §3 validasi 13 keputusan pemilik · §4 dampak & risiko · §5 rencana eksekusi 3 gelombang · §6 checkpoint · §7 ditunda/dihapus + backlog · §8 pertanyaan balik.
> **Dasar:** `les-ko-lui` v1.79.3 (HEAD `8abbe29`), kontrak [`kerja/ATURAN-AI.md`](../kerja/ATURAN-AI.md) + [`arsitektur/11`](../arsitektur/11-uiux-ai-cost-dan-privasi.md), TASK-03…TASK-10.

**Satu kalimat:** rencana perbaikan **bisa dieksekusi**; 5 keputusan pemilik bertabrakan dengan keputusan kontrak yang sudah dikunci `final`, dan **4 di antaranya sudah diputuskan 2026-10-01** (§1.2), sehingga prasyarat Gelombang 1 tinggal **satu** (Q5, peta tab murid) ditambah 6 amandemen teknis yang tidak butuh keputusan pemilik.

---

## 1. Ringkasan eksekutif

### 1.1 Hasil verifikasi

| Hasil | Jumlah | Arti |
|---|---:|---|
| ✅ Temuan tetap utuh | **73** | temuan valid, lokasi terverifikasi (beberapa bergeser beberapa baris) |
| ⚠️ Berubah / sebagian | **18** | premis inti benar, rinciannya harus dikoreksi sebelum dikerjakan |
| ❌ Klaim audit tidak terbukti | **1** | L-02 — lihat §1.3 |
| Koreksi fakta pada dokumen 06 | **8** | nomor baris/berkas salah, angka salah, atau sudah sebagian ditutup |

Tidak ada temuan yang hilang total. Modul dengan tingkat akurasi tertinggi: **Keuangan (13/13 valid)** dan **Catat Sesi (11/13 utuh)**. Modul dengan koreksi terbanyak: **Laporan (4 temuan ⚠️)** dan **Lintas-sistem (5 ⚠️ + 1 ❌)**.

### 1.2 Blokir kontrak & resolusinya (dikunci 2026-10-01)

| # | Keputusan pemilik | Bertabrakan dengan | Sifat | **Resolusi (dijawab pemilik)** |
|---|---|---|---|---|
| 1 | **#9** AI: cukup estimasi, **tanpa batas penolak** | **B4** (Rp 25.000/bln, tombol AI nonaktif bila lewat) — `ATURAN-AI.md:30`, `arsitektur/11:60-61,105`, `TASK-07:45,171-174,181` | 🔴 keras | ✅ **Mekanisme batas tetap ada, default kosong = tanpa batas.** Amandemen: ubah *default* B4 di `ATURAN-AI:30` + `arsitektur/11:105`; `TASK-07` L5 tetap membangun kolom & tampilan pemakaian, tetapi tes "(c) anggaran terlampaui memblokir" menjadi tes opsional (hanya bila batas diisi) |
| 2 | **#10** papan pipeline **dipertahankan + redesign** | `TASK-05:42,312-333` **"Bubarkan `FinancePipelineBoard`"** + DoD "tidak ada impor" + penghitung di `ATURAN-AI:155-156` | 🔴 keras | ✅ **Papan hidup di dalam blok "Perlu ditagih"** (tidak menambah blok ke-4). Amandemen: `TASK-05` L6 berubah dari *Bubarkan* → *Redesign*; DoD & perintah penghitung diganti (impor **tetap ada**) |
| 3 | **#13** light-only permanen | `TASK-04:45,56,259-291` (L6 **menghidupkan** dark mode + nilai token dark sudah ditulis) | 🔴 keras | ✅ **Cabut L6**, catat light-only sebagai keputusan permanen; hapus project `mobile-dark` di `playwright.config.ts:17`; selaraskan `README:85` + playbook |
| 4 | **#2** langkah 5 = "Simpan Sesi" (Bukti opsional) | `ATURAN-AI:59` + `TASK-06:20-21,44,236,260` (6 langkah dikunci) + tes `captureSessionHelpers.test.ts:176` | 🟠 sedang | ✅ **Bisa simpan di langkah 5, jumlah langkah tetap 6.** `STEP_META` tidak berubah (tes lama aman); langkah 6 tetap menawarkan Bukti; amandemen catatan `TASK-06` + 2 tes baru (simpan dari langkah 5 tanpa bukti; bukti opsional tetap tersimpan bila ada) |
| 5 | **#7** tab proyek tetap tampil + jenis proyek bebas | `TASK-03:70` mengunci peta tab murid = **Ringkas / Sesi / Nilai / Uang** (tidak ada tab proyek) | 🟠 sedang | ✅ **A + varian (Q5):** peta tab jadi **Ringkas / Sesi / Progres / Proyek**; **Uang = blok di dalam tab Ringkas** (bukan di Progres). Amandemen **A11** |

**Amandemen teknis** (dikerjakan di G1-01): **A6 DICABUT** (Q7: fokus Android, tidak ada aturan input 16 px) · A7 kontradiksi `TASK-04:284-285` (kontras via `engagement.ts` yang terlarang — sudah diperbaiki) · A8 penghitung kelas warna dibuat rekursif + baseline **904** · A9 letak papan pipeline di dalam blok "Perlu ditagih" · A10 tugas baru untuk K-01 (memperbarui perilaku `TASK-10` yang sudah selesai) · **A11** peta tab Murid + Uang di dalam Ringkas (Q5) · **A12** refactor terbatas `CaptureSession.tsx` sebelum G3-01 & `MonthlyReport.tsx` sebelum G3-05 (Q9).

### 1.3 Klaim audit saya yang tidak terbukti (transparansi)

| Klaim di dokumen 06 | Kenyataan terverifikasi | Pelajaran |
|---|---|---|
| **L-02** "banner fixed **tanpa** kompensasi tinggi & **tanpa** tombol tutup" | **Salah untuk banner atas**: `App.tsx:158-166` mengukur `[data-top-banner]` → `--top-banner-h`, `.app-shell{padding-top:var(--top-banner-h)}` (`index.css:71`), dan tiap banner punya tombol tutup (`App.tsx:190,206`). **Sisa yang benar**: nag mingguan (`App.tsx:226-260`) tidak dikompensasi di `padding-bottom`, jadi ~66 px konten terbawah tertutup selama nag tampil. | Bukti "banner menutupi konten" sebagian adalah **artefak screenshot `fullPage`** (elemen `fixed` dilukis di posisi viewport-nya, sehingga tampak di tengah dokumen). Ke depan: verifikasi overlap dengan ukur `getBoundingClientRect`, bukan screenshot penuh. |
| **L-01h** "label skor di atas putih 3,19–3,77:1" | **Salah untuk `scoreLabel()`** — ia mengembalikan pasangan `{color,bg}` dan selalu dipakai berpasangan (`RiwayatSesi.tsx:205-207`, `EngagementSummary.tsx:180`). Sumber nyata label gagal kontras di laporan: peta hex keras di `src/template/layouts/helpers.tsx:425-429` (`"Sangat Baik":"#059669"`, `"Cukup":"#D97706"`). | Pengukuran runtime saya benar (3,19:1), **atribusi sumbernya** yang salah. |

### 1.4 Temuan baru yang mengubah rencana

| # | Temuan | Dampak ke rencana |
|---|---|---|
| **N-1** | **Penghitung kelas warna di kontrak salah.** `Select-String -Path "src\**\*.tsx"` hanya menjangkau **38 berkas** (kedalaman 1) → 470. Rekursif sebenarnya: **904 kemunculan di 87 berkas** (`git grep` = 902). | DoD TASK-04 "471 → ≤190" **tidak bisa diverifikasi** dengan angka itu. Wajib ganti perintah + tetapkan baseline **904 → ≤190**. Usaha TASK-04 lebih besar dari perkiraan. |
| **N-2** | Tabel `raporGrades` + repo `upsertRaporGrade/listRaporGrades` **ada tapi tidak dipakai UI mana pun** (`studentRepo.ts:188-209`; hanya seed + ringkasan hapus). | **M-02** (tab Progres = nilai akademik + engagement, keputusan #4) bisa dikerjakan **tanpa perubahan skema/migrasi** — nilainya sudah tersimpan. |
| **N-3** | `Student.photo` (`types.ts:214`) **sudah ikut backup** (`backup.test.ts:126`), tapi **nol render `<img>`**; yang ada hanya `photo: initial?.photo` (`StudentForm.tsx:152`). Pemakaian foto di `StudentDetail.tsx:206,286` adalah foto **sesi**, bukan murid. | Keputusan #12 = pekerjaan UI baru (input + kompresi + render + revoke + perawatan), bukan "mengaktifkan yang ada". Risiko backup membengkak +33% (base64). |
| **N-4** | **Tidak ada library DnD** dan tidak ada satu pun `draggable/onDragStart/onDrop` di `src`; target uji Pixel 7 412 px. HTML5 drag tidak andal di sentuh. | Redesign pipeline (#10) harus **tap-driven** (`next action` + menu "Pindahkan ke…"); drag opsional via Pointer Events. Board 5 kolom **tidak realistis** di 412 px → rail `snap-x` + satu kolom fokus. |
| **N-5** | `buildStudentPipeline` hanya melihat payment ber-anchor `p.month === month` (`financePipeline.ts`); `piutangRows` (`RingkasanTab.tsx:253-256`) **tidak dirender** (hanya payload AI). Tidak ada `avgDaysToPay` (hanya `avgDaysToPayProxy` → prompt AI, `aiClient.ts:623`). | Kartu pipeline tidak otomatis mencakup piutang lintas bulan; "3 murid terlama" harus dihitung terpisah dengan `invoiceAgeDays`/`ageBucket` (`finance.ts:85-99`). |
| **N-6** | Infrastruktur AI berbiaya **belum ada sama sekali**: `useAiAction`, `MaskedMoney`, `useMoneyVisible`, `monthlyBudgetIdr`, `ai.call`, `costIdr` = **0 kemunculan**. `src/components/ui/` belum ada. | TASK-04/07/08 semuanya belum mulai. Semua usulan yang menyentuh uang/AI **bergantung** pada TASK-07/08. |
| **N-7** | `TASK-04:284-285` menyuruh memperbaiki kontras dengan mengubah **`src/lib/engagement.ts`** — berkas itu **terlarang** (`ATURAN-AI:48`). | Kontradiksi internal kontrak; perlu amandemen (warna vs rumus). |
| **N-8** | 55 berkas tes (bukan 50) & `paymentRepo` **tidak punya tes** (yang ada `repos.test.ts`); CI = `lint → test → build` + job `e2e` (`npm run e2e`); `scripts/check-md-links.mjs` **tidak dirujuk** CI. | Rencana yang menyebut "test paymentRepo" harus dikoreksi; spec metrik UI tidak boleh menambah 3 menit ke gate e2e tanpa keputusan. |

---

## 2. Hasil verifikasi temuan (status per ID)

Legenda: ✅ tetap utuh · ⚠️ berubah/sebagian · ❌ klaim tidak terbukti. Nomor baris = v1.79.3, hasil baca langsung.

> **Rekonsiliasi angka 18 vs 27:** ringkasan **18** di atas menghitung **perubahan premis inti**. Di
> [`06-…md`](06-AUDIT-UIUX-2026-10-01.md) §9, **27** baris ditandai ⚠️ karena 9 di antaranya premisnya tetap
> benar tetapi **rinciannya bergeser** (ukuran, nomor baris, atau sebagian sudah diperbaiki): L-01 (sub-butir),
> M-04, M-07, K-04, K-07, K-11, K-12, K-13, S-05. Keduanya bukan angka yang bertentangan.

### 2.1 Lintas-sistem (L)

| ID | Status | Lokasi baru | Catatan |
|---|---|---|---|
| L-01 | ✅ | tersebar | 8 pasangan terburuk terkonfirmasi, lihat L-01a–h |
| L-01a | ✅ | `App.tsx:244` | `text-xs text-amber-500` tombol "Besok", induk `bg-amber-50` (:227) → **2,07:1** |
| L-01b | ⚠️ | `App.tsx:256`; `Settings.tsx:113` | putih di `bg-amber-500` → **2,13:1**; lokasi Settings bergeser 105→113 |
| L-01c | ✅ | `FinancePeriodPicker.tsx:81` | `disabled:text-slate-400` di `disabled:bg-slate-100` → **2,31:1** (hanya saat disabled) |
| L-01d | ⚠️ | `StudentForm.tsx:364`; `RiwayatSesi.tsx:190`; `EvidenceCard.tsx:15`; `StudentDetail.tsx:846`; `EngagementSummary.tsx:198` | `text-orange-500` di atas putih → **2,89:1**. Audit salah menaruh sumber "tarif default" di StudentDetail |
| L-01e | ✅ | `AttentionInbox.tsx:87` (induk :81) | `orange-600` di `orange-50` → **3,35:1** |
| L-01f | ✅ | `MonthView.tsx:53,79` | `text-red-500` header "Min" & angka Minggu → **3,76:1** |
| L-01g | ⚠️ | `Students.tsx:353`; `RiwayatSesi.tsx:200`; `IaEeTracker.tsx:158-159` | "Hapus" bergeser 344→353; "terlambat" ada di IaEeTracker |
| L-01h | ❌ | `engagement.ts:224-228` | `scoreLabel()` **aman** (dipakai berpasangan). Gagal kontras nyata ada di `src/template/layouts/helpers.tsx:425-429`. Gap uji: `engagementContrast.test.ts` hanya menguji pasangan scoreLabel, **tidak** latar putih |
| L-02 | ❌ + sisa | `App.tsx:158-166,190,206`; `index.css:71` | Banner atas: kompensasi & tombol tutup **sudah ada**. Sisa nyata: nag mingguan (`App.tsx:226-260`) tak dikompensasi di `padding-bottom` |
| L-03 | ⚠️ | `WeekView.tsx:74`; `RekapTab.tsx:104,106`; `TagihanTab.tsx:464`; `Settings.tsx:955,1094`; `Toggle.tsx:22` | Semua <44 px (`h-9/w-9`, `py-0.5`, `py-1.5`, `h-[26px]`) |
| L-04 | ✅ | `index.css:113` | `.input{font-size:0.875rem}`; tidak ada aturan 16 px di mana pun |
| L-05 | ⚠️ | `Settings.tsx:1138,1185`; `MonthlyReport.tsx:1533,1762,1776,1828,1837`; `Home.tsx:143,147`; `CaptureSession.tsx:667,712` | Emoji ikon fungsional masih ada (lokasi bergeser) |
| L-06 | ✅ | `components/Tabs.tsx:26-44` | `role=tablist/tab/aria-selected` ada; **`aria-controls` 0**, **`role=tabpanel` 0** di seluruh `src` |
| L-07 | ✅ | `Home.tsx:115,120,137`; `Payments.tsx:165`; `MonthlyReport.tsx:1144,2199` | Hierarki heading tetap lemah/timpang |
| L-08 | ✅ | `Home.tsx:99`; `Settings.tsx:367-369,442,465,553` | `toast.info` untuk sukses **dan** gagal; `success/error` tersedia di `ToastProvider.tsx:8-10` tapi tak dipakai |
| L-09 | ⚠️ | `Settings.tsx:331`; `home/TodayHero.tsx:64-65` | Settings tetap teks polos tanpa jalan keluar; TodayHero:65 bukan kasus loading (data `[]`) → temuan inti pindah ke B-01 |
| L-10 | ✅ | `TagihanTab.tsx:40-60`; `RekapTab.tsx:36,229`; `FinancePipelineBoard.tsx:40,58,125`; `Settings.tsx:142,582,944,947,979,1099`; `CustomThemeBuilder.tsx:68-135` | Tagihan/invoice/piutang + passphrase/kunci + istilah Inggris + "Fokus rata²" |
| L-11 | ⚠️ | `Tabs.tsx:36,48`; `Students.tsx:278,317`; `MonthView.tsx:89,93`; `StudentDetail.tsx:490` | `truncate`+`title` ditambah; karena `whitespace-nowrap overflow-x-auto`, `truncate` praktis tak aktif (label bergeser horizontal) |
| L-12 | ✅ | `BarChart.tsx:141,201`; `LineChart.tsx:115,147,205`; `RiwayatSesi.tsx:75,88`; `TagihanTab.tsx:902,913,916,935` | Teks 10–11 px masih dipakai untuk isi |
| L-13 | ✅ | `index.css:48-51`; `playwright.config.ts:17` | Dark mati; project `mobile-dark` masih aktif → tak bermakna |
| L-14 | ⚠️ | `PinConfirmModal.tsx:23-27,57`; `Settings.tsx:391-392,411-412`; `Payments.tsx:123-141` | Lockout **ada** (eksponensial 1→60 s) tapi tanpa hitung mundur. Enter **jalan** di PinConfirmModal (:57); yang tanpa Enter = gerbang PIN `Payments.tsx` |

### 2.2 Beranda/Jadwal (B)

| ID | Status | Lokasi baru | Catatan |
|---|---|---|---|
| B-01 | ✅ | `home/TodayHero.tsx:64-65`; `Home.tsx:160` | Tanpa prop `loading`; `Skeleton` tersedia tapi tak dipakai Home → "Tidak ada sesi hari ini" palsu |
| B-02 | ⚠️ | `home/AddScheduleModal.tsx:118-126,127-129`; `home/EditSessionModal.tsx:136` | Premis benar (peringatan bentrok murni informatif). **Koreksi:** AddScheduleModal hanya 132 baris; label "Batalkan jadwal — pilih scope:" ada di EditSessionModal |
| B-03 | ✅ | `home/MonthView.tsx:29-38,70-75,85-99` | Tanpa legenda (grep "legenda" nihil); tombol sel tanpa `aria-label` jumlah sesi |
| B-04 | ✅ | `Home.tsx:141-144`; `home/TodayHero.tsx:41-44`; `home/DayView.tsx:66`; `home/DayDetail.tsx:22` | "💸 Pengeluaran" tetap aksi paling menonjol; "+ Jadwal" tetap 3× |
| B-05 | ⚠️ | `Home.tsx:135-160`; `home/OperationalSnapshot.tsx:25-36,41-89` | Kepadatan & label "hari ini" 3× tetap. Sparkline disembunyikan hanya bila <2 titik, sedangkan `weeklyTrend` selalu 4 angka → tetap garis rata di dasar |
| B-06 | ✅ | `home/SessionPill.tsx:36,60-63` | `aria-label` sudah ada; ikon pensil vs makna edit tetap tertukar |
| B-07 | ⚠️ | `home/DayView.tsx:27-38,76-78,93-99` | Sudah ada rentang dinamis + garis "sekarang", tetapi rentang dasar tetap 07:00–22:00 → 960 px. **TASK-09 (mode rapat 27 px/jam) hampir menutup ini** |
| B-08 | ✅ | `home/WeekView.tsx:49,51-57`; `home/DayDetail.tsx:17-19` | Tanpa `ring-2 ring-inset`; header DayDetail polos |
| B-09 | ✅ | `home/MonthView.tsx:57,72,85,90,93` | `min-h-[64px]`, chip 10 px, `slice(0,3)`, tanpa `title` |
| B-10 | ✅ | `home/AttentionInbox.tsx:33,51-62` | Tidak ada `localStorage` di berkas → selalu terbuka |
| B-11 | ✅ | `home/AttentionInbox.tsx:138-143` | "✓" tanpa teks/aria-label, ≈24 px |
| B-12 | ⚠️ | `home/AttentionInbox.tsx:81,87`; `Home.tsx:185-200` | Hanya **:87** gagal (3,35:1); :94 & :100 lolos. Filter sudah punya `aria-label` tapi tanpa teks cakupan |
| B-13 | ⚠️ | `components/EmptyState.tsx:23-30,39-41`; `TodayHero.tsx:65`; `AttentionInbox.tsx:73,122`; `home/DayDetail.tsx:26` | **Koreksi:** EmptyState tidak lagi hardcode 🎉 (prop `icon`). Copy coupling `DayDetail.tsx:26` masih ada |

### 2.3 Murid & Detail (M)

| ID | Status | Lokasi baru | Catatan |
|---|---|---|---|
| M-01 | ✅ | `StudentDetail.tsx:499-654` | Tab Ringkasan = aksi cepat → Info Murid statis → Catatan; tanpa jadwal berikutnya/PR/tagihan |
| M-02 | ✅ | `NilaiRapor.tsx:17-36` (37 baris) | Hanya `<EngagementSummary/>`; `raporGrades` + repo-nya **mati di UI** → bisa dikerjakan tanpa skema |
| M-03 | ✅ | `EvidenceCard.tsx:13,15,24-32` | Ambang 3-tingkat vs `scoreLabel()` 5-tingkat; penyebut `engSessions.length` salah (harus `counted`) |
| M-04 | ⚠️ | `Students.tsx:332-357` | Ukuran sebenarnya **≈24 px** tinggi (bukan 27×22); aksi destruktif tetap bersebelahan (gap 8 px) |
| M-05 | ✅ | `StudentForm.tsx:184-527` (fieldset 384-509) | 11 bagian, ~2,5 layar sebelum tombol Simpan |
| M-06 | ✅ | `IaEeTracker.tsx:37-38`; `StudentDetail.tsx:492,694-698` | `if (!isIb) return null` → tab kosong tanpa penjelasan |
| M-07 | ⚠️ | `Students.tsx:144-156,401-408,436-451` | **Koreksi:** daftar aktif sudah diurut otomatis (jadwal terdekat); yang tak ada = **kontrol** urut/filter + label + banner klikabel |
| M-08 | ✅ | `Students.tsx:258-358` | ±10 bagian; "N bulan bersama" dari `floor(days/30)` tanpa tanggal mulai |
| M-09 | ✅ | `EngagementSummary.tsx:84-96,143-154,213-232` | Angka sama 3–4×; penyebut campur `counted` vs `recentEng.length` |
| M-10 | ⚠️ | `EngagementSummary.tsx:119-138,195-198` | Penyebut dipindah ke **kaki** bagian, bukan per baris; per-mapel tetap tanpa penyebut |
| M-11 | ✅ | `RiwayatSesi.tsx:220-225`; `lib/pagination.ts:1` | `PAGE_SIZE=5`, tanpa "muat lebih banyak" |
| M-12 | ✅ | `StudentDetail.tsx:430-484` | Tanpa Edit Profil/Nonaktifkan/tombol WA (WA hanya `<a>` kecil di :527-531); `Breadcrumb` tak dipakai; modal bantuan :1051 menyuruh "Edit Profil" yang tak ada |
| M-13 | ✅ | `RiwayatSesi.tsx:143` vs `:196` | `div role="button"` membungkus tombol Edit → nested interactive |

### 2.4 Catat Sesi (C)

| ID | Status | Lokasi baru | Catatan |
|---|---|---|---|
| C-01 | ⚠️ | `CaptureSession.tsx:1863-1867`; `goNext:572-579`; `handleSave:368-376` | Langkah 6 **sudah** berlabel "✅ Simpan Sesi"; yang tersisa: langkah 1–5 tetap "Lanjut →" & validasi simpan = murid + mapel + catatan |
| C-02 | ✅ | `CaptureSession.tsx:572-591,713,838` | Tanpa `scrollTo`/fokus; "Langkah X dari 6" bukan `aria-live`; `h2` tanpa `tabIndex` |
| C-03 | ✅ | `CaptureSession.tsx:1391-1418` vs `:1421-1500` | Dua grup tetap menulis `setResponseTag`; "Kosongkan" (:1409-1413) juga menghapus `needsWork` |
| C-04 | ✅ | `useCaptureDraft.ts:250-260`; stepper `:794-830` | Hanya `beforeunload`; tanpa `ConfirmSheet`; stepper tanpa badge langkah belum lengkap |
| C-05 | ✅ | `CaptureSession.tsx:1768-1769,1805-1806`; `CloseOutSheet.tsx:81` | Hapus foto/TTD/follow-up tanpa konfirmasi; follow-up tanpa `aria-label` |
| C-06 | ⚠️ | `ClockTimePicker.tsx:82-89,100-109,125-134` | Masih <44 px & `<g onClick>` tak fokusable. **Koreksi:** komponen ini **tidak dipakai** wizard — dipakai `StudentDetail.tsx:962`, `ResolveMissedSessionModal.tsx:94`, `EditSessionModal.tsx:89`, `AddScheduleModal.tsx:81` |
| C-07 | ✅ | `CaptureSession.tsx:862,989-994,1366-1369` | Tap target kecil |
| C-08 | ✅ | `constants.ts:69`; `CaptureSession.tsx:565-567,1857` | Langkah 2 wajib; "Lewati" hanya bila `stepMeta.optional` |
| C-09 | ⚠️ | `CaptureSession.tsx:1170-1322,1223-1249`; `useEngagement.ts:31-46` | **Sebagian sudah diperbaiki**: indikator sekunder di balik `showMoreFlags`; tetap 12 indikator total |
| C-10 | ✅ | `CaptureSession.tsx:1515-1542`; `CloseOutSheet.tsx:76-79` | Donat manual tanpa `role`/`aria-label` |
| C-11 | ✅ | `CaptureSession.tsx:498-499,849-869` | Pesan exception mentah; tanpa "Coba lagi" |
| C-12 | ✅ | `CaptureSession.tsx:1636-1642,1676-1682,1719`; `useAiFill.ts:69-100` | Tanpa label biaya/progres; `aiError` tanpa coba lagi |
| C-13 | ✅ | `CaptureSession.tsx:989-994`; `CloseOutSheet.tsx:81` | Tanpa undo (pola undo ada di `:1213-1218`) |
| C-A | ⚠️ | `AiCostConfirmModal.tsx:41` | Biaya `$toFixed(6)`/`Rp toFixed(4)` tetap. **Koreksi:** modal **sudah** memakai `components/Modal.tsx` (klaim "tanpa focus trap" salah); sisa: `type="button"` |
| C-B | ✅ | `CaptureSession.tsx:1863-1867` → `:572-579` → `:568` → `:368-376` | Catatan benar-benar wajib; urutan cek murid → jadwal → mapel → catatan |

### 2.5 Laporan (R)

| ID | Status | Lokasi baru | Catatan |
|---|---|---|---|
| R-01 | ✅ | `MonthlyReport.tsx:1697-1701,1937-1939,1962-1972,1517-1538` | CTA di atas pratinjau; alasan tombol mati di blok terpisah; tanpa indikator langkah |
| R-02 | ✅ | `MonthlyReport.tsx:1720-1726`; `useReportGeneration.ts:190-194,222-263,302-321,324-328` | Kegagalan sebagian = satu kalimat; `aiProgress` direset di `finally` |
| R-03 | ✅ | `useReportExport.ts:32-52`; `exportReport.ts:158-183` | Progres hanya ⏳; pesan selalu "diunduh" walau sheet berbagi; `pdfGeneratedAt` diset saat ekspor |
| R-04 | ⚠️ | `useReportGeneration.ts:56,107,182-183` | **Sebagian tertutup**: offline kini berpesan "Offline."; **0 sesi tetap senyap** |
| R-05 | ⚠️ | `MonthlyReport.tsx:1937`; `layouts/helpers.tsx:387,464,510-514`; `exportReport.ts:78-84` | **Sebagian tertutup**: pratinjau = sumber ekspor (WYSIWYG), 416 px hanya di `ScaledPreview` (:88). Tetap: tanpa zoom, tanpa indikator halaman, `detectOverflow` hanya saat ekspor |
| R-06 | ✅ | `MonthlyReport.tsx:2049-2115` (:2070-2073, :2089-2092, :2107-2110) | `<p onClick>` tanpa `role`/`tabIndex`/`onKeyDown` |
| R-07 | ⚠️ | `CustomThemeBuilder.tsx:42,65-130,144-159`; `MonthlyReport.tsx:1762-1763,1834-1838` | **Sebagian tertutup**: pratinjau mini live ada; istilah Inggris + "TemaKu" + judul campur tema/layout tetap |
| R-08 | ⚠️ | `MonthlyReport.tsx:1795-1825,1843-1867` | **Angka dikoreksi: 26 layout (registry `layouts/index.ts:42-51`), 34 tema** — bukan 25/30. Pola masalah sama (26 tombol `👁` 16 px; grid `grid-cols-6`) |
| R-09 | ✅ | `MonthlyReport.tsx:630-637,1481-1496,1986,1739-1745` | Kesiapan dihitung dari `filteredSessions` |
| R-10 | ✅ | `MonthlyReport.tsx:1174-1195,2039-2041,2122-2123,762-787` | Undo hanya di dalam banner; `setPrevTexts(null)` saat scope berganti |
| R-11 | ✅ | `useReportExport.ts:37`; `exportReport.ts:119-183` | Nama berkas memuat nama murid — **dipertahankan** sesuai keputusan #11 |
| R-12 | ✅ | `MonthlyReport.tsx:1895-1933` | Modal manual tanpa Escape/trap; `SAMPLE_REPORT_DATA` |
| R-13 | ✅ | `MonthlyReport.tsx:1159-1173,1307-1311,1814-1821,2197-2203` | Banner tanpa `role=status/alert`; target kecil |
| R-A | ✅ | `MonthlyReport.tsx:2031-2115,762-787` | Tanpa autosave/penanda "belum tersimpan"; buffer direset saat scope berganti |
| R-B | ✅ | `MonthlyReport.tsx:1947-1954,674,676` | `entriesPerPage` tidak disimpan ke laporan |

### 2.6 Keuangan (K)

| ID | Status | Lokasi baru | Catatan |
|---|---|---|---|
| K-01 | ✅ | `paymentRepo.ts:1155-1164` (baris **1160** `{ totalCost, source: "manual" }`); `TagihanTab.tsx:248-255`; `InvoiceRow.tsx:104` | Guard hanya `isValidCurrencyAmount` (:1156) — **tidak ada** cek `reportId`/`source`. Efek senyap: tombol "Batalkan tagihan" hilang (`TagihanTab.tsx:57`), sesi jadi `[]` (`useInvoiceFilters.ts:100-103`), teks WA beralih ke manual |
| K-02 | ✅ | `InvoiceRow.tsx:132`; `TagihanTab.tsx:674` | `markPaymentTransferredById`/`markPaymentUnpaidById` langsung; `askWithPin` hanya untuk cancel/hapus/restore/due (`:965`) |
| K-03 | ✅ | `InvoiceRow.tsx:90,102` | Hanya label umur (`finance.ts:101-105`); grep "terlambat" = 0; jatuh tempo ISO mentah |
| K-04 | ✅ sebagian | `InvoicePdfPages.tsx:11-16`; `useInvoiceExports.ts:39,42,71-94` | Semua halaman selalu di DOM; ekspor `toPng` (raster); progres hanya boolean `pdfExporting`; gagal via banner global |
| K-05 | ✅ | `useInvoiceFilters.ts:57,80-87,120-133,151-188,196` | Variabel mati hanya dipakai di berkas itu; `agingRows` lokal menggantikan `agingBuckets`; tak ada input pencarian |
| K-06 | ✅ | `TagihanTab.tsx:270-350,617-650` | **13 kontrol** (12 selalu tampil) |
| K-07 | ✅ sebagian | `useInvoiceFilters.ts:148`; `TagihanTab.tsx:606,651-654` | `showIssuedList=false` → daftar + empty state tak terjangkau; seksi paket tetap render dengan pesan berbeda |
| K-08 | ✅ | `RingkasanTab.tsx:364-401,253-256,321`; `TagihanTab.tsx:259-409` | Kartu atas hanya agregat; `piutangRows` tak dirender (payload AI saja) |
| K-09 | ✅ | `BarChart.tsx:90,141,201`; `LineChart.tsx:115,205`; `RingkasanTab.tsx:696-727` | `viewBox 600` → teks 10 px ≈ 6 px efektif; tooltip tanpa `tabIndex`/`onFocus`; legend Donut dimatikan |
| K-10 | ✅ | `FinancePipelineBoard.tsx:121-172`; `RingkasanTab.tsx:542-547`; `TagihanTab.tsx:270-326` | Board = **satu kolom list** + lipatan "sinkron"; judul 5 tahap vs 4 langkah; agregat sama dilaporkan **3×** |
| K-11 | ⚠️ | `index.css:124-154`; `ManualInvoiceForm.tsx:46`; `MetricCard.tsx:60` | **Dikoreksi:** `.btn-primary` dipakai di luar keuangan; di payments hanya `ManualInvoiceForm.tsx:46` **tanpa kelas `.btn`** (tanpa padding/radius); `MetricCard` hanya 1 pemakai di home |
| K-12 | ✅ sebagian | `InvoiceRow.tsx:104`; `ManualInvoiceForm.tsx:44`; `QuickExpenseModal.tsx:99` | Tanpa pemisah ribuan; InvoiceRow tanpa pesan sukses; `QuickExpenseModal` justru punya error inline (:115) |
| K-13 | ✅ | `Payments.tsx:123-141`; `PinConfirmModal.tsx:22-42,57` | Gerbang PIN = div+input+button, **tanpa Enter**; lockout tanpa countdown & input tidak dikunci |
| K-A | ⚠️ | `financialInsights.ts:86-93`; `aiClient.ts:585-591,623` | **Dikoreksi:** `avgDaysToPay` tidak ada; hanya `avgDaysToPayProxy` → prompt AI, 0 pemakaian di UI |
| K-B | ❌ | `InvoicePdfPages.tsx:20-22`; `useInvoiceExports.ts:68,77,91` | **Bukan cacat**: nomor halaman konsisten dengan yang dirender. Catatan: header selalu "Semua Tagihan" & nama berkas tanpa `agingFilter` walau isinya tersaring |

### 2.7 Pengaturan/PWA (S)

| ID | Status | Lokasi baru | Catatan |
|---|---|---|---|
| S-01 | ✅ (lebih luas) | `Settings.tsx:1127-1129`; `:591-605`; `App.tsx:105`; `settingsRepo.ts:9-29` | `doResetAll` meng-clear **12 tabel** termasuk `settings` **+ `auditLog` + `captureDrafts`** (dua terakhir tanpa salinan backup). Hilang: PIN, securityQuestion/Answer, logo, `ai.apiKey`, `driveBackup.fileId`, `lastBackupAt`, `templatePref`. App tetap terbuka (default settings), tapi **tanpa PIN**. localStorage (`leskolui_drive_pass`, `_relay_secret`) **tidak** dibersihkan |
| S-02 | ✅ | tombol `:1199-1201`; badge `:673-680`; `openSection :305` | Tak mendaftar `leskolui:before-pwa-update`; tak ada `beforeunload` |
| S-03 | ✅ | `:428-445` (kunci `:441`); pola patch `:358-373` | `:441` satu-satunya `saveSettings({...form})` di seluruh `src`; `dirty` tak direset; tanpa `try/catch` |
| S-04 | ✅ | Section `:683,732,833,884,937,1122,1144,1149`; `:236-270,305` | Urutan: Profil, PIN, Rekening, AI, Backup, **Hapus Semua Data (ke-6)**, Riwayat, Aplikasi; tanpa ringkasan/pencarian |
| S-05 | ✅ (nuansa) | `doDriveRestore :506-531`; progres `:1033-1037`; tombol `:986,993,1001,1055,1062` | Progres **memang** tampil saat restore Drive (kartu File selalu render) tapi ditempatkan di blok File; `disabled` hanya `:1014,1070,1092` |
| S-06 | ✅ | `:943-981` (Generate `:948-957`); `:580`; `:1080-1084` | Tanpa tombol Salin; **tidak ada** helper clipboard di `src` |
| S-07 | ✅ | `:1171-1186`; Keluar `:1188-1192` | Tanpa konfirmasi, tepat di atas tombol merah Keluar |
| S-08 | ✅ | `PwaPrompts.tsx:131-184`; `Settings.tsx:1148-1194`; `pwaInstall.ts:40-42` | Banner butuh `hasPrompt` → tak pernah di iOS; kontras `text-blue-200`/`bg-blue-600` ≈3,6:1; Changelog hanya auto-open sekali |
| S-09 | ✅ | `Settings.tsx:883-932` | Tanpa estimasi biaya bulan ini/Tes koneksi/Hapus kunci; toggle AI baru berlaku setelah Simpan |
| S-10 | ✅ | Hapus `:103-115` vs Perkecil `:116-131` (confirm `:118`) | Asimetri konfirmasi tetap |
| S-11 | ⚠️ | `:118,482,522,1006,1065,1132-1134`; jargon `:481,521`; **"Lupa PIN?" `:745-750,767-772`** | **Sebagian tertutup**: "Lupa PIN?" sudah ada. Sisa: `confirm()`/`prompt()` native, jargon `tabel.rowId.field`, lockout statis |
| S-12 | ✅ | `:331`; `StorageUsage :62-81` (`return null :69`) | Tetap teks polos |
| S-13 | ✅ | `settingsPresentation.ts:21-29`; `:22,28,255,267,392,412,906`; `Toggle.tsx:22` | "Tersimpan ✓" = tombol `disabled`; label "Model" tanpa `htmlFor`; `aria-controls` menggantung; tap target 26×44 |
| S-A | ✅ | `:939` & `:1151` | Dirender 2×, tapi accordion hanya mount satu section → tak pernah terlihat berdampingan |
| S-B | ✅ | `:732` (PIN), `:884` (AI) | Hanya 2 dari 8 section punya badge |

---

## 3. Validasi keputusan pemilik

Kolom "Verdict": ✅ aman · ⚠️ perlu penyesuaian · 🔴 butuh amandemen kontrak lebih dulu.

| # | Keputusan | Verdict | Dependency tersembunyi | Skema/migrasi | Risiko regresi | Usaha |
|---|---|---|---|---|---|---|
| 1 | **K-01** peringatan + tombol eksplisit untuk ubah asal tagihan | ⚠️ | `TASK-10:202` sudah mendokumentasikan efek `source:"manual"` & menyatakan K-01 **belum diputuskan**; `TASK-05:421-428` melarang mengubah logika `paymentRepo.ts` | Tidak ada | Tombol "Batalkan tagihan" & teks WA berubah perilaku; locator E2E `billing-session-count` menyentuh PIN/aksi tagihan | S |
| 2 | **C-01** langkah 5 = "Simpan Sesi", Bukti opsional | ✅ **diputuskan (Q2)** | Tes `captureSessionHelpers.test.ts:176` + `TASK-06:20-21,236,260` mengunci 6 langkah & bilah aksi; `ATURAN-AI:59` melarang mengurangi langkah | Tidak ada | Simpan di langkah 5 membuat foto/TTD opsional → laporan bisa kehilangan absensi; E2E `capture-closeout-failure` menyentuh alur simpan. **Resolusi:** `STEP_META` tetap 6 → tes lama aman; tambah 2 tes baru | M |
| 3 | **S-01** reset total + konfirmasi 2× | ✅ | Konfirmasi sekarang **3 lapis** (confirm → prompt "RESET" → PIN) tapi **teksnya salah**. Setelah PIN terhapus, "Lupa PIN?" ikut hilang; localStorage berisi passphrase Drive tidak dibersihkan | Tidak ada | `data.reset` audit; alur PIN di luar lingkup TASK-05/08 → butuh tugas sendiri | S |
| 4 | **M-02** tab Progres = nilai akademik + engagement | ✅ | `raporGrades` + repo ada & **mati di UI** → tidak perlu skema baru; `TASK-03:70` menamai tab "Nilai" (bukan "Progres") → selaraskan nama | **Tidak ada** | `reportLayouts`/`reportDisplayStatus` tidak tersentuh; tab "Progres" di E2E `screenshot-audit` (nama tab berubah → perbarui spec) | M |
| 5 | **B-04** Beranda hanya jadwal; keuangan dihapus | ✅ | Kontrak **sudah** memutuskan ini (`arsitektur/11:76,170`; `TASK-08:173-181`). Footprint nyata di Beranda hanya **1 tombol + 1 modal** (`Home.tsx:141-144,24,240-245`). Blok "Perlu keputusan" **wajib tetap ada** (tanpa nominal, CTA `Lihat di Uang ▸`) | Tidak ada | `QuickExpenseModal` **jangan dihapus** (dipakai `PengeluaranTab.tsx:155,164`); hilangnya input pengeluaran tanpa PIN = +3 langkah bagi pengguna | S |
| 6 | **B-05** ringkasan operasional selalu terlihat | ⚠️ | `TASK-03:53` memutuskan blok itu **digabung ke header "Hari Ini"** (bukan blok mandiri). "Selalu terlihat" bisa dipenuhi lewat penggabungan, bukan blok terpisah | Tidak ada | `OperationalSnapshot.tsx` juga titik kebocoran uang #2 (`arsitektur/11:171`) → kerjakan bersama TASK-08 | M |
| 7 | **M-06** tab proyek tetap tampil + jenis bebas | ✅ **diputuskan (Q5 = A + varian, A11)** | `IaEeType = "IA"\|"EE"\|"PP"` (union tertutup, `types.ts:412`); hardcode di `IaEeTracker.tsx:99-101,103-107,153`; `IAEE_TYPES` untuk validasi backup (`backupValidation.ts:38`); gate `isIb` (`:37-38`); `TASK-03:70` (sudah diamandemen: Ringkas/Sesi/Progres/Proyek) | **Tidak perlu naik versi Dexie** (field non-indeks, baris IndexedDB schemaless). Cukup `types.ts` + `IAEE_TYPES`. Migrasi data **tidak wajib** (backfill opsional) | Restore file lama: jenis baru hanya memicu **warning**, data tetap dipertahankan. Kesan "Uang di Ringkas" harus diuji ulang saat G2-04 (masking) — bila terasa salah tempat, angkat ke pemilik, jangan improvisasi | M |
| 8 | **R-01** pertahankan "buat dulu → pratinjau", desain modern | ⚠️ | `TASK-04:332-333` melarang menyentuh **logika** `MonthlyReport.tsx`; `TASK-03:117` melarang mesin template; AI wajib via `useAiAction` (belum ada); CSV harus byte-identik (`TASK-05:302-306`); total final beku (`TASK-10:216`) → autosave narasi tak boleh mengubah total | Tidak ada | 6 tes laporan (`reportLayouts`, `reportDisplayStatus`, `reportSessionScope`, `reportUnlock`, `useReportGeneration`, `exportReport`) + 4 spec E2E laporan | L |
| 9 | **R-14/S-09** cukup estimasi biaya bulan ini, tanpa batas penolak | ✅ **diputuskan (Q1)** | **B4 terkunci** (`ATURAN-AI:30`); `TASK-07:45,171-174,181` mewajibkan batas + blokir + tes "(c) anggaran terlampaui memblokir"; **tidak ada** data pemakaian historis (`AuditAction` belum punya `ai.call`) | Tidak ada versi Dexie baru — `AuditAction`/`AuditEntry` hanya tipe; `auditLog` sudah ada & tidak ikut backup | Tidak ada blokir default → pemakaian tak terbatas kecuali pengguna mengisi batas. **Resolusi:** mekanisme tetap, default kosong; perbarui `arsitektur/11:60-61,105` + `ATURAN-AI:30` + tes TASK-07 | M |
| 10 | **K-10** pipeline dipertahankan + redesign | ✅ **diputuskan (Q3)** | `TASK-05:42,312-333` **"dibubarkan"** + DoD "tidak ada impor" + penghitung `ATURAN-AI:155-156`; `TASK-05:40,267-274` mengunci **3 blok tetap** ("jangan improvisasi"); tidak ada DnD; `financePipeline.ts` terlarang diubah | Tidak ada | Redesign menyentuh `FinancePipelineBoard.tsx` + `RingkasanTab.tsx`; tes `financePipeline.test.ts`; E2E `finance.spec.ts`. **Resolusi:** board menjadi isi blok "Perlu ditagih"; DoD & penghitung L6 ditulis ulang | L |
| 11 | **R-11** nama murid tetap di nama berkas | ✅ | Tidak ada pekerjaan; R-11 dicabut dari rencana | Tidak ada | — | — |
| 12 | **M-13/T-9** pakai `Student.photo` + UI unggah/tampil | ⚠️ | Field ada & **sudah ikut backup** (`backup.test.ts:126`); **nol render**; helper `compressPhoto`/`blobToDataUrl` ada; `photos.shrink/prune` hanya menyentuh **sesi**; laporan belum punya slot foto murid (`template/types.ts:53-74` + 26 layout) | Tidak ada | Backup membengkak (base64 +33%, ±150 KB/avatar); kuota IndexedDB; privasi wajah anak di berkas backup | M (UI) / L (kalau masuk laporan) |
| 13 | **L-13** light-only permanen | ✅ **diputuskan (Q4)** | `TASK-04:45,56,259-291` (L6 menghidupkan dark + nilai token sudah ditulis); `README:85`; `playwright.config.ts:17` (`mobile-dark`) | Tidak ada | Menghapus L6 **mengurangi** pekerjaan TASK-04 (positif); menghapus project `mobile-dark` mengubah matriks `screenshot-audit.spec.ts` | S |

### 3.1 Deep dive #5 — keuangan di Beranda (inventaris lengkap)

| Elemen | Lokasi | Jenis | Tindakan | Kalau dihapus |
|---|---|---|---|---|
| Tombol "💸 Pengeluaran" (biru solid) | `Home.tsx:141-144` | tulis → `QuickExpenseModal`; **tidak** menaut `/payments` | **Hapus** | Hilang satu-satunya input pengeluaran **tanpa PIN**; pintu tetap ada di `PengeluaranTab.tsx:54-56,117` (+3 langkah) |
| `showExpenseModal` + mount modal + import | `Home.tsx:24,40,240-245` | state/render | **Hapus** bersama tombol | Tidak ada (write-only) |
| `QuickExpenseModal` (komponen) | dipakai juga `PengeluaranTab.tsx:155,164` | form | **Pertahankan** | Kalau ikut dihapus → Keuangan kehilangan cara input pengeluaran |
| Pill "Tidak hadir · Tagih" | `home/SessionPill.tsx:47-49` | flag `noShowBillable` | **Pertahankan** (konsekuensi jadwal) | Penanda no-show akan ditagih hilang → salah paham saat tutup bulan |
| Blok "Kebijakan tagihan" | `home/ResolveMissedSessionModal.tsx:110-126` | keputusan tagih | **Pertahankan** (bagian resolusi jadwal) | Tagih/tidak hanya bisa ditentukan belakangan |
| Kartu/angka uang lain | — | **tidak ada** (grep `Rp`/`formatRupiah`/`piutang`/`unpaid` di `src/screens/home` = nihil) | — | — |

### 3.2 Deep dive #7 — proyek & skema

| Pertanyaan | Jawaban |
|---|---|
| Struktur data sekarang | `IaEeProject{id, studentId, type, subject, title, deadline?, milestones[], notes?, createdAt, updatedAt}`; `IaEeMilestone{id, title, dueAt?, status, notes?, completedAt?}`; `IaEeType = "IA"\|"EE"\|"PP"` |
| Ada field jenis bebas? | **Tidak.** Union tertutup + hardcode UI (`IaEeTracker.tsx:99-107,153`) + aturan "subject wajib kecuali PP" (`:47,53,109-111,124`) |
| Perubahan minimal | (1) perluas `IaEeType` (+`EXPERIMENT`, `OTHER`) **atau** tambah `kindLabel?: string`; (2) ganti ternary → satu map `{value,label,hint,color,requiresSubject}`; (3) rename tab/header → "Proyek"; (4) longgarkan gate `isIb`; (5) samakan `IAEE_TYPES` (`backupValidation.ts:38`); (6) opsional `updateIaEeProject` (sekarang proyek tak bisa diedit setelah dibuat) |
| Perlu migrasi Dexie? | **Tidak.** `version().stores()` hanya mendeklarasikan PK + indeks; baris IndexedDB schemaless sehingga field non-indeks tersimpan apa adanya. `schemaVersion` tetap **15** |
| Usaha "pemantauan proyek lebih baik" | **L** (backlog): timeline/deadline reminder, edit proyek, progres milestone teragregasi, kaitan ke sesi, tampil di laporan → butuh keputusan produk, bukan sekadar UI |

### 3.3 Deep dive #10 — kelayakan redesign pipeline

| Aspek | Jawaban |
|---|---|
| Library DnD | **Tidak ada**; `package.json` hanya dexie/react/router/html-to-image/jspdf/fontsource/tailwind; grep `draggable\|onDrop\|dnd` = **0** |
| Jalur utama | **Tap-driven**: CTA `nextAction` + menu "Pindahkan ke…"; drag opsional (Pointer Events + `touch-action:none`) dengan alternatif keyboard — HTML5 drag tidak andal di sentuh |
| Data per kartu | `financePipeline.ts:23-44`: `student`, `sessionCount`, `potential`, `reportDisplayStatus`, `draftReportCount`, `hasConfirmedReport`, `invoiceStatus`, `invoice{totalCost,month,dueAt,paidAt,method,source,reportId}`, `unpaidCount/Amount`, `paidAmount`, `nextAction` (7 nilai + null) |
| Data yang **belum** tersedia | umur piutang (derive `invoiceAgeDays`/`ageBucket`), target paket + `nextBatchTotal/Hours/Sessions` (`listSessionCountBillingProgress`), nomor WA (`student.parentContact.phone`), sesi all-time; **piutang lintas bulan tidak muncul** (hanya `p.month === month`) |
| Board di 412 px | Ruang efektif ±382 px → 5 kolom ≈ 750 px ⇒ hanya ~2 kolom. Realistis: rail `snap-x snap-mandatory` kartu `w-[78%]` + header chip tahap sticky (pola `TagihanTab.tsx:270`) |
| Komponen daur ulang | `ActivityRing`, `MetricCard`, `ProgressBar`, `BarChart`, `LineChart`, `DonutChart` — semua SVG/CSS tanpa dependensi; **perbaiki dulu** aksesibilitas tooltip & ukuran teks sumbu (K-09) |

---

## 4. Analisis dampak & risiko per area

### 4.1 Kontras & token (L-01, L-04, L-12, K-11, TASK-04)

| Aspek | Isi |
|---|---|
| Berkas wajib | `src/index.css` (token + `.input`), `src/screens/**/*.tsx` yang menyapu kelas, **kecuali** berkas §2.1 `ATURAN-AI` |
| Mungkin terdampak | `src/components/ui/*` (belum ada), `src/template/layouts/helpers.tsx` (**terlarang** — peta hex 425-429 butuh pengecualian), `src/lib/engagement.ts` (**terlarang**, lihat N-7) |
| Test harus diupdate | `src/__tests__/engagementContrast.test.ts` (perluas: uji semua pasangan token di atas `--surface` **dan** putih), `reportLayouts.test.tsx` (kalau warna layout berubah) |
| Test baru | uji token kontras otomatis (pasangan ∈ tabel), uji "tidak ada `text-*-400/500` di atas tint" sebagai guard |
| Skema | tidak ada |
| Risiko utama | (a) menyapu kelas tanpa token = melanggar K4; (b) menyentuh `template/**` = melanggar larangan; (c) warna grafik (SVG inline) tak tersentuh token → tetap gagal sampai grafik diperbaiki |
| Urutan aman | token dulu → primitif → sapu (hitung 904→≤190 dengan penghitung baru) → guard test |

### 4.2 Banner & umpan balik (L-02 sisa, L-08, L-09, B-01)

Berkas wajib: `src/App.tsx`, `src/index.css`, `src/screens/home/TodayHero.tsx`, `src/screens/Home.tsx`, `src/screens/CaptureSession.tsx`, `src/screens/Settings.tsx`. Mungkin terdampak: `src/components/Toast*.tsx`, `src/components/Skeleton.tsx`. Test: `bottomNavNoVersion.test.tsx`, `modalAccessibility.test.tsx` (jangan berubah), `settingsSaveButton.test.ts`. Test baru: uji bahwa nag menambah `--nag-h` / pb; uji toast memakai `error` untuk pesan "Gagal". Risiko: `TASK-04:13` "tidak mengubah perilaku" + `:231-232` "jumlah banner bersamaan tetap" → perubahan banner **harus** dicatat sebagai pengecualian amandemen. Urutan: paling awal karena risiko terendah.

### 4.3 Catat Sesi (C-02…C-13, TASK-06, TASK-01)

Berkas wajib: `src/screens/CaptureSession.tsx` (**1.891 baris** setelah refactor 2026-10-04 lewat G3-01, commit `925e4ff`; angka **2.073** yang tertulis di sini saat dokumen dibuat sudah basi — terukur **2.155** tepat sebelum refactor, dan angka itu pun sudah tumbuh 82 baris dari 2.073), `src/screens/captureSession/*`, `src/components/ClockTimePicker.tsx`, `src/components/ConfirmSheet.tsx`. Mungkin terdampak: `src/screens/home/EditSessionModal.tsx`, `ResolveMissedSessionModal.tsx` (→ `ManageSessionSheet`), `App.tsx` (`--task-bar-h`). Test wajib hijau: `captureSessionHelpers` (STEP_META), `captureDraft*` (3 berkas), `scheduleCapture`, `ClockTimePicker` tidak punya tes. **Risiko utama: `TASK-01` refactor belum selesai** (`README:83` — dua target ukuran terbuka) → mengedit `CaptureSession.tsx` sekarang menambah konflik penggabungan; **putuskan mana dulu** (lihat Q9). → **Risiko ini SUDAH DITUTUP 2026-10-04**: target baris `CaptureSession.tsx` tercapai (1.891) sebelum wave fitur G3-01 dimulai, sesuai aturan §10 nomor 5.

### 4.4 Laporan (R-01…R-13)

Berkas wajib: `src/screens/MonthlyReport.tsx` (2.296 baris), `src/screens/monthlyReport/*`, `src/lib/exportReport.ts`. Terlarang: `src/template/**`, `formatRupiah`, `waBilling`/`invoicePresentation`, CSV. Test: 6 unit + 4 spec E2E laporan. Skema: tidak ada **kecuali** menyimpan `entriesPerPage`/status autosave (butuh field di `MonthlyReport` → tipe saja, tanpa versi). Risiko: (a) autosave menulis DB terlalu sering saat AI mengisi; (b) total final beku → autosave narasi **tidak boleh** memicu `upsertReport` yang mengubah total; (c) sticky bar boleh menabrak `--task-bar-h` global. Urutan: setelah TASK-06/05, karena layar ini paling banyak tersentuh modul lain.

### 4.5 Keuangan (K-01…K-13, TASK-05, TASK-10)

Berkas wajib: `src/screens/payments/*` (6 berkas besar). Terlarang/dibatasi: `finance.ts`, `financePipeline.ts`, `csv.ts`, logika `paymentRepo.ts`, alur PIN `Settings.tsx`. Test: `finance`, `financePipeline`, `invoiceRecovery`, `invoiceSessions`, `sessionCountBilling`, `sessionPricing`, `repos` (**tidak ada `paymentRepo.test.ts`** → K-01 butuh tes baru), E2E `finance.spec.ts`, `billing-session-count.runtime.spec.ts`. Risiko tertinggi: K-01 (mutasi `source`) menyentuh perilaku uang nyata + locator E2E; K-04 (render PDF) memengaruhi performa scroll. Urutan: K-05/K-03 (tampilan) sebelum K-01 (perilaku), pipeline redesign paling akhir di modul ini.

### 4.6 Pengaturan (S-01…S-13)

Berkas wajib: `src/screens/Settings.tsx` (1.205 baris), `src/components/PwaPrompts.tsx`, `src/components/PinConfirmModal.tsx`, `src/lib/pwaInstall.ts`. Test: `settingsSaveButton`, `settingsRepo`, `settingsDirtyPatch`, `modalAccessibility`, `pwaInstall`. Risiko: S-03 (PIN) menyentuh jalur keamanan; S-01 menyentuh penghapusan data. Urutan: S-03 & S-01 lebih dulu (keduanya bug kepercayaan), lalu tata letak/status, lalu PWA.

### 4.7 Proyek & foto murid (keputusan #7, #12)

Berkas wajib: `src/db/types.ts`, `src/db/repos/iaeeRepo.ts`, `src/screens/studentDetail/IaEeTracker.tsx`, `src/screens/StudentDetail.tsx`, `src/components/StudentForm.tsx`, `src/screens/Students.tsx`, `src/lib/backupValidation.ts`. **Tidak** menyentuh `src/db/db.ts` (tidak perlu). Risiko: restore backup lama (warning jenis tak dikenal), kuota IndexedDB & ukuran backup untuk foto, privasi. Urutan: proyek dulu (tanpa risiko penyimpanan), foto kemudian (butuh keputusan perawatan).

### 4.8 Guard regresi & CI

Spec `.design-audit/uiux-audit.spec.ts` (299 baris, di luar repo) sudah menangani lokasi `e2e/` maupun `.design-audit/`. **Jangan** langsung masuk `testDir ./e2e` — `npm run e2e` dipakai CI dan akan bertambah ±3 menit tanpa batas. Usulan: `playwright.uiux.config.ts` + `npm run e2e:uiux`, lalu tambahkan ambang gagal (kontras <4,5:1, kontrol <24 px, `role=tab` tanpa panel) agar benar-benar menjadi penjaga.

---

## 5. Rencana eksekusi final

Tiga gelombang disusun agar **tidak ada pekerjaan yang dikerjakan dua kali**: Gelombang 1 membersihkan klaim salah & memutuskan kontrak; Gelombang 2 membangun fondasi (token → uang → jadwal) sesuai urutan risiko terendah yang sudah dikunci (`ATURAN-AI:109`); Gelombang 3 mengerjakan alur yang bergantung pada fondasi itu.

### Gelombang 1 — "Bersih-bersih aman + amandemen kontrak" (tanpa perubahan skema, tanpa menyentuh perilaku terkunci)

| ID | Judul | Berkas disentuh | Dep | DoD terverifikasi | Usaha | Menutup |
|---|---|---|---|---|---|---|
| G1-01 | ✅ **SELESAI 2026-10-01** — **Amandemen kontrak** — kunci 4 resolusi di §1.2 (B4 default kosong · TASK-05 L6 jadi *redesign* · cabut TASK-04 L6 · simpan di langkah 5 dengan 6 langkah) + amandemen teknis A7–A12 | `ATURAN-AI.md`, `arsitektur/11`, `TASK-01`, `TASK-03/04/05/06/07/10`, `README.md`, `03-PLAYBOOK`, `playwright.config.ts` | Q5 (& Q7) | tidak ada dua dokumen bertentangan; tiap perubahan punya baris "keputusan pemilik 2026-10-01" | S | §1.2, N-1, N-7 |
| G1-02 | **Perbaiki penghitung & baseline kelas warna** | skrip/CLI + `ATURAN-AI:153,188`, `TASK-04:42,52,353` | G1-01 | satu perintah rekursif menghasilkan **904**; target ≤190 ditulis ulang | S | N-1 |
| G1-03 | **Koreksi dokumen audit 06** (18 ⚠️ + 8 koreksi fakta) | `docs/06-AUDIT-UIUX-2026-10-01.md` | G1-01 | tiap baris punya status + lokasi terverifikasi; L-02/L-01h dinetralkan | S | §1.3, §2 |
| G1-04 | **Kontras cepat (interim)** 13 titik: `App.tsx:244,256`, `Settings.tsx:113`, `FinancePeriodPicker.tsx:81`, `AttentionInbox.tsx:87`, `MonthView.tsx:53,79`, `Students.tsx:353`, `RiwayatSesi.tsx:200`, `IaEeTracker.tsx:159`, `EngagementSummary.tsx:198`, `EvidenceCard.tsx:15`, `StudentDetail.tsx:846`, `StudentForm.tsx:364` | 10 berkas layar | G1-01 | setiap pasangan ≥4,5:1 (label sumbu ≥3:1); screenshot sebelum/sesudah; **tanpa** berkas terlarang | M | L-01a–g |
| G1-05 | **Nag backup**: kompensasi tinggi + tombol tutup + tidak tampil di `/capture` | `App.tsx`, `index.css` | G1-01 | di 412 px elemen terakhir tidak tertutup (uji runtime); tombol tutup mengingat pilihan | S | L-02 sisa |
| G1-06 | **Umpan balik** sukses/gagal + "Coba lagi" pada gagal simpan sesi | `Home.tsx:99`, `Settings.tsx:367-369,442,465,553`, `CaptureSession.tsx:498-499,849-869` | — | 0 pemanggilan `toast.info` untuk kegagalan; banner gagal punya aksi | S | L-08, C-11 |
| G1-07 | **State memuat**: skeleton Beranda + error-state Pengaturan | `home/TodayHero.tsx`, `Home.tsx`, `Settings.tsx:331,62-81` | — | tidak ada "Tidak ada sesi hari ini" sebelum data ada; ada tombol "Coba lagi" | S | B-01, L-09 |
| G1-08 | **Konfirmasi aksi destruktif kecil** (lunas, hapus foto/TTD/follow-up, hapus cache, tukar prioritas foto) | `TagihanTab.tsx:674`, `CaptureSession.tsx:1768-1806`, `CloseOutSheet.tsx:81`, `Settings.tsx:103-131,1171-1186` | — | setiap aksi destruktif pakai `ConfirmSheet`; tidak ada aksi permanen tanpa konfirmasi | M | K-02, C-05, S-08, S-10 |
| G1-09 | **Bug kepercayaan Pengaturan**: teks reset yang salah + `handleSetPin` snapshot basi | `Settings.tsx:1127-1129,428-445`, `lib/settingsPresentation.ts` | G1-01 | teks menyebut **semua** yang hilang; `:441` memakai `settingsDirtyPatch` + `try/catch` + `setDirty(false)`; tes baru | S | S-01(a), S-03 |
| G1-10 | **A11y dasar**: pola tab lengkap + hierarki heading + banner `role=status/alert` | `components/Tabs.tsx` + 3 pemakai, `Home.tsx`, `Payments.tsx`, `MonthlyReport.tsx:1159-1173` | — | setiap `role=tab` punya `aria-controls` + `role=tabpanel`; setiap layar ≥1 `h2`; banner sukses/gagal ber-`aria-live` | M | L-06, L-07, R-13 |
| G1-11 | **Guard metrik UI** (spec di luar CI utama + ambang gagal) | `playwright.uiux.config.ts` (baru), `package.json`, spec dipindah ke `e2e/uiux-metrics.spec.ts` | G1-01 | `npm run e2e:uiux` gagal bila kontras <4,5:1 atau kontrol <24 px; `npm run e2e` tidak bertambah waktu | M | §4.8 |

**Kenapa urutan ini:** amandemen dulu (G1-01) karena 5 keputusan akan mengubah isi 5 tugas; kontras cepat (G1-04) sengaja **sebelum** TASK-04 supaya pengguna merasakan manfaat tanpa menunggu refactor token, dan titik-titiknya dipilih yang **tidak** akan ditulis ulang oleh token (nilai `-500 → -700` tetap sah); sisanya perbaikan umpan balik yang tidak menyentuh perilaku uang/AI.

### Gelombang 2 — "Fondasi: token → uang → jadwal" (urutan risiko terendah yang sudah dikunci)

| ID | Judul | Berkas disentuh | Dep | DoD | Usaha | Menutup |
|---|---|---|---|---|---|---|
| G2-01 | **TASK-04 L1–L3**: token warna (termasuk semantik danger/warn/success) + 7 primitif + skala tipografi; kontras jadi acceptance criteria | `index.css`, `src/components/ui/*` (baru) | G1-01 | token terdokumentasi; daftar 13 pasangan kontras lulus; skala 13/15/18/24 dipakai | L | L-01, L-12 (dasar) |
| G2-02 | **TASK-04 L4–L5**: sapu kelas hardcode **904 → ≤190** + perluas guard kontras | `src/**/*.tsx`, `engagementContrast.test.ts` | G2-01, G1-02 | penghitung baru ≤190; guard menguji token di atas `--surface` **dan** putih | L | L-01, N-1, N-7 |
| G2-03 | **TASK-04 L6 dibatalkan** → catat light-only permanen; hapus project `mobile-dark` | `TASK-04`, `playwright.config.ts:17`, `03-PLAYBOOK` | G1-01 | tidak ada langkah dark mode; matriks screenshot tanpa `mobile-dark` | S | L-13, #13 |
| G2-04 | **TASK-08**: `useMoneyVisible` + `MaskedMoney` + tutup 5 kebocoran + hapus 💸 dari Beranda + blok "Perlu keputusan" tanpa nominal | `Students.tsx`, `StudentDetail.tsx`, `studentDetail/SessionDetailModal.tsx`, `MonthlyReport.tsx`, `Home.tsx` | G2-01 | perintah verifikasi K3 = 0 kebocoran; Beranda tanpa baris uang; `QuickExpenseModal` tetap ada | L | arsitektur/11 §5, #5 |
| G2-05 | **Verifikasi input di Android** (bukan lagi "input 16 px untuk iOS") | tidak ada berkas baru; hanya uji manual pada form utama | G2-01 | **Keputusan Q7:** tidak ada aturan `@media … .input { font-size: 16px }`; token `body` tetap 15 px. Uji: fokus di 4 form utama pada Android Chrome dengan keyboard default **tidak** memicu zoom/geser. Bila ternyata mengganggu → **angkat ke pemilik**, jangan improvisasi. Opsional: tambah `inputMode`/`autoComplete` (`name`, `tel`) | S | L-04 (dicabut) |
| G2-06 | **Tap target ≥44 px** memakai primitif baru | `WeekView.tsx:74`, `RekapTab.tsx:104-106`, `TagihanTab.tsx:464`, `Settings.tsx:955,1094`, `Toggle.tsx:22`, `Students.tsx:332-357`, `RiwayatSesi.tsx:196`, `MonthlyReport.tsx:1309,1819,1325`, `CaptureSession.tsx:862,989-994,1366-1369` | G2-01 | 0 kontrol <24 px; kontrol utama ≥44 px (diukur runtime) | M | L-03, M-04 |
| G2-07 | **TASK-09**: kerapatan DayView 27/54/97 px/jam + mode tangkapan | `home/DayView.tsx` | G2-01 | mode rapat ≤450 px untuk hari biasa; **tidak** menyentuh `Home.tsx`/`MonthView`/`WeekView` | M | B-07 |
| G2-08 | **Beranda non-uang**: legenda heatmap + `aria-label` sel, penanda hari terpilih, label tombol sesi, inbox persisten, tombol "Selesai", copy-coupling `DayDetail` | `home/MonthView.tsx`, `WeekView.tsx`, `DayDetail.tsx`, `SessionPill.tsx`, `AttentionInbox.tsx` | G2-04 | legenda tampil; sel ber-`aria-label`; nama tombol tidak disebut di teks | M | B-03, B-06, B-08, B-09, B-10, B-11, B-13 |
| G2-09 | **Emoji → ikon SVG** pada tombol/heading (emoji dekoratif tetap) | `components/icons.tsx`, layar pemakai | G2-01 | tidak ada emoji di `<button>`/heading fungsional | M | L-05 |

### Gelombang 3 — "Alur: catat sesi → keuangan → AI → laporan → proyek/foto"

| ID | Judul | Berkas disentuh | Dep | DoD | Usaha | Menutup |
|---|---|---|---|---|---|---|
| G3-01 | **TASK-06 + temuan C**: `ManageSessionSheet`, bilah aksi, `aria-live`+scroll saat pindah langkah, `ConfirmSheet` keluar + badge langkah, satu penulis `responseTag` + `radiogroup`, "Lewati" kondisional (tanpa sentuh `STEP_META`), konfirmasi+undo hapus, `ProgressBar` pengganti donat, pesan gagal beraksi, biaya+progres AI, **tombol "Simpan Sesi" aktif di langkah 5 & 6** | `CaptureSession.tsx`, `captureSession/*`, `ClockTimePicker.tsx` | G2-01, G2-06 | **6 langkah tetap 6** (`STEP_META` tak berubah); 3 tes draf hijau; `captureSessionHelpers.test.ts:176` tidak diubah; +2 tes baru (simpan dari langkah 5 tanpa bukti; bukti tersimpan bila ada) | L | C-01…C-13, #2 |
| G3-02 | **TASK-05 non-pipeline**: satu layar 3 blok + **pencarian murid** (K-05) + badge "Terlambat N hari" (K-03) + "Filter lanjutan" (K-06) + empty state per filter (K-07) + pemisah ribuan & umpan balik nominal (K-12) + PIN form/countdown (K-13) | `payments/TagihanTab.tsx`, `useInvoiceFilters.ts`, `InvoiceRow.tsx`, `Payments.tsx` | G2-04 | angka uang tidak berubah (tes `finance*` hijau); CSV byte-identik | L | K-03, K-05, K-06, K-07, K-12, K-13 |
| G3-03 | **Redesign pipeline** (keputusan #10 + resolusi Q3): board+list tap-driven **di dalam blok "Perlu ditagih"** (tidak menambah blok ke-4), rail `snap-x`, kartu hidup (`ActivityRing`/`ProgressBar`), mode ringkas, `nextAction`, filter cerdas, aging | `payments/FinancePipelineBoard.tsx`, `RingkasanTab.tsx` | G3-02, G1-01 | DoD TASK-05 L6 **baru**: papan tetap ada, tetap diimpor, berada di blok yang sudah ada; tes `financePipeline` & E2E `finance` hijau | L | K-08, K-10, #10 |
| G3-04 | **TASK-07**: `useAiAction` + satu `AiCostModal` + label `· ~RpNN` + log `ai.call`/`costIdr` + tampilan pemakaian bulan ini + kolom batas (opsional) + Tes koneksi/Hapus kunci/toggle instan | `src/lib/`, `src/components/`, `MonthlyReport.tsx`, `CaptureSession.tsx`, `Settings.tsx:883-932` | G1-01 (Q1), G2-01 | semua panggilan lewat satu jalur (penghitung K2 = 0 pengecualian); modal wajib; **default tanpa batas** — blokir hanya bila pengguna mengisi batas | L | S-09, C-12, R-14, #9 |
| G3-05 | **Laporan modern** (tugas baru, keputusan #8): sticky action bar + indikator langkah + panel hasil AI + early-return berpesan + progres ekspor & istilah dibuat/dibagikan + afordansi edit + autosave narasi + zoom/indikator halaman + kesiapan dari `reportSessions` + undo AI tetap + `entriesPerPage` tersimpan + modal pratinjau pakai `Modal` | `MonthlyReport.tsx`, `monthlyReport/*`, `lib/exportReport.ts` | G3-01, G3-04 | 6 unit + 4 spec laporan hijau; total final **tidak** berubah; CSV identik; pratinjau = ekspor | L | R-01…R-13 |
| G3-06 | **Proyek + jenis bebas + peta tab baru** (keputusan #7, **A11/Q5**). Peta tab jadi **Ringkas / Sesi / Progres / Proyek**: <br>· **Ringkas** = overview + **blok Uang** (uang murid tinggal di sini) <br>· **Sesi** = sesi & jadwal <br>· **Progres** = nilai akademik (`raporGrades`, saat ini mati di UI) + engagement <br>· **Proyek** = `IaEeTracker` + **jenis bebas** (IA/EE/PP/eksperimen/lainnya) | `db/types.ts`, `db/repos/iaeeRepo.ts`, `studentDetail/IaEeTracker.tsx`, `studentDetail/NilaiRapor.tsx`→`ProgresBelajar.tsx`, `StudentDetail.tsx`, `lib/backupValidation.ts:38` | G1-01, G2-04 | semua kurikulum melihat isi (tab tanpa `return null`); jenis bebas bisa dipilih & tersimpan; nilai rapor akhirnya tampil; restore file lama tidak menolak; **uang hanya di Ringkas** | M | M-06, M-02, #7, #4, A11 |
| G3-07 | **Foto murid** (keputusan #12): unggah + kompresi + render avatar/header + revoke + jaminan perawatan | `components/StudentForm.tsx`, `Students.tsx`, `StudentDetail.tsx`, `lib/foto.ts` | G2-01 | foto tampil di daftar & detail; ukuran ≤150 KB; backup/restore tetap lulus tes | M | N-3, #12 |
| G3-08 | **Kanvas & istilah**: terjemahan `CustomThemeBuilder`, kurasi layout/tema, glosarium (L-10), label terpotong (L-11), tipografi grafik & tooltip fokusabel (L-12/K-09) | `CustomThemeBuilder.tsx`, `MonthlyReport.tsx`, `components/charts/*` | G2-01 | tidak ada istilah Inggris di UI; tooltip bisa difokus keyboard; grafik terbaca di 390 px | M | L-10, L-11, L-12, R-07, R-08, K-09 |
| G3-09 | **Pengaturan lanjutan**: sticky save + guard, ringkasan status + urutan section, progres restore terpadu, tombol Salin sandi, dialog internal, a11y | `Settings.tsx`, `components/PwaPrompts.tsx`, `PinConfirmModal.tsx` | G1-09 | badge "Belum disimpan" terlihat tanpa scroll; restore Drive berprogres; tidak ada `confirm()`/`prompt()` native | M | S-02, S-04, S-05, S-06, S-11, S-12, S-13 |
| G3-10 | **Reset total + jalur set PIN ulang** (keputusan #3) | `Settings.tsx:591-605,1127-1139` | G3-09 | teks menyebut PIN/kunci AI/logo hilang; 2 lapis dialog internal + PIN; setelah reset muncul ajakan memasang PIN | M | S-01(b), #3 |

> **Dokumen tugasnya:** [`kerja/GELOMBANG-1.md`](../kerja/GELOMBANG-1.md) · [`../kerja/ROADMAP.md`](../kerja/ROADMAP.md) · [`../kerja/ROADMAP.md`](../kerja/ROADMAP.md).
> **Dua catatan saat menyusunnya:** (1) **Q12** (§8) — posisi `G3-04` vs `G3-05` menyimpang sementara dari `ATURAN-AI` §4; (2) 11 temuan modul **M** + **B-02** tidak punya tugas eksplisit di tabel di atas, sehingga dimasukkan ke `G3-06` dan `G2-08` **tanpa** menambah tugas baru.

---

## 6. Checkpoint verifikasi per gelombang

**Gate tetap setiap langkah (dari `ATURAN-AI:141-147`):** `npx tsc -b` → `npx eslint src` → `npm test` → `npm run build` → `npm run e2e`. CI (`ci.yml`) menjalankan `lint → test → build` lalu job `e2e`.

| Gelombang | Otomatis | Manual (di perangkat/emulator) |
|---|---|---|
| **1** | `npm test` (609+ lulus) · `npm run lint` · `npm run build` · `npm run e2e:uiux` (ambang baru) | (1) 13 titik kontras dipotret ulang & rasio ≥4,5:1; (2) di 412 px, saat nag tampil, **elemen terakhir halaman** masih bisa dijangkau; (3) toast gagal berwarna merah; (4) tab murid dikendalikan keyboard (Tab → panah) dan pembaca layar mengumumkan panel |
| **2** | penghitung kelas warna **≤190** · `engagementContrast` diperluas lulus · `npm run e2e` (spec `screenshot-audit` tanpa `mobile-dark`) · perintah K3 = 0 | (1) iOS/Android: fokus input **tidak** memicu zoom; (2) semua layar tanpa baris uang di Beranda, tapi blok "Perlu keputusan" tetap ada; (3) DayView mode rapat untuk hari 1 sesi; (4) ukur tap target kontrol utama ≥44 px dengan alat inspeksi |
| **3** | 6 unit laporan + 4 spec laporan · `finance*` (angka uang tidak berubah) · `csv` byte-identik · `captureDraft*` (3 berkas) · `captureSessionHelpers` · `aiClient`/`aiSettings` · `settingsRepo`/`settingsDirtyPatch` | (1) Wizard: pindah langkah mengumumkan langkah & menggulir ke atas; keluar dari wizard menampilkan konfirmasi; (2) Keuangan: menandai lunas minta konfirmasi; ubah nominal memperingatkan sebelum mengubah asal; cari murid menemukan hasil; (3) AI: modal biaya tampil tiap panggilan; pemakaian bulan ini akurat; (4) Laporan: tulis narasi → tunggu → "Tersimpan"; ekspor memberi progres & istilah benar; total final tidak berubah; (5) Pengaturan: edit di bagian atas lalu pindah tab → peringatan/draf tidak hilang |

---

## 7. Yang ditunda/dihapus + backlog terpisah

### 7.1 Dihapus dari roadmap (keputusan pemilik)

| Item | Status baru |
|---|---|
| Dark mode (`TASK-04` L6) | **Dihapus permanen** — aplikasi light-only; hapus project `mobile-dark`; catat di `README`/playbook |
| Batas AI yang menolak panggilan (B4) | **Dihapus** (menunggu konfirmasi Q1) → diganti tampilan pemakaian bulan ini |
| `R-11` nama berkas netral | **Tidak dikerjakan** — nama murid dipertahankan |
| `M-06` menyembunyikan tab proyek | **Tidak** — tab tetap tampil + jenis bebas |
| Papan pipeline dibubarkan (`TASK-05` L6) | **Dibatalkan** — diganti redesign (harus ditulis di kontrak dulu) |
| Library DnD | **Ditolak** — tap-driven |
| Emoji dekoratif (banner/chart/toast) | **Tetap** (hanya emoji di kontrol/heading yang diganti) |
| Klaim L-02 "banner atas tidak dikompensasi" | **Dibatalkan**; hanya sisa nag yang dikerjakan |
| Klaim L-01h "scoreLabel gagal di atas putih" | **Dibatalkan**; sumber nyata dipindah ke `template/layouts/helpers.tsx` |

### 7.2 Backlog terpisah (muncul dari eksplorasi, di luar lingkup audit)

1. **Pemantauan proyek lebih baik** (usaha L): edit proyek, timeline/deadline reminder, progres milestone teragregasi, kaitan proyek ↔ sesi, tampil di laporan.
2. **Foto murid di laporan PDF** (usaha L): butuh field `ReportData` + wiring 26 layout.
3. **Piutang lintas bulan di board** (usaha M): `buildStudentPipeline` hanya melihat payment bulan terpilih.
4. **`avgDaysToPay` sebagai metrik UI** (usaha S): sekarang hanya proxy ke prompt AI.
5. **PDF tagihan vektor + progres per halaman** (usaha M): mengganti `toPng`/`addImage`.
6. **Prasyarat PDF memuat filter** (usaha S): header selalu "Semua Tagihan" & nama berkas tanpa `agingFilter`.
7. **3 kriteria ketahanan data tanpa bukti** (`README:96`) — di luar lingkup audit UI/UX.
8. **`scripts/check-md-links.mjs` masuk CI** (usaha S).
9. **`paymentRepo.test.ts`** (usaha M): menutup celah tes untuk perubahan `source`.
10. **`raporGrades` dirapikan** (usaha S): tabel ada tapi tak pernah dipakai UI sebelum G3-06/M-02 dikerjakan.

---

## 8. Pertanyaan balik ke pemilik (10)

| # | Pertanyaan | Konteks | Pilihan |
|---|---|---|---|
| **Q1** | Batas belanja AI: dihapus atau dipertahankan? | Keputusan #9 (tanpa batas) bertabrakan dengan **B4** yang dikunci `final` + `TASK-07` L5 + tes "anggaran terlampaui memblokir". | ✅ **Dijawab 2026-10-01 → mekanisme batas tetap, default kosong = tanpa batas.** Amandemen `ATURAN-AI:30` + `arsitektur/11:105`; tes blokir jadi opsional |
| **Q2** | "Simpan Sesi" di langkah 5: sejauh mana? | Sesi bisa selesai tanpa membuka langkah Bukti → data absensi (foto/TTD) jadi opsional; `captureSessionHelpers.test.ts:176` + `TASK-06` mengunci 6 langkah. | ✅ **Dijawab 2026-10-01 → boleh simpan di langkah 5, jumlah langkah tetap 6.** `STEP_META` tidak berubah; langkah 6 tetap menawarkan Bukti; +2 tes baru |
| **Q3** | Pipeline: posisinya di mana? | `TASK-05` L6 memerintahkan **membubarkan**; keputusan #10 mempertahankan. `TASK-05:267-274` mengunci **3 blok tetap** ("jangan improvisasi"). | ✅ **Dijawab 2026-10-01 → board hidup di dalam blok "Perlu ditagih"** (tidak menambah blok ke-4); L6 berubah *bubarkan* → *redesign* |
| **Q4** | Light-only: konfirmasi pencabutan `TASK-04` L6? | L6 sudah menuliskan nilai token dark lengkap; mencabutnya mengurangi pekerjaan. | ✅ **Dijawab 2026-10-01 → cabut L6, catat light-only permanen**, hapus project `mobile-dark`, selaraskan `README` + playbook |
| **Q5** | Tab murid: nama & isi? | `TASK-03:70` mengunci **Ringkas/Sesi/Nilai/Uang**; keputusan #7 minta tab proyek; keputusan #4 minta Progres = nilai + engagement. | ✅ **Dijawab 2026-10-01 → opsi A + varian:** peta tab = **Ringkas / Sesi / Progres / Proyek**; **Uang menjadi blok di dalam tab Ringkas** (bukan di Progres) — amandemen **A11**. Bila saat G3-06 muncul alasan kuat memindahkannya ke Progres → **angkat ke pemilik**, jangan improvisasi |
| **Q6** | "Ringkasan operasional selalu terlihat": dalam bentuk apa? | `TASK-03:53` memutuskan OperationalSnapshot **digabung** ke header "Hari Ini". | ✅ **Dijawab 2026-10-01 → opsi A:** ringkasan operasional **digabung ke header "Hari Ini"** (satu blok, selalu terlihat) — bukan blok terpisah. `G2-08` item B-04/B-05 menjadi aktif |
| **Q7** | Input 16 px vs skala tipografi 15 px | K4 mengunci 4 langkah (13/15/18/24); iOS zoom bila input <16 px. | ✅ **Dijawab 2026-10-01 → fokus Android, bukan iOS.** **A6 dicabut**: tidak ada aturan `@media (max-width: 640px) .input { font-size: 16px }`; token `body` tetap 15 px; **tidak ada pengecualian platform**. G2-05 berubah menjadi *verifikasi Android saja*. Bila Android Chrome menunjukkan zoom/geser → angkat ke pemilik |
| **Q8** | Konfirmasi `confirm()`/`prompt()` native: semua diganti? | `TASK-10` D4 memakai PIN untuk batal/undo/due; reset data memakai `prompt("RESET")`. | ✅ **Dijawab 2026-10-01 → opsi A:** **semua** `confirm()`/`prompt()` native diganti dialog internal (`Modal`/`ConfirmSheet`), termasuk kata konfirmasi "HAPUS DATA" yang diketik di dalam `Modal`. Dikerjakan di `G3-09` + `G3-10` |
| **Q9** | Urutan: refactor `TASK-01` atau fitur dulu? | `CaptureSession.tsx` (2.073) & `MonthlyReport.tsx` (2.296) dua-duanya target refactor yang belum tuntas; G3-01 & G3-05 menyentuh berkas itu. | ✅ **Dijawab 2026-10-01 → opsi C:** refactor **terbatas** hanya pada berkas yang akan disentuh (`CaptureSession.tsx` sebelum G3-01, `MonthlyReport.tsx` sebelum G3-05), dikunci sebagai amandemen **A12** di `TASK-01` §10. **Fitur tetap ditulis lengkap** di dokumen gelombang; yang menunggu ditandai ⏸, bukan dihapus. **Pelaksanaan 2026-10-04:** separuh pertama tuntas — `CaptureSession.tsx` **2.155 → 1.891** (commit `925e4ff`); angka 2.073/2.296 di kolom kiri adalah ukuran 2026-10-01 dan sudah basi (terukur 2026-10-04: **2.155** dan **2.351**). `MonthlyReport.tsx` tetap menunggu G3-05 |
| **Q11** | Apakah aturan refactor terbatas (Q9) juga berlaku untuk `Settings.tsx` (1.205, target ≤700), `StudentDetail.tsx` (1.068, target ≤800), dan `TagihanTab.tsx` (978, target ≤800)? Ketiganya disentuh Wave 3 (G3-02, G3-06, G3-09) dan targetnya masih terbuka di `TASK-01` §2 | Prinsip Q9 ("refactor berkas yang akan disentuh lebih dulu") menuntut ketiganya; instruksi Q9 awal hanya menyebut dua berkas | ✅ **Dijawab 2026-10-01 → opsi A:** aturan Q9 berlaku juga untuk ketiga berkas. Dikunci sebagai **A13** di [`kerja/TASK-01-refactor-layar-besar.md`](../kerja/TASK-01-refactor-layar-besar.md) §10 (daftar 5 berkas + wave-nya, target dari §2, tidak ada target baru) |
| **Q12** | Posisi `TASK-07` (`G3-04`) relatif `TASK-05`-laporan (`G3-05`): `ATURAN-AI` §4 mengunci urutan `04 → 08 → 09 → 06 → 05 → 07` ("`TASK-07` paling akhir"), tetapi panel hasil AI di laporan **butuh** `useAiAction` dari `TASK-07` | Dokumen gelombang memakai **G3-04 sebelum G3-05**; dampaknya hanya dua tugas itu | ✅ **Dijawab 2026-10-01 → opsi A:** `G3-04` sebelum `G3-05`. Dikunci sebagai **A14** di [`kerja/ATURAN-AI.md`](../kerja/ATURAN-AI.md) §4 (urutan baru + alasan). Urutan akhir gelombang 3: G3-01 → G3-02 → G3-03 → **G3-04 → G3-05** → G3-06 → G3-07 → G3-08 → G3-09 → G3-10 |
| **Q10** | Guard metrik UI: di CI atau manual? | `npm run e2e` dipakai CI; spec metrik menambah ±3 menit. | ✅ **Dijawab 2026-10-01 → opsi A:** skrip terpisah `npm run e2e:uiux` (`playwright.uiux.config.ts`), **tidak** masuk CI utama. `G1-11` memakai konfigurasi ini |

> **Status keputusan:** **Q1–Q12 sudah dijawab** (2026-10-01) dan dikunci di §1.2, §3, §5, serta di berkas kontrak
> (`ATURAN-AI.md` §1 + §4, `arsitektur/11`, `TASK-01` §10, `TASK-03`…`TASK-07`, `playbook`, `playwright.config.ts`).
> Ringkas: Q1 batas AI default kosong · Q2 simpan dari langkah 5 · Q3 papan pipeline di blok "Perlu ditagih" ·
> Q4 light-only permanen · Q5 tab Ringkas/Sesi/Progres/Proyek · Q6 ringkasan operasional digabung ke header "Hari Ini" ·
> Q7 fokus Android · Q8 semua dialog internal · Q9/Q11 refactor terbatas (5 berkas) · Q10 guard `e2e:uiux` terpisah ·
> Q12 `G3-04` sebelum `G3-05` (A14).
> **Tidak ada pertanyaan terbuka.** Eksekusi boleh berjalan penuh; bila muncul kontradiksi baru → catat **Q13+** dan angkat.
