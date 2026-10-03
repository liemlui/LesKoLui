# TASK-11 — Menuntaskan emoji → SVG pada kontrol (lanjutan G2-09)

> **STATUS:** `menunggu keputusan pemilik` · **PEMILIK:** agen AI
> **DIBUAT:** 2026-10-03 · **BASELINE:** v1.88.0
> **MERUPAKAN:** lanjutan **G2-09** (bukan tugas baru di daftar 22) — ROADMAP tetap 22 tugas
> **INDUK:** [`GELOMBANG-2.md`](../arsip/GELOMBANG-2.md) §G2-09 · **ATURAN:** [`ATURAN-AI.md`](ATURAN-AI.md)
> **BACA DULU:** [`03-PLAYBOOK-AUDIT-UIUX-VISUAL.md`](../03-PLAYBOOK-AUDIT-UIUX-VISUAL.md) §5.3.3

## 0. Ringkas: apa yang sudah selesai dan apa yang tidak

| Bagian | Status |
|---|---|
| Emoji yang **tertulis langsung di JSX** (judul + tombol) | ✅ **0** — diukur `.design-audit/g2-09-check.cjs` |
| Metrik emoji di guard `e2e:uiux` | ✅ ditambahkan (`emojiInControlsCount`, `test.fixme` + residual) |
| Emoji yang hidup di **berkas DATA** (`icon: "…"`) | ❌ **70 entri di 7 berkas** — 14 situs render-nya ada **di dalam `<button>`** |

Artinya doa DoD G2-09 (“0 emoji pada `<button>`/heading”) **belum** tercapai meski JSX sudah bersih.
Berkas ini menyebutkan tepatnya apa yang tersisa dan dua cara menutupnya.

## 1. Angka terukur (2026-10-03)

Alat: `.design-audit/g2-09-inventaris.cjs` · `.design-audit/g2-09-trace-render.cjs` · `.design-audit/g2-09-check.cjs`

| Ukuran | Nilai |
|---|---|
| Entri `icon:` di berkas data | **70** — `responseTaxonomy.ts` 26 · `captureSession/constants.ts` 19 · `template/layouts/*` 9 · `moods.ts` 5 · `sessionTemplates.ts` 6 · `engagement.ts` 3 · (`constants.ts` STEP_META 6 memakai nama ikon, bukan emoji) |
| Situs render `{x.icon}` **di dalam `<button>`** | **14** — `CaptureSession.tsx` 9 · `SessionDetailModal.tsx` 4 · `ScheduleStep.tsx` 1 |
| Situs render **di luar** kontrol | **9** — tooltip, chip `<span>` di RiwayatSesi, templat laporan |

Situs yang menentukan DoD (14 tempat):

| Berkas | Ekspresi | Sumber data |
|---|---|---|
| `CaptureSession.tsx` | `{opt.icon}` | `SESSION_TYPE_OPTIONS` (6) |
| `CaptureSession.tsx` | `{meta.icon}` ×2 | `ENGAGEMENT_FLAG_META` (12) |
| `CaptureSession.tsx` | `{c.icon}` | `SITUASI_CHIPS` (7) |
| `CaptureSession.tsx` | `{m.icon}` | `MOODS` (5) |
| `CaptureSession.tsx` | `{tag.icon}` ×4 | `RESPONSE_TAGS` (26) |
| `SessionDetailModal.tsx` | `{t.icon}` ×2, `{opt.icon}`, `{m.icon}` | `RESPONSE_TAGS`, `SESSION_TYPE_OPTIONS`, `MOODS` |
| `ScheduleStep.tsx` | `{option.icon}` | `SESSION_TYPE_OPTIONS` |

## 2. Klasifikasi emoji menurut risiko penggantian

### 2.1 Kelompok 1 — padanan ikon **sudah ada** (aman, tanpa desain baru)

`📚`→BookIcon · `📋`→ClipboardIcon · `🔄`→RefreshIcon · `⏳`→HourglassIcon · `🔍`→SearchIcon ·
`📝`→PencilIcon · `🎯`→TargetIcon · `⚡`→BoltIcon · `📱`→PhoneIcon · `❌`→CloseIcon ·
`⏰`→ClockIcon · `⛔`→BanIcon · `⚠️`→WarningIcon · `🚫`→BanIcon

Catatan: `📝`, `📚`, `🔄`, `🌤️`, `✅` masing-masing dipakai **dua kontrol berbeda** — persis seperti
hari ini. Menggantinya dengan ikon yang sama **tidak** menambah tabrakan baru.

### 2.2 Kelompok 2 — butuh ikon baru, tetapi bentuknya **tidak ambigu** (risiko rendah)

`🌟`/`⭐`→StarIcon · `🟡`/`🔴`→CircleDotIcon (2 warna) · `✅`→CheckCircleIcon · `🎲`→DiceIcon ·
`🗣️`→SpeechIcon · `💨`→WindIcon · `🌧️`→RainIcon · `🔧`/`🛠️`→WrenchIcon · `💡`→LightbulbIcon ·
`👀`→EyesIcon · `📌`→PinIcon · `🔥`→FlameIcon · `🌙`→MoonIcon · `🌤️`→SunIcon · `🧩`→PuzzleIcon ·
`🚀`→RocketIcon · `💬`→ChatIcon

⚠️ Satu hal yang harus diputuskan di sini: **`🌟` dan `⭐` dipakai dua tag berbeda di dalam modul yang
sama** (`Antusias` vs `Benar mandiri`). Kalau keduanya jadi StarIcon, perbedaan itu hilang — perlu
varian (mis. bintang penuh vs bintang garis) atau salah satunya pindah makna.

### 2.3 Kelompok 3 — **emosi/keadaan tubuh**: butuh desain khusus, dan salah gambar = informasi salah

21 emoji. Ini yang membuat konversi tidak bisa dikerjakan “asal jadi”:

| Emoji | Label | Kontrol |
|---|---|---|
| `💪` | Percaya diri | tag respons |
| `🪞` | Reflektif | tag respons |
| `🤝` | Dialog aktif | tag respons |
| `🧘` | Tenang | tag respons |
| `🤔` | Terlalu hati-hati | tag respons |
| `🔭` | Eksploratif | tag respons |
| `😤` | Frustrasi | tag respons |
| `😰` | Cemas | tag respons |
| `🧠` | (prasyarat belum siap) | tag respons |
| `😷` `😴` `🏃` `🍚` `🎉` `💭` | Habis sakit · Kurang tidur · Habis ekskul · Belum makan · Ada acara keluarga · Ada masalah pribadi | chip situasi |
| `🙋` `🥱` `🚻` `🦘` `🙈` | Aktif bertanya · Mengantuk · Sering ke toilet · Gelisah · Sibuk sendiri | indikator perilaku |

Alasan kenapa ini bukan sekadar “tambah 21 ikon”: indikator perilaku dipakai tutor untuk **membaca
kondisi murid**. Ikon stroke generik untuk “Gelisah” atau “Sibuk sendiri” besar kemungkinan terbaca
salah, dan salah baca di sini lebih buruk daripada emoji yang sudah dikenal semua orang.

### 2.4 Di luar lingkup

9 emoji di `src/template/layouts/*` dirender **di dalam templat laporan**, bukan kontrol — tetap
sebagai elemen dekoratif laporan.

## 3. Kendala yang mengikat pilihan

| Kendala | Akibat |
|---|---|
| `src/lib/engagement.ts` **dilindungi §2.1** | Ikon `✅ 🌤️ ⚠️` tidak boleh diubah di sana. Solusi yang tidak melanggar: **peta emoji→ikon di sisi pemanggil** (`<EmojiIcon value={x.icon}/>`), berkas data tidak disentuh sama sekali |
| `src/__tests__/captureSessionHelpers.test.ts:283-301` menjaga **keunikan ikon** `ENGAGEMENT_FLAG_META` vs `MOODS` dengan membandingkan **string** | Opsi konversi penuh **wajib menulis ulang tes itu** (membandingkan komponen, bukan emoji). Tes itu tidak bisa dijalankan di putaran terakhir karena gate tes dimatikan |
| `npm run e2e:uiux` belum dijalankan | Angka residual **per layar** belum ada; yang ada baru angka statis |

## 4. Tiga opsi (pilih satu)

| Opsi | Isi | Dampak DoD | Perkiraan |
|---|---|---|---|
| **A — persempit DoD** | DoD jadi “0 emoji pada kontrol **selain** kosakata semantik (tag respons, chip situasi, indikator perilaku)”. 21 emoji Kelompok 3 tetap, dan pencapaiannya didaftarkan di guard sebagai `test.fixme` dengan alasan tertulis | DoD asli **tidak** tercapai, tetapi tercapai versi yang disepakati | S (0,5 jam) |
| **B — konversi penuh** | Kelompok 1 + 2 + 3 → ±38 ikon baru, 14 situs render diganti, tes keunikan ikon ditulis ulang, guard dijalankan | DoD asli **tercapai** | L (±1 gelombang) |
| **C — hibrida** | Konversi Kelompok 1 + 2 pada kontrol yang **tidak bercampur** (`MOODS`, `SESSION_TYPE_OPTIONS`, `SITUASI_CHIPS`, `ENGAGEMENT_FLAG_META`), `RESPONSE_TAGS` ditunda sampai desain Kelompok 3 disetujui | Sebagian; `RESPONSE_TAGS` tetap emoji | M |

Rekomendasi teknis: **A atau B**, jangan C — C meninggalkan dua bahasa visual di dalam satu layar
(chip situasi bersih, chip respons masih emoji) dan itu lebih buruk daripada keduanya.

## 5. Rencana verifikasi (berlaku untuk B)

1. `npx tsc -b` → 0 (gate yang berlaku sekarang).
2. Skrip peta: pastikan **setiap** emoji yang muncul di berkas data punya entri peta (menangkap
   emoji baru yang ditambahkan kelak tanpa ikon).
3. Skrip keunikan: tidak ada dua entri **dalam satu modul** yang memakai ikon sama.
4. `npm test` (termasuk tes keunikan yang ditulis ulang) dan `npm run e2e:uiux` — dua gate yang saat
   ini dimatikan; tanpa keduanya, hasilnya tetap “terimplementasi”, bukan “terbukti”.

## 6. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-03 | Dibuat dari sisa G2-09: JSX sudah bersih (0), sisa 70 entri `icon:` di berkas data dengan 14 situs render di dalam kontrol; 21 di antaranya butuh keputusan desain |
