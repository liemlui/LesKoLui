# 00 — Daftar Arsip Dokumentasi

> **Sekilas** · Isi: **15 dokumen** yang sudah selesai, historis, atau usang · Status: **dibekukan** · Terakhir dirapikan: 2026-09-13.
> **Untuk siapa:** siapa pun yang bertanya "kenapa dulu diputuskan begitu?" atau "apa yang sudah pernah dikerjakan?".
> **Baca kalau:** dokumen aktif di folder induk tidak menjawab pertanyaan Anda, atau Anda perlu jejak audit/keputusan lama.
> **Yang tidak ada di sini:** aturan yang masih berlaku hari ini — itu ada di [`../README.md`](../README.md) (indeks utama).

Tidak ada dokumen yang dihapus. Semua dipindahkan ke folder ini dan diringkas di bawah, supaya sejarah tetap bisa ditelusuri tanpa mengganggu dokumen aktif.

---

## 1. Cara pakai & arti penomoran

1. **Cari cepat:** pakai tabel inventaris (§2) — urut kronologis, kolom status menjawab "sudah selesai atau belum".
2. **Mau konteksnya:** baca §3 — satu paragraf per dokumen berisi hal yang perlu diingat.
3. **Mau isi aslinya:** buka berkasnya langsung.
4. **Penomoran di tabel (01–12) adalah urutan waktu**, bukan urutan baca. **Nama berkas di folder ini sengaja tidak diberi nomor**: isinya dibekukan, dan mengganti nama akan memutus rujukan antar-dokumen lama serta jejak pencarian orang yang mengingat nama lamanya. Urutan & ringkasannya diatur di halaman ini.

---

## 2. Inventaris (urut kronologis)

| # | Dokumen | Tanggal | Target versi | Status akhir | Hasil singkat |
|---|---|---|---|---|---|
| 01 | [`DOC-AUDIT.md`](DOC-AUDIT.md) | 2026-06-26 | v1.12.1 | ✅ selesai (historis) | Audit dokumen vs kode: 9 kategori gap diperbaiki, 10 spec doc + 3 meta doc diselaraskan |
| 02 | [`CHECKLIST.md`](CHECKLIST.md) | 2026-06-26 | v1.12.1 | ✅ selesai (historis) | Status checklist per area saat itu; sudah digantikan `../README.md` + seri spec `01`–`10` |
| 03 | [`PROMPT-AI-IKLAN.md`](PROMPT-AI-IKLAN.md) | 2026-07-03 | — | historis (pemasaran) | Prompt pembuatan materi iklan Instagram; asetnya di luar repo (`../../Les-Ko-Lui-Instagram-Campaign/`) |
| 04 | [`AUDIT-CHECKLIST.md`](AUDIT-CHECKLIST.md) | 2025-07-16, rev. 2026-08-28 | v1.37.0 → v1.53.0 | ✅ 26/26 ditangani (H-2 di-waive) | Audit keamanan/teknis 4 ronde: PIN lockout recovery, konsistensi uang, PWA prompt, a11y label/dialog, penguatan Daftar Murid |
| 05 | [`PANDUAN-PENUNTASAN-CATAT-SESI.md`](PANDUAN-PENUNTASAN-CATAT-SESI.md) | 2026-08-29 | v1.64.x | ✅ selesai | Panduan kerja refactor Catat Sesi: 3 hook diekstrak (`useEngagement`, `useStudentBrief`, `useCaptureDraft`) + polish P1 |
| 06 | [`UI-UX-ANALYSIS.md`](UI-UX-ANALYSIS.md) | 2026-09-01 | v1.66.x | ✅ sebagian besar diimplementasikan | Analisis UI/UX + rekomendasi chart/bar/graph; status per task di §15 (task visual di-skip) |
| 07 | [`UI-UX-AUDIT-2026-09-04.md`](UI-UX-AUDIT-2026-09-04.md) | 2026-09-04 | v1.70.0 | ✅ Fase 1 selesai | Audit interaksi/navigasi/a11y/design system; quick win bottom nav, safe-area, modal shell dieksekusi |
| 08 | [`UI-UX-REDUNDANSI-AUDIT-2026-09-05.md`](UI-UX-REDUNDANSI-AUDIT-2026-09-05.md) | 2026-09-05 | v1.70.x | ✅ dieksekusi + diverifikasi ulang 2026-09-12 | Audit redundansi & penataan informasi; R1–R17 terbukti ada di kode |
| 09 | [`WA-MESSAGE-ADJUSTMENT-2026-09-05.md`](WA-MESSAGE-ADJUSTMENT-2026-09-05.md) | 2026-09-05 | v1.70.x | ✅ selesai | Humanisasi pesan WhatsApp ke orang tua; Reminder AI dihapus |
| 10 | [`UI-UX-AUDIT-VISUAL-2026-09-11.md`](UI-UX-AUDIT-VISUAL-2026-09-11.md) | 2026-09-11 | v1.71.0 → v1.71.4 | ✅ semua temuan ditutup | Audit visual 87 screenshot: 14 temuan V-01…V-14 (dark mode setengah-gelap, kontras tombol simpan, ikon emoji) |
| 11 | [`AUDIT-UIUX-KEUANGAN-2026-09-12.md`](AUDIT-UIUX-KEUANGAN-2026-09-12.md) | 2026-09-12 | v1.72.0 | ✅ 10/10 item diimplementasikan | Modul Keuangan: tab dinamai ulang + kalimat cakupan, 63 invoice dari ±27 layar → ±3 layar, istilah diseragamkan |
| 12 | [`AUDIT-UIUX-CATAT-SESI-2026-09-12.md`](AUDIT-UIUX-CATAT-SESI-2026-09-12.md) | 2026-09-12 | v1.73.0 | ✅ 17/17 temuan diimplementasikan | Alur Catat Sesi: 2 🔴 (banner menutupi tombol lanjut; mode jadwal bisa menyimpan ke murid yang salah), loop autosave yang membuat layar berkedip 2×/detik, kontras skor, laporan sesi tak bisa ditutup + 2 bug tambahan saat verifikasi |
| 13 | [`AUDIT-KONDISI-LES-DAN-TOPIK-2026-09-13.md`](AUDIT-KONDISI-LES-DAN-TOPIK-2026-09-13.md) | 2026-09-13 | v1.74.0 (P0) + v1.75.0 (P1–P3) | ✅ P0–P3 diimplementasikan; **verifikasi manual 12 langkah belum dijalankan** (dipindah ke `../README.md` §4.3) | Pilihan kondisi les & kelengkapan sub topik: cakupan topik 64→93 dari 167 mapel (nama ber-kode Cambridge akhirnya bertemu katalog), saran topik lintas-jenjang tidak lagi menyamar, langkah Kondisi 60→11 kontrol, mood keluar dari skor, sesi tanpa pengamatan tidak lagi "5/10", rata-rata berpenyebut + cakupan data, detail sesi bisa dikoreksi, jenjang murid tidak lagi "UNIV" |
| 14 | [`03-capture-flow.md`](03-capture-flow.md) | (dari seri arsitektur) | — | ⚠️ **usang** — diarsipkan 2026-09-13 | Dokumentasi alur catat sesi versi lama: urutan UI-nya sudah tidak cocok (kini 6 langkah + pemilih topik berbasis bab + kondisi 3 lapis; `mood` tidak lagi menggeser skor) |
| 15 | [`TODO-2026-09-13.md`](TODO-2026-09-13.md) | 2025-07-19 → rev. 2026-09-13 | v1.75.1 | ⚠️ **dipindah** ke `../README.md` §4 + `../kerja/` | Catatan utang teknis layar besar; daftar pekerjaan aktif kini hidup di indeks supaya hanya ada satu sumber kebenaran |

---

## 3. Yang perlu diingat dari tiap dokumen

1. **`DOC-AUDIT.md` + `CHECKLIST.md`** — memotret sinkronisasi dokumentasi pada **v1.12.1** (`homeworks` masih tabel, `monthClosings` masih ada, backup 11 tabel). Semua fakta itu **sudah tidak berlaku**: schema kini v15, `monthClosings`/`homeworks` dihapus, backup 10 tabel. Jangan dipakai sebagai acuan schema.
2. **`PROMPT-AI-IKLAN.md`** — bukan dokumentasi produk; disimpan agar prompt pemasaran tidak hilang.
3. **`AUDIT-CHECKLIST.md`** — satu-satunya catatan **waiver keamanan yang disetujui sadar**: **H-2** (API key AI bisa dicuri pemilik perangkat) di-waive sesuai threat model pengguna tunggal. Rujukannya masih dipakai di [`../05-ARSITEKTUR-REPLIKASI-OFFLINE.md`](../05-ARSITEKTUR-REPLIKASI-OFFLINE.md) dan [`../02-PANDUAN-BACKUP-DRIVE-SENYAP.md`](../02-PANDUAN-BACKUP-DRIVE-SENYAP.md).
4. **`PANDUAN-PENUNTASAN-CATAT-SESI.md`** — menetapkan pola yang masih dipakai hari ini (state besar dipecah ke hook per tanggung jawab; nama variabel lama di-alias agar JSX tidak berubah). Satu item P1-nya kemudian **berubah arah** di v1.73.0: tombol "Nanti Saja" tidak dijadikan sekunder, melainkan **dihapus** agar langkah Bukti hanya punya satu tombol simpan.
5. **`UI-UX-ANALYSIS.md`, `UI-UX-AUDIT-2026-09-04.md`, `UI-UX-REDUNDANSI-AUDIT-2026-09-05.md`** — tiga sudut audit yang sengaja tidak saling mengulang: data-viz/chart, interaksi/a11y/design-system, dan redundansi/arsitektur informasi. Pola ini dilanjutkan [`../03-PLAYBOOK-AUDIT-UIUX-VISUAL.md`](../03-PLAYBOOK-AUDIT-UIUX-VISUAL.md) (berbasis screenshot).
6. **`WA-MESSAGE-ADJUSTMENT-2026-09-05.md`** — alasan pesan ke orang tua ditulis hangat dan personal (klien high-profile), bukan seperti penagih.
7. **`UI-UX-AUDIT-VISUAL-2026-09-11.md`** — menetapkan **format tabel temuan** (ID · layar · masalah · bukti visual · prinsip · severitas · fix ref) yang dipakai ulang oleh dua audit 2026-09-12, termasuk legend severitas 🔴/🟠/🟡/🟢.
8. **`AUDIT-UIUX-KEUANGAN-2026-09-12.md`** — metodenya (jalankan app dengan data realistis → ukur DOM → tulis angka sebelum→sesudah) menjadi standar yang dipakai audit berikutnya.
9. **`AUDIT-UIUX-CATAT-SESI-2026-09-12.md`** — menetapkan pola "temuan bernomor + bukti terukur + tabel severitas" yang dipakai audit berikutnya. Selain 17 temuan: §9.3 mencatat **dua penyimpangan yang disengaja** dari rekomendasi audit (bottom-nav & chip teks) beserta alasannya, dan §9.5 mencatat **dua bug yang baru ketemu saat memverifikasi perbaikan** (`discard()` tidak mereset revisi draf; revisi draf tidak tersinkron setelah close-out) — keduanya kini dijaga guard test.
10. **`AUDIT-KONDISI-LES-DAN-TOPIK-2026-09-13.md`** — dokumen terbaru, dan satu-satunya audit yang **temuannya bukan soal tampilan, melainkan soal ISI pilihan**: katalog topik tidak pernah bertemu nama mapel yang disimpan pemilih mapel (`"Mathematics (0580)"` vs `"Mathematics"`), sehingga 62% mapel tidak menemukan topiknya. Berguna dibaca ulang kalau Anda menambah mapel baru. Tiga hal yang perlu diingat: (a) §4.3 mencatat **dua cacat yang baru ketemu saat mengerjakan** — kebocoran topik antar-kurikulum lewat nama mapel kembar, dan "alias mati" yang menunjuk mapel yang tidak ada di katalog; (b) §12.5 mencatat cacat **validasi backup** (`STUDENT_LEVELS` hanya mengenal MYP/IBDP/UNIV sehingga backup berisi murid IGCSE/AP/SMP/SMA ditolak saat restore) yang baru terlihat setelah jenjang diperbaiki; (c) §15 menyisakan **verifikasi manual 12 langkah** yang kini dijaga sebagai daftar periksa di [`../README.md`](../README.md) §4.3.
11. **`03-capture-flow.md`** — **bukan dokumen tuntas, melainkan dokumen USANG.** Diarsipkan 2026-09-13 dari seri `arsitektur/` karena isinya menyesatkan bila dipercaya: urutan UI-nya menyebut susunan langkah lama dan `mood` sebagai bagian skor engagement, padahal keduanya sudah berubah (v1.75.0). **Jangan pakai sebagai acuan perilaku.** Alur yang berlaku: kode `src/screens/CaptureSession.tsx` + `src/screens/captureSession/`.
12. **`TODO-2026-09-13.md`** — catatan utang teknis yang dulu duduk di akar repo. **Bukan pekerjaan selesai**, melainkan pekerjaan yang **dipindah**: daftar aktifnya sekarang di [`../README.md`](../README.md) §4, dan refactor yang sedang berjalan punya dokumen tugas di [`../kerja/TASK-01-refactor-layar-besar.md`](../kerja/TASK-01-refactor-layar-besar.md). Alasan pemindahan: `TODO.md` di akar repo bersaing dengan `README.md` dan tidak pernah terbaca dari router dokumentasi, sehingga pekerjaan di dalamnya "hilang" dari pandangan.

---

## 4. Catatan pengarsipan 2026-09-12

| Asal | Tujuan | Cara |
|---|---|---|
| `les-ko-lui/AUDIT-CHECKLIST.md`, `PANDUAN-PENUNTASAN-CATAT-SESI.md`, `PROMPT-AI-IKLAN.md`, `docs/UI-UX-*.md`, `docs/WA-MESSAGE-ADJUSTMENT-*.md` (8 berkas) | `docs/arsip/` | `git mv` — riwayat git setiap berkas tetap utuh |
| `Private Tutor/CHECKLIST.md`, `DOC-AUDIT.md`, `AUDIT-UIUX-CATAT-SESI-2026-09-12.md`, `AUDIT-UIUX-KEUANGAN-2026-09-12.md` (4 berkas) | `docs/arsip/` | dipindahkan (bukan disalin) dari folder induk yang **tidak** dikelola git, sehingga historisnya kini ikut terversi |
| `Private Tutor/package-lock.json` | dihapus | berkas nyasar berisi `packages: {}` tanpa `package.json` di folder itu (lockfile sebenarnya ada di `les-ko-lui/`) |

**Kebijakan arsip**

1. Isi dibekukan: temuan, angka, dan keputusan tetap seperti saat ditulis. Yang boleh berubah hanya **rujukan path** agar tidak menunjuk lokasi lama (mis. `docs/UI-UX-ANALYSIS.md` → `arsip/UI-UX-ANALYSIS.md`).
2. Sebagian dokumen lama memakai path relatif-workspace (mis. `les-ko-lui/src/...`) karena begitulah aslinya ditulis — dibiarkan apa adanya.
3. **Dua tautan di `AUDIT-CHECKLIST.md` memang menunjuk berkas yang sudah tidak ada**: `src/screens/Home.tsx` (kini `src/screens/home/Home.tsx`) dan `src/lib/exportAbsensi.ts` (dihapus saat pembersihan dead code v1.53). Dibiarkan karena bagian dari catatan audit saat itu, bukan tautan hidup.
4. Ringkasan di halaman ini adalah **tambahan**, bukan pengganti: tidak ada dokumen yang diringkas-hapus.

---

## 5. Catatan pengarsipan 2026-09-13

| Asal | Tujuan | Cara |
|---|---|---|
| `docs/AUDIT-KONDISI-LES-DAN-TOPIK-2026-09-13.md` | `docs/arsip/` | dipindahkan berkas (baru, belum pernah di-commit → bukan `git mv`); rujukan internal diperbaiki, dan daftar periksa manualnya dipromosikan ke [`../README.md`](../README.md) §4.3 |
| `docs/arsitektur/03-capture-flow.md` | `docs/arsip/` | dipindahkan karena **isinya usang** (menyesatkan bila dipercaya); diberi peringatan di baris atas + daftar baca di `arsitektur/README.md` diperbaiki |
| `TODO.md` (akar repo) | `docs/arsip/TODO-2026-09-13.md` | dipindahkan + diberi nama bertanggal agar tidak tertukar dengan daftar aktif; isinya dipecah ke indeks §4 dan `docs/kerja/` |

**Sisa pekerjaan yang menumpang di dokumen arsip.** Audit ini diarsipkan atas permintaan pemilik aplikasi meski satu bagiannya belum tuntas (verifikasi di layar). Supaya tidak hilang, sisa itu dicatat di **daftar kerja aktif** ([`../README.md`](../README.md) §4), bukan hanya di dokumen yang sudah dibekukan. Ini pengecualian sadar terhadap kebijakan "dokumen dengan pekerjaan terbuka tetap di folder induk": pekerjaannya sudah dipindah ke daftar aktif, sehingga arsip ini tidak lagi memegang pekerjaan apa pun.

**Dokumen yang SENGAJA tetap di folder induk** (bukan lupa — dicek satu per satu pada 2026-09-13):

| Dokumen | Status | Alasan tidak diarsipkan |
|---|---|---|
| [`../01-PANDUAN-TAGIHAN.md`](../01-PANDUAN-TAGIHAN.md) | aktif | panduan fitur yang masih dipakai (kapan sebuah sesi ditagih) |
| [`../02-PANDUAN-BACKUP-DRIVE-SENYAP.md`](../02-PANDUAN-BACKUP-DRIVE-SENYAP.md) | aktif | panduan setup yang masih dipakai saat backup Drive gagal |
| [`../03-PLAYBOOK-AUDIT-UIUX-VISUAL.md`](../03-PLAYBOOK-AUDIT-UIUX-VISUAL.md) | aktif (prosedur) | prosedur untuk audit berikutnya, bukan hasil audit |
| [`../04-RENCANA-KETAHANAN-DATA.md`](../04-RENCANA-KETAHANAN-DATA.md) | aktif | implementasi selesai, tetapi **3 kriteria verifikasi masih terbuka** (§13) |
| [`../05-ARSITEKTUR-REPLIKASI-OFFLINE.md`](../05-ARSITEKTUR-REPLIKASI-OFFLINE.md) | referensi (cetak biru) | dipakai saat membangun app offline-first lain; bukan catatan pekerjaan selesai |
| [`../kerja/TASK-01-refactor-layar-besar.md`](../kerja/TASK-01-refactor-layar-besar.md) | aktif (dikerjakan) | 2 dari 6 langkah refactor belum selesai |
| [`../kerja/TASK-02-format-dokumen-tugas-ai.md`](../kerja/TASK-02-format-dokumen-tugas-ai.md) | aktif (spesifikasi) | format yang wajib dipakai setiap dokumen tugas baru |
