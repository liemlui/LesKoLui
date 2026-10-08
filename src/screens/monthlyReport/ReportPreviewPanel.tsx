/**
 * Pratinjau laporan + kontrol halaman + daftar berkas sisa (G3-05 butir 3 & 5).
 *
 * Butir 5 — pratinjau yang bisa disesuaikan: kontrol pembesaran, keterangan
 * jumlah halaman, dan tanda peringatan bila isinya melampaui halaman.
 * Butir 3 — status ekspor bertahap dipegang `useReportExport` dan ditampilkan
 * di bilah aksi tetap; yang tinggal di sini adalah halaman yang belum terunduh.
 */

import { useEffect, useState, type RefObject } from "react";
import { ReportRenderer } from "../../template/ReportRenderer";
import type { ReportData, ReportOptions, Theme } from "../../template/types";
import { countReportPages, detectOverflow, type OverflowIssue } from "../../lib/exportReport";
import ScaledPreview from "./ScaledPreview";
import type { PendingExportFile } from "./useReportExport";

/** Pilihan pembesaran pratinjau. Dibatasi 75% supaya pratinjau (lebar dasar
 *  416 px) tidak pernah memaksa halaman bergeser ke samping di layar 390 px. */
const ZOOM_LEVELS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 0.35, label: "Kecil" },
  { value: 0.5, label: "Sedang" },
  { value: 0.75, label: "Besar" },
];

interface ReportPreviewPanelProps {
  exportRef: RefObject<HTMLDivElement | null>;
  reportData: ReportData;
  theme: Theme;
  layoutId: string;
  options: ReportOptions;
  entriesPerPage: number;
  onEntriesPerPageChange: (value: number) => void;
  entryPageChoices: readonly number[];
  pendingFiles: PendingExportFile[];
  onDownloadPending: (pending: PendingExportFile) => void;
  onClearPending: () => void;
}

export default function ReportPreviewPanel({
  exportRef, reportData, theme, layoutId, options,
  entriesPerPage, onEntriesPerPageChange, entryPageChoices,
  pendingFiles, onDownloadPending, onClearPending,
}: ReportPreviewPanelProps) {
  const [zoom, setZoom] = useState(0.5);
  const [pageCount, setPageCount] = useState(0);
  const [overflow, setOverflow] = useState<OverflowIssue[]>([]);

  // Jumlah halaman dan luapan diukur dari DOM yang benar-benar dirender — sumber
  // yang sama dengan yang dipakai ekspor, jadi angkanya tidak bisa berbeda.
  useEffect(() => {
    const root = exportRef.current;
    if (!root) return;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setPageCount(countReportPages(root));
        setOverflow(detectOverflow(root));
      });
    };
    update();
    if (typeof ResizeObserver === "undefined") return () => cancelAnimationFrame(raf);
    const observer = new ResizeObserver(update);
    observer.observe(root);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, [exportRef, reportData, layoutId, entriesPerPage, options.coverPage]);

  return (
    <section className="space-y-3" aria-label="Pratinjau dan ekspor laporan">
      {/* Kontrol pembesaran + keterangan halaman (butir 5). */}
      <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-[var(--ink-muted)]">Pratinjau</p>
          <div className="flex items-center gap-1" role="group" aria-label="Pembesaran pratinjau">
            {ZOOM_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                aria-pressed={zoom === level.value}
                onClick={() => setZoom(level.value)}
                className={`inline-flex min-h-[36px] items-center rounded-lg px-3 text-xs font-semibold transition-colors ${
                  zoom === level.value
                    ? "bg-[var(--brand-solid)] text-[var(--on-strong)]"
                    : "bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)]"
                }`}
              >
                {level.label} {Math.round(level.value * 100)}%
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-[var(--ink-muted)]">
          {pageCount > 0
            ? `${pageCount} halaman · ${entriesPerPage} sesi per halaman`
            : "Pratinjau sedang disusun…"}
        </p>
        {overflow.length > 0 && (
          <p
            role="alert"
            className="rounded-lg border border-[var(--border-danger)] bg-[var(--bg-danger)] px-2.5 py-1.5 text-xs font-medium text-[var(--ink-danger)]"
          >
            ⚠ {overflow.length} halaman isinya melebihi tinggi halaman
            ({overflow.map((issue) => `${issue.pageId} +${issue.overflowPx}px`).join(", ")}).
            Kurangi sesi per halaman atau pilih susunan lain sebelum mengekspor — ekspor akan ditolak selama isinya meluap.
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-semibold text-[var(--ink-muted)]" htmlFor="mr-sesi-per-halaman">Sesi per halaman</label>
          <div className="flex gap-1">
            {entryPageChoices.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={entriesPerPage === n}
                onClick={() => onEntriesPerPageChange(n)}
                className={`inline-flex min-h-[36px] items-center rounded-lg px-3 text-xs font-semibold transition-colors ${
                  entriesPerPage === n
                    ? "bg-[var(--brand-solid)] text-[var(--on-strong)]"
                    : "bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <input id="mr-sesi-per-halaman" type="hidden" value={entriesPerPage} readOnly />
        </div>
        <p className="text-xs text-[var(--ink-muted)]">
          Pilihan ini ikut tersimpan ke laporan, jadi laporan yang dibuka lagi tetap memakai jumlah yang sama.
          Tinggi halaman mengikuti isi; sesi otomatis dipindah ke halaman berikutnya bila catatannya panjang.
        </p>
      </div>

      {/* Preview sekaligus sumber export supaya komposisi JPG/PDF persis sama
          dengan yang dilihat pengguna pada ukuran layar aktif. Pembesaran hanya
          mengubah transform tampilan: elemen halaman tetap dirender pada lebar
          416 px, jadi geometri hasil ekspor tidak ikut berubah. */}
      <div ref={exportRef} data-report-export-root className="mx-auto max-w-sm overflow-hidden lg:max-w-2xl">
        <ScaledPreview scale={zoom}>
          <ReportRenderer data={reportData} theme={theme} layoutId={layoutId} options={options} />
        </ScaledPreview>
      </div>

      {/* Sisa halaman JPG/PNG. Peramban hanya mengizinkan SATU unduhan otomatis
          per gestur pengguna, jadi berkas kedua dan seterusnya ditawarkan sebagai
          tombol per halaman — tiap ketukan adalah gestur yang sah. */}
      {pendingFiles.length > 0 && (
        <div role="status" className="space-y-2 rounded-xl border border-[var(--border-warn)] bg-[var(--bg-warn)] p-3">
          <p className="text-xs font-semibold text-[var(--ink-warn)]">
            {pendingFiles.length} halaman belum terunduh — peramban hanya mengizinkan satu unduhan otomatis. Ketuk satu per satu:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pendingFiles.map((pending) => (
              <button
                key={pending.file.name}
                type="button"
                className="btn btn-secondary min-h-[32px] text-xs"
                onClick={() => onDownloadPending(pending)}
              >
                Unduh {pending.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={onClearPending} className="text-[11px] text-[var(--ink-muted)] underline">
            Tutup daftar
          </button>
        </div>
      )}
    </section>
  );
}
