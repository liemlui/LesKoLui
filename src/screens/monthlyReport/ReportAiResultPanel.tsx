/**
 * Panel hasil AI halaman Laporan (G3-05 butir 2).
 *
 * Sebelumnya satu panggilan AI atas 20 sesi hanya menghasilkan satu kalimat di
 * banner: "11 narasi tersimpan · 1 batch gagal". Tutor tidak bisa melihat SESI
 * MANA yang gagal, jadi tidak bisa memperbaikinya satu per satu. Panel ini
 * menampilkan daftar berhasil/gagal, bilah kemajuan, pengumuman status, dan
 * tombol "Ulangi yang gagal".
 */

import type { AiRunResult } from "./useReportGeneration";

interface ReportAiResultPanelProps {
  result: AiRunResult | null;
  loading: boolean;
  progress: { done: number; total: number; step: string } | null;
  onRetry: () => void;
  retryDisabled: boolean;
  /** Alasan tombol ulangi mati (mis. batas belanja AI terlampaui). */
  retryDisabledReason?: string;
  onDismiss: () => void;
}

/** Batas daftar yang ditampilkan sekaligus — sisanya diringkas jadi satu baris. */
const MAX_ROWS = 8;

export default function ReportAiResultPanel({
  result, loading, progress, onRetry, retryDisabled, retryDisabledReason, onDismiss,
}: ReportAiResultPanelProps) {
  if (!result && !(loading && progress)) return null;

  const okCount = result?.ok.length ?? 0;
  const failedCount = result?.failed.length ?? 0;
  const summaryText = result
    ? [
      `${okCount} sesi berhasil`,
      failedCount > 0 ? `${failedCount} sesi gagal` : "tidak ada yang gagal",
      result.summary.ok ? "ringkasan terisi" : `ringkasan gagal${result.summary.error ? ` (${result.summary.error})` : ""}`,
    ].join(" · ")
    : "";

  return (
    <section
      aria-label="Hasil AI pada laporan ini"
      className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--ink-strong)]">Hasil AI</p>
        {result && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs font-semibold text-[var(--ink-muted)] underline"
          >
            Tutup
          </button>
        )}
      </div>

      {loading && progress ? (
        <>
          <p role="status" aria-live="polite" className="text-xs font-semibold text-[var(--ink-brand)]">
            {progress.step}
          </p>
          <div
            role="progressbar"
            aria-label="Kemajuan penulisan narasi AI"
            aria-valuemin={0}
            aria-valuemax={Math.max(1, progress.total)}
            aria-valuenow={Math.min(progress.done, progress.total)}
            className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-subtle)]"
          >
            <div
              className="h-full rounded-full bg-[var(--brand-solid)] transition-all"
              style={{ width: `${progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
            />
          </div>
        </>
      ) : (
        <p role="status" aria-live="polite" className="text-xs text-[var(--ink-muted)]">{summaryText}</p>
      )}

      {okCount > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--ink-success)]">Berhasil ({okCount})</p>
          <ul className="mt-1 space-y-0.5 text-xs text-[var(--ink-muted)]">
            {result!.ok.slice(0, MAX_ROWS).map((item) => (
              <li key={item.id}>✓ {item.label}</li>
            ))}
            {okCount > MAX_ROWS && <li>… dan {okCount - MAX_ROWS} sesi lain</li>}
          </ul>
        </div>
      )}

      {failedCount > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--ink-danger)]">Gagal ({failedCount})</p>
          <ul className="mt-1 space-y-0.5 text-xs text-[var(--ink-muted)]">
            {result!.failed.slice(0, MAX_ROWS).map((item) => (
              <li key={item.id}>⚠ {item.label} — {item.error}</li>
            ))}
            {failedCount > MAX_ROWS && <li>… dan {failedCount - MAX_ROWS} sesi lain</li>}
          </ul>
          <button
            type="button"
            onClick={onRetry}
            disabled={retryDisabled}
            className="mt-2 inline-flex min-h-[44px] items-center rounded-lg bg-[var(--accent-solid)] px-3 text-xs font-semibold text-[var(--on-strong)] transition-colors disabled:opacity-50"
          >
            Ulangi yang gagal ({failedCount})
          </button>
          {retryDisabled && retryDisabledReason && (
            <p className="mt-1 text-xs text-[var(--ink-danger)]">{retryDisabledReason}</p>
          )}
        </div>
      )}
    </section>
  );
}
