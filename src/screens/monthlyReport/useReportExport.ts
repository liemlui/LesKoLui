/**
 * Logika export laporan (JPG/PNG/PDF + tandai sudah dibagikan) — dipecah dari
 * MonthlyReport.tsx agar file utama lebih ramping.
 */

import { useRef, useState } from "react";
import { exportJpeg, exportPng, exportPdf, shareFiles } from "../../lib/exportReport";
import { upsertReport } from "../../db/repos";
import type { MonthlyReport, Student, Payment } from "../../db/types";
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

/**
 * Kirim laporan (JPG) + teks tagihan sekaligus via Web Share API, atau
 * fallback ke download + clipboard + wa.me link.
 *
 * Dipisah dari `doExport` agar logika WA billing tidak mengotori hook utama.
 */
export async function shareReportWithInvoice(args: {
  student: Student;
  report: MonthlyReport;
  payment: Payment;
  periodLabel: string;
  /** Callback untuk membangun teks WA — menerima tone dan mengembalikan teks. */
  buildWaText: (tone: "normal" | "gentle" | "firm") => string;
  exportRoot: ParentNode;
  setMessage: (msg: string) => void;
}): Promise<void> {
  const { student, report, payment, periodLabel, buildWaText, exportRoot, setMessage } = args;
  const base = `Laporan-${student.name}-${periodLabel}`.replace(/\s+/g, "-");
  const phone = student.parentContact?.phone;
  if (!phone) {
    setMessage("Nomor WA orang tua tidak tersedia. Isi nomor di profil murid.");
    return;
  }

  // 1. Export JPG
  let files: File[];
  try {
    files = await exportJpeg(base, exportRoot);
  } catch (e) {
    setMessage("Gagal ekspor laporan: " + (e as Error).message);
    return;
  }
  if (files.length === 0) {
    setMessage("Tidak ada halaman laporan untuk diekspor. Buka Pratinjau dulu.");
    return;
  }

  // 2. Bangun teks WA
  const tone = payment.status === "UNPAID"
    ? payment.periodEnd
      ? (Date.now() - Date.parse(payment.periodEnd)) / 86400000 > 60 ? "firm" : "gentle"
      : "normal"
    : "normal";
  const waText = buildWaText(tone);

  // 3. Web Share API — beberapa browser modern mendukung files + text
  if (typeof navigator !== "undefined" && navigator.share && files.length === 1) {
    try {
      await navigator.share({ files, text: waText, title: base });
      await upsertReport({ ...report, pdfGeneratedAt: new Date().toISOString() });
      setMessage("✓ Laporan + tagihan dibagikan");
      return;
    } catch {
      // fall through
    }
  }

  // 4. Fallback: download + clipboard + wa.me
  for (const f of files) {
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  try {
    await navigator.clipboard.writeText(waText);
  } catch { /* clipboard tidak tersedia — user tetap bisa copy dari wa.me */ }

  // Buka wa.me di tab baru
  const waUrl = `https://wa.me/${phone.replace(/^0/, "62").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(waText)}`;
  window.open(waUrl, "_blank");
  await upsertReport({ ...report, pdfGeneratedAt: new Date().toISOString() });
  setMessage("✓ Laporan diunduh · teks tagihan disalin · WA terbuka");
}
