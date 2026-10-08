/**
 * Bilah aksi tetap halaman Laporan (G3-05 butir 1).
 *
 * Dua hal yang dijawab bilah ini sekaligus:
 *  1. **Penunjuk langkah** — pilih murid → pilih periode → buat laporan → isi
 *     narasi → ekspor. Tutor selalu tahu sedang di langkah mana.
 *  2. **Aksi utama selalu dalam jangkauan** — halaman laporan sangat panjang
 *     (pemilih periode, status, pratinjau, narasi, teks, rencana), sehingga
 *     menaruh tombol Buat/Finalkan/Ekspor di tengah aliran membuat tutor
 *     menggulir bolak-balik untuk hal yang paling sering dipakai.
 *
 * Tombol yang mati **selalu** menyebut alasannya di tempatnya, bukan hanya
 * berubah menjadi kelabu tanpa penjelasan.
 */

import type { ReactNode } from "react";
import { REPORT_STEPS } from "./helpers";
import type { ExportFormat, ExportStage } from "./useReportExport";

interface ReportActionBarProps {
  /** Indeks langkah yang sedang berjalan (lihat `reportStepIndex`). */
  activeStep: number;
  hasReport: boolean;
  reportConfirmed: boolean;
  canCreate: boolean;
  /** Alasan tombol utama mati, ditulis di bawah baris tombol. */
  createReason?: string;
  busy: boolean;
  onCreateOrUpdate: () => void;
  onFinalize: () => void;
  /** Pratinjau sudah siap → tombol ekspor boleh tampil. */
  showExport: boolean;
  exporting: ExportFormat | null;
  exportStage: ExportStage | null;
  exportStageLabel?: string;
  onExport: (format: ExportFormat) => void;
  showUndoAi: boolean;
  onUndoAi: () => void;
  /** Banner pesan hasil aksi — ikut menempel supaya hasilnya selalu terlihat. */
  banner?: ReactNode;
}

export default function ReportActionBar({
  activeStep, hasReport, reportConfirmed, canCreate, createReason, busy,
  onCreateOrUpdate, onFinalize, showExport, exporting, exportStage, exportStageLabel,
  onExport, showUndoAi, onUndoAi, banner,
}: ReportActionBarProps) {
  const current = REPORT_STEPS[Math.max(0, Math.min(activeStep, REPORT_STEPS.length - 1))];

  return (
    <div className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface-strong)]/95 backdrop-blur">
      <div className="space-y-2 px-4 py-2">
        <ol
          aria-label={`Langkah laporan. Sekarang: ${current.label}.`}
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold"
        >
          {REPORT_STEPS.map((step, index) => {
            const done = index < activeStep;
            const isCurrent = index === activeStep;
            return (
              <li
                key={step.id}
                aria-current={isCurrent ? "step" : undefined}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                  isCurrent
                    ? "bg-[var(--brand-solid)] text-[var(--on-strong)]"
                    : done
                      ? "bg-[var(--bg-success)] text-[var(--ink-success)]"
                      : "bg-[var(--bg-subtle)] text-[var(--ink-muted)]"
                }`}
              >
                <span aria-hidden="true">{done ? "✓" : index + 1}</span>
                <span>{step.label}</span>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-primary min-h-[44px] flex-1 text-sm disabled:opacity-40"
            disabled={!canCreate || busy}
            onClick={onCreateOrUpdate}
          >
            {busy
              ? "Memproses..."
              : hasReport
                ? (reportConfirmed ? "Update Laporan" : "Update Draft")
                : "Buat Laporan"}
          </button>
          {hasReport && !reportConfirmed && (
            <button
              type="button"
              className="btn min-h-[44px] flex-1 bg-[var(--bg-success-strong)] text-sm text-[var(--on-strong)] hover:bg-[var(--bg-success-strong)] disabled:opacity-40"
              disabled={!canCreate || busy}
              onClick={onFinalize}
            >
              {busy ? "Memproses..." : "Finalkan Laporan"}
            </button>
          )}
          {showExport && (["jpg", "png", "pdf"] as const).map((format) => (
            <button
              key={format}
              type="button"
              className={`btn min-h-[44px] text-sm ${
                format === "jpg"
                  ? "btn-primary"
                  : format === "png"
                    ? "bg-[var(--accent-solid)] text-[var(--on-strong)] hover:bg-[var(--accent-solid)]"
                    : "btn-secondary"
              } disabled:opacity-40`}
              onClick={() => onExport(format)}
              disabled={!!exporting}
            >
              {format.toUpperCase()}{exporting === format ? "…" : ""}
            </button>
          ))}
          {showUndoAi && (
            <button
              type="button"
              className="min-h-[44px] rounded-lg border border-[var(--border-accent)] bg-[var(--accent-tint)] px-3 text-xs font-semibold text-[var(--ink-accent)] transition-colors hover:bg-[var(--accent-tint)]"
              onClick={onUndoAi}
            >
              ↩ Undo Hasil AI
            </button>
          )}
        </div>

        {/* Alasan tombol mati — di tempatnya, bukan hanya warna kelabu. */}
        {!canCreate && createReason && (
          <p className="text-xs leading-relaxed text-[var(--ink-warn)]">
            Tombol laporan mati: {createReason}
          </p>
        )}
        {showExport && exporting && exportStage && exportStageLabel && (
          <p role="status" aria-live="polite" className="text-xs font-semibold text-[var(--ink-brand)]">
            {exportStageLabel}
          </p>
        )}
        {banner}
      </div>
    </div>
  );
}
