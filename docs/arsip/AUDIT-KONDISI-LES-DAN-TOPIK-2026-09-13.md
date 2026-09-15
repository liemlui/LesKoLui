# Audit UX — Pilihan Kondisi Les & Kelengkapan Sub Topik (Catat Sesi)

> **Sekilas** · Audit UX + audit data · **status: P0–P3 SELESAI DIIMPLEMENTASI (v1.74.0 P0, v1.75.0 P1–P3)** · untuk: pemilik aplikasi (Ko Lui) · baca kalau: ingin membuat langkah "Kondisi" lebih cepat dipilih dan mencari tahu kenapa "sub topik" terasa kurang lengkap · isi: 16 temuan terukur (8 tentang topik, 8 tentang kondisi), 2 akar masalah, alur baru langkah Materi & Kondisi yang **sudah dipakai**, urutan pengerjaan P0–P3, dan **hasil terukur (§4: cakupan topik 64 → 93 dari 167 mapel; §12: apa yang berubah di P1–P3)**.
>
> Dasar: aplikasi **v1.73.0** saat audit ditulis · P0 dirilis **v1.74.0**, P1–P3 dirilis **v1.75.0** · analisis kode + inventaris data `src/lib/ibTopics.ts` & `src/lib/ibSubjects.ts` · **tanpa menjalankan dev server** (angka teks/tabel direproduksi oleh penjaga otomatis `src/__tests__/topicCoverage.test.ts`; lihat *Keterbatasan*).
> Dokumen ini melanjutkan [`AUDIT-UIUX-CATAT-SESI-2026-09-12.md`](AUDIT-UIUX-CATAT-SESI-2026-09-12.md) (C-01…C-17, sudah selesai di v1.73.0) dan **tidak menduplikasi** temuannya: audit itu menilai alur, kontras, tap-target, dan ketahanan draf. Audit ini menilai **isi pilihan** yang disodorkan kepada tutor — bukan tampilannya.

---

## Ringkasan eksekutif

Dua keluhan yang Anda rasakan punya **satu pola yang sama**: aplikasi menyodorkan pilihan yang **tidak cocok dengan data murid yang sedang dicatat**, dan ketika pilihan itu kosong, layar tidak pernah menjelaskan kenapa.

1. **"Sub topik kurang lengkap" itu benar, dan penyebab utamanya bukan data yang sedikit — tapi nama mapel yang tidak pernah bertemu.** Indeks topik berisi **1.538 topik dalam 282 unit** untuk **61 nama mapel** (57 setelah nama kembar digabung, lihat T-08). Tetapi dari **167 mapel** yang bisa dipilih tutor di layar, hanya **64 (38%)** yang punya topik **pada level kurikulumnya**. Yang paling parah: **seluruh 30 mapel Cambridge IGCSE kosong 100%** dan **6 dari 8 mapel IB MYP kosong**. Penyebab teknisnya dangkal: picker menyimpan `"Mathematics (0580)"`, indeks topik menyimpan `"Mathematics"` — dan tidak ada jembatan di antaranya. ✅ **Sudah diperbaiki di P0: 93 dari 167 mapel (§4).**

2. **"Kondisi les susah dipilih" juga benar, dan sumbernya adalah tiga model mental yang saling bertabrakan di satu layar.** Di langkah Kondisi ada **60 kontrol** (`22` terlihat langsung, `38` lagi setelah "Observasi Lanjutan" dibuka) yang mewakili tiga cara berbeda untuk mengatakan hal yang sama: **preset** ("Lancar", "Biasa", "Kurang Fit"), **mood** ("Semangat/Fokus/Biasa/Lelah/Kesulitan"), dan **12 indikator bercentang (+2/+1/−1)**. Presetnya sendiri tidak konsisten: **"Biasa" tidak melakukan apa pun** (tidak menyalakan, tidak mematikan, tidak mengisi mood), sedangkan dua preset lain mengisi mood secara diam-diam.

Akibat paling mahal dari keduanya bukan waktu mengetuk, tapi **mutu data yang masuk ke laporan**: tutor mengetuk "Lancar" karena cepat, dan laporan bulanan menyatakan murid "aktif bertanya" — padahal tutor tidak pernah mengamati itu. Di sisi topik, tutor berhenti memakai fitur pencarian dan mengetik bebas, sehingga **topik tidak lagi bisa dibandingkan antar sesi** (`"Integral"`, `"integral"`, `"Bab 5"` menjadi tiga topik berbeda di mata aplikasi).

**Rekomendasi inti (detail di §6–§7) — semuanya sudah dikerjakan:**
- **P0** ✅ — Samakan kosa kata mapel ↔ topik (satu fungsi `normalizeSubject()`) + test penjaga. **Tidak mengubah data** (tanpa migrasi), menghidupkan 29 mapel yang tadinya kosong. Lihat §4.
- **P1** ✅ — Langkah Materi kini punya **daftar bab yang bisa dibaca** (fungsi `browseTopicsForSubjects()` yang tadinya ditulis tapi tidak pernah dipanggil), chip "topik sesi lalu", penyimpanan bab, dan perbaikan label jenjang. Lihat §12.
- **P2** ✅ — Langkah Kondisi menjadi **3 lapis**; preset yang tidak punya arti dihapus; indikator terdepan dikurangi jadi 6; mood keluar dari skor; gauge pindah ke akhir langkah Detail; detail sesi bisa dikoreksi. Lihat §12.
- **P3** ✅ — Rata-rata selalu berpenyebut + panel cakupan data + sumbu kedua (kualitas respons); ekspor menandai bab topik & sumber skor. Lihat §12.

---

## 1. Cara mengukur & cara mengecek ulang

| Sumber | Yang diukur |
|---|---|
| `src/lib/ibTopics.ts` | inventaris `mk(...)`: mapel, level, unit, jumlah topik per unit |
| `src/lib/ibSubjects.ts` | daftar mapel per kurikulum yang **benar-benar ditawarkan picker** |
| `src/lib/ibTopics.ts` → `resolveSubjectAliases()` + `searchTopicsExpanded()` | kecocokan nama mapel ↔ indeks topik (termasuk *fallback* lintas-level) |
| `src/screens/CaptureSession.tsx` | jumlah kontrol, alur langkah, dan cara simpan (`handleSave`, baris 436–537) |
| `src/screens/captureSession/useEngagement.ts` + `src/lib/engagement.ts` | model skor dan perilaku preset |
| `leskolui-data-2026-08-23.csv` | data nyata tutor (1.273 baris sesi) |

Skrip pengukuran satu kali (dipakai saat audit ditulis; **sudah dihapus** — angka §3 kini dijaga permanen oleh test di bawah):

| Cara mengukur ulang | Menghasilkan |
|---|---|
| `npx vitest run --config vitest.audit.config.ts src/__tests__/topicCoverage.test.ts` | penjaga cakupan: gagal bila ada mapel tanpa topik yang belum terdaftar sadar |
| `npx vitest run --config vitest.audit.config.ts src/__tests__/topicSearch.test.ts` | perilaku pencarian: level tidak bocor, meta fallback benar |
| `npx vitest run --config vitest.audit.config.ts` | seluruh suite (48 berkas / 518 test) |

> `vitest.audit.config.ts` adalah konfigurasi test minimal (tanpa plugin Tailwind/PWA) untuk **lingkungan audit ini**: di sini `npm test` gagal memuat `vite.config.ts` karena plugin native Tailwind tidak bisa dimuat, sehingga seluruh suite tidak jalan sama sekali. Pengaturan test-nya identik (globals, setupFiles, include, testTimeout). Di mesin normal, `npm test` (48 berkas / 518 test) dipakai apa adanya — sudah diverifikasi hijau setelah P0.

---

## 2. Tabel temuan

| ID | Area | Masalah | Dampak | Severitas |
|---|---|---|---|---|
| **T-01** | Topik ↔ mapel | Picker menyimpan nama ber-kode (`Mathematics (0580)`), indeks topik menyimpan nama polos (`Mathematics`); `SUBJECT_ALIASES` (40 entri) tidak memuat satu pun nama ber-kode | **Semua 30 mapel IGCSE, 14 O Level, 14 AS/A Level, sebagian AP/DP** tidak menemukan topiknya | 🔴 |
| **T-02** | Isi indeks | 6 dari 8 mapel IB MYP tanpa satu pun topik: Language & Literature, Language Acquisition, Individuals & Societies, Arts, PHE, Design | Mapel inti MYP → tutor mengetik bebas | 🔴 |
| **T-03** | `searchTopics()` | Saat hasil di level kurikulum murid kosong, kode jatuh ke **seluruh level** (`final = byCurriculum.length > 0 ? byCurriculum : scored`) **tanpa memberi tahu pengguna** | Topik salah level tampil sebagai saran normal → salah dicatat ke laporan | 🔴 |
| **T-04** | `searchTopics()` | Bonus mapel dihitung dari kata mapel yang dipecah (`/\s,&-/`, kata >2 huruf) — `"Global Politics"` cocok dengan topik Matematika karena kata "power" | Saran tidak relevan mengisi 12 slot hasil | 🟠 |
| **T-05** | `browseTopicsForSubjects()` | Sudah ditulis lengkap (memfilter level + mengelompokkan per unit) **tetapi tidak pernah dipanggil** dari layar mana pun; UI hanya punya satu kotak pencarian | Tanpa "daftar untuk dipilih", tutor harus mengingat kata kunci persis — dan menyerah ke teks bebas | 🟠 |
| **T-06** | Model data | `Session.topic` hanya `string`; tidak ada `unit`/`topicId`. Setiap topik bebas menjadi string unik baru | Topik tidak bisa direkap, dibandingkan, atau diusulkan ulang antar sesi | 🟡 |
| **T-07** | Level murid | `curriculumToLevel()` memetakan **semua** kurikulum non-IB (IGCSE, O Level, AS/A Level, AP, Nasional) ke `"UNIV"`; `Level` hanya `"MYP" \| "IBDP" \| "UNIV"` | Siswa 15 tahun tertulis "UNIV" di kartu murid & ekspor; laporan kehilangan konteks jenjang | 🟡 |
| **T-08** | Duplikasi indeks | `ESS` (32 topik) vs `Environmental Systems & Societies` (22 topik); `TOK` (3) vs `Theory of Knowledge` (5); `Math` (39) vs `Mathematics` — dua entri untuk satu mapel | Hasil pencarian bisa menampilkan mapel "kembar" | 🟢 |
| **C-01** | Langkah Kondisi | **60 kontrol** dalam satu langkah: 4 preset, 5 mood, 7 chip situasi, 4 indikator positif, 8 indikator perlu perhatian, 16 tag perilaku + 16 tombol "ⓘ", 1 kolom teks | Butuh menggulir jauh; 1 hari biasa pun melewati 22 kontrol yang tidak relevan | 🔴 |
| **C-02** | Preset | `applyPreset({}, "Biasa")` hanya mengisi mood "Biasa" — tidak menyalakan/mematikan indikator apa pun, padahal tampil sejajar dengan "✨ Lancar" yang menyalakan 3 indikator | Tutor mengira "Biasa" = "murid biasa hari ini", padahal artinya "mood biasa" | 🔴 |
| **C-03** | Preset | "✨ Lancar" menuliskan `activeAsking: true` dan `quickLearner: true` — dua klaim observasi yang tidak dilakukan tutor | Laporan menyatakan murid "aktif bertanya" tanpa dasar; rata-rata keseriusan naik semu | 🔴 |
| **C-04** | Model skor | `score` dihitung dari data yang **ada**, bukan dari kondisi murid: dasar 5/10 + indikator. Sesi tanpa sinyal (`hasEngagementInput === false`) → `0`, sesi dengan satu sinyal netral → `5` | "5/10" berarti "belum diisi/diisi tipis", bukan "cukup" — **`scoreLabel(5) === "Cukup"`** | 🟠 |
| **C-05** | Mood | Mood ikut mengubah skor (`Semangat +1`, `Kesulitan −1`) padahal mood adalah **suasana**, bukan perilaku — dan sudah ada kolom terpisah "Situasi Hari Ini" untuk konteks manusiawi | Dua kontrol untuk satu maksud, dengan efek skor berbeda | 🟠 |
| **C-06** | Umpan balik | Ikon 🌟 dipakai mood "Semangat" **dan** tag perilaku "Antusias"; 😴 dipakai mood "Lelah" **dan** indikator "Mengantuk". Keduanya juga berbagi skor: mood "Semangat" +1 dan tag Antusias +1 | Satu pengamatan dapat dua tambahan skor bila tutor mengisi keduanya | 🟡 |
| **C-07** | Verifikasi & koreksi | `SessionDetailModal` menampilkan hanya **8 dari 12** indikator engagement (⏰ Telat, 🚻 Sering ke toilet, 🦘 Gelisah, 🙈 Sibuk sendiri tidak pernah tampil) dan **tidak menampilkan satu pun dari 16 tag perilaku** | Tutor tidak bisa memeriksa/memperbaiki apa yang ia catat → data lama salah tidak pernah dibersihkan | 🟠 |

---

## 3. Kenapa "sub topik" terasa kurang lengkap — 3 sebab

### 3.1 Nama mapel tidak pernah bertemu indeks (T-01)

Picker mapel (kurikulum-aware, `CaptureSession.tsx:1993`) menyimpan nama **persis** dari `ibSubjects.ts`. Indeks topik memakai nama polos. Jembatannya `SUBJECT_ALIASES`, dan jembatan itu **hanya berisi 40 nama polos** — tidak satu pun nama ber-kode.

Hasil pengukuran (level kurikulum murid, tanpa *fallback* lintas-mapel):

| Kurikulum | Mapel ditawarkan | Punya topik di levelnya | Kosong |
|---|---|---|---|
| IB MYP | 8 | **2** | 6 |
| IB DP | 36 | 21 | **15** |
| Cambridge IGCSE | 30 | **0** | **30** |
| Cambridge O Level | 18 | 7 | 11 |
| Cambridge AS/A Level | 22 | 8 | 14 |
| AP | 34 | 14 | **20** |
| National | 19 | 12 | 7 |
| **Total** | **167** | **64 (38%)** | **103 (62%)** |

Bukti bahwa ini benar-benar terasa di layar (disimulasikan dengan urutan skor & aturan *fallback* yang sama seperti `searchTopics()`):

```
[Cambridge IGCSE] mapel="Mathematics (0580)"      kueri="algebra"
   → 12 hasil, level: O Level, MYP 1, MYP 5        ← nol topik IGCSE
     • Mathematics (4024) · O Level · Algebra & equations
     • Mathematics · MYP 1 / Grade 6 · Variabel & konstanta

[Cambridge IGCSE] mapel="Biology (0610)"          kueri="cell"
   → 12 hasil, level: DP, AP, O Level, A Level     ← nol topik IGCSE
     • Biology · IB DP · Cell theory — principles and evidence

[IB DP] mapel="Bahasa Indonesia A"                kueri="teks"
   → 12 hasil, level: SMA 10, SMA 11, MYP 3-4
     • Bahasa Indonesia · Kelas 10 (SMA) · Teks laporan hasil observasi

[IB DP] mapel="Global Politics"                   kueri="power"
   → 8 hasil  → • Mathematics · MYP 5 · Aturan turunan — power, product, quotient, chain
```

**Ini bukan topik murid itu.** Yang terjadi: pencarian mengembalikan daftar "kelihatan normal", tutor memilih satu, dan topik PG (mis. `"Cell theory — principles and evidence"`, DP) tercatat untuk sesi IGCSE. Pemilik aplikasi melihat ini sebagai "kurang lengkap" — dan itu tafsir yang benar, tapi mekanismenya lebih buruk daripada sekadar kosong.

Catatan penting: **Cambridge IGCSE adalah kurikulum yang paling sering muncul di data dummy** (2 murid) dan mapel ber-kode sudah muncul di ekspor data nyata (`Physics (5054)` 5×, `Chemistry (5070)`, `Economics (2281)`). Jadi ini bukan kasus teoretis.

### 3.2 Indeks topik memang belum punya "sub topik" sebagai konsep (T-02, T-05, T-06)

Struktur data saat ini hanya **dua tingkat**: `unit` (nama bab, mis. `"1 — Ratios & Proportions: Competition and Cooperation"`) dan `topic` (mis. `"Rasio & perbandingan"`). Yang di layar disebut "topik" sebenarnya sudah setingkat **sub-topik** (cakupan 1–2 pertemuan), dan tidak ada tingkat di bawahnya untuk "sub topik" yang Anda maksud.

Dampaknya:
- **Tidak ada daftar untuk dibaca.** `browseTopicsForSubjects()` sudah ada (menyaring level + mengelompokkan per unit) tetapi **0 pemanggilan** di seluruh `src/`. Satu-satunya jalan masuk ke 1.538 topik adalah kotak pencarian — yang hanya berguna bila tutor sudah tahu kata kuncinya.
- **Pencarian menuntut kata kunci, bukan pengenalan.** Untuk MYP 1 unit 5 ada `"Keliling & luas — persegi, persegi panjang, segitiga"`. Tutor yang ingin mencatat "luas trapesium" harus menebak bahwa kata "luas" ada di dalamnya.
- **Topik bebas tidak pernah bertemu topik katalog.** Karena `Session.topic` hanya string, `"Integral"`, `"integral"`, dan `"Bab 5 integral"` adalah tiga topik berbeda. Tidak ada yang bisa dipakai ulang, jadi tiap sesi dimulai dari nol → terasa seperti katalog yang tidak pernah lengkap.
- **Indeks belum merata.** 1.538 topik itu terkonsentrasi: Mathematics (249), Chemistry (90), Matematika (80), Biology (79). Sebaliknya 14 mapel DP **nol** topik: Bahasa Indonesia A, English A (Literature), English A (Lang & Lit), Philosophy, Global Politics, Digital Society, Design Technology, SEHS, dan seluruh Group 6 (Visual Arts, Music, Theatre, Film, Dance) serta TOK & EE. Untuk mapel-mapel itu, "kurang lengkap" = memang kosong.

### 3.3 Level murid disimpan sebagai satu label yang menyesatkan (T-07)

`Level = "MYP" | "IBDP" | "UNIV"`, dan `curriculumToLevel()` mengembalikan `"UNIV"` untuk IGCSE, O Level, AS/A Level, AP, dan Nasional. Jadi seorang siswa Cambridge O Level 15 tahun tersimpan sebagai **`UNIV`** (jenjang universitas) di kartu murid, ekspor CSV, dan laporan. Pencarian topik tidak ikut rusak (filter level memakai `curriculum`, bukan `level`), tetapi:
- konteks jenjang hilang di laporan & backup,
- `inferMypLevel("UNIV")` → `null`, jadi fitur apa pun yang kelak bersandar pada `level` akan mati untuk kurikulum non-IB.

---

## 4. HASIL SETELAH P0 (diimplementasikan 2026-09-13, v1.74.0)

Bagian ini ditulis **setelah** pekerjaan selesai dan menggantikan angka §3 sebagai keadaan terkini. Angka §3 dipertahankan sebagai riwayat "sebelum".

### 4.1 Cakupan naik dari 64 → 93 mapel (tanpa menambah satu topik pun)

Tidak ada satu baris data topik yang ditambahkan — perbaikannya murni penyeragaman nama. Angka diukur dari kode yang sudah dirilis:

| Kurikulum | Sebelum | Sesudah | Catatan |
|---|---|---|---|
| IB MYP | 2/8 | 2/8 | inti MYP (Language & Literature, Arts, PHE, Design) memang belum punya katalog |
| IB DP | 21/36 | **26/36** | Group 1/2 bahasa kini menemukan katalognya |
| Cambridge IGCSE | **0/30** | **14/30** | dari nol total menjadi 14 |
| Cambridge O Level | 7/18 | 7/18 | 3 mapel ber-kode yang dipakai tutor sudah tercakup sejak awal |
| Cambridge AS/A Level | 8/22 | **9/22** | |
| AP | 14/34 | **24/34** | pemetaan antar-mapel AP selevel |
| National | 12/19 | 11/19 | turun 1 karena Matematika dipisah dari Mathematics (**memperbaiki kebocoran**, lihat §4.3) |
| **Total** | **64/167 (38%)** | **93/167 (56%)** | |

### 4.2 Bukti perilaku pencarian (sebelum → sesudah)

| Mapel + kueri | Sebelum | Sesudah |
|---|---|---|
| `Mathematics (0580)` + "algebra" | 12 hasil: **O Level, MYP 1, MYP 5** | **8 hasil, semuanya IGCSE** |
| `Biology (0610)` + "cell" | 12 hasil: **DP, AP, O Level, A Level** | **4 hasil, semuanya IGCSE** |
| `Bahasa Indonesia A` (DP) + "teks" | 12 hasil: **SMA 10, SMA 11, MYP 3-4** | fokus ke katalog bahasa Indonesia |
| `Global Politics` (DP) + "power" | 8 hasil termasuk **Matematika MYP 5 "power rule"** | **0 hasil** — mapel ini memang belum punya katalog, dan aplikasi mengatakannya |
| `Matematika` (Nasional) + "bilangan" | bisa memuat **"Mathematics · MYP 1"** | hanya SMP/SMA |
| `English A (Literature)` (DP) + "essay" | hasil bercampur AP/IGCSE | 2 hasil, keduanya **DP** |

Perilaku baru di layar (langkah Materi):
- baris kecil **"Menampilkan topik jenjang IGCSE"** — tutor tahu mengapa daftarnya terbatas;
- bila kosong: **"Tidak ada topik jenjang IGCSE untuk mapel ini."** + dua pilihan sadar: **"Tampilkan topik jenjang lain"** (disertai penanda kuning "Topik di bawah berasal dari DP, AP — bukan jenjang murid ini") atau **"Pakai \"…\" sebagai topik"**;
- hasil dari level lain **tidak pernah lagi** muncul tanpa diminta.

### 4.3 Dua cacat baru yang ketemu saat mengerjakan P0

Dua-duanya **tidak ada** dalam daftar temuan awal, dan keduanya ditemukan karena test penjaga menolak "berlalu":

1. **Kebocoran antar-kurikulum lewat nama mapel kembar.** Rancangan awal menyatukan `Matematika` ↔ `Mathematics`. Ternyata satu himpunan alias yang memuat entri dua kurikulum membuat murid Nasional menerima topik `"Mathematics · MYP 1"` (hard-filter kurikulum hanya menyaring MYP-family). Perbaikan: `Matematika` berdiri sendiri, dan filter kurikulum menolak MYP-family secara eksplisit. Dikunci oleh test `"murid Nasional tidak pernah menerima topik MYP"`.
2. **Alias mati (dead alias).** Beberapa pemetaan "terlihat benar" tetapi tidak pernah menghasilkan topik karena nama yang ditunjuk tidak ada di katalog (mis. `Digital Society`, `English Literature`). Perbaikan: kunci alias dihapus atau diarahkan ulang, dan ditambah penjaga `"setiap kunci alias benar-benar ada di indeks topik"`.

### 4.4 Yang TIDAK dikerjakan di P0 (dan alasannya)

| Hal | Status | Alasan |
|---|---|---|
| Mengisi katalog untuk 74 mapel sisanya | belum | itu P3 dan harus diprioritaskan ke mapel yang benar-benar diajar tutor, bukan dikejar rata |
| Daftar "pilih dari bab" (`browseTopicsForSubjects`) | belum | P1 #7 |
| 3 lapis langkah Kondisi | belum | P2 |
| Perbaikan label jenjang `"UNIV"` (T-07) | belum | butuh migrasi ringan; dicatat tetap terbuka |
| Duplikasi entri kembar di data (ESS/TOK/Math) | **sebagian** | pencarian sudah digabung; entri mentahnya masih terpisah di `IB_TOPICS` (tidak berbahaya, tapi belum dirapikan) |

### 4.5 Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `npm test` (perintah resmi proyek) | **48 berkas / 518 test lulus** (sebelum P0: 47/491 — bertambah 27 test di `topicCoverage.test.ts`) |
| `npx vitest run --config vitest.audit.config.ts` | lulus (49 berkas saat masih memuat satu berkas sementara) |
| `npx tsc -b` | bersih (0 error) |
| `npx eslint src vitest.audit.config.ts` | 0 error / 0 warning |
| Catatan rilis | entri `v1.74.0` ditambahkan di `src/lib/version.ts`, versi di `package.json` dinaikkan ke 1.74.0 |

---

## 5. Kenapa "kondisi les" susah dipilih — 3 sebab

### 5.1 Satu layar, 60 kontrol, tiga model mental (C-01)

| Kelompok | Kontrol | Yang sebenarnya dicatat |
|---|---|---|
| ⚡ Isi cepat | 3 preset + "🔄 Kosongkan" | **preset** |
| 🔥 Semangat Hari Ini | 5 chip mood | **mood** |
| 🫶 Situasi Hari Ini | kolom teks + 7 chip | **konteks** |
| ✨ Indikator Positif | 4 tombol | **perilaku (+2/+1)** |
| ⚠️ Indikator Perlu Perhatian | 8 tombol | **perilaku (−1)** |
| 🧩 Observasi Lanjutan (terlipat) | 16 tag (6 positif, 5 netral, 5 negatif) + 16 tombol ⓘ | **perilaku (valensi ±1, cap ±3)** |
| Gauge | 1 kartu | **skor** |
| **Total** | **60 (22 terlihat + 38 di balik 1 lipatan)** | 4 jenis data berbeda |

Rincian cara menghitung (dikonfirmasi `scripts/tmp-control-density.mjs`): tombol = `4 + 5 + 7 + 4 + 8 + 16 + 16 = 60`; yang **terlihat tanpa membuka apa pun** = `4 + 5 + 7 + 4 + 8 = 22` (gauge bersifat tampilan, bukan kontrol). Bila tombol ⓘ tidak dianggap pilihan (ia hanya penjelas definisi tag), angkanya menjadi **44 total / 22 terlihat**.

Urutannya juga memaksa pekerjaan sia-sia pada hari yang buruk: guru harus melewati **4 tombol positif** dan **8 tombol "perlu perhatian"** — blok positif selalu di atas — sebelum menyentuh hal yang relevan. Pada hari baik, sebaliknya, 8 tombol negatif tidak relevan. Tidak ada satu pun jalur yang membuat mayoritas kasus cepat.

### 5.2 Preset tidak bisa dipercaya (C-02, C-03)

Baca ulang ketiga tombolnya:

| Tombol | Kode | Yang terjadi |
|---|---|---|
| ✨ Lancar | `applyPreset({ prepared:true, focused:true, activeAsking:true }, "Fokus")` | 3 indikator **+1..+2** dinyalakan; mood diisi "Fokus" |
| 😐 Biasa | `applyPreset({}, "Biasa")` | **tidak ada indikator berubah**; hanya mood diisi "Biasa" |
| 😴 Kurang Fit | `applyPreset({ drowsy:true }, "Lelah")` | 1 indikator **−1** dinyalakan; mood diisi "Lelah" |

Tiga masalah:
1. **"Biasa" adalah tombol yang hampir tidak melakukan apa-apa** tetapi diberi bobot visual sama dengan dua tombol lain. Tutor yang mengetuknya mengira sudah mencatat "hari biasa" — padahal kolom perilaku tetap kosong, sehingga sesi ini **tidak masuk** statistik "Main HP 0%", "Siap 0%" di kartu Keseriusan Belajar. Statistik itu lalu dihitung atas subset sesi yang kebetulan diisi, bukan atas semua sesi.
2. **"Lancar" mengklaim observasi yang belum tentu terjadi.** `activeAsking` dan `quickLearner` adalah hasil pengamatan, bukan efek samping dari "hari berjalan lancar".
3. **Preset lain sebelumnya pernah menghapus data** dan sejak audit lalu diubah jadi aditif (`useEngagement.ts:93-104`) — keputusan itu benar untuk keamanan data, tetapi menyisakan masalah baru: sekarang "preset" dan "indikator" adalah **dua cara berbeda** untuk menulis kolom yang sama, tanpa satu pun petunjuk di layar tentang mana yang mengalahkan mana.

### 5.3 Skor mencerminkan kelengkapan isian, bukan kondisi murid (C-04, C-05, C-06)

```
score = 1..10 clamp dari(  5 + Σ(positif: +2/+1) − Σ(negatif: −1)
                          + tag perilaku (cap ±3)
                          + respons akademik (+2/+1/0/−1/−2)
                          + mood ("Semangat" +1, "Kesulitan" −1)  )
```

Konsekuensi yang terukur dari kode:
- **Dasar 5 sudah berarti "Cukup"** (`scoreLabel(5)` → `"Cukup"`, warna amber). Jadi sesi yang datanya paling tipis pun tampil sebagai "Cukup 5/10" — dan itulah status yang paling sering muncul.
- **Sesi tanpa engagement sama sekali = `0`** (`score = hasEngagementInput ? … : 0`), bukan 5. Artinya "0" bukan "murid tidak fokus", melainkan "tidak diisi".
- **Mood menggeser skor perilaku**, dan **tag 🌟 Antusias** (perilaku) dapat +1 yang sama dengan mood "Semangat" — satu pengamatan, dua tambahan bila tutor mengisi keduanya.
- **Skor muncul SEBELUM kualitas respons diisi** (`STEPS`: Kondisi = langkah 3, Detail = langkah 4), sementara `responseTag` ikut menentukan skor. Guru melihat `7/10`, lanjut ke langkah 4, memilih "Miskonsepsi" (−2), dan angka yang tadi dilihatnya ternyata bukan angka akhir.
- **Skor akhir disimpan sebagai snapshot** (`engagement.score`), jadi perubahan definisi skor di masa depan tidak dapat dibandingkan dengan sesi lama.

Efek turunannya di layar lain: kartu **Keseriusan Belajar** (`EngagementSummary.tsx`) menampilkan satu angka rata-rata + "rata-rata Main HP X%", dihitung dari sesi yang punya data engagement. Bila tutor mengisi kondisi hanya pada separuh sesi (persis yang didorong oleh desain saat ini), angka-angka itu adalah **rata-rata atas separuh data tanpa keterangan apa pun** tentang separuh yang hilang.

---

## 6. Usulan alur — yang diusulkan berubah dan SUDAH dipakai

> ⚠️ **Semua usulan di bagian ini sudah diimplementasikan** (v1.75.0). Bagian ini dipertahankan sebagai riwayat: ia menjelaskan **alasan** di balik desain yang sekarang dipakai, bukan pekerjaan yang tersisa. Yang belum dikerjakan hanya dua hal, dan keduanya tercatat di [`../README.md`](../README.md) §3 (poin 5–6).

### 6.1 Langkah 2 "Materi": dari *mencari* menjadi *memilih*

Prinsip: 90% sesi membahas topik yang **berdekatan dengan sesi sebelumnya**. Jadi layar harus menawarkan topik itu lebih dulu, dan memberi daftar untuk dibaca ketika tutor ingin keluar dari jalur.

```
┌─ 🎯 Topik ─────────────────────────────────────────────┐
│ [🔎 Cari topik…                              ]  ⌨️     │
│                                                        │
│ ↩ Sesi lalu (12 Agu) — sekali ketuk untuk pakai lagi   │
│ ( Integral tertentu & FTC ) ( Luas area kurva )        │
│                                                        │
│ 📚 Pilih dari daftar            MYP 5 · Mathematics    │
│ ▾ Bab 5 — Integral                                     │
│    ☐ Integral — antiturunan dasar                      │
│    ☐ Integral tertentu & Fundamental Theorem           │
│    ☑ Luas area antara dua kurva                        │
│    ☐ Volume benda putar (disc method)                  │
│ ▸ Bab 6 — Statistika                                   │
│ ▸ Bab 1 — Fungsi & relasi                              │
│                                                        │
│ ✏️ Topik lain (ketik sendiri)                          │
│ Terpilih: Luas area antara dua kurva ×                 │
└────────────────────────────────────────────────────────┘
```

Perubahan perilaku yang diusulkan:

| Sekarang | Diusulkan | Alasan |
|---|---|---|
| Hanya kotak cari; hasil = 12 baris datar | Daftar unit → topik (accordion), unggulan = level murid | Menghapus kebutuhan menebak kata kunci |
| `browseTopicsForSubjects()` tidak dipakai | Dipakai sebagai sumber daftar (sudah siap, hanya perlu dihubungkan) | 0 pekerjaan data baru |
| Tidak tahu topik sesi lalu | Chip "sesi lalu" dari 1–3 sesi terakhir murid | 1 ketuk untuk kasus paling umum |
| Topik = string bebas | Topik tetap string **+ opsional `unit`** disimpan | Kompatibel mundur, tetapi mulai bisa direkap |
| Hasil level lain menyelinap tanpa keterangan | Level lain hanya muncul di blok terpisah berlabel: **"⚠️ Bukan level murid (kelas lain)"** dan tidak masuk pilihan utama | Pencegahan salah catat |

### 6.2 Langkah 3 "Kondisi": 3 lapis, jujur, dan bisa dibatalkan

```
┌─ 🫶 Bagaimana kondisi les hari ini? ───────────────────┐
│                                                        │
│  LAPIS 1 — pilih satu, ini sudah cukup                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ ✅ Berjalan   │ │ 😐 Seperti   │ │ ⚠️ Berat     │    │
│  │    lancar     │ │    biasa     │ │    hari ini  │    │
│  │ tanpa catatan │ │ tanpa catatan│ │ (tandai sebab│    │
│  │ khusus        │ │ khusus       │ │  di bawah)   │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                        │
│  LAPIS 2 (opsional) — ada yang perlu dicatat?          │
│  ▾ Kondisi khusus   [🫶 Situasi hari ini / teks bebas] │
│  ▾ Yang menonjol hari ini                              │
│     (📱 Main HP) (😴 Mengantuk) (📚 Sudah siap)  …     │
│     hanya 6 yang paling sering dipakai, sisanya di     │
│     "+ 8 lainnya"                                      │
│                                                        │
│  LAPIS 3 (opsional) — lebih rinci                      │
│  ▾ Respons & observasi akademik  → hasilkan sendiri    │
│     saran "Fokus perbaikan"                            │
│                                                        │
│  ℹ️ Yang tidak Anda tandai dicatat sebagai              │
│     "tidak diamati" — bukan "tidak terjadi".            │
│     Skor akhir hanya muncul setelah dicatat.            │
└────────────────────────────────────────────────────────┘
```

Perubahan yang diusulkan, satu per satu:

| # | Sekarang | Diusulkan | Alasan |
|---|---|---|---|
| 1 | "Lancar / Biasa / Kurang Fit" mengisi mood + indikator | Tiga pilihan kondisi yang **eksplisit**: menulis satu nilai `engagementLevel` (`lancar`/`biasa`/`berat`) dan **tidak** mengklaim indikator apa pun | Menghapus klaim palsu & tombol tanpa efek |
| 2 | "Biasa" tidak melakukan apa pun | "Seperti biasa" tersimpan sebagai fakta ("tidak ada yang khusus") | Statistik jadi jujur: "12 sesi biasa, 3 sesi berat", bukan "12 sesi kosong" |
| 3 | Mood (5 chip) punya bobot skor | Mood dipisah dari skor: **suasana** (mood) vs **perilaku** (indikator) vs **konteks** (situasi) | Satu maksud, satu kontrol |
| 4 | 12 indikator selalu terlihat, 16 tag di balik lipatan | 6 indikator yang **benar-benar dipakai** tampil depan (urut dari yang paling sering dipakai tutor Anda), sisanya di "lainnya" | 22 kontrol → 6 pada layar pertama |
| 5 | Mood "Semangat" memakai ikon 🌟 yang sama dengan tag perilaku "Antusias", dan 😴 dipakai mood "Lelah" sekaligus indikator "Mengantuk" | Setiap kontrol punya ikon unik (satu ikon = satu maksud) | Menghapus kebingungan 🌟 (mood) vs 🌟 (perilaku) yang berujung pencatatan ganda |
| 6 | Skor tampil sebelum langkah 4 diisi | Skor/gauge pindah ke langkah terakhir sebelum simpan, atau tampil sebagai "sementara" dengan penanda | Angka yang dilihat = angka yang disimpan |
| 7 | Sesi tanpa data → `0`, sesi tipis → `5` | `engagement.score` **tidak diisi** bila tidak ada pengamatan; `null` ≠ `5` | `avg` & tren hanya dihitung atas data yang benar-benar ada |
| 8 | Tidak ada info bahwa data lama tidak bisa diperiksa | `SessionDetailModal` menampilkan **12 indikator + 16 tag + situasi**, dan bisa dikoreksi dari modal itu | Temuan bertahan hanya bila bisa diverifikasi |

> Catatan implementasi untuk #7: `score: number` saat ini wajib di dalam `EngagementLog`. Usulan: pertahankan `score` untuk kompatibilitas (tetap dihitung & disimpan apa adanya), tetapi tambahkan **`scoreBasis: "full" | "partial" | "none"`** dan **`engagementLevel`**. Dengan begitu laporan bisa berkata "rata-rata 7/10 dari 14 sesi berdata lengkap; 9 sesi lain tidak mencatat kondisi" — tanpa memutus komparabilitas data lama dan tanpa migrasi schema yang berisiko.

### 6.3 Rumus skor: dari "satu angka" ke "pola"

Masalah terdalam dari model sekarang bukan angkanya, tapi **satu angka dipakai untuk menjawab tiga pertanyaan berbeda**: apakah murid hadir siap? apakah murid fokus? apakah pemahamannya sampai? Usulan: pisahkan jadi dua sumbu yang tidak saling menutupi.

```
Sumbu 1 — Kehadiran & Fokus      (dari 12 indikator perilaku)
  Siap (+2) · Fokus (+1) · Aktif bertanya (+1) · Cepat paham (+1)
  Main HP (−1) · Mengantuk (−1) · Perlu diulang (−1) · PR tidak buat (−1)
  Telat (−1) · Sering ke toilet (−1) · Gelisah (−1) · Sibuk sendiri (−1)

Sumbu 2 — Kualitas Respons Akademik   (dari RESPONSE_TAGS, pilih SATU)
  Benar mandiri (+2) · Benar + petunjuk (+1) · Paham lisan (+1)
  Coba soal baru (+1) · Sadar kelemahan (+1) · Sebagian benar (0)
  Hafal prosedur (0) · Menebak (−1) · Miskonsepsi (−2) · Fondasi berlubang (−2)

Tampilan untuk tutor (bukan satu angka):
  Fokus:    ███████░░░  7/10      (12 sesi tercatat, 3 tidak dicatat)
  Respons:  ██████████  "Benar mandiri" (5×) · "Miskonsepsi" (2×)
```

Keuntungan praktis: bila murid dapat "Miskonsepsi", guru tetap melihat sisi positif (fokus 7/10) yang sekarang **tertutup** oleh −2 pada satu angka gabungan. Dan bila kondisi tidak dicatat, sisi itu disebut **"tidak dicatat"** — bukan diisi 5.

---

## 7. Rencana perbaikan & prioritas

### P0 — Memperbaiki yang sudah rusak (tanpa migrasi data) — ✅ SELESAI 2026-09-13 (v1.74.0)

| # | Pekerjaan | Berkas | Status |
|---|---|---|---|
| 1 | `normalizeSubject()`: buang kode `(####)`, samakan `&`/huruf besar-kecil/diakritik, satukan `ESS`/`Environmental Systems & Societies`, `TOK`/`Theory of Knowledge`, `Math`/`Mathematics` | `lib/ibTopics.ts` | ✅ selesai |
| 2 | Pakai normalisasi itu di `resolveSubjectAliases()` → dipakai oleh `searchTopics()` **dan** `browseTopicsForSubjects()` | `lib/ibTopics.ts` | ✅ selesai |
| 3 | Hilangkan *fallback* lintas-level yang senyap; bila hasil level murid kosong, tampilkan **pesan + pilihan sadar** ("Tidak ada topik IGCSE untuk mapel ini" + tombol "Tampilkan topik jenjang lain") | `searchTopicsExpanded()` + UI langkah 2 | ✅ selesai |
| 4 | Jangan pakai pencocokan kata longgar untuk bonus mapel (T-04); bila mapel diketahui, **saring** ke mapel itu, jangan sekadar memberi bonus | `searchTopics()` | ✅ selesai |
| 5 | **Test penjaga**: setiap mapel di setiap kurikulum harus punya topik di levelnya — gagal bila ada yang kosong (kecuali di daftar pengecualian sadar) | `src/__tests__/topicCoverage.test.ts` (berkas baru) | ✅ selesai |
| 6 | Kode mati: `getStudentMypLevel` dihapus; `getStudentGradeLabel` **dipakai** untuk baris "Menampilkan topik jenjang …" di langkah Materi | `lib/ibTopics.ts` + `CaptureSession.tsx` | ✅ selesai |

> **Hasil:** cakupan naik **64 → 93 dari 167 mapel** tanpa menambah satu topik pun ke katalog; 2 cacat baru ditemukan & diperbaiki (§4.3). Rincian angka: §4. Dua pekerjaan tambahan yang muncul di luar rencana: memperkuat filter kurikulum (menolak MYP-family secara eksplisit) dan penjaga "alias tidak boleh menunjuk mapel yang tidak ada di katalog".

### P1 — Membuat topik bisa dipilih, bukan ditebak — ✅ SELESAI (v1.75.0)

| # | Pekerjaan | Status |
|---|---|---|
| 7 | Hubungkan `browseTopicsForSubjects()` ke UI: accordion Unit → topik (checkbox), maks 8 unit | ✅ panel "📚 Pilih dari daftar bab" di langkah Materi — daftar dihitung **saat panel dibuka** (bukan tiap render, karena menyaring 1.538 topik), tiap bab bisa dibuka/tutup + penghitung topik terpilih |
| 8 | Chip "Topik sesi lalu" untuk murid terpilih (ambil dari 3 sesi terakhir) | ✅ `useStudentBrief` memakai `getRecentDoneSessions(id, 3)`; maks 6 chip unik |
| 9 | Simpan `unit` (opsional) bersama `topic` → bisa direkap per bab | ✅ `Session.topicUnit` + `CaptureDraftForm.topicUnit`; terisi hanya bila topik dipilih dari daftar (topik bebas memang tidak punya bab); tampil di chip dan detail sesi |
| 10 | Perbaiki `Level` (T-07) | ✅ `Level` + `levelForCurriculum()` + `levelLabel()`; `StudentForm` memakai pemetaan baru (SMP/SMA dihitung dari kelas); `Students.tsx` menampilkan label; **`STUDENT_LEVELS` di validasi backup diperluas** (sebelumnya backup berisi murid IGCSE/O Level/A Level/AP/SMP/SMA akan DITOLAK saat restore) + test penjaga |

### P2 — Kondisi les: 3 lapis — ✅ SELESAI (v1.75.0)

| # | Pekerjaan | Status |
|---|---|---|
| 11 | `engagementLevel` + `scoreBasis` | ✅ tipe di `db/types.ts` (tanpa bump schema — kolom non-indexed), dihitung `engagementScoreBasis()`, disimpan di jalur create/update/mark-done, dan di DRAF |
| 12 | 3 tombol kondisi eksplisit; hapus klaim indikator otomatis | ✅ "Berjalan lancar / Seperti biasa / Berat hari ini" — menyimpan satu fakta, **tidak** menyentuh indikator. `applyPreset` dihapus dari hook |
| 13 | 6 indikator terdepan + sisanya di "lainnya" | ✅ `PRIMARY_ENGAGEMENT_FLAGS` (fokus, cepat paham, aktif bertanya, sudah siap, main HP, mengantuk — urutan dari data nyata) + `SECONDARY_ENGAGEMENT_FLAGS` |
| 14 | Gauge skor pindah ke akhir langkah 4 | ✅ kartu "Skor sesi" di akhir langkah Detail, menyebut dasar 5/10 dan kelengkapan data |
| 15 | Mood keluar dari skor; ikon unik | ✅ `calcEngagementScore` tidak lagi membaca mood; `MOODS` pindah ke `lib/moods.ts` dengan ikon unik (dulu 🌟 dan 😴 dipakai dua kontrol) |
| 16 | `SessionDetailModal`: 12 indikator + 16 tag + koreksi | ✅ panel "Kondisi & observasi sesi" menampilkan ke-12 indikator, 16 tag, dan respons akademik; tombol "✏️ Koreksi" mengedit semuanya dan menghitung ulang skor lewat `updateSession` |

### P3 — Membuat laporan jujur — ✅ SELESAI (v1.75.0)

| # | Pekerjaan | Status |
|---|---|---|
| 17 | Cakupan data + dua sumbu di kartu Keseriusan Belajar | ✅ rata-rata selalu berpenyebut, panel kuning "Cakupan data X%" (menyebut berapa sesi tanpa pengamatan), dan grafik batang sebaran kualitas respons akademik; panel "Insight" juga menyebut penyebutnya |
| 18 | Ekspor menandai topik tanpa unit / skor tanpa dasar | ✅ kolom baru **"Bab Topik"** dan **"Sumber Skor"** (lengkap / sebagian / tidak ada pengamatan / tidak diketahui (data lama)); kolom jenjang murid memakai `levelLabel()` |
| 19 | Perluas katalog topik | bertahap — tetap terbuka, dan `KNOWN_TOPIcless` di test penjaga mendokumentasikan 74 mapel yang belum punya katalog |
| 12 | Ganti blok "Isi cepat" dengan 3 tombol kondisi yang eksplisit; hapus klaim indikator otomatis | ±3 jam |
| 13 | Susun ulang: 6 indikator terdepan (urut frekuensi pemakaian nyata) + "+6 lainnya"; 16 tag tetap di lapisan 3 | ±4 jam |
| 14 | Pindahkan gauge skor ke akhir langkah 4 (setelah respons akademik dipilih) | ±2 jam |
| 15 | Mood keluar dari perhitungan skor; satu ikon unik per kontrol | ±1 jam |
| 16 | `SessionDetailModal`: tampilkan 12 indikator + 16 tag + situasi, dan izinkan koreksi | ±3 jam |

### P3 — Membuat laporan jujur — ✅ SELESAI (v1.75.0)

| # | Pekerjaan | Status |
|---|---|---|
| 17 | `EngagementSummary`: cakupan data + dua sumbu | ✅ lihat tabel di atas |
| 18 | Ekspor menandai topik tanpa `unit` & skor tanpa dasar | ✅ lihat tabel di atas |
| 19 | Perluas katalog topik untuk mapel yang benar-benar diambil murid | bertahap — tetap terbuka |

---

## 8. Kriteria penerimaan (status akhir 2026-09-13, v1.75.0)

**Topik**

1. ✅ Tutor memilih `Mathematics (0580)` untuk murid IGCSE → daftar menampilkan topik **level IGCSE** (bukan O Level, bukan MYP), tanpa mengetik.
2. ✅ Murid MYP dengan mapel **Language & Literature** → aplikasi menyatakan dengan jelas bahwa katalog untuk mapel ini belum tersedia, dan menawarkan topik bebas **atau** topik jenjang lain (dengan penanda eksplisit) — tanpa menyamarkan yang satu sebagai yang lain.
3. ✅ Setiap penambahan mapel baru ke `ibSubjects.ts` yang belum punya topik **menggagalkan test** dengan pesan yang menyebut nama mapelnya.
4. ✅ Memilih topik dari **daftar bab** menghasilkan string identik dengan yang dipakai pencarian (keduanya memakai `TopicEntry.topic` apa adanya), sehingga memilih topik yang sama pada dua sesi berbeda tidak membuat dua topik berbeda.
5. ✅ Setiap topik yang dipilih dari daftar bab menyimpan `unit`-nya (`Session.topicUnit`).

**Kondisi**

6. ✅ Sesi dengan hanya "Berjalan lancar" tersimpan dengan `engagement.level: "lancar"`, **tanpa** satu pun indikator perilaku yang diklaim, dan sesi itu **mencatat kondisi** (tersimpan sebagai fakta) meski skornya 0.
7. ✅ Sesi tanpa satu pun data kondisi menyimpan `engagement.score: 0` + `scoreBasis: "none"`; `sessionEngagementScore()` mengembalikannya sebagai *undefined* sehingga **tidak** ikut rata-rata. (Catatan: skema tetap memakai `score: number` = 0, bukan `undefined`, demi kompatibilitas `EngagementLog` yang sudah ada — perilaku "tidak masuk rata-rata" yang menjadi tujuannya sudah tercapai.)
8. ✅ Rata-rata di kartu Keseriusan Belajar selalu disertai penyebutnya ("rata-rata dari N sesi"), termasuk di panel "Insight" dan kartu laporan bulanan.
9. ✅ Skor yang dilihat tutor (kartu "Skor sesi" di akhir langkah Detail) dihitung dari state yang sama dengan yang disimpan (`engScore` dari `useEngagement`).
10. ✅ Ke-12 indikator (termasuk ⏰ 🚻 🦘 🙈) dan 16 tag perilaku **terlihat** di detail sesi dan bisa dikoreksi.

**Verifikasi rilis**

11. ✅ Seluruh test lulus — **49 berkas / 530 test** (`npm test`), `tsc -b` bersih, `eslint src` 0 error/0 warning, `npm run build` sukses (SW dibuat).

---

## 12. HASIL SETELAH P1–P3 (diimplementasikan 2026-09-13, v1.75.0)

### 12.1 Langkah Materi: dari mencari menjadi memilih

| Sebelum | Sesudah |
|---|---|
| Hanya kotak pencarian | Kotak pencarian **+ panel "📚 Pilih dari daftar bab"** (accordion per bab, kotak centang per topik, penghitung topik terpilih) |
| Tidak ada jalan pintas | Chip **"↩ Topik sesi lalu"** dari 3 sesi terakhir murid (maks 6 topik unik) |
| Topik = string tanpa konteks | Chip topik menampilkan **babnya**; `Session.topicUnit` tersimpan dan tampil di detail sesi |
| `browseTopicsForSubjects()` tidak pernah dipanggil | Dipanggil dari panel; perhitungannya **ditunda sampai panel dibuka** supaya tidak menyaring 1.538 topik setiap render |

Catatan teknis: daftar bab mengikuti mapel + jenjang murid, dan bila katalog untuk jenjang itu kosong panelnya menjelaskan alasannya (memakai meta pencarian yang sama).

### 12.2 Langkah Kondisi: 60 → 11 kontrol di layar pertama

| | Sebelum | Sesudah |
|---|---|---|
| Lapis 1 | 3 preset + "Kosongkan" (2 di antaranya mengklaim indikator / tidak melakukan apa pun) | **3 tombol kondisi eksplisit** (lancar / biasa / berat) — menyimpan fakta, skor tidak berubah |
| Lapis 2 | 5 mood + 7 chip situasi + **12 indikator** selalu terlihat | **6 indikator terdepan** + "+6 indikator lain" (terlipat) + mood (ikon unik) + situasi |
| Lapis 3 | 13 + 3 tag di lipatan yang sama | 16 tag observasi perilaku (tetap terlipat, kini dijelaskan tujuannya) |
| Kontrol terlihat di layar pertama | **22** | **11** (3 kondisi + 6 indikator + tombol "indikator lain" + teks bantuan) |
| Skor | Tampil di langkah 3 (angka bisa berubah lagi di langkah 4) | Tampil di **akhir langkah 4** = angka final yang disimpan |

### 12.3 Skor & laporan: dari satu angka menjadi pola + penyebut

```
Sebelum:  rata-rata 7/10            ← dari sesi mana? tidak disebut
Sesudah:  rata-rata 7/10
          "14 dari 23 sesi berdata"  ← penyebut wajib
          + panel: "Cakupan data 61%. 9 sesi tercatat tanpa pengamatan
            kondisi, jadi tidak ikut rata-rata."
          + sumbu kedua: sebaran kualitas respons akademik (5 teratas)
```

Perubahan perilaku yang paling penting: **sesi tanpa pengamatan tidak lagi menjadi "Cukup 5/10"**. Pada data nyata tutor (ekspor 2026-08-23, 1.238 sesi) hanya **8 sesi** yang memakai indikator terstruktur — artinya sebelum perbaikan ini, hampir seluruh rata-rata "keseriusan belajar" dihitung dari angka semu. Sekarang sesi tanpa pengamatan dikeluarkan dari rata-rata dan jumlahnya dilaporkan terbuka.

### 12.4 Detail sesi kini bisa diperiksa *dan* dikoreksi

Empat indikator (⏰ Telat, 🚻 Sering ke toilet, 🦘 Gelisah, 🙈 Sibuk sendiri) sebelumnya **tidak pernah tampil** di mana pun setelah disimpan — padahal keempatnya ikut menentukan skor. Sekarang detail sesi menampilkan ke-12 indikator, 16 tag observasi, respons akademik, kondisi, dan suasana; tombol "✏️ Koreksi" mengedit semuanya dan menghitung ulang skor.

### 12.5 Jenjang murid tidak lagi "UNIV"

| Kurikulum | Level sebelum | Level sesudah |
|---|---|---|
| Cambridge IGCSE / O Level / AS / A Level / AP / National | **semua "UNIV"** | IGCSE / O Level / A Level / AP / SMP–SMA (SMP/SMA dihitung dari kelas) |
| Custom | UNIV | UNIV (memang tidak diketahui) |

Ikut diperbaiki: **validasi backup** (`STUDENT_LEVELS`) yang sebelumnya hanya mengenal MYP/IBDP/UNIV — artinya **backup berisi murid IGCSE/O Level/A Level/AP/SMP/SMA akan DITOLAK saat restore**. Ini cacat yang tidak terlihat sebelum P1 #10 dikerjakan, dan sekarang dikunci test.

Data seed dev juga diselaraskan: murid IGCSE/AP/Nasional dulu punya `level` yang bertolak belakang dengan `curriculum`-nya dan mapel berbentuk pendek ("Calculus AB") yang tidak ada di picker — sehingga demo memperlihatkan pencarian topik yang selalu kosong.

### 12.6 Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `npm test` | **49 berkas / 530 test lulus** (v1.74.0: 48/518 — bertambah 12 test) |
| `npx tsc -b` | bersih |
| `npx eslint src` | 0 error / 0 warning |
| `npm run build` | sukses, `dist/sw.js` dibuat |
| Catatan rilis | entri `v1.75.0` di `src/lib/version.ts` |

### 12.7 Yang **tetap** belum dikerjakan (jujur)

| Hal | Status |
|---|---|
| Katalog untuk 74 mapel yang belum punya topik (mis. Arts MYP, Group 6 DP, ICT IGCSE) | terbuka — didokumentasikan di `KNOWN_TOPIcless` (`topicCoverage.test.ts`), bukan disembunyikan |
| Tombol "6 indikator terdepan" belum dipersonalisasi dari riwayat tutor sendiri | hanya 8 sesi data terstruktur yang tersedia, jadi urutannya masih manual; fungsinya siap bila data cukup |
| Narasi WA ke ortu belum memakai kondisi/lapisan baru | sengaja: pesan ke ortu hanya memuat ringkasan sesi (privasi), dan tidak berubah di rilis ini |

---

## 13. Yang **tidak** saya usulkan

| Usulan yang menggoda | Kenapa tidak |
|---|---|
| Melengkapi katalog 1.538 → ±3.000 topik lebih dulu | Menghabiskan waktu di 74 mapel yang mungkin tidak pernah Anda ajar; P0 menghidupkan 29 mapel di antaranya tanpa satu baris data baru (§4.1) |
| Menghapus skor engagement sepenuhnya | Skor sudah dipakai di template laporan, narasi AI, WA ortu, dan ekspor; menghapusnya berarti memutus komparabilitas. Cukup dipisah menjadi dua sumbu + penanda cakupan data |
| Mengubah 12 indikator menjadi 24 (lebih rinci) | Kepadatan kontrol adalah masalahnya, bukan kekurangan pilihan. Arah yang benar adalah **kurangi yang terlihat**, bukan tambah |
| Menjadikan `topic` sebagai ID katalog (bukan string) | Butuh migrasi untuk data yang sudah ada; `unit` opsional memberi 80% manfaatnya tanpa risiko |
| Menautkan mapel berbeda bidang agar cakupan terlihat 100% (mis. Global Politics → History) | Justru mengembalikan cacat T-03 dalam bentuk baru: topik salah bidang tercatat sebagai topik murid. Kosong yang jujur lebih aman (§4.3) |

---

## 14. Keterbatasan audit (yang harus dibaca sebelum mengutip angka)

1. **Audit ini tidak menjalankan aplikasi.** Berbeda dari audit C-01…C-17 di arsip (yang mengukur DOM hidup: `elementFromPoint`, kontras hasil render, `MutationObserver`), semua angka di sini berasal dari **kode sumber, inventaris data, dan aturan pencarian yang dijalankan langsung lewat test**. Konsekuensinya: klaim tentang **perilaku runtime** (mis. "lama menggulir langkah Kondisi", "pesan kuning ini benar-benar terlihat di ponsel") adalah pembacaan kode — **belum diukur di layar**. Setelah P0, angka §4 diukur dengan menjalankan fungsi aslinya (`src/__tests__/topicCoverage.test.ts`), bukan simulasi.
2. **Kepadatan kontrol dihitung dari literal sumber.** `4 + 5 + 7 + 4 + 8 + 16 + 16 = 60` adalah definisi saya (16 tag perilaku = 16 tombol tag + 16 tombol ⓘ). Bila tombol ⓘ tidak dihitung sebagai pilihan (ia hanya penjelas definisi), totalnya **44** dan layar pertama tetap **22**. Kedua angka dilaporkan agar tidak menyesatkan.
3. **Angka cakupan memakai definisi ketat**: mapel dianggap punya topik hanya bila ada entri dengan **nama mapel yang cocok setelah alias** pada **level kurikulum murid**. Angka "sebelum" (64/167) memakai aturan lama yang memakai pencocokan kata longgar untuk alias; angka "sesudah" (93/167) memakai penyaringan ketat — jadi kenaikannya bukan sekadar efek definisi, sebab aturan barunya justru **lebih ketat**.
4. **Data nyata hanya tersedia sampai 2026-08-23** (1.273 baris sesi). Frekuensi pemakaian indikator/topik sesudah tanggal itu belum diukur — padahal usulan #13 ("6 indikator terdepan") sebaiknya memakai frekuensi tersebut.
5. **Penjaga cakupan bergantung pada daftar `KNOWN_TOPIcless`** di dalam test. Daftar itu adalah pengakuan sadar, bukan bukti kualitas: 74 mapel di dalamnya memang belum punya katalog. Bila daftar itu ditambah tanpa alasan, penjaganya kehilangan gigi — karena itu setiap entrinya diberi komentar alasan.
6. **Skrip pengukuran satu kali sudah dihapus** dari `scripts/` agar repo bersih. Semua angka §4 dapat direproduksi ulang lewat test penjaga (§1), tetapi angka §3 (keadaan "sebelum") hanya tersisa sebagai riwayat di dokumen ini.

---

## 15. Status akhir & sisa pekerjaan (dokumen ini SUDAH diarsipkan)

**Status: SELESAI** — P0 (v1.74.0) dan P1–P3 (v1.75.0) sudah dirilis. Dokumen ini dipindah ke `arsip/` pada 2026-09-13 atas permintaan pemilik aplikasi; sesuai kebijakan arsip, **isinya dibekukan** dan yang berubah hanya rujukan path.

| Syarat | Status |
|---|---|
| (a) P0 dikerjakan beserta test penjaga | ✅ v1.74.0 (§4, §7) |
| (b) P1 #7–#9 dikerjakan — tutor bisa **memilih** topik dari daftar bab | ✅ v1.75.0 (§12.1) |
| (c) P2 (kondisi 3 lapis + skor jujur) dikerjakan | ✅ v1.75.0 (§12.2–12.4) |
| (d) angka sebelum/sesudah dari aplikasi yang dijalankan | ⚠️ sebagian — §4 diukur dari fungsi aplikasi lewat test; §12 adalah pembacaan kode (jumlah kontrol, alur), **belum diukur di layar** |

**Dua sisa pekerjaan dari audit ini TIDAK hilang** — keduanya dipindahkan ke daftar kerja aktif [`../README.md`](../README.md) §3:

1. **Verifikasi manual alur baru (12 langkah)** — tabel di bawah. Selama ini belum dijalankan karena audit dikerjakan tanpa membuka aplikasi.
2. **Katalog topik untuk 74 mapel yang belum punya** (P3 #19) — terdaftar sadar di `KNOWN_TOPIcless` (`src/__tests__/topicCoverage.test.ts`).

**Daftar periksa manual (10 menit)** — dipakai untuk menutup butir (d):

| # | Langkah | Yang diharapkan |
|---|---|---|
| 1 | Catat Sesi → murid **Cambridge IGCSE** → mapel ber-kode → langkah Materi → ketik `algebra` | Baris "Menampilkan topik jenjang IGCSE"; hasil **hanya** topik IGCSE |
| 2 | Buka **"📚 Pilih dari daftar bab"** | Daftar bab muncul; membuka satu bab menampilkan topik dengan kotak centang; memilih satu topik menambahkannya sebagai chip **beserta nama babnya** |
| 3 | Tutup-buka panel, lalu pilih topik yang sama dari **pencarian** | String topik identik (tidak muncul dua chip berbeda) |
| 4 | Ganti mapel ke yang katalognya belum ada (mis. `Global Perspectives (0457)`) → ketik `essay` | Kotak kuning "Tidak ada topik jenjang IGCSE…" + tombol "Tampilkan topik jenjang lain" / "Pakai … sebagai topik"; panel daftar bab pun menjelaskan alasannya |
| 5 | Murid **Nasional** + `Matematika` → ketik `bilangan` | Tidak ada hasil berlabel `MYP` |
| 6 | Murid **IB DP** + `Global Politics` → ketik `power` | **Tidak ada** hasil Matematika (dulu ada) |
| 7 | Langkah Kondisi | Hanya **3 tombol kondisi + 6 indikator** terlihat; "6 indikator lain" membuka sisanya; tombol "😐 Biasa" **sudah tidak ada** |
| 8 | Ketuk "Seperti biasa" saja → lanjut ke langkah Detail | Kartu "Skor sesi" berkata **skor tidak dihitung** + sesi tidak masuk rata-rata |
| 9 | Isi 2 indikator → lanjut ke langkah Detail | Kartu skor menampilkan angka + "kelengkapan data: Sebagian"; **isi pilihan respons akademik** lalu perhatikan angkanya berubah (hanya di langkah ini) |
| 10 | Simpan sesi → buka detail sesi dari tab Riwayat | Semua indikator & tag tampil; tombol "✏️ Koreksi" membuka editor; koreksi tersimpan dan skor berubah |
| 11 | Tab Nilai → kartu Keseriusan Belajar | Ada penyebut ("rata-rata dari N sesi"), panel **cakupan data**, dan grafik **Kualitas Respons Akademik** |
| 12 | Pengaturan → Ekspor CSV | Kolom baru "Bab Topik" dan "Sumber Skor"; kolom Level murid berisi label (mis. "IGCSE · Grade 10"), bukan "UNIV" |
