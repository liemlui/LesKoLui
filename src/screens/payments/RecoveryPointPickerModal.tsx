import Modal from "../../components/Modal";
import type { InvoiceSnapshotPoint } from "../../db/repos";
import { formatRupiah, monthLabel } from "../../lib/format";
import { invoiceKindLabel, RECOVERY_LIMITS_HINT, snapshotMomentLabel } from "./useInvoiceRecovery";

interface RecoveryPointPickerModalProps {
  /** Titik pemulihan tagihan ini; `undefined` = masih dimuat dari perangkat. */
  points: InvoiceSnapshotPoint[] | undefined;
  /** Kunci `busyKeys` milik `useInvoiceRecovery`, dipakai untuk menonaktifkan tombol. */
  busyKeys: Record<string, boolean>;
  /** Nama murid yang tagihannya sedang dibuka riwayatnya. */
  studentName: string;
  onClose: () => void;
  onPick: (point: InvoiceSnapshotPoint) => void;
}

/**
 * Pemilih titik pemulihan tagihan yang dibatalkan (TASK-10 L7, R1 timeline).
 *
 * Diekstraksi dari `TagihanTab.tsx` pada refactor terbatas G3-02 (Q9/A13) tanpa
 * perubahan perilaku maupun teks. Alasan pemisahan: satu panel mandiri berisi
 * daftar + tombol, sementara `TagihanTab` harus turun ke ≤800 baris.
 *
 * Catatan yang mengikat (dipindahkan apa adanya dari `TagihanTab`):
 * - Hanya titik yang salinannya **sudah dihapus** yang tidak bisa dipakai lagi.
 *   Titik yang **pernah** dipulihkan tetap bisa dipilih — itulah jalan kembali
 *   kalau pemulihan sebelumnya salah; `restoredAt` hanya penanda riwayat.
 * - Pemulihan bersifat LOKAL per perangkat dan tidak ikut backup, karena itu
 *   `RECOVERY_LIMITS_HINT` selalu tampil di atas daftar.
 */
export default function RecoveryPointPickerModal({
  points, busyKeys, studentName, onClose, onPick,
}: RecoveryPointPickerModalProps) {
  return (
    <Modal
      onClose={onClose}
      ariaLabel={`Riwayat pemulihan tagihan ${studentName}`}
      showCloseButton={false}
      panelClassName="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-[var(--surface-strong)] shadow-xl sm:rounded-2xl outline-none"
    >
      <div className="flex items-start justify-between border-b border-[var(--border)] px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--ink-strong)]">Riwayat pemulihan</h2>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
            Tagihan {studentName} — pilih satu titik waktu untuk dipulihkan persis seperti keadaannya saat itu.
          </p>
        </div>
        <button onClick={onClose} aria-label="Tutup"
          className="text-xl leading-none text-[var(--ink-muted)] hover:text-[var(--ink-strong)]">✕</button>
      </div>

      <div className="space-y-3 overflow-y-auto px-5 py-4">
        <p className="text-xs leading-relaxed text-[var(--ink-warn)]">{RECOVERY_LIMITS_HINT}</p>
        {points === undefined ? (
          <p className="text-sm text-[var(--ink-muted)]">Memuat riwayat pemulihan…</p>
        ) : points.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">Belum ada titik pemulihan untuk tagihan ini di perangkat ini.</p>
        ) : (
          <ol className="space-y-2">
            {[...points]
              .sort((a, b) => b.cancelAt.localeCompare(a.cancelAt))
              .map((point, index) => {
                const pointBusy = Boolean(busyKeys[`restore-${point.snapshotId}`]);
                const hasDetails = point.month !== "";
                // Hanya titik yang salinannya SUDAH DIHAPUS yang tidak bisa
                // dipakai lagi. Titik yang pernah dipulihkan tetap bisa
                // dipilih → inilah jalan kembali kalau pemulihan sebelumnya
                // salah. `spent` hanya jadi penanda riwayat.
                const unavailable = Boolean(point.discardedAt);
                const reason = point.discardedAt
                  ? `salinan sudah dihapus ${snapshotMomentLabel(point.discardedAt)}`
                  : undefined;
                return (
                  <li key={point.snapshotId} className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--ink-strong)]">
                          Dibatalkan {snapshotMomentLabel(point.cancelAt)}
                          {index === 0 && (
                            <span className="ml-2 rounded-full bg-[var(--bg-warn)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--ink-warn)]">
                              terbaru
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                          {invoiceKindLabel(point.kind)} · {hasDetails
                            ? `${monthLabel(point.month)} · ${point.sessionCount} sesi`
                            : "rincian nominal sudah tidak tersimpan"}
                        </p>
                        {!unavailable && !point.restoredAt && (
                          <p className="mt-1 text-[11px] font-semibold text-[var(--ink-success)]">Masih bisa dipulihkan</p>
                        )}
                        {point.restoredAt && (
                          <p className="mt-1 text-[11px] font-semibold text-[var(--ink-accent)]">
                            Pernah dipulihkan {snapshotMomentLabel(point.restoredAt)} — bisa dipilih lagi untuk kembali ke titik ini
                          </p>
                        )}
                      </div>
                      {hasDetails && (
                        <span className="shrink-0 text-sm font-bold text-[var(--ink-strong)]">{formatRupiah(point.totalCost)}</span>
                      )}
                    </div>
                    <div className="mt-2">
                      <button
                        type="button"
                        disabled={unavailable || pointBusy}
                        onClick={() => onPick(point)}
                        className="w-full rounded-lg border border-[var(--border-warn)] py-2 text-xs font-semibold text-[var(--ink-warn)] transition-colors hover:bg-[var(--bg-warn)] disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:text-[var(--ink-muted)]"
                      >
                        {pointBusy ? "Memulihkan..." : point.restoredAt ? "Kembalikan ke titik ini" : "Pulihkan titik ini"}
                      </button>
                      {reason && (
                        <p className="mt-1.5 text-[11px] text-[var(--ink-muted)]">Tidak bisa dipulihkan: {reason}.</p>
                      )}
                    </div>
                  </li>
                );
              })}
          </ol>
        )}
      </div>

      <div className="border-t border-[var(--border)] px-5 py-3">
        <button onClick={onClose}
          className="w-full rounded-xl bg-[var(--accent-solid)] py-2.5 text-sm font-bold text-[var(--on-strong)] transition-colors hover:bg-[var(--accent-solid)]">
          Tutup
        </button>
      </div>
    </Modal>
  );
}
