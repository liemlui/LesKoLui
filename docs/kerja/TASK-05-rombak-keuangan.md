# TASK-05 — Rombak Keuangan (5 mekanisme → 1 daftar, 4 tab → 1 layar)

> **STATUS:** `todo`
> **PEMILIK:** agen AI
> **DIBUAT:** 2026-09-25 · **Portret dokumen:** v1.75.1 (angka mutakhir lewat `npm run measure`)
> **PERKIRAAN:** 8 langkah × 30–50 menit
> **INDUK:** [`TASK-03-blueprint-uiux.md`](TASK-03-blueprint-uiux.md) · **KONTRAK:** [`arsitektur/11`](../arsip/arsitektur/11-uiux-ai-cost-dan-privasi.md) §K1
> **BACA DULU:** [`ATURAN-AI.md`](ATURAN-AI.md) — kontrak kerja, keputusan terkunci, daftar larangan
> **PRASYARAT:** [`TASK-04`](TASK-04-fondasi-visual.md) (token + primitif), [`TASK-08`](TASK-08-satu-pintu-uang.md) (uang tertutup)
> **LAMPIRAN VISUAL:** [`docs/mockups/uang-2026-09-24.html`](../mockups/uang-2026-09-24.html)

## 0. Cara pakai berkas ini

- **Satu langkah per putaran.** Langkah 1–3 murni **fungsi + tes** (tanpa UI). Jangan lompat ke UI
  sebelum fungsinya hijau — justru itu yang membuat tugas ini bisa dipercaya.
- Perubahan terbesar ada di langkah 6 (layar Uang). Kerjakan hanya setelah 1–5 lulus.
- **Angka tidak boleh berubah.** Kalau jumlah "belum ditagih" berbeda dari `RingkasanTab` sekarang,
  langkah itu salah — bukan "perbaikan".

**Perintah verifikasi standar (dari `les-ko-lui/`):**

```powershell
npx tsc -b        # harapan: tanpa keluaran
npx eslint src    # harapan: tanpa keluaran
npm test          # harapan: 561+ lulus, 0 gagal
npm run build     # harapan: built + dist/sw.js
npm run e2e       # harapan: lulus
```

## 1. Tujuan & definisi selesai

Keuangan adalah bagian yang paling perlu dirombak (keputusan pemilik, 2026-09-25). Keadaannya sekarang
bertumpuk, bukan tumbuh: **4 tab**, **6 blok** di `RingkasanTab`, **5 mekanisme tagih**, **2 UI berbeda**
untuk tagihan paket, **tabel 8 kolom** di `RekapTab`, dan `FinancePipelineBoard` 6 langkah yang berpindah
lintas rute. Bahkan layar perlu menjelaskan cakupan tab-nya sendiri (`TAB_SCOPE`, `Payments.tsx:34`) —
tanda arsitektur informasinya sudah tidak bisa menjelaskan diri.

**Selesai berarti:**

- [ ] **4 tab → 1 layar** (Uang) dengan 3 blok tetap: Ringkasan AI · Perlu ditagih · Bulan ini
- [ ] **5 mekanisme tagih → 1 daftar** `BarisTagihan`, mekanisme tampil sebagai label (`mode` + `cakupan`)
- [ ] `FinancePipelineBoard` **di-redesign** (board + list, tap-driven) dan hidup **di dalam blok "Perlu ditagih"** — *amandemen 2026-10-01 (Q3), sebelumnya "dibubarkan"*
- [ ] `RekapTab` 8 kolom → 3 kolom + "lihat lengkap"
- [ ] Navigasi bawah: **5 pintu + FAB → 3 pintu + 1 aksi di nav**
- [ ] AI **hanya** memilih & mengurutkan; jumlah rupiah dihitung aturan
- [ ] Semua angka **sama** dengan sebelum rombak (tanpa AI, fallback lokal tetap lengkap)

## 2. Kondisi awal (angka nyata, 2026-09-25)

| Berkas | Baris | Masalah |
|---|---:|---|
| `src/screens/Payments.tsx` | 250 | 4 tab + header menjelaskan cakupan sendiri |
| `src/screens/payments/RingkasanTab.tsx` | 751 | **6 blok**: Perlu tindakan · Arus kas · Status invoice · Kesehatan penagihan · Anomali AI · Analitik |
| `src/screens/payments/TagihanTab.tsx` | 794 | 5 bucket status + 2 UI mekanisme + 2 modal bantuan |
| `src/screens/payments/RekapTab.tsx` | 253 | tabel **8 kolom** di HP |
| `src/screens/payments/PengeluaranTab.tsx` | — | tetap dipakai, jadi sub-layar |
| `src/screens/payments/FinancePipelineBoard.tsx` | — | 6 langkah lintas rute (`create-report`→`mark-paid`) |

**Sumber data yang sudah ada (jangan buat query baru sebelum memeriksa daftar ini):**

```ts
// src/db/repos/paymentRepo.ts
listPayments(month?)                       // semua tagihan
listSessionCountBillingProgress()          // paket per-pertemuan
getCashSummary(months: string[])           // { bulan, sesi, jam, pendapatan, realisasi, piutang, pengeluaran, laba }
markPaymentTransferredById(id, method?, paidAt?)
markPaymentUnpaidById(id)
updatePaymentAmountById(id, totalCost)
createSessionCountInvoice(studentId, options)
cancelSessionCountInvoice(paymentId)
syncReportPayment(studentId, month)
getPaymentByReport(reportId)
```

**Tipe yang dipakai apa adanya** (`src/db/types.ts`):

```ts
export type PaymentStatus = "UNPAID" | "PAID";                    // baris 27
export type PaymentSource = "auto" | "manual";                    // baris 28
export type BillingPolicy = "monthly" | "session_count" | "manual"; // baris 30

export interface Payment {                                        // baris 372
  id: string; studentId: string; month: string; totalCost: number;
  status: PaymentStatus; source?: PaymentSource;
  dueAt?: string; paidAt?: string; method?: string;
  reportId?: string; periodStart?: string; periodEnd?: string; createdAt?: string;
}

export interface SessionCountBillingProgress {                    // paymentRepo.ts:272
  studentId: string; studentName: string;
  targetCount: number; unbilledCount: number; readyBatchCount: number;
  nextBatchSessions: Session[]; nextBatchTotal: number; nextBatchHours: number;
  pendingBillingPolicy?: "monthly" | "manual";
}
```

## 3. Urutan langkah

### Langkah 1 — Tipe `BarisTagihan` + pembangun murni (tanpa UI)

**Tujuan:** ada satu model untuk lima mekanisme tagih, tanpa menyentuh IndexedDB.

**Berkas baru:** `src/lib/financeRows.ts`

**Kontrak (salin apa adanya — tipe ini jadi bahasa bersama seluruh tugas):**

```ts
import type { Payment, SessionCountBillingProgress, Student } from "../db/types";

/** Asal-usul baris — inilah yang menyatukan 5 mekanisme tagih. */
export type BarisTagihanAsal =
  | "laporan"      // MonthlyReport final siap ditagih  → mekanisme "laporan perkembangan"/bulanan
  | "paket"        // SessionCountBillingProgress       → mekanisme "per pertemuan"
  | "terbit"       // Payment sudah terbit & belum lunas
  | "manual";      // Payment yang dibuat tutor sendiri

/** Keadaan baris, dari sudut pandang tutor (bukan status DB mentah). */
export type BarisTagihanKeadaan =
  | "siap-ditagih"   // belum ada invoice, boleh diterbitkan sekarang
  | "terkirim"       // invoice terbit, belum jatuh tempo
  | "lewat"          // invoice terbit, sudah lewat dueAt
  | "lunas";

export interface BarisTagihan {
  /** Kunci unik untuk React; stabil antar render. */
  key: string;
  studentId: string;
  studentName: string;
  amount: number;                 // rupiah — DIHITUNG ATURAN, bukan AI
  asal: BarisTagihanAsal;
  keadaan: BarisTagihanKeadaan;
  /** Label manusia untuk mekanisme, mis. "Laporan Agt 2026" / "Paket 8 / 12 · siklus 10 Okt". */
  mode: string;
  /** Rentang yang dicakup, mis. "1–31 Agu 2026". */
  cakupan: string;
  /** Umur tagihan dalam hari. Negatif = belum jatuh tempo. undefined = belum diterbitkan. */
  umurHari?: number;
  dueAt?: string;
  /** Sumber yang bisa diklik: id Payment / MonthlyReport / murid. */
  refs: { paymentId?: string; reportId?: string; sessionIds?: string[] };
  /** Aksi yang tersedia untuk baris ini — dipakai UI langsung, tanpa logika di komponen. */
  aksi: Array<"terbitkan" | "kirim-wa" | "tandai-lunas" | "ubah-jumlah" | "batalkan" | "rincian">;
}

/** Susun seluruh baris tagihan dari data yang sudah dimuat layar. */
export function buildTagihanRows(input: {
  payments: readonly Payment[];
  students: readonly Student[];
  /** Hasil `listAllReports()` — laporan final yang belum punya Payment. */
  reports: readonly {
    id: string; studentId: string; month: string; totalCost: number;
    status?: "draft" | "confirmed";
    billingMode?: "monthly" | "session_count" | "manual";
    periodStart?: string; periodEnd?: string;
  }[];
  /** Hasil `listSessionCountBillingProgress()`. */
  packages: readonly SessionCountBillingProgress[];
}): BarisTagihan[];

/** Urutkan: paling mendesak dulu. Aturan tetap, bukan selera AI. */
export function sortTagihanRows(rows: readonly BarisTagihan[]): BarisTagihan[];
```

**Aturan urutan (tulis sebagai fungsi, jangan inline di komponen):**

1. `keadaan === "lewat"` menurun berdasarkan `umurHari`
2. `keadaan === "siap-ditagih"`
3. `keadaan === "terkirim"` menaik berdasarkan `dueAt`
4. `keadaan === "lunas"` — selalu di bawah, dan **dipotong** dari daftar utama (lihat Langkah 6)

**Selesai bila:** fungsi murni, **tanpa impor Dexie**, dan menghitung ulang jumlah yang sama dengan
`RingkasanTab` sekarang untuk data yang sama.

**Verifikasi:** perintah standar §0 + `npm test -- financeRows`.

---

### Langkah 2 — Tes pembangun (bukti angka tidak berubah)

**Tujuan:** membuktikan `buildTagihanRows` menghasilkan **angka & cakupan yang identik** dengan
perilaku `Payments.tsx` + `TagihanTab` sekarang.

**Berkas baru:** `src/__tests__/financeRows.test.ts`

**Tes wajib (minimal):**

| # | Kasus | Harapan |
|---|---|---|
| T1 | Laporan `confirmed`, `totalCost > 0`, `billingMode !== "session_count"`, belum ada Payment | 1 baris, `asal: "laporan"`, `keadaan: "siap-ditagih"` |
| T2 | Laporan `draft` | **tidak** muncul sebagai siap-ditagih |
| T3 | Laporan yang sudah punya Payment (`reportId` cocok) | **tidak** dobel baris |
| T4 | Payment `UNPAID` dengan `dueAt` 42 hari lalu | `keadaan: "lewat"`, `umurHari ≈ 42` |
| T5 | Payment `UNPAID` dengan `dueAt` 3 hari lagi | `keadaan: "terkirim"`, `umurHari` negatif |
| T6 | Payment `PAID` | `keadaan: "lunas"` |
| T7 | `SessionCountBillingProgress` dengan `readyBatchCount > 0` | 1 baris `asal: "paket"`, `mode` memuat "Paket" + targetCount |
| T8 | Murid tidak aktif | **tetap** muncul (nama historis harus bertahan — perilaku `Payments.tsx:53-55`) |
| T9 | `sortTagihanRows` | urutan persis sesuai aturan §3 Langkah 1 |

**Jangkar perilaku lama:** `Payments.tsx:85-92` (`invoiceReportIds`, `readyReportInvoiceCount`,
`tagihanBadge`) — tes T1–T3 harus mereproduksi hitungan itu.

**Selesai bila:** 9 tes lulus; **tidak ada** perubahan pada berkas tes lama.

**Verifikasi:** perintah standar §0 + `npm test -- financeRows`.

---

### Langkah 3 — Ringkasan keuangan lokal (fallback tanpa AI)

**Tujuan:** layar tetap lengkap tanpa AI. Inilah yang membuat tombol biaya jadi **opsional**, bukan penghalang.

**Berkas baru:** `src/lib/financeOverview.ts`

**Kontrak:**

```ts
export interface FinanceOverview {
  month: string;                      // "2026-09"
  masuk: number;                       // uang benar-benar masuk (basis kas, paidAt)
  keluar: number;                      // pengeluaran bulan itu
  sisa: number;                        // masuk - keluar
  potensi: number;                     // pendapatan diakui (akrual)
  piutang: number;                     // tagihan belum lunas
  piutangLewat60: number;              // piutang > 60 hari
  jumlahBelumDitagih: number;          // count baris siap-ditagih
  laporanBelumDibagikan: number;       // sudah final, pdfGeneratedAt kosong
  /** Kalimat siap-tampil dari ATURAN — bukan AI. AI hanya boleh memoles. */
  ringkasLokal: string;
  /** Hal-hal yang layak diperhatikan; dipakai blok "diperhatikan" & jadi bahan prompt AI. */
  sorotan: Array<{ kode: string; teks: string; jumlah?: number }>;
}

export function buildFinanceOverview(input: {
  month: string;
  rows: readonly import("./financeRows").BarisTagihan[];
  cash: readonly {
    month: string; sesi: number; jam: number;
    pendapatan: number; realisasi: number; piutang: number;
    pengeluaran: number; laba: number;
  }[];                                  // hasil getCashSummary()
  reports: readonly { id: string; studentId: string; status?: string; pdfGeneratedAt?: string }[];
}): FinanceOverview;
```

**Aturan:**

1. `sisa = masuk - keluar` (basis kas). `potensi` dan `laba` tetap tersedia agar tidak kehilangan kemampuan lama.
2. `ringkasLokal` disusun **tanpa AI**, contoh bentuknya:
   *"Rp 7,2 jt masuk bulan ini. 2 tagihan Rp 1,4 jt lewat 40 hari. Pengeluaran Rp 1,1 jt."*
3. `sorotan` minimal mencakup: piutang lewat 60 hari, tagihan siap ditagih, laporan final belum dibagikan,
   pengeluaran naik >30% dari rata-rata 3 bulan. **Rumusnya eksplisit, bukan tersembunyi.**
4. **Jangan** memakai AI di berkas ini. Berkas ini harus jalan offline dan tanpa API key.

**Selesai bila:** ada tes yang memverifikasi `sisa`, `piutangLewat60`, dan bahwa `sorotan` muncul
untuk keempat kondisi di atas.

**Verifikasi:** perintah standar §0 + `npm test -- financeOverview`.

---

### Langkah 4 — Layar Uang: 1 layar, 3 blok

**Tujuan:** 4 tab hilang, diganti satu layar dengan susunan tetap.

**Berkas:** `src/screens/Payments.tsx` (rombak), **berkas baru** `src/screens/uang/` untuk blok-bloknya.

**Susunan tetap (dari mockup, jangan improvisasi):**

```
Blok 1  ✦ RINGKASAN AI        — tombol biaya "Jalankan · ~Rp60"; tanpa AI → pakai ringkasLokal
Blok 2  PERLU DITAGIH         — maks 3 `BarisTagihan` teratas + 1 baris ringkas sisanya
Blok 3  BULAN INI             — 3 angka (Masuk · Keluar · Sisa) + 3 baris ▸
        ▸ Rincian tagihan · ▸ Pengeluaran · ▸ Rekap tahunan
```

**Aturan:**

1. **Maks 3 baris** di blok 2. Sisanya direngkas jadi satu baris: `N tagihan lain · Rp x,x jt ▸`.
2. Setiap baris menampilkan aksi dari `baris.aksi` — **jangan** menulis logika aksi di komponen.
3. `Rekap tahunan` dan `Pengeluaran` pindah ke sub-layar (Pola C, `TASK-03` §4). `PengeluaranTab.tsx`
   **dipakai ulang apa adanya**, jangan ditulis ulang.
4. Status DB mentah **tidak boleh** tampil; terjemahkan ke bahasa manusia (`keadaan` → label).
5. Semua nominal dibungkus `MaskedMoney` (hasil `TASK-08`).
6. **Papan pipeline hidup di dalam blok 2** ("Perlu ditagih") — lihat Langkah 6. **Jangan** menambah blok
   ke-4, dan **jangan** memindahkan papan ke layar lain. *(Amandemen 2026-10-01, Q3.)*

**Selesai bila:** layar Uang memuat tepat 3 blok + 3 baris `▸`; tidak ada tabel >4 kolom; 3 baris
teratas untuk data contoh sama dengan yang ditampilkan `TagihanTab` sekarang.

**Verifikasi:** perintah standar §0 + bandingkan angka blok 2 & 3 dengan `RingkasanTab` versi lama.

---

### Langkah 5 — `RekapTab` 8 kolom → 3 kolom

**Tujuan:** rekap tahunan terbaca di HP.

**Berkas:** `src/screens/payments/RekapTab.tsx`

**Aturan:**

1. Tampilan utama: **3 kolom** — `Bulan` · `Sisa kas` · `Piutang` (dari `MonthCashSummary`).
2. Tombol `Lihat lengkap ▸` membuka tabel penuh (8 kolom) dalam tampilan yang bisa digeser ke samping.
3. Ekspor CSV **tetap ada** dan **tidak berubah** — kemampuan lama tidak boleh hilang.
4. Baris "Total" tetap di bawah tabel utama.

**Selesai bila:** tidak ada tabel 8 kolom yang tampil langsung di HP; CSV menghasilkan berkas
**byte-identik** dengan sebelumnya untuk data yang sama.

**Verifikasi:** perintah standar §0 + `npm test -- csv` (tes CSV lama harus tetap lulus).

---

### Langkah 6 — Redesign `FinancePipelineBoard` (bukan dibubarkan)

> **Amandemen 2026-10-01 (Q3).** Keputusan pemilik: papan **dipertahankan** dan di-redesign.
> Langkah ini sebelumnya berbunyi *"Bubarkan"*; DoD & perintah verifikasinya **diganti**.
> Papan tetap hidup **di dalam blok 2 "Perlu ditagih"** (tidak menambah blok ke-4).

**Tujuan:** memakai kekuatan papan (melihat "langkah berikutnya per murid" sekaligus) tanpa
kerumitan konsep yang tidak cocok dengan pekerjaan satu tutor.

**Berkas:** `src/screens/payments/FinancePipelineBoard.tsx` (di-redesign) + `RingkasanTab.tsx` (tempat render).

**Yang dilakukan (tap-driven — TIDAK ada pustaka DnD baru, `ATURAN-AI` §2.2):**

1. **Bentuk board+list:** rail kartu `snap-x snap-mandatory` (kartu `w-[78%]`) + daftar baris di bawahnya
   untuk tahap yang sedang difokuskan. Ruang efektif 412px ≈ 382px → **jangan** 5 kolom sejajar.
2. **Kartu hidup:** status, nominal (dibungkus `MaskedMoney`), umur piutang (derive `invoiceAgeDays`/
   `ageBucket` dari `lib/finance.ts`), dan **satu aksi `nextAction`** + menu `⋯` berisi aksi lain.
3. **Mode ringkas:** tombol yang meringkas papan jadi 3 baris prioritas (dipakai saat tidak sedang menagih).
4. **Filter cerdas:** chip tahap (pola `TagihanTab.tsx:270`) + tombol "Tampilkan yang perlu tindakan".
5. **Warna konsisten:** pakai token hasil Langkah 1–3 (TASK-04), bukan kelas warna langsung.
6. **Aksesibilitas:** perbaiki tooltip/ukuran teks grafik bila grafik dipakai di kartu
   (`docs/06-AUDIT-UIUX-2026-10-01.md` K-09) — tooltip harus bisa difokus keyboard.

**Pemetaan kemampuan lama → tempat baru (jangan kehilangan satu pun):**

| Langkah pipeline sekarang | Menjadi |
|---|---|
| `create-report` — "Buat laporan" | aksi `rincian` → tautan ke laporan murid |
| `confirm-report` — "Periksa & finalkan laporan" | aksi `terbitkan` di baris `asal: "laporan"` |
| `create-invoice` — "Terbitkan invoice" | aksi `terbitkan` |
| `send-wa` — "Kirim pengingat WA" | aksi `kirim-wa` |
| `mark-paid` — "Tandai lunas" | aksi `tandai-lunas` |
| `share-report` — "Bagikan laporan" | aksi `rincian` → laporan |

**Selesai bila:** papan tetap ada **dan tetap diimpor**; keempat aturan Langkah 4 tetap dipatuhi
(1 layar, 3 blok tetap); keenam kemampuan di atas tercapai (buktikan dengan daftar centang di §9).

**Verifikasi:** perintah standar §0 + `(Get-ChildItem -Recurse src -Include *.tsx -File | Select-String -Pattern "FinancePipelineBoard").Count`
→ **harus TIDAK kosong** (kebalikan dari perintah lama).

---

### Langkah 7 — Navigasi: 5 pintu + FAB → 3 pintu + 1 aksi di nav

**Tujuan:** memenuhi kontrak `K1.1` dan menghapus FAB yang menutupi konten.

**Berkas:** `src/components/BottomNav.tsx`, `src/App.tsx` (rute), `src/screens/home/Home.tsx`

**Yang dilakukan:**

1. `NAV_ITEMS` (jangkar: `BottomNav.tsx:11`) → **3 pintu**: `Hari Ini` (`/`), `Murid` (`/students`),
   `Uang` (`/payments` atau rute baru `/uang`).
2. **Satu aksi di dalam nav**: tombol `+ Catat sesi` yang lebarnya melebar. Label & tujuannya
   **kontekstual** (mis. `Tutup bulan September` saat akhir bulan) — kontrak `K1.3`.
3. **Hapus FAB mengambang** dan `fab-label` dari Home. Alasan tertulis: menutupi konten pada layar padat
   (bukti: mockup Home frame ②).
4. Rute `/capture` dan `/report` **tetap ada** (deep link & E2E memakainya) walau tidak lagi jadi pintu nav.
   Tambahkan **redirect** dari rute lama bila nama berubah, supaya bookmark tidak mati.
5. **Perbarui selector E2E** di `e2e/` yang menyebut label nav lama. Lakukan di langkah yang sama,
   jangan tunda.

**Selesai bila:** nav memuat tepat 3 `NavLink` + 1 tombol aksi; tidak ada elemen `fixed` yang menutupi
konten (periksa di 390px pada Home, Uang, Murid); `npm run e2e` lulus.

**Verifikasi:** perintah standar §0 + `npm run e2e`.

---

### Langkah 8 — Tombol biaya AI di Ringkasan Uang (integrasi `TASK-07`)

**Tujuan:** AI masuk ke keuangan dengan gerbang biaya, tanpa menggantikan aturan.

**Prasyarat:** [`TASK-07`](TASK-07-kontrak-ai-berbiaya.md) selesai (satu jalur `useAiAction`).

**Berkas:** blok 1 layar Uang + `src/lib/aiClient.ts` (fungsi `generateFinancialInsights` yang sudah ada)

**Aturan:**

1. Tombol berbunyi `Jalankan · ~Rp60`; memakai estimasi `estimateFinancialInsightsCost()` yang **sudah ada**
   (`aiClient.ts:576`) — jangan buat estimator baru.
2. **Yang dikirim:** hanya angka + kode sorotan dari `FinanceOverview` (`sorotan[].teks`, agregat).
   **Tidak** nama murid, **tidak** catatan bebas. Cantumkan ini di modal sebagai chip daftar data.
3. Bila AI gagal / kuota habis / belum ada API key → tampilkan `ringkasLokal` dan **jangan** tampilkan galat
   yang menakutkan; cukup satu baris tenang: *"Ringkasan lokal dipakai — AI tidak dijalankan."*
4. Hasil AI **wajib** divalidasi seperti pola `src/lib/aiValidation.ts` yang sudah ada.

**Selesai bila:** menekan tombol membuka modal biaya lebih dulu; membatalkan modal **tidak** memanggil API;
tanpa API key layar tetap berisi `ringkasLokal`.

**Verifikasi:** perintah standar §0 + uji dengan API key dikosongkan dan dengan modal dibatalkan.

## 4. Pola umum

- **Pola uang tertutup:** semua nominal lewat `MaskedMoney` (`TASK-08`). Tidak ada `formatRupiah` di layar.
- **Pola baris:** satu baris = satu keputusan; aksi di dalam baris.
- **Pola label mekanisme:** `mode` + `cakupan` sebagai teks kecil di bawah nama murid. Inilah pengganti
  5 UI mekanisme tagih — **jangan** membuat cabang UI per mekanisme.
- **Pola fallback:** setiap blok AI punya padanan lokal. Kalau tidak punya, blok itu belum boleh ditambah AI.

## 5. Jebakan yang sudah pernah terjadi

| Jebakan | Gejala | Cara menghindar |
|---|---|---|
| Menambah query baru padahal repo sudah punya | data dobel, angka beda antar blok | Periksa daftar §2 sebelum menulis query |
| Laporan final dihitung dobel | "siap ditagih" muncul padahal invoice sudah ada | Saring dengan `invoiceReportIds` seperti `Payments.tsx:85` |
| Murid nonaktif hilang dari tagihan | nama historis jadi "—" | Muat `listStudents()` **tanpa** filter aktif (perilaku `Payments.tsx:53-55`) |
| `useLiveQuery` dihapus bersama tab lama | layar kosong / data tidak segar | Pindahkan query ke blok baru, jangan hapus |
| CSV berubah tanpa sengaja | tutor kehilangan format laporan lamanya | Jalankan tes `csv` setelah Langkah 5 |
| AI jadi satu-satunya sumber angka | angka tidak bisa dipertanggungjawabkan ke orang tua | Angka **selalu** dari `financeRows`/`financeOverview` |
| Mengubah label nav tanpa memperbarui E2E | `npm run e2e` patah di banyak tes | Perbarui selector pada langkah yang sama |

## 6. Kalau macet

| Gejala | Sebab | Tindakan |
|---|---|---|
| Jumlah "siap ditagih" beda dengan versi lama | aturan T1–T3 belum persis | Bandingkan dengan `Payments.tsx:85-92`, perbaiki tesnya dulu |
| Baris paket muncul ganda | Payment paket juga terhitung sebagai `terbit` | Satu baris per `studentId` + siklus; gabungkan di `buildTagihanRows` |
| `umurHari` negatif padahal lewat | zona waktu (WIB vs UTC) | Pakai `todayWIB()` dari `src/lib/format.ts`, bukan `new Date()` |
| E2E gagal setelah nav dirombak | label/urutan berubah | Perbarui selector; jangan mengembalikan 5 tab |
| Layar Uang kosong saat PIN belum dibuat | `needsSetup` tidak ditangani | Tampilkan ajakan buat PIN seperti `Payments.tsx:107-121` |

> Jangan menutupi macet dengan menambah tab lagi. Kalau sebuah isi tidak muat di 3 blok,
> tempatnya di sub-layar `▸` — bukan tab baru.

## 7. Larangan konkret

| ❌ JANGAN sentuh | Alasan |
|---|---|
| `src/lib/finance.ts`, `financePipeline.ts` (rumus) | mengubahnya mengubah angka yang sudah benar |
| `src/db/repos/paymentRepo.ts` (logika) | tugas ini pemakai, bukan pengubah repo |
| `src/db/db.ts` (versi schema) | tidak perlu data baru |
| `src/lib/csv.ts` (format ekspor) | kemampuan lama harus identik |
| `src/lib/crypto.ts`, alur PIN di `Settings.tsx` | di luar lingkup (ada di `TASK-08`) |
| `CaptureSession.tsx`, `MonthlyReport.tsx` (logika) | tugas lain; risiko tabrakan besar |

## 8. Catatan penyimpangan

| Tanggal | Langkah | Yang terjadi | Keputusan |
|---|---|---|---|
| | | | |

## 9. Progres

- [ ] **L1 — `financeRows.ts`.** Fungsi + tipe ada, tanpa Dexie
- [ ] **L2 — 9 tes pembangun.** `npm test -- financeRows`: ___
- [ ] **L3 — `financeOverview.ts`.** `npm test -- financeOverview`: ___
- [ ] **L4 — Layar Uang (3 blok).** Angka blok 2 & 3 sama dengan versi lama: ya/tidak
- [ ] **L5 — Rekap 3 kolom.** CSV identik: ya/tidak
- [ ] **L6 — Pipeline di-redesign.** Papan tetap ada & tetap diimpor: ya/tidak · berada di dalam blok "Perlu ditagih": ya/tidak · keenam kemampuan tercapai: ___ dari 6
- [ ] **L7 — Nav 3 pintu + aksi.** E2E lulus: ya/tidak
- [ ] **L8 — Tombol biaya AI.** Batal = tidak memanggil API: ya/tidak

**Progres G3-02 (sejak 2026-10-05; ini bukan langkah L1–L8 di atas).** `TagihanTab.tsx`: 1036 → **845** (bagian 0) → **915** (fitur).

- [x] **Bagian 0 — refactor terbatas.** 1036 → 845; target **≤800 belum** tercapai. Tiga ekstraksi: `RecoveryPointPickerModal` · `BillingHelpModal` · `CancelledInvoicesSection`. Gate: `tsc` ✓ · `eslint` ✓ · suite ✓ · `build` ✓
- [x] **K-05 — pencarian murid.** Kotak `Cari murid` selalu tampil; menyaring daftar tagihan + antrean "Laporan final siap ditagih" + antrean "Tagihan per Pertemuan" + tile "01 · Siap ditagih"; ekspor CSV/PDF ikut tersaring. Bukti: `invoiceListFilters.test.ts` (21 tes) · suite 803/66. ⏳ **belum** diuji klik di perangkat
- [x] **K-03 — badge "Terlambat N hari" + jatuh tempo `dayLabel`.** Bukti: `invoiceDueLabel.test.ts` (11 tes). ⏳ **belum** dilihat mata di perangkat
- [x] **K-07 — daftar selalu dirender + pesan kosong per keadaan.** `showIssuedList` dihapus sebagai pengontrol tampil. Bukti: 6 tes `emptyIssuedMessage`. ⚠️ `showIssuedList` kini **kode mati** di `useInvoiceFilters.ts:148,209` — belum dihapus
- [ ] **#6 K-06 — filter lanjutan** (melipat umur piutang/asal/ekspor; chip "N filter aktif · Hapus"; maks 3 kontrol tampil di depan)
- [ ] **#8 K-01 — peringatan saat mengubah nominal tagihan** (asal tagihan + konsekuensi + tombol eksplisit "Ya, ubah asal tagihan"); UI saja, `paymentRepo.ts` tidak diubah; butuh tes baru (`paymentRepo` belum punya berkas tes)
- [ ] **#9 K-12 — input nominal:** pemisah ribuan saat mengetik + centang "Tersimpan ✓" + pesan inline saat tidak valid
- [ ] **#10 K-13 — gerbang PIN jadi `<form>`** (Enter mengirim) + hitung mundur lockout "Coba lagi dalam N detik"
- [ ] **#11 — nav 5 → 3 pintu + 1 aksi.** **Paling akhir**, sekali saja (selector E2E patah di situ)
- [ ] **`npm run e2e` + `e2e:uiux` sesudah K-06** (perjanjian f1) — pada putaran K-05/K-03/K-07 **belum** dijalankan

## 10. Riwayat tugas

| Tanggal | Perubahan | Versi | Hasil |
|---|---|---|---|
| 2026-09-25 | Dibuat dari keputusan pemilik: keuangan prioritas rombak | v1.75.1 | `todo` |
| 2026-10-01 | Amandemen **Q3**: Langkah 6 berubah dari *Bubarkan `FinancePipelineBoard`* → **Redesign** (board+list tap-driven, hidup di dalam blok "Perlu ditagih"); DoD & perintah verifikasi diganti (impor harus **tetap ada**) | v1.79.3 | `todo` |
| 2026-10-05 | **G3-02 bagian 0 (refactor terbatas, Q9/A13) — langkah 1.** Berkas baru: `src/screens/payments/RecoveryPointPickerModal.tsx` (ekstraksi panel "pemilih titik pemulihan" R1 dari `TagihanTab.tsx`). `TagihanTab.tsx` **1036 → 948 baris**. Murni pemindahan: prop 1:1 (`points` · `busyKeys` · `studentName` · `onClose` · `onPick`), teks dan kelas identik; import `snapshotMomentLabel` yang menjadi mati dibersihkan. **Catatan angka:** §2 baris `TagihanTab.tsx` menulis **794** (potret 2026-09-25); terukur 2026-10-05 = **1036** sebelum refactor — ukur sendiri dengan `npm run measure loc`, jangan percaya angka dokumen. Gate: `tsc -b` ✓ · `eslint src --max-warnings 0` ✓ · suite penuh **771 lulus / 64 berkas** ✓ · `build` ✓ · `e2e` `finance.spec.ts` + `billing-session-count.runtime.spec.ts` **4 lulus / 0 gagal** (chromium + mobile) ✓ · tes area keuangan **54 lulus** ✓ | — | `belum` |
| 2026-10-05 | **G3-02 bagian 0 — langkah 2: panel bantuan tagihan diekstrak.** Berkas baru: `src/screens/payments/BillingHelpModal.tsx` (panel "Cara Kerja Tagihan" — **seluruhnya statis**, satu-satunya prop `onClose`). `TagihanTab.tsx` **948 → 895 baris** (sisa **95** dari target ≤800). Import `Modal` di `TagihanTab` menjadi mati dan dibersihkan. Cara potong: skrip `.design-audit/cut-jsx-block.mjs` (memverifikasi penanda + penutup + baris sesudahnya sebelum memotong; berhenti tanpa menulis bila bentuknya tidak cocok) — bukan anchor `edit` 55 baris. **Jebakan yang muncul dua kali:** blok JSX kondisional ditutup `)}` pada baris **terpisah**, sehingga pengganti yang juga berakhir `)}` menghasilkan `)}` ganda; `tsc` menangkapnya segera dan skripnya kini memotong **termasuk** baris lanjutan itu. Gate: `tsc -b` ✓ · `eslint src --max-warnings 0` ✓ · suite penuh **771 lulus / 64 berkas** ✓ · `build` ✓ · `e2e` `finance.spec.ts` + `billing-session-count.runtime.spec.ts` **4 lulus / 0 gagal** ✓ | — | `belum` |
| 2026-10-05 | **G3-02 bagian 0 — langkah 3: blok "Tagihan dibatalkan" diekstrak.** Berkas baru: `src/screens/payments/CancelledInvoicesSection.tsx` (tampilan + tiga callback; seluruh keadaan tetap di `TagihanTab`, logika tetap di `useInvoiceRecovery`). `TagihanTab.tsx` **895 → 845 baris**. Dua import menjadi mati dan dibersihkan (`invoiceKindLabel`, `RECOVERY_LIMITS_HINT`) plus `monthLabel` dari `lib/format`. **Koreksi tipe yang saya temukan:** prop `studentMap` semula saya tulis `StudentMap` (peta berwarna dari `lib/studentColor`), padahal `TagihanTab` meneruskan `Map<string, Student>` dari `useInvoiceFilters`; karena blok ini hanya membaca `.name`, propnya dilonggarkan menjadi `ReadonlyMap<string, { name: string }>` — tipe yang lebih sempit menuntut medan yang tidak pernah dibaca di sini. Gate: `tsc -b` ✓ · `eslint src --max-warnings 0` ✓ · suite penuh **771 lulus / 64 berkas** ✓ · `build` ✓ · `e2e` `finance.spec.ts` + `billing-session-count.runtime.spec.ts` **4 lulus / 0 gagal** ✓ | — | `belum` |
| 2026-10-05 | **G3-02 kluster daftar tagihan — fitur #4 K-05 (sisa, keputusan pemilik e2), #5 K-03 (opsi b1), #7 K-07.** Dua berkas baru **atas izin pemilik (opsi c2)**: `src/lib/invoiceDueLabel.ts` (fungsi murni label jatuh tempo; memakai ulang `dayLabel()` dari `lib/format.ts` — **tidak** menyentuh `lib/finance.ts` yang terlarang) + `src/screens/payments/invoiceListFilters.ts` (pencocokan nama & pesan kosong per keadaan filter), masing-masing dengan tes (11 + 21 tes). `TagihanTab.tsx` **845 → 915**: kotak `Cari murid` kini **selalu tampil** (🔍 + tombol `Hapus pencarian`, pola `Students.tsx`, ≥36 px) dan menyaring **seluruh** daftar di layar itu — daftar tagihan, antrean "Laporan final siap ditagih", dan antrean "Tagihan per Pertemuan" — plus tile "01 · Siap ditagih" ikut tersaring; chip umur piutang dilepas saat kata kunci berubah (kalau tidak, "cari Budi" di bucket 31–60 hari tampak seperti Budi tidak ada). `InvoiceRow.tsx` **+25**: badge **"Terlambat N hari"** hanya untuk yang sudah lewat (yang belum lewat tetap memakai bucket umur piutang — penanda umur ≠ penanda keterlambatan), tepat hari-H tidak menampilkan umur, dan "Jatuh tempo" memakai `dayLabel` (bukan ISO) di ringkasan **dan** rincian. **Dua perubahan perilaku yang disetujui sadar:** (a) daftar tagihan memakai `visibleBillRows` sehingga chip umur piutang akhirnya juga berlaku pada rekap PDF (sebelumnya hanya CSV yang menyaring) — CSV sendiri tidak disentuh (`csv.ts` terlarang); (b) pindah ke tahap "Siap ditagih" **tidak lagi menyembunyikan** kartu daftar (`showIssuedList` dihapus sebagai pengontrol tampil) — yang berubah hanya isinya menjadi pesan kosong per keadaan. **Temuan:** `showIssuedList` kini **kode mati** di `useInvoiceFilters.ts:148,209` — belum dihapus (satu langkah = satu perubahan). Gate: `tsc -b` ✓ · `eslint src --max-warnings 0` ✓ · suite penuh **803 lulus / 66 berkas** ✓ · smoke **183** ✓ · area keuangan **54** ✓ · `csv` **4** ✓ · `build` ✓ · `check:docs` ✓ · LF 6/6 berkas ✓ · `e2e`/`e2e:uiux` **⏸ belum** (perjanjian f1: dijalankan sekali setelah K-06) | — | `belum` |
