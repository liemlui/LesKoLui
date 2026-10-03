# TASK-09 — Jadwal Hari: zoom + mode tangkapan layar

> **STATUS:** `todo`
> **PEMILIK:** agen AI
> **DIBUAT:** 2026-09-25 · **BASELINE:** v1.75.1 (561 tes / 50 berkas)
> **PERKIRAAN:** 5 langkah × 25–40 menit
> **INDUK:** [`TASK-03-blueprint-uiux.md`](TASK-03-blueprint-uiux.md)
> **LAMPIRAN VISUAL:** [`docs/mockups/hari-2026-09-24.html`](../mockups/hari-2026-09-24.html) (5 layar)
> **BACA DULU:** [`ATURAN-AI.md`](ATURAN-AI.md) — kontrak kerja, keputusan terkunci, daftar larangan

## 0. Cara pakai berkas ini

- **Satu langkah per putaran.** Tugas ini **terisolasi**: seluruh perubahan ada di `src/screens/home/DayView.tsx`
  dan berkas baru di sekitarnya. Kalau sebuah langkah menyentuh layar lain, langkah itu salah.
- Permintaan pemilik (2026-09-25, apa adanya): *"yang hari mungkin bisa di zoom in zoom out,
  jika saya mau ss jadwal selama pagi sampai malam, biar terlihat semua."*

**Perintah verifikasi standar (dari `les-ko-lui/`):**

```powershell
npx tsc -b        # harapan: tanpa keluaran
npx eslint src    # harapan: tanpa keluaran
npm test          # harapan: 561+ lulus, 0 gagal
npm run build     # harapan: built + dist/sw.js
npm run e2e       # harapan: alur kalender lulus (Vite dev, SW mati)
```

> **Kegagalan yang bukan regresi:** `npm run e2e` lebih lambat pada putaran pertama (Playwright
> menyiapkan browser). Selama hasil akhirnya lulus, lanjutkan.

## 1. Tujuan & definisi selesai

`DayView` sekarang memakai **satu** kerapatan tetap: `PX_PER_HR = 64` (`DayView.tsx:18`), dengan rentang
dinamis 07:00–22:00 (`DayView.tsx:27-38`). Untuk 15 jam itu berarti **960 px** — tidak muat di layar HP
(±700 px), sehingga jadwal pagi-sampai-malam **tidak bisa** dilihat atau ditangkap dalam satu gambar.

**Selesai berarti:**

- [ ] Ada **3 tingkat zoom** (rapat / normal / lega) yang bisa dipilih dan diingat selama sesi
- [ ] Ada tombol **"Muat sehari penuh"** (⇱) yang mengatur rentang + zoom agar seluruh hari muat sekali layar
- [ ] Ada **mode tangkapan layar**: tombol editor disembunyikan, ada kepala & kaki, hasil bisa
      disalin/disimpan sebagai gambar
- [ ] Bisa **menangkap satu hari** dan **menangkap seminggu** sekaligus
- [ ] Hari dengan jadwal jam 05:00 atau 23:30 tetap tampil utuh (rentang tidak memotong)
- [ ] E2E kalender tetap lulus

## 2. Kondisi awal (angka nyata)

| Ukuran | Sekarang | Target | Cara mengukur |
|---|---|---|---|
| Kerapatan | `PX_PER_HR = 64` (tetap) | 3 pilihan: 27 / 54 / 97 | baca `DayView.tsx` |
| Rentang | 07:00–22:00, melebar otomatis | sama, + opsi 06:00–24:00 | `DayView.tsx:27-38` |
| Tinggi total (15 jam) | **960 px** | muat di ±700 px saat ⇱ | hitung sendiri |
| Tombol editor saat tangkap | tetap tampil | tersembunyi | mockup frame ④ |
| Ekspor gambar hari | ❌ tidak ada | ✅ ada | — |

**Jangkar utama:** cari baris `const PX_PER_HR = 64;` dan `const LABEL_W   = 44;` di
`src/screens/home/DayView.tsx` (sekarang baris 18–19).

**Cara mengukur ulang:** buka layar Hari di dev, pilih ⇱, ukur tinggi area timeline via devtools.

## 3. Urutan langkah

### Langkah 1 — Kerapatan jadi parameter

**Tujuan:** `PX_PER_HR` berubah dari konstanta menjadi pilihan, tanpa mengubah tampilan default.

**Berkas:** `src/screens/home/DayView.tsx` (jangkar: `const PX_PER_HR = 64;`)

**Kontrak:**

```ts
/** Tiga tingkat kerapatan timeline (mockup: rapat / normal / lega). */
export const DAY_DENSITY = {
  rapat:  27,   // 18 jam ≈ 486 px — sehari penuh muat
  normal: 54,   // kerapatan membaca detail jam
  lega:   97,   // satu blok besar, untuk melihat isi
} as const;
export type DayDensityKey = keyof typeof DAY_DENSITY;   // "rapat" | "normal" | "lega"

/** Hook kecil; nilai default "normal". Disimpan di memori sesi (bukan localStorage). */
export function useDayDensity(): {
  density: DayDensityKey;
  setDensity(k: DayDensityKey): void;
};
```

**Aturan:**

1. Ganti setiap pemakaian `PX_PER_HR` (ada di perhitungan `totalH`, `heightPx`, `topPx`, dan `nowTop`)
   menjadi nilai kerapatan aktif. **Jangan** menyisakan satu pun referensi ke konstanta lama.
2. Tinggi blok sesi: `Math.max(durasiJam * pxPerHr - 2, 22)` — batas bawah 22 px (sekarang 28 px,
   terlalu besar untuk mode rapat).
3. Default **normal**, supaya tampilan awal tidak berubah dari sekarang.

**Selesai bila:** mengubah kerapatan mengubah tinggi timeline secara proporsional; defaultnya sama
seperti perilaku sekarang; tidak ada referensi `PX_PER_HR` yang tersisa.

**Verifikasi:** perintah standar §0 + `Select-String -Path "src\screens\home\DayView.tsx" -Pattern "PX_PER_HR"`
(harus kosong).

---

### Langkah 2 — Kontrol zoom + "Muat sehari penuh"

**Tujuan:** tutor bisa memilih kerapatan dan memuat seluruh hari dalam satu layar.

**Berkas:** `src/screens/home/DayView.tsx` (bilah atas) + berkas baru untuk bilahnya bila perlu.

**Kontrak UI (dari mockup frame ①②③):**

```tsx
<div className="daybar">
  <div className="title">
    {/* mis. "Rabu, 24 Sep 2026" */}
    <span>{/* "06.00 – 24.00 · 7 sesi · 9,5 jam" */}</span>
  </div>
  {/* Kontrol zoom: tiga tombol, yang aktif disorot */}
  <div role="radiogroup" aria-label="Kerapatan jadwal">
    {/* button rapat / normal / lega */}
  </div>
  <button aria-label="Muat sehari penuh" title="Muat sehari penuh">⇱</button>
  <button aria-label="Mode tangkapan layar" title="Mode tangkapan layar">📸</button>
</div>
```

**Aturan "Muat sehari penuh" (⇱):**

1. Rentang dipaksa ke **06:00–24:00** (18 jam) — bukan 07:00–22:00.
2. Kerapatan dipilih otomatis: hitung `pxPerHr = Math.floor(tinggiTersedia / 18)` lalu **pilih
   tingkat terdekat yang tidak melebihi** dari ketiga nilai. Tujuannya: seluruh hari muat tanpa scroll.
3. Bila jadwal punya sesi di luar 06:00–24:00, rentangnya **melebar** (perilaku lama dipertahankan) —
   ⇱ tidak boleh menyembunyikan sesi.
4. Label jam dinaikkan ke **11,5–12px** (sekarang 10,5px) supaya terbaca di mode rapat.

**Selesai bila:** menekan ⇱ membuat seluruh 18 jam terlihat tanpa scroll pada lebar 390px; tidak ada
sesi yang hilang; label jam terbaca.

**Verifikasi:** perintah standar §0 + buka layar Hari di lebar 390px dan 430px.

---

### Langkah 3 — Mode tangkapan layar (satu hari)

**Tujuan:** hasil bisa dijadikan gambar bersih — inilah permintaan pemilik.

**Berkas:** `src/screens/home/DayView.tsx` + berkas baru `src/lib/captureScheduleImage.ts`

**Kontrak:**

```ts
/** Ganti antara mode normal dan mode tangkapan. */
export function useCaptureMode(): {
  capturing: boolean;
  start(): void;   // menyembunyikan tombol editor, mengunci rentang & kerapatan
  stop(): void;
};

/** Render elemen jadwal menjadi PNG. Mengembalikan Blob, bukan menyimpan sendiri. */
export async function renderScheduleImage(opts: {
  /** Node yang dibungkus kepala + timeline + kaki. */
  node: HTMLElement;
  /** Format nama berkas: "jadwal-2026-09-24.png". */
  fileName: string;
}): Promise<Blob>;
```

**Aturan:**

1. **Cara render — pilih satu dan tulis alasannya di §8.** Dua pilihan:
   (a) `<canvas>` + menggambar sendiri (paling ringan, tanpa dependensi, tetapi menyalin gaya);
   (b) memakai API bawaan browser untuk mengubah DOM menjadi gambar. Kalau (b) menuntut dependensi baru,
   **dilarang** (kontrak [`arsitektur/11`](../arsitektur/11-uiux-ai-cost-dan-privasi.md) §6: jangan menambah pustaka UI).
2. Di mode tangkapan: sembunyikan bilah zoom, tombol editor, dan navigasi; tampilkan
   **kepala** (`Jadwal — Rabu, 24 Sep 2026` + ringkasan `7 sesi · 9,5 jam · 06.00–24.00`) dan
   **kaki** (`Dibuat 24 Sep 2026, 09.41 WIB` + `Les Ko Lui`).
3. `document.fonts.ready` **wajib** ditunggu sebelum merender, kalau tidak teks bisa kosong.
4. Tombol hasil: `Salin sebagai gambar` (ke papan klip) + `Simpan PNG`. Keduanya memakai
   `src/lib/download.ts` yang sudah ada untuk menyimpan berkas — baca dulu, jangan buat jalur unduh baru.

**Selesai bila:** hasil tangkapan memuat seluruh 18 jam + semua sesi hari itu; tidak ada tombol editor
di gambar; teks di gambar tidak kosong; berfungsi di Chrome/Edge.

**Verifikasi:** perintah standar §0 + tangkap 1 hari dan periksa hasilnya secara visual.

---

### Langkah 4 — Tangkap seminggu

**Tujuan:** menangkap Senin–Minggu sekaligus (disebut di mockup frame ④).

**Berkas:** `src/lib/captureScheduleImage.ts` + tombol di mode tangkapan.

**Aturan:**

1. Susun **7 kolom hari** bersebelahan dalam satu gambar; setiap kolom memakai kerapatan **rapat**
   dan rentang **06:00–24:00** agar tinggi ketujuh kolom seragam.
2. Kepala menyebut rentang minggu: `Jadwal — 22–28 Sep 2026`; kaki sama seperti mode harian.
3. Batasi lebar gambar (mis. maksimal 1600 px logis) supaya tetap bisa dikirim lewat WhatsApp;
   kalau 7 kolom tidak muat, **perkecil kerapatan**, jangan memotong hari.

**Selesai bila:** satu gambar memuat 7 hari tanpa hari yang hilang atau terpotong.

**Verifikasi:** perintah standar §0 + tangkap satu minggu penuh dan periksa ke-7 kolomnya.

---

### Langkah 5 — Ingat pilihan + tes + E2E

**Tujuan:** pilihan tidak hilang saat berpindah layar, dan perilakunya terjaga.

**Yang dilakukan:**

1. Kerapatan & mode tangkapan disimpan di memori sesi (bukan `localStorage`) — konsisten dengan
   keputusan "berlaku selama aplikasi terbuka" di kontrak §K3.4. Artinya: kembali dari layar lain
   tidak mengembalikan ke default.
2. **Tes unit** `src/__tests__/dayDensity.test.ts`:
   - (a) `DAY_DENSITY` punya tepat 3 kunci;
   - (b) fungsi pemilih kerapatan ⇱ mengembalikan tingkat yang **tidak melebihi** tinggi tersedia;
   - (c) rentang melebar bila ada sesi jam 05:00 atau 23:30.
3. **E2E** `e2e/day-zoom.spec.ts`: buka layar Hari → tekan ⇱ → pastikan jumlah blok sesi yang
   terlihat **sama** dengan jumlah sesi hari itu (bukti tidak ada yang terpotong) → masuk mode
   tangkapan → pastikan bilah zoom **tidak** ada di DOM.

**Selesai bila:** `npm test` dan `npm run e2e` hijau; tes baru benar-benar menguji perilaku
(bukan sekadar "elemen ada").

**Verifikasi:** perintah standar §0 + `npm test -- dayDensity` + `npx playwright test e2e/day-zoom.spec.ts`.

## 4. Pola umum

- **Pola kerapatan:** satu nilai `pxPerHr` mengalir ke semua perhitungan tinggi/posisi. Tidak ada
  perhitungan yang menyalin angka 64 secara langsung.
- **Pola label jam:** `10.5px` hanya untuk mode rapat yang tidak perlu dibaca detail; mode normal & lega ≥12px.
- **Pola rentang:** `DAY_START`/`DAY_END` **selalu** melebar untuk memuat sesi di luar rentang.
  Perilaku lama ini dipertahankan di semua mode.

## 5. Jebakan yang sudah pernah terjadi

| Jebakan | Gejala | Cara menghindar |
|---|---|---|
| Satu referensi `PX_PER_HR` tertinggal | blok sesi tidak ikut mengecil, bertumpuk | Cari dengan `Select-String` sampai kosong |
| Garis "sekarang" tidak ikut skala | garis merah di posisi salah | `nowTop` harus memakai `pxPerHr` yang sama |
| Sesi luar jam terpotong saat ⇱ | sesi jam 05:00 hilang dari layar | Rentang tetap melebar; ⇱ hanya mengubah kerapatan |
| Teks kosong di gambar | font belum siap saat render | Tunggu `document.fonts.ready` |
| Baris lampau diredupkan terlalu jauh | teks tak terbaca (gagal WCAG) | Redupkan latar, **jangan** warna teks |

## 6. Kalau macet

| Gejala | Sebab | Tindakan |
|---|---|---|
| Blok sesi bertumpuk di mode rapat | tinggi minimum terlalu besar | Turunkan batas bawah ke 22 px, bukan `< durasi` |
| ⇱ masih perlu scroll | kerapatan terdekat terlalu besar | Pastikan pemilihan memakai "tidak melebihi", bukan "terdekat" |
| Gambar kosong / separuh | node yang dirender belum punya ukuran | Pastikan node terpasang di dokumen saat render |
| E2E gagal cari elemen | label tombol berubah | Perbarui selector di tugas yang sama, catat di §8 |
| Mode tangkapan tersangkut | `stop()` tidak dipanggil saat keluar layar | Panggil `stop()` pada `useEffect` cleanup |

> Jangan menutupi macet dengan menaikkan tinggi bingkai atau memaksa scroll. Kalau tidak muat,
> itu tanda kerapatan terendah masih terlalu besar.

## 7. Larangan konkret

| ❌ JANGAN sentuh | Alasan |
|---|---|
| `MonthView.tsx`, `WeekView.tsx` | pemilik minta kalender **tidak banyak berubah** |
| Menambah pustaka tangkap gambar | kontrak §6: fondasi dari token + CSS |
| `src/screens/home/Home.tsx` (struktur) | dirombak di tugas lain; risiko tabrakan |
| `src/db/**` | fitur ini tidak butuh data baru |
| Label murid di kalender bulan | dipertahankan apa adanya (`MonthView.tsx:89-93`) |

## 8. Catatan penyimpangan

| Tanggal | Langkah | Yang terjadi | Keputusan |
|---|---|---|---|
| 2026-10-03 | L1–L2 | Dikerjakan sebagai **G2-07** dan **berhenti di Langkah 2**: `DAY_DENSITY` 27/54/97, `useDayDensity()` (memori sesi), `densityForHeight()`, tombol ⇱, batas bawah blok 22 px, label jam 11,5–12 px | DoD gelombang menuntut **hanya `DayView.tsx` berubah**; Langkah 3–4 (mode tangkapan + `src/lib/captureScheduleImage.ts`) butuh berkas baru dan **belum** dikerjakan. Rentang ⇱ = 06:00–24:00 (18 jam) → 486 px pada kerapatan rapat |
| 2026-10-03 | L2 | Rentang default saat ⇱ tetap bisa **melebar** bila ada sesi di luar 06:00–24:00 | Perilaku lama dipertahankan sesuai §3 Langkah 2 aturan 3 — ⇱ tidak boleh menyembunyikan sesi |
| 2026-10-03 | L1 | Kontrak §3 Langkah 1 menulis `export const DAY_DENSITY` / `export function densityForHeight` **di `DayView.tsx`** — tetapi preset ESLint repo (`reactRefresh.configs.vite`) melarang berkas layar mengekspor selain komponen. Presedennya sudah ada di repo: `lib/moods.ts` dipisah dari `CaptureSession.tsx` dengan alasan yang sama | Helper dipindah ke **`src/lib/dayDensity.ts`** (`DAY_DENSITY`, `DENSITY_ORDER`, `densityForHeight`, `FULL_DAY_START/END`, `TIMELINE_VIEWPORT_FRACTION`, `useDayDensity`). **Menyimpang dari DoD gelombang "hanya DayView.tsx berubah"** — disengaja, karena alternatifnya menggagalkan `npm run lint` yang tidak bisa dijalankan untuk memverifikasi di putaran ini. Berkas layar kini hanya mengekspor komponen |

## 9. Progres

- [ ] **L1 — Kerapatan parameter.** Sisa `PX_PER_HR`: ___
- [ ] **L2 — Kontrol zoom + ⇱.** Muat sehari penuh di 390px: ya/tidak
- [ ] **L3 — Tangkapan 1 hari.** Cara render yang dipilih (a/b): ___ · hasil diperiksa: ___
- [ ] **L4 — Tangkapan seminggu.** Ke-7 kolom utuh: ya/tidak
- [ ] **L5 — Ingat pilihan + tes + E2E.** `npm test`: ___ · `npm run e2e`: ___

## 10. Riwayat tugas

| Tanggal | Perubahan | Versi | Hasil |
|---|---|---|---|
| 2026-09-25 | Dibuat dari permintaan pemilik (zoom + SS pagi–malam) | v1.75.1 | `todo` |
