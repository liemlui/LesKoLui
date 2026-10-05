import type { InvoiceCancellation } from "../../db/repos";
import { formatRupiah, monthLabel } from "../../lib/format";
import { invoiceKindLabel, RECOVERY_LIMITS_HINT } from "./useInvoiceRecovery";

/**
 * Peta nama murid — sengaja hanya menuntut `name`, karena itulah satu-satunya
 * yang dipakai blok ini. (`TagihanTab` meneruskan peta `Map<string, Student>`
 * dari `useInvoiceFilters`, bukan `StudentMap` berwarna dari `studentColor`;
 * menuntut tipe yang lebih kaya hanya akan memaksa pemanggil menambah medan
 * yang tidak pernah dibaca di sini.)
 */
type PetaNamaMurid = ReadonlyMap<string, { name: string }>;

interface CancelledInvoicesSectionProps {
  /** `undefined` = `useLiveQuery` masih memuat (perilaku lama: `?? []`). */
  cancellations: InvoiceCancellation[] | undefined;
  busyKeys: Record<string, boolean>;
  studentMap: PetaNamaMurid;
  /** Jumlah titik pemulihan per tagihan, untuk label tombol "Riwayat pemulihan (N)". */
  snapshotPointCounts: Map<string, number> | undefined;
  onRestore: (cancellation: InvoiceCancellation, studentName: string) => void;
  onDiscard: (cancellation: InvoiceCancellation, studentName: string) => void;
  onOpenHistory: (cancellation: InvoiceCancellation) => void;
}

/**
 * Blok "Tagihan dibatalkan — bisa dipulihkan" (R1, pemulihan lokal per perangkat).
 *
 * Diekstraksi dari `TagihanTab.tsx` pada refactor terbatas G3-02 (Q9/A13) tanpa
 * perubahan perilaku maupun teks. Seluruh keadaan tetap di `TagihanTab`; komponen
 * ini murni tampilan + tiga callback, supaya tidak ada logika pemulihan yang
 * berpindah tempat (logikanya ada di `useInvoiceRecovery`).
 *
 * Yang mengikat (dipindahkan apa adanya):
 * - `studentMap` bisa tidak punya muridnya (murid dihapus) → label "Murid dihapus".
 * - Tombol "Hapus" hanya membuang **salinan pemulihan**; tagihannya tetap dibatalkan.
 * - `RECOVERY_LIMITS_HINT` wajib tampil: pemulihan tidak ikut backup.
 */
export default function CancelledInvoicesSection({
  cancellations, busyKeys, studentMap, snapshotPointCounts, onRestore, onDiscard, onOpenHistory,
}: CancelledInvoicesSectionProps) {
  if ((cancellations ?? []).length === 0) return null;

  return (
    <section aria-labelledby="cancelled-invoices-title" className="space-y-3 rounded-xl border border-[var(--border-warn)] bg-[var(--bg-warn)]/40 p-4 shadow-sm">
      <div>
        <h2 id="cancelled-invoices-title" className="text-sm font-bold text-[var(--ink-warn)]">Tagihan dibatalkan — bisa dipulihkan</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--ink-warn)]">
          {RECOVERY_LIMITS_HINT} Pemulihan ditolak bila sesi, laporan, atau siklus murid sudah berubah.
        </p>
      </div>
      <div className="space-y-2">
        {(cancellations ?? []).map((cancellation) => {
          const studentName = studentMap.get(cancellation.studentId)?.name ?? "Murid dihapus";
          const busy = Boolean(busyKeys[`restore-${cancellation.snapshotId}`]);
          const discarding = Boolean(busyKeys[`discard-${cancellation.snapshotId}`]);
          return (
            <article key={cancellation.snapshotId} className="rounded-xl border border-[var(--border-warn)] bg-[var(--surface-strong)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--ink-strong)]">{studentName}</p>
                  <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                    {invoiceKindLabel(cancellation.kind)} · {monthLabel(cancellation.month)} · {cancellation.sessionCount} sesi
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-[var(--ink-strong)]">{formatRupiah(cancellation.totalCost)}</span>
              </div>
              <div className="mt-3 flex items-stretch gap-2">
                <button
                  type="button"
                  disabled={busy || discarding}
                  onClick={() => onRestore(cancellation, studentName)}
                  className="flex-1 rounded-lg border border-[var(--border-warn)] py-2 text-xs font-semibold text-[var(--ink-warn)] transition-colors hover:bg-[var(--bg-warn)] disabled:cursor-wait disabled:opacity-50"
                >
                  {busy ? "Memulihkan..." : "Pulihkan tagihan"}
                </button>
                {/* Sekunder: hanya membuang salinan pemulihannya, tagihan tetap dibatalkan. */}
                <button
                  type="button"
                  disabled={busy || discarding}
                  aria-label={`Hapus entri pemulihan tagihan ${studentName}`}
                  onClick={() => onDiscard(cancellation, studentName)}
                  className="shrink-0 rounded-lg border border-[var(--border-danger)] px-3 py-2 text-xs font-semibold text-[var(--ink-danger)] transition-colors hover:bg-[var(--bg-danger)] disabled:cursor-wait disabled:opacity-50"
                >
                  {discarding ? "Menghapus..." : "Hapus"}
                </button>
              </div>
              {/* Sekunder: pemilih titik waktu — semua titik pemulihan tagihan ini. */}
              <button
                type="button"
                disabled={busy || discarding}
                aria-label={`Riwayat pemulihan tagihan ${studentName}`}
                onClick={() => onOpenHistory(cancellation)}
                className="mt-2 w-full rounded-lg border border-[var(--border-warn)] py-2 text-xs font-semibold text-[var(--ink-warn)] transition-colors hover:bg-[var(--bg-warn)] disabled:cursor-wait disabled:opacity-50"
              >
                Riwayat pemulihan ({snapshotPointCounts?.get(cancellation.paymentId) ?? 1})
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
