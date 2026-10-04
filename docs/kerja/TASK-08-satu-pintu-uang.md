# TASK-08 — Satu Pintu Uang (tutup 6 kebocoran, PIN satu lapisan)

> **STATUS:** `todo`
> **PEMILIK:** agen AI
> **DIBUAT:** 2026-09-25 · **BASELINE:** v1.75.1 (561 tes / 50 berkas)
> **PERKIRAAN:** 6 langkah × 25–40 menit
> **INDUK:** [`TASK-03-blueprint-uiux.md`](TASK-03-blueprint-uiux.md) · **KONTRAK:** [`arsitektur/11`](../arsip/arsitektur/11-uiux-ai-cost-dan-privasi.md) §K3
> **PRASYARAT:** [`TASK-04`](TASK-04-fondasi-visual.md) Langkah 1–3 (token & primitif) — atau kerjakan mandiri dengan kelas warna yang ada sekarang
> **BACA DULU:** [`ATURAN-AI.md`](ATURAN-AI.md) — kontrak kerja, keputusan terkunci, daftar larangan

## 0. Cara pakai berkas ini

- **Satu langkah per putaran.**
- **Jangan mengubah cara PIN disimpan.** `src/lib/crypto.ts` sudah benar (PBKDF2 + salt). Tugas ini
  hanya menambah **lapisan tampilan**, bukan menyentuh kripto.
- Tugas ini **tidak** boleh mengubah angka apa pun, hanya visibilitasnya. Kalau sebuah perubahan
  membuat nilai `cost`/`totalCost`/`rateSnapshot` berbeda, perubahan itu salah.

**Perintah verifikasi standar (dari `les-ko-lui/`):**

```powershell
npx tsc -b        # harapan: tanpa keluaran
npx eslint src    # harapan: tanpa keluaran
npm test          # harapan: 561+ lulus, 0 gagal
npm run build     # harapan: built + dist/sw.js

# Peta kebocoran: layar yang menyentuh uang TANPA hook uang (target akhir: 0).
# REKURSIF di dalam src\screens (pola lama "src\screens\**\*.tsx" tidak menjangkau kedalaman >2).
Get-ChildItem -Recurse src\screens -Include *.tsx -File | Select-String -Pattern "formatRupiah|totalCost|rateSnapshot" |
  Where-Object { $_.Line -notmatch "useMoneyVisible|money-safe|formatRupiahDisplay" } |
  ForEach-Object { "{0}:{1}: {2}" -f $_.Path, $_.LineNumber, $_.Line.Trim() }
```

> **Kegagalan yang bukan regresi:** `npm test` memuat tes PIN (`crypto.test.ts`). Tes itu menguji
> `hashPin`/`verifyPin` — tugas ini **tidak** boleh menyentuhnya, jadi kalau tes itu gagal, berarti
> ada perubahan yang keluar jalur.

## 1. Tujuan & definisi selesai

Uang bocor di 5 layar tanpa gerbang; hanya `/payments` yang terkunci (`Payments.tsx:107,123`).
Akibatnya, PIN keuangan praktis tidak ada artinya. Tugas ini menyatukan seluruh visibilitas uang
menjadi **satu hook**, satu bentuk tampilan terkunci, dan satu gerbang.

**Selesai berarti:**

- [ ] Home **tidak menampilkan uang sama sekali** (tidak ada nominal, tidak ada tombol Pengeluaran)
- [ ] 5 layar lain menampilkan uang sebagai `Rp ••••••` + 🔒 saat terkunci
- [ ] Perintah peta kebocoran di §0 menghasilkan **keluaran kosong**
- [ ] Membuka uang berlaku **selama aplikasi terbuka**; tombol `Kunci` tersedia
- [ ] `/payments` masih punya gerbang penuh (lapisan kedua)
- [ ] Semua tes hijau; **tidak ada** perubahan pada `crypto.ts`

## 2. Kondisi awal (audit kebocoran, 2026-09-25)

| # | Layar | Jangkar teks untuk menemukannya | Yang bocor | Gerbang sekarang |
|---|---|---|---|---|
| 1 | `src/screens/home/Home.tsx` | tombol `💸 Pengeluaran` | akses masuk keuangan | ❌ tidak ada |
| 2 | `src/screens/home/OperationalSnapshot.tsx` | kartu snapshot mingguan | angka pendapatan | ❌ tidak ada |
| 3 | `src/screens/Students.tsx` | `settings?.financialPin` (≈baris 558) | tarif murid | ⚠️ hanya untuk aksi |
| 4 | `src/screens/StudentDetail.tsx` | `settings?.financialPin` (≈baris 564) | tarif murid | ⚠️ sebagian |
| 5 | `src/screens/studentDetail/SessionDetailModal.tsx` | `settings?.financialPin` (≈baris 437, 461) | biaya sesi | ⚠️ sebagian |
| 6 | `src/screens/MonthlyReport.tsx` | `formatRupiah(d.totalCost)`, `formatRupiah(payment.totalCost)` | total biaya & tagihan | ❌ tidak ada |

> Nomor baris **hanya pembanding**; setelah langkah pertama ia bergeser. Jangkar teksnya yang dipakai.

**Cara mengukur ulang:** jalankan perintah peta kebocoran di §0.

## 3. Urutan langkah

### Langkah 1 — `useMoneyVisible()`: satu kebenaran

**Tujuan:** ada satu hook yang menjawab "boleh lihat uang atau tidak", dipakai semua layar.

**Berkas baru:** `src/hooks/useMoneyVisible.ts`

**Kontrak (salin apa adanya):**

```ts
/** Status buka-kunci uang. Selama aplikasi terbuka (kontrak K3.4). */
export interface MoneyVisibility {
  /** Belum ada PIN keuangan di Pengaturan. */
  readonly needsSetup: boolean;
  /** Ada PIN, belum dibuka. */
  readonly locked: boolean;
  /** Boleh menampilkan angka. */
  readonly visible: boolean;
  /** Buka dengan PIN. true = berhasil. */
  unlock(pin: string): Promise<boolean>;
  /** Kunci kembali secara manual. */
  lock(): void;
  /** Pesan galat terakhir (mis. "PIN salah." / "Tunggu 12 detik."). */
  readonly error: string;
  /** Bersihkan galat saat pengguna mulai mengetik lagi. */
  clearError(): void;
}

/** Hook utama. Aman dipanggil di banyak komponen sekaligus. */
export function useMoneyVisible(): MoneyVisibility;
```

**Aturan implementasi:**

1. **Status harus dibagi antar komponen.** Beberapa komponen di satu layar (`Students`, `StudentDetail`,
   `SessionDetailModal`) memanggil hook ini; membuka di satu tempat harus membuka di semuanya.
   Pakai penyimpanan tingkat modul + `useSyncExternalStore` (tanpa Context baru), atau Context di
   `src/App.tsx` — **pilih satu**, tulis alasannya di §8.
2. **Verifikasi PIN memakai `verifyPin` dari `src/lib/crypto.ts`** dan **lockout** dari
   `src/lib/pinLockout.ts` — persis seperti `src/hooks/usePinGate.ts`. Baca berkas itu dulu; jangan
   menduplikasi logika lockout dengan versi sendiri.
3. `needsSetup` ditentukan dari `Settings.financialPin` yang kosong/undefined.
4. Status tersimpan **di memori modul** (bukan `localStorage`), sehingga tertutup saat aplikasi ditutup
   — itulah arti "berlaku selama aplikasi terbuka".

**Selesai bila:** hook ada, punya tes unit minimal 4 kasus: (a) tanpa PIN → `needsSetup`, (b) PIN salah →
`locked` dan `error` terisi, (c) PIN benar → `visible`, (d) `lock()` mengembalikan ke `locked`.

**Verifikasi:** perintah standar §0 + `npm test -- useMoneyVisible`.

---

### Langkah 2 — `MaskedMoney` + formatter tampilan

**Tujuan:** satu komponen untuk menampilkan uang yang tahu status kunci.

**Berkas baru:** `src/components/ui/MaskedMoney.tsx`

**Kontrak:**

```tsx
interface MaskedMoneyProps {
  /** Nilai rupiah. undefined/null → render "—". */
  amount?: number | null;
  /** "inline" untuk di tengah kalimat, "block" untuk angka besar (StatTile). */
  variant?: "inline" | "block";
  /** Kelas tambahan dari pemanggil (ukuran/warna saja — bukan token). */
  className?: string;
  /** Sembunyikan tombol buka (mis. di dalam baris yang sudah punya aksi sendiri). */
  hideUnlock?: boolean;
  onUnlockRequest?: () => void;
}
```

**Aturan:**

1. Saat `visible` → panggil `formatRupiah` yang **sudah ada** di `src/lib/format.ts:66`. Jangan buat
   formatter baru.
2. Saat terkunci → `Rp ••••••` + ikon 🔒. **Bukan** baris kosong, **bukan** angka parsial.
3. Ikon 🔒 memakai `src/components/icons.tsx` kalau sudah ada ikon kunci; kalau belum, tambahkan
   **di sana** (bukan emoji) supaya konsisten dengan keputusan `03-PLAYBOOK` §5.3.3.

> **Catatan penting tentang `formatRupiah`.** Formatter itu juga dipakai oleh **pembuat pesan**:
> `src/lib/waBilling.ts:94-95` dan `src/lib/invoicePresentation.ts:60`. Nomor WhatsApp harus tetap
> memuat nominal asli. Karena itu masking **hanya di lapisan tampilan komponen**, **jangan** diubah
> di dalam `formatRupiah`. Kalau masking ditempel di formatter, pesan tagihan ke orang tua akan
> berisi `Rp ••••••`.

**Selesai bila:** komponen ada + tes: (a) `visible` → teks sama dengan `formatRupiah`, (b) terkunci →
teks memuat `••••••` dan **tidak** memuat digit, (c) `amount` null → `—`.

**Verifikasi:** perintah standar §0 + `npm test -- MaskedMoney`.

---

### Langkah 3 — Home: uang hilang sepenuhnya

**Tujuan:** memenuhi keputusan pemilik — Home tidak menampilkan uang.

**Berkas:** `src/screens/home/Home.tsx`, `src/screens/home/OperationalSnapshot.tsx`

**Yang dilakukan:**

1. **Hapus** tombol `💸 Pengeluaran` dari header. Akses pengeluaran pindah ke tab `Uang` (atau `⋯`),
   jangan dihapus kemampuannya.
2. **`OperationalSnapshot`:** keluarkan semua angka uang. Kalau kartunya jadi tidak bermakna,
   gabungkan ke header "Hari Ini" seperti `TASK-03` §2 (baris `OperationalSnapshot`).
3. **Blok "Perlu keputusan"**: brief yang menyangkut tagihan **tidak boleh** menyebut nominal.
   Bunyinya: *"3 tagihan perlu ditindak — 1 lewat 40 hari"*, dengan tombol `Lihat di Uang ▸`.

**Selesai bila:** menjalankan peta kebocoran §0 pada `src/screens/home/*.tsx` → kosong; dan
`grep "Rp" src/screens/home/*.tsx` tidak menemukan literal nominal.

**Verifikasi:** perintah standar §0 + peta kebocoran §0.

---

### Langkah 4 — Tiga layar murid: bungkus dengan `MaskedMoney`

**Tujuan:** tarif & biaya sesi ikut tertutup.

**Berkas sasaran:**

1. `src/screens/Students.tsx` — jangkar `settings?.financialPin` (≈baris 558)
2. `src/screens/StudentDetail.tsx` — jangkar `settings?.financialPin` (≈baris 564)
3. `src/screens/studentDetail/SessionDetailModal.tsx` — jangkar `settings?.financialPin` (≈baris 437, 461)

**Aturan:**

1. Ganti **tampilan** angka uang menjadi `<MaskedMoney amount={...} />`.
2. **Pertahankan** gerbang PIN yang sudah ada untuk aksi (`ganti tarif`, `hapus`), tetapi
   sekarang **pakai hook yang sama** (`useMoneyVisible`) supaya tidak ada dua sumber kebenaran.
3. Kalau `useMoneyVisible().needsSetup` → tampilkan ajakan "Buat PIN Keuangan" yang mengarah ke
   `Pengaturan`, seperti perilaku sekarang di `Payments.tsx:107-121`.

**Selesai bila:** ketiga berkas tidak lagi memanggil `usePinGate` sendiri untuk **menampilkan** uang;
peta kebocoran §0 untuk ketiga berkas → kosong.

**Verifikasi:** perintah standar §0 + peta kebocoran §0.

---

### Langkah 5 — Laporan bulanan & `/payments` jadi satu gerbang

**Tujuan:** menutup kebocoran terakhir, dan menghapus gerbang ganda.

**Berkas:** `src/screens/MonthlyReport.tsx`, `src/screens/Payments.tsx`

**Yang dilakukan:**

1. `MonthlyReport.tsx`: bungkus `formatRupiah(d.totalCost)` dan `formatRupiah(payment.totalCost)`
   dengan `MaskedMoney`.
2. `Payments.tsx`: **pertahankan** gerbang penuh di layar itu (kontrak K3.4 — lapisan kedua), tetapi
   ganti `usePinGate` lokal menjadi `useMoneyVisible` agar status buka-kunci **berbagi** dengan layar lain.
   Artinya: buka sekali di Home → `/payments` juga terbuka, dan sebaliknya.
3. Hapus `useState` PIN lokal yang tidak lagi dipakai. **Jangan** hapus `usePinGate.ts` — ia masih
   dipakai `Settings.tsx` untuk aksi sensitif.

**Selesai bila:** peta kebocoran §0 → **keluaran kosong secara keseluruhan**; membuka uang di satu
layar membuka di layar lain; `Settings.tsx` masih berfungsi seperti sebelumnya.

**Verifikasi:** perintah standar §0 + peta kebocoran §0 (harus kosong).

---

### Langkah 6 — Tombol `Kunci` + penjaga regresi

**Tujuan:** pengguna bisa menutup kembali, dan kebocoran tidak kembali diam-diam.

**Yang dilakukan:**

1. Tambah tombol `🔒 Kunci` di tab `Uang` (dan/atau menu `⋯` Home) yang memanggil `lock()`.
2. **Tes jaga** di `src/__tests__/moneyGate.test.ts`: untuk setiap berkas di tabel §2, pastikan
   berkas itu memuat `MaskedMoney` atau `useMoneyVisible`. Ini tes ringan berbasis pembacaan berkas
   (`fs.readFileSync`), supaya kebocoran baru langsung ketahuan di CI.

**Selesai bila:** tombol `Kunci` berfungsi; tes jaga lulus; mencoba menambah `formatRupiah` baru
di salah satu layar itu **menggagalkan** tes.

**Verifikasi:** perintah standar §0 + `npm test -- moneyGate`.

## 4. Pola umum

- **Pola tampil uang:** `<MaskedMoney amount={x} />` — jangan pernah `formatRupiah(x)` langsung di layar.
- **Pola minta buka:** `const money = useMoneyVisible(); if (!money.visible) → tampilkan ajakan/sheet`.
- **Pola aman untuk pesan:** di dalam `src/lib/waBilling.ts` dan `invoicePresentation.ts`,
  `formatRupiah` **tetap** dipakai apa adanya. Tambahkan komentar `// money-safe: pesan keluar, bukan layar`.

## 5. Jebakan yang sudah pernah terjadi

| Jebakan | Gejala | Cara menghindar |
|---|---|---|
| Masking ditaruh di `formatRupiah` | Pesan WhatsApp ke orang tua berisi `Rp ••••••` | Masking **hanya** di komponen |
| Setiap layar menyimpan status kuncinya sendiri | Buka di Home, terkunci lagi di Murid | Satu penyimpanan tingkat modul / satu Context |
| Pin di-hash ulang saat unlock | PIN lama tidak berlaku lagi | **Jangan** sentuh `crypto.ts`; pakai `verifyPin` |
| Uang disembunyikan dengan menghapus barisnya | Pengguna tidak tahu ada angka di situ | Bentuknya `Rp ••••••` + 🔒, bukan hilang |
| Lupa `needsSetup` | Pengguna tanpa PIN melihat `Rp ••••••` tanpa jalan keluar | Tiga keadaan: needsSetup / locked / visible |

## 6. Kalau macet

| Gejala | Sebab | Tindakan |
|---|---|---|
| Status kunci "lompat" antar komponen | dua instans hook punya state sendiri | Pastikan memakai penyimpanan modul/Context, bukan `useState` lokal |
| PIN benar tapi tetap terkunci | `attemptPin` diberi string kosong / PIN belum di-hash | Cek `settings.financialPin` terisi; cek `verifyPin` menerima format `pbkdf2v2:` |
| Tes jaga gagal untuk berkas yang baru disentuh | berkas menyentuh uang tanpa hook | Bungkus dengan `MaskedMoney`, jangan longgarkan tesnya |
| `/payments` minta PIN dua kali | tersisa `usePinGate` lokal di samping hook baru | Hapus gate lokalnya, sisakan satu |
| Lockout tidak jalan | logika `pinLockout` tidak dipakai | Impor `getPinLockoutDelay`/`recordPinFailure` seperti di `usePinGate.ts` |

> Jangan menutupi macet dengan melonggarkan tes jaga. Tes itu justru hasil kerja tugas ini.

## 7. Larangan konkret

| ❌ JANGAN sentuh | Alasan |
|---|---|
| `src/lib/crypto.ts` | PIN pengguna; kesalahan = pengguna terkunci dari datanya |
| `src/lib/format.ts` (isi `formatRupiah`) | dipakai pesan keluar; masking di sini merusak tagihan |
| `src/lib/waBilling.ts`, `src/lib/invoicePresentation.ts` | pesan ke orang tua harus memuat nominal asli |
| `src/db/db.ts` (versi schema) | tidak perlu; visibilitas tidak mengubah data |
| `src/screens/Settings.tsx` (alur PIN) | masih dipakai; `usePinGate` di sana tetap |
| Nilai `cost`, `totalCost`, `rateSnapshot` di DB | tugas ini hanya soal tampilan |

## 8. Catatan penyimpangan

| Tanggal | Langkah | Yang terjadi | Keputusan |
|---|---|---|---|
| 2026-10-03 | L2 | `MaskedMoney` ditaruh di `src/components/ui/MaskedMoney.tsx` (bukan `src/components/`), dan panel PIN-nya dirender lewat **portal** ke `document.body` | Mengikuti `TASK-08` Langkah 2 (path `ui/`) sekaligus menghindari `<div>` di dalam `<p>`/`<td>` — tanpa portal, parser HTML menutup `<p>` lebih awal dan merusak tata letak |
| 2026-10-03 | L3 | Blok **"Perlu keputusan"** tanpa nominal **tidak** dibuat di Beranda pada tugas ini | Dikerjakan di **G2-08** bersama penggabungan blok "Hari Ini" (B-04/B-05) supaya Beranda tidak dirombak dua kali. Nominal memang tidak pernah muncul — hanya jumlah tagihan + umur piutang (`invoiceAgeDays`) |
| 2026-10-03 | L4 | Dua titik dari tabel §2 ternyata **sudah bersih sejak lama**: `home/OperationalSnapshot.tsx` dan `screens/Students.tsx` (0 kemunculan `Rp`/`formatRupiah`/`tolowerCase` uang) | Tidak dikerjakan ulang; dicatat sebagai "sudah tertutup". Kebocoran nyata ada di `StudentDetail.tsx` (tarif `toLocaleString`, biaya di modal edit) dan `studentDetail/SessionDetailModal.tsx` |
| 2026-10-03 | L5 | Perintah verifikasi K3 (§0) **tidak** menghasilkan 0 baris secara keseluruhan | 106 baris yang tersisa semuanya di `src/screens/payments/**` — modul yang **hanya bisa dirender setelah gerbang penuh `Payments.tsx` lolos** (K3.4 lapisan kedua). Masking ~106 titik di dalam modul keuangan sengaja **tidak** dikerjakan (di luar daftar berkas tugas ini, dan berisiko pada nilai uang). Sisa 19 baris di luar `payments/` adalah **data** (`totalCost` sebagai variabel/prop) atau `formatRupiah` untuk pesan validasi tarif maksimum — bukan tampilan. Perlu keputusan pemilik: pindahkan `src/screens/payments/**` keluar dari cakupan perintah §6, atau jadikan tugas lanjutan |
| 2026-10-03 | L6 | **Tes jaga `moneyGate.test.ts` ditulis** — sehari setelah laporan awal menyebutnya tidak dikerjakan. Isinya membaca **berkas sumber** (`?raw`), bukan DOM: layar ber-gerbang wajib memuat `MaskedMoney`/`useMoneyVisible` dan tidak boleh memuat `formatRupiah(` tanpa penanda; Beranda wajib nol `formatRupiah` **dan** nol literal `"Rp"`; `waBilling`/`invoicePresentation` wajib **tetap** memakai `formatRupiah` (masking di sana merusak pesan ke orang tua) | Predikatnya diverifikasi lebih dulu tanpa vitest lewat `.design-audit/g2-04-verify-moneygate.cjs` (12/12 lulus). Pra-uji itu **menangkap satu kesalahan**: penanda `money-safe` harus berada di **baris yang sama** dengan pemanggilannya — perintah K3 (`arsitektur/11` §6) dan tes ini menyaring per baris, bukan per blok. Setelah diperbaiki, sisa K3 turun **125 → 124**. **Tesnya sendiri belum pernah dijalankan** (gate tes dimatikan pemilik) |

## 9. Progres

- [ ] **L1 — `useMoneyVisible`.** Pilihan penyimpanan status (modul / Context): ______
- [ ] **L2 — `MaskedMoney`.** Tes: ___ lulus
- [ ] **L3 — Home bersih.** Keluaran peta kebocoran: ___
- [ ] **L4 — 3 layar murid.** Keluaran peta kebocoran: ___
- [ ] **L5 — Laporan & `/payments`.** Keluaran peta kebocoran (target: kosong): ___
- [ ] **L6 — Tombol Kunci + tes jaga.** `npm test -- moneyGate`: ___

## 10. Riwayat tugas

| Tanggal | Perubahan | Versi | Hasil |
|---|---|---|---|
| 2026-09-25 | Dibuat dari audit kebocoran uang | v1.75.1 | `todo` |
