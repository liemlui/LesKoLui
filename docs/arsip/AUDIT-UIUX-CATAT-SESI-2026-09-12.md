# Audit UI/UX — Alur "Catat Sesi" (Les Ko Lui v1.72.0)

Tanggal audit: 2026-09-12 · Metode: aplikasi dijalankan (Vite dev, v1.72.0, data dummy 6 murid / 44 sesi / 6 jadwal SCHEDULED), lalu **diukur langsung dari DOM hidup** — rect elemen, `elementFromPoint` (hit-test), kontras warna hasil render (konversi `oklch → sRGB` via canvas), `MutationObserver` untuk melacak elemen yang muncul/hilang, penghitung revisi draf di IndexedDB untuk mendeteksi penulisan berulang, dan penelusuran kode sumber.

> **Status: SELESAI DIIMPLEMENTASI (2026-09-12) — rilis v1.73.0.** Seluruh 17 temuan dikerjakan; hasil terukur ada di [Bagian 9](#bagian-9--hasil-setelah-perbaikan) beserta dua catatan penyimpangan yang disengaja. Verifikasi: **475 unit test lulus (47 berkas)**, `tsc -b` bersih, `eslint` 0 error/0 warning, build produksi berhasil (`dist/sw.js` dibuat), dan alur kritis diuji langsung di browser.

- Lingkup: `/capture` (wizard 6 langkah), laporan sesi (close-out), modal pilih mapel, tooltip observasi, banner/draf, bar aksi tetap, dan interaksi dengan BottomNav + banner global.
- Konteks ukur: viewport Chrome **767 × 674 px**, kolom aplikasi **448 px** (`max-w-md`) — lebar kolom setara ponsel besar, tinggi viewport lebih pendek dari Pixel 7 (915 px). Implikasinya dibahas di *Keterbatasan audit*.
- Katalog regresi lama (`arsip/UI-UX-AUDIT-VISUAL-2026-09-11.md`) diperiksa; temuan di bawah **tidak duplikat** dengan V-01…V-14.

---

## Ringkasan eksekutif

Masalahnya bukan estetika. Ada **dua kelas cacat struktural** di alur yang paling sering dipakai tutor ini (input data sesi = sumber semua laporan & tagihan):

1. **Kontrol yang terlihat aktif tetapi tidak dipakai** (C-01, C-02). Satu banner global menutupi tombol "Lanjut →" sehingga wizard tidak bisa dilanjutkan, dan pada alur `?scheduleId=` pemilih **Murid** + **Tanggal** menerima perubahan tetapi diabaikan saat menyimpan — catatan sesi bisa tercatat ke murid yang berbeda dari yang tampil di layar dan di laporan.
2. **Umpan balik & pelindung data tidak sampai ke pengguna** (C-03…C-07). Validasi muncul di luar layar, preset menghapus data tanpa konfirmasi, laporan sesi tidak bisa ditutup, dan banner draf menginstruksikan sesuatu yang tidak ditegakkan aplikasi.
3. **Layar berkedip terus-menerus tanpa interaksi** (C-17, dilaporkan pengguna). Autosave draf berubah menjadi loop tak berujung: pesan amber muncul–hilang **9× dalam 5 detik** sambil menggeser seluruh isi form 28 px, dan menulis ke IndexedDB **108×/menit** padahal tidak ada satu pun data yang berubah.

Angka kunci hasil pengukuran:

| Ukuran | Hasil |
|---|---|
| Tumpang tindih banner "Saatnya backup mingguan" dengan bar aksi wizard | **57 px** dari 69 px; `elementFromPoint` di tengah tombol "Lanjut →" mengembalikan elemen banner, **bukan** tombolnya |
| Murid yang tampil di wizard & laporan vs murid yang tersimpan di DB (alur `?scheduleId=`) | **berbeda** (Citra Dewanti vs Andi Pratama) — tanpa peringatan apa pun |
| Posisi pesan validasi saat pengguna di posisi gulir bawah | `rect.top` = **−92 px** (di atas viewport); kontainer pesan **tanpa** `role`/`aria-live` |
| Rasio kontras 5 warna status skor (`scoreLabel`) | **2,86 / 3,11 / 3,32 / 3,95 / 4,24 : 1** — semuanya di bawah AA 4,5:1 |
| Tombol di bawah standar tap-target aplikasi sendiri (48 px) di langkah 3 | **49 tombol** (ⓘ 29×38 px, chip tag 38 px, chip 42 px) |
| Tombol berbeda yang menjalankan aksi "simpan" yang sama di langkah 6 | **3** ("Nanti Saja", "Lewati", "Simpan Sesi") |
| Kedipan pesan status draf (tanpa interaksi apa pun) | **9 siklus / 5 detik**, periode **532 ms**, pesan terlihat hanya **13–18 ms** per siklus |
| Pergeseran tata letak yang ditimbulkan kedipan itu | `scrollHeight` 896 ↔ 924 px → **± 28 px, ± 2×/detik** |
| Penulisan draf ke IndexedDB tanpa perubahan data | **9 tulis / 5 detik → 108 tulis/menit** (revisi draf naik 70 → 77 dalam 4 detik) |

---

## Tabel temuan

| ID | Area | Masalah | Prinsip | Severitas |
|---|---|---|---|---|
| C-01 | Bar aksi tetap | Banner "Saatnya backup mingguan" menutupi bar aksi wizard → CTA tidak bisa diketuk | N1, N5 | 🔴 |
| C-02 | Langkah 1 (`?scheduleId=`) | Murid & tanggal bisa diubah tetapi diabaikan saat simpan → catatan tersimpan ke murid lain | N1, N5, konsistensi data | 🔴 |
| C-03 | Semua langkah | Pesan validasi dirender di atas halaman, tanpa gulir-ke-pesan / `aria-live` / toast | N1, N9, WCAG 4.1.3 | 🟠 |
| C-04 | Langkah 3 & 4 | Preset ⚡ menghapus/menimpa data terisi tanpa konfirmasi & tanpa undo | N5, N3 | 🟠 |
| C-05 | Laporan sesi | Modal laporan tidak punya tombol tutup, ESC, atau klik latar; tanpa focus trap | N3, WCAG 2.1.2 | 🟠 |
| C-06 | Banner draf | Instruksi "sebelum mulai mengedit" tidak ditegakkan; form tetap aktif → isian baru tertimpa draf | N5, N1 | 🟠 |
| C-07 | Status draf | Pesan "coba simpan lagi" / "Muat draf terbaru" tidak punya aksi di layar | N9, N3 | 🟠 |
| C-08 | Kontras warna | 8 pasangan teks/latar gagal AA (terburuk 2,43:1 pada judul "Catatan Sesi") | WCAG 1.4.3 | 🟠 |
| C-17 | Seluruh layar | **Loop autosave**: pesan status berkedip 2×/detik sambil menggeser form 28 px, + 108 tulis DB/menit tanpa perubahan data | N1, N4, persepsi kinerja | 🟠 |
| C-09 | Langkah 6 | Tiga tombol berbeda = satu aksi simpan; label "Nanti Saja — Simpan Tanpa Foto" menyiratkan hasil berbeda | N4, N1 | 🟡 |
| C-10 | Langkah 3 | Skor mulai dari basis 5 yang tak terlihat, sementara chip menjanjikan +2/+1/−1 | N1, model mental | 🟡 |
| C-11 | Kosakata | "Perlu Perhatian" dipakai untuk 5 makna; "✨ Positif" 2× di satu layar; "⚡ Cepat (isi 1 detik)" 2× di dua langkah | N4, N3 | 🟡 |
| C-12 | Banner global | Banner "backup menua" menutupi judul halaman + "Langkah X dari 6"; dua pengingat backup tampil bersamaan | N1, hierarki | 🟡 |
| C-13 | Tap target | 49 kontrol < 48 px (standar aplikasi sendiri); tombol tutup tooltip 28×28 tanpa nama aksesibel | WCAG 2.5.5, 4.1.2 | 🟡 |
| C-14 | Chip durasi | Deret 11 chip (575 px) di wadah 416 px — 4 chip terakhir (4,5j–6j) tersembunyi tanpa petunjuk gulir | N6 (recognize > recall) | 🟡 |
| C-15 | Kerangka layar | Dua bar navigasi bertumpuk (133 px dari 674 px) + progres ditampilkan 3× | N4, efisiensi | 🟢 |
| C-16 | Langkah 5 | Kartu "Konteks yang dipakai AI" (156 px) mengulang isian 4 langkah sebelumnya dan mendorong kolom wajib ke bawah | N8 (minimalisme) | 🟢 |

---

## Temuan kritis

### 🔴 C-01 — Banner backup mingguan menutupi bar aksi "Catat Sesi"

**Bukti terukur** (langsung dari DOM, banner dipaksa muncul dengan menghapus `leskolui_last_auto_backup_prompt`):

```
banner nag   : top 518  bottom 598  z-index 55
bar aksi     : top 541  bottom 610  z-index 50
CTA "Lanjut →": top 554 bottom 598  (tinggi 44)
overlap      : 57 px  → seluruh tinggi CTA tertutup
elementFromPoint(tengah CTA) → <p class="text-xs text-amber-600 mt-0.5">
                              "Lindungi datamu dengan file backup terenkripsi"
```

Bukan sekadar tertutup secara visual: **hit-test mengembalikan elemen banner**, jadi ketukan pada "Lanjut →" tidak pernah sampai ke tombol. Tombol "← Kembali" dan "Lewati" di bar yang sama juga tertutup pada rentang yang sama.

**Sumber kode**
- `src/App.tsx:196-236` — nag dirender di `bottom: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 0.75rem)` (≈ 76 px dari bawah) dengan `Z.nag`.
- `src/screens/CaptureSession.tsx:1581` — bar aksi wizard dirender di `bottom-[calc(4rem+var(--safe-bottom))]` (≈ 64 px dari bawah) dengan `z-50`.
- `src/lib/zIndex.ts:8-9` — urutan resmi `nav 50 → nag 55`, sehingga nag selalu di atas bar aksi.
- `grep "bottom-\[calc\(4rem"` → **hanya satu berkas** memakai offset itu: `CaptureSession.tsx`. Efeknya spesifik pada layar ini; layar lain tidak punya bar aksi di band yang sama.
- Catatan laten: `src/components/Toast.tsx:18` memakai band yang **sama persis** (`--bottom-nav-h + safe + 0.75rem`). Saat ini `CaptureSession` tidak memakai `useToast` (grep: 0 kecocokan), jadi belum terpicu — tetapi setiap toast baru di layar ini akan mengulang bug yang sama.

**Dampak** — Tutor yang membuka Catat Sesi saat pengingat backup mingguan aktif (kondisi default untuk pengguna baru, karena `AUTO_BACKUP_KEY` belum ada) **tidak bisa melanjutkan wizard**. Sisa 12 px di bawah CTA terlalu kecil untuk diketuk dengan sengaja; yang terlihat adalah "tombol biru besar" yang tidak merespons.

**Rekomendasi** — Tetapkan kepemilikan band bawah secara eksplisit: bar aksi tugas (CTA) adalah lapisan tertinggi di band itu, bukan nag.
1. Render nag **di atas** bar aksi (`bottom: calc(4rem + safe + tinggiBar + 0.5rem)`) atau pindahkan nag ke atas layar saat rutenya `/capture`, dan naikkan `Z.nag` di atas bar aksi bila tetap di bawah.
2. Tulis aturan band di `zIndex.ts` sebagai komentar + tambah guard test (lihat *Verifikasi*): saat nag tampil, `elementFromPoint` di tengah CTA harus mengembalikan CTA.
3. Pertimbangkan menahan nag selama draf wizard aktif (fase `editing`) agar alur input data tidak pernah disela.

---

### 🔴 C-02 — Di alur "menyelesaikan jadwal", Murid & Tanggal bisa diubah tetapi diabaikan

**Cara reproduksi (sudah dijalankan)**
1. Dari Home → jadwal → Catat: buka `/capture?scheduleId=aed6ac04-…` (jadwal **Andi Pratama**, 2026-07-02, 2 jam).
2. Langkah 1: ganti "👤 Murid" menjadi **Citra Dewanti**. Wizard menerima tanpa peringatan; langkah 2 bahkan menampilkan mapel milik Citra ("Economics", "+ Tambah Mapel (MYP)") — membuktikan UI benar-benar berpindah murid.
3. Isi catatan dan simpan.

**Hasil terukur**

```
Laporan di layar      : "✅ SESI SELESAI! — Citra Dewanti · Kamis · Economics"
Pesan WA yang disiapkan: "Sesi les *Citra Dewanti* (Kamis, 2 Juli 2026) sudah selesai. 📚"
Baris DB yang berubah : sessions[aed6ac04-…] → studentId = f4079f27… (Andi Pratama)
                        subjects = ["Economics"], shortNote = "PROBE: catatan untuk murid…",
                        date tetap 2026-07-02, status = DONE
```

Murid yang ditampilkan ≠ murid yang tercatat. Tanggal pun tidak dapat berubah: `markSessionDone` tidak menerima `date`.

**Sumber kode**
- `src/screens/CaptureSession.tsx:288-298` — efek `scheduleId` mengisi `studentId`, `sessionDate`, `duration`, `subjects`. Kontrolnya tetap dapat diubah (tidak `disabled`/`readOnly`).
- `src/screens/CaptureSession.tsx:408-421` — `markSessionDoneWithCloseoutDraft(scheduleId, { subjects, photo, shortNote, … })`: **tidak ada** `studentId` maupun `date` di payload.
- `src/db/repos/sessionRepo.ts:125-158` — `markSessionDone(id, data)` hanya menerima `subjects/photo/shortNote/mood/topic/needsWork/predictedGrade/situasiNote/engagement/behaviorTags/responseTag/signature/durationHours`; baris diperbarui berdasarkan `id`, `studentId` dan `date` lama dibiarkan.
- `src/screens/CaptureSession.tsx:517-520, 1777-1803, 1930` — laporan & pesan WA dibangun dari `currentStudent` (murid yang dipilih di UI), bukan dari sesi yang tersimpan.

**Dampak** — Kelas risiko tertinggi di aplikasi keuangan/laporan: catatan, mapel, skor engagement, dan foto/TTD tertulis pada murid yang salah, sementara **pesan WhatsApp untuk orang tua dikirim berdasarkan murid yang berbeda**. Efek turunan: tagihan sesi per murid, laporan bulanan, dan rata-rata engagement ikut salah. Tidak ada galat, tidak ada peringatan, tidak ada cara mendeteksi dari layar.

**Tambahan (orientasi mode)** — Layar tidak memberi tanda apa pun bahwa mode ini *menyelesaikan jadwal*, bukan membuat sesi baru: judul tetap "📓 Catat Sesi", langkah tetap "Langkah 1 dari 6", dan satu-satunya petunjuk adalah "⏪ Merekam sesi masa lalu" (itu pun karena jadwal dummy bertanggal lampau).

**Rekomendasi**
1. Pada alur `?scheduleId=`, kunci (atau hapus) kontrol Murid & Tanggal, dan tampilkan konteks eksplisit di header, mis. *"Menyelesaikan jadwal Andi Pratama · 2 Jul 2026, 15:00"*.
2. Bila murid memang boleh diganti, teruskan perubahannya: kirim `studentId`/`date` ke repositori, atau ubah menjadi "batalkan jadwal ini & buat sesi baru" dengan konfirmasi.
3. Tambah guard test repositori: `markSessionDone` dengan `studentId` berbeda harus menolak, atau wizard harus menonaktifkan kontrolnya — pilih satu, jangan diam-diam mengabaikan.

---

## Temuan tinggi

### 🟠 C-03 — Validasi tampil di luar viewport dan tidak diumumkan

**Bukti terukur** (langkah 5, catatan wajib dikosongkan, pengguna menggulir ke bawah untuk menjangkau tombol):

```
docH = 939, viewport = 674, scrollY saat menekan CTA = 266 → 335
pesan "✏️ Tulis catatan singkat dulu." → rect.top = −92 px  (di ATAS viewport)
step tidak berubah (tetap "Langkah 5 dari 6"), tidak ada toast, fokus tetap di <body>
```

Ambang terdokumentasi: pesan berada di offset dokumen **≈ 243 px**; ia keluar layar begitu `scrollY ≳ 244`. Jadi kasus ini terjadi di ponsel pendek (< 700 px), saat papan tik maya terbuka (viewport visual menyusut), dan pada setiap langkah dengan dokumen lebih tinggi dari layar.

Kontainer pesan (`CaptureSession.tsx:669-687`) **tidak** punya `role`, `aria-live`, maupun `aria-atomic` (diverifikasi langsung: `role: null, aria-live: null`) → pembaca layar juga tidak mengumumkan galat.

**Sumber kode** — `src/screens/CaptureSession.tsx:484-500` (`validateCurrentStep`, `goNext`), `669-687` (blok pesan). Tidak ada `scrollIntoView`, `focus()`, atau toast di seluruh berkas (grep bersih).

**Dampak** — Pada kasus terburuk tutor menekan "Lanjut →" berulang kali, mengira aplikasi menggantung, lalu meninggalkan wizard (draf tersimpan, tetapi sesi tidak tercatat pada hari itu).

**Rekomendasi** — Jadikan umpan balik validasi menempel pada aksi: scroll-ke-pesan + `focus()` pada kolom yang salah, atau tampilkan galat sebagai toast/inline dekat CTA. Tambahkan `role="alert"` (atau `aria-live="polite"`) pada kontainer pesan.

---

### 🟠 C-04 — Preset ⚡ menghapus & menimpa data tanpa konfirmasi

**Bukti terukur** (urutan aksi nyata di langkah 3 dan 4):

| Aksi | Keadaan sebelum | Setelah menekan preset |
|---|---|---|
| Tandai 3 flag negatif → tekan **"😐 Biasa"** | Main HP, Telat, Sibuk sendiri aktif; skor **2/10** | flag **kosong** (0), skor **5/10**, mood "Biasa" |
| Tandai 2 flag negatif → tekan **"✨ Lancar"** | Main HP, Telat aktif; skor **3/10** | flag negatif **hilang**, diganti 3 flag positif; skor **9/10** |
| Isi "Perlu Perhatian Lebih" = `ketelitian angka, time management` → tekan **"⭐ Lancar"** (langkah 4) | isian ada | kolom **kosong** |

Tidak ada dialog konfirmasi (`[role="dialog"]` = 0), tidak ada undo, tidak ada toast.

**Sumber kode**
- `src/screens/CaptureSession.tsx:912-936` — grup "⚡ Cepat" langkah 3: `applyPreset({…})` / `applyPreset({}, "Biasa")` / `resetEngagementFlags`.
- `src/screens/CaptureSession.tsx:1158-1190` — grup "⚡ Cepat" langkah 4: `setResponseTag(...)` + `setNeedsWork("")`.
- `src/screens/captureSession/useEngagement.ts:70-73` — `applyPreset` melakukan `setFlags({ ...INITIAL, ...pattern })` → seluruh flag lain **direset**, bukan ditambahi.

**Dampak** — Preset diberi label seperti jalan pintas mood ("Biasa"), padahal efeknya adalah operasi destruktif pada catatan yang sudah dibuat. Pada aplikasi rekam-jejak, kehilangan 2–3 sinyal perilaku berarti skor engagement, narasi, dan dasar tindak lanjut ikut berubah — tanpa jejak bahwa itu terjadi.

**Rekomendasi** — Pisahkan "mood" dari "reset": preset harus **aditif** (hanya menyalakan flag yang relevan) dan diberi label tegas untuk aksi yang memang mereset ("🔄 Reset semua indikator"), atau minta konfirmasi singkat bila sudah ada flag aktif ("Biasa akan mengosongkan 3 indikator. Lanjut?"). Sediakan "↩ Batalkan" (undo) minimal untuk aksi preset terakhir.

---

### 🟠 C-05 — Laporan sesi tidak bisa ditutup, dan tidak memakai Modal bersama

**Bukti terukur** (modal "Laporan sesi" terbuka setelah simpan):

```
Lampiran : [role="dialog"][aria-label="Laporan sesi"], tanpa tombol aria-label "Tutup panel"
Escape   : tidak menutup (masih terbuka setelah keydown Escape)
Klik latar: tidak menutup (klik pada elemen latar tidak mengubah apa pun)
Fokus    : document.activeElement = <body> → fokus tidak dipindahkan ke dalam dialog
Tombol di dalam: "+", "💬 Kirim ke Bpk. Pratama", "🏁 Selesai & Lihat Profil"
Scroll latar: body masih dapat digulir di belakang modal
```

**Sumber kode** — `src/screens/CaptureSession.tsx:1777-1944` (modal laporan ditulis tangan) dan `1648-1772` (picker mapel) serta `1610-1643` (tooltip) juga ditulis tangan. Bandingkan `src/components/Modal.tsx:28-57` yang sudah menyediakan: `role="dialog"`, ESC, klik latar, focus trap, pemulihan fokus, dan tombol ✕ berlabel. Guard `src/__tests__/modalAccessibility.test.tsx` hanya menguji komponen bersama itu, sehingga modal-modal Catat Sesi tidak terjaga.

**Dampak** — Satu-satunya jalan keluar dari laporan adalah menekan "🏁 Selesai & Lihat Profil" (yang langsung berpindah halaman) atau mengetuk tautan WhatsApp. Tutor yang ingin **membaca ulang** catatan, atau menyadari ada salah ketik sebelum mengirim WA, tidak punya jalan kembali ke wizard: sesi sudah tersimpan, draf sudah dihapus (`draft.remove()` pada `CaptureSession.tsx:470`), dan tak ada tombol batal. Untuk pengguna papan tik/pembaca layar, dialog ini juga tidak dapat ditutup dan fokus tidak berpindah ke dalamnya.

**Rekomendasi** — Pindahkan tiga overlay ini ke `components/Modal.tsx` (atau ekstrak perilaku yang sama). Khusus laporan: tambahkan aksi "✏️ Perbaiki catatan" (kembali ke langkah 5 dengan data tersimpan) dan tombol tutup yang mengembalikan ke wizard tanpa menghapus draf.

---

### 🟠 C-06 — Banner draf memerintahkan hal yang tidak ditegakkan aplikasi

**Bukti terukur** — Dengan draf tertunda aktif:

```
banner   : "Draf Catat Sesi tersedia — Draf tersimpan di perangkat ini.
            Lanjutkan atau buang SEBELUM mulai mengedit."
kontrol  : #cs-murid.disabled === false  (form tetap sepenuhnya dapat diedit)
```

**Sumber kode** — `src/screens/CaptureSession.tsx:589-598` (banner), `229-251` (`restoreDraft` menimpa seluruh state form: tanggal, durasi, mapel, topik, catatan, engagement, foto, TTD), `src/screens/captureSession/useCaptureDraft.ts:94-102` (`resume`).

**Dampak** — Tutor mengabaikan instruksi (wajar — formnya tampak siap diisi), mengetik sesi yang baru, lalu menekan "Lanjutkan draf" → **seluruh isian baru tertimpa draf lama secara senyap**. Sebaliknya, menekan "Buang draf" tidak membersihkan isian yang sudah terlanjur dibuat, sehingga batas antara "draf" dan "isian sekarang" menjadi kabur.

**Rekomendasi** — Pilih satu: (a) nonaktifkan form selagi draf tertunda (banner menjadi keputusan yang harus dijawab), atau (b) hapus banner dan buat pemulihan draf otomatis dengan penanda jelas "Dipulihkan dari draf · 12 Sep 20:14" + aksi "Mulai baru". Bila pengguna sudah mengedit lalu memilih memulihkan draf, tampilkan konfirmasi yang menyebutkan apa yang akan hilang.

---

### 🟠 C-07 — Pesan status draf menunjuk aksi yang tidak ada di layar

**Sumber kode** — `src/screens/CaptureSession.tsx:599-604`:

```
"Draf belum tersimpan. Isian tetap ada, coba simpan lagi."
"Draf berubah di tab lain. Muat draf terbaru sebelum melanjutkan."
```

Di layar tidak ada tombol "Simpan draf" (penyimpanan draf otomatis, 500 ms debounce — `useCaptureDraft.ts:87-92`) dan tidak ada kontrol "Muat draf terbaru": blok yang menyediakan aksi (`draft.resume`) hanya dirender saat `draft.pending`, sedangkan dua pesan ini dirender **justru ketika `!draft.pending`**. Jadi ketika status `conflict` muncul (revisi draf bentrok), penulisan draf berhenti gagal dan pengguna terjebak pada pesan tanpa jalan keluar.

**Dampak** — Instruksi yang tidak dapat dijalankan menurunkan kepercayaan pada janji "data aman di perangkat ini" — padahal justru di alur inilah kepercayaan itu paling penting.

**Rekomendasi** — Sediakan tombol pada tiap status: "Coba simpan lagi" (memanggil `draft.flush()`), "Muat draf terbaru" / "Pakai versi di layar" (untuk `conflict`). Bila tidak ada aksi yang masuk akal, ubah salinannya menjadi informasi netral tanpa kata perintah.

---

### 🟠 C-08 — Delapan pasangan warna gagal kontras AA

Diukur dari warna hasil render (fg vs latar opak pertama di atasnya), ambang AA 4,5:1 untuk teks normal:

| Teks | Ukuran/bobot | fg | bg | Rasio | Lokasi |
|---|---|---|---|---|---|
| "📝 Catatan Sesi" | 12 px / 900 | `#60a5fa` (`text-blue-400`) | `#eff6ff` | **2,43** | `CaptureSession.tsx:1830` |
| "Cukup" (skor 5–6) | 16 px / 900 | `#d97706` | `#fef3c7` | **2,86** | `engagement.ts:103` |
| "Kurang Fokus" (3–4) | 16 px / 900 | `#ea580c` | `#ffedd5` | **3,11** | `engagement.ts:104` |
| "Lengkapi dari profil murid…" | 12 px | `#d97706` (`text-amber-600`) | `#fffbeb` | **3,09** | `CaptureSession.tsx:1477` |
| "😊 Kondisi Belajar" + "Sangat Baik" | 12 px & 16 px / 900 | `#059669` | `#d1fae5` | **3,32** | `CaptureSession.tsx:1841-1856` |
| "📊 Konteks yang dipakai AI" | 12 px / 700 | `#3b82f6` (`text-blue-500`) | `#eff6ff` | **3,46** | `CaptureSession.tsx:1294` |
| Narasi engagement | 12 px | `#6b7280` | `#d1fae5` | 4,26 | `CaptureSession.tsx:1857` |
| "Baik" (7–8) | 16 px / 900 | `#2563eb` | `#dbeafe` | 4,24 | `engagement.ts:102` |
| Badge "opsional" | 12 px / 600 | — | — | 4,39 (perbatasan) | `CaptureSession.tsx:663` |

Seluruh lima warna `scoreLabel()` (`src/lib/engagement.ts:100-106`) gagal — dan yang terburuk, **"Cukup (5–6)" dengan 2,86:1, adalah status paling sering muncul**, karena skor dasar perhitungan memang 5 (lihat C-10). Warna yang sama dipakai di gauge langkah 3 (`1050-1065`), kartu "Kondisi Belajar" di laporan (`1841-1856`), `EngagementSummary`, dan laporan bulanan — jadi perbaikan di satu sumber memperbaiki banyak layar.

**Rekomendasi** — Gelapkan `color` pada `scoreLabel()` (mis. `#065f46`, `#1d4ed8`, `#b45309`, `#c2410c`, `#b91c1c`) dan turunkan `bg` satu tingkat, atau pindahkan teks status ke warna netral gelap di atas latar berwarna lembut. Ganti `text-blue-400` → `text-blue-700` pada judul "Catatan Sesi", `text-blue-500` → `text-blue-700` pada judul konteks AI, `text-amber-600` → `text-amber-800` pada kartu langkah 6.

---

### 🟠 C-17 — Loop autosave: layar berkedip ~2×/detik & 108 tulis DB/menit

*Dilaporkan pengguna ("saat di catat terlihat nge glitch"), lalu diverifikasi dan diukur.*

**Bukti terukur** — halaman `/capture` dibuka dan **dibiarkan tanpa satu pun interaksi**; `MutationObserver` merekam penambahan/penghapusan elemen:

```
t=224 ms  + <p class="mx-4 mb-3 text-xs font-semibold text-amber-700">
             "Draf belum tersimpan. Isian tetap ada, coba simpan lagi."
t=255 ms  − elemen yang sama dihapus            ← terlihat hanya 31 ms
t=790 ms  + muncul lagi
t=821 ms  − dihapus
… berulang tanpa henti
```

Trace presisi (5 detik, 18 flip DOM):

| Metrik | Hasil |
|---|---|
| Siklus kedip | **9× / 5 detik** |
| Periode | **532 ms** (529–535 — sangat teratur) |
| Lama pesan terlihat | **13–18 ms** per siklus (jadi terbaca sebagai *kedipan*, bukan pesan) |
| Pergeseran tata letak | `document.body.scrollHeight` **896 ↔ 924 px** (± 28 px, ~2×/detik) |
| Tulis IndexedDB (scope `new`) | **9 tulis / 5 detik = 108 tulis/menit**; revisi draf **70 → 77 dalam 4 detik** |
| Konfirmasi ulang pada pemuatan bersih | **11 tulis / 6 detik = 110 tulis/menit**, 11 kedipan; revisi draf scope `new` berjalan **20 → 333** selama sesi audit (± 20 menit halaman ini terbuka tanpa pemakaian) |
| Perubahan data pengguna selama itu | **tidak ada** |

**Akar masalah** — identitas `form` berubah pada setiap render.

1. `src/screens/CaptureSession.tsx:199-227` — `const draftForm: CaptureDraftForm = { … }` adalah **objek literal baru setiap render** (berisi juga `photo`/`signature`).
2. `src/screens/captureSession/useCaptureDraft.ts:87-92` — efek debounce memakai objek itu sebagai dependensi:
   ```js
   }, [form, phase, savedSessionId, scopeKey, write]);
   ```
   Karena identitas `form` selalu berubah, **timer 500 ms di-arm ulang pada setiap render**.
3. Siklus yang self-sustaining:

```text
render ──► arm timer 500 ms ──► write() ──► setStatus("unsaved")   (useCaptureDraft.ts:63) ──► render
   ▲                                │
   │                                └──────► saveCaptureDraft selesai ──► setStatus("saved")
   │                                                                      (useCaptureDraft.ts:78) ──► render
   └──────────────────────────────────── kedua render meng-arm ulang timer ─────────────────────────┘
```

   `write()` menaikkan status ke `unsaved` **sebelum** menunggu penyimpanan (`:63`), lalu menurunkannya ke `saved` setelah selesai (`:78`). Dua perubahan state = dua render = dua kali arm timer → 500 ms → ulangi. Loopnya tidak pernah berhenti: pesan amber (dirender saat `status === "unsaved"`, `CaptureSession.tsx:599-601`) muncul 13–18 ms setiap 532 ms sambil mendorong seluruh isi form 28 px ke bawah, lalu kembali.
4. Diperkenalkan pada commit `b9a9426` ("feat: harden data resilience and AI settings") — bersama lahirnya hook ini; `git log -S "const draftForm: CaptureDraftForm"` dan `git log -- useCaptureDraft.ts` menunjuk commit yang sama.

**Dampak**
- **Persepsi**: layar input data harian terlihat rusak — form bergetar ± 2×/detik, pesan merah/amber berkelip. Ini keluhan pertama yang muncul dari pemakaian nyata, bukan dari daftar periksa.
- **Beban & risiko**: ± 108 tulis IndexedDB per menit hanya untuk membuka satu halaman (bangunkan storage + `useLiveQuery` + alokasi serialisasi `photo`/`signature` bila ada). Revisi draf melonjak cepat (70 → 77 dalam 4 detik) sehingga **peluang `CaptureDraftConflictError` saat ada tab kedua naik drastis** — dan begitu status `conflict` terjadi, pengguna terjebak pada pesan tanpa aksi (lihat C-07).
- **Aksesibilitas**: kontainer pesan tidak punya `aria-live` (C-03), tetapi pada perangkat dengan pembaca layar yang agresif membaca perubahan DOM, kedipan 9×/5 detik berpotensi memicu pembacaan berulang.
- **Diagnostik tertutup**: observasi "pesan 'Draf belum tersimpan' muncul sejenak" yang pada audit pertama saya tandai *belum terverifikasi* kini terbukti — dan bukan kejadian sekali, melainkan terus-menerus.

**Rekomendasi (perbaikan termurah dengan dampak terbesar — usulkan P0)**
1. **Stabilkan identitas form.** Bungkus `draftForm` dengan `useMemo` berisi dependensi primitif (`currentStep, sessionDate, duration, subjects, topic, topicSearch, shortNote, needsWork, predictedGrade, mood, flags, behaviorTags, responseTag, situasiNote, sessionType, photo, signature, coSessionData, coFollowUps, coFollowUpText`) **atau** ubah kontrak hook: ganti dependensi `form` dengan `formRef` (di-update tiap render) + penghitung perubahan (`dirtyCounter`) yang hanya naik saat data benar-benar berubah. Dengan begitu efek hanya jalan sekali per perubahan data.
2. **Pisahkan "menyimpan" dari "gagal menyimpan".** Jangan pakai status transien `unsaved` untuk memicu pesan: beri ambang tunda (mis. 1,5 detik) sebelum menampilkan peringatan, sehingga operasi 40 ms tidak pernah muncul di layar.
3. **Hilangkan pergeseran tata letak.** Indikator status tidak boleh mengubah tinggi form: tempatkan indikator "Menyimpan…/Tersimpan" sebagai elemen berukuran tetap (mis. di samping judul langkah atau di bar aksi), bukan blok yang disisipkan.
4. **Guard test** (murah, mencegah kambuh): buka `/capture`, tunggu 3 detik tanpa interaksi, lalu pastikan (a) revisi draf di IndexedDB **tidak berubah**, dan (b) tidak ada elemen `.text-amber-700` yang muncul/hilang. Versi unit: render hook dengan `form` yang identitasnya berubah tiap render + fake timers → jumlah pemanggilan `saveCaptureDraft` harus tetap 1 per perubahan data nyata.

---

## Temuan sedang & rendah

### 🟡 C-09 — Tiga tombol, satu aksi simpan
Di langkah 6 tersedia tiga jalan keluar yang semuanya memanggil `handleSave()` yang sama:
- "⏭️ Nanti Saja — Simpan Tanpa Foto" (`1480-1483`)
- "Lewati" (`508-512`, `1593-1597` — pada langkah terakhir `skipStep()` memanggil `handleSave()`)
- "✅ Simpan Sesi" (`1598-1602`)

Label "Simpan Tanpa Foto" menyiratkan hasil yang berbeda dari "Simpan Sesi", padahal keduanya menyimpan tanpa foto bila foto belum dilampirkan. **Rekomendasi:** satu CTA utama; jadikan "Nanti Saja" sebagai tautan teks ("Isi foto nanti dari profil murid") dan sembunyikan "Lewati" pada langkah terakhir.

### 🟡 C-10 — Skor mulai dari 5 yang tidak terlihat
Chip menjanjikan aritmetika eksplisit — "Sudah siap **(+2)**", "Telat **(−1)**" — tetapi `calcEngagementScore` mulai dari `let s = 5` (`src/lib/engagement.ts:31`). Terukur: 1 flag "Sudah siap (+2)" → gauge menunjukkan **7**; 3 flag negatif (masing-masing −1) → **2/10**. Tutor tidak dapat memprediksi hasil ketukannya, dan "Cukup 5–6" (warna terburuk kontrasnya) menjadi default implisit. **Rekomendasi:** tampilkan basis secara eksplisit ("mulai dari 5"), atau ubah label chip menjadi tanpa angka dan biarkan gauge yang menjelaskan — jangan keduanya sekaligus.

### 🟡 C-11 — Kosakata berulang dengan makna berbeda
- "**Perlu Perhatian**": (1) grup flag negatif langkah 3 (`1004`), (2) grup respons negatif langkah 4 (`1240`), (3) label kolom langkah 4 (`1278`, "Perlu Perhatian Lebih"), (4) baris konteks langkah 5 (`1347`), (5) chip saran (`1401`), (6) label status skor 1–2 (`engagement.ts:105`). Enam tempat, empat makna.
- "**✨ Positif**" muncul **dua kali di langkah 3 yang sama** (`977` untuk 4 flag inti, `1083` untuk tag observasi) — dua taksonomi berbeda dengan judul identik.
- "**⚡ Cepat (isi 1 detik)**" dipakai di langkah 3 (`913`) dan langkah 4 (`1159`) dengan muatan yang sama sekali berbeda (mood/engagement vs kualitas respons akademik).
- Langkah 3 memakai "⚠️ Negatif lanjutan" (`1125`) sementara langkah 4 memakai "⚠️ Perlu Perhatian" (`1240`) untuk konsep yang setara.

**Rekomendasi:** beri setiap grup nama yang menyatakan **isinya** ("Indikator keterlibatan", "Observasi perilaku", "Kualitas jawaban akademik"), dan sisakan "Perlu Perhatian" untuk satu makna saja.

### 🟡 C-12 — Banner global menutupi judul halaman dan "Langkah X dari 6"
```
banner "backup menua" : top 0   bottom 60   z-205
h1 "📓 Catat Sesi"    : top 16  bottom 48   → tertutup penuh
"Langkah 1 dari 6"    : top 50  bottom 66   → tertutup sebagian
```
`src/App.tsx:174-187` merender banner `fixed top-0` sementara `.app-shell` (`src/index.css:61-63`) tidak memberi kompensasi padding atas. Pada Catat Sesi, yang tertutup adalah judul dan penghitung langkah — dua penanda orientasi utama. Selain itu, saat pengingat mingguan juga aktif, **dua pengingat backup tampil bersamaan** (banner merah di atas + nag amber di bawah; lihat lampiran `01-…` dan `02-…`). **Rekomendasi:** beri `.app-shell` padding atas dinamis saat banner tampil, dan tampilkan hanya satu pengingat backup pada satu waktu.

### 🟡 C-13 — Tap target di bawah standar aplikasi sendiri
Standar internal sudah ditetapkan: `BottomNav.tsx:56` memakai `min-h-[48px] min-w-[48px]`. Di langkah 3 (akordeon observasi terbuka) terukur **49 kontrol** di bawah 48 px:

| Kontrol | Ukuran | Lokasi |
|---|---|---|
| Tombol ⓘ (16 buah) | **29 × 38** | `CaptureSession.tsx:1093-1098` (pola sama di 1114, 1135) |
| Tombol tutup tooltip | **28 × 28**, tanpa nama aksesibel | `CaptureSession.tsx:1626` |
| Chip tag perilaku (16 buah) | tinggi 38 | `1090`, `1111`, `1132` |
| Chip preset / mood / durasi | tinggi 42 | `917-934`, `942-949`, `719-724` |
| Chip situasi (7 buah) | tinggi 38 | `964-970` |

Penanda ⓘ juga **menempel** pada chip tag (dua tombol berdampingan tanpa jarak, keduanya bulat separuh) sehingga salah ketuk mengubah data alih-alih membuka penjelasan. **Rekomendasi:** jadikan ⓘ target 44×44 dengan jarak ≥ 4 px dari chip, atau pindahkan penjelasan ke pola "tekan lama" / teks bantuan di bawah daftar; tambahkan `aria-label` pada tombol tutup tooltip.

### 🟡 C-14 — Deret chip durasi menggulir tanpa petunjuk
`sw = 575 px` di dalam wadah `cw = 416 px` (`CaptureSession.tsx:718-725`) → 4 dari 11 pilihan durasi (4,5j / 5j / 5,5j / 6j) berada di luar layar tanpa indikator gulir atau bayangan tepi. Tidak ada galat, tetapi pilihan yang tak terlihat sama saja tidak ada (N6). **Rekomendasi:** tambahkan gradien tepi + `scroll-snap`, atau ubah menjadi pilihan ringkas (mis. 1j / 1.5j / 2j / 3j + "lainnya" stepper).

### 🟢 C-15 — Dua bar navigasi bertumpuk & progres ditampilkan tiga kali
Bar aksi (69 px) + BottomNav (64 px) = **133 px dari 674 px viewport (≈ 20 %)**. Progres sesi muncul tiga kali pada satu layar: "Langkah X dari 6" (`586`), stepper berlabel (`606-651`), dan progress bar (`642-650`). **Rekomendasi:** pada wizard, sembunyikan BottomNav (pola fokus-tugas) — ini juga menghapus sumber tabrakan pada C-01 — dan sisakan stepper sebagai satu-satunya penanda progres.

### 🟢 C-16 — Kartu "Konteks yang dipakai AI" mendorong kolom wajib ke bawah
Langkah 5: kartu konteks setinggi **156 px** (`1293-1356`) mengulang data yang baru saja diisi di langkah 1–4, dan kolom **wajib** "Catatan Singkat" berada di offset dokumen **531 px** — di bawah kolom **opsional** "Prediksi Nilai". Terukur: pada langkah 5, pengguna harus menggulir sebelum kolom wajib terlihat di ponsel. **Rekomendasi:** jadikan kartu konteks dapat dilipat (default tertutup) dan letakkan kolom wajib di atas kolom opsional.

---

## Kekuatan (pertahankan)

Dikonfirmasi dari kode dan pengukuran — jangan rusak saat memperbaiki temuan di atas:

- **Pemulihan draf benar-benar berfungsi end-to-end.** Draf tersimpan per-scope (`new`, `student:…`, `schedule:…`), selamat dari muat ulang, dan terhapus bersih setelah laporan selesai (`sessions` + `captureDrafts` diperiksa langsung: draf = 0 setelah alur selesai).
- **Rancangan auto-save sudah tepat, eksekusinya belum.** Debounce 500 ms + `flush()` pada `goNext`/`goBack`/`handleSave` + `beforeunload` + event `leskolui:before-pwa-update` adalah pola yang benar dan tidak menahan UI — tetapi pemicunya saat ini berjalan berlebihan (C-17). Perbaiki pemicunya, **jangan** buang mekanismenya.
- **Simpan sesi idempoten terhadap klik ganda.** `coSavingRef` (`195`, `464-480`) mencegah tindak lanjut tersimpan dua kali.
- **Aksesibilitas stepper sudah benar:** setiap langkah punya `aria-label` kontekstual ("Kembali ke langkah 2: Materi" / "(belum aktif)") dan `aria-current="step"` (`615-638`).
- **Data yang tersimpan akurat** pada alur normal (tanpa `scheduleId`): diveifikasi di DB — `subjects`, `shortNote`, `mood`, `responseTag`, `engagement.score` semuanya konsisten dengan isian wizard.
- **Struktur 6 langkah dengan penanda opsional** jelas: setiap langkah punya ikon SVG, deskripsi, dan badge "opsional"; pengguna tahu berapa sisa langkah.
- **Ikon SVG, bukan emoji, untuk navigasi** (regresi V-05 tetap tuntas), dan tidak ada temuan dark-mode karena mode gelap memang dimatikan (`index.css:40-43`).

---

## Rencana tindak lanjut yang diusulkan

**P0 — blokir rilis (perbaiki lebih dulu)**
1. **C-17** — stabilkan identitas `draftForm` (atau ubah dependensi efek ke `formRef` + penghitung perubahan) dan hilangkan pesan status yang menggeser tata letak. Perbaikan terkecil dari seluruh daftar ini, tetapi keluhan pengguna yang paling terlihat; sekaligus menutup risiko konflik draf yang memperparah C-07.
2. **C-01** — pindahkan/naikkan nag di atas bar aksi, atau sembunyikan BottomNav+band nag selama wizard aktif; tambah guard test `elementFromPoint`.
3. **C-02** — kunci Murid & Tanggal pada alur `?scheduleId=` **atau** teruskan perubahannya ke repositori; tambah label mode "Menyelesaikan jadwal …" di header.

**P1 — tinggi (satu iterasi)**
4. **C-03** — scroll + fokus ke kolom bermasalah; `role="alert"` pada kontainer pesan.
5. **C-04** — preset aditif + konfirmasi bila ada flag aktif + undo.
6. **C-05** — pakai `components/Modal.tsx` untuk laporan/picker/tooltip; tambah tombol tutup & jalur "perbaiki catatan".
7. **C-06 / C-07** — tegakkan keputusan draf (kunci form atau pulihkan otomatis) dan beri tombol pada tiap status draf.
8. **C-08** — perbaiki `scoreLabel()` di `src/lib/engagement.ts` (memperbaiki 4+ layar sekaligus) + tiga kelas teks di `CaptureSession.tsx`.

**P2 — sedang/rendah (bisa menyusul)**
9. **C-09 … C-16** — konsolidasi CTA langkah 6, transparansi skor, penyeragaman kosakata, padding atas untuk banner, tap target ⓘ, petunjuk gulir chip durasi, penyembunyian BottomNav + satu penanda progres, lipat kartu konteks.

---

## Verifikasi (cara mengulang pengukuran)

Semua angka di dokumen ini dapat direproduksi di dev server (`npm run dev`, data seed otomatis):

```js
// C-01 — apakah CTA benar-benar dapat diketuk?
const cta = [...document.querySelectorAll('button')].find(b => /Lanjut\s*→/.test(b.textContent));
const r = cta.getBoundingClientRect();
document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === cta; // harus true

// C-02 — identitas murid pada alur ?scheduleId=
const { db } = await import('/src/db/db.ts');
(await db.sessions.get(scheduleId)).studentId;   // bandingkan dengan murid di laporan

// C-03 — posisi pesan validasi
// (kosongkan catatan, gulir ke bawah, tekan Lanjut) lalu:
const el = [...document.querySelectorAll('div')].find(d => d.textContent.trim() === '✏️ Tulis catatan singkat dulu.');
el.getBoundingClientRect().top;                  // negatif = di luar viewport
el.getAttribute('aria-live');                     // saat ini null

// C-08 — kontras hasil render (oklch dikonversi lewat canvas)
const toRgb = (c) => { const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const x = cv.getContext('2d'); x.fillStyle = c; x.fillRect(0,0,1,1);
  return [...x.getImageData(0,0,1,1).data]; };

// C-17 — bukti loop autosave (buka /capture, JANGAN sentuh apa pun)
const rev = async () => (await (await import('/src/db/db.ts')).db.captureDrafts.toArray())
  .find(d => d.scopeKey === 'new')?.revision;
const r1 = await rev(); await new Promise(r => setTimeout(r, 5000)); const r2 = await rev();
r2 - r1;   // saat ini ≈ 9 (108 tulis/menit) padahal tidak ada perubahan data; setelah perbaikan harus 0
```

Usulan guard otomatis (murah, mencegah regresi berulang):
- **E2E** `e2e/capture-guard.spec.ts`: (a) saat nag tampil, CTA wizard adalah elemen teratas di titik tengahnya; (b) setelah mengubah murid pada `?scheduleId=`, laporan & baris DB menunjuk murid yang sama; (c) pesan validasi berada di dalam viewport setelah menggulir ke bawah; (d) **diam 3 detik di `/capture` tanpa interaksi → revisi draf tidak berubah & tidak ada elemen status yang muncul/hilang** (guard C-17).
- **Unit** `src/__tests__/engagement.test.ts`: setiap pasangan `scoreLabel()` memenuhi rasio ≥ 4,5:1 (uji palet, bukan piksel).
- **Unit** `useEngagement`: `applyPreset` tidak boleh mengosongkan flag yang tidak disebut dalam `pattern` (menjaga C-04 tetap tertutup).

---

## Keterbatasan audit

- **Konteks ukur.** Pengukuran dilakukan pada jendela Chrome 767 × 674 px; kolom aplikasi 448 px (`max-w-md`) sehingga metrik horizontal mewakili ponsel besar. Tinggi viewport **lebih pendek** dari Pixel 7 (915 px) — ini membuat temuan C-03 *lebih sering* muncul daripada di perangkat 915 px, tetapi **tidak** membuatnya tidak valid: ambangnya `scrollY ≥ 244`, dan papan tik maya (kasus paling mungkin pada langkah 5) selalu menurunkan ambang itu.
- **Tanpa screenshot ponsel asli.** Playwright (3 project: chromium/mobile/mobile-dark) tidak dapat dijalankan di lingkungan ini; lampiran PNG diambil dari jendela Chrome 767 × 674, bukan emulasi Pixel 7.
- **Kontras dihitung dari nilai warna render**, bukan sampling piksel dari tangkapan layar; latar bergradien (header laporan hijau) sengaja dilewati sehingga tidak ada klaim palsu di sana. Untuk klaim resmi, ukur ulang dengan axe/Lighthouse.
- **Data dummy.** Pengujian C-02 memakai jadwal dummy (Andi Pratama) dan telah dikembalikan ke `SCHEDULED` setelah pengujian; data sesi lain tidak diubah.
- **Observasi yang awalnya tak terverifikasi sudah tertutup.** Pesan "Draf belum tersimpan" yang sempat muncul sekejap pada audit pertama ternyata bukan kejadian acak: itu bagian dari loop autosave yang sekarang terdokumentasi penuh sebagai **C-17** (9 kedipan / 5 detik, 108 tulis DB/menit, tanpa interaksi). Temuan ini juga menjelaskan keluhan pengguna "saat di catat terlihat nge glitch".
- **Cakupan.** Audit ini fokus pada alur Catat Sesi (wizard, laporan, draf, overlay). Layar Home/Murid/Laporan/Keuangan hanya diperiksa sejauh berinteraksi dengan alur ini (mis. banner global, BottomNav, entry point `?scheduleId=` / `?studentId=`).

## Lampiran — screenshot

Folder `e2e/screenshots/audit-catat-sesi/` (jendela 767 × 674, kolom aplikasi 448 px):

| Berkas | Menampilkan |
|---|---|
| `01-nag-menutupi-action-bar.png` | Banner "Saatnya backup mingguan" tepat di atas bar aksi; tombol "Lanjut →" ada di baliknya (C-01) |
| `02-judul-tertutup-banner-draf.png` | Banner "backup menua" menutupi judul "📓 Catat Sesi" + pesan validasi "👤 Pilih murid dulu." (C-12, C-03) |
| `03-step3-situasi.png` | Langkah 3: presets, mood, kolom situasi + chip — bar aksi menempel di atas BottomNav (C-04, C-15) |
| `04-step3-flag-poin.png` | Grup "⚠️ PERLU PERHATIAN" dengan poin per tombol; "Gelisah loncat-loncat (−1)" membungkus 2 baris (C-10, C-11, C-13) |

Kedipan C-17 **tidak** dilampirkan sebagai gambar: durasi tampilnya hanya 13–18 ms sehingga tidak dapat ditangkap screenshot secara andal. Buktinya bersifat numerik (`MutationObserver` + hitungan revisi draf) dan dapat diulang dengan cuplikan di bagian *Verifikasi*.

---

## Bagian 9 — Hasil setelah perbaikan

Dirilis sebagai **v1.73.0** (2026-09-12). Berikut apa yang berubah, dan bukti bahwa temuannya benar-benar hilang.

### 9.1 Temuan → perbaikan

| ID | Perbaikan | Berkas utama |
|---|---|---|
| 🔴 C-01 | TInggi bar aksi dipublikasikan sebagai CSS var `--task-bar-h`; nag mingguan, flash, dan toast mengambang **di atas** bar aksi, bukan menutupinya. Tinggi bar dipatok (bukan diukur) supaya tidak bergantung waktu pemasangan `ref`. BottomNav + bar aksi tetap seperti semula | `index.css`, `CaptureSession.tsx`, `App.tsx`, `Toast.tsx` |
| 🔴 C-02 | Mode jadwal diberi penanda "Menyelesaikan jadwal" + murid/tanggal/durasi; kontrol **Murid** & **Tanggal** dikunci dengan keterangan; tautan "Catat sesi baru"; jaring pengaman `scheduleCaptureMismatch()` di `handleSave`; efek reset mapel tidak lagi menghapus mapel bawaan jadwal | `CaptureSession.tsx`, `lib/scheduleCapture.ts` (baru) |
| 🟠 C-03 | `validateCurrentStep` mengembalikan kolom sasaran; galat menggulir ke kolom itu, memindahkan fokus, dan kontainer pesan memakai `role="alert"` + `tabIndex={-1}` | `CaptureSession.tsx` |
| 🟠 C-04 | `applyPreset` menjadi **aditif** (tidak lagi `{...INITIAL, ...pattern}`); "Reset" diganti nama "Kosongkan" dengan keterangan; ditambah **undo** (`undoAvailable`, `undo`); preset langkah 4 tidak lagi mengosongkan kolom Fokus Perbaikan | `useEngagement.ts`, `CaptureSession.tsx` |
| 🟠 C-05 | Laporan sesi, picker mapel, tooltip, dan modal biaya AI memakai `components/Modal.tsx` (ESC, klik latar, focus trap, pemulihan fokus); laporan punya tombol tutup sendiri; aksi **"✏️ Perbaiki catatan sesi"** menyimpan ulang lewat `updateSession` (memperbarui, bukan menduplikasi); simpan ulang saat laporan belum rampung membuka kembali laporan | `CaptureSession.tsx` |
| 🟠 C-06 | Draf tertunda: bila form masih kosong → layar keputusan yang menahan form; bila sudah ada isian → banner dengan label eksplisit ("Ganti dengan draf" / "Hapus draf, pakai isian layar") sehingga tidak ada penimpaan senyap | `CaptureSession.tsx` |
| 🟠 C-07 | Tiap status draf punya aksi: "Coba simpan lagi" (`retry`), "Pakai versi tersimpan" (`reload`), "Pertahankan versi di layar" (`overwrite`); indikator status pindah ke header dan tidak menggeser tata letak | `useCaptureDraft.ts`, `CaptureSession.tsx` |
| 🟠 C-08 | `scoreLabel()` memakai warna gelap; semua lima tingkat kini ≥ 4,5:1 (terburuk "Cukup" → 6,5:1). Teks laporan (`text-blue-400`, `text-blue-500`, `text-amber-600`) dinaikkan kontrasnya | `lib/engagement.ts`, `CaptureSession.tsx` |
| 🟠 C-17 | Hook draf membandingkan **isi** form (bukan identitas objek) lewat `captureDraftPersistKey()`; efek hanya menjadwalkan tulis bila isi berubah; `draftForm` dibungkus `useMemo`; status transien dipisah (`saving`) sehingga tidak pernah dirender sebagai galat; `syncFromStore()` menyelaraskan revisi setelah repositori menulis draf lewat jalur close-out | `lib/captureDraftDigest.ts` (baru), `useCaptureDraft.ts`, `CaptureSession.tsx` |
| 🟡 C-09 | "Nanti Saja — Simpan Tanpa Foto" dihapus dan "Lewati" disembunyikan di langkah terakhir → langkah Bukti hanya punya satu tombol simpan | `CaptureSession.tsx` |
| 🟡 C-10 | Gauge skor menyatakan dasarnya: "Dasar 5/10: tiap indikator di bawah menambah atau mengurangi." | `CaptureSession.tsx` |
| 🟡 C-11 | Nama grup dibedakan: "Indikator Positif" / "Indikator Perlu Perhatian" / "Perilaku Positif" / "Perilaku Netral" / "Perilaku Negatif" / "Respons Perlu Perhatian"; "⚡ Cepat" → "Isi cepat (kondisi)"/"(respons)"; kolom "Perlu Perhatian Lebih" → "🎯 Fokus Perbaikan Berikutnya" | `CaptureSession.tsx` |
| 🟡 C-12 | Banner atas diukur → `--top-banner-h`, `.app-shell` diberi `padding-top` setinggi itu; nag mingguan disembunyikan selama banner backup menua/penyimpanan tampil (satu pengingat pada satu waktu) | `index.css`, `App.tsx` |
| 🟡 C-13 | Tombol ⓘ menjadi 32 px, bulat, terpisah (`gap-1`) dari chip, dan ber-`aria-label` ("Info <nama tag>"); tombol tutup tooltip diberi `aria-label` + 36 px | `CaptureSession.tsx` |
| 🟡 C-14 | Deret chip durasi diberi `snap-x`, ruang kanan, dan gradien tepi sebagai penanda masih ada pilihan | `CaptureSession.tsx` |
| 🟢 C-15 | Progress bar gradien dihapus (stepper + "Langkah X dari 6" sudah menyatakan hal yang sama) | `CaptureSession.tsx` |
| 🟢 C-16 | Kartu "Konteks yang dipakai AI" dilipat secara default; kolom wajib **Catatan Singkat** dipindah ke atas kolom opsional **Prediksi Nilai** | `CaptureSession.tsx` |

### 9.2 Bukti sebelum → sesudah (diukur ulang di browser)

| Ukuran | Sebelum | Sesudah |
|---|---|---|
| Kedipan status draf (tanpa interaksi) | 9–11× / 5 detik | **0** |
| Tulis IndexedDB tanpa perubahan data | 108–110 / menit | **0** |
| Tumpang tindih nag ↔ bar aksi | 57 px (CTA tertutup penuh) | **−12 px** (jarak 12 px, tidak bersinggungan) |
| `elementFromPoint` di tengah "Lanjut →" | elemen banner nag | **tombol "Lanjut →"** |
| Judul halaman vs banner atas | h1 16–48 px di balik banner 0–60 px (tertutup penuh) | h1 di 76–108 px, `padding-top` = 60 px (tidak tertutup) |
| Pengingat backup tampil bersamaan | 2 (banner merah + nag amber) | **1** |
| Preset "😐 Biasa" dengan 2 indikator negatif aktif | indikator terhapus (skor 2 → 5) | indikator **tetap** (aditif), tersedia "Batalkan perubahan terakhir" |
| Preset "⭐ Lancar" langkah 4 dengan kolom Fokus Perbaikan terisi | kolom dikosongkan | isian **tetap** |
| Mode jadwal: ubah murid lalu simpan | laporan menampilkan murid B, baris DB milik murid A, tanpa peringatan | kontrol dikunci + penanda mode; `scheduleCaptureMismatch()` menolak bila menyimpang |
| Mapel bawaan jadwal di langkah 2 | terhapus oleh efek reset | **tetap terpilih** ("Mathematics AA") |
| Laporan sesi: tutup | tidak ada tombol, ESC tidak bekerja, klik latar tidak bekerja, fokus tetap di `<body>` | tombol tutup ✓, ESC ✓, klik latar ✓, fokus **di dalam** dialog ✓ |
| Simpan ulang setelah laporan ditutup | (tidak mungkin) | membuka kembali laporan, **jumlah sesi tidak bertambah** (46 → 46) |
| "Perbaiki catatan sesi" | (tidak ada) | memperbarui sesi yang sama (46 → 46), catatan berubah, tindak lanjut lama **tetap ada** |
| Posisi kolom wajib "Catatan Singkat" (langkah 5) | dokumen y = 531 px (terdorong kartu konteks 156 px) | y = 445 px, terlihat tanpa menggulir |
| Tombol simpan di langkah 6 | 3 ("Nanti Saja", "Lewati", "Simpan Sesi") | **1** ("✅ Simpan Sesi") |
| Tombol ⓘ | 29 × 38 px, tanpa nama aksesibel, menempel pada chip | 32 × 32 px, `aria-label="Info …"`, berjarak 4 px |

### 9.3 Dua penyimpangan yang disengaja (beserta alasannya)

1. **C-15 — BottomNav tidak disembunyikan.** Audit mengusulkan menyembunyikan bottom-nav selama wizard aktif. Itu diuji dan **dibatalkan**: tanpa bottom-nav, satu-satunya jalan keluar dari wizard adalah breadcrumb di atas (yang ikut tergulir) atau "← Kembali" langkah demi langkah — terlalu mudah membuat pengguna terjebak. Akar masalah C-15 sebenarnya sudah hilang lewat C-01 (band bawah kini punya pemilik yang jelas) dan progress ganda dikurangi dengan menghapus progress bar. Bila kelak ingin mode fokus, sediakan tombol "✕ Batal" yang selalu terlihat lebih dulu.
2. **C-13 — chip teks (38–42 px) dibiarkan.** Standar 48 px milik aplikasi ini dipakai untuk navigasi; menaikkan ~40 chip menjadi 48 px akan memanjangkan halaman input secara berarti. Yang diperbaiki adalah bagian yang berisiko salah ketuk (ⓘ yang menempel pada chip) dan yang tak punya nama aksesibel. Chip tetap ≥ 24 px sehingga tetap lolos WCAG 2.5.8 (AA).

### 9.4 Verifikasi rilis v1.73.0

| Item | Hasil |
|---|---|
| Unit test (`vitest run`) | ✅ **475 lulus / 47 berkas** (dari 458 sebelum audit) |
| Guard test baru | `captureDraftDigest.test.ts` (8) — isi sama ⇒ tidak ditulis ulang; `scheduleCapture.test.ts` (4) — murid/tanggal menyimpang ditolak; `engagementContrast.test.ts` (2) — semua tingkat skor ≥ 4,5:1; `captureDraftDiscard.test.ts` (3) — revisi draf wajib direset setelah draf dibuang |
| `tsc --noEmit -p tsconfig.app.json` | ✅ 0 error |
| `eslint .` | ✅ 0 error / 0 warning |
| `npm run build` | ✅ sukses, `dist/sw.js` + `dist/workbox-*.js` dibuat |
| Uji manual alur kritis (browser) | ✅ simpan sesi baru, ESC/klik-latar menutup 4 modal, simpan ulang tidak menduplikasi, "perbaiki catatan" memperbarui sesi yang sama, selesai close-out menyimpan tindak lanjut + menghapus draf + pindah ke profil, mode jadwal mengunci & mempertahankan mapel jadwal |
| Screenshot bukti | `05-perbaikan-nag-di-atas-action-bar.png`, `06-perbaikan-mode-jadwal-banner-draf.png` |

### 9.5 Dua bug tambahan yang ditemukan **saat** verifikasi perbaikan

Keduanya tidak ada dalam daftar temuan awal, ditemukan karena alur diuji ulang setelah diperbaiki:

1. **`discard()` tidak mereset identitas & revisi draf** (`useCaptureDraft.ts`). Setelah "Buang draf & mulai baru", penulisan berikutnya memakai revisi draf lama yang sudah dihapus → `CaptureDraftConflictError` → sesi gagal disimpan dengan pesan "Gagal: Draf berubah sebelum sesi disimpan". Diperbaiki dengan membuat `draftId` baru + `revision = 0`, dan dijaga `captureDraftDiscard.test.ts`.
2. **Revisi draf tidak tersinkron setelah repositori menulis fase `closeout`.** `createSessionWithCloseoutDraft()` menyimpan draf lewat jalur repo, sehingga `revisionRef` di hook tertinggal satu langkah → konflik palsu segera setelah sesi tersimpan. Diperbaiki dengan `syncFromStore()` yang dipanggil setelah simpan berhasil.

Keduanya juga menjelaskan pesan "Draf belum tersimpan"/"Draf berubah di tab lain" yang sempat muncul sekejap pada audit pertama — jadi bukan lagi observasi tak terverifikasi.


