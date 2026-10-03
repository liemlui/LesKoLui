# TASK-07 — Kontrak AI Berbiaya (satu jalur, harga selalu terlihat)

> **STATUS:** `todo`
> **PEMILIK:** agen AI
> **DIBUAT:** 2026-09-25 · **BASELINE:** v1.75.1 (561 tes / 50 berkas)
> **PERKIRAAN:** 6 langkah × 30–45 menit
> **INDUK:** [`TASK-03-blueprint-uiux.md`](TASK-03-blueprint-uiux.md) · **KONTRAK:** [`arsitektur/11`](../arsitektur/11-uiux-ai-cost-dan-privasi.md) §K2
> **PRASYARAT:** [`TASK-04`](TASK-04-fondasi-visual.md) (primitif `Sheet`)
> **BACA DULU:** [`ATURAN-AI.md`](ATURAN-AI.md) — kontrak kerja, keputusan terkunci, daftar larangan

## 0. Cara pakai berkas ini

- **Keputusan pemilik (2026-09-25), apa adanya:** *"Semua penggunaan AI harus dengan tombol biaya."*
  Bentuknya: **modal konfirmasi tiap panggilan** (bukan saldo prabayar).
- Tugas ini **tidak** menambah fitur AI baru. Ia menyatukan yang sudah ada.
- Tugas ini **tidak boleh** mengubah isi prompt atau bentuk hasil AI. Yang berubah hanya jalur pemanggilannya.
- **Semua panggilan AI harus lewat satu jalur.** Setelah tugas ini, memanggil `aiClient` langsung dari
  komponen adalah pelanggaran kontrak.

**Perintah verifikasi standar (dari `les-ko-lui/`):**

```powershell
npx tsc -b        # harapan: tanpa keluaran
npx eslint src    # harapan: tanpa keluaran
npm test          # harapan: 561+ lulus, 0 gagal
npm run build     # harapan: built + dist/sw.js

# Peta jalur AI — setelah selesai, hasilnya hanya boleh menyebut satu jalur
# (REKURSIF: pola lama `Select-String -Path "src\**\*.tsx"` tidak menjangkau subfolder)
Get-ChildItem -Recurse src -Include *.tsx -File | Select-String -Pattern "AiCostModal|AiCostConfirmModal|useAiAction|estimate.*Cost\(" |
  ForEach-Object { "{0}:{1}: {2}" -f $_.Path, $_.LineNumber, $_.Line.Trim() }
```

## 1. Tujuan & definisi selesai

Sekarang ada **7 titik pemanggil**, **2 modal berbeda**, dan **8 fungsi estimasi** yang tersebar.
Setiap tempat menyusun sendiri konfirmasi + estimasi + format rupiah — tiga lapisan logika yang
digandakan tujuh kali. Akibatnya: tidak ada satu tempat pun yang bisa menjawab *"berapa pemakaian AI
bulan ini?"*, dan tidak ada pagar belanja.

**Selesai berarti:**

- [ ] **Satu jalur**: `useAiAction()` — estimasi → modal → eksekusi → catat pemakaian
- [ ] **Tidak ada tombol AI tanpa harga** (label memuat `· ~RpNN`), dan **modal selalu muncul** sebelum panggilan
- [ ] **Satu komponen modal** (berkas `AiCostModal.tsx` yang lama digantikan)
- [ ] **Batas bulanan opsional** di `Settings.ai.monthlyBudgetIdr` — **default kosong = tanpa batas** (Q1 2026-10-01); bila diisi & terlampaui, pesannya jelas
- [ ] **Setiap panggilan dicatat** sebagai `AuditEntry` dengan `action: "ai.call"`, `costIdr`, `aiFeature`
- [ ] **Tanpa API key / anggaran habis → fitur inti tetap jalan** dari aturan lokal
- [ ] Estimator baru **tidak** dibuat; yang ada dipakai (`aiClient.ts:343,348,353,357,361,499,576`)

## 2. Kondisi awal (angka nyata, 2026-09-25)

| Berkas | Baris | Peran sekarang |
|---|---:|---|
| `src/components/AiCostModal.tsx` | 50 | modal biaya (nama ekspor: `AiCostModal`, **named**) |
| `src/screens/captureSession/AiCostConfirmModal.tsx` | — | modal biaya kedua (default export) |
| `src/screens/captureSession/useAiFill.ts` | — | 3 titik pemakaian |
| `src/screens/CaptureSession.tsx` | 2.099 | 8 kemunculan (termasuk impor) |
| `src/screens/MonthlyReport.tsx` | 2.097 | 3 kemunculan |
| `src/screens/payments/RingkasanTab.tsx` | 751 | 2 kemunculan |
| `src/lib/aiClient.ts` | — | 8 estimator + pemanggil API |
| `src/lib/aiConfig.ts` | 29 | tarif, kurs, label model, catatan biaya |

**Sudah bagus dan dipertahankan:**

- `aiConfig.ts` — tarif peak/off-peak, `AI_ESTIMATE_IDR_PER_USD`, `DEEPSEEK_COST_NOTE`, dan tautan sumber resmi.
- Modal lama sudah menampilkan **data yang dikirim** dan **tautan tarif resmi**. Sifat ini harus bertahan.
- `src/lib/aiValidation.ts` — validasi JSON hasil AI. Jangan dilewati.

## 3. Urutan langkah

### Langkah 1 — Pembukuan: tipe, penulis catatan, pembaca pemakaian

**Tujuan:** ada satu tempat yang tahu "berapa yang sudah dipakai bulan ini".

**Berkas:** `src/db/types.ts` (tambah field), `src/db/repos/auditRepo.ts` (tambah fungsi baca)

**Perubahan tipe (sesuai kontrak [`arsitektur/11`](../arsitektur/11-uiux-ai-cost-dan-privasi.md) §4):**

```ts
// AuditAction — tambah satu anggota
| "ai.call"

// AuditEntry — tambah dua field opsional
/** Perkiraan biaya rupiah (bukan tagihan; lihat DEEPSEEK_COST_NOTE). */
costIdr?: number;
/** Nama fungsi AI yang dipanggil, mis. "generateFinancialInsights". */
aiFeature?: string;

// Settings.ai — tambah satu field opsional
/** Batas belanja AI per bulan (rupiah). undefined = tanpa batas. */
monthlyBudgetIdr?: number;
```

**Fungsi baru di `auditRepo.ts`:**

```ts
/** Catat satu panggilan AI. Mengembalikan id entri. */
export async function logAiCall(input: {
  aiFeature: string;      // nama fungsi aiClient, mis. "estimateDraftNoteCost" → "draftNote"
  costIdr: number;        // estimasi yang ditampilkan di modal
  details?: string;       // ringkasan manusia, mis. "Ringkasan AI keuangan Sep 2026"
}): Promise<string>;

/** Total pemakaian AI pada satu bulan (YYYY-MM). */
export async function getAiUsage(month: string): Promise<{ count: number; totalIdr: number }>;
```

**Aturan:**

1. Tanggal difilter memakai **WIB**, bukan UTC — pakai `todayWIB()` dari `src/lib/format.ts`.
2. `auditLog` **tidak ikut backup** (sudah begitu). Artinya pemakaian bersifat **per perangkat** —
   tulis ini di komentar, karena itu disengaja: anggaran adalah pengaturan perangkat.
3. **Jangan** mengubah skema Dexie. `auditLog` sudah ada; kita hanya mengisi field baru.
   Kalau kamu merasa perlu menaikkan versi skema, **berhenti** dan catat di §8.

**Selesai bila:** `logAiCall` + `getAiUsage` ada dan diuji: (a) dua panggilan di bulan sama → count 2,
(b) panggilan di bulan lain tidak terhitung, (c) batas bulan WIB diuji di tanggal 1 dan akhir bulan.

**Verifikasi:** perintah standar §0 + `npm test -- aiUsage`.

---

### Langkah 2 — `useAiAction()`: satu jalur untuk semua

**Tujuan:** komponen tidak lagi tahu soal modal, estimasi, atau pencatatan.

**Berkas baru:** `src/hooks/useAiAction.ts`

**Kontrak (salin apa adanya):**

```ts
export interface AiActionRequest<T> {
  /** Nama fitur untuk catatan pemakaian, mis. "financialInsights". */
  feature: string;
  /** Judul di modal, mis. "Jalankan Ringkasan AI?". */
  title: string;
  /** Satu kalimat: apa yang AI lakukan. */
  description: string;
  /** Chip daftar data yang dikirim, mis. ["34 sesi", "3 tagihan"]. */
  dataSent: string[];
  /** Apakah nama murid ikut terkirim. Ditampilkan apa adanya (biasanya false). */
  includesStudentNames: boolean;
  /** Perkiraan biaya rupiah — dari estimator yang SUDAH ADA di aiClient.ts. */
  estimatedIDR: number;
  /** Konten tambahan opsional di modal (mis. "regenerasi paksa"). */
  extra?: React.ReactNode;
  /** Baru dijalankan setelah pengguna menekan "Jalankan". */
  run: () => Promise<T>;
}

export interface AiActionState<T> {
  /** true selama panggilan berjalan. */
  busy: boolean;
  /** Pesan galat manusia (bukan stack trace). */
  error: string;
  /** Hasil terakhir. */
  result?: T;
  /** Buka modal konfirmasi untuk permintaan ini. */
  request(req: AiActionRequest<T>): void;
}

export function useAiAction<T>(): AiActionState<T> & {
  /** Props siap-pakai untuk modal; render <AiCostModal {...modalProps} /> sekali per layar. */
  modalProps: AiCostModalProps | null;
};
```

**Aturan:**

1. `run()` **hanya** dipanggil setelah tombol `Jalankan` ditekan. Membatalkan modal = **nol** panggilan API.
2. Sebelum menjalankan: periksa `Settings.ai.apiKey`, lalu batas bulanan (`getAiUsage` + `monthlyBudgetIdr`).
   - API key kosong → `error = "AI belum diaktifkan."` dan **jangan** buka modal.
   - **`monthlyBudgetIdr` kosong/undefined → tidak ada penolakan** (ini keadaan default; Q1 2026-10-01).
   - `monthlyBudgetIdr` diisi **dan** pemakaian ≥ batas → `error = "Batas belanja AI bulan ini sudah tercapai (Rp x / Rp y)."`
     dan tombol di luar menampilkan keadaan nonaktif dengan alasan yang terlihat.
3. Setelah `run()` sukses: panggil `logAiCall` dengan **estimasi** yang ditampilkan di modal
   (`estimatedIDR`) — bukan perhitungan ulang dari token yang mungkin tidak tersedia.
4. `busy` mencegah dua panggilan bersamaan (tombol `Jalankan` nonaktif + label "Menjalankan…").
5. **Jangan** menangani galat dengan membuang hasil lama. Hasil sebelumnya tetap ditampilkan.

**Selesai bila:** hook ada + tes: (a) membatalkan modal tidak memanggil `run`, (b) tanpa API key tidak
membuka modal, (c) **batas kosong → tidak memblokir** *(tes ini WAJIB, menggantikan tes lama)*, (d) batas
diisi & terlampaui → memblokir *(**opsional** — dikerjakan bila waktu cukup; Q1 2026-10-01)*, (e) sukses →
`logAiCall` terpanggil sekali dengan `costIdr` yang sama seperti `estimatedIDR`.

**Verifikasi:** perintah standar §0 + `npm test -- useAiAction`.

---

### Langkah 3 — Satu modal biaya (menggantikan dua)

**Tujuan:** hapus modal kedua; tinggal satu, dengan bentuk dari mockup.

**Berkas:** `src/components/AiCostModal.tsx` (dirombak), **hapus pemakaian**
`src/screens/captureSession/AiCostConfirmModal.tsx`

**Kontrak (nama ekspor dipertahankan supaya diff kecil):**

```tsx
export interface AiCostModalProps {
  open: boolean;
  title: string;              // "Jalankan Ringkasan AI?"
  description: string;        // satu kalimat
  dataSent: string[];         // chip daftar data
  includesStudentNames: boolean;  // ditampilkan "Nama murid ikut terkirim? Tidak/Ya"
  estimatedIDR: number;
  /** Pemakaian bulan berjalan + batas, mis. { usedIdr: 3400, count: 11, budgetIdr: 25000 }. */
  usage: { usedIdr: number; count: number; budgetIdr?: number };
  extra?: React.ReactNode;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
export function AiCostModal(props: AiCostModalProps): JSX.Element | null;
```

**Isi modal (urutan ini, dari mockup `uang-2026-09-24.html` frame ②):**

1. Judul + deskripsi
2. **Chip daftar data yang dikirim**
3. Panel: *Nama murid ikut terkirim?* · *Catatan bebas terkirim?* · **Perkiraan biaya** `~Rp 60`
4. Catatan kecil: `DEEPSEEK_COST_NOTE` + tautan `DEEPSEEK_PRICING_URL` (**pertahankan** — sudah ada)
5. Tombol `Jalankan` (lebar penuh) + `Batal`
6. Baris paling bawah: `Pemakaian AI bulan ini: Rp 3.400 · 11 panggilan` (tanpa batas — keadaan default,
   Q1 2026-10-01). Bila pengguna **mengisi** batas, tambahkan `· batas Rp 25.000`.

**Aturan:**

1. Modal ini memakai primitif `Sheet` dari `TASK-04` (Pola D: panel dari bawah di HP).
2. **Jangan** menghapus `DEEPSEEK_COST_NOTE` atau tautan sumber — itu bagian transparansi biaya.
3. Kalau `estimatedIDR < 1`, tetap tampilkan `~Rp 1` (jangan `Rp 0,00` — menyesatkan).

**Selesai bila:** hanya satu komponen modal biaya yang diimpor di `src/`; bentuknya memuat keenam
bagian di atas; `Select-String` untuk `AiCostConfirmModal` di `src/**/*.tsx` → kosong.

**Verifikasi:** perintah standar §0 + peta jalur AI di §0.

---

### Langkah 4 — Pindahkan 7 titik pemanggil ke satu jalur

**Tujuan:** tidak ada lagi pemanggilan langsung.

**Berkas sasaran (urutan dari risiko terendah):**

| # | Berkas | Jangkar | Fitur AI |
|---|---|---|---|
| 1 | `src/screens/payments/RingkasanTab.tsx` | `title="Analisis AI Keuangan"` | `generateFinancialInsights` / `estimateFinancialInsightsCost()` |
| 2 | `src/screens/captureSession/useAiFill.ts` | 3 titik | `draftShortNote` / `estimateDraftNoteCost` |
| 3 | `src/screens/MonthlyReport.tsx` | 3 titik | `generateNarratives` / `generateReportSummary` |
| 4 | `src/screens/CaptureSession.tsx` | 8 kemunculan | `polishWhatsApp`, `draftStudyNote`, `analyzeStudent` |

**Aturan:**

1. Setiap tempat: hapus `useState` modal + estimasi lokal → ganti `useAiAction()` dan render
   **satu** `<AiCostModal {...modalProps} />` di tingkat layar.
2. **Pertahankan** `estimate*Cost()` yang sudah ada sebagai nilai `estimatedIDR`. Estimator adalah
   bagian yang sudah teruji (`aiCost.test.ts`) — jangan diubah.
3. `dataSent` dan `includesStudentNames` **wajib** diisi dengan jujur. Rujuk tabel pengiriman data di
   [`docs/arsitektur/06-ai-generation.md`](../arsitektur/06-ai-generation.md) — tabel itu sudah
   mendaftar apa yang dikirim per menu. **Selaraskan**, dan kalau ada yang berbeda, perbaiki dokumen 06
   di putaran yang sama (aturan pemeliharaan `docs/README.md` §6.2 poin 4).
4. Setelah semua selesai: perbarui `docs/arsitektur/06-ai-generation.md` untuk menyebut satu jalur
   `useAiAction` + tabel biaya/pencatatan.

**Selesai bila:** peta jalur AI di §0 tidak lagi menyebut `aiClient` dipanggil dari komponen;
`npm test` hijau (termasuk `aiClient.test.ts`, `aiCost.test.ts`, `aiSettings.test.ts`).

**Verifikasi:** perintah standar §0 + peta jalur AI.

---

### Langkah 5 — Pemakaian AI & batas opsional di Pengaturan

**Tujuan:** pemilik bisa **melihat pemakaian** dan (bila mau) menetapkan batas. Batas **tidak** dipasang
secara default — *keputusan pemilik 2026-10-01 (Q1)*.

**Berkas:** `src/screens/Settings.tsx` (bagian AI)

**Yang dilakukan:**

1. Tambah kolom **"Batas belanja AI per bulan"** (rupiah). **Default: kosong = tanpa batas** —
   jangan mengisi nilai awal apa pun.
2. Tampilkan pemakaian bulan berjalan: tanpa batas → `Rp 3.400 · 11 panggilan bulan ini`;
   dengan batas → `Rp 3.400 dari Rp 25.000 · 11 panggilan`.
   Tombol `Atur ulang` (hapus batas) dan `Lihat riwayat` (daftar 20 `ai.call` terakhir: waktu, fitur, biaya).
3. Simpan lewat jalur penyimpanan `Settings` yang **sudah ada**. Jangan membuat kunci `localStorage` baru.
4. Kalau `monthlyBudgetIdr` diisi di bawah pemakaian bulan berjalan, beri peringatan lembut —
   jangan menolak.

**Selesai bila:** batas tersimpan & terbaca ulang; riwayat menampilkan entri `ai.call` dengan waktu,
fitur, dan biaya; `npm test -- aiSettings` tetap lulus.

**Verifikasi:** perintah standar §0 + `npm test -- aiSettings`.

---

### Langkah 6 — Buktikan bahwa fitur inti tidak bergantung pada AI

**Tujuan:** menutup kontrak `K2.5` dengan bukti, bukan klaim.

**Yang dilakukan:**

1. **Tes** `src/__tests__/aiOptionalFallback.test.ts`:
   - (a) `Settings.ai.apiKey` kosong → layar/blok tetap menghasilkan ringkasan lokal
     (untuk keuangan: `buildFinanceOverview().ringkasLokal` dari [`TASK-05`](TASK-05-rombak-keuangan.md));
   - (b) anggaran terlampaui → jalur yang sama memakai hasil lokal;
   - (c) panggilan AI gagal (mock) → hasil lokal tetap tampil dan galat tidak menutupi layar.
2. **Perbarui** [`docs/arsitektur/06-ai-generation.md`](../arsitektur/06-ai-generation.md):
   tambah bagian **"Kalau AI tidak tersedia"** yang menyebut perilaku tiap fitur AI saat tanpa API key.
3. Catat hasil pengukuran pemakaian: jalankan 3 fitur AI sekali, lalu tampilkan
   `getAiUsage(bulan)` dan bandingkan dengan estimasi modal. Selisihnya wajar bila ≤±20%;
   kalau lebih, itu masalah estimator — catat di §8, **jangan** diakali dengan mengubah rumus biaya.

**Selesai bila:** tiga skenario (a)(b)(c) lulus sebagai tes; dokumen 06 memuat bagian baru;
selisih estimasi vs pemakaian tercatat di §9.

**Verifikasi:** perintah standar §0 + `npm test -- aiOptionalFallback`.

## 4. Pola umum

- **Pola panggil AI (satu-satunya):**
  `const ai = useAiAction<Hasil>(); ... ai.request({ feature, title, description, dataSent, includesStudentNames, estimatedIDR: estimateXCost(...), run: () => xClientFn(...) });`
  lalu render `<AiCostModal {...ai.modalProps} />` **sekali** di layar.
- **Pola tombol:** label memuat `· ~RpNN`; tombol nonaktif bila anggaran habis **dengan alasan terlihat**.
- **Pola gagal:** tampilkan hasil lokal + satu baris tenang. Bukan dialog galat, bukan layar kosong.
- **Pola catat:** satu `logAiCall` per panggilan **sukses**. Panggilan gagal tidak dicatat sebagai pemakaian.

## 5. Jebakan yang sudah pernah terjadi

| Jebakan | Gejala | Cara menghindar |
|---|---|---|
| Modal dibatalkan tapi API tetap terpanggil | biaya keluar tanpa persetujuan | `run()` hanya dari `onConfirm`; uji eksplisit |
| Estimasi dihitung dua kali dengan hasil berbeda | angka di tombol ≠ angka di modal | Hitung sekali, simpan di `AiActionRequest` |
| `logAiCall` dipanggil sebelum panggilan | pemakaian naik padahal gagal | Catat **setelah** sukses |
| Pemakaian dihitung UTC | panggilan tanggal 1 pagi WIB masuk bulan lalu | Pakai `todayWIB()` |
| Dua modal dirender sekaligus | dua lapisan gelap, tombol tak bisa ditekan | Satu `<AiCostModal>` per layar, dari `modalProps` |
| `DEEPSEEK_COST_NOTE` hilang saat merombak modal | pengguna tidak tahu itu perkiraan | Pertahankan catatan + tautan sumber |
| Menaikkan skema Dexie untuk field opsional | risiko migrasi tanpa perlu | Field opsional di tabel yang ada sudah cukup |

## 6. Kalau macet

| Gejala | Sebab | Tindakan |
|---|---|---|
| Modal tidak muncul | `modalProps` null / `request()` tidak dipanggil | Periksa `request` dipanggil dari `onClick`, bukan di render |
| Biaya tercatat dua kali | `run()` dipanggil dua kali (klik ganda) | Kunci dengan `busy`; nonaktifkan tombol saat `busy` |
| Anggaran memblokir padahal baru bulan baru | filter bulan memakai UTC | Ganti ke WIB |
| `npm test -- aiClient` gagal | jalur baru mengubah bentuk permintaan | Jalur baru **tidak boleh** mengubah payload; bandingkan dengan tes lama |
| Riwayat kosong padahal ada panggilan | entri lama tidak punya `costIdr` | Riwayat harus toleran: tampilkan `—` bila kosong |

> Jangan menutupi macet dengan menaikkan batas anggaran atau melewati modal "sekali saja".
> Modal itu justru tujuan tugas ini.

## 7. Larangan konkret

| ❌ JANGAN sentuh | Alasan |
|---|---|
| Prompt di `src/lib/aiClient.ts` | mengubahnya mengubah mutu hasil; tugas ini soal jalur, bukan isi |
| `src/lib/aiConfig.ts` (tarif & kurs) | angka tarif bersumber resmi; perbarui hanya dengan rujukan baru |
| `src/lib/aiValidation.ts` | pengaman hasil AI; jangan dilewati |
| `src/lib/aiIncremental.ts` | dedup narasi; perilaku lama harus tetap |
| `src/lib/crypto.ts` / alur PIN | di luar lingkup |
| `src/db/db.ts` (versi skema) | field opsional tidak butuh naik versi |

## 8. Catatan penyimpangan

| Tanggal | Langkah | Yang terjadi | Keputusan |
|---|---|---|---|
| | | | |

## 9. Progres

- [ ] **L1 — Pembukuan.** `npm test -- aiUsage`: ___ · skema Dexie **tidak** dinaikkan: ya/tidak
- [ ] **L2 — `useAiAction`.** 4 kasus tes lulus: ___
- [ ] **L3 — Satu modal.** Sisa impor modal kedua: ___
- [ ] **L4 — 7 titik dipindahkan.** Pemanggilan `aiClient` langsung dari komponen: ___
- [ ] **L5 — Pemakaian & batas opsional.** `npm test -- aiSettings`: ___ · default tanpa batas: ya/tidak
- [ ] **L6 — AI opsional.** 3 skenario lulus: ___ · selisih estimasi vs pemakaian: ___%

## 10. Riwayat tugas

| Tanggal | Perubahan | Versi | Hasil |
|---|---|---|---|
| 2026-09-25 | Dibuat dari keputusan pemilik: semua AI lewat tombol biaya | v1.75.1 | `todo` |
| 2026-10-01 | Amandemen **Q1 (B4)**: batas belanja AI **default kosong = tanpa batas**; tes blokir jadi opsional; Langkah 5 menjadi "Pemakaian AI & batas opsional" | v1.79.3 | `todo` |
