# TASK-06 — Perkuat Catat Sesi (wizard **dipertahankan**, bukan diringkas)

> **STATUS:** `todo`
> **PEMILIK:** agen AI
> **DIBUAT:** 2026-09-25 · **BASELINE:** v1.75.1 (561 tes / 50 berkas)
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
- [ ] Aksi sesi terlewat: `Catat` · `Batal les` · `Tidak hadir`; `Jadwalkan ulang` pindah ke `⋯`
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
| `terlewat` | **`Catat`** · **`Batal les`** · **`Tidak hadir`** | `Jadwalkan ulang`, `Hapus` |
| `terjadwal` | `Simpan perubahan` | `Batalkan sesi`, `Hapus` |

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
- [ ] **L3 — Draf terlihat.** 3 tes draf lama lulus: ya/tidak
- [ ] **L4 — Sheet Kelola sesi.** Enam aksi bisa dijalankan: ___ dari 6
- [ ] **L5 — `[Catat]` terisi.** Langkah 1 terisi dari `scheduleId`: ya/tidak
- [ ] **L6 — Verifikasi manual + E2E.** 12 kotak `docs/README.md` §4.3: ___ / 12 · Waktu alur cepat: ___ detik
- [ ] **L7 — Simpan dari langkah 5 (Q2).** 2 tes baru: simpan tanpa Bukti ya/tidak · Bukti tersimpan bila ada ya/tidak
- [x] **L8 — Efisiensi pemilih mapel (Q-2 opsi A, 2026-10-04, commit `4fcbaf4`).** Modal `+ Tambah Mapel` dihapus; chip mapel dieja datar di langkah 2 (`SubjectPickerSheet` `variant="inline"`). Mapel di luar profil: **4 ketukan → 2**. Dijaga `src/__tests__/subjectPickerInline.test.tsx` (6 tes). **Belum diukur manusia di perangkat** — §4.3 `docs/README.md` masih menunggu centang
- [x] **L9 — Perkuat daftar topik & pencarian (permintaan pemilik 2026-10-04, commit `38eb8c9`).** (a) Panel "Pilih dari daftar bab" **terbuka sejak awal** (`useTopicSelection` → `showBrowse` mulai `true`; sebelumnya isi katalog baru bisa dibaca setelah 1 ketukan pada tombolnya); (b) **hasil pencarian dipindah tepat di bawah kolom isian** — sebelumnya berada di bawah chip "Topik sesi lalu" dan panel bab, sehingga di layar HP sering di luar viewport tepat setelah tutor mengetik; (c) daftar bab menyebut **batas 8 bab** + jalan keluar "cari lewat ketikan" (batas itu sudah ada di `browseTopicsForSubjects(..., maxGroups = 8)` tetapi tidak pernah diberitahukan). Dijaga `src/__tests__/topicBrowseDefault.test.tsx` (2 tes, probe keadaan awal hook). **Belum diukur manusia di perangkat**
- [x] **L10 — Undo hapus topik & hapus tindak lanjut (C-13 · C-05, 2026-10-04).** Hapus topik dan hapus tindak lanjut kini memunculkan toast `role="status"` (`ToastContainer` yang sudah ada — `src/components/Toast.tsx:22`) berisi tombol **"↩ Urungkan"** selama 8 dtk; item kembali **pada posisi asalnya**, bukan di ujung daftar, dan topik kembali bersama **bab katalognya** (aturan `withTopicRestored` / `withFollowUpRestored` di `src/screens/captureSession/undoDeletion.ts`, karena urutan topik ikut tersimpan ke sesi dan muncul di pesan WhatsApp ke orang tua). Konfirmasi C-05 di `requestDeleteFollowUp` **tetap** — undo ditambahkan, bukan menggantikan. Dijaga `src/__tests__/captureSessionUndoDeletion.test.ts` (8 tes). **Yang diuji hanya aturan pemulihan**; sambungan toast di `CaptureSession.tsx` diverifikasi `tsc` + `eslint`, belum dijalankan di perangkat. **Catatan sisa:** teks `ConfirmSheet` hapus tindak lanjut masih berbunyi "tidak bisa dikembalikan" — sudah tidak akurat sejak L10, sengaja **tidak** diubah di putaran ini (satu langkah satu perubahan); calon langkah berikutnya
- [ ] **L11 — Sisa fitur G3-01:** C-02 (`aria-live` + scroll/fokus saat pindah langkah) · C-03 (satu penulis `responseTag`) · C-04 (badge `!` stepper) · C-08 ("Lewati" di langkah 2) · C-10 (donat skor) · C-12 (⏸ menunggu G3-04) · L4 `ManageSessionSheet` · L7 (+2 tes simpan dari langkah 5)

## 10. Riwayat tugas

| Tanggal | Perubahan | Versi | Hasil |
|---|---|---|---|
| 2026-09-25 | Dibuat; wizard **dipertahankan** sesuai keputusan pemilik | v1.75.1 | `todo` |
| 2026-10-01 | Amandemen **Q2**: tombol `Simpan Sesi` aktif di langkah 5 & 6; `STEP_META` tetap 6; langkah 6 tetap menawarkan Bukti; +2 tes baru (L7) | v1.79.3 | `todo` |
| 2026-10-04 | **Prasyarat refactor (Q9/A12) selesai — L1–L7 belum.** Ekstraksi G3-01: `CaptureSession.tsx` **2.155 → 1.891** (≤1.900 tercapai **saat refactor**; badan Langkah 4 → `captureSession/ResponseStep.tsx`, modal pemilih mapel → `captureSession/SubjectPickerSheet.tsx`). Terbukti murni pemindahan: 159 vs 159 baris identik (langkah 4) dan 126 vs 126 baris dengan 10 beda yang semuanya penggantian identifier (modal). `STEP_META` tidak disentuh. Gate: tsc ✓ · eslint ✓ · **698/698 tes** ✓ · build ✓ · `e2e` 78 lulus/6 skip/0 gagal · `e2e:uiux` 56 lulus/0 gagal · md-links 0 rusak | v1.89.2 | commit `925e4ff` — **fitur L1–L7 putaran berikutnya** |
| 2026-10-04 | **L8 selesai (Q-2 opsi A): pemilih mapel jadi chip datar.** Modal `+ Tambah Mapel` dihapus dari langkah 2; `SubjectPickerSheet` mendapat `variant="inline"` (chip katalog + kolom mapel bebas + ringkasan "Dipilih" muncul begitu ada yang terpilih, karena tombol `Selesai` tidak ada lagi). Ketukan mapel di luar profil: **4 → 2**; taksonomi chip dan teks tidak berubah. +6 tes (`subjectPickerInline.test.tsx`) sebagai penjaga bentuk. Gate: tsc ✓ · eslint ✓ · **704/704 tes** (59 berkas) ✓ · build ✓ · `e2e` **76 lulus / 6 skip / 2 gagal** — dua merah di jalur laporan (`report-export`, `report-export-ratio`) **lulus 10/10 saat dijalankan sendirian** → flake beban, bukan regresi · `e2e:uiux` 56 lulus/0 gagal | v1.89.2 | commit `4fcbaf4` |
| 2026-10-04 | **L9 selesai (permintaan pemilik "perkuat list topik dan search-nya"): daftar bab terbuka sejak awal + hasil pencarian tepat di bawah kolom isian + batas 8 bab diberitahukan.** Berkas: `useTopicSelection.ts` (`showBrowse` mulai `true`), `CaptureSession.tsx` (blok hasil dipindah ke atas chip "Topik sesi lalu" dan panel bab; blok petunjuk 8 bab), +2 tes (`topicBrowseDefault.test.tsx`). Teks/taksonomi chip tidak berubah; `STEP_META` tidak disentuh. Gate: tsc ✓ · eslint ✓ · **706/706 tes** (60 berkas) ✓ · build ✓ · `e2e` **78 lulus / 6 skip / 0 gagal** · `e2e:uiux` 56 lulus/0 gagal · md-links 0 rusak. Sesudahnya `CaptureSession.tsx` = **1.901 baris** (10 baris di atas hasil refactor) | **v1.90.0** (rilis) | commit `38eb8c9`, dirilis oleh commit `1.90.0` |
| 2026-10-04 | **L10 selesai (C-13 · C-05): undo hapus topik & hapus tindak lanjut.** Berkas: `captureSession/undoDeletion.ts` (BARU — fungsi murni `withTopicRestored`/`withFollowUpRestored`), `useTopicSelection.ts` (`restoreTopic`), `CaptureSession.tsx` (tombol hapus topik + `onConfirm` hapus tindak lanjut memunculkan toast `role="status"` dengan tombol "↩ Urungkan", 8 dtk). Item kembali **pada posisi asal** dan topik kembali **bersama bab katalognya**; konfirmasi C-05 tetap. `STEP_META` tidak disentuh; jumlah langkah tetap 6. +8 tes (`captureSessionUndoDeletion.test.ts`). Gate: tsc ✓ · eslint ✓ · **716/716 tes** (61 berkas) ✓ · `build` ✓ · md-links 0 rusak; `e2e`/`e2e:uiux` **belum dijalankan** pada putaran ini (lihat `BLOKIR`) | — | commit `04d8c04` (amend dari `d76cc86` — hanya untuk membetulkan hash di baris tabel ini) — **putaran berikutnya: L11 (C-02 · C-03 · C-04 · C-08 · C-10 · L4 · L7)** |
