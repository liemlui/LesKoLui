# UI/UX Depth Audit — Les Ko Lui v1.70.0

> **Tanggal audit:** 2026-09-04
> **Metode:** inspeksi kode statis (289 file) — heuristik Nielsen, WCAG 2.1 AA, Fitts's Law, standar touch target Material/Apple HIG, praktik mobile-PWA.
> **Cakupan:** `src/App.tsx`, `src/index.css`, 8 layar utama (`home/*`, `Students`, `StudentDetail`, `CaptureSession`, `MonthlyReport`, `Payments/*`, `CatatanBelajar`, `Settings`), 20+ komponen shared, `index.html`, `vite.config.ts` (PWA manifest), `components/BottomNav` & navigasi.
> **Hubungan dengan dokumen lain:** melengkapi `docs/UI-UX-ANALYSIS.md` (fokus data-viz/chart) dan `AUDIT-CHECKLIST.md` (fokus keamanan/teknis). Audit ini mengaudit **interaksi, navigasi, aksesibilitas, dan design system** — area yang belum pernah diaudit.
> **Status:** ✅ Fase 1 selesai: perbaikan quick wins utama untuk bottom nav, safe-area, dan modal shell sudah dieksekusi. Rencana perbaikan lanjutan masih ada di bagian akhir.

---

## Ringkasan Eksekutif

Aplikasi punya fondasi interaksi yang kuat: modal dengan focus-trap, toast dengan `aria-live`, PIN lockout, z-index terpusat, skeleton loader, dan empty state informatif. Namun audit menemukan **4 temuan kritis** (bug visual & hambatan usability nyata), **7 temuan tinggi** (aksesibilitas & ergonomi mobile), dan **8 temuan sedang** (arsitektur informasi & design system) — ditambah temuan performa/housekeeping berdampak kecil.

**Tiga temuan paling penting:**

1. Ikon "Keuangan" di bottom nav adalah **ikon jam** — salah metafora, membingungkan.
2. **Safe-area iOS tidak ditangani** — di iPhone ber-notch, nav & banner tertutup home indicator/status bar.
3. **Strip versi di bottom nav merusak kalkulus tinggi nav** → konten terbawah layar tersembunyi ±16px, dan bar CTA wizard menimpa nav.

Legend severitas: 🔴 Kritis · 🟠 Tinggi · 🟡 Sedang · 🟢 Rendah.

---

## 🔴 KRITIS — Bug & hambatan usability langsung

### K1. Ikon "Keuangan" di BottomNav adalah ikon jam ⏰
- **Lokasi:** `src/components/BottomNav.tsx:37-43`
- **Masalah:** SVG `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>` adalah ikon jam, tapi labelnya "Keuangan". Melanggar Nielsen #2 (*match between system and real world*) — pengguna baru akan menyangka itu "Riwayat/Jadwal".
- **Fix:** ganti SVG ke ikon dompet/uang (wallet / banknote), stroke 1.8, 24px grid, konsisten dengan ikon lain di nav.

### K2. Safe-area inset iOS tidak ditangani sama sekali
- **Lokasi:** `index.html:6` (`viewport-fit=cover`), seluruh kodebase.
- **Masalah:** `viewport-fit=cover` sudah di-set, tapi **tidak ada satu pun** penggunaan `env(safe-area-inset-*)` (verifikasi: pencarian regex 0 hasil). Dampak di iPhone ber-notch/Dynamic Island:
  - `BottomNav` (`fixed bottom-0`) tertutup home indicator → item nav sulit ditap.
  - Toast (`top-4`), banner offline, banner storage (`fixed top-0`) tertutup status bar/notch.
- **Fix:** `padding-bottom: env(safe-area-inset-bottom)` di `<nav>` BottomNav; `padding-top: env(safe-area-inset-top)` pada kontainer banner top; idealnya digabung dengan CSS var `--bottom-nav-h` (lihat K3).

### K3. Strip versi di BottomNav merusak kalkulus tinggi nav
- **Lokasi:** `src/components/BottomNav.tsx:64`, `src/App.tsx:152`, `src/screens/CaptureSession.tsx:1467`
- **Masalah:** `<p>{APP_VERSION}</p>` menambah ~16px di bawah `h-16`, sehingga tinggi nav aktual ≈ 80px, padahal:
  - Container `App.tsx:152` hanya `pb-16` (64px) → **konten terbawah layar Students/Settings/MonthlyReport/Payments tersembunyi ±16px di balik nav** (Screens mengompensasi sendiri-sendiri: Home `pb-20`, CaptureSession `pb-36` — tidak konsisten).
  - Bar CTA wizard `CaptureSession.tsx:1467` dipasang `fixed bottom-16` (64px) → **menimpa strip versi nav**.
- **Fix:**
  1. Pindahkan nomor versi ke Settings (sudah ada ChangelogModal — versi cukup tampil di sana).
  2. Standarkan tinggi nav 64px via CSS var: `:root { --bottom-nav-h: 64px; }` + `padding-bottom: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 16px)` di container Layout.
  3. Hapus `pb-20`/`pb-36` ad-hoc per layar.

### K4. Tiga sistem feedback yang tumpang tindih
- **Lokasi:** `src/components/ToastProvider.tsx` + `Toast.tsx` (atas layar), `src/App.tsx:190-194` (`flash`, bawah), pesan lokal per-layar (`CaptureSession.tsx:565`, `Payments.tsx:209/566`, `MonthlyReport.tsx:1073`).
- **Masalah:** posisi, warna, dan perilaku feedback tidak konsisten antar layar; user belajar ulang pola di tiap konteks. Toast di `top-4` juga menutupi header/breadcrumb.
- **Fix:** konsolidasi ke satu toast system (sudah ada ToastProvider — perluas). Pindahkan posisi default ke **bawah (di atas nav, `bottom-20` + safe-area)** — reachable thumb zone & tidak menutupi header. `flash` tinggal wrapper ke toast.

---

## 🟠 TINGGI — Aksesibilitas & ergonomi mobile

### A1. Elemen klik non-semantik (div onClick)
- **Lokasi:**
  - `src/screens/StudentDetail.tsx:725` (kartu sesi — `div onClick` pembuka detail modal)
  - `src/screens/studentDetail/UpcomingSchedule.tsx:62`
  - `src/screens/CaptureSession.tsx:566` (dismiss pesan)
  - `src/screens/MonthlyReport.tsx:1073` (dismiss pesan)
  - `src/screens/Payments.tsx:209,566` (dismiss pesan)
- **Masalah:** `<div onClick>` tanpa `role="button"`, `tabIndex`, atau handler keyboard → tidak fokusabel, tidak bisa dioperasikan keyboard/screen reader (gagal WCAG 2.1.1 Keyboard, 4.1.2 Name-Role-Value).
- **Fix:** ganti ke `<button type="button">` (dengan `w-full text-left` bila layout kartu), atau buat komponen `Clickable` shared yang membungkus semantic + keyboard handler. Untuk dismiss-message, cukup render tombol ✕ kecil di ujung baris.

### A2. Modal tanpa tombol tutup yang terlihat
- **Lokasi:** `src/components/Modal.tsx:53-67`
- **Masalah:** modal hanya bisa ditutup via backdrop-click & Escape. Di mobile **tidak ada Escape**; tak ada affordance visual bahwa sheet bisa ditutup. Bottom-sheet tanpa drag-handle juga menurunkan *signifier*.
- **Fix:** tambahkan (a) drag-handle bar 32×4px di atas panel, (b) tombol ✕ di pojok kanan atas panel dengan target tap ≥ 40px (`p-2 -m-2`). Semua pemakai Modal (ConfirmSheet, StudentForm, dsb.) otomatis terbantu.

### A3. Tidak ada dark mode & prefers-reduced-motion
- **Lokasi:** seluruh kodebase — verifikasi: `dark:` / `prefers-color-scheme` → **0 hasil**; `prefers-reduced-motion` → **0 hasil**.
- **Masalah:**
  - Tutor mencatat sesi sering **malam hari**; dark mode adalah win UX terbesar sekaligus hemat baterai OLED. Layout + Tailwind v4 sudah memungkinkan via `@theme` + `dark:` variants.
  - Animasi `slide-up`, `animate-pulse` (skeleton), transisi wizard, `scale(0.97)` tak dihormati `prefers-reduced-motion` → melanggar WCAG 2.3.3 (Animation from Interactions) bagi pengguna sensitif vestibular.
- **Fix:** lakukan setelah Fase 3 (design tokens) — dark palette dari token yang sama. Untuk motion: `@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }` di `index.css`.

### A4. Tipografi sub-12px tersebar (30+ lokasi) + kontras gagal AA
- **Lokasi:** `Badge.tsx`, `Tabs.tsx:49` (badge count 10px), `MetricCard.tsx:46,50,52` (label & deskripsi 11px), `TodayHero.tsx:78` (separator jam 10px), `BottomNav.tsx:64` (versi 10px), `Breadcrumb.tsx:65` (11px), dll.
- **Masalah:**
  - Teks di bawah 12px sulit terbaca di layar kecil, terutama pengguna 40+.
  - `text-slate-400` 11px di Breadcrumb ≈ kontras 2.9:1 → **gagal WCAG AA** (butuh 4.5:1 untuk teks < 18pt). `text-gray-500` pada versi 10px juga borderline (~4.0:1).
- **Fix:** naikkan lantai tipografi: minimum **12px**, 13–14px untuk teks sekunder yang sering dibaca. Ganti `slate-400` pada teks → `slate-500`/`slate-600`. Buat aturan lint konvensi: tidak ada `text-[Npx]` dengan N < 12.

### A5. Touch target di bawah standar
- **Lokasi:**
  - `CaptureSession.tsx:753` — chip hapus topik: ikon 16px, tanpa padding, **plus `tabIndex={-1}`** (tidak fokusable sama sekali).
  - `MonthlyReport.tsx:1130` — tombol ✕ draft: `px-2 py-0.5 text-[11px]` ≈ 22–24px.
  - Tombol kecil lain di TagihanTab/RingkasanTab dengan `text-[11px]`.
- **Masalah:** standar WCAG 2.5.8 (min 24×24px), Apple/Material (44px). Chip hapus topik saat ini tidak bisa diakses keyboard user dan hampir mustahil ditap presisi saat menulis catatan cepat.
- **Fix:** bungkus ikon dengan padding: `p-2 -m-2` (memperluas area tap tanpa mengubah visual), hapus `tabIndex={-1}`, tambah `aria-label` deskriptif.

### A6. Scroll chaining di modal & panel scrollable
- **Lokasi:** `Modal.tsx` panel (`overflow-y-auto`), `CaptureSession.tsx:1711` (close-out `max-h-[60vh] overflow-y-auto`), RingkasanTab grafik, dll.
- **Masalah:** tanpa `overscroll-behavior: contain`, scroll di dalam bottom-sheet ikut menggulir halaman di belakangnya saat mencapai batas — pola klasik yang mengganggu.
- **Fix:** tambah `overscroll-behavior: contain` ke `.modal-panel` (atau kelas shared).

### A7. Stepper wizard: tombol "mati" untuk langkah ke depan
- **Lokasi:** `src/screens/CaptureSession.tsx:522`
- **Masalah:** langkah masa depan `onClick={() => undefined}` tapi tetap `<button>` aktif → keyboard user bisa fokus tanpa efek apa pun; screen reader tidak diberi tahu posisi.
- **Fix:** `disabled` untuk langkah > current (atau `aria-disabled` + penjelasan), `aria-current="step"` pada langkah aktif, dan label tombol yang menjelaskan ("Langkah 3: Kondisi").

---

## 🟡 SEDANG — Arsitektur informasi & design system

### N1. Aksi utama "Catat Sesi" tidak ada di navigasi
- **Lokasi:** `src/components/BottomNav.tsx` (nav: Home · Murid · Catatan · Keuangan)
- **Masalah:** mencatat sesi adalah aksi harian #1 (punya PWA shortcut sendiri di `vite.config.ts:47-54`), tapi hanya bisa dijangkau dari Home → SessionPill. Laporan Bulanan — fitur inti — **tidak punya akses nav sama sekali**.
- **Rekomendasi:** FAB tengah "**+ Catat**" (pattern 5-slot: Home · Murid · **[+ Catat]** · Laporan · Keuangan) mengambang di atas nav, masuk thumb zone. Alternatif minimal: 5-slot nav biasa + FAB. Pertimbangkan prioritas "Laporan" di nav karena lebih sering dipakai untuk orang tua.

### N2. Breadcrumb muncul di layar level-1
- **Lokasi:** `src/components/Breadcrumb.tsx:61` (return null hanya jika `<= 1` crumb) + pemakaian di CaptureSession `:506`, MonthlyReport `:1053`, Payments `:154`, CatatanBelajar `:266`.
- **Masalah:** semua layar tersebut adalah layar top-level yang posisinya sudah jelas dari bottom nav — breadcrumb membuang ~30px vertikal berharga di mobile dan menambah noise.
- **Fix:** tampilkan hanya untuk depth ≥ 2 (`/students/:id` adalah satu-satunya rute dalam saat ini). Auto-hide bila `segments.length < 2`.

### N3. Tidak ada design tokens terpusat
- **Lokasi:** `src/index.css:21-72`, inline styles di seluruh screens.
- **Masalah:** warna primary tersebar sebagai literal berbeda-beda: `#2563eb` (`.btn-primary`), gradient inline `#2563eb→#1d4ed8` (CTA wizard `CaptureSession.tsx:1486`), ring fokus `#60a5fa` (`.input:focus`), `theme_color #3f7fd0` (manifest) — **4 biru berbeda untuk satu brand**.
- **Fix:** di Tailwind v4, definisikan token di `index.css`:
  ```css
  @theme {
    --color-primary: #2563eb;
    --color-primary-dark: #1d4ed8;
    --color-ring: #60a5fa;
    --font-sans: "Nunito", ui-sans-serif, system-ui, sans-serif;
    --font-display: "Fredoka", var(--font-sans);
  }
  ```
  lalu konsolidasikan pemakaian. Ini prasyarat dark mode (A3) dan perubahan tema di masa depan.

### N4. Emoji sebagai ikon UI
- **Lokasi:** stepper wizard `CaptureSession.tsx:55-62` (🎯📚😊📋✏️📸), mood selector `:35-41` (🔥🎯😐😴😰), MetricCard `icon` prop (⏱✅👥), tombol 💾/☁️ di nag backup, 📵⚠️🛟 banner App.tsx.
- **Masalah:** rendering emoji **berbeda antar platform** (iOS/Android/Windows), tak bisa dikontrol kontras/ukuran/bobotnya, dan kurang tepercaya di konteks keuangan. App sudah punya pola ikon SVG inline yang bagus di BottomNav.
- **Fix:** bangun set ikon SVG inline konsisten (stroke 1.8, 24px grid, `currentColor`) — satu file `components/icons.tsx` — lalu ganti bertahap mulai dari stepper & MetricCard. Emoji fungsional sebagai "reaksi" (🎉 di empty state) boleh dipertahankan.

### N5. Inkonsistensi radius/shadow & dua sistem tombol
- **Lokasi:** campuran `rounded-lg/xl/2xl/3xl` + `shadow-sm/md/xl` tanpa skala; komponen class (`.btn-primary`, `.input`) bersaing dengan utility inline (`bg-blue-600 ... rounded-xl font-bold`).
- **Masalah:** dua cara menata tombol → drift visual antar layar (bandingkan "Buka Pengaturan" `Payments.tsx:110` vs CTA wizard vs tombol Settings).
- **Fix:** skala token: chip = `rounded-full`, input/btn = `rounded-xl`, card = `rounded-2xl`, sheet = `rounded-t-2xl`. Konsolidasi tombol ke komponen class (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`) dan hapus duplikat inline.

### N6. Font tidak diset sebagai default body
- **Lokasi:** `src/main.tsx:1-6` (memuat Fredoka/Poppins/Nunito); pemakaian via inline style: `Home.tsx:123` (Fredoka), `CaptureSession.tsx:1665` (Nunito).
- **Masalah:** body default memakai stack sistem Tailwind, bukan Nunito yang sudah dimuat → dua font berbeda dalam satu layar; inline style sulit di-refactor.
- **Fix:** set `--font-sans` di `@theme` (lihat N3), ganti inline `fontFamily` dengan class `font-display`/`font-sans`.

### N7. Splash screen PWA warna mismatch
- **Lokasi:** `vite.config.ts:34-35` (`theme_color: #3f7fd0`, `background_color: #d7eefb`).
- **Masalah:** background biru muda → app bg putih/gray-50 → *flash* kontras saat launch (perceivably janky); `theme_color` biru ≠ primary `#2563eb`.
- **Fix:** samakan `background_color` dengan bg aplikasi (`#ffffff` atau `#f8fafc`); selaraskan `theme_color` dengan token primary.

### N8. Copy "Nanti" menyesatkan di nag backup mingguan
- **Lokasi:** `src/App.tsx:210-216`
- **Masalah:** tombol "Nanti" sebenarnya snooze **1 hari** (`AUTO_BACKUP_INTERVAL_DAYS - 1`), bukan "abaikan sesi ini". User yang mengira "Nanti" = "batal untuk sekarang" akan kaget prompt muncul lagi besok.
- **Fix:** ubah label → "Besok" / "Ingatkan besok", atau beri dua opsi: "Besok" dan "Minggu depan".

---

## 🟢 RENDAH — Performa & housekeeping

- **P1. `version.ts` 50,9 KB di entry chunk.** `BottomNav.tsx:2` meng-import `APP_VERSION` dari `lib/version.ts` (50,9 KB — seluruh riwayat changelog) hanya untuk string versi. Pisahkan `APP_VERSION` ke `lib/appVersion.ts` (±50 byte); ChangelogModal tetap memuat versi besar secara lazy.
- **P2. Skeleton generik → layout shift.** Semua layar pakai `Skeleton card+text` generik; buat skeleton per-bentuk layar utama (Home, Payments, MonthlyReport) yang meniru layout akhir.
- **P3. `enterkeyhint` belum dipakai.** Tambahkan `enterkeyhint="next"` di field wizard, `"search"` di pencarian topik/murid, untuk keyboard mobile yang kontekstual.
- **P4. File liar di repo root.** `s.js` (bundle hasil build yang tersimpan salah, satu baris 19+ KB) dan `typecheck-output.txt` ter-commit. Hapus; pertimbangkan `.gitignore` di root.
- **P5. Tidak ada undo untuk aksi cepat.** "Tandai selesai ✓" pada follow-up langsung permanen. Toast dengan aksi **Undo** (5 detik) adalah pola murah-bernilai-tinggi; ToastProvider sudah ada untuk diperluas.
- **P6. Haptic feedback.** `navigator.vibrate(10)` saat simpan sesi berhasil (Android) memperkuat *perceived reliability* penutup wizard. Non-blocking, graceful degrade di iOS.

---

## ✅ Yang sudah baik (pertahankan)

- **Modal.tsx:** focus-trap lengkap + restore fokus + Escape + `aria-modal` — di atas rata-rata.
- **Toggle.tsx:** `role="switch"` + `aria-checked` + `aria-labelledby`.
- **Toast.tsx:** `role="status"` + `aria-live="polite"`.
- **PIN UX:** lockout dengan exponential backoff, Enter-to-submit, error inline.
- **Destructive flow:** ringkasan cascade delete (berapa sesi/laporan/tagihan ikut terhapus) + opsi "nonaktifkan saja" — excellent error prevention (Nielsen #5).
- **zIndex terpusat** (`lib/zIndex.ts`) dengan dokumentasi urutan lapisan.
- **Empty state informatif** (Home "Tidak ada sesi hari ini 🎉", welcome state, dsb.).
- **Status tak bergantung warna saja** — MetricCard & OperationalSnapshot selalu menyertakan teks/ikon.
- **PWA:** shortcuts ke 3 tujuan utama; autoUpdate dengan alasan yang didokumentasikan di config.
- **Lazy-load route + font staging** (`main.tsx:17-23`).

---

## 📋 Rencana Perbaikan Terprioritisasi (usulan fase)

| Fase | Isi | Estimasi | Dampak |
|---|---|---|---|
| **1 — Quick wins** | K1 ikon Keuangan; K3 strip versi + kalkulus `pb` + CSS var `--bottom-nav-h`; N8 copy nag; P1 split version.ts; A6 overscroll; hapus `s.js` (P4) | ~2 jam | Perbaikan bug visual langsung |
| **2 — A11y core** | K2 safe-area; A1 button semantik; A2 tombol tutup modal + drag handle; A5 touch target & `tabIndex={-1}`; A7 stepper; A4 font floor 12px + kontras slate | ~1 hari | WCAG AA + iPhone layak pakai |
| **3 — Design tokens** | N3 `@theme` tokens; N6 font default; N5 skala radius & konsolidasi tombol; N7 splash/manifest bg | ~1 hari | Fondasi konsistensi + prasyarat dark mode |
| **4 — Struktur & feedback** | N1 FAB "+ Catat" / 5-slot nav; K4 satu toast system (posisi bawah + safe-area); N2 breadcrumb selektif; P5 undo toast; P3 enterkeyhint | ~1 hari | Alur harian lebih cepat |
| **5 — Dark mode + motion** | A3 penuh: palet `dark:` dari tokens Fase 3 + `prefers-reduced-motion` | ~1–2 hari | Kenyamanan malam + inklusivitas |
| **6 — Ikonografi** | N4 ganti emoji → set SVG inline (`components/icons.tsx`) bertahap | bertahap | Profesionalitas visual lintas platform |

**Checklist pengerjaan:**

- [x] Fase 1 — Quick wins
- [x] Fase 2 — A11y core
- [x] Fase 3 — Design tokens
- [x] Fase 4 — Struktur & feedback
- [x] Fase 5 — Dark mode + motion
- [x] Fase 6 — Ikonografi

**Verifikasi Fase 1:** `npm test -- --run src/__tests__/bottomNavNoVersion.test.tsx` (1/1 hijau) dan `npm run build` (sukses) setelah perbaikan nav, shell layout, modal, safe-area, dan cleanup file dead code.

---

## 🛠 Log Implementasi — Fase 2 A11y core (2026-09-04)

> Dieksekusi bersamaan dengan sesi kerja paralel (Fase 1/3/4). Item di bawah adalah kontribusi sesi ini; yang ternyata sudah dikerjakan sesi paralel dibiarkan. Verifikasi akhir Fase 2: **lint 0/0 · test 351/351 · build OK**.

### K2 — Safe-area (sisa yang belum tertangani sesi paralel)
- `Toast.tsx` — `top-4` → `top-[max(1rem,env(safe-area-inset-top))]`.
- `Modal.tsx` — padding bawah panel default → `pb-[calc(2rem+var(--safe-bottom))]`.
- `CaptureSession.tsx` — bar CTA wizard `bottom-16` → `bottom-[calc(4rem+var(--safe-bottom))]`; panel tooltip `bottom-24` → `bottom-[calc(6rem+var(--safe-bottom))]`.
- Housekeeping: hapus duplikasi variabel (`--safe-area-b/t`) demi satu konvensi `--safe-top/--safe-bottom`.

### A1 — Elemen klik jadi semantik
- `UpcomingSchedule.tsx` — kartu jadwal `div onClick` → `<button type="button">` + `aria-label` + focus ring.
- `StudentDetail.tsx:725` — kartu riwayat sesi → `role="button"` + `tabIndex={0}` + handler Enter/Space + focus ring (bukan `<button>` karena ada tombol ✏️ bersarang — HTML melarang button di dalam button).
- `Payments.tsx` — bar pesan `div onClick` → flex + tombol ✕ `aria-label="Tutup pesan"` (role/aria-live dipertahankan). *(CaptureSession & MonthlyReport sudah dikerjakan sesi paralel.)*

### A2 — Modal close + drag handle (penyempurnaan atas implementasi sesi paralel)
- Tombol ✕ dipindah **setelah children** dalam DOM → fokus awal modal kembali ke elemen pertama konten (memulihkan alur autoFocus input PIN; tanpa ini fokus lompat ke ✕).
- Prop baru `showCloseButton` (default `true`) → `false` di 7 modal yang sudah punya tombol tutup sendiri (AddSchedule, EditSession, ResolveMissed, TagihanTab ×2, CatatanBelajar, MonthlyReport) → dobel ✕ hilang.
- Panel PIN modal (Students) diberi `relative` agar ✕ absolut teranchor benar.

### A5 — Touch target
- `CaptureSession` — chip hapus topik: `tabIndex={-1}` dihapus, target diperluas (`p-1.5 -m-1.5`), `blue-400`→`blue-500`; tombol bersihkan pencarian: `aria-label` + perluasan; chip hapus mapel (IB picker): `type` + `aria-label` + perluasan.
- `StudentDetail` — ✏️ edit catatan: perluasan target + `aria-label`.
- `MonthlyReport` — ✕ hapus draft: `type` + `aria-label` dinamis + target ≥24px.
- `AuditTab` — nav tahun ‹/›: target 36×36px + hover.
- `PengeluaranTab` — Edit/Hapus: `type` + `aria-label` dinamis + target diperluas.
- `BottomNav` — label FAB "Catat" `text-[10px]` → 12px.

### A7 — Stepper wizard
- Langkah masa depan kini `disabled` (tidak lagi fokusabel-tanpa-efek); langkah aktif tetap fokusabel dengan `aria-current="step"`; `aria-label` kontekstual per status.

### A4 — Font floor 12px + kontras
- **Bulk:** `text-[9px]/[10px]/[11px]` → `text-xs` di 22 file.
- **Kontras teks:** `slate-400/gray-400` → `-500` di ±15 titik (RingkasanTab ×4, PengeluaranTab ×5, AuditTab ×2, FinancePipelineBoard, DonutChart, EngagementSummary, StudyNoteCard, MonthlyReport ×2, StudentDetail, Payments); `blue-500`→`blue-600` (Settings); `white/70`→`white/90` (kartu Laba); `indigo-400`→`indigo-600`.

### Pengecualian terdokumentasi (sengaja tidak diubah)
- Label sumbu SVG chart (`BarChart.tsx:141,201`, `LineChart.tsx:115,147,205`) — font-size dalam koordinat viewBox SVG, bukan px CSS.
- Glyph kalender mikro (`MonthView`, `DayView`, skor StudentDetail) — data-dense, terikat tinggi sel 64px.
- Thumbnail preview tema laporan (`MonthlyReport`) — miniatur canvas, bukan teks UI.

### Catatan konvensi
Dua ekuivalen 12px hidup berdampingan: `text-xs` (hasil bulk sesi ini, mayoritas) dan `text-[12px]` (BottomNav/Breadcrumb/TodayHero, sesi paralel). Nilai komputasi identik; penyatuan bisa menyusul saat refactor kecil.

---

## Keterbatasan Audit

- Berbasis **inspeksi kode statis** — tidak ada run-time/visual check; temuan overlap (K3) dihitung dari kalkulus tinggi elemen, kontras (A4) dari nilai hex Tailwind.
- Nomor baris mengacu pada state kode per **2026-09-04 (v1.70.0)** dan bisa bergeser saat refactor.
- Temuan yang membutuhkan penilaian visual (estetika tema laporan, keterbacaan hasil export) tetap di domain `docs/UI-UX-ANALYSIS.md`.

_Catatan: tandai item ☐ → ☑ saat dikerjakan, dan tambahkan hasil verifikasi (lint/test/build) di bagian ini setiap fase selesai._




