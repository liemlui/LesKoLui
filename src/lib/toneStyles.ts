/**
 * Q42/Q43 (opsi B) — peta presentasi di **sisi pemanggil**.
 *
 * Tiga berkas yang masih memuat kelas warna mentah dilindungi ATURAN-AI §2.1
 * (`engagement.ts` · `invoicePresentation.ts` · `finance.ts`), jadi kelasnya
 * **tidak** diubah di sana. Yang dilakukan: pemanggil berhenti membaca string
 * kelas dari berkas-berkas itu dan mengambil warnanya dari peta **token** di
 * sini — pola yang sama dengan kebijakan emoji `TASK-11` (berkas data tidak
 * disentuh; keputusan tampilan pindah ke pemanggil).
 *
 * Aturan berkas ini:
 *  - **Hanya token** (`var(--…)`) — tidak ada kelas warna palet langsung.
 *  - Field lama di berkas §2.1 (`activeClass`/`idleClass`, `INVOICE_ORIGIN_CLASS`,
 *    `statusPillClass`, `AGE_BUCKET_CLASS`) menjadi **tidak terpakai**; ia
 *    dibiarkan apa adanya karena berkasnya dilindungi, dan boleh dihapus hanya
 *    lewat tugas yang menyentuh §2.1.
 *  - Perbedaan rona terhadap string lama dicatat pada tiap peta; semua pasangan
 *    teks/latar di sini memakai token yang sudah dibuktikan ≥4,5:1
 *    (`src/index.css` blok token G2-02) dan diverifikasi ulang oleh guard
 *    `npm run e2e:uiux` (bagian kontras).
 */

import type { EngagementLevel } from "../db/types";
import type { InvoiceOrigin } from "./invoicePresentation";

/**
 * Kelas chip level sesi — menggantikan `ENGAGEMENT_LEVELS[].activeClass/idleClass`.
 * Rona: hijau/oranye memakai pasangan `--*-strong` + `--ink-*`; level netral
 * memakai `--surface-inverse` saat aktif (dulu `gray-600`) dan `--ink-muted`
 * saat idle (dulu `gray-700`) agar sama dengan pola chip Uang yang sudah bertoken.
 */
export function engagementLevelClass(level: EngagementLevel, active: boolean): string {
  if (level === "lancar") {
    return active
      ? "bg-[var(--bg-success-strong)] text-[var(--on-strong)] border-[var(--bg-success-strong)]"
      : "bg-[var(--surface-strong)] text-[var(--ink-success)] border-[var(--border-success)] hover:border-[var(--bg-success-strong)] hover:bg-[var(--bg-success)]";
  }
  if (level === "berat") {
    return active
      ? "bg-[var(--bg-attention-strong)] text-[var(--on-strong)] border-[var(--bg-attention-strong)]"
      : "bg-[var(--surface-strong)] text-[var(--ink-attention)] border-[var(--border-attention)] hover:border-[var(--bg-attention-strong)] hover:bg-[var(--bg-attention)]";
  }
  return active
    ? "bg-[var(--surface-inverse)] text-[var(--on-strong)] border-[var(--surface-inverse)]"
    : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]";
}

/**
 * Badge asal tagihan — menggantikan `INVOICE_ORIGIN_CLASS`.
 * Rona: keempat kategori dibedakan lewat keluarga token yang ada.
 * `monthly` dulu `sky-100` dan `report` dulu `blue-50`; keduanya kini keluarga
 * biru dengan intensitas berbeda (`--brand-tint-strong` vs `--brand-tint`)
 * karena tidak ada token keluarga `sky`.
 */
export const INVOICE_ORIGIN_TONE: Record<InvoiceOrigin, string> = {
  package: "bg-[var(--accent-tint)] text-[var(--ink-accent)]",
  monthly: "bg-[var(--brand-tint-strong)] text-[var(--ink-brand)]",
  report: "bg-[var(--brand-tint)] text-[var(--ink-brand)]",
  manual: "bg-[var(--bg-subtle)] text-[var(--ink-muted)]",
};

/**
 * Pil status bayar — menggantikan `statusPillClass(paid)`.
 * Rona: `green-700/green-100` → `--ink-success`/`--bg-success` (green-800/50);
 * `amber-700/amber-100` → `--ink-warn`/`--bg-warn` (amber-800/50).
 */
export function paymentStatusPillClass(paid: boolean): string {
  return `text-xs font-semibold px-2 py-0.5 rounded-full ${
    paid
      ? "bg-[var(--bg-success)] text-[var(--ink-success)]"
      : "bg-[var(--bg-warn)] text-[var(--ink-warn)]"
  }`;
}
