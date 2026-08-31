# Analisis UI/UX Aplikasi Les Ko Lui

> Dokumen ini berisi analisis menyeluruh terhadap UI/UX aplikasi Les Ko Lui, dengan fokus rekomendasi penggunaan chart, bar, graph, dan elemen visual lain yang sesuai teori UI/UX.
>
> Status: sebagian besar checklist sudah diimplementasikan pada 2026-09-01 (lihat Section 15 untuk status per task). Task yang di-skip memerlukan analisa visual/gambar yang tidak didukung di lingkungan kerja AI ini.

---

## 1. Ringkasan Eksekutif

Aplikasi ini adalah PWA lokal-first untuk tutor privat IB. Secara fungsional sudah sangat kaya: manajemen murid, pencatatan sesi, laporan bulanan, penagihan, pengeluaran, IA/EE tracker, AI, dll.

Secara visual, aplikasi sudah punya fondasi yang baik:

- Komponen chart SVG custom sudah ada: `BarChart`, `LineChart`, `DonutChart`, `RatingIndicator`, `ProgressBar`, `ActivityRing`.
- Dashboard card `MetricCard` sudah konsisten.
- Penandaan tonal (merah/hijau/biru/kuning) sudah dipakai di banyak tempat.
- Aksesibilitas dasar sudah diperhatikan (`aria-label`, `role`, `aria-live`).

Namun, ada kesenjangan utama: banyak data numerik yang masih ditampilkan sebagai teks/card, padahal relasi antar-data (tren, proporsi, perbandingan) akan jauh lebih cepat tercerna kalau divisualisasikan dengan chart yang tepat. Beberapa chart yang sudah ada juga bisa diperkuat dengan teori data viz (Tufte, Cleveland & McGill) dan mobile UX.

---

## 2. Teori UI/UX yang Menjadi Acuan

| Teori / Prinsip | Implikasi untuk Les Ko Lui |
|---|---|
| **Nielsen #1: Visibility of System Status** | Setiap angka di dashboard harus punya konteks: naik/turun, target, atau batas waktu. |
| **Nielsen #5: Error Prevention** | Warning dibangun sebelum aksi merusak (mis. tutup bulan, hapus murid, edit sesi bulan tertutup). |
| **Hick's Law** | Jangan tampilkan terlalu banyak pilihan chart/filter sekaligus. Defaultkan ke view paling berguna. |
| **Progressive Disclosure** | Form wizard di `CaptureSession` sudah bagus; dashboard finansial bisa meniru pola ini. |
| **Gestalt: Proximity & Common Region** | Kelompokkan chart dengan label grup yang sama, jangan biarkan card berantakan. |
| **Fitts's Law / Thumb Zone** | PWA mobile: tombol aksi utama di bawah, chart harus bisa di-scroll horizontal, bukan dipaksakan masuk layar sempit. |
| **Tufte: Data-Ink Ratio** | Hapus dekorasi yang tidak menambah makna; gunakan warna hanya untuk encode data. |
| **Cleveland & McGill: Rank of Perception** | Perbandingan panjang (bar) > sudut (pie) > area. Gunakan bar/line untuk proporsi, donut hanya untuk proporsi sederhana. |
| **WCAG 2.1 AA** | Warna jangan satu-satunya penanda status; selalu ada ikon/teks/label. |

---

## 3. Analisis Per Layar & Rekomendasi Visual

### A. Home / Dashboard (`Home.tsx`, `OperationalSnapshot.tsx`, `TodayHero.tsx`)

#### Apa yang sudah baik

- `OperationalSnapshot` sudah pakai `MetricCard` + `ProgressBar` untuk progres hari ini & minggu ini.
- Alert strip "Perlu perhatian" adalah contoh information scent yang kuat.

#### Yang kurang & rekomendasi

| Area | Masalah | Rekomendasi |
|---|---|---|
| Status mingguan | `weekPct` hanya ditampilkan sebagai angka + progress bar. Tidak ada konteks historis. | Tambahkan sparkline mini (line chart tanpa axis) di card Minggu Ini untuk tren 4-6 minggu terakhir. |
| Murid aktif | Angka "X murid aktif" tidak punya tren. | Tambahkan donut mini "X/Y murid dengan jadwal aktual minggu ini" atau activity ring. |
| Sesi terlewat | Counter saja, tidak ada pola. | Tambahkan bar chart hari (Sen-Min) untuk distribusi missed sessions 30 hari terakhir. |
| Attention inbox | Daftar panjang di satu section. | Gunakan grouped list dengan icon + badge warna; pertimbangkan swipe action (mobile). |

#### Chart yang cocok

- `LineChart` (sparkline) untuk tren mingguan.
- `BarChart` untuk distribusi hari sesi terlewat.
- `ActivityRing` untuk rasio murid yang sudah terjadwal vs belum.

### B. Students (`Students.tsx`)

#### Apa yang sudah baik

- Statistik per murid sudah dihitung: `count`, `cost`, `hours` bulan ini.
- List murid aktif diurutkan berdasarkan jadwal terdekat (sangat berguna).

#### Yang kurang & rekomendasi

| Area | Masalah | Rekomendasi |
|---|---|---|
| List item murid | Hanya teks "X sesi - RpY - Z jam". | Tambahkan mini progress bar kecil di setiap baris untuk jam les vs rata-rata, atau status pembayaran. |
| Inactive tab | Tidak ada visual peringatan murid yang punya piutang. | Tambahkan badge amber/red jika murid non-aktif masih punya tagihan unpaid. |
| Statistik agregat | Tidak ada total bulanan di halaman ini. | Tambahkan 3 metric cards di atas: total sesi bulan ini, total jam, total pendapatan. Gunakan `MetricCard` yang sudah ada. |

#### Chart yang cocok

- `MetricCard` + `ProgressBar` di list.
- `DonutChart` kecil untuk rasio status pembayaran murid.

---

### C. Student Detail (`StudentDetail.tsx`, `EngagementSummary.tsx`)

#### Apa yang sudah baik

- `EngagementSummary` sudah pakai `RatingIndicator`, `BarChart`, `LineChart`, `DonutChart`.
- `EvidenceCard`, `StudyNoteCard`, `UpcomingSchedule` sudah memecah UI jadi chunk.

#### Yang kurang & rekomendasi

| Area | Masalah | Rekomendasi |
|---|---|---|
| Tab Sesi | Riwayat sesi berupa list panjang tanpa visual. | Tambahkan timeline vertical (atau `LineChart`) yang menunjukkan skor engagement per sesi. |
| Tab Rapor | Nilai rapor vs engagement score berdiri sendiri. | Buat scatter plot sederhana atau correlation bar chart: sumbu X = engagement, sumbu Y = grade delta. |
| Keseriusan Belajar | Bagus, tapi "Main HP %" bisa lebih visual. | Gunakan stacked bar 100% untuk proporsi perilaku positif vs negatif per mapel. |
| IA/EE Tracker | Milestones dalam list, tidak ada sense of progress. | Tambahkan horizontal progress bar per milestone group atau Gantt-like bar chart. |

#### Chart yang cocok

- `LineChart` dengan `areaFill` untuk tren engagement.
- `BarChart` horizontal untuk rata-rata engagement per mapel.
- `ProgressBar` bertingkat untuk IA/EE milestones.
- `RatingIndicator` untuk skor cepat (sudah ada, pertahankan).

---

### D. Capture Session (`CaptureSession.tsx`)

#### Apa yang sudah baik

- Wizard 6 langkah adalah penerapan progressive disclosure yang sangat baik.
- Engagement score dengan circular gauge / rating indicator.

#### Yang kurang & rekomendasi

| Area | Masalah | Rekomendasi |
|---|---|---|
| Stepper wizard | Stepper ada, tapi tidak menunjukkan progress secara visual. | Ubah stepper jadi horizontal progress bar atau numbered step indicator dengan fill state. |
| Engagement score | Skor 1-10 ditampilkan sebagai dots. | Tambahkan radial gauge kecil atau semi-circle gauge yang lebih intuitif untuk skor. |
| Durasi & biaya | Biaya live hanya teks. | Tambahkan slider visual untuk durasi dengan indikator biaya real-time. |
| Session brief | Informasi penting tapi bisa padat. | Gunakan cards dengan icon untuk "PR tertunda", "Follow-up", "Sesi terakhir". |

#### Chart yang cocok

- `ProgressBar` / step indicator untuk wizard.
- `RatingIndicator` (sudah ada) untuk engagement.
- `ActivityRing` untuk ringkasan PR/follow-up.

### E. Monthly Report (`MonthlyReport.tsx`)

#### Apa yang sudah baik

- 20+ tema x 27 layout, visual sangat kaya.
- AI narrative generation.

#### Yang kurang & rekomendasi

| Area | Masalah | Rekomendasi |
|---|---|---|
| Preview data | Sebelum generate report, tutor tidak melihat ringkasan data. | Tambahkan summary panel: total sesi, total jam, rata-rata engagement, tagihan. |
| Template picker | Banyak pilihan bisa membingungkan bila disajikan sebagai dropdown panjang. | Jumlah tema & layout TETAP dipertahankan. Susun ulang penyajiannya: tombol "Generate Desain Unik" (rotasi `pickTemplate()`), tombol "Acak Lagi", modal galeri dengan search + filter kategori, dan thumbnail preview. Semua kombinasi tetap bisa dipilih. |
| Trend bulanan | Tidak ada chart tren antar bulan. | Tambahkan line chart sesi/jam/pendapatan per bulan untuk satu murid. |

#### Chart yang cocok

- `BarChart` untuk ringkasan sesi per mapel.
- `LineChart` untuk tren 6/12 bulan.
- `DonutChart` untuk proporsi mapel.

---

### F. Payments (`Payments.tsx`, `RingkasanTab.tsx`, `AuditTab.tsx`)

#### Apa yang sudah baik

- `RingkasanTab` sudah pakai `LineChart` (tren kas masuk vs pengeluaran), `BarChart` (potensi per murid), `DonutChart` (pengeluaran per kategori).
- `AuditTab` punya tabel tahunan yang bagus.

#### Yang kurang & rekomendasi

| Area | Masalah | Rekomendasi |
|---|---|---|
| Status tagihan | 4 cards di atas cukup, tapi tidak ada "cash flow runway". | Tambahkan waterfall chart sederhana: Potensi -> Tagihan -> Dibayar -> Piutang. |
| Piutang aging | Hanya teks "X bln". | Gunakan bar chart horizontal dengan warna bertingkat: 0-30 hari hijau, 31-60 kuning, >60 merah. |
| Tren pendapatan | `LineChart` sudah bagus, tapi bisa diperkaya. | Tambahkan tooltip interaktif (SVG saja, tanpa library) dengan nominal saat hover. |
| Kolektibilitas | `collectionRate` ada tapi tidak divisualisasikan. | Tambahkan `ProgressBar` dengan threshold: <70% merah, 70-90% kuning, >90% hijau. |

#### Chart yang cocok

- `LineChart` dengan area fill (sudah ada, tinggal diperkaya tooltip).
- `BarChart` horizontal untuk piutang aging.
- `ProgressBar` dengan `thresholds` untuk collection rate.
- `DonutChart` untuk kategori pengeluaran (sudah ada).

---

### G. Settings (`Settings.tsx`)

#### Apa yang sudah baik

- Accordion section mengurangi cognitive load.
- Storage usage dengan progress bar.

#### Yang kurang & rekomendasi

| Area | Masalah | Rekomendasi |
|---|---|---|
| Storage usage | Progress bar saja, tidak ada trend. | Tambahkan line chart mini penggunaan storage 30 hari terakhir (jika data tersedia). |
| Audit log | Teks list, sulit scan. | Gunakan timeline visual dengan icon per kategori aksi. |
| PIN / security | Password strength sudah ada sebagai teks + persen. | Pertahankan; bisa diperkuat menjadi bar bertingkat dengan label kategori. |

---

## 4. Rekomendasi Khusus: Chart/Bar/Graph yang Tepat

### a. Gunakan Bar Chart untuk perbandingan & ranking

- Potensi per murid (sudah ada).
- Jam les per murid.
- Piutang aging.
- Rata-rata engagement per mapel.

Alasan: Manusia paling cepat membandingkan panjang bar (Cleveland & McGill).

### b. Gunakan Line Chart untuk tren waktu

- Kas masuk vs pengeluaran 12 bulan (sudah ada).
- Tren engagement per sesi.
- Tren jumlah sesi per bulan.

Alasan: Line chart unggul untuk menunjukkan perubahan kontinu.

### c. Gunakan Donut Chart secara hemat & selalu dengan label

- Pengeluaran per kategori (sudah ada).
- Proporsi mapel yang diajar.
- Status pembayaran (paid/unpaid).

Alasan: Donut lebih baik dari pie karena sudut lebih mudah dibaca, tapi tetap terbatas untuk <6 segmen. Selalu tampilkan legend + persentase.

### d. Gunakan Progress Bar / Activity Ring untuk target & status

- Progress hari ini / minggu ini (sudah ada).
- Collection rate.
- Storage usage.
- Tutup bulan status.

Alasan: Memberi sense of completion dan urgency.

### e. Hindari Pie Chart 3D, gradient berlebihan, atau "chart junk"

- Aplikasi ini sudah cukup minimalis; jangan tambahkan shadow/3D/gradient yang tidak perlu.
- Warna hanya untuk encode data, bukan dekorasi.

---

## 5. Rekomendasi Non-Chart yang Penting

### A. Konsistensi Ikon

- Saat ini banyak ikon emoji (mis. emoji api, emoji target, emoji wajah netral). Untuk aksesibilitas & profesionalisme, pertimbangkan migrasi ke SVG icon set konsisten (Heroicons, Lucide, atau Phosphor). Emoji tetap boleh untuk "human touch" di laporan, tapi jangan untuk UI navigasi utama.

### B. Typography Hierarchy

- Banyak teks `text-xs` / `text-[11px]`. Pastikan heading level jelas: `h1` untuk judul halaman, `h2` untuk section title, `h3` untuk card title.
- Jarak antar-section bisa ditambahkan sedikit untuk breathing room (Gestalt proximity).

### C. Mobile Responsiveness

- Beberapa tabel (misal `AuditTab`) di-hide di mobile. Ini boleh, tapi berikan card view alternatif yang lebih scanable.
- Chart SVG sudah `viewBox` - bagus. Tapi pastikan `height` dinamis berdasarkan viewport, tidak fixed besar.

### D. Empty States

- Banyak pesan "Belum ada data...". Ubah menjadi empty state illustration + CTA (contoh: "Belum ada sesi. Catat sesi pertama." dengan tombol primary).

### E. Feedback & Loading

- Skeleton sudah ada. Pastikan setiap layar yang fetch data pakai `Skeleton` konsisten, tidak ada tiba-tiba layout shift.

---

## 6. Quick Wins & Prioritas Implementasi

### P0 - Implementasi cepat, impact besar

1. Tambahkan mini sparkline di `OperationalSnapshot` untuk tren mingguan.
2. Perkaya `LineChart` dengan tooltip interaktif (SVG hover) di `RingkasanTab`.
3. Tambahkan `ProgressBar` dengan thresholds untuk collection rate di `TagihanTab`.
4. Ganti empty state teks menjadi card dengan CTA di 3 halaman utama.

### P1 - Perkuat analitik

5. Tambahkan `LineChart` tren engagement per sesi di `StudentDetail`.
6. Tambahkan `BarChart` horizontal piutang aging di `AuditTab`.
7. Tambahkan `DonutChart` status pembayaran di `RingkasanTab`.

### P2 - Polish & konsistensi

8. Migrasi ikon emoji ke SVG di komponen utama.
9. Tambahkan step indicator visual di `CaptureSession`.
10. Tambahkan Gantt-like progress bar untuk IA/EE milestones.

---

## 7. Deliverables

Masing-masing deliverable bisa jadi 1 commit/PR kecil:

1. **PR-1:** Sparkline & metric card enhancement di Home.
2. **PR-2:** Tooltip interaktif + collection rate progress bar di Payments.
3. **PR-3:** Engagement trend chart + empty states di StudentDetail.
4. **PR-4:** Piutang aging bar chart + payment status donut di AuditTab/TagihanTab.
5. **PR-5:** Step indicator visual di CaptureSession.

Saran: Mulai dari PR-1 dan PR-2 karena komponen chart sudah ada dan impact-nya langsung terasa di dashboard utama serta keuangan.

---

## 8. Catatan Khusus Template Picker (Keputusan User)

- Jumlah tema & layout (20+ tema x 27 layout) HARUS tetap dipertahankan. Jangan mengurangi.
- Tujuannya: laporan selalu unik dengan berbagai jenis tampilan yang berbeda.
- Agar UX tetap produktif tanpa mengurangi pilihan, gunakan pendekatan penyajian berlapis:
  - Tombol default: "Generate Desain Unik" menggunakan rotasi `pickTemplate()` yang sudah menjamin no-repeat dan tidak back-to-back tema yang sama.
  - Tombol bantu: "Acak Lagi" untuk memanggil `pickTemplate()` lagi.
  - Modal galeri dengan search + filter kategori: Classic, Visual, Analytic, Modern, Formal, Playful.
  - Thumbnail preview dengan sample data (tanpa AI call).
  - Blacklist tema per murid (sudah ada via `settings.templatePref.excludedThemeIds`).
- Setiap kombinasi tema x layout tetap bisa dipilih manual.

---

## 9. Catatan Khusus Export PDF/JPG/PNG

Masalah yang perlu dijamin tidak terjadi:

1. Font tema tidak terbawa saat rasterisasi (hasil export jatuh ke font sistem).
2. Konten overflow / terpotong di rasio tetap.
3. Rasio PDF berbeda dengan JPG/PNG.
4. Layout tertentu tidak cocok untuk narasi panjang / banyak foto.
5. Tidak ada smoke test per layout.

Aturan pipeline export:

- Font tema harus di-embed (`getFontEmbedCSS`) dengan fallback aman + timeout; jangan biarkan export gagal total saat embed gagal.
- JPG/PNG memakai rasio `3:4` (default) agar tidak terpotong di WhatsApp; PDF memakai `auto`.
- Setiap layout harus punya metadata `supportedRatios` di interface `Layout`; jika rasio aktif tidak didukung layout, fallback ke `auto` + console warning.
- Lakukan pre-flight overflow detection (bandingkan `scrollHeight` vs `clientHeight` per `[data-report-page]`) sebelum rasterize. Halaman dengan kelas `.report-page-grow` dikecualikan.
- Rebalance konten (`rebalance.ts`) tetap menjadi mekanisme utama memindah entri antar halaman; overflow detection hanya jaring pengaman.
- Tambahkan smoke test render untuk setiap layout (unit test, tanpa pixel-perfect assertion).
- Tambahkan Playwright test export per ratio untuk 3 layout representatif (`cards`, `infographic`, `analytics`) x 3 format (JPG/PNG/PDF) x 2 rasio (3:4/auto).

---

## 10. Command Eksplisit untuk Pengembangan (PowerShell)

### Starter setiap sesi kerja

```powershell
cd "c:\Users\lieml\Desktop\Big Personal Web App\Private Tutor\les-ko-lui"
git status
npm run test
npm run build
```

### Akhir setiap milestone

```powershell
cd "c:\Users\lieml\Desktop\Big Personal Web App\Private Tutor\les-ko-lui"
npm run test
npm run build
npx playwright test --project=chromium
```

### Jika TypeScript error

```powershell
cd "c:\Users\lieml\Desktop\Big Personal Web App\Private Tutor\les-ko-lui"
npx tsc --noEmit -p tsconfig.app.json
```

### Dev server untuk e2e

```powershell
cd "c:\Users\lieml\Desktop\Big Personal Web App\Private Tutor\les-ko-lui"
npm run dev
```

Lalu di terminal baru:

```powershell
cd "c:\Users\lieml\Desktop\Big Personal Web App\Private Tutor\les-ko-lui"
npx playwright test
```

Catatan eksekusi:

- Selalu jalankan perintah dari folder `les-ko-lui` (bukan root repo).
- Jangan gunakan pager interaktif; tambahkan flag non-interaktif bila perlu.
- Jika `npm run build` gagal karena error TypeScript, perbaiki dulu sebelum lanjut.
- Playwright test yang butuh dev server: jalankan dev server di terminal terpisah, atau gunakan config yang sudah ada di `playwright.config.ts`.

---

## 11. Guardrails untuk AI

1. Jangan hapus file tanpa konfirmasi.
2. Jangan ubah `package.json` untuk menambah library; pakai komponen chart SVG yang sudah ada.
3. Jangan bikin placeholder - kode harus lengkap dan runnable.
4. Setelah edit, jalankan `npm run build` sebelum lanjut task berikutnya.
5. Jika test gagal, perbaiki sebelum commit.
6. Jangan ubah data model (`db/types.ts`, `db/db.ts`) tanpa alasan kuat.
7. Semua path absolute - jangan pakai path relatif.
8. Pertahankan jumlah tema & layout; jangan kurangi.
9. Jangan mengubah perilaku `pickTemplate()` kecuali diperintahkan.
10. Ikuti konvensi di `10-conventions-and-pitfalls.md`.

---

## 12. File Target Utama

| Area | File |
|---|---|
| Chart components | `les-ko-lui/src/components/charts/BarChart.tsx` |
| | `les-ko-lui/src/components/charts/LineChart.tsx` |
| | `les-ko-lui/src/components/charts/DonutChart.tsx` |
| | `les-ko-lui/src/components/charts/RatingIndicator.tsx` |
| | `les-ko-lui/src/components/charts/ProgressBar.tsx` |
| Dashboard helpers | `les-ko-lui/src/components/dashboard/MetricCard.tsx` |
| | `les-ko-lui/src/components/dashboard/ActivityRing.tsx` |
| Screens | `les-ko-lui/src/screens/home/Home.tsx` |
| | `les-ko-lui/src/screens/home/OperationalSnapshot.tsx` |
| | `les-ko-lui/src/screens/Students.tsx` |
| | `les-ko-lui/src/screens/StudentDetail.tsx` |
| | `les-ko-lui/src/screens/studentDetail/EngagementSummary.tsx` |
| | `les-ko-lui/src/screens/CaptureSession.tsx` |
| | `les-ko-lui/src/screens/MonthlyReport.tsx` |
| | `les-ko-lui/src/screens/Payments.tsx` |
| | `les-ko-lui/src/screens/payments/RingkasanTab.tsx` |
| | `les-ko-lui/src/screens/payments/TagihanTab.tsx` |
| | `les-ko-lui/src/screens/payments/AuditTab.tsx` |
| | `les-ko-lui/src/screens/Settings.tsx` |
| Template & export | `les-ko-lui/src/template/types.ts` |
| | `les-ko-lui/src/template/layouts/index.ts` |
| | `les-ko-lui/src/template/layouts/classic.tsx` |
| | `les-ko-lui/src/template/layouts/visual.tsx` |
| | `les-ko-lui/src/template/layouts/analytic.tsx` |
| | `les-ko-lui/src/template/layouts/modern.tsx` |
| | `les-ko-lui/src/template/ReportRenderer.tsx` |
| | `les-ko-lui/src/template/rebalance.ts` |
| | `les-ko-lui/src/lib/exportReport.ts` |
| | `les-ko-lui/src/lib/rotation.ts` |

---

## 13. TODO Checklist Eksekusi (untuk AI)

Format setiap task: ID / File / Goal / Acceptance / Do NOT.

### Milestone A - Metadata & Compatibility Matrix

**A-1 - Tambahkan metadata compatibility ke interface `Layout`**

- File: `les-ko-lui/src/template/types.ts`
- Goal: tambah 4 field opsional ke interface `Layout`:
  - `supportedRatios?: ("3:4" | "auto")[]`
  - `recommendedPhotoCount?: { min?: number; max?: number }`
  - `supportsLongNarrative?: boolean`
  - `categories?: ("classic" | "visual" | "analytic" | "modern" | "formal" | "playful")[]`
- Acceptance: `npm run build` lolos tanpa error TypeScript.
- Do NOT: jangan ubah signature `render`.

**A-2 - Isi metadata semua layout**

- File: `les-ko-lui/src/template/layouts/classic.tsx`, `visual.tsx`, `analytic.tsx`, `modern.tsx`
- Goal: isi `supportedRatios`, `categories`, `supportsLongNarrative`, `recommendedPhotoCount` untuk setiap layout yang diexport dari file tersebut (total 27 layout termasuk `infographic` dan `cover` di `modern.tsx`).
- Default jika ragu: `supportedRatios: ["3:4", "auto"]`, `categories: ["classic"]`, `supportsLongNarrative: true`, `recommendedPhotoCount: { max: 10 }`.
- Panduan kategori: classic.tsx -> `["classic"]`, visual.tsx -> `["visual"]`, analytic.tsx -> `["analytic"]`, modern.tsx -> `["modern"]`. Layout formal (minimal, executive-style) dapat tambah `"formal"`; layout playful (scrapbook, candy) dapat tambah `"playful"`.
- Acceptance: semua layout punya metadata; `npm run build` lolos.
- Do NOT: jangan hapus atau ubah function `render` layout mana pun.

### Milestone B - Export Pipeline Hardening

**B-1 - Font embedding fallback**

- File: `les-ko-lui/src/lib/exportReport.ts`
- Goal: bungkus pemanggilan `getFontEmbedCSS` dengan timeout 5 detik (mis. `Promise.race`); jika gagal/timeout, lanjut tanpa embed (jangan throw).
- Acceptance: export tetap sukses saat embed gagal; tidak ada error "Font not found" yang menggagalkan export.
- Do NOT: jangan hapus flow `fontEmbedCSS` existing.

**B-2 - Pre-flight overflow detection**

- File: `les-ko-lui/src/lib/exportReport.ts`
- Goal: buat fungsi internal `detectOverflow(root)` yang membandingkan `el.scrollHeight > el.clientHeight + 4` untuk setiap `[data-report-page]`; panggil di `rasterizePages` sebelum loop raster. Abaikan halaman yang memakai kelas `.report-page-grow` atau id `COVER_PAGE_ID`. Jika ada overflow, throw `Error` dengan pesan jelas menyebut halaman dan jumlah px overflow.
- Acceptance: export gagal dengan pesan jelas saat overflow terjadi; export normal tidak terpengaruh.
- Do NOT: jangan auto-fix overflow via CSS; jangan ubah perilaku `report-page-grow`.

**B-3 - Ratio consistency validation**

- File: `les-ko-lui/src/template/ReportRenderer.tsx` + `les-ko-lui/src/screens/MonthlyReport.tsx`
- Goal: di `ReportRenderer`, setelah resolve `layout`, cek `layout.supportedRatios`. Jika tidak memuat `pageRatio` aktif, paksa `pageRatio = "auto"` dan `console.warn`. `MonthlyReport.tsx` tidak perlu diubah bila `ReportRenderer` sudah menerima `layout` (sudah menerima `layoutId`, resolve internal).
- Acceptance: layout yang tidak support `3:4` tidak menghasilkan konten terpotong saat export JPG/PNG.
- Do NOT: jangan hapus kelas `report-ratio-3-4`; jangan ubah default ratio `3:4`.

### Milestone C - Smart Template Picker UI

**C-1 - Filter & kategori layout**

- File: `les-ko-lui/src/screens/MonthlyReport.tsx`
- Goal: tambahkan UI penyajian template berlapis: tombol "Generate Desain Unik" (memanggil `pickTemplate(studentId)` lalu apply), tombol "Acak Lagi", dan modal galeri dengan search input + filter chips kategori (All, Classic, Visual, Analytic, Modern, Formal, Playful) yang membaca `layout.categories`. Grid hasil filter menampilkan seluruh kombinasi tema x layout yang lolos filter (tetap lengkap).
- Acceptance: semua tema & layout tetap bisa dipilih; tidak ada dropdown panjang sebagai satu-satunya akses; "Acak Lagi" selalu menghasilkan kombinasi valid.
- Do NOT: jangan hapus fungsi `pickTemplate`; jangan kurangi tema/layout; jangan ubah logika rotasi.

**C-2 - Thumbnail preview sample data**

- File: `les-ko-lui/src/template/sampleData.ts` (baru) + `les-ko-lui/src/screens/MonthlyReport.tsx`
- Goal: buat `SAMPLE_REPORT_DATA: ReportData` (3-5 entri dummy, tanpa foto Blob agar ringan). Di modal galeri, render preview mini per kombinasi terpilih dengan `ReportRenderer` dalam container `transform: scale(0.25)` dan `pointer-events: none`.
- Acceptance: thumbnail render tanpa error; tidak ada AI call saat preview; preview tidak mengganggu interaksi (pointer-events none).
- Do NOT: jangan panggil AI untuk preview; jangan render 540 thumbnail sekaligus (render on-demand per kombinasi yang diklik).

### Milestone D - Test & Smoke Suite

**D-1 - Unit test render semua layout**

- File: `les-ko-lui/src/__tests__/reportLayouts.test.tsx` (perluas yang sudah ada bila ada)
- Goal: loop semua `LAYOUTS` dari `src/template/layouts`, render `ReportRenderer` dengan `SAMPLE_REPORT_DATA` + tema pertama, untuk `pageRatio: "3:4"` dan `"auto"`; assert tidak throw dan menghasilkan minimal 1 node `[data-report-page]`.
- Acceptance: `npm run test` lolos untuk semua layout.
- Do NOT: jangan hapus test existing; jangan buat assertion pixel-perfect.

**D-2 - Playwright export per ratio**

- File: `les-ko-lui/e2e/report-export-ratio.spec.ts` (baru)
- Goal: seed dummy data (lihat `src/dev/seedDummy.ts` untuk pola), buka halaman report untuk satu murid, pilih layout `cards`, `infographic`, `analytics`, klik export JPG / PNG / PDF, verifikasi tidak ada pageerror dan pesan sukses muncul.
- Acceptance: minimal 3 layout x 3 format = 9 skenario lolos; rasio 3:4 untuk JPG/PNG dan auto untuk PDF terverifikasi.
- Do NOT: jangan buat test bergantung AI; jangan jalankan tanpa dev server bila config mensyaratkan.

**D-3 - Test overflow detection**

- File: `les-ko-lui/src/__tests__/exportReport.test.ts` (baru)
- Goal: unit test `detectOverflow` dengan mock DOM (element dengan `scrollHeight` > `clientHeight`); assert hasil mengandung id halaman dan px overflow. Export `detectOverflow` dari modul untuk keperluan test (named export) tanpa mengubah perilaku internal.
- Acceptance: `npm run test` lolos.
- Do NOT: jangan import DOM browser di test unit jika environment tidak support; gunakan mock.

### Milestone E - Dashboard Chart Quick Wins

**E-1 - Sparkline tren mingguan di Home**

- File: `les-ko-lui/src/screens/home/OperationalSnapshot.tsx` + `les-ko-lui/src/screens/home/Home.tsx`
- Goal: tambah prop opsional `weeklyTrend?: number[]` (4-6 nilai, % progres per minggu). Di `Home.tsx`, hitung dari `currentWeekSessions` + riwayat minggu sebelumnya. Di card "Minggu Ini", render `LineChart` mini: `series={[{ label: "Progres", data: weeklyTrend.map((y, i) => ({ x: String(i), y })) }]}`, `height={40}`, `showAxes={false}`.
- Acceptance: sparkline muncul hanya bila data >= 2 minggu; layout mobile tidak rusak.
- Do NOT: jangan hapus progress bar existing; jangan tambah library baru.

**E-2 - Collection rate progress bar di TagihanTab**

- File: `les-ko-lui/src/screens/payments/TagihanTab.tsx`
- Goal: render `ProgressBar` dari `components/charts` untuk `collectionRate` dengan `thresholds={[{ pct: 90, tone: "green" }, { pct: 70, tone: "amber" }]}` dan default tone `red`; label "Kolektibilitas", detail "X dari Y invoice lunas".
- Acceptance: bar muncul di section ringkasan tagihan; warna berubah sesuai threshold.
- Do NOT: jangan ubah logika penagihan atau perhitungan `collectionRate`.

**E-3 - Engagement trend chart di StudentDetail**

- File: `les-ko-lui/src/screens/studentDetail/EngagementSummary.tsx`
- Goal: tambah `LineChart` dengan `areaFill` untuk tren skor 15 sesi terakhir (`recentEng.map((s, i) => ({ x: String(i + 1), y: s.engagement?.score ?? 0 }))`), `height={120}`, hanya bila `recentEng.length >= 3`. Letakkan di bawah summary row.
- Acceptance: chart muncul; tidak merusak per-mapel breakdown dan pagination existing.
- Do NOT: jangan hapus per-mapel breakdown; jangan ubah logika skor.

---

### Urutan eksekusi yang disarankan

A-1 -> A-2 -> B-1 -> B-2 -> B-3 -> D-1 -> D-3 -> C-1 -> C-2 -> D-2 -> E-1 -> E-2 -> E-3

Setiap task diakhiri dengan verifikasi:

```powershell
cd "c:\Users\lieml\Desktop\Big Personal Web App\Private Tutor\les-ko-lui"
npm run test
npm run build
```

---

## 14. Referensi Silang

- Build guide utama: `README.md` (root repo `Private Tutor/`).
- Data model: `02-data-model.md`.
- Capture flow: `03-capture-flow.md`.
- Template engine: `04-template-engine.md`.
- Rotation logic: `05-rotation-logic.md`.
- Export & share: `07-export-and-share.md`.
- Konvensi & pitfalls: `10-conventions-and-pitfalls.md`.
- Audit checklist: `les-ko-lui/AUDIT-CHECKLIST.md`.

---

## 15. Status Implementasi Checklist (2026-09-01)

Verifikasi: `npm run test` (376/376 hijau), `npm run build` sukses, `npx eslint` pada file yang diubah bersih (0 error), Playwright e2e `report-export-ratio.spec.ts` 3/3 lulus di chromium (Cards, Infografis Expert, Analitik × JPG/PNG/PDF).

| Task | Status | Catatan |
|---|---|---|
| A-1 Metadata `Layout` | ✅ DONE | 4 field opsional ditambahkan di `src/template/types.ts`. |
| A-2 Metadata semua layout | ✅ DONE | Terpusat di `src/template/layouts/meta.ts` + digabung di `index.ts` (`mergeLayoutMeta`). 27 layout tercakup. |
| B-1 Font embedding fallback | ✅ DONE | Timeout 5 detik via `Promise.race` di `exportReport.ts`; gagal embed → export tetap jalan. |
| B-2 Pre-flight overflow detection | ✅ DONE | `detectOverflow()` di `exportReport.ts`; dipanggil sebelum raster; halaman `.report-page-grow` & cover dikecualikan. |
| B-3 Ratio consistency validation | ✅ DONE | `ReportRenderer` fallback ke `auto` + `console.warn` bila layout tidak mendukung rasio aktif. |
| C-1 Filter & kategori layout | ✅ DONE | Dropdown `<select>` diganti grid chips + filter kategori (Semua/Classic/Visual/Analytic/Modern/Formal/Playful) di `MonthlyReport.tsx`. Semua layout tetap bisa dipilih. |
| C-2 Thumbnail preview sample data | ✅ DONE | `src/template/sampleData.ts` (`SAMPLE_REPORT_DATA` 4 entri, tanpa foto) + modal preview on-demand per layout (tombol 👁 di tiap chip) via komponen `ScaledPreview` (scale 0.5, `pointer-events: none`, ResizeObserver). Tanpa AI, bukan render 540 thumbnail. |
| D-1 Unit test render semua layout | ✅ DONE | Test baru di `reportLayouts.test.tsx`: metadata + render semua layout di rasio 3:4 & auto tanpa crash. |
| D-2 Playwright export per ratio | ✅ DONE | `e2e/report-export-ratio.spec.ts`: 3 layout representatif (Cards/Infografis Expert/Analitik) × JPG(3:4)/PNG(3:4)/PDF(auto) — 9 export diverifikasi via event download + ekstensi file + tombol re-enabled + tanpa "Gagal ekspor" + tanpa pageerror. 3/3 lulus. |
| D-3 Test overflow detection | ✅ DONE | `src/__tests__/exportReport.test.ts` baru (3 test, mock DOM). |
| E-1 Sparkline tren mingguan Home | ✅ DONE | Prop `weeklyTrend` di `OperationalSnapshot` + kalkulasi 4 minggu di `Home.tsx`. |
| E-2 Collection rate progress bar | ✅ DONE | `ProgressBar` thresholds (<70 merah, 70–89 amber, ≥90 hijau) di `TagihanTab.tsx`. |
| E-3 Engagement trend chart | ✅ DONE | `LineChart` area-fill 15 sesi terakhir di `EngagementSummary.tsx` (muncul jika ≥3 data). |

### File yang diubah/ditambahkan

- `src/template/types.ts` — field metadata `Layout`.
- `src/template/layouts/meta.ts` (baru) — peta kompatibilitas + `mergeLayoutMeta`.
- `src/template/layouts/index.ts` — terapkan metadata ke `LAYOUTS`/`getLayout`.
- `src/template/ReportRenderer.tsx` — fallback rasio `auto`.
- `src/lib/exportReport.ts` — `detectOverflow` + timeout font embed.
- `src/screens/MonthlyReport.tsx` — galeri layout berfilter (C-1) + modal preview `ScaledPreview` (C-2).
- `src/screens/home/Home.tsx` + `OperationalSnapshot.tsx` — sparkline mingguan (E-1).
- `src/screens/payments/TagihanTab.tsx` — kolektibilitas ProgressBar (E-2).
- `src/screens/studentDetail/EngagementSummary.tsx` — tren engagement (E-3).
- `src/__tests__/reportLayouts.test.tsx` (diperluas) + `src/__tests__/exportReport.test.ts` (baru).
- `src/template/sampleData.ts` (baru) — data contoh untuk preview galeri & unit test (C-2).
- `e2e/report-export-ratio.spec.ts` (baru) — smoke test export 3 layout × 3 format (D-2).

