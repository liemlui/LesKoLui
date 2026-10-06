# TASK-06 — Perkuat Catat Sesi (wizard **dipertahankan**, bukan diringkas)

> **STATUS:** `todo`
> **PEMILIK:** agen AI
> **DIBUAT:** 2026-09-25 · **Portret dokumen:** v1.75.1 (angka mutakhir lewat `npm run measure`)
> **PERKIRAAN:** 6 langkah × 30–45 menit
> **INDUK:** [`TASK-03-blueprint-uiux.md`](TASK-03-blueprint-uiux.md) · **PRASYARAT:** [`TASK-04`](TASK-04-fondasi-visual.md)
> **PENTING:** [`TASK-01`](TASK-01-refactor-layar-besar.md) sudah memecah `CaptureSession.tsx`.
> **Baca `TASK-01` §9 dulu** untuk tahu langkah mana yang sudah selesai, agar tidak mengulang pekerjaan.
> **BACA DULU:** [`ATURAN-AI.md`](ATURAN-AI.md) — kontrak kerja, keputusan terkunci, daftar larangan

## 0. Cara pakai berkas ini

- **Keputusan pemilik (2026-09-25), apa adanya:** *"Catat sesi sudah bagus seperti wizard gini, hanya di
  perkuat saja."*
- Karena itu tugas ini **DILARANG** mengurangi jumlah langkah, menggabungkan langkah, atau
  menggantinya dengan "satu layar berisi draft AI".
- Tugas ini hanya: **rasa** (hierarki, ukuran, target sentuh), **satu langkah satu layar**, **draf yang
  tidak hilang**, dan **menyatukan tiga jalur pengelolaan sesi menjadi satu**.
- **Enam langkah tetap enam.** `STEP_META` (`src/screens/captureSession/constants.ts:67`) tidak boleh
  berubah jumlahnya — ada tes yang mengunci itu (`captureSessionHelpers.test.ts:176`).

> **Amandemen 2026-10-01 (Q2) — tombol simpan.** Sesi **boleh disimpan dari langkah 5**: tombol `Simpan Sesi`
> aktif di langkah 5 **dan** 6. Ini **bukan** pengurangan langkah — `STEP_META` tetap 6 dan langkah 6 tetap
> menawarkan Bukti (foto/TTD). Yang berubah hanya boleh menyelesaikan lebih awal, bukan menghilangkan langkah.
> **Dua tes baru wajib** (di `captureSessionHelpers` atau tes komponen yang setara):
> (a) simpan dari langkah 5 tanpa Bukti → sesi tersimpan dengan catatan; (b) bila Bukti diisi, Bukti ikut tersimpan.

**Perintah verifikasi standar (dari `les-ko-lui/`):**

```powershell
npx tsc -b        # harapan: tanpa keluaran
npx eslint src    # harapan: tanpa keluaran
npm test          # harapan: 561+ lulus, 0 gagal
npm run build     # harapan: built + dist/sw.js
npm run e2e       # harapan: alur Catat Sesi lulus
npm run e2e:pwa   # jalankan `npm run build` dulu
```

## 1. Tujuan & definisi selesai

Wizard ini **sudah benar** dan justru satu-satunya bagian aplikasi yang memaksa data berkualitas
(enam langkah = engagement, behavior tag, respons akademik, foto, tanda tangan). Masalahnya bukan
strukturnya, melainkan **rasa**: hierarki lemah, target sentuh kecil, progres tidak informatif, dan
di luar wizard ada **tiga jalur** untuk mengelola sesi yang sama (`Catat`, `EditSessionModal`,
`ResolveMissedSessionModal`).

**Selesai berarti:**

- [ ] Jumlah langkah **tetap 6**; tidak ada langkah yang digabung atau dihapus
- [ ] Setiap langkah mengisi layar dengan fokus penuh; bilah aksi **selalu** di tempat yang sama
- [ ] Transisi antar langkah terasa jelas (arah maju/mundur terlihat)
- [ ] Menutup wizard di tengah jalan **tidak** menghilangkan draf (perilaku sekarang dipertahankan)
- [ ] Tombol **`Simpan Sesi` aktif di langkah 5 dan 6**; menyimpan dari langkah 5 boleh tanpa Bukti (Q2 2026-10-01)
- [ ] `EditSessionModal` + `ResolveMissedSessionModal` **menjadi satu** sheet "Kelola sesi"
- [ ] Aksi sesi terlewat: `Catat` · `Batalkan sesi` · `Tidak hadir`; `Jadwalkan ulang` pindah ke `⋯`
- [ ] `[Catat]` dari beranda membuka wizard **dengan murid + tanggal + jam terisi** (keputusan B3)

## 2. Kondisi awal (angka nyata)

| Ukuran | Sekarang | Target |
|---|---:|---:|
| Jumlah langkah | 6 (`STEP_META`) | **6** |
| Baris `CaptureSession.tsx` | **1.901** (terukur 2026-10-04, setelah refactor G3-01; langkah 4 wizard & modal pemilih mapel pindah ke `captureSession/ResponseStep.tsx` + `SubjectPickerSheet.tsx`) | turun setelah ekstraksi, bukan karena langkah dikurangi |
| Titik pemanggil "Catat" | `Home.tsx` (`onCapture`), `AttentionInbox.tsx`, `SessionPill` | satu jalur dengan `scheduleId` |
| Modal pengelolaan sesi | `EditSessionModal` + `ResolveMissedSessionModal` | 1 sheet |
| Target sentuh chip teks | 38–42 px (sengaja dibiarkan, `03-PLAYBOOK` §5.3) | ≥44 px untuk kontrol utama |

**Jangkar utama:**

- `const STEPS = STEP_META.map((s) => ({ ...s, Icon: iconForStep(s.icon) }));` — `CaptureSession.tsx:64`
- `Langkah {currentStep} dari {STEPS.length}` — `CaptureSession.tsx:738`
- Glosarium langkah — `src/screens/captureSession/constants.ts:67`
- Draf — `src/screens/captureSession/useCaptureDraft.ts`
- Tutup buku sesi — `src/screens/captureSession/CloseOutSheet.tsx`
- Isi otomatis AI — `src/screens/captureSession/useAiFill.ts`
- Jadwal — `src/screens/captureSession/ScheduleStep.tsx`

## 3. Urutan langkah

### Langkah 1 — Satu langkah satu layar (tanpa mengubah isi langkah)

**Tujuan:** setiap langkah mengisi layar; tidak ada dua langkah terlihat bersamaan.

**Berkas:** `src/screens/CaptureSession.tsx`

**Yang dilakukan:**

1. Header langkah **lengket di atas** (sticky): nomor + label + deskripsi dari `STEP_META`,
   plus bilah progres **6 titik** (bukan teks saja).
2. Isi langkah di dalam satu wadah dengan tinggi sisa layar, sehingga konten berikutnya tidak mengintip.
3. Bilah aksi bawah (`Kembali` / `Lanjut`) **selalu** di posisi yang sama di keenam langkah.
   Variabel `--task-bar-h` di `src/index.css:27-30` sudah ada untuk ini — pakai, jangan buat baru.
4. Transisi: geser horizontal 200ms mengikuti arah (`--motion-enter`), hormati `prefers-reduced-motion`.

**Selesai bila:** pada keenam langkah, hanya isi langkah aktif yang terlihat; bilah aksi tidak pernah
berpindah tempat; label langkah tidak pernah bertumpuk dengan konten.

**Verifikasi:** perintah standar §0 + buka keenam langkah di 390px dan 430px.

---

### Langkah 2 — Rasa: ukuran huruf, target sentuh, jarak

**Tujuan:** menghilangkan kesan sempit pada alur yang paling sering dipakai.

**Aturan (dari `TASK-04` §3 Langkah 5, berlaku ketat di sini):**

| Elemen | Sekarang | Menjadi |
|---|---|---|
| Judul langkah | `text-xs`/`text-sm` | `text-title` (18px) |
| Nama murid / label pilihan | `text-sm` | `text-body` (15px) |
| Chip pilihan (mapel, topik, tag) | 38–42 px tinggi | **≥44 px** untuk yang sering ditekan (mapel, kondisi) |
| Chip topik/hasil pencarian | 38–42 px | boleh tetap ≥38 px (lolos WCAG 2.5.8) |
| Tombol `Lanjut` / `Simpan` | — | lebar penuh, tinggi ≥52 px |

**Selesai bila:** tidak ada konten terbaca <13px; kontrol utama ≥44 px; `Lanjut`/`Simpan` selalu
lebar penuh.

**Verifikasi:** perintah standar §0 + periksa dengan devtools (ukur tinggi target sentuh).

---

### Langkah 3 — Draf: pastikan tidak ada yang hilang (perkuat murni)

**Tujuan:** draf tetap jadi jaring pengaman, dan sekarang **terlihat**.

**Berkas:** `src/screens/captureSession/useCaptureDraft.ts`, `src/screens/CaptureSession.tsx`

**Yang dilakukan:**

1. Tampilkan indikator tenang: `Draf tersimpan · 09.41` di header langkah. Bukan toast, bukan modal.
2. Saat wizard dibuka dan ada draf lama, tampilkan satu kartu ringkas: tanggal draf, murid, langkah
   terakhir — dengan pilihan `Lanjutkan` atau `Mulai sesi baru`. Jangan memulihkan diam-diam.
3. **Jangan** mengubah kunci penyimpanan draf (`captureDrafts`) atau bentuk datanya — ada tes
   `captureDraftRepo.test.ts`, `captureDraftLifecycle.test.ts`, `captureDraftDigest.test.ts`.

**Selesai bila:** draf terlihat statusnya; memilih "Mulai sesi baru" tidak menghapus draf yang lain;
ketiga tes draf lama tetap lulus tanpa diubah.

**Verifikasi:** perintah standar §0 + `npm test -- captureDraft`.

---

### Langkah 4 — Satu sheet "Kelola sesi" (menggantikan dua modal)

**Tujuan:** tiga jalur pengelolaan sesi menjadi satu.

**Berkas:** `src/screens/home/EditSessionModal.tsx`, `src/screens/home/ResolveMissedSessionModal.tsx`
→ **berkas baru** `src/screens/home/ManageSessionSheet.tsx`

**Kontrak:**

```tsx
type SesiKontek = "terjadwal" | "terlewat";

interface ManageSessionSheetProps {
  session: Session;
  studentName: string;
  kontek: SesiKontek;       // menentukan aksi mana yang muncul
  onClose: () => void;
  onResult: (message: string) => void;
}
```

**Aksi menurut konteks (dari keputusan pemilik):**

| Konteks | Aksi utama | Aksi di `⋯` |
|---|---|---|
| `terlewat` | **`Catat`** · **`Batalkan sesi`** · **`Tidak hadir`** | `Jadwalkan ulang`, `Hapus` |
| `terjadwal` | `Simpan perubahan` | `Batalkan sesi`, `Hapus` |

> **Diperbarui 2026-10-05 (permintaan pemilik).** Konteks `terlewat` dulu berbunyi **`Batal les`** — operasinya sama persis dengan `Batalkan sesi` (`cancelSeriesSessions`), hanya katanya yang berbeda, dan perbedaan itu yang membuat tutor bertanya "bedanya apa?". Sekarang kedua konteks memakai satu label. Selain itu `Batalkan sesi` dan `Hapus` masing-masing punya satu baris **keterangan akibat** di bawah tombolnya (kunci `keterangan` di `manageSession.ts`), karena bedanya tidak boleh hanya muncul di dialog konfirmasi **sesudah** ditekan.

**Aturan:**

1. **Jangan mengubah repo.** Semua aksi memakai fungsi yang sudah ada:
   `cancelSession`, `markSessionNoShow`, `rescheduleSession` (`src/db/repos`) — jangan menulis yang baru.
2. `Tidak hadir` menyertakan pilihan kebijakan tagihan (`noShowBillable`) seperti sekarang.
   **Angka & perilaku tagihan tidak boleh berubah.**
3. `Jadwalkan ulang` tetap ada di `⋯` — kemampuan lama tidak hilang, hanya tidak lagi berebut perhatian.
4. Alasan pembatalan tetap tersimpan di `Session.statusReason` (teks bebas). **Jangan** mengubah bentuknya
   di tugas ini (kode sebab terstruktur adalah tugas terpisah, lihat `TASK-03` §2 catatan).

**Selesai bila:** kedua modal lama tidak lagi diimpor; keenam aksi di tabel masih bisa dijalankan;
`reason` tetap tersimpan.

**Verifikasi:** perintah standar §0 + `(Get-ChildItem -Recurse src -Include *.tsx -File | Select-String -Pattern "EditSessionModal|ResolveMissedSessionModal").Count` (**harus 0** — pola lama `src\**\*.tsx` tidak menjangkau `src/screens/home/`) + `npm run e2e`.

---

### Langkah 5 — `[Catat]` dari beranda mengisi murid + tanggal + jam

**Tujuan:** memenuhi keputusan B3 — mempercepat **tanpa** mengurangi langkah.

**Berkas:** `src/screens/home/Home.tsx` (pemanggil), `src/screens/CaptureSession.tsx` (penerima),
`src/screens/captureSession/ScheduleStep.tsx`

**Yang dilakukan:**

1. Setiap baris jadwal di beranda memakai tautan yang sudah ada: `/capture?scheduleId=<id>`
   (`Home.tsx`, `actions.onCapture`). Pertahankan bentuk URL ini — deep link & E2E memakainya.
2. Saat `scheduleId` ada, **Langkah 1 (Jadwal)** sudah terisi murid, tanggal, jam, dan durasi dari jadwal,
   dengan satu baris konfirmasi: *"Dari jadwal 24 Sep 15.30 · Sari — ubah bila perlu."*
3. Tutor **tetap** harus melewati keenam langkah. Yang dihemat hanya pengisian ulang, bukan langkahnya.
4. Tombol `+ Catat sesi` di nav (dari `TASK-05` Langkah 7) membuka wizard **tanpa** `scheduleId`
   (mulai dari Langkah 1 kosong).

**Selesai bila:** membuka `/capture?scheduleId=X` menampilkan Langkah 1 dalam keadaan terisi; jumlah
langkah tetap 6; alur tanpa `scheduleId` tidak berubah.

**Verifikasi:** perintah standar §0 + `npm run e2e`.

---

### Langkah 6 — Verifikasi manual + E2E klik-cepat

**Tujuan:** menutup celah yang paling sering bocor — "sudah hijau di tes, belum pernah dibuka manusia".

**Yang dilakukan:**

1. Jalankan daftar periksa manual di [`docs/README.md`](../README.md) §4.3 (12 langkah) — itu daftar
   yang **sudah ada** dan belum pernah dicentang manusia. Tandai hasilnya di §9 tugas ini.
2. Tambah E2E `e2e/capture-happy-fast.spec.ts`: dari beranda → tekan `[Catat]` pada baris jadwal →
   pastikan Langkah 1 terisi → luruskan keenam langkah dengan nilai minimum → simpan → pastikan sesi
   muncul di riwayat.
3. Catat **waktu tempuh** alur cepat itu ke §9. Ukuran ini dipakai untuk menilai apakah "diperkuat"
   benar-benar terasa, bukan hanya terlihat rapi.

**Selesai bila:** 12 kotak di `docs/README.md` §4.3 tercentang; E2E lulus; waktu tempuh tercatat.

**Verifikasi:** perintah standar §0 + `npx playwright test e2e/capture-happy-fast.spec.ts`.

## 4. Pola umum

- **Pola langkah:** header lengket + isi + bilah aksi tetap. Tidak ada langkah yang menyimpang dari pola ini.
- **Pola aksi sesi:** satu sheet, aksi menurut `kontek`. Tidak ada modal kedua untuk hal yang sama.
- **Pola AI di dalam wizard:** `✨ Isi bagian ini` per bagian (memakai `useAiFill` yang ada),
  dengan modal biaya dari `TASK-07`. **Bukan** satu tombol "isi semua".

## 5. Jebakan yang sudah pernah terjadi

| Jebakan | Gejala | Cara menghindar |
|---|---|---|
| Menggabung langkah "supaya cepat" | data engagement jadi kosong/datar | **Dilarang** di tugas ini; enam langkah tetap enam |
| Mengira menyimpan dari langkah 5 = mengurangi langkah | ragu melanggar kontrak | **Bukan pelanggaran** (Q2 2026-10-01): `STEP_META` tetap 6; tombol `Simpan Sesi` aktif di langkah 5 & 6; langkah 6 tetap menawarkan Bukti |
| Mengubah bentuk draf | pengguna kehilangan isian saat app ditutup | Kunci penyimpanan & bentuk data tidak diubah |
| Menghapus `Jadwalkan ulang` | kemampuan hilang tanpa disadari | Pindahkan ke `⋯`, jangan hapus |
| Mengubah URL `?scheduleId=` | deep link & E2E patah | Pertahankan bentuk URL |
| `--task-bar-h` tidak di-set | bilah aksi menutupi konten / ditutupi nav | Set variabelnya di layar yang punya bilah aksi |
| Modal lama dibiarkan terimpor | dua perilaku berbeda untuk satu hal | Hapus impornya di langkah yang sama |

## 6. Kalau macet

| Gejala | Sebab | Tindakan |
|---|---|---|
| Langkah 1 kosong padahal ada `scheduleId` | jadwal tidak ditemukan / id salah | Tampilkan keadaan kosong yang jujur, jangan wizard kosong |
| Draf muncul untuk murid yang salah | digest draf tidak dihitung ulang | Periksa `src/lib/captureDraftDigest.ts`; jangan mengubah kuncinya |
| `npm run e2e` gagal di langkah tertentu | selector berbasis teks label berubah | Perbarui selector di langkah yang sama |
| Bilah aksi bertumpuk dengan nav | `--task-bar-h` belum di-set di layar itu | Set di `useEffect` layar, bersihkan saat keluar |
| Chip jadi terlalu besar, tata letak pecah | 44px diterapkan ke chip yang tidak perlu | Ikuti tabel Langkah 2 — hanya kontrol utama |

> Jangan menutupi macet dengan mengurangi langkah atau membuat "mode cepat" yang melewati
> engagement. Kalau terasa berat, perbaiki rasanya (Langkah 1–2), bukan datanya.

## 7. Larangan konkret

| ❌ JANGAN | Alasan |
|---|---|
| Mengubah jumlah/urutan `STEP_META` | ada tes yang mengunci; dan keputusan pemilik |
| Mengubah `engagement.ts` (rumus skor) | mengubah arti data historis |
| Mengubah `captureDraft*` (bentuk data) | risiko kehilangan isian pengguna |
| Menyentuh `CloseOutSheet` (logika tutup buku) | alur laporan; butuh tugas terpisah |
| Menyentuh `src/template/**` | mesin laporan |
| Menghapus kemampuan apa pun "karena tidak dipakai" | kebiasaan pemilik berubah-ubah; sediakan lewat `⋯` |

## 8. Catatan penyimpangan

| Tanggal | Langkah | Yang terjadi | Keputusan |
|---|---|---|---|
| | | | |

## 9. Progres

### 9.1 Hitungan ketukan per langkah — diukur 2026-10-04 (sebelum perubahan bentuk pemilih mapel)

**Cara hitung (supaya bisa diulang dan diperiksa):** tiap `onClick`/`onChange`/`onKeyDown`
pada kontrol yang benar-benar dibutuhkan untuk menyelesaikan langkah dihitung **1 ketukan**;
mengetik dihitung 1 gerakan (fokus + tulis), bukan per karakter. Angka diambil dari **pembacaan
kode**, bukan dari stopwatch di perangkat — jadi ini batas bawah yang bisa diverifikasi ulang,
bukan pengukuran runtime. Titik yang paling mudah keliru: ketukan "Lanjut →" sebenarnya milik
langkah **berikutnya** (ditekan setelah langkah selesai), sedangkan `Simpan Sesi` di langkah 6
**tidak menambah** ketukan karena bilahnya sama.

| Langkah | Jalur paling umum | Ketukan | Catatan |
|---|---|---:|---|
| 1 Jadwal | dari `[Catat]` beranda (`?scheduleId=`) | **1** | hanya `Lanjut →`; murid/tanggal/jam sudah terisi (B3) |
| 1 Jadwal | buka `/capture` polos | **4** | murid · tanggal · jam · `Lanjut` |
| 2 Materi | topik dari chip "sesi lalu" | **1** | tanpa mapel |
| 2 Materi | + topik dari daftar bab | **2** | buka panel bab · centang topik |
| 2 Materi | + topik via pencarian | **2** | ketik · pilih hasil |
| 2 Materi | + mapel di luar profil | **2** | dulu **4** (buka panel · pilih · `Selesai` · ulang untuk mapel kedua) |
| 3 Kondisi | kondisi les saja | **1** | satu ketukan sudah cukup untuk menyimpan fakta |
| 3 Kondisi | + 1 indikator positif | **1** | 6 indikator terdepan sudah terlihat |
| 3 Kondisi | + 1 indikator negatif | **2–3** | negatif ada di balik "indikator lain" |
| 4 Detail | respons akademik saja | **1** | `Isi cepat (respons)` 1 ketuk |
| 4 Detail | respons + fokus perbaikan | **0 tambahan** | mengetik = 1 gerakan |
| 5 Catatan | isi dari chip saran | **1** | chip muncul sebelum mengetik |
| 5 Catatan | tulis sendiri | **1** | mengetik |
| 6 Bukti | lewati (opsional) | **0** | `Simpan Sesi` sudah aktif di langkah 6 |
| 6 Bukti | foto + TTD | **2 + tanda tangan** | kamera/galeri · TTD di pad |

**Jumlah ketukan "Lanjut →" sepanjang wizard = 5** (dari langkah 1→2→3→4→5→6; langkah 6 tidak
punya `Lanjut`). Ini **tidak bisa diturunkan tanpa mengurangi langkah** — dan mengurangi langkah
dilarang (§2.2 `ATURAN-AI`, keputusan pemilik). Jadi penghematan yang sah hanya datang dari
**pemilih** di dalam tiap langkah, bukan dari jumlah langkah.

### 9.2 Status per langkah

- [ ] **L1 — Satu langkah satu layar.** Keenam langkah diperiksa di 390px & 430px: ___ *(prasyarat refactor sudah beres — `CaptureSession.tsx` 1.901, 2026-10-04)*
- [ ] **L2 — Rasa (ukuran & target sentuh).** Kontrol <44px yang tersisa: ___
- [x] **L3 — Draf terlihat (dibuktikan 2026-10-05).** `npm run test:sandbox -- captureDraft` → **17 lulus / 4 berkas** (`captureDraftRepo` 3 · `captureDraftLifecycle` 3 · `captureDraftDiscard` 3 · `captureDraftDigest` 8). Tiga tes draf lama termasuk di dalamnya dan lulus **tanpa diubah** — bentuk penyimpanan draf tidak bergeser.
- [x] **L4 — Sheet Kelola sesi (2026-10-05).** Satu sheet menggantikan **dua modal lama** (`home/ManageSessionSheet.tsx`); keduanya **dihapus** dari repo, dan penghitung penutup L4 — `Select-String "EditSessionModal|ResolveMissedSessionModal"` — sekarang **0** (juga 0 di komentar). Aturan aksinya hidup di dua berkas yang bisa diuji tanpa DOM: `home/manageSession.ts` (tabel aksi per konteks, 18 tes) dan `home/manageSessionForm.ts` (nilai awal kolom isian, pemilih murid, cakupan seri, konfirmasi, validasi tanggal pengganti, 19 tes di `manageSessionSheet.test.tsx`). Enam aksi bisa dijalankan dari sheet: **`Catat`** (buka `/capture?scheduleId=`) · **`Batal les`** · **`Tidak hadir`** (dengan kebijakan tagihan `noShowBillable` seperti sebelumnya) · **`Simpan perubahan`** · **`Jadwalkan ulang`** (di `⋯`) · **`Hapus`** (di `⋯`, lewat `ConfirmSheet`). **Batas kejujuran butir ini:** yang dibuktikan tes adalah **aturan + markup** (aksi apa yang dirender, kolom mana yang muncul, konfirmasi mana yang wajib); **klik nyata, sambungan DB, dan tampilan di perangkat belum dijalankan** — itu §5 butir 21–22 dan `npm run e2e` (§6.2)
- [x] **L4 lanjutan (2026-10-05) — nominal manual tidak terhapus saat ubah jadwal + ganti murid dikonfirmasi.** (a) `patchUbahJadwal()` (`home/manageSessionForm.ts`) mengirim `durationHours` **hanya bila berubah** — sebelumnya sheet selalu mengirimnya, sedangkan `updateSession()` melepas `costOverride` dan menghitung ulang `cost` setiap kali `durationHours` **ada** di patch. Perilaku itu warisan `EditSessionModal`, bukan regresi L4. (b) Ganti murid kini punya peringatan di dalam sheet (tanpa angka rupiah — K3/B1) **dan** konfirmasi sebelum menyimpan; sesi `terlewat` tetap tanpa pemilih murid (keputusan pemilik 2026-10-05, `ATURAN-AI` §1). Bukti: `manageSessionSheet.test.tsx` **19 → 30 tes** + 1 tes repo di `sessionPricing.test.ts`. **Batas:** klik nyata tetap milik `PEKERJAAN` §5 butir **23** dan E2E. ✅ **Temuan teks ter-encode ganda di berkas komponen ini sudah diperbaiki** (putaran yang sama): 13 baris / 17 penggantian (em dash ×9 · titik tengah ×4 · tanda centang ×2 · `⋯` ×2); pindai ulang seluruh repo = **348 berkas / 0 temuan**. Penjaganya kini **ada**: 5 tes repo-wide di berkas tes ini lewat `import.meta.glob(…, ?raw)` — tanpa mengubah `tsconfig` (lihat §10, baris penjaga teks)
- [x] **L4 lanjutan 2 (2026-10-05) — panel terjadwal langsung bisa disunting + pemilih murid penuh (laporan pemilik di perangkat).** (a) Sesi **terjadwal** kini membuka sheet dengan `Simpan perubahan` **sudah terpilih**, sehingga kolom `Murid`/`Tanggal`/`Jam mulai`/`Durasi` langsung terlihat — laporan aslinya: *"ada button simpan perubahan, tapi tidak ada isian untuk di ubah"*, dan itu memang perilaku lama (`aksiId` mulai `null`). Sesi **terlewat** tetap mulai tanpa pilihan karena di sana yang utama adalah memilih hasil sesinya. (b) `pilihanMurid()` tidak lagi menyaring: `Home.tsx` dulu mengirim `listStudents(true)` (**aktif saja**), sehingga maksud "murid sesi ini selalu ada" **tidak pernah tercapai** dan pemilihnya bisa kosong — sesi jadi tidak bisa dipindahkan ke siapa pun. Sekarang daftarnya semua murid dan yang nonaktif **ditandai "(nonaktif)"**. (c) `Batalkan sesi`/`Hapus` punya satu baris **keterangan akibat** di bawah labelnya (menjawab "bedanya apa?" di tempat memilih), dan label operasi yang sama diseragamkan (konteks terlewat dulu "Batal les"). Bukti: `manageSessionSheet.test.tsx` **35 → 37 tes** (kolom terbuka sejak awal · penanda "(nonaktif)") · `manageSessionActions.test.ts` **18 → 22 tes** (keterangan berbeda & tanpa angka rupiah · label seragam). Rincian + gate: §10
- [ ] **L5 — `[Catat]` terisi.** Langkah 1 terisi dari `scheduleId`: ya/tidak
- [ ] **L6 — Verifikasi manual + E2E.** 12 kotak `docs/README.md` §4.3: ___ / 12 · Waktu alur cepat: ___ detik
- [x] **L7 — Simpan dari langkah 5 (Q2, 2026-10-05).** Ternyata aturannya **belum ada di kode** — `goNext()` menyimpan **hanya** di langkah 6, jadi tutor yang tidak butuh Bukti tetap dipaksa melewatinya. Kini tombol **`Simpan Sesi`** tampil di langkah 5 (sebelah `Lanjut →` yang tetap ke Bukti) dan aturannya bernama tunggal: `SAVE_STEPS` + `canSaveFromStep()` di `captureSession/constants.ts`; `STEP_META` tidak disentuh, tombol utama langkah 6 tetap `Simpan Sesi`. Bukti: **4 tes** (`captureSessionHelpers` 2 · `repos` 2 — sesi tanpa bukti tidak menyisakan `photo`/`signature`, bukti yang ada tersimpan apa adanya). Rincian + gate: §10 riwayat 2026-10-05. **Yang belum:** dilihat manusia di perangkat
- [x] **L8 — Efisiensi pemilih mapel (Q-2 opsi A, 2026-10-04, commit `4fcbaf4`).** Modal `+ Tambah Mapel` dihapus; chip mapel dieja datar di langkah 2 (`SubjectPickerSheet` `variant="inline"`). Mapel di luar profil: **4 ketukan → 2**. Dijaga `src/__tests__/subjectPickerInline.test.tsx` (6 tes). **Belum diukur manusia di perangkat** — §4.3 `docs/README.md` masih menunggu centang
- [x] **L9 — Perkuat daftar topik & pencarian (permintaan pemilik 2026-10-04, commit `38eb8c9`).** (a) Panel "Pilih dari daftar bab" **terbuka sejak awal** (`useTopicSelection` → `showBrowse` mulai `true`; sebelumnya isi katalog baru bisa dibaca setelah 1 ketukan pada tombolnya); (b) **hasil pencarian dipindah tepat di bawah kolom isian** — sebelumnya berada di bawah chip "Topik sesi lalu" dan panel bab, sehingga di layar HP sering di luar viewport tepat setelah tutor mengetik; (c) daftar bab menyebut **batas 8 bab** + jalan keluar "cari lewat ketikan" (batas itu sudah ada di `browseTopicsForSubjects(..., maxGroups = 8)` tetapi tidak pernah diberitahukan). Dijaga `src/__tests__/topicBrowseDefault.test.tsx` (2 tes, probe keadaan awal hook). **Belum diukur manusia di perangkat**
- [x] **L10 — Undo hapus topik & hapus tindak lanjut (C-13 · C-05, 2026-10-04).** Hapus topik dan hapus tindak lanjut kini memunculkan toast `role="status"` (`ToastContainer` yang sudah ada — `src/components/Toast.tsx:22`) berisi tombol **"↩ Urungkan"** selama 8 dtk; item kembali **pada posisi asalnya**, bukan di ujung daftar, dan topik kembali bersama **bab katalognya** (aturan `withTopicRestored` / `withFollowUpRestored` di `src/screens/captureSession/undoDeletion.ts`, karena urutan topik ikut tersimpan ke sesi dan muncul di pesan WhatsApp ke orang tua). Konfirmasi C-05 di `requestDeleteFollowUp` **tetap** — undo ditambahkan, bukan menggantikan. Dijaga `src/__tests__/captureSessionUndoDeletion.test.ts` (8 tes). **Yang diuji hanya aturan pemulihan**; sambungan toast di `CaptureSession.tsx` diverifikasi `tsc` + `eslint`, belum dijalankan di perangkat. **Catatan sisa L10 (DITUTUP 2026-10-05):** teks `ConfirmSheet` hapus tindak lanjut tidak lagi berkata "tidak bisa dikembalikan" — sekarang menyebut tombol "↩ Urungkan" (commit `4f446ad`). Kalimat "tidak bisa dikembalikan" **tetap** benar dan tetap ada di jalur hapus **foto bukti** dan **tanda tangan** (keduanya memang harus diambil ulang)
- [ ] **L11 — Sisa fitur G3-01:** C-12 (⏸ menunggu G3-04) — **L4 sudah tuntas 2026-10-05**

> **Batas agen (2026-10-05).** **L1 · L2 · L5 · L6 tidak boleh dicentang agen**: keempatnya menuntut mata manusia di perangkat (keenam langkah di 390/430 px, kontrol <44 px, `[Catat]` benar-benar terisi, 12 kotak pemeriksaan). Agen hanya mencentang butir yang punya bukti dari perintah/ukurannya sendiri — L3 ditutup lewat keluaran vitest, L7 lewat tes baru, bukan lewat klaim.

## 10. Riwayat tugas

| Tanggal | Perubahan | Versi | Hasil |
|---|---|---|---|
| 2026-09-25 | Dibuat; wizard **dipertahankan** sesuai keputusan pemilik | v1.75.1 | `todo` |
| 2026-10-01 | Amandemen **Q2**: tombol `Simpan Sesi` aktif di langkah 5 & 6; `STEP_META` tetap 6; langkah 6 tetap menawarkan Bukti; +2 tes baru (L7) | v1.79.3 | `todo` |
| 2026-10-04 | **Prasyarat refactor (Q9/A12) selesai — L1–L7 belum.** Ekstraksi G3-01: `CaptureSession.tsx` **2.155 → 1.891** (≤1.900 tercapai **saat refactor**; badan Langkah 4 → `captureSession/ResponseStep.tsx`, modal pemilih mapel → `captureSession/SubjectPickerSheet.tsx`). Terbukti murni pemindahan: 159 vs 159 baris identik (langkah 4) dan 126 vs 126 baris dengan 10 beda yang semuanya penggantian identifier (modal). `STEP_META` tidak disentuh. Gate: tsc ✓ · eslint ✓ · **698/698 tes** ✓ · build ✓ · `e2e` 78 lulus/6 skip/0 gagal · `e2e:uiux` 56 lulus/0 gagal · md-links 0 rusak | v1.89.2 | commit `925e4ff` — **fitur L1–L7 putaran berikutnya** |
| 2026-10-04 | **L8 selesai (Q-2 opsi A): pemilih mapel jadi chip datar.** Modal `+ Tambah Mapel` dihapus dari langkah 2; `SubjectPickerSheet` mendapat `variant="inline"` (chip katalog + kolom mapel bebas + ringkasan "Dipilih" muncul begitu ada yang terpilih, karena tombol `Selesai` tidak ada lagi). Ketukan mapel di luar profil: **4 → 2**; taksonomi chip dan teks tidak berubah. +6 tes (`subjectPickerInline.test.tsx`) sebagai penjaga bentuk. Gate: tsc ✓ · eslint ✓ · **704/704 tes** (59 berkas) ✓ · build ✓ · `e2e` **76 lulus / 6 skip / 2 gagal** — dua merah di jalur laporan (`report-export`, `report-export-ratio`) **lulus 10/10 saat dijalankan sendirian** → flake beban, bukan regresi · `e2e:uiux` 56 lulus/0 gagal | v1.89.2 | commit `4fcbaf4` |
| 2026-10-04 | **L9 selesai (permintaan pemilik "perkuat list topik dan search-nya"): daftar bab terbuka sejak awal + hasil pencarian tepat di bawah kolom isian + batas 8 bab diberitahukan.** Berkas: `useTopicSelection.ts` (`showBrowse` mulai `true`), `CaptureSession.tsx` (blok hasil dipindah ke atas chip "Topik sesi lalu" dan panel bab; blok petunjuk 8 bab), +2 tes (`topicBrowseDefault.test.tsx`). Teks/taksonomi chip tidak berubah; `STEP_META` tidak disentuh. Gate: tsc ✓ · eslint ✓ · **706/706 tes** (60 berkas) ✓ · build ✓ · `e2e` **78 lulus / 6 skip / 0 gagal** · `e2e:uiux` 56 lulus/0 gagal · md-links 0 rusak. Sesudahnya `CaptureSession.tsx` = **1.901 baris** (10 baris di atas hasil refactor) | **v1.90.0** (rilis) | commit `38eb8c9`, dirilis oleh commit `1.90.0` |
| 2026-10-04 | **L10 selesai (C-13 · C-05): undo hapus topik & hapus tindak lanjut.** Berkas: `captureSession/undoDeletion.ts` (BARU — fungsi murni `withTopicRestored`/`withFollowUpRestored`), `useTopicSelection.ts` (`restoreTopic`), `CaptureSession.tsx` (tombol hapus topik + `onConfirm` hapus tindak lanjut memunculkan toast `role="status"` dengan tombol "↩ Urungkan", 8 dtk). Item kembali **pada posisi asal** dan topik kembali **bersama bab katalognya**; konfirmasi C-05 tetap. `STEP_META` tidak disentuh; jumlah langkah tetap 6. +8 tes (`captureSessionUndoDeletion.test.ts`). Gate: tsc ✓ · eslint ✓ · **716/716 tes** (61 berkas) ✓ · `build` ✓ · md-links 0 rusak; `e2e`/`e2e:uiux` **belum dijalankan** pada putaran ini (lihat `BLOKIR`) | — | commit `04d8c04` (amend dari `d76cc86` — hanya untuk membetulkan hash di baris tabel ini) — **putaran berikutnya: L11 (C-02 · C-03 · C-04 · C-08 · C-10 · L4 · L7)** |
| 2026-10-05 | **Pemberesan dokumen + L3 dibuktikan (putaran borongan, gate di akhir).** (a) **L3 ditutup dengan bukti perintah**, bukan klaim: `npm run test:sandbox -- captureDraft` → **17 lulus / 4 berkas**; tiga tes draf lama lulus tanpa diubah. (b) **Catatan sisa L10 ditutup:** teks `ConfirmSheet` hapus tindak lanjut tidak lagi berkata "tidak bisa dikembalikan" (commit `4f446ad`); kalimat itu tetap benar untuk hapus foto & tanda tangan. (c) **Batas agen ditulis tegas** di §9.2: L1 · L2 · L5 · L6 hanya boleh ditutup manusia di perangkat. Gate putaran ini: `tsc -b` ✓ · `eslint src` ✓ · `check:docs` ✓ | — | lanjut L11 |
| 2026-10-05 | **L7 selesai (Q2): sesi bisa disimpan dari langkah 5.** Ditemukan bahwa aturan Q2 belum ada di kode — `goNext()` hanya menyimpan di langkah 6. Berkas: `captureSession/constants.ts` (`SAVE_STEPS` + `canSaveFromStep`), `CaptureSession.tsx` (`saveFromStep5` + tombol `Simpan Sesi` di bilah aksi langkah 5), `src/__tests__/captureSessionHelpers.test.ts` (+2 tes), `src/__tests__/repos.test.ts` (+2 tes). `STEP_META` tidak disentuh; langkah tetap 6 dan Bukti tetap opsional. Gate: `tsc -b` ✓ · `eslint src` ✓ · `vitest captureSessionHelpers repos.test` **103 lulus** ✓ | — | lanjut L11 (C-02 · C-03 · C-04 · C-08 · C-10 · L4) |
| 2026-10-05 | **C-08 selesai: "Lewati" muncul di langkah 2 bila murid tanpa mapel.** Sebelumnya tombol itu hanya muncul di langkah ber-`optional: true`, sehingga murid yang profilnya belum berisi mapel tetap melihat langkah Materi tanpa jalan keluar yang terlihat — padahal label kolomnya sendiri sudah berbunyi "(opsional)". Aturannya sekarang bernama di `isStepSkippable()` (`captureSession/helpers.ts`, +1 tes) yang sekaligus menahan C-09 (langkah Bukti tetap tanpa "Lewati"); `STEP_META`/`constants.ts` **tidak disentuh** sesuai larangan dokumen. Gate: `tsc -b` ✓ · `eslint src` ✓ · `vitest captureSessionHelpers` **46 lulus** ✓ | — | lanjut L11 (C-02 · C-03 · C-04 · C-10 · L4) |
| 2026-10-05 | **C-04 selesai (bagian badge): langkah wajib yang belum lengkap ditandai `!` di stepper.** Berkas: `captureSession/helpers.ts` (`isStepComplete()` + `incompleteSteps()` — mencerminkan `validateCurrentStep()` supaya badge tidak pernah berbeda pendapat dengan pesan galat; arah "belum diisi" saja, bentrok jadwal tidak ikut), `CaptureSession.tsx` (badge + akhiran "belum lengkap" pada `aria-label` tombol langkah), +1 tes di `captureSessionHelpers`. Hanya langkah yang **sudah dijalani** (`<= currentStep`) yang ditandai supaya wizard yang baru dibuka tidak penuh tanda. **Catatan bagian "ConfirmSheet saat keluar":** keluar dari aplikasi/tab sudah dijaga `beforeunload` di `useCaptureDraft.ts:250-260` (status `unsaved`/`loading`/`saving`) dan isian tidak hilang karena draf tersimpan; berpindah lewat nav bawah **tidak** dijaga, dan itu **sengaja dibiarkan** — drafnya tetap ada saat kembali (layar keputusan draf C-06), sedangkan memblokir nav menyentuh `BottomNav`/`App` di luar lingkup G3-01. Kalau pemilik tetap ingin konfirmasi di nav bawah, itu keputusan baru (Q). Gate: `tsc -b` ✓ · `eslint src` ✓ · `vitest captureSessionHelpers` **47 lulus** ✓ | — | lanjut L11 (C-02 · C-10 · L4) |
| 2026-10-05 | **C-02 selesai: pindah langkah diumumkan & pandangan kembali ke atas.** Berkas: `CaptureSession.tsx` — (a) penghitung "Langkah X dari 6" di kepala halaman kini `aria-live="polite" aria-atomic="true"` (sebelumnya pindah langkah tidak mengumumkan apa pun, karena halaman tidak dimuat ulang); (b) efek pada `currentStep` menggulir ke atas (`window.scrollTo(0, 0)`) lalu memfokuskan **judul langkah** (`<h2 tabIndex={-1}>`, `outline-none` mengikuti pola blok pesan) — dulu langkah berikutnya terbuka di posisi gulir lama, padahal "Lanjut →" selalu ditekan dari bawah. Langkah pertama tidak merebut fokus (`stepEnteredRef`). **Yang belum:** tidak ada tes otomatis untuk fokus/gulir — toolchain ini tanpa DOM, jadi perilakunya hanya dijaga `tsc`/`eslint` + pembacaan kode; calon penjaga = spec Playwright (`expect(await page.evaluate(() => document.activeElement?.textContent)).toBe("Catatan")` sesudah satu klik "Lanjut →"), **belum ditulis** karena menjalankannya butuh eskalasi browser. Gate: `tsc -b` ✓ · `eslint src` ✓ | — | lanjut L11 (C-10 · L4) |
| 2026-10-05 | **C-10 selesai: donat skor diganti `ProgressBar` bersama.** Berkas: `captureSession/ResponseStep.tsx` — donat SVG buatan sendiri (aritmetika `(skor/10) * 100 * 0,879` = campuran persen & keliling lingkaran, tanpa nama untuk pembaca layar) diganti `ProgressBar` bertoken dengan ambang warna yang disamakan dengan kata band `scoreLabel()` (9+ hijau · 7–8 biru · 5–6 kuning · <5 merah; `tone` dasar merah penting agar skor <3 tidak jatuh ke biru bawaan). Angka `X/10` dan rona kartu tetap dari `scoreLabel()` (satu sumber, dijaga `engagementContrast.test.ts`). **Pilihan komponen diukur dulu, bukan selera:** `RatingIndicator` (dipakai `EngagementSummary`) mewarnai teks `N/10`-nya dengan hex tetap (`#16a34a` hijau ≈3,0:1 · `#d97706` kuning ≈3,35:1 di atas putih) sehingga bisa menurunkan kontras di kartu berona; `ProgressBar` memakai token `--ink-*` yang terukur **5,38–6,41:1** di keempat rona kartu skor (pasangan palet lama paling ketat 4,51:1). Skrip pengukur: `.design-audit/c10-contrast-check.cjs`. Gate: `tsc -b` ✓ · `eslint src` ✓ · **suite penuh 728 lulus / 62 berkas** ✓ · `build` ✓ (`dist/sw.js` tergenerate) | — | lanjut L11 (L4 `ManageSessionSheet`) |
| 2026-10-05 | **Keputusan pemilik (Q-A/Q-B/Q-C) diterapkan.** **Q-A = B:** 10 heks mentah di bilah aksi & kepala sheet laporan jadi token — kontras teks putih **naik**: langkah 6 `3,30→4,95:1`, keadaan menyimpan `1,80→14,67:1`, kepala sheet `3,77/2,54→4,95/7,13:1` (dua stop sebelumnya gagal ambang), tombol "Selesai" tetap `14,67:1`. **Q-B = b3:** satu baris "Isian sesi ini tersimpan sebagai draf…" saat draf tersimpan; nav bawah **tidak** diblokir (b2 ditolak). **Q-C = c2:** grup radio dapat pola keyboard penuh — Tab masuk sekali, panah ←/→/↑/↓ memindahkan pilihan (membungkus), Home/End ke ujung; aturan murni `nextRadioIndex()` + **5 tes** baru. Gate: `tsc` ✓ · `eslint` ✓ · suite penuh ✓ | — | lanjut L4 `ManageSheet` |
| 2026-10-05 | **C-03 selesai: satu penulis `responseTag` + kedua grup jadi `role="radiogroup"`.** Berkas: `captureSession/ResponseStep.tsx` (fungsi `chooseResponse()` jadi **satu-satunya** penulis tag; 13 pilihan memakainya; tombol "Kosongkan" dikeluarkan dari `radiogroup` karena ia bukan pilihan, dan tombol cepat kini **menyala** saat pilihannya aktif sehingga hubungannya dengan daftar penuh terlihat) + berkas tes BARU `src/__tests__/responseStepRadio.test.tsx` (6 tes, pola `renderToStaticMarkup` seperti `subjectPickerInline`). Yang belum bisa dibuktikan tanpa DOM: perilaku fokus keyboard. **Sisa yang dicatat:** panah ←/→ belum dipetakan di dalam `radiogroup` (Tab masih melewati tiap pilihan, jadi semuanya terjangkau) — calon langkah lanjutan, bukan bagian dari C-03. Gate: `tsc -b` ✓ · `eslint src` ✓ · `vitest responseStepRadio` **6 lulus** ✓ | — | lanjut L11 (C-02 · C-04 · C-10 · L4) |
| 2026-10-05 | **L4 bagian 1: tabel aksi "Kelola sesi" jadi fungsi murni + 18 tes.** Berkas: `src/screens/home/manageSession.ts` (BARU — `SesiKontek`, `SesiAksi`, `AksiSesi`, `aksiUtama()` · `aksiLainnya()` · `aksiSesi()` · `aksiTerbuka()`) + `src/__tests__/manageSessionActions.test.ts` (BARU, 18 tes). **Kenapa aturan dulu, komponen kemudian:** risiko L4 bukan tampilannya, melainkan **kemampuan yang hilang senyap** saat dua modal dilebur (§2.2 `ATURAN-AI`); tabel konteks bisa dikunci tanpa DOM (toolchain ini belum punya React Testing Library), dan tesnya mencegah penggantian modal mengurangi aksi. **Dua temuan nyata dari tes, keduanya diperbaiki di sumber, bukan dengan melunakkan tes:** (a) pilihan cakupan seri semula hanya digerbangi di `aksiLainnya()`, sehingga `Simpan perubahan`/`Batal les` akan menawarkan pilihan seri untuk sesi tunggal — gerbang `berseri` kini dipakai **kedua** daftar; (b) `berseri` dibuat opsional berdefault `false` supaya pemanggil yang lupa mengisinya menyembunyikan pilihan cakupan (salah yang **aman** — `cancelSeriesSessions`/`updateSeriesSessions` diam-diam jatuh ke mode "this" kalau mode tidak dipilih). **Temuan dokumen:** nama `EditSessionModal`/`ResolveMissedSessionModal` masih muncul di **tiga komentar** (`captureSession/helpers.ts` · `home/AddScheduleModal.tsx`) — karena perintah penutup L4 menghitung kemunculan nama itu dan menuntut **0**, komentarnya sudah diarahkan ke `ManageSessionSheet` pada putaran ini. **Yang BELUM:** komponen `ManageSessionSheet.tsx`, penggantian impor di `Home.tsx`, dan penghapusan dua modal lama (bagian 2) — jadi L4 **belum** dicentang. Gate: `tsc -b` ✓ · `eslint src --max-warnings 0` ✓ · **suite penuh 751 lulus / 63 berkas** ✓ · smoke suite T2 **183 lulus / 8 berkas** ✓ · `build` ✓ (`dist/sw.js`) · `check:docs` ✓ | — | bagian 2: `ManageSessionSheet.tsx` + `Home.tsx` + hapus 2 modal lama |
| 2026-10-05 | **L4 bagian 2 (tuntas): dua modal lama dihapus, satu `ManageSessionSheet` — 19 tes baru.** Berkas: `src/screens/home/ManageSessionSheet.tsx` (BARU — sheet dari bawah lewat primitif `components/ui/Sheet`, aksi utama sebagai tombol lebar penuh, sisanya di `⋯`, kolom isian menyesuaikan aksi, aksi merusak lewat `ConfirmSheet`) · `src/screens/home/manageSessionForm.ts` (BARU — nilai awal kolom isian, tanggal pengganti, pemilih murid, cakupan seri efektif, konfirmasi, validasi tanggal) · `src/__tests__/manageSessionSheet.test.tsx` (BARU, 19 tes `renderToStaticMarkup` + `MemoryRouter`) · `src/screens/home/Home.tsx` (dua state target jadi satu `manageTarget {session, kontek}`) · **`EditSessionModal.tsx` + `ResolveMissedSessionModal.tsx` DIHAPUS** (`git rm`). **Cakupan enam aksi:** `Catat` (navigasi `/capture?scheduleId=`) · `Batal les` · `Tidak hadir` (+`noShowBillable`) · `Simpan perubahan` · `Jadwalkan ulang` (di `⋯`) · `Hapus` (di `⋯`). **Keputusan yang diambil sendiri (bukan Q — tidak mengubah perilaku pengguna):** setiap aksi merusak wajib lewat `ConfirmSheet` lebih dulu (dua modal lama sudah begitu untuk penghapusan di jalur lain; L4 tidak boleh melonggarkannya) · `students` tetap diterima sheet karena jalur `Simpan perubahan` punya pemilih murid, sedangkan jalur `terlewat` tidak memindahkan murid — memindahkan sesi terlewat ke murid lain akan memindahkan tagihan yang sudah tertaut. **Yang BELUM dibuktikan:** klik nyata + sambungan DB + tampilan di perangkat (butir §5 21–22 dan `npm run e2e`); `e2e:uiux` tidak dijalankan karena guard-nya membuka **7 rute** dan sheet ini tidak punya rute (ia hanya hidup di Beranda sesudah baris sesi diketuk) — jadi tidak ada metrik yang bisa berubah. Gate: `tsc -b` ✓ · `eslint src --max-warnings 0` ✓ · **suite penuh 770 lulus / 64 berkas** ✓ · smoke suite T2 **183 lulus / 8 berkas** ✓ · `build` ✓ (`dist/sw.js`) · `check:docs` ✓ (`EditSessionModal\|ResolveMissedSessionModal` = **0**) | — | G3-01 sisa: C-12 (menunggu G3-04) · rilis gelombang (#14, Q-D = d2) |
| 2026-10-05 | **Kelola sesi: nominal manual tidak lagi terhapus + ganti murid dikonfirmasi (permintaan pemilik, dari penyelidikan alur Beranda).** (a) `patchUbahJadwal()` di `home/manageSessionForm.ts` mengirim `durationHours` **hanya bila benar-benar berubah** — sebelumnya sheet selalu mengirimnya, sedangkan `updateSession()` melepas `costOverride` dan menghitung ulang `cost` setiap kali `durationHours` **ADA** di patch (syaratnya `!== undefined`, bukan "berubah"), sehingga mengubah jam atau murid saja menghapus nominal manual tutor. Perilaku itu **warisan modal lama** (`EditSessionModal`, dihapus di `89b5041`), bukan regresi L4. (b) Ganti murid kini punya **peringatan** di dalam sheet (`peringatanGantiMurid`, tanpa angka rupiah — Beranda dilarang menampilkan uang, K3/B1) **dan konfirmasi** (`konfirmasiUntuk("simpan-perubahan", …)` menyala hanya bila muridnya berganti); `jalankanKonfirmasi` memakai ulang jalur simpan yang sama, tidak menggandakan logika. +12 tes (11 di `manageSessionSheet.test.tsx` · 1 tes repo `sessionPricing.test.ts` yang membuktikan `costOverride` bertahan saat durasi tidak ikut dikirim). Gate: `tsc -b` ✓ · `eslint src --max-warnings 0` ✓ · suite penuh **832 lulus / 66 berkas** ✓ · smoke 183 ✓ · `build` ✓ · **`e2e` 78 lulus / 6 skip / 0 gagal** · **`e2e:uiux` 56 lulus / 0 gagal** (efek samping screenshot dibereskan: 59 PNG ter-track dipulihkan, 13 baru dihapus, dihitung dengan `git status --porcelain -- e2e/screenshots \| Measure-Object`) · LF 5/5 berkas ✓. **Temuan yang BELUM diperbaiki:** berkas ini memuat **13 baris teks ter-encode ganda** — termasuk yang terlihat pengguna (tombol `⋯ Aksi lain (N)` §5 butir 21, subjudul sheet, 4 pesan toast); nol di berkas lain (pindai seluruh `src`), belum dibersihkan karena satu langkah = satu perubahan | — | dilaporkan, menunggu keputusan; G3-01 sisa: C-12 |
| 2026-10-05 | **Teks ter-encode ganda di `ManageSessionSheet.tsx` diperbaiki (temuan baris di atas).** 13 baris / **17 penggantian**: em dash ×9 · titik tengah ×4 · tanda centang ×2 · `⋯` ×2 — 6 di antaranya terlihat pengguna (tombol `⋯ Aksi lain (N)`, subjudul sheet, 4 pesan toast). Alatnya `.design-audit/perbaiki-mojibake.cjs` yang **menghitung** bentuk rusak dari tabel CP1252 (tidak mengetiknya); jebakan yang memakan satu langkah: `new TextDecoder("windows-1252")` di Node ini memetakan 0x80–0x9F seperti latin1 (terukur `e2 80 94` → `00E2 0080 0094`) sehingga hanya `·` yang cocok. Kutipan bentuk rusak di dokumen juga dibuang supaya pemindai tidak melaporkan dokumen selamanya. Pindai ulang `src · e2e · e2e-uiux · docs · scripts` → `berkas diperiksa: 348 \| berkas bermasalah: 0`. Gate: `tsc -b` ✓ · `eslint src --max-warnings 0` ✓ · suite penuh **832 lulus / 66 berkas** ✓ · smoke 183 ✓ · `build` ✓ · `check:docs` ✓ · LF 2/2 berkas ✓. **Penjaga otomatis belum ada:** berkas tes di `src/**` dilarang mengimpor `node:fs` oleh `tsconfig.app.json` (`types` tanpa `@types/node`) — penjaga yang saya coba di `manageSessionSheet.test.tsx` **dicabut kembali** karena `tsc -b` menolaknya; pilihannya masuk `PEKERJAAN` §4 #19 | — | dilaporkan |
| 2026-10-05 | **Penjaga otomatis teks ter-encode ganda (5 tes) — residu perbaikan teks di berkas ini.** Percobaan pertama gagal: berkas tes di `src/**` dilarang mengimpor `node:fs` karena `tsconfig.app.json` memasang `types` tanpa `@types/node`; penjaganya **dicabut**, bukan config-nya yang diubah. Solusinya Vite: `import.meta.glob("../**/*.{ts,tsx}", { query: "?raw", eager: true })` — tipenya sudah ada di `vite/client`, jadi seluruh berkas sumber bisa dibaca sebagai teks tanpa berkas baru dan tanpa ubah config. Empat karakter dijaga (em dash · titik tengah · tanda centang · `⋯`); bentuk rusaknya **dihitung** dari tabel CP1252 (bukan diketik) karena `TextDecoder("windows-1252")` di Node ini memetakan 0x80–0x9F seperti latin1. **Kontrol negatif diuji:** menyisipkan satu em dash rusak → tes merah dan menyebut berkasnya, lalu berkas dikembalikan (diff kosong). Alat manual tetap ada: `.design-audit/cek-mojibake.cjs` → `348 berkas \| 0 temuan`. Suite **832 → 837** lulus / 66 berkas (`manageSessionSheet.test.tsx` 30 → 35 tes). | — | `selesai` |
| 2026-10-05 | **Panel "Kelola sesi" bisa langsung disunting + pemilih murid penuh + keterangan Batalkan/Hapus (laporan pemilik di perangkat).** (a) Sesi **terjadwal** membuka sheet dengan `Simpan perubahan` sudah terpilih → kolom `Murid`/`Tanggal`/`Jam mulai`/`Durasi` langsung terlihat; sebelumnya `aksiId` mulai `null` sehingga tutor melihat tombol tanpa satu pun kolom ("ada button simpan perubahan, tapi tidak ada isian untuk di ubah"). (b) `pilihanMurid()` berhenti menyaring: `Home.tsx` dulu mengirim `listStudents(true)` (aktif saja) sehingga maksud "murid sesi ini selalu ada" tidak pernah tercapai dan pemilihnya bisa kosong; sekarang semua murid ditampilkan dan yang nonaktif ditandai "(nonaktif)". `Home.tsx` juga memberi `key={session.id}` supaya state sheet tidak dipakai ulang antar-sesi. (c) `keterangan` baru di `manageSession.ts` menjawab beda `Batalkan sesi` (ditandai dibatalkan, tetap di riwayat, tidak masuk tagihan) vs `Hapus` (dibuang permanen, ditolak bila sudah masuk tagihan paket) — **di tempat memilih**, bukan hanya di dialog konfirmasi. Label operasi yang sama diseragamkan (konteks terlewat dulu "Batal les"). Gate: `tsc -b` ✓ · `eslint src --max-warnings 0` ✓ · suite penuh **843 lulus / 66 berkas** ✓ · smoke 183 ✓ · `build` ✓ · `check:docs` ✓ · `release-check` (1.92.0 = `CHANGELOG[0]`) ✓ · `e2e` dan `e2e:uiux` dijalankan atas revisi ini (efek samping screenshot dibersihkan: 59 PNG dipulihkan, 13 dihapus, dihitung dengan `git status --porcelain -- e2e/screenshots \| Measure-Object`) · LF 6/6 berkas ✓ | v1.92.0 | `selesai` |
| 2026-10-05 | **Tarif ikut pindah saat sesi dipindah ke murid lain (v1.93.0, keputusan pemilik hari itu).** `updateSession` menulis ulang `rateSnapshot` + `cost` dari tarif **pemilik baru** ketika `studentId` berubah — penting karena `markSessionDone` menghitung ulang `cost` dari `rateSnapshot`, jadi tanpa ini sesi yang sudah pindah tetap ditutup dengan tarif murid lama. **Nominal manual (`costOverride`) tidak dihitung ulang**: jumlahnya pernyataan eksplisit tutor; bila pemilik baru ber-paket per pertemuan, tarifnya flat (bukan tarif × durasi). Jalur tulis **SERI** di `updateSeriesSessions` mendapat aturan yang sama — ia tidak lewat `updateSession`, jadi tanpa itu mode "Ini & berikutnya"/"Semua seri" tetap membawa tarif lama. Teks `peringatanGantiMurid` + `konfirmasiUntuk` kini bercabang: "nominal dihitung ulang memakai tarif X" atau "nominal manual sesi ini tidak diubah". Bukti: `sessionPricing.test.ts` **14 → 18 tes** (recompute · pemilik baru per-pertemuan memakai tarif flat · nominal manual dipertahankan + snapshot mengikuti · mode seri) · `manageSessionSheet.test.tsx` **37 → 39**. Gate: `tsc -b` ✓ · `eslint src --max-warnings 0` ✓ · suite penuh **849 lulus / 66 berkas** ✓ · smoke 183 ✓ · `build` ✓ · `check:docs` ✓ · `release-check` (1.93.0 = `CHANGELOG[0]`) ✓ · `e2e` dan `e2e:uiux` atas revisi ini (keluaran disaring `Select-String "passed\|failed"`). **Temuan belum diputuskan:** `markSessionDone` mengabaikan `costOverride` (lihat `SERAH-TERIMA` §4.5 butir 15) | v1.93.0 | `selesai` |
