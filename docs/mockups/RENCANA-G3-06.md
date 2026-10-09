# RENCANA-G3-06 — peta teknis pekerjaan layar Murid

> **Sekilas.** Jenis: dokumen persiapan kerja (belum dikerjakan). Status: usulan, menunggu keputusan pemilik.
> Untuk siapa: pemilik yang memutuskan, dan sesi berikutnya yang mengeksekusi.
> **Bukan daftar pekerjaan.** Daftarnya tetap `docs/kerja/PEKERJAAN.md` §3 G3-06. Kalau berkas ini
> bertentangan dengan `PEKERJAAN.md` atau `ATURAN-AI.md`, dua berkas itu yang menang.
> Dibuat 2026-10-09. Seluruh angka di bawah **hasil ukur langsung pada berkas**, bukan kutipan dokumen.

---

## 1. Keadaan terukur saat rencana ini dibuat

| Hal | Nilai | Cara mengukurnya |
|---|---|---|
| Versi | 1.96.0 | `node -p "require('./package.json').version"` |
| Branch / HEAD | `main`, pohon bersih, sejajar `origin/main` (`be08b79`) | `git status -sb` |
| `StudentDetail.tsx` | 1.097 baris (target ≤800) | `npm run measure loc` |
| `Students.tsx` | 604 baris | idem |
| `StudentForm.tsx` | 535 baris | idem |

Berkas pendukung yang **sudah ada** di `src/screens/studentDetail/` — 9 berkas:

`EngagementSummary.tsx` (11.830 B) · `SessionDetailModal.tsx` (25.636 B) · `RiwayatSesi.tsx` (12.371 B) ·
`IaEeTracker.tsx` (268 baris) · `UpcomingSchedule.tsx` · `RiwayatPembayaran.tsx` · `StudyNoteCard.tsx` ·
`EvidenceCard.tsx` · `NilaiRapor.tsx` (**37 baris — hanya pembungkus tipis** yang meneruskan props ke
`EngagementSummary`; tidak ada isi sendiri).

---

## 2. Peta `StudentDetail.tsx` sekarang (hasil ukur, baris demi baris)

| Rentang baris | Isi | Nasib yang diusulkan |
|---|---|---|
| 1–48 | impor + `const DURATIONS` | sebagian pindah ke tiap berkas tab |
| 50–59 | komentar JSDoc | **basi** — menulis "5 tab: Sesi, Rapor, Penagihan, IA/EE, AI Insights", padahal tabnya sudah Ringkasan/Sesi & Jadwal/Progres/IA-EE-PP. Perbarui, jangan dibiarkan. |
| 60–120 | state utama, `useLiveQuery` (murid, sesi, jadwal, setelan, catatan, proyek, tagihan, pembayaran), `flash`/`msg` | tetap di induk (dipakai lintas tab) |
| 122–163 | `handleDeleteSession` + `handleSaveRate` | `handleSaveRate` → RingkasTab; sisanya tetap |
| 165–284 | state modal edit sesi (±30 `useState`) + `openEditNote`, `handleEditPhoto`, `handleSaveNote` + dua `useEffect` blob URL | **pindah ke komponen modal tersendiri** |
| 285–302 | `photoUrls` / `sigUrls` + `useEffect` pembuat blob URL | tetap di induk (dipakai daftar sesi) |
| 304–387 | `useMemo` turunan: `totalSessions`, `totalHours`, `engSessions`, `scoredEngSessions`, `recentEng`, `engCoverage`, `avgEngScore`, `engTrend`, `responseStats`, `subjectEngStats` | **pindah ke modul murni** `studentDetail/derive.ts` |
| 388–428 | `openEditSched`, `handleSaveEdit`, `handleCancel`, `historyMonthOptions`, `historySessions` | `openEditSched`/`handleSaveEdit`/`handleCancel` → SesiTab; sisanya modul turunan |
| 430–434 | gerbang `!student` + `safeHistoryPage`/`paginatedHistorySessions` | tetap di induk |
| 439–495 | jejak navigasi + flash + kepala + 3 tombol aksi cepat | tetap di induk, **diperluas** oleh fitur #11 |
| 498–509 | `<Tabs>` empat tab | label diperbarui (Fase A) |
| 514–674 | **tabpanel Ringkasan** (Info Murid, tarif, siklus tagihan, total sesi/jam, StudyNoteCard, RiwayatPembayaran) | → `RingkasTab.tsx` |
| 676–716 | **tabpanel Sesi** (EvidenceCard, RiwayatSesi, UpcomingSchedule) | → `SesiTab.tsx` |
| 718–724 | **tabpanel IA/EE/PP** (IaEeTracker) | → `ProyekTab.tsx` |
| 726–740 | **tabpanel Progres** (NilaiRapor) | → `ProgresTab.tsx` |
| 744–970 | **modal Edit Catatan Sesi** (227 baris) | → `SessionNoteEditModal.tsx` |
| 971–1049 | modal Edit Jadwal (79 baris) | → `ScheduleEditModal.tsx` |
| 1050–1096 | `SessionDetailModal` + panel bantuan tagihan + modal PIN hapus | tetap |

Jumlah baris JSX modal ±306 baris; dua tabpanel terbesar ±160 dan ±40 baris. Di situ letak turun ke ≤800.

---

## 3. Pembagian berkas yang diusulkan (Fase A)

```
src/screens/studentDetail/
  derive.ts                 <- fungsi murni + useMemo turunan (bisa diuji tanpa DOM)
  DetailHeader.tsx          <- jejak navigasi, flash, kepala, tombol cepat (fitur #11)
  RingkasTab.tsx            <- Info Murid + tarif + siklus tagihan + total + catatan + riwayat bayar
  SesiTab.tsx               <- bukti keaktifan + riwayat sesi + jadwal mendatang + state edit jadwal
  ProgresTab.tsx            <- tabel prediksi vs nilai akhir + isian rapor + ringkasan keterlibatan
  ProyekTab.tsx             <- pembungkus pelacak proyek (isi mengikuti keputusan K1)
  SessionNoteEditModal.tsx  <- modal edit catatan sesi (227 baris)
  ScheduleEditModal.tsx     <- modal edit jadwal (79 baris)
```

Induknya tinggal: state bersama, `useLiveQuery`, gerbang `!student`, `<Tabs>`, panel `hidden`, dan
pemanggilan modal. Perkiraan induk ±330–380 baris — di bawah target dengan sisa ruang untuk fitur baru.

---

## 4. Utang teknis yang ditemukan saat membaca (belum tercatat di daftar pekerjaan)

Semua di bawah ini **nyata ada di kode**, bukan dugaan. Karena `ATURAN-AI.md` §1 butir 7 mewajibkan
pekerjaan tak tercatat langsung masuk daftar, butir-butir ini akan ditambahkan ke `PEKERJAAN.md` §4
pada putaran eksekusi — kecuali yang memang sudah tercakup fitur G3-06.

1. **Dua `confirm()` bawaan peramban di `IaEeTracker.tsx:208` dan `:251`** — melanggar keputusan
   "Tetap" `ATURAN-AI.md` §4.1 ("semua dialog konfirmasi memakai komponen internal"). Fitur #7
   menyentuh berkas ini, jadi diperbaiki di putaran yang sama.
2. **`EvidenceCard` tidak pernah muncul untuk tab Progres.** Ia hidup di tab **Sesi** (`:680-685`),
   padahal butir #8 dan #9 menaruh "kartu bukti" dan "ringkasan keterlibatan" di wilayah Progres.
   Perlu keputusan: pindahkan, atau tampilkan di kedua tempat. **Ini menyentuh tata letak, bukan uang.**
3. **`EngagementSummary.tsx` (235 baris) belum pernah diperiksa — sudah diperiksa 2026-10-09, hasilnya di §8.
   Butir #9 tidak sekadar "merapikan": ada kalimat yang salah.**
4. **`IaEeTracker.tsx:38` menyembunyikan tab untuk murid non-IB lewat `return null`**, sehingga tab
   Proyek kosong total untuk 9 murid non-IB. Fitur #6 meminta penjelasan, bukan tab kosong.
5. **Tidak ada `updateIaEeProject` di `iaeeRepo.ts`** (hanya 5 fungsi: buat, daftar, hapus proyek,
   tambah/ubah/hapus milestone). Salah ketik judul = hapus proyek beserta seluruh milestone-nya.
6. **`Students.tsx` menghitung `stats.cost` (`:64`) tetapi tidak pernah menampilkannya** di kartu.
   Hitungan mati. Bukan bug uang (tidak ada angka salah tampil), tapi layak dibersihkan atau dipakai.
7. **Urutan daftar murid masih hardcode** di `Students.tsx:150-157` (menurut jadwal terdekat) tanpa
   label urutan — tepat sasaran fitur #12.
8. **Dua bekas `confirm()` bawaan peramban juga ada di `StudentDetail.tsx:128` dan `:143`** (jalur hapus
   sesi dan jalur simpan tarif). Fitur #11 menyentuh kepala halaman yang sama, jadi keduanya diperbaiki
   di putaran ini juga — bukan dibiarkan sebagai utang baru.

---

## 5. Risiko yang harus dibaca sebelum memotong berkas

1. **Peringatan git "CRLF will be replaced by LF" adalah sinyal encoding rusak.** Dua kali terjadi:
   `Payments.tsx` (2026-10-07) dan `MonthlyReport.tsx` (2026-10-08). Untuk berkas ber-UTF-8: pakai
   alat edit yang memahami UTF-8, atau `ReadAllText`/`WriteAllText` dengan `UTF8Encoding($false)`
   dan jalur absolut. **Jangan `Get-Content` + `Set-Content`.**
2. **Blok JSX kondisional ditutup di baris terpisah.** `ATURAN-AI.md` §7 sudah mencatat: memotong blok
   besar dengan penggantian teks sederhana menghasilkan penutup ganda. Pakai alat edit berbasis
   kecocokan teks, dan periksa bentuk penutupnya setelah tiap pemotongan.
3. **Label tab mengunci dua berkas uji yang mudah basi:**
   - `e2e/screenshot-audit.spec.ts:107` — daftar `["Ringkasan", "Sesi & Jadwal", "Progres", "IA/EE/PP"]`
   - `src/__tests__/tabsAccessibility.test.tsx:39` — `{ key: "sesi", label: "Sesi & Jadwal" }`
   Keduanya **wajib** diperbarui pada putaran yang sama. Tambahan bahaya yang sudah terdokumentasi:
   `clickTab` menelan kegagalannya lewat `catch`, jadi spec itu bisa "lulus" sambil memotret layar
   yang tidak berpindah.
4. **Gerbang uang `B1` (`ATURAN-AI.md` §4.1) berlaku untuk setiap layar murid.** Setiap komponen baru
   yang bisa memuat angka uang wajib lewat `useMoneyVisible()`. Ada penjaga otomatis untuk ini
   (`src/__tests__/moneyGate.test.tsx`) — jalankan, jangan diasumsikan hijau.
5. **`ProgresTab` akan tumbuh paling besar** karena fitur #4 + #5 + #9 semuanya mendarat di sana.
   Kalau melewati ±400 baris, pecah lagi sebelum menutup tugas.

---

## 6. Rancangan pelacak proyek (DISETUJUI pemilik 2026-10-09 — dalam pengerjaan)

> **Status: usulan, belum disetujui, belum dikerjakan.** Semua `file:line` di sini hasil baca
> 2026-10-09. Bagian yang saya tandai **"keputusan saya"** boleh diputuskan agen menurut
> `ATURAN-AI.md` §1 butir 5; yang ditandai **K1–K7** wajib pemilik.

### 6.1 Pijakan yang sudah final, jadi tidak perlu ditanyakan lagi

`ATURAN-AI.md` §4.1 sudah menetapkan **"Peta tab layar Murid: Ringkas, Sesi, Progres, Proyek"**.
Artinya label tab `Proyek` adalah keputusan pemilik yang sudah ada, dan fitur #6
("pelacak tampil untuk semua kurikulum, bukan hanya IB") menjelaskan tab itu harus berguna untuk
murid non-IB. Jadi pertanyaan K1 bukan "apakah tabnya ada", melainkan **seberapa jauh isinya
diperluas** — dan spesifikasi `PEKERJAAN.md` §3 G3-06 butir 7 sendiri meminta "jenis proyek bebas"
dan "longgarkan pembatas IB".

### 6.2 Yang berubah pada model data

| Hal | Sekarang (`types.ts`) | Usulan | Akibat pada data & skema |
|---|---|---|---|
| `IaEeType` | `"IA" \| "EE" \| "PP"` (`:447`) | tetap tiga nilai inti, **ditambah `"OTHER"`** untuk jenis bebas | **kolom `type` diletakkan di `db.ts:63` (indeks `id, studentId, type`) — menambah nilai enum bukan perubahan skema, tidak perlu naik versi Dexie** |
| Judul jenis | dirantai di JSX (`IaEeTracker.tsx:100-107`) | **peta label** `PROJECT_TYPES` di berkas baru `src/screens/studentDetail/projectTypes.ts` | tidak mengubah jenis data; `userId`/`studentId` tidak disentuh |
| Status proyek | **tidak ada** | `status?: ProjectStatus` baru, opsional, tanpa indeks | **K2** |
| Catatan/fokus | `notes?: string` | tetap, tidak diubah | — |
| Milestone | `title`, `dueAt?`, `status`, `notes?`, `completedAt?` | tetap, ditambah kemampuan **menyunting** (butuh `updateIaEeProject` / fungsi ubah milestone) | **K3** |
| Tenggat | `deadline?` (satu) | tetap; jangan tambah tenggat kedua | — |

Kenapa `"OTHER"` + `label` bebas, bukan sekadar membuang tipe: `backupValidation.ts:324-326` sudah
memperlakukan tipe tak dikenal sebagai **peringatan, bukan galat** ("type tidak dikenal … dipertahankan
apa adanya"). Jadi menambah nilai aman untuk berkas backup lama, dan proyek lama `IA`/`EE`/`PP` tetap
dibaca apa adanya **tanpa migrasi**. `IAEE_TYPES` di `backupValidation.ts:38` wajib disamakan pada
putaran yang sama — itu diminta eksplisit oleh butir #7.

### 6.3 Peta label (menggantikan rantai syarat)

`IaEeTracker.tsx` menyimpan **empat** rantai kondisi yang harus runtuh menjadi satu peta:

| Rantai sekarang | Letak |
|---|---|
| `{type === "IA" && …}{type === "EE" && …}{type === "PP" && …}` untuk teks penjelasan | `:105-107` |
| `placeholder={type === "PP" ? … : type === "EE" ? … : …}` untuk judul | `:112` |
| `{type === "PP" ? "Mapel (opsional…)" : "Mata pelajaran"}` | `:110` |
| `proj.type === "IA" ? … : proj.type === "EE" ? … : …` untuk warna badge | `:154` |

Usulan bentuknya:

```
{ code, label, hint, subjectLabel, subjectRequired, badgeClass, preset: string[] }
```

**Draf daftar jenis — perlu Anda nilai (K1/K4).** Tanda ⚠️ = teks arahan buatan agen, **belum
dibandingkan panduan resmi IB**, jadi saya tulis sebagai bantuan kerja, bukan pernyataan syarat resmi.

| Kode | Label | Mapel wajib? | Arahan singkat |
|---|---|---|---|
| `IA` | IA — Internal Assessment (DP) | ya | Tugas resmi dari satu mapel DP ⚠️ |
| `EE` | EE — Extended Essay (DP) | ya | Esai riset mandiri dari salah satu mapel DP ⚠️ |
| `PP` | PP — Personal Project (MYP) | tidak | Proyek mandiri MYP, tidak terikat satu mapel ⚠️ |
| `OTHER` | Proyek lain / tugas panjang | tidak | Untuk eksperimen, esai, proyek pribadi, atau tugas jangka panjang apa pun; mapel boleh dikosongkan |

Kalau Anda ingin daftar yang lebih panjang (mis. O Level coursework, EPQ A Level, proyek Nasional),
tinggal ditambah sebagai entri peta yang baru — tidak menyentuh skema data sama sekali.

### 6.4 Milestone bawaan: keputusan saya (bukan keputusan pemilik)

Butir #7 meminta "peta label" dan "jenis proyek bebas". Supaya murid non-IB tidak melihat tab kosong
dan tutor tidak mengetik dari nol setiap kali, saya usulkan **preset milestone otomatis saat proyek
dibuat**, dan ini saya putuskan sendiri karena hanya mengisi awal, bukan mengubah uang atau menghapus
data. Presetnya tetap bisa dihapus/disunting per milestone:

```
IA   → Proposal · Eksperimen/Pengumpulan data · Analisis · Draf · Revisi · Submit   ⚠️ bukan klaim resmi
EE   → Research question · Riset literatur · Draf Bab 1-3 · Revisi · Submit         ⚠️ bukan klaim resmi
PP   → Tujuan · Riset · Produk · Laporan · Pameran                                  ⚠️ bukan klaim resmi
OTHER→ (kosong; tutor mengisi sendiri)
```

Tiga alasan saya memilih mengisi otomatis: (1) placeholder `:219` yang ada sekarang sudah menyarankan
urutan serupa, jadi ini melanjutkan maksud lama, bukan gagasan baru; (2) milestone bisa dihapus
satu-satu, jadi salah preset tidak merusak apa pun; (3) tanpa ini, tab Proyek untuk murid non-IB memang
kosong dan butir #6 tidak tercapai. **Kalau Anda tidak mau poin-poin ini muncul otomatis, satu baris
perubahan di `PROJECT_TYPES` (kosongkan `preset`) — dan saya sebutkan itu di laporan.**

### 6.5 Wajah layar yang saya usulkan

Bila K1 dijawab "manajemen proyek umum + preset IB":

1. **Kepala kartu** — judul berubah dari "IA / EE / PP Tracker" menjadi **"Proyek"**, dengan satu baris
   keterangan peran: melacak tugas panjang (IA · EE · PP · eksperimen · esai · tugas internal).
2. **Tombol `+ Proyek`** membuka formulir dengan **pemilih jenis dari peta label**, bukan tiga pilihan
   terkunci. Kolom mapel otomatis **wajib/non-wajib** mengikuti jenis.
3. **Kartu proyek** menampilkan badge jenis, status (`Rencana/Jalan/Selesai/Batal` — **K2**), mapel,
   judul, tenggat, dan bilah kemajuan milestone. Kartu proyek yang selesai pindah ke bawah.
4. **Masuk ke satu proyek**: sunting (judul/mapel/tenggat/status/catatan — butuh **K3**), daftar
   milestone dengan tombol ubah-status, **tambah/sunting/hapus milestone**, dan hapus proyek.
5. **Dialog konfirmasi internal**, menggantikan `confirm()` bawaan di `:208` dan `:251` (**K7**).
6. **Murid non-IB**: gerbang `isIb` (`:38-39`) dihapus, jadi tab terisi. Kalau presetnya kosong
   (`OTHER`), layar menampilkan kalimat contoh tipe proyek — bukan tab kosong.

### 6.6 Yang saya verifikasi tentang risiko perubahan ini

- **Tidak ada satu pun tes yang menyentuh `IaEeTracker`.** Hasil pencarian di 74 berkas tes dan seluruh
  `e2e/`: nol rujukan komponen ini. Artinya menghapus gerbangnya **tidak akan mematahkan suite**, tetapi
  juga berarti perubahan ini **tidak punya jaring pengaman sama sekali** — jadi saya usulkan menambah
  tes jalur tab Proyek pada putaran eksekusi (bukan penjaga baru yang menuntut keputusan, melainkan
  tes untuk perilaku baru).
- **`PaginationControls`, label kurikulum pendek, dan `gradeDelta` sudah tersedia** dan akan dipakai
  alih-alih menulis ulang: `CURRICULUM_META[c].shortLabel` sudah berisi `MYP`/`DP`/`IGCSE`/`O Lvl`/
  `AS Lvl`/`A Lvl`/`AP`/`Nasional`/`Custom` (`ibSubjects.ts:243-251`) — persis "label pendek kurikulum"
  yang diminta butir #13.
- **Perubahan warna/token wajib dicatat.** Keputusan D4 mewajibkan setiap perubahan warna atau token
  yang disengaja meninggalkan catatan bertanggal di riwayat tugas. Badge jenis proyek sekarang memakai
  token warna (`:154`); kalau saya mengubahnya jadi satu peta, itu perubahan token yang harus dicatat.

### 6.7 Yang benar-benar menahan, dan yang tidak

Setelah ditelusuri, dari tujuh pertanyaan hanya **empat** yang wajib ke pemilik menurut
`ATURAN-AI.md` §1 butir 5. Tiga sisanya saya putuskan sendiri dan saya sebutkan alasannya di laporan:

| Kode | Sifat | Alasan |
|---|---|---|
| K1 | **wajib pemilik** | mengubah kegunaan fitur untuk 9 murid non-IB — perilaku pengguna |
| K2 | **wajib pemilik** | menambah kolom pada data tersimpan; memengaruhi berkas backup |
| K4 | **wajib pemilik** | daftar jenis tampil di antarmuka dan Anda yang memakai istilahnya |
| K3 | keputusan agen | menambah fungsi repositori `updateIaEeProject` — melengkapi kemampuan yang hilang, tidak mengubah uang/perilaku/data lama |
| K5 | keputusan agen | `PaginationControls` sudah jadi pola yang dipakai layar lain; menggantinya ke "muat lagi" butuh komponen baru untuk satu tempat, jadi **spek diikuti apa adanya** hanya bila Anda minta |
| K6 | keputusan agen | membetulkan penyebut yang salah di `EngagementSummary.tsx:146` adalah memperbaiki keterangan, bukan mengubah perilaku; penggabungan dua kartu tidak dilakukan tanpa permintaan |
| K7 | keputusan agen | mengganti `confirm()` bawaan **menegakkan keputusan §4.1 yang sudah Anda tetapkan**, jadi tidak perlu izin baru |

---

## 7. Keputusan pemilik (SUDAH DIJAWAB 2026-10-09)

Ringkas keputusan beserta akibatnya. Dasar pertimbangannya ada di §6 untuk K1–K4, di §8 untuk K6,
dan di §9 untuk K5.

### 7.1 Keputusan pokok (K1–K4)

| Kode | Keputusan | Kenapa menahan |
|---|---|---|
| K1 | Arah pelacak proyek: diperbaiki sebagai pelacak IB, **atau** jadi manajemen proyek umum dengan preset IB | menentukan isi `ProyekTab.tsx` dan apakah `IaEeType` diperluas |
| K2 | Tambah kolom `status` proyek (`rencana`/`jalan`/`selesai`/`batal`)? | menyentuh `src/db/types.ts`; kolom data tersimpan |
| K3 | Tambah `updateIaEeProject`? | menentukan apakah proyek bisa disunting atau harus dihapus-dibuat ulang |
| K4 | Label + daftar jenis proyek: tunjukkan draf dulu, atau langsung terapkan | menyentuh data proyek yang sudah ada milik pemilik |

### 7.2 Keputusan tambahan — SUDAH DIJAWAB pemilik 2026-10-09

Ketiganya dijawab pada 2026-10-09. Kolom terakhir mencatat apa yang benar-benar dikerjakan.

| Kode | Pertanyaan | Jawaban pemilik | Keadaan pelaksanaan |
|---|---|---|---|
| K5 | Butir #10: pertahankan halaman (Sebelumnya/Berikutnya), atau ganti jadi tombol "Muat 20 lagi"? | **Pertahankan** pola halaman | pola halaman tetap; yang WAJIB diperbaiki tinggal tombol bersarang di dalam `role="button"` (`RiwayatSesi.tsx:144`/`:197`) — belum dikerjakan |
| K6 | Dua kartu rata-rata fokus (`EvidenceCard` di Sesi, `EngagementSummary` di Progres): gabung, atau biarkan dua? | **Gabung jadi satu**, dan yang diutamakan **kesimpulan**: "murid ini seperti apa" | **selesai** (commit `f18fa0e` + `e68e974`) — lihat §7.4 |
| K7 | Empat `confirm()` bawaan peramban: perbaiki sekarang atau jadi butir tersendiri? | **Perbaiki segera** | **selesai** — lihat §7.3 |

### 7.3 Pelaksanaan K7 (selesai 2026-10-09)

Audit ulang menemukan cakupannya lebih luas dari empat tempat yang saya sebut semula:

| Berkas | Pelanggaran | Penyelesaian |
|---|---|---|
| `IaEeTracker.tsx:208` dan `:251` | dua `confirm()` (hapus milestone, hapus proyek) | diganti `ConfirmSheet`; pesan hapus proyek kini menyebut jumlah milestone yang ikut terhapus |
| `StudentDetail.tsx:125` | satu `alert()` (PIN belum diatur saat hapus sesi) | diganti keadaan tanpa-PIN yang **sudah ada** di `SessionDetailModal` beserta tombol "Atur PIN Keuangan" — jadi tutor langsung dapat jalan keluarnya |
| `Settings.tsx` (5 tempat: `:590`, `:630`, `:1161`, `:1220`, `:1294`) | `confirm()` pada jalur restore dan hapus semua data | **sengaja TIDAK dikerjakan di sini** — berkas itu lingkup G3-09, dan syarat selesai G3-09 sendiri sudah berbunyi "tidak ada lagi dialog bawaan peramban di berkas pengaturan". Ditinggalkan sebagai utang yang tercatat, bukan dilupakan. |

Penjaga regresinya: `src/__tests__/nativeDialogs.test.ts` (14 tes). Ia membaca **berkas sumber** (pola yang sama dengan `moneyGate.test.ts`), membuang komentar lebih dulu supaya dokumentasi yang menyebut `confirm()` tidak dihitung, dan sudah **dibuktikan bisa gagal** dengan menyisipkan pelanggaran sementara ke `StudentDetail.tsx` — tes merah dan menyebut berkasnya, lalu pelanggaran dikembalikan.

### 7.4 Pelaksanaan K6 (selesai 2026-10-09)

Hasil akhirnya: **satu kartu `Kesimpulan`** menggantikan dua kartu yang saling mengulang.

| Berkas | Perubahan |
|---|---|
| `src/lib/studentConclusion.ts` (baru) | mesin kesimpulan + `buildConclusionLog` — diuji 18 tes (`studentConclusion.test.ts`) + 11 tes render (`engagementConclusion.test.tsx`) |
| `src/screens/studentDetail/EngagementSummary.tsx` | ditulis ulang: blok kesimpulan di atas, empat pengulangan dihapus, `:146` versi lama yang salah penyebut **hilang** |
| `src/screens/studentDetail/EvidenceCard.tsx` | jadi penunjuk tipis (31 baris) — tidak lagi menghitung rata-rata sendiri |
| `src/components/charts/RatingIndicator.tsx` | prop opsional `hideValue`, supaya "N/10" tidak dicetak ketiga kalinya di kartu yang sama |
| `src/screens/studentDetail/RiwayatSesi.tsx` | "Topik Pernah Dibahas" kini menyebut penyebut sesungguhnya (`N dari M sesi yang punya catatan topik`) |

Angka pendukung yang tersisa di kartu itu hanya yang **belum** disebut kesimpulan: bentuk visual rata-rata (titik, tanpa angka), tren, dan persentase Main HP beserta penyebutnya. Rumusnya: rata-rata ditulis **sekali**, di kalimat kesimpulan, lengkap dengan penyebutnya.

Bukti render ada di `src/__tests__/engagementConclusion.test.tsx` (11 tes) — termasuk dua tes yang mengunci tepat permintaan pemilik: "rata-rata hanya muncul SEKALI" dan "tidak lagi memuat frasa lama yang salah penyebut".

**Catatan kejujuran soal K1/K4.** Teks penjelasan IA/EE/PP yang ada sekarang
(`IaEeTracker.tsx:105-107`) adalah ringkasan agen mengikuti kerangka silabus dan **belum dibandingkan
panduan resmi IB**. Itu batas kejujuran `SERAH-TERIMA.md` §4.2 nomor 4 yang belum ditutup keputusan D5.
Konsekuensinya: setiap preset milestone yang saya usulkan untuk IA/EE/PP akan ditandai
**"draf, belum diverifikasi ke panduan resmi"**, bukan saya klaim sebagai syarat resmi IB.

---

## 8. Temuan presisi pada butir #8 dan #9 (hasil baca 2026-10-09)

Fitur #9 berbunyi "ringkasan keterlibatan disisakan satu blok angka, pengulangan dihapus, dan setiap
baris menyebut penyebutnya". Setelah membaca `EngagementSummary.tsx` dan `EvidenceCard.tsx`, isinya
lebih dari pengulangan — ada satu angka yang keterangannya tidak cocok.

| Temuan | Letak | Sifat |
|---|---|---|
| Rata-rata yang **sama** muncul di **4 tempat** | `EngagementSummary.tsx:93` ("rata-rata dari N sesi") · `:146` ("Rata-rata fokus: X/10 dari N sesi terakhir") · `:218` (kalimat Insight) · `EvidenceCard.tsx:26-30` (Avg Fokus + "N sesi") | pengulangan yang dimaksud butir #9 |
| **Angka dan penyebutnya tidak sepadan** | `:146` menulis `{avgEngScore}` dengan penyebut `recentEng.length`. Padahal `avgEngScore` dihitung dari **seluruh** sesi berdata (`engCoverage.average`), sedangkan `recentEng` hanya 15 sesi terakhir yang **punya skor**. Jadi kalimat "dari N sesi terakhir" menempelkan rata-rata sejarah ke penyebut 15 sesi terakhir. | **salah keterangan, bukan sekadar berulang** |
| **Tiga penyebut berbeda untuk satu angka** | `counted` (`:93`) · `recentEng.length` (`:146`) · `engSessions.length` (`:218`) | pembaca tidak bisa tahu rata-ratanya atas sesi mana |
| **`EvidenceCard` tidak punya penyebut berdata** | `:30` hanya menulis "{engSessions.length} sesi" tanpa membedakan sesi berdata | bentrok dengan maksud butir #8 ("penyebut yang benar, yaitu dari jumlah sesi yang benar-benar berisi data") |
| Dua kartu menumpuk informasi sejenis | `EvidenceCard` ("Bukti Keaktifan") + `EngagementSummary` ("Keseriusan Belajar") sama-sama menampilkan rata-rata fokus + jumlah sesi | kandidat penggabungan, **tapi menyentuh tata letak → perlu keputusan pemilik** |

**Yang sudah benar dan jangan diutak-atik:** `engagement.ts:184-205` (`engagementAverage`) sudah
mengembalikan `counted`/`total`/`full`/`noObservation`, dan `:56`/`:93`/`:112` sudah memakai penyebut
yang benar. Jadi pekerjaan #9 adalah **menghapus yang berulang dan membetulkan `:146`**, bukan
membangun ulang perhitungannya.

---

## 9. Temuan pada butir #10 (hasil baca 2026-10-09)

**Ada kesenjangan antara bunyi spesifikasi dan perilaku aplikasi, dan ini perlu keputusan pemilik.**

- Spesifikasi meminta **tombol "muat dua puluh lagi"**. Yang terpasang adalah `PaginationControls`
  (`components/PaginationControls.tsx`, 55 baris) — pola **Sebelumnya / Berikutnya** dengan teks
  "Menampilkan 1-20 dari N sesi", dan tidak dirender sama sekali bila itemnya ≤ `PAGE_SIZE`. Jadi
  perilakunya bukan "muat lagi", melainkan berpindah halaman.
- **Bagian kedua butir #10 sudah terpenuhi dan perlu diverifikasi, bukan diasumsikan:** "tidak lagi
  menyarangkan kontrol yang bisa diklik di dalam kontrol lain". Di `RiwayatSesi.tsx:144` kartu sesi
  memakai `role="button"` + `onClick`/`onKeyDown` pada `<div>`, dan di `:197` **ada `<button>` asli
  di dalamnya** (Edit catatan sesi, dengan `e.stopPropagation()`). Itu kontrol bersarang yang dimaksud.
  Jadi verifikasi = buktikan setelah diperbaiki, bukan nyatakan sudah beres.

Pilihan untuk bagian pertama, keduanya sah dan akibatnya berbeda:

| Pilihan | Akibat |
|---|---|
| Pertahankan halaman (Sebelumnya/Berikutnya), cukup rapikan sarang kontrolnya | tidak menyentuh uang, perubahan kecil, tapi **belum memenuhi huruf spesifikasi** |
| Ganti jadi tombol "Muat 20 lagi" yang menambah di bawah daftar | memenuhi spesifikasi apa adanya; `PaginationControls` tetap dipakai layar lain (dan di dalam `EngagementSummary` untuk daftar mapel) |

---

## 10. Butir #5 (antarmuka isian nilai rapor) — peta presisi

Ini **bukan** fitur dari nol, dan bukan pula "tinggal disambungkan":

| Lapisan | Keadaan terukur |
|---|---|
| Tipe data | `RaporGrade` ada: `types.ts:212-219` — satu baris **per semester**, berisi `grades: { subject, grade }[]` + `notes` |
| Simpan | `upsertRaporGrade` **sudah ada** di `studentRepo.ts:194-206`, kuncinya (studentId, semester) — memperbarui bila ada, menambah bila belum |
| Daftar | `listRaporGrades` (`studentRepo.ts:188`) — diurutkan per semester |
| Hapus | `deleteRaporGrade` (`studentRepo.ts:208`) |
| **Antarmuka isian** | **tidak ada** — `upsertRaporGrade` tidak dipanggil dari layar mana pun (hanya diekspor lewat `repos/index.ts:20`, dan `Students.tsx:122` memakai `listRaporGrades` untuk ringkasan hapus) |
| **Tabel prediksi vs nilai akhir** | juga belum ada di tab Progres. Tapi **perbandingannya sudah ada** dan terbukti dipakai: `template/layouts/helpers.tsx:59` `gradeDelta(predicted, actual)` (menghasilkan "+1"/"-2"/"sama") dipakai `useReportData.ts:100` untuk tabel laporan bulanan; `lib/grades.ts:24` `isGradeLower` dipakai `StudentDetail.tsx:248` untuk memaksa refleksi bila nilai jatuh |

**Konsekuensi rencana:** dua butir ini (#4 dan #5) sebagian besar adalah **menghadirkan kembali**
perbandingan yang sudah teruji di laporan ke dalam tab Progres, bukan menulis rumus baru. Rumus baru
akan menjadi **rumus kedua untuk hal yang sama** — justru sumber ketidakkonsistenan. Perhatikan aturan
`src/template/` yang terlarang disentuh: pilihannya adalah **memakai** `gradeDelta` sebagaimana
`useReportData` memakainya (impor, tanpa mengubah berkasnya), dengan satu tes pembanding, atau
memindahkan fungsinya dengan hati-hati. Rekomendasi: pakai apa adanya, jangan pindahkan.

---

## 11. Urutan eksekusi setelah keputusan dijawab

1. **Fase A** — potong `StudentDetail.tsx` (§3), perbarui dua pengunci label (§5 butir 3), perbarui JSDoc basi.
2. **Fase B** — fitur #2, #3, #4, #5, #6, #7, #8, #9 di dalam tab yang baru. Untuk #7: perluas jenis,
   ganti rantai syarat jadi peta label, samakan `backupValidation.ts:38` (`IAEE_TYPES`).
3. **Fase C** — fitur #10 (`RiwayatSesi.tsx`), #11 (`DetailHeader.tsx`), #12 + #13 (`Students.tsx`),
   #14 (`StudentForm.tsx`).
4. **Fase D** — gate sekali: `npx tsc -b` · `npm run test:sandbox` · `npm run build` ·
   `npm run check:docs` · `npm run e2e:uiux`. Untuk `npm run e2e`: **tidak akan hijau** karena 11
   kegagalan warisan; pisahkan regresi dari warisan dengan `git stash push -u`, bukan dengan klaim.
5. **Fase E** — pembaruan dokumen kerja + butir daftar periksa manual baru untuk tab Murid, lalu commit.

Setiap keputusan yang saya ambil sendiri dicatat satu baris alasannya, sesuai `ATURAN-AI.md` §8.
