# TASK-01 — Refactor Layar Besar (lanjutan)

> **STATUS:** `in_progress` — 4 dari 6 langkah selesai
> **PEMILIK:** agen AI mana pun (panduan ini ditulis untuk model kecil: ikuti urutan, jangan improvisasi)
> **DIBUAT:** 2026-09-13 · **BASELINE:** v1.75.1 · 561 test lulus
> **PERKIRAAN:** 4–6 langkah × 20–40 menit

---

## 0. Cara pakai berkas ini (baca dulu, 2 menit)

1. Kerjakan **satu langkah per putaran**. Jangan gabungkan dua langkah dalam satu commit/perubahan.
2. Untuk setiap langkah: **cari jangkar**, **pindahkan kode apa adanya**, **sambungkan**, **jalankan 4 perintah verifikasi**, **centang di §7**.
3. **Kalau verifikasi gagal: kembalikan (revert) perubahan langkah itu** dan tulis alasannya di §8. Jangan memperbaiki dengan menebak.
4. **Jangan pernah** mengubah perilaku saat memindahkan kode. Refactor = memindah, bukan memperbaiki. Kalau Anda melihat bug, catat di §8, jangan diperbaiki di langkah ini.
5. Kalau ada instruksi yang tidak cocok dengan kode yang Anda lihat (mis. baris tidak sesuai), **berhenti** dan tulis di §8. Nomor baris bergeser setelah setiap langkah — **jangkar (teks komentar) yang jadi acuan, bukan nomor baris**.

### Aturan mutlak (melanggar = pekerjaan dibatalkan)

| ❌ Jangan | Kenapa |
|---|---|
| Mengubah rumus skor, urutan langkah wizard, atau teks yang dilihat pengguna | Itu perubahan perilaku. Ada `CHANGELOG` + audit khusus untuk itu |
| Mengubah `src/db/types.ts`, `src/lib/engagement.ts`, `src/lib/ibTopics.ts`, `src/components/Modal.tsx` | Berkas inti bersama; sudah punya banyak test. Butuh tugas terpisah |
| Menambah dependensi baru (`npm install`) | Tidak diperlukan untuk refactor ini |
| Menghapus atau melemahkan test | Test adalah pengaman Anda. Kalau test gagal, kode Anda yang salah |
| Melanjutkan ke langkah berikutnya saat verifikasi merah | Kerusakan menumpuk dan sulit dilacak |
| Menambah baris komentar "dibuat oleh AI" / mengubah gaya kode sekitarnya | Membuat diff sulit ditinjau manusia |

### Perintah verifikasi (WAJIB sesudah setiap langkah)

Jalankan dari folder `les-ko-lui/` — **ketiganya harus hijau**:

```bash
npm run build        # = `tsc -b` + vite build → harus "built in ..." + dist/sw.js dibuat
npm run lint         # = eslint → harus 0 error, 0 warning
npm test             # = vitest run → harus 561+ test lulus, 0 gagal
```

Bila perlu memisahkan pemeriksa (mis. untuk memastikan jenis kegagalannya), pakai biner lokal:

```bash
node_modules/.bin/tsc -b          # typecheck saja
node_modules/.bin/eslint src      # lint kode saja (jangan seluruh repo — lambat)
node_modules/.bin/vitest run      # sama dengan `npm test`
```

> ⚠️ **Jangan pakai `npx tsc` / `npx eslint`.** Di lingkungan bersandbox, `npx` mencoba mengunduh paket dari
> npm dan gagal dengan `EPERM ... _cacache` — kegagalan itu **bukan** kesalahan kode Anda. Pakai
> `npm run <script>` atau biner di `node_modules/.bin/` seperti di atas.

Catatan penting soal `npm test`:

- Jumlah test **boleh bertambah** (kalau Anda menambah test), **tidak boleh berkurang**.
- Test `backup.test.ts` dan `crypto.test.ts` lambat (PBKDF2 600k iterasi). Bila muncul kegagalan dengan durasi **>20 detik** pada test itu, itu **timeout karena mesin sibuk**, bukan regresi Anda. Jalankan ulang `npm test` **sendirian** (jangan bersamaan dengan `tsc`/`build`). Bila tetap gagal setelah dijalankan sendirian, baru anggap regresi.
- **Jangan** menjalankan `tsc` + `eslint` + `npm test` + `build` secara paralel; itu sendiri yang menyebabkan timeout di atas.

---

## 1. Tujuan tugas

Memindahkan logika dan JSX dari layar-layar besar ke modul kecil, **tanpa mengubah perilaku**, supaya:

1. perubahan berikutnya tidak menyentuh berkas 2.600 baris;
2. logika bisa diuji tanpa React Testing Library (toolchain ini **tidak punya RTL** — jadi satu-satunya cara menguji adalah mengeluarkan logika murni dari komponen).

**Definisi selesai:** setiap berkas di §2 turun di bawah batas yang tertulis, ketiga perintah verifikasi hijau, dan §7 tercentang.

---

## 2. Kondisi awal (diukur 2026-09-13, v1.75.1)

| Berkas | Baris | Target | Status |
|---|---|---|---|
| `src/screens/CaptureSession.tsx` | 2.591 | ≤ 1.900 | 🔄 belum |
| `src/screens/MonthlyReport.tsx` | 2.097 | ≤ 1.500 | 🔄 belum |
| `src/screens/Settings.tsx` | 1.109 | ≤ 700 | 🔄 belum |
| `src/screens/StudentDetail.tsx` | 1.039 | ≤ 800 | 🔄 belum (6/7 seksi) |
| `src/screens/payments/TagihanTab.tsx` | 1.004 | ≤ 800 | 🔄 belum |

Sudah selesai (jangan diulang): `captureSession/constants.ts`, `captureSession/helpers.ts`, `studentDetail/RiwayatSesi.tsx`, `studentDetail/IaEeTracker.tsx`.

**Aturan ukur ulang:** `node scripts/count-lines.mjs` (kalau belum ada, pakai PowerShell):
`Get-ChildItem src/screens -Recurse -File | ForEach-Object { "$((Get-Content $_).Count)  $($_.Name)" } | Sort-Object -Descending`

---

## 3. Urutan langkah

Urutannya **sengaja dari yang paling kecil & paling aman** ke yang paling besar. Jangan melompat.

| # | Langkah | Berkas | Risiko | Perkiraan |
|---|---|---|---|---|
| 1 | `AiTagTooltip` | CaptureSession | 🟢 sangat rendah | 20 mnt |
| 2 | `AiCostConfirmModal` | CaptureSession | 🟢 rendah | 25 mnt |
| 3 | `useAiFill` (hook) | CaptureSession | 🟠 sedang | 40 mnt |
| 4 | `CloseOutSheet` | CaptureSession | 🟠 sedang | 45 mnt |
| 5 | `NilaiRapor` | StudentDetail | 🟢 rendah | 30 mnt |
| 6 | `TagihanTab` → sub-komponen kartu | payments | 🟠 sedang | 45 mnt |

---

### LANGKAH 1 — Ekstrak `AiTagTooltip`

**Tujuan:** memindahkan modal penjelasan tag observasi (tooltip) ke komponen sendiri.

**Jangkar** (cari teks komentar ini di `src/screens/CaptureSession.tsx`):
`TOOLTIP OVERLAY`

**Yang dipindahkan:**
- Blok JSX mulai dari `{activeTooltip && (` tepat di bawah jangkar, sampai penutup `)}` milik blok itu.
- **Referensi baris saat panduan ditulis:** komentar `TOOLTIP OVERLAY` di baris **2105**, `<Modal` di **2108**, `</Modal>` di **2142** (berguna untuk memastikan Anda melihat blok yang benar; **jangan** mengandalkan angka ini setelah langkah lain dikerjakan).

**Berkas baru:** `src/screens/captureSession/AiTagTooltip.tsx`

**Kontrak (prop) — salin persis:**

```tsx
interface AiTagTooltipProps {
  tag: BehaviorTag | ResponseTag;
  type: "behavior" | "response";
  onClose: () => void;
}
```

**Isi komponen:**

```tsx
export default function AiTagTooltip({ tag, type, onClose }: AiTagTooltipProps) {
  // ← tempelkan JSX yang dipindahkan apa adanya
  // Di dalam JSX, ganti:
  //   activeTooltip.type    → type
  //   activeTooltip.tag     → tag
  //   setActiveTooltip(null) → onClose()
}
```

**Import yang dibutuhkan di berkas baru** (sesuaikan bila nama berkas aslinya berbeda):

```tsx
import Modal from "../../components/Modal";
import type { BehaviorTag, ResponseTag } from "../../lib/responseTaxonomy";
```

**Cara menyambungkan di `CaptureSession.tsx`** — ganti blok yang dipindahkan dengan:

```tsx
{activeTooltip && (
  <AiTagTooltip
    tag={activeTooltip.tag}
    type={activeTooltip.type}
    onClose={() => setActiveTooltip(null)}
  />
)}
```

**Selesai bila:** ketiga perintah verifikasi hijau, dan `CaptureSession.tsx` turun ≈ 40 baris.

---

### LANGKAH 2 — Ekstrak `AiCostConfirmModal`

**Tujuan:** memindahkan modal konfirmasi biaya AI langkah 5 (termasuk blok pratinjau data yang dikirim) ke komponen sendiri.

**Jangkar:** cari komentar `AI Cost confirm modal` — blok dimulai dengan `{showAiCostModal && (() => {` dan diakhiri `})()}`.

**Referensi baris saat panduan ditulis:** 2486–2588.

**Berkas baru:** `src/screens/captureSession/AiCostConfirmModal.tsx`

**Penting — blok ini adalah IIFE** (`(() => { ... })()`), dan di dalamnya memakai variabel dari induk: `activeSubjects`, `topic`, `currentDraft`, `aiNoteStyle`, `setAiNoteStyle`, `onConfirm`, `onCancel`. Semua variabel itu **harus jadi prop**.

**Kontrak (prop) — salin persis:**

```tsx
interface AiCostConfirmModalProps {
  open: boolean;
  subjects: string[];                 // ← dari activeSubjects di induk
  topic?: string;                     // ← dari topic
  draftNote: string;                  // ← dari currentDraft
  style: "rapikan" | "perluas" | "ringkas";
  onStyleChange: (s: "rapikan" | "perluas" | "ringkas") => void;
  onConfirm: () => void;
  onCancel: () => void;
}
```

**Di dalam komponen baru:** hapus IIFE-nya. Isi komponen = isi IIFE, dengan `return` di depan JSX-nya:

```tsx
export default function AiCostConfirmModal({ open, subjects, topic, draftNote, style, onStyleChange, onConfirm, onCancel }: AiCostConfirmModalProps) {
  if (!open) return null;
  const estimatedIDR = estimateDraftNoteCost(subjects, topic, draftNote);
  return ( /* ← JSX yang dipindahkan */ );
}
```

**Cara menyambungkan di `CaptureSession.tsx`:**

```tsx
<AiCostConfirmModal
  open={showAiCostModal}
  subjects={activeSubjects}
  topic={topic || undefined}
  draftNote={currentDraft}
  style={aiNoteStyle}
  onStyleChange={setAiNoteStyle}
  onConfirm={onAiNoteConfirm}   // ← lihat catatan
  onCancel={() => setShowAiCostModal(false)}
/>
```

> **Catatan penting:** di kode aslinya, tombol "OK, Lanjutkan" **berisi logika pemanggilan AI** (set `aiNoteLoading`, panggil `draftShortNote(...)`, tangani hasil, `catch` → `setAiError`). **Pindahkan logika itu ke fungsi di induk** bernama `onAiNoteConfirm` (`async () => { ... }`), lalu kirim sebagai prop `onConfirm`. Jangan menaruh pemanggilan AI di dalam komponen modal: komponen itu harus tetap murni tampilan.

**Selesai bila:** ketiga verifikasi hijau, `CaptureSession.tsx` turun ≈ 90 baris, dan tombol "✨ Draft AI" masih menghasilkan catatan seperti sebelumnya.

---

### LANGKAH 3 — Ekstrak hook `useAiFill`

**Tujuan:** mengumpulkan seluruh state & fungsi AI yang sekarang tersebar, ke satu hook.

**Jangkar state (cari komentar):** `// AI states` — **baris 327 saat panduan ditulis**
**Jangkar fungsi:** `handleLocalGenerate`, `appendNoteChip`
**Modals yang memakai state ini:** `Poles WA AI modal` (komentar di baris **2465**, `<AiCostModal` di **2466**), `AI Cost confirm modal` (sudah dipindah di langkah 2), dan tombol `✨ Draft AI` di langkah 5.

**Berkas baru:** `src/screens/captureSession/useAiFill.ts`

**Yang dipindahkan ke dalam hook (state):**

```
aiNoteLoading, aiWaLoading, aiWaText, aiError, showAiCostModal,
showAiWaModal, aiNoteDraft, aiNoteOriginal, aiNoteStyle, showAiContext
```

**Yang dipindahkan ke dalam hook (fungsi):** `handleLocalGenerate`, `appendNoteChip`, `onAiNoteConfirm` (dari langkah 2), dan handler "Poles AI" (blok `Poles WA AI modal`).

**Kontrak hook (parameter)** — hook butuh konteks dari layar:

```ts
interface UseAiFillParams {
  studentName?: string;
  sessionType?: SessionType;
  subjects: string[];
  topic?: string;
  mood?: string;
  needsWork: string;
  behaviorLabels: string[];
  responseLabel?: string;
  previousNote?: string;
  followUps: string[];
  engagement: { /* flags + score */ };
  originalWaMessage: string;
  tutorName: string;
  shortNote: string;
  setShortNote: (fn: (prev: string) => string) => void;
}
```

**Kontrak hook (nilai balik)** — yang harus dikembalikan, dengan nama sama seperti sekarang supaya JSX tidak perlu diubah:

```ts
return {
  aiNoteLoading, aiWaLoading, aiWaText, aiError,
  showAiCostModal, setShowAiCostModal,
  showAiWaModal, setShowAiWaModal,
  aiNoteDraft, setAiNoteDraft,
  aiNoteOriginal, setAiNoteOriginal,
  aiNoteStyle, setAiNoteStyle,
  showAiContext, setShowAiContext,
  handleLocalGenerate, appendNoteChip,
  onAiNoteConfirm, onPolishWa,
};
```

> **Trik mengurangi risiko:** di induk, tulis pengambilan hook dengan **nama yang sama** seperti variabel lama, sehingga **seluruh JSX tidak perlu disentuh**:
> ```ts
> const { aiNoteLoading, setShowAiCostModal, /* ... */ } = useAiFill({ /* params */ });
> ```
> Kalau setelah langkah ini `tsc` mengeluh `Cannot find name 'aiNoteStyle'`, artinya ada state yang belum Anda masukkan ke hook — tambahkan, jangan buat variabel baru di induk.

**Selesai bila:** ketiga verifikasi hijau; `CaptureSession.tsx` turun ≈ 150 baris; `useAiFill.ts` ≈ 150–200 baris.

---

### LANGKAH 4 — Ekstrak `CloseOutSheet`

**Tujuan:** memindahkan laporan sesi pasca-simpan (bagian terbesar yang tersisa).

**Jangkar:** cari komentar `CLOSE-OUT LAPORAN SESI` — blok dimulai `{showCloseOut && coSessionData && currentStudent && (`.
**Referensi baris saat panduan ditulis:** 2278–2463 (± 185 baris JSX).

**Berkas baru:** `src/screens/captureSession/CloseOutSheet.tsx`

**Kontrak (prop):**

```tsx
interface CloseOutSheetProps {
  studentName: string;
  session: { id: string; date: string; subjects: string[]; durationHours: number; shortNote: string; topic?: string; topicUnit?: string };
  followUps: Array<{ id: string; text: string }>;
  followUpText: string;
  setFollowUpText: (v: string) => void;
  saving: boolean;
  waNumber: string;
  originalWaMessage: string;     // ← dari buildWaMessage(...) di induk
  aiWaText: string | null;       // ← dari useAiFill
  onAddFollowUp: () => void;     // ← addCoFollowUp
  onDone: () => void;            // ← handleCloseOutDone
  onClose: () => void;           // ← closeReport
  onFixNote: () => void;         // ← handleFixNote
  onPolishWa: () => void;        // ← onPolishWa (dari useAiFill)
}
```

**State milik sheet yang harus tetap di induk (JANGAN dipindah):** `showCloseOut`, `coSessionData`, `coFollowUps`, `coFollowUpText`, `coSaving`, `editingSavedSession`. State itu juga dipakai `handleSave`, draf (`draftForm`), dan tombol "Buka laporan sesi" — memindahkannya akan memecah draf.

**Selesai bila:** ketiga verifikasi hijau; `CaptureSession.tsx` turun ≈ 180 baris.

---

### LANGKAH 5 — Ekstrak `NilaiRapor` dari `StudentDetail.tsx`

**Tujuan:** memindahkan seksi nilai/rapor (satu-satunya seksi tersisa yang belum dipindah).

**Jangkar:** cari tab dengan label `"nilai"` di `detailTab === "nilai"` — **baris 668 saat panduan ditulis**. Seksi ini memuat daftar nilai per mapel + form tambah nilai + perbandingan prediksi vs aktual.

**Berkas baru:** `src/screens/studentDetail/NilaiRapor.tsx`

**Cara menemukan batas blok:** bloknya mulai `{detailTab === "nilai" && (<>` dan berakhir di `</>)}` yang sejajar. **Hitung pasangan kurungnya dengan hati-hati** — seksi ini memuat beberapa `map()` bersarang.

**Aturan:** kalau seksi ini memakai lebih dari 10 variabel dari induk, **berhenti** dan tulis di §8 bahwa langkah ini butuh hook `useRapor` dulu (jangan paksakan 15 prop).

**Selesai bila:** ketiga verifikasi hijau; `StudentDetail.tsx` ≤ 800 baris.

---

### LANGKAH 6 — Pecah `payments/TagihanTab.tsx`

**Tujuan:** berkas 1.004 baris berisi daftar tagihan + filter + aksi per baris.

**Jangkar:** cari komponen kartu/baris tagihan di dalam `map(...)` — biasanya satu blok JSX besar per invoice.

**Berkas baru:** `src/screens/payments/InvoiceRow.tsx` (satu baris tagihan) dan/atau `InvoiceFilters.tsx` (baris filter di atas daftar).

**Kontrak `InvoiceRow` (mulai dari ini, sesuaikan dengan kode):**

```tsx
interface InvoiceRowProps {
  invoice: /* tipe invoice dari useInvoiceFilters / db */;
  studentName: string;
  onOpen: () => void;
  onTogglePaid: () => void;
  onSendWa: () => void;
  onDelete: () => void;
}
```

**Aturan:** pecah **satu sub-komponen per langkah**; jalankan verifikasi sebelum pecah yang kedua.

**Selesai bila:** ketiga verifikasi hijau; `TagihanTab.tsx` ≤ 800 baris.

---

## 4. Pola umum memindahkan blok JSX (berlaku untuk semua langkah)

Gunakan pola ini berulang-ulang; jangan menciptakan cara baru.

**Langkah A — temukan batas blok.** Blok JSX selalu salah satu dari:

| Bentuk | Cara menemukan akhirnya |
|---|---|
| `{kondisi && (` … `)}` | cari `)}` pertama yang **indentasinya sama** dengan `{kondisi` |
| `{kondisi && (<>` … `</>)}` | cari `</>)}` pada indentasi yang sama |
| `{kondisi && (() => {` … `})()}` | cari `})()}` pada indentasi yang sama |

**Langkah B — buat berkas baru** dengan struktur ini:

```tsx
import /* hanya yang dipakai */;

interface XxxProps { /* semua nilai dari induk */ }

/** Satu-dua baris: apa komponen ini, dan dari mana ia dipindah. */
export default function Xxx({ /* prop */ }: XxxProps) {
  return ( /* JSX yang dipindahkan apa adanya */ );
}
```

**Langkah C — sambungkan di induk:** tambahkan `import Xxx from "./captureSession/Xxx";` (atau path yang benar) dan ganti blok lama dengan elemen komponen.

**Langkah D — ganti nama variabel induk di dalam JSX yang dipindah:** setiap variabel induk yang dipakai JSX harus jadi prop atau lokal komponen. Cara paling aman: **beri nama prop SAMA dengan nama variabel lama**, sehingga isi JSX tidak perlu diubah selain menghapus prefix (mis. `coFollowUps` → prop bernama `followUps` **berubah**; usahakan nama prop = nama lama bila tidak bentrok).

**Langkah E — verifikasi 4 perintah.** Bila `tsc` menyebut `Cannot find name 'X'`, itu tanda variabel induk yang belum Anda jadikan prop. Tambahkan prop-nya, jangan buat state baru.

---

## 5. Jebakan yang sudah pernah menggigit (baca sebelum mulai)

| Jebakan | Gejala | Cara menghindar |
|---|---|---|
| **Splice baris dengan skrip menghapus baris pembuka** | `{detailTab === "x" && (<>` muncul **dua kali** (pernah terjadi pada `StudentDetail.tsx`) | Setelah memotong dengan skrip, **selalu baca ulang 10 baris di sekitar sambungan** |
| **State yang juga dipakai draf ikut dipindah** | Draf Catat Sesi berhenti memulihkan isian | `draftForm` di induk memakai `subjects`, `topic`, `topicUnit`, `shortNote`, `mood`, `engagementLevel`, `engagementFlags`, `behaviorTags`, `responseTag`, `situasiNote`, `sessionType`, `photo`, `signature`, `closeout`. **State ini tidak boleh pindah** |
| **`useMemo`/`useEffect` dependency berubah diam-diam** | Layar berkedip atau draf tertulis berulang (audit C-17 pernah terjadi) | Setelah memindah, pastikan jumlah dependency array **tidak berubah** |
| **Test timeout dianggap regresi** | 4 test gagal dengan durasi 22–150 detik | Jalankan `npm test` **sendirian**; lihat §0 |
| **Menambah test yang menguji implementasi, bukan perilaku** | Test rapuh, gagal setiap refactor | Uji masukan→keluaran fungsi murni; jangan uji jumlah prop atau nama kelas CSS |
| **Mengubah teks yang dilihat pengguna** | Audit UX & `CHANGELOG` tidak lagi cocok | Salin string apa adanya, termasuk emoji dan tanda baca |

---

## 6. Kalau macet

1. **`tsc` menyebut nama yang tidak dikenal** → variabel induk belum jadi prop, atau import belum ditambah.
2. **`tsc` menyebut tipe tidak cocok** → jangan pakai `as any`. Perbaiki tipe prop-nya (biasanya `string[]` vs `string`, atau `| undefined` yang belum ditulis).
3. **`eslint` menyebut `react-refresh/only-export-components`** → berarti Anda mengekspor konstanta/fungsi dari berkas komponen. Pindahkan konstanta itu ke `constants.ts` atau `helpers.ts` (pola ini sudah dipakai; lihat `src/lib/moods.ts` sebagai contoh).
4. **Perilaku berubah tapi verifikasi hijau** (test tidak menangkapnya) → kembalikan perubahan langkah itu dan catat di §8; jangan menutupi dengan menambah test yang mengunci perilaku baru.
5. **Berkas jadi lebih besar dari sebelumnya** → Anda memindahkan JSX tapi menambah prop terlalu banyak. Ganti pendekatan: bungkus state terkait ke satu hook dulu, baru pindahkan JSX.

---

## 7. Progres (centang setelah verifikasi hijau)

- [x] **Langkah 1** `AiTagTooltip` — CaptureSession turun ≈40 baris
- [x] **Langkah 2** `AiCostConfirmModal` + `onAiNoteConfirm` — turun ≈47 baris
- [x] **Langkah 3** `useAiFill` — turun ≈150 baris
- [ ] **Langkah 4** `CloseOutSheet` — turun ≈180 baris → **CaptureSession ≤ 1.900** ✅ target
- [ ] **Langkah 5** `NilaiRapor` — StudentDetail ≤ 800
- [x] **Langkah 6** `payments/InvoiceRow` — TagihanTab ≤ 800

Setiap kali selesai: perbarui juga `TODO.md` (bagian 🔵) dan baris "Diperbarui" di `docs/README.md`.

---

## 8. Catatan penyimpangan (isi kalau ada yang tidak sesuai panduan)

| Tanggal | Langkah | Yang terjadi | Keputusan |
|---|---|---|---|
| | | | |
| 2026-09-15 | 4 | `CloseOutSheet` berhasil dipindah, tetapi `CaptureSession.tsx` masih 2.270 baris (target ≤1.900). | Jangan centang; lanjutkan dengan ekstraksi terpisah. |
| 2026-09-15 | 5 | `NilaiRapor` berhasil dipindah, tetapi `StudentDetail.tsx` masih 1.037 baris (target ≤800). | Jangan centang; ukur ulang dan pecah seksi lain dengan tugas terpisah. |

---

## 9. Riwayat tugas ini

| Tanggal | Perubahan | Versi | Hasil |
|---|---|---|---|
| 2026-09-13 | Dibuat sebagai lanjutan refactor putaran 1 | v1.75.1 | 2 modul + 2 komponen sudah dipindah sebelumnya; 6 langkah tersisa di §3 |
