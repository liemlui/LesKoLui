# TASK-03 — Blueprint UI/UX (induk: peta layar & arah)

> **STATUS:** `todo`
> **PEMILIK:** agen AI + pemilik produk (keputusan ada di pemilik)
> **DIBUAT:** 2026-09-25 · **BASELINE:** v1.75.1 (561 tes / 50 berkas)
> **PERKIRAAN:** 6 langkah × 15–30 menit (dokumen ini **tidak** mengubah kode fitur; ia menetapkan urutan)
> **INDUK:** berkas ini sendiri · **BACA DULU:** [`ATURAN-AI.md`](ATURAN-AI.md) — kontrak kerja, keputusan terkunci, daftar larangan
> **LAMPIRAN VISUAL:** [`docs/mockups/`](../mockups/) (tiga berkas HTML + `_shared.css`)

## 0. Cara pakai berkas ini

- Berkas ini **induk**. Tugas lain (`TASK-04`…`TASK-09`) merujuk ke sini; kalau ada pertentangan,
  yang menang adalah [`docs/arsitektur/11-uiux-ai-cost-dan-privasi.md`](../arsip/arsitektur/11-uiux-ai-cost-dan-privasi.md).
- **Satu langkah per putaran.** Jangan gabung dua langkah.
- Perintah verifikasi wajib dijalankan sesudah **setiap** langkah, bukan di akhir.
- **Hemat token:** jangan membaca berkas >500 baris secara utuh. Pakai jangkar teks yang disebut
  tugas. Jangan membaca berkas tugas lain selain yang sedang dikerjakan.
- Lampiran visual: `docs/mockups/` (tiga berkas HTML + `_shared.css`). Itu **gambar**, bukan kode produksi.

**Perintah verifikasi standar (jalankan dari `les-ko-lui/`):**

```powershell
npx tsc -b        # harapan: tanpa keluaran
npx eslint src    # harapan: tanpa keluaran
npm test          # harapan: 561 lulus (atau lebih), 0 gagal
npm run build     # harapan: built + dist/sw.js
```

> Kegagalan yang **bukan** regresi: `npm test` kadang lebih lambat pada putaran pertama setelah
> `npm install` (vitest menyusun cache). Kalau hanya waktu yang berbeda dan hasilnya lulus, lanjutkan.

## 1. Tujuan & definisi selesai

Aplikasi ini lengkap tetapi **tidak terarah**: 5 tab berbobot sama, 8 blok berebut perhatian di beranda,
dan kerumitan disebar ke depan layar. Tugas ini menetapkan peta barunya — **sebelum** satu baris UI ditulis —
supaya `TASK-04`…`TASK-09` tidak saling bertabrakan.

**Selesai berarti:**

- [ ] Tabel §2 (inventaris layar → nasib) **tidak punya baris berstatus "belum diputuskan"**
- [ ] Setiap keputusan di §2 punya rujukan ke tugas yang mengerjakannya (`TASK-04`…`TASK-09`)
- [ ] Enam prinsip arah di §3 punya **cara periksa** yang bisa dijalankan mesin atau dihitung manual
- [ ] Daftar larangan di §6 disalin apa adanya oleh setiap tugas turunan
- [ ] `docs/README.md` §4.1 memuat baris untuk `TASK-03`…`TASK-09`

## 2. Inventaris layar → nasib (tabel keputusan)

Diukur dari kode v1.75.1. **Tidak ada baris yang boleh dibiarkan kosong.**

| Berkas | Baris | Nasib | Dikerjakan oleh |
|---|---:|---|---|
| `screens/home/Home.tsx` | 248 | **Rombak** — 8 blok → 4; uang dihapus | TASK-04, TASK-08 |
| `screens/home/OperationalSnapshot.tsx` | — | **Gabung** ke header "Hari Ini" | TASK-04 |
| `screens/home/TodayHero.tsx` | — | **Gabung** dengan di atas (satu header, bukan dua kartu) | TASK-04 |
| `screens/home/AttentionInbox.tsx` | 162 | **Menjadi** blok "Perlu keputusan" (maks 3, dengan aksi) | TASK-04 |
| `screens/home/MonthView.tsx` | — | **Pertahankan** struktur; hanya token & warna | TASK-04 |
| `screens/home/WeekView.tsx` | — | **Pertahankan**; token saja | TASK-04 |
| `screens/home/DayView.tsx` | 132 | **Perkuat** — zoom + mode tangkapan layar | TASK-09 |
| `screens/home/ResolveMissedSessionModal.tsx` | 140 | **Rombak aksi** — `Catat` / `Batal les` / `Tidak hadir`; `Jadwalkan ulang` ke `⋯` | TASK-04, TASK-06 |
| `screens/home/EditSessionModal.tsx` | — | **Satukan** dengan di atas menjadi satu sheet "Kelola sesi" | TASK-06 |
| `screens/CaptureSession.tsx` | 2.099 → **1.901** (terukur 2026-10-04, setelah refactor G3-01) | **Pertahankan** wizard; satu langkah per layar; perkuat rasa | TASK-06 |
| `screens/MonthlyReport.tsx` | 2.097 | **Pecah** — pilih periode (ringkas) + editor laporan | TASK-04 |
| `screens/Payments.tsx` | 250 | **Rombak** — 4 tab → 1 layar | TASK-05 |
| `screens/payments/RingkasanTab.tsx` | 751 | **Bubarkan** ke blok-blok 1 layar | TASK-05 |
| `screens/payments/TagihanTab.tsx` | 794 | **Menjadi** daftar `BarisTagihan` tunggal | TASK-05 |
| `screens/payments/PengeluaranTab.tsx` | — | **Pertahankan** sebagai sub-layar `▸` | TASK-05 |
| `screens/payments/RekapTab.tsx` | 253 | **Lipat** — 8 kolom → 3 kolom + "lihat lengkap" | TASK-05 |
| `screens/payments/FinancePipelineBoard.tsx` | — | **Redesign** — board+list, tap-driven; hidup **di dalam blok "Perlu ditagih"** (tidak jadi blok ke-4). *Amandemen 2026-10-01 (Q3): sebelumnya "Bubarkan"* | TASK-05 |
| `screens/Students.tsx` | 592 | **Pertahankan** struktur; uang ditutup | TASK-08 |
| `screens/StudentDetail.tsx` | 1.037 | **Rombak** jadi tab **Ringkas / Sesi / Progres / Proyek**; uang menjadi **blok di dalam tab Ringkas**. *Amandemen 2026-10-01 (Q5): sebelumnya "(Ringkas/Sesi/Nilai/Uang)"* | TASK-04, TASK-08 |
| `screens/Settings.tsx` | 1.118 | **Pecah** jadi 3 grup bersarang | TASK-04 |
| `components/BottomNav.tsx` | 82 | **Rombak** — 5 tab + FAB → 3 pintu + 1 aksi di nav | TASK-04 |
| `components/AiCostModal.tsx` + `screens/captureSession/AiCostConfirmModal.tsx` | — | **Satukan** jadi satu jalur `useAiAction` | TASK-07 |

**Aturan nav (dari kontrak K1.1):** pintu = `Hari Ini` · `Murid` · `Uang`; aksi utama = tombol di dalam nav
(`+ Catat sesi`), **bukan** FAB mengambang. Alasan tertulis: FAB mengambang menutupi konten pada layar
padat — terbukti pada mockup `docs/mockups/home-2026-09-24.html` frame ②.

> **Amandemen 2026-10-01 (Q1–Q9) yang mengubah tabel di atas:**
> `FinancePipelineBoard` **di-redesign** (bukan dibubarkan) dan diletakkan di dalam blok "Perlu ditagih" — Q3 ·
> **Peta tab `StudentDetail` = Ringkas / Sesi / Progres / Proyek**, uang jadi blok di dalam **Ringkas** — Q5 ·
> **light-only permanen**, tidak ada langkah menghidupkan dark mode — Q4 ·
> **refactor terbatas** `CaptureSession.tsx` (sebelum G3-01) & `MonthlyReport.tsx` (sebelum G3-05) — Q9 ·
> **batas AI default kosong** — Q1 · **sesi boleh disimpan dari langkah 5** (6 langkah tetap) — Q2.
> Rincian: [`ATURAN-AI.md`](ATURAN-AI.md) §1.

## 3. Enam prinsip arah + cara memeriksanya

| # | Prinsip | Cara memeriksa |
|---|---|---|
| 1 | **Navigasi mengerucut** (3 pintu + 1 aksi di nav) | `BottomNav.tsx` memuat tepat 3 `NavLink` + 1 tombol aksi; tidak ada elemen `fixed` yang tumpang tindih |
| 2 | **Satu blok keputusan per layar** | Hitung blok di setiap layar; jumlah blok yang menuntut tindakan = 1 |
| 3 | **Urutan blok menyesuaikan keadaan, susunannya tetap** | Ada berkas/daftar urutan blok per layar; urutan hanya bergeser, tidak menambah/menghapus blok |
| 4 | **Kerumitan di belakang** | Setiap tabel/filter/ekspor dicapai lewat `▸` atau sub-layar. Tidak ada tabel >4 kolom di layar utama |
| 5 | **Setiap angka bisa diklik** | Uji: klik angka → sampai ke sesi/tagihan/murid asalnya ≤2 ketukan |
| 6 | **Bahasa manusia, bukan istilah sistem** | Uji: tidak ada `status` mentah (`NO_SHOW`) atau `mode` mentah yang tampil tanpa label manusia |

## 4. Pola yang wajib dipakai (jangan menciptakan cara baru)

- **Pola A — Blok keputusan.** Maks 3 kartu; tiap kartu = judul masalah + 1–2 baris fakta + 2–4 tombol aksi + `⋯`.
- **Pola B — Baris aksi.** 1 objek = 1 baris, aksi **di dalam barisnya**, tidak perlu masuk layar lain.
- **Pola C — Sub-layar `▸`.** Kerumitan (tabel, filter, ekspor) selalu di balik satu baris bertanda `▸`.
- **Pola D — Sheet dari bawah.** Semua panel di HP memakai sheet, bukan modal tengah.
- **Pola E — Kosong yang lega.** Keadaan kosong menjelaskan *apa yang berikutnya*, bukan tabel hampa.

## 5. Urutan kerja lintas tugas (risiko terendah dulu)

1. `TASK-04` fondasi visual — **tanpa perubahan perilaku**, aman, hasilnya belum terasa.
2. `TASK-08` satu pintu uang — **menutup kebocoran**; mandiri, tidak menunggu desain baru.
3. `TASK-09` zoom & tangkapan hari — mandiri, terisolasi di `DayView.tsx`.
4. `TASK-06` perkuat Catat Sesi — menyentuh alur inti; kerjakan setelah fondasi stabil.
5. `TASK-05` rombak keuangan — perubahan terbesar pada model + layar.
6. `TASK-07` kontrak AI berbiaya — menyentuh 7 titik pemanggilan; paling akhir agar tidak mengganggu di tengah.

## 6. ❌ JANGAN (berlaku untuk semua tugas turunan)

| Jangan | Alasan |
|---|---|
| Menyentuh `src/db/db.ts` versi schema tanpa tugas khusus | Migrasi salah = kehilangan data pengguna nyata |
| Mengubah `src/lib/crypto.ts` cara PIN disimpan | Risiko mengunci pengguna dari datanya; butuh tugas terpisah |
| Menghapus kemampuan dengan alasan "menyederhanakan" | Semua kemampuan lama harus tetap tercapai (paling jauh: lewat `▸`) |
| Menambah pustaka UI/animasi baru | Fondasi ini sengaja dibuat dari token + CSS; pustaka baru = **904** utang baru (angka terkoreksi 2026-10-01) |
| Menulis angka uang langsung tanpa `useMoneyVisible()` | Melanggar kontrak K3 |
| Memanggil `aiClient` langsung dari komponen | Melanggar kontrak K2 |
| Mengubah `MonthlyReport` template engine (rotation/tema) | Itu mesin lain (`docs/arsitektur/04`, `05`); butuh tugas terpisah |

## 7. Kalau macet

| Gejala | Sebab biasanya | Tindakan |
|---|---|---|
| `npm test` gagal setelah perubahan token | ada tes kontras (`engagementContrast.test.ts`) yang membaca warna | perbarui pasangan warna di sumber, **jangan** matikan tes |
| Layar jadi kosong setelah menghapus blok | ada `useLiveQuery` yang hanya dipakai blok itu | pindahkan query ke blok baru, bukan dihapus |
| Tombol tidak bereaksi setelah nav dirombak | `NavLink` `end` prop hilang | kembalikan `end={to === "/"}` |
| E2E gagal karena selector nav berubah | `e2e/` memakai teks label lamanya | perbarui selector di tugas yang sama, catat di §9 |
| Bingung antara "Hari Ini" dan "Jadwal" | dua istilah untuk satu hal | pakai **Hari Ini** untuk pintu nav, **Jadwal** untuk blok kalender |

> Jangan menutupi macet dengan menambah tes baru atau melewati satu langkah. Berhenti, tulis di §8.

## 8. Catatan penyimpangan

| Tanggal | Langkah | Yang terjadi | Keputusan |
|---|---|---|---|
| | | | |

## 9. Progres

- [ ] **L1** — §2 tidak punya baris "belum diputuskan"; setiap baris punya pemilik tugas
- [ ] **L2** — §3 keenam prinsip punya cara periksa yang bisa dijalankan
- [ ] **L3** — Lampiran mockup ditautkan dari sini dan dari setiap tugas turunan
- [ ] **L4** — `docs/README.md` §4.1 memuat `TASK-03`…`TASK-09`
- [ ] **L5** — §6 daftar larangan disalin ke `TASK-04`…`TASK-09`
- [ ] **L6** — Kontrak di [`arsitektur/11`](../arsip/arsitektur/11-uiux-ai-cost-dan-privasi.md) §3 (B1–B4) **terkunci 2026-09-25**; `ATURAN-AI.md` ada dan ditautkan dari setiap tugas turunan

## 10. Riwayat tugas

| Tanggal | Perubahan | Versi | Hasil |
|---|---|---|---|
| 2026-10-01 | Amandemen Q1–Q9: pipeline di-redesign (di blok "Perlu ditagih"), peta tab Murid → Ringkas/Sesi/Progres/Proyek (uang di Ringkas), light-only permanen, simpan dari langkah 5, batas AI default kosong, refactor terbatas | v1.79.3 | `todo` |
| 2026-09-25 | Dibuat dari brainstorming UI/UX + 3 mockup | v1.75.1 | `todo` |
