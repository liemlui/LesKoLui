/**
 * Bentuk tampilan uang terkunci — kontrak K3.2 (`arsitektur/11`).
 *
 * Di JSX **selalu** pakai `<MaskedMoney/>`. Fungsi di berkas ini hanya untuk
 * konteks yang bukan JSX: template string, `message` pada sheet konfirmasi,
 * atau kalimat panjang yang angka uangnya menyatu dengan prosa.
 *
 * ⚠️ Jangan memindahkan masking ke `formatRupiah` (`lib/format.ts`): formatter itu
 * juga menyusun pesan keluar (`waBilling.ts`, `invoicePresentation.ts`), dan pesan
 * tagihan ke orang tua wajib memuat nominal asli.
 */
import { formatRupiah } from "./format";

/** Bentuk terkunci resmi (kontrak K3.2): bukan baris kosong, bukan angka parsial. */
export const MASKED_MONEY_TEXT = "Rp ••••••";

/**
 * Formatter yang tahu status kunci — untuk konteks non-JSX.
 *
 * @param amount nilai rupiah; `null`/`undefined` → `"—"`
 * @param visible hasil `useMoneyVisible().visible`
 */
export function formatRupiahDisplay(amount: number | null | undefined, visible: boolean): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  return visible ? formatRupiah(amount) : MASKED_MONEY_TEXT;
}
