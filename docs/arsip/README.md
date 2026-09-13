# 00 — Daftar Arsip Dokumentasi

> **Sekilas** · Isi: **12 dokumen** yang sudah selesai atau historis · Status: **dibekukan** · Terakhir dirapikan: 2026-09-12.
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
9. **`AUDIT-UIUX-CATAT-SESI-2026-09-12.md`** — dokumen terbaru. Selain 17 temuan: §9.3 mencatat **dua penyimpangan yang disengaja** dari rekomendasi audit (bottom-nav & chip teks) beserta alasannya, dan §9.5 mencatat **dua bug yang baru ketemu saat memverifikasi perbaikan** (`discard()` tidak mereset revisi draf; revisi draf tidak tersinkron setelah close-out) — keduanya kini dijaga guard test.

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
