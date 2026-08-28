/**
 * Logika export laporan (JPG/PNG/PDF + tandai sudah dibagikan) — dipecah dari
 * MonthlyReport.tsx agar file utama lebih ramping.
 */

import { useRef, useState } from "react";
import { exportJpeg, exportPng, exportPdf, shareFiles } from "../../lib/exportReport";
import { upsertReport } from "../../db/repos";
import type { MonthlyReport, Student } from "../../db/types";
import type { ReportData } from "../../template/types";

export type ExportFormat = "jpg" | "png" | "pdf";

export function useReportExport(deps: {
  student?: Student;
  report?: MonthlyReport;
  reportData: ReportData | null;
  /** Label periode yang sudah di-resolve (dipakai nama file). */
  periodLabel: string;
  setMessage: (message: string) => void;
  pageRatio: "3:4" | "auto";
  setPageRatio: (ratio: "3:4" | "auto") => void;
}) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const reportExportRef = useRef<HTMLDivElement>(null);

  const handleMarkReportShared = async () => {
    const { report, setMessage } = deps;
    if (!report) return;
    await upsertReport({ ...report, pdfGeneratedAt: new Date().toISOString() });
    setMessage("Laporan ditandai sudah dibagikan ✓");
  };

  const doExport = async (type: ExportFormat) => {
    const { student, report, reportData, periodLabel, setMessage, pageRatio, setPageRatio } = deps;
    if (!student || !report || !reportData || exporting) return;
    setExporting(type);
    setMessage("");
    const base = `Laporan-${student.name}-${periodLabel}`.replace(/\s+/g, "-");
    const exportRoot = reportExportRef.current ?? document;
    // PDF memakai tinggi otomatis (auto) — sudah cukup oke. JPG/PNG memakai
    // rasio yang dipilih (default 3:4) agar tidak terpotong di WhatsApp.
    const prevRatio = pageRatio;
    if (type === "pdf" && prevRatio !== "auto") setPageRatio("auto");
    try {
      // Tunggu re-render bila rasio diubah untuk PDF.
      if (type === "pdf" && prevRatio !== "auto") {
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      }
      if (type === "jpg") await shareFiles(await exportJpeg(base, exportRoot), base);
      else if (type === "png") await shareFiles(await exportPng(base, exportRoot), base);
      else await shareFiles([await exportPdf(base, exportRoot)], base);
      await upsertReport({ ...report, pdfGeneratedAt: new Date().toISOString() });
      setMessage(`✓ File ${type.toUpperCase()} diunduh`);
    } catch (e) {
      setMessage("Gagal ekspor: " + (e as Error).message);
    } finally {
      if (type === "pdf" && prevRatio !== "auto") setPageRatio(prevRatio);
      setExporting(null);
    }
  };

  return { exporting, reportExportRef, doExport, handleMarkReportShared };
}
