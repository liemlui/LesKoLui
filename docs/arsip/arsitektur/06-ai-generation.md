# 06 - AI Generation (DeepSeek Direct API)

Status: diselaraskan dengan aplikasi v1.71.1 dan dokumentasi resmi pada 11 September 2026.

## Pemanggilan API

Browser memanggil `POST https://api.deepseek.com/chat/completions` dengan API key dari IndexedDB (`Settings.ai.apiKey`) di header `Authorization: Bearer ...`. Konfigurasi bersama ada di `src/lib/aiConfig.ts`.

- Model: `deepseek-flash` (DeepSeek V4.1 Flash).
- `thinking: { type: "disabled" }` untuk mode hemat, `stream: false`.
- `response_format: { type: "json_object" }`; setiap system prompt meminta JSON dan memberi contoh bentuk hasil.
- `temperature: 0.7`; `max_tokens` dibatasi per tugas.
- Timeout 30 detik. Respons terpotong, diblokir, atau belum selesai ditolak sebelum parsing/penyimpanan.
- JSON divalidasi saat runtime dengan `aiValidation.ts`, termasuk kecocokan ID narasi.
- Model lama pada pengaturan dinormalisasi saat baca, simpan, dan inisialisasi; API key serta preferensi lain dipertahankan. Restore backup lama juga memakai model baru.

Referensi: [pemanggilan pertama](https://api-docs.deepseek.com/), [Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/), [Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode/).

## Informasi yang dikirim dari menu

AI berjalan setelah tutor memilih tindakan AI dan mengonfirmasi modalnya. Pengaturan AI dan modal menjelaskan data yang dikirim. Foto, tanda tangan, nomor WhatsApp, rekening, dan PIN tidak otomatis dilampirkan. Teks bebas yang dimasukkan tutor tetap ikut dikirim bila menjadi bahan fitur tersebut.

| Menu | Isi permintaan |
|---|---|
| Draft Catatan | Nama/level/kelas murid, mapel, topik, mood, jenis/durasi sesi, area perhatian, prediksi nilai, situasi hari ini, skor/indikator engagement, perilaku/respons, catatan sesi sebelumnya, draft aktif, gaya penulisan, follow-up |
| Poles WhatsApp | Seluruh draft pesan, nama murid, nama tutor |
| Ringkasan/narasi laporan | Nama/level murid, periode, rata-rata engagement sebelumnya bila tersedia; sesi terpilih berisi ID, tanggal, mapel, catatan singkat, mood, topik, area perhatian, prediksi/nilai akhir/refleksi, skor engagement, perilaku/respons |
| Insight Keuangan | Bulan, ringkasan keuangan, piutang/nama/umur tagihan, pendapatan/nama/level/tarif/engagement murid, kategori pengeluaran, rata-rata tiga bulan, proyeksi, kolektibilitas, laporan belum dibagikan, piutang menua, rata-rata hari bayar, debitur terbesar |

Payload laporan memakai daftar field eksplisit agar field tambahan pada objek sesi tidak ikut terkirim. Narasi memproses sesi baru/berubah; regenerasi paksa memproses semua sesi. Ringkasan memakai semua sesi dalam periode. Situasi hari ini tetap terbatas pada Draft Catatan, tidak ditambahkan sebagai field laporan orang tua.

## Fungsi klien

| Fungsi | Hasil |
|---|---|
| `generateNarratives` | Narasi setiap sesi + ringkasan + catatan guru + kutipan + rencana berikutnya |
| `generateReportSummary` | Ringkasan + kutipan + rencana berikutnya |
| `draftShortNote` | Draft catatan sesi dengan gaya rapikan/perluas/ringkas |
| `polishWhatsApp` | Draft pesan WA yang dipoles |
| `generateFinancialInsights` | Anomali + rekomendasi |
| `analyzeStudent` | Pola + fokus + penyemangat; helper belum memiliki pemanggil menu aktif |
| `draftStudyNote` | Perkuat catatan belajar; helper belum memiliki pemanggil menu aktif |

Catatan Belajar yang saat ini ada pada detail murid disimpan lokal. Semua hasil AI yang dipakai aplikasi tetap dapat diperiksa dan disunting tutor.

## Estimasi biaya

Tarif V4.1 Flash efektif 10 September 2026 pukul 04.00 UTC. USD per satu juta token:

| Jenis token | Off-peak | Peak |
|---|---:|---:|
| Input cache hit | $0.003 | $0.006 |
| Input cache miss | $0.15 | $0.30 |
| Output | $0.60 | $1.20 |

Peak: Senin-Jumat 01.00-04.00 dan 06.00-10.00 UTC (08.00-11.00 dan 13.00-17.00 WIB). Di luar itu off-peak, termasuk akhir pekan. Fungsi estimasi memilih tarif sesuai waktu saat estimasi dibuat, memakai input cache miss dan **kurs asumsi** Rp16.000/USD. Jumlah token masih perkiraan; tagihan aktual bergantung pada token, cache, dan waktu pemrosesan penyedia.

Sumber: [Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing), [rilis V4.1](https://api-docs.deepseek.com/news/news260910/). Periksa sumber ini sebelum memperbarui konstanta tarif.

## Verifikasi

`aiClient.test.ts` menguji kontrak permintaan seluruh fungsi dengan API tiruan, validasi respons dan pembatasan data laporan. `aiConfig.test.ts` menguji batas waktu tarif dan perhitungan. `aiSettings.test.ts` menguji migrasi/restore model tanpa kehilangan API key. Tes tidak menghubungi DeepSeek atau memakai data murid asli.
