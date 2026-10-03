# TASK-04 — Fondasi Visual (token, primitif, ganti 904 hardcode, light-only)

> **STATUS:** `todo`
> **PEMILIK:** agen AI
> **DIBUAT:** 2026-09-25 · **BASELINE:** v1.75.1 (561 tes / 50 berkas)
> **PERKIRAAN:** 6 langkah × 30–45 menit
> **INDUK:** [`TASK-03-blueprint-uiux.md`](TASK-03-blueprint-uiux.md) · **KONTRAK:** [`arsitektur/11`](../arsitektur/11-uiux-ai-cost-dan-privasi.md) §K4
> **BACA DULU:** [`ATURAN-AI.md`](ATURAN-AI.md) — kontrak kerja, keputusan terkunci, daftar larangan

## 0. Cara pakai berkas ini

- **Satu langkah per putaran.** Setiap langkah diakhiri perintah verifikasi; jalankan sebelum lanjut.
- **Tugas ini tidak mengubah perilaku.** Kalau sebuah langkah membuat fitur hilang/berubah fungsi, langkah itu salah.
- Lampiran visual: [`docs/mockups/_shared.css`](../mockups/_shared.css) — **usulan token**, bukan kode produksi.
  Salin nilainya, jangan salin berkasnya.

**Perintah verifikasi standar (dari `les-ko-lui/`):**

```powershell
npx tsc -b        # harapan: tanpa keluaran
npx eslint src    # harapan: tanpa keluaran
npm test          # harapan: 561 lulus, 0 gagal
npm run build     # harapan: built + dist/sw.js

# Penghitung utang kelas warna — REKURSIF (jalankan sebelum & sesudah tiap langkah, catat angkanya).
# ⚠️ Perintah lama `Select-String -Path "src\**\*.tsx"` HANYA menjangkau 38 berkas (kedalaman 1) dan
# melaporkan 470; angka sebenarnya 904 (diukur 2026-10-01). Pakai perintah rekursif ini.
(Get-ChildItem -Recurse src -Include *.tsx -File | Select-String -Pattern "bg-white|bg-gray-|text-gray-|border-gray-").Count
```

> **Kegagalan yang bukan regresi:** tes kontras (`src/__tests__/engagementContrast.test.ts`) membaca
> pasangan warna dari `src/lib/engagement.ts`. Kalau gagal setelah token diubah, **perbarui pasangan
> warnanya di sumber yang memakainya**, jangan matikan tesnya. Ini memang fungsinya.
>
> ⚠️ **`src/lib/engagement.ts` TERLARANG disentuh** (`ATURAN-AI.md` §2.1). Yang boleh diperbaiki: token di
> `src/index.css`, kelas/warna di komponen **pemanggil**, serta peta warna laporan di
> `src/template/layouts/helpers.tsx:425-429` — dan itu pun **hanya bila** pemilik memberi pengecualian
> tertulis untuk `src/template/**` (sekarang masih terlarang). Kalau sebuah perbaikan kontras hanya bisa
> dilakukan di berkas terlarang → **berhenti dan lapor**. *(Amandemen 2026-10-01 — A7: instruksi lama
> menyuruh memperbaiki warna dengan mengedit `engagement.ts`.)*

## 1. Tujuan & definisi selesai

UI sekarang tidak punya sistem: **904** kelas warna ditulis langsung di `.tsx` (angka terkoreksi 2026-10-01;
kontrak lama menulis 471 karena perintah penghitungnya tidak rekursif), tidak ada skala tipografi
(didominasi 12px & 14px), tidak ada skala elevasi, dan dark mode mati karena token tidak dipakai
(`src/index.css` baris 48–51). Selama fondasi ini belum ada, setiap rombakan layar berikutnya akan
melahirkan utang baru.

**Selesai berarti:**

- [ ] Jumlah kelas warna hardcode turun **≥60%** dari angka awal (target: **≤190** dari **904**, baseline 2026-10-01)
- [ ] Tipografi memakai **4 langkah** saja; tidak ada konten terbaca di bawah 13px
- [ ] Ada **7 primitif** di `src/components/ui/` dan dipakai minimal di 3 layar
- [x] ~~Dark mode hidup kembali~~ → **DIBATALKAN (keputusan pemilik 2026-10-01, Q4): aplikasi light-only permanen**
- [ ] `npm test`, `npm run build`, `npm run lint` hijau

## 2. Kondisi awal (angka nyata, 2026-09-25)

| Ukuran | Sekarang | Target | Cara mengukur |
|---|---:|---:|---|
| Kelas warna hardcode | **904** (2026-10-01; perintah lama melaporkan 471 karena tidak rekursif) | ≤190 | perintah di §0 |
| Langkah tipografi di `@theme` | 0 | 4 | baca `src/index.css` |
| Tingkat elevasi | 1 (`--shadow-soft`) + campur `shadow-sm`/`shadow-xl` | 2 | `grep "shadow-" src/**/*.tsx` |
| Berkas primitif `components/ui/` | folder belum ada | 7 | `Get-ChildItem src\components\ui` |
| Dark mode | mati | **mati permanen — light-only (Q4)** | tidak ada `@media (prefers-color-scheme: dark)` di `index.css` |
| Teks <13px pada konten | banyak (`text-xs` 12px) | 0 untuk konten | audit manual per layar |

**Cara mengukur ulang:** jalankan perintah di §0 dan tempel angkanya ke tabel ini.

## 3. Urutan langkah

### Langkah 1 — Token: tipografi, spacing, elevasi, gerak

**Tujuan:** `@theme` memuat seluruh token, tanpa mengubah tampilan mana pun (nilai visual boleh sama dulu).

**Jangkar:** cari blok `@theme {` di `src/index.css` (sekarang baris 3–21). Di dalamnya sudah ada
`--font-sans`, `--color-brand-*`, `--color-surface*`, `--color-border`, `--color-text*`,
`--radius-card`, `--radius-pill`, `--shadow-soft`.

**Yang ditambahkan** (jangan menghapus yang ada — komponen lama masih memakainya):

```css
@theme {
  /* ...yang sudah ada... */

  /* Tipografi — 4 langkah saja (kontrak K4.2) */
  --text-display: 1.5rem;    /* 24px */
  --text-title:   1.125rem;  /* 18px */
  --text-body:    0.9375rem; /* 15px — pengganti text-sm untuk konten */
  --text-caption: 0.8125rem; /* 13px — pengganti text-xs untuk label */

  /* Spacing — kelipatan 4 (kontrak K4.4) */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-5: 20px; --space-6: 24px;

  /* Elevasi — 2 tingkat saja (kontrak K4.3) */
  --e-flat:   0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.04);
  --e-float:  0 8px 24px rgba(15,23,42,.10);

  /* Gerak — 2 pola saja (kontrak K4.5) */
  --motion-enter: 200ms ease-out;
  --motion-sheet: 250ms ease-out;
}
```

**Selesai bila:** `@theme` memuat keempat kelompok token; tidak ada nilai lama yang dihapus;
`npm run build` hijau dan **tampilan belum berubah** (boleh dibandingkan lewat screenshot).

**Verifikasi:** perintah standar §0.

---

### Langkah 2 — Primitif: 7 komponen di `src/components/ui/`

**Tujuan:** ada 7 komponen dasar yang dipakai berulang, sehingga layar tidak lagi menyusun div sendiri.

**Berkas baru** (folder `src/components/ui/` belum ada — buat):

```tsx
// src/components/ui/Card.tsx
interface CardProps {
  children: React.ReactNode;
  /** "solid" = putih + garis; "soft" = abu muda tanpa garis (blok sekunder). */
  tone?: "solid" | "soft";
  className?: string;
  as?: "div" | "section" | "article";
}
export default function Card(props: CardProps): JSX.Element;

// src/components/ui/SectionHeader.tsx
interface SectionHeaderProps {
  title: string;              // teks huruf besar-kecil kecil, mis. "Perlu keputusan"
  hint?: string;              // teks kanan, mis. "Maks 3"
  action?: React.ReactNode;   // mis. tombol biaya AI
}

// src/components/ui/ListRow.tsx  ← pengganti .slot / .slot-main / .slot-meta
interface ListRowProps {
  leading?: React.ReactNode;  // mis. jam "15:30"
  title: string;              // mis. "Sari"
  subtitle?: string;          // mis. "Fisika · Gelombang"
  trailing?: React.ReactNode; // mis. tombol "Catat"
  onClick?: () => void;
  /** Baris lampau diredupkan tanpa kehilangan kontras teks. */
  muted?: boolean;
}

// src/components/ui/ActionBar.tsx
interface ActionBarProps {
  children: React.ReactNode;  // deretan tombol
  /** true = tombol utama diletakkan paling kanan dan melebar. */
  emphasis?: boolean;
}

// src/components/ui/StatTile.tsx
interface StatTileProps {
  label: string;              // mis. "Sesi minggu ini"
  value: React.ReactNode;     // string ATAU <MaskedMoney/> dari TASK-08
  hint?: string;              // mis. "7 dari target 10"
  delta?: { text: string; tone: "up" | "down" | "flat" };
  action?: React.ReactNode;
}

// src/components/ui/Sheet.tsx      ← Pola D kontrak K4.6: panel dari bawah
interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Tombol aksi; dirender menempel di bawah sheet. */
  footer?: React.ReactNode;
  ariaLabel: string;
}

// src/components/ui/EmptyState.tsx ← Pola E kontrak K1/K4
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;              // mis. "Belum ada tagihan"
  message: string;            // harus menjelaskan LANGKAH BERIKUTNYA, bukan hanya "kosong"
  action?: React.ReactNode;
}
```

**Aturan implementasi (jangan improvisasi):**

1. Setiap primitif **hanya** memakai token dari Langkah 1. Tidak ada `bg-white`, `text-gray-*`.
2. `Sheet` memakai `role="dialog"` + `aria-modal="true"` + fokus terperangkap + `Escape` menutup.
   Pola ini sudah ada di `src/components/Modal.tsx` — **baca dulu**, tiru perilaku aksesibilitasnya,
   jangan tulis ulang dari nol.
3. `zIndex`: pakai konstanta di `src/lib/zIndex.ts`, jangan menulis `z-50` langsung.

**Selesai bila:** folder memuat 7 berkas; tidak ada satu pun yang memakai kelas warna hardcode
(`Select-String -Path "src\components\ui\*.tsx" -Pattern "bg-white|gray-"` → kosong); 7 komponen
punya minimal 1 pemakaian nyata di layar.

**Verifikasi:** perintah standar §0 + perintah `Select-String` di atas.

---

### Langkah 3 — Migrasi gelombang 1: komponen bersama

**Tujuan:** menurunkan hitungan kelas warna pada berkas yang dipakai banyak layar — dampak terbesar, risiko terkecil.

**Berkas sasaran** (urutan ini):

1. `src/components/Badge.tsx`
2. `src/components/EmptyState.tsx`
3. `src/components/Tabs.tsx`
4. `src/components/PaginationControls.tsx`
5. `src/components/Breadcrumb.tsx`
6. `src/components/Skeleton.tsx`
7. `src/components/Toast.tsx`

**Cara:** ganti setiap `bg-white` → `bg-[var(--surface-strong)]`, `bg-gray-50/100` → `bg-[var(--surface-soft)]`,
`text-gray-500/600` → `text-[var(--text-muted)]`, `text-gray-400` → `text-[var(--text-soft)]`,
`border-gray-*` → `border-[var(--border)]`. **Jangan** mengubah struktur JSX, prop, atau nama kelas
yang dipakai tes/E2E.

**Selesai bila:** hitungan kelas warna pada 7 berkas itu = 0, dan jumlah global turun
(beri angka sebelum→sesudah di §9).

**Verifikasi:** perintah standar §0 + penghitung di §0.

---

### Langkah 4 — Migrasi gelombang 2: navigasi & header

**Tujuan:** nav dan header memakai token baru, sekaligus menyiapkan struktur 3 pintu.

**Berkas sasaran:** `src/components/BottomNav.tsx`, `src/components/Breadcrumb.tsx`,
`src/App.tsx` (bagian banner & flash).

**Jangkar nav:** `const NAV_ITEMS: NavItem[]` di `src/components/BottomNav.tsx` (sekarang baris 11).

> **Penting:** pada langkah ini **jangan** mengubah jumlah pintu menjadi 3. Perubahan struktur nav
> dikerjakan sekali saja di [`TASK-05`](TASK-05-rombak-keuangan.md) (saat Home & nav dirombak bersamaan),
> supaya selector E2E (`e2e/`) hanya patah satu kali. Langkah ini **hanya** token + aksesibilitas.

**Selesai bila:** 3 berkas itu bebas kelas warna hardcode; banner offline/kuota/backup
memakai token yang sama; jumlah banner yang bisa tampil bersamaan tetap seperti sekarang.

**Verifikasi:** perintah standar §0.

---

### Langkah 5 — Naikkan ukuran teks konten (12px → 13–15px)

**Tujuan:** menghilangkan penyebab utama kesan "sempit".

**Aturan penggantian (mekanis, jangan dikira-kira):**

| Sekarang | Menjadi | Untuk apa |
|---|---|---|
| `text-xs` pada **judul baris / nama murid / tombol** | `text-caption` (13px) atau `text-body` | harus terbaca |
| `text-xs` pada **label kolom / sumbu grafik / badge** | tetap 11–12px | bukan konten utama |
| `text-sm` pada **isi kartu, deskripsi, input** | `text-body` (15px) | harus terbaca |
| `text-sm` pada **metadata** (tanggal, jam, subjudul) | `text-caption` (13px) | konteks, bukan isi |
| `text-base`/`text-lg` judul kartu | `text-title` (18px) | hierarki |

**Selesai bila:** tidak ada konten terbaca di bawah 13px. Periksa dengan mencari
`text-\[10px\]`, `text-\[11px\]`, `text-xs` pada elemen yang memuat nama murid atau nominal.

**Verifikasi:** perintah standar §0 + layar `Hari Ini`, `Uang`, `Murid` dibandingkan pada lebar 390px.

---

### Langkah 6 — ~~Hidupkan dark mode~~ **DIBATALKAN** (keputusan pemilik 2026-10-01, Q4)

**Status:** ❌ **tidak dikerjakan.** Aplikasi **light-only permanen**. Langkah ini dipertahankan di berkas
hanya sebagai catatan sejarah + daftar hal yang tetap wajib beres.

**Yang HARUS dilakukan sebagai ganti langkah ini:**

1. **Jangan** menambahkan `@media (prefers-color-scheme: dark)` di `src/index.css`. Biarkan komentar
   `Dark mode DEAKTIVASI` (baris 48–51) dan perjelas dengan catatan: *"light-only permanen — keputusan
   pemilik 2026-10-01 (Q4)"*.
2. **Hapus project `mobile-dark`** dari `playwright.config.ts` (baris 17) supaya matriks screenshot/E2E
   tidak lagi memuat mode yang tak bermakna. Perbarui `docs/03-PLAYBOOK-AUDIT-UIUX-VISUAL.md` §3.1 & §5.1
   dan `docs/README.md` §4.1 baris TASK-04.
3. **Kontras tetap diperiksa** — tetapi sebagai bagian Langkah 5 (ukuran & warna), bukan lewat mode gelap.
   Pasangan terburuk yang wajib lulus ada di `docs/06-AUDIT-UIUX-2026-10-01.md` §3 (L-01a…L-01g).
4. Perbaikan warna **tidak boleh** menyentuh `src/lib/engagement.ts` (terlarang). *(Amandemen A7.)*

**Selesai bila:** tidak ada `@media (prefers-color-scheme: dark)` di `src/`; project `mobile-dark` hilang;
`npm run build` hijau; tes kontras tetap lulus.

## 4. Pola umum

- **Pola ganti warna:** `bg-white`→`bg-[var(--surface-strong)]` · `bg-gray-50|100|200`→`bg-[var(--surface-soft)]` ·
  `text-gray-900`→`text-[var(--text)]` · `text-gray-500|600`→`text-[var(--text-muted)]` ·
  `text-gray-400`→`text-[var(--text-soft)]` · `border-gray-*`→`border-[var(--border)]`.
- **Pola ganti ukuran:** lihat tabel Langkah 5.
- **Pola migrasi per berkas:** ganti → jalankan verifikasi → catat angka → baru berkas berikutnya.
  **Jangan** migrasi dua berkas dalam satu putaran; kalau gagal, tidak ketahuan yang mana.

## 5. Jebakan yang sudah pernah terjadi

| Jebakan | Gejala | Cara menghindar |
|---|---|---|
| Mengganti token sekaligus memindahkan JSX | Diff besar, regresi senyap pada props | Satu langkah hanya satu jenis perubahan |
| Tes kontras gagal lalu dimatikan | `npm test` hijau tapi WCAG rusak | Perbaiki pasangan warna di sumber |
| Dark mode dihidupkan sebelum migrasi selesai | Layar setengah gelap (persis kejadian 2026-09-11) | Hanya hidupkan di Langkah 6, setelah hitungan hardcode turun |
| `text-xs` dinaikkan semua termasuk label grafik | Grafik berantakan, label bertumpuk | Pakai tabel penggantian Langkah 5, jangan sapu rata |
| Nav diubah bersamaan migrasi | E2E patah, sulit dibedakan sebabnya | Nav **hanya** token di tugas ini; strukturnya di tugas lain |

## 6. Kalau macet

| Gejala | Sebab | Tindakan |
|---|---|---|
| `tsc -b` mengeluh `Cannot find module './ui/Card'` | berkas belum dibuat atau salah folder | Pastikan `src/components/ui/` ada dan nama ekspor `default` |
| Tampilan berubah padahal katanya token saja | ada kelas lama yang dihapus, bukan hanya diganti | Bandingkan screenshot layar yang sama sebelum/sesudah |
| Tes snapshot/E2E gagal oleh kelas CSS | selector memakai nama kelas Tailwind lama | Perbarui selector di tugas yang sama, catat di §8 |
| Dark mode: teks gelap di atas gelap | ada berkas yang belum dimigrasi | Jalankan penghitung §0; berkas dengan hardcode = penyebabnya |
| Hitungan kelas warna tidak turun | penghitung membaca berkas lain (mis. `dist/`) | Pakai perintah **rekursif** di §0 (`Get-ChildItem -Recurse src …`); **jangan** kembali ke `Select-String -Path "src\**\*.tsx"` — pola itu tidak rekursif dan melaporkan angka yang salah (470, bukan 904) |

> Jangan menutupi macet dengan menambah penimpaan CSS. Setiap penimpaan baru = utang baru.
> Berhenti dan catat di §8.

## 7. Larangan konkret

| ❌ JANGAN sentuh | Alasan |
|---|---|
| `src/lib/crypto.ts` | menyentuh PIN pengguna; butuh tugas terpisah |
| `src/db/db.ts` (versi schema) | migrasi salah = kehilangan data |
| `src/template/**` (mesin laporan) | mesin lain; butuh tugas terpisah |
| `src/screens/MonthlyReport.tsx` (logika) | 2.097 baris; pemecahannya ada di `TASK-03` §2, tugas tersendiri |
| `src/screens/CaptureSession.tsx` (logika wizard) | ada di `TASK-06`; di sini hanya kelas warna & ukuran teks |
| Menambah dependensi baru | fondasi sengaja dibangun dari token + CSS |

## 8. Catatan penyimpangan

| Tanggal | Langkah | Yang terjadi | Keputusan |
|---|---|---|---|
| | | | |

## 9. Progres

Catat angka sebelum → sesudah setiap langkah. Angka ini adalah buktinya.

- [ ] **L1 — Token.** Hardcode: **904** → ___
- [ ] **L2 — 7 primitif.** `src/components/ui/` berisi ___ berkas
- [ ] **L3 — Gelombang 1 (7 komponen).** Hardcode: ___ → ___
- [ ] **L4 — Gelombang 2 (nav & header).** Hardcode: ___ → ___
- [ ] **L5 — Ukuran teks.** Sisa konten <13px: ___
- [x] **L6 — DIBATALKAN (Q4 2026-10-01).** Light-only permanen · project `mobile-dark` dihapus · tes kontras tetap jalan di L1–L5

**Angka awal (2026-09-25):** hardcode **471** (perintah tidak rekursif) · **Angka awal terkoreksi (2026-10-01):** **904** → target **≤190**

## 10. Riwayat tugas

| Tanggal | Perubahan | Versi | Hasil |
|---|---|---|---|
| 2026-09-25 | Dibuat | v1.75.1 | `todo` |
| 2026-10-01 | Amandemen: **L6 dark mode dibatalkan** (light-only permanen, Q4) · penghitung kelas warna dibuat **rekursif**, baseline dikoreksi **471 → 904** (A8) · larangan `src/lib/engagement.ts` ditegaskan pada instruksi kontras (A7) | v1.79.3 | `todo` |
