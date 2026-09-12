# Penyesuaian Pesan WhatsApp — Les Ko Lui

> **Tanggal:** 2026-09-05
> **Tujuan:** Humanisasi & penyelarasan tone pesan WhatsApp yang dikirim aplikasi ke orang tua/murid — sesuai arahan pemilik (tutor privat untuk klien high-profile; komunikasi harus personal, hangat, dan tidak seperti sistem invoice/debt collector).
> **Status:** ✅ selesai dieksekusi — builder billing, pesan manual, dan penghapusan Reminder AI sudah diterapkan.

---

## Prinsip yang Dikunci (dari arahan pemilik)

1. **Personal & high-context** — tutor privat untuk ortu affluent; bukan debt collector, bukan sistem invoice.
2. **Tanpa info bank** di semua pesan — biarkan ortu bertanya sendiri atau melihat di foto/absen sesi.
3. **Tanpa nama parent / sapaan "Bu/Pak"** — hangat tapi tidak seperti "orang lain"/template umum.
4. **Tanpa kata transaksional**: *pembayaran, lunas, segera, ditindaklanjuti, harap, jatuh tempo, tunggakan, kewajiban, mohon maaf mengganggu, dimaklumi*.
5. **Penutup selalu "Thank you 😇"** — konsisten di semua jenis pesan.
6. **Format sesi dibedakan per tipe billing**:
   - **Per jam (monthly):** `📌 5 Juni — Physics (2j)` — sertakan tanggal.
   - **Per pertemuan (session_count):** `📌 5 Juni — Physics — Pertemuan ke-1` — tanggal + subject + nomor pertemuan (urut dari siklus paket yang ditagih).

---

## Peta Pembangun Pesan WhatsApp

| # | Builder | File | Dipakai dari | Nasib |
|---|---------|------|--------------|-------|
| 1 | `buildWaMessage` | `screens\CaptureSession.tsx:68` | Close-out wizard sesi | **Tidak diubah** (pemilik: "Sesi selesai oke") |
| 2 | `buildBillingMessage` | `lib\waBilling.ts:49` | TagihanTab, useInvoiceFilters, MonthlyReport | **Direvisi** (tone, bank, format sesi) |
| 3 | `buildManualBillingText` | `lib\invoicePresentation.ts:49` | TagihanTab (manual), useInvoiceFilters | **Direvisi** (hapus bank) |
| 4 | `generatePaymentReminder` | `lib\aiClient.ts:442` | `useAiReminder.ts` → TagihanTab | **Dihapus total** (disetujui pemilik) |
| 5 | `polishWhatsApp` | `lib\aiClient.ts:378` | Opsional | Di luar scope (tidak dipakai default) |
| 6 | `SYSTEM_PROMPT_NARRATIVES` / `generateReportSummary` | `lib\aiClient.ts:142` | MonthlyReport | Di luar scope (isi laporan, bukan pesan WA) |
---

## Perubahan Nada (TONE) di `lib\waBilling.ts`

### TONE_PREAMBLE

| Tone | Sebelum | Sesudah |
|------|---------|---------|
| `normal` | `""` | `""` (tetap) |
| `gentle` | `"Semoga sehat selalu 🙏 Mohon maaf mengganggu — berikut pengingat ramah untuk tagihan di bawah."` | `"Semoga sehat selalu 🙏"` |
| `firm` | `"Salam, mohon segera ditindaklanjuti — berikut rincian tagihan yang belum lunas:"` | `"Salam hangat,"` |

### TONE_CLOSING

| Tone | Sebelum | Sesudah |
|------|---------|---------|
| `normal` | `"Thank you 😇"` | `"Thank you 😇"` (tetap) |
| `gentle` | `"Terima kasih banyak, mohon dimaklumi ya 🙏"` | `"Thank you 😇"` |
| `firm` | `"Mohon konfirmasi pembayaran agar tercatat lunas. Terima kasih."` | `"Thank you 😇"` |

### Format baris sesi

| Tipe billing | Sebelum | Sesudah |
|--------------|---------|---------|
| Per jam (monthly) | `📌 Physics (2j)` — tanpa tanggal | `📌 5 Juni — Physics (2j)` |
| Per pertemuan (session_count) | `📌 5 Juni — Physics` — tanpa nomor | `📌 5 Juni — Physics — Pertemuan ke-1` |

> Catatan: untuk per pertemuan, nomor "Pertemuan ke-N" dihitung dari urutan sesi billable di dalam paket/periode yang sedang ditagih (sudah di-sortir ascending), bukan reset per bulan.

### Menghapus info bank

Blok kode berikut dihapus dari `buildBillingMessage`:

```
// (hapus seluruh blok ini)
if (bank && (bank.bca || bank.cimb || bank.bri)) {
  ...
  if (bank.accountName) lines.push(`a.n. ${bank.accountName}`);
}
```

Juga hapus parameter/usage `settings?.bankAccounts` yang menjadi tidak terpakai di `buildBillingMessage` (argumen `settings` boleh dipertahankan untuk keperluan lain bila ada, atau dibersihkan bila hanya dipakai untuk bank).

---

## Perubahan di `lib\invoicePresentation.ts` — Tagihan Manual

Menghapus blok bank di `buildManualBillingText` (baris ~60-69), termasuk `accountName`/`bca`/`cimb`/`bri`/`mandiri`/`bsi`/`ewallet`. Penutup tetap `"Thank you 😇"` dan `settings.tutorProfile?.name`.
---

## Penghapusan Fitur "✨ Reminder AI" (disetujui pemilik)

**Alasan:** fungsi ngingatin dengan nada halus sudah tercakup oleh tombol `💬 Tagih WA` yang otomatis menyesuaikan tone mengikuti umur piutang (`normal → gentle → firm`) — gratis & hasilnya prediktabel. Reminder AI berbayar (DeepSeek), hasilnya bervariasi, dan prompt-nya masih memakai `parentName` (bertentangan dengan prinsip tanpa nama parent).

### Titik pembersihan (5 file/titik)

| File | Lokasi | Aksi |
|------|--------|------|
| `src\screens\payments\useAiReminder.ts` | seluruh file | **Hapus file** |
| `src\screens\payments\TagihanTab.tsx` | import `:29` | Hapus import `useAiReminder` |
| | deklarasi `:90-94,126-128` | Hapus blok `aiReminder`/destructure |
| | tombol `:721-727` `✨ Reminder AI` | Hapus tombol |
| | modal `:860-869` | Hapus blok `reminderModal && <AiCostModal ...>` |
| `src\lib\aiClient.ts` | `AiPaymentReminder` (`:59`) | Hapus interface |
| | `estimatePaymentReminderCost` (`:353`) | Hapus fungsi |
| | `generatePaymentReminder` (`:442-471`) | Hapus fungsi beserta komentar section |
| `src\__tests__\aiCost.test.ts` | import `:7` & pemakaian `:17` | Hapus `estimatePaymentReminderCost` |

> Pastikan tidak ada import yang tersisa setelah penghapusan (mis. `MessageSetter` di `useAiReminder.ts` berasal dari `useSessionCountBilling` — file `useSessionCountBilling.ts` tidak dihapus, hanya importer-nya yang hilang).

---

## Perubahan di `src\__tests__\waBilling.test.ts`

1. **Perbarui test** `"renders bank transfer lines when accounts are configured"` menjadi verifikasi bahwa blok bank tidak lagi muncul.
2. **Update test tone**:
   - `gentle` → harapkan mengandung `"Semoga sehat selalu"` dan **tidak** mengandung `"mohon dimaklumi"`.
   - `firm` → harapkan mengandung `"Salam hangat"` dan **tidak** mengandung `"mohon segera"` / `"konfirmasi pembayaran"`.
3. **Update format sesi**:
   - Monthly → `"📌 5 Juni — Physics (2j)"` (kini mengandung tanggal `"5 Juni"`).
   - Session-count → `"📌 5 Juni — Physics — Pertemuan ke-1"` (kini mengandung `"Pertemuan ke-1"`). Test `"uses per-meeting wording..."` perlu update ekspektasi (baris 87-88).

### Verifikasi

`npm run lint` ✅ · `npm test -- --run` ✅ (33 file, 351 tes)
---

## Contoh Pesan Final

### A. Sesi selesai (`buildWaMessage`) — tidak diubah
```
Sesi les *Budi* (Senin, 15 Juni 2026) sudah selesai. 📚

*Mapel:* Physics
*Durasi:* 1.5 jam
*Catatan:* Latihan soal fungsi kuadrat, nomor 4 dan 5 masih salah tanda
*Topik:* Fungsi Kuadrat

🎯 *Fokus sesi berikutnya:*
• Latihan soal cerita aplikatif

Terima kasih, salam 🙏
Ko Lui
```

### B. Tagihan per jam (monthly) — pakai tanggal, tanpa bank
```
NAMA MURID: Budi

Juni 2026

──────────────────

📌 5 Juni — Physics (2j)
📌 12 Juni — Math (1.5j)

Total 3.5 jam — Rp 525.000

Thank you 😇
Ko Lui
```

### C. Tagihan per pertemuan (session_count) — gentle/piutang 31–60 hari
```
NAMA MURID: Budi

Paket 8 Pertemuan

Semoga sehat selalu 🙏

──────────────────

📌 5 Juni — Physics — Pertemuan ke-1
📌 12 Juni — Physics — Pertemuan ke-2

Total 2 pertemuan — Rp 300.000

Thank you 😇
Ko Lui
```

### D. Tagihan per pertemuan (firm/piutang >60 hari) — tanpa kata transaksional
```
NAMA MURID: Budi

Paket 8 Pertemuan

Salam hangat,

──────────────────

📌 5 Juni — Physics — Pertemuan ke-1
📌 12 Juni — Physics — Pertemuan ke-2

Total 2 pertemuan — Rp 300.000

Thank you 😇
Ko Lui
```

### E. Tagihan manual (tanpa sesi) — tanpa bank
```
NAMA MURID: Budi

Juni 2026

TAGIHAN MANUAL (TANPA SESI)
Total Tagihan — Rp 500.000

Thank you 😇
Ko Lui
```

### F. Reminder AI — dihapus; fallback ke 💬 Tagih WA dengan tone otomatis (gentle/firm)

---

## Kata yang Diarsipkan dari Kosakata Pesan

| Kata/Larangan | Alasan |
|---------------|--------|
| `pembayaran`, `lunas`, `segera`, `ditindaklanjuti` | terlalu transaksional / debt-collector |
| `harap`, `jatuh tempo`, `tunggakan`, `kewajiban` | formal-institutif, tidak personal |
| `mohon maaf mengganggu`, `dimaklumi` | terdengar awkward/merendahkan |
| `Bu/Pak [nama]` | tidak dipakai — hangat tapi tidak seperti template umum |

---

## Verifikasi Setelah Eksekusi

1. `npm run lint`
2. `npm test -- --run` (khususnya `waBilling.test.ts`, `aiCost.test.ts`)
3. `npm run build`

Konvensi proyek: lint 0 error · semua test hijau · build sukses.

---

## Checklist

- [x] `lib\waBilling.ts` — hapus blok bank
- [x] `lib\waBilling.ts` — TONE_PREAMBLE & TONE_CLOSING baru
- [x] `lib\waBilling.ts` — format sesi per jam (pakai tanggal) & per pertemuan (Pertemuan ke-N)
- [x] `lib\invoicePresentation.ts` — hapus blok bank di `buildManualBillingText`
- [x] Hapus `useAiReminder.ts` + bersihkan `TagihanTab.tsx`
- [x] `lib\aiClient.ts` — hapus `generatePaymentReminder`, `estimatePaymentReminderCost`, `AiPaymentReminder`
- [x] `src\__tests__\aiCost.test.ts` — hapus `estimatePaymentReminderCost`
- [x] `src\__tests__\waBilling.test.ts` — hapus test bank, update test tone & format sesi
- [x] Jalankan lint / test / build