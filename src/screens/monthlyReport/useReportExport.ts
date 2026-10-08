/**
 * Logika export laporan (JPG/PNG/PDF + tandai sudah dibagikan) — dipecah dari
 * MonthlyReport.tsx agar file utama lebih ramping.
 *
 * G3-05 butir 3: state ekspor kini **bertahap** dan istilah "dibuat" dipisah dari
 * "dibagikan". Mengekspor berkas hanya mencatat `lastExportedAt`; pernyataan
 * "sudah dibagikan" tetap tindakan eksplisit tutor (`sharedAt`).
 */

import { useCallback, useRef, useState } from "react";
import { exportJpeg, exportPng, exportPdf, deliverFiles, downloadFile } from "../../lib/exportReport";
import { upsertReport } from "../../db/repos";
import type { MonthlyReport, Student } from "../../db/types";
import type { ReportData } from "../../template/types";

export type ExportFormat = "jpg" | "png" | "pdf";

/** Tahap ekspor yang terlihat pengguna — pesannya menyebut langkah berikutnya. */
export type ExportStage = "menyiapkan-halaman" | "mengunduh-berkas" | "lembar-berbagi";

export const EXPORT_STAGE_LABEL: Record<ExportStage, string> = {
  "menyiapkan-halaman": "Sedang menyiapkan halaman…",
  "mengunduh-berkas": "Sedang mengunduh berkas…",
  "lembar-berbagi": "Lembar berbagi sedang dibuka — pilih tujuan pengirimannya.",
};

/** Berkas yang belum terkirim + label tombolnya (mis. "halaman 2"). */
export interface PendingExportFile {
  file: File;
  label: string;
}

export function useReportExport(deps: {
  student?: Student;
  report?: MonthlyReport;
  reportData: ReportData | null;
  /** Label periode yang sudah di-resolve (dipakai nama file). */
  periodLabel: string;
  setMessage: (message: string) => void;
}) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportStage, setExportStage] = useState<ExportStage | null>(null);
  /**
   * Berkas yang belum terunduh: hanya terisi bila laporan punya >1 halaman,
   * karena peramban hanya mengizinkan satu unduhan otomatis per gestur.
   * Pemanggil menampilkannya sebagai tombol unduh per halaman.
   */
  const [pendingFiles, setPendingFiles] = useState<PendingExportFile[]>([]);
  const reportExportRef = useRef<HTMLDivElement>(null);

  const handleMarkReportShared = async () => {
    const { report, setMessage } = deps;
    if (!report) return;
    const now = new Date().toISOString();
    await upsertReport({ ...report, sharedAt: now, pdfGeneratedAt: now });
    setMessage("Laporan ditandai sudah dibagikan ✓");
  };

  /** Unduh satu berkas sisa (tiap ketukan = satu gestur sah bagi peramban). */
  const downloadPendingFile = (pending: PendingExportFile) => {
    downloadFile(pending.file);
    const rest = pendingFiles.filter((f) => f.file !== pending.file);
    setPendingFiles(rest);
    if (rest.length === 0) deps.setMessage("✓ Semua halaman sudah diunduh");
  };

  const clearPendingFiles = useCallback(() => setPendingFiles([]), []);

  const doExport = async (type: ExportFormat) => {
    const { student, report, reportData, periodLabel, setMessage } = deps;
    if (!student || !report || !reportData || exporting) return;
    setExporting(type);
    setExportStage("menyiapkan-halaman");
    setMessage("");
    setPendingFiles([]);
    const base = `Laporan-${student.name}-${periodLabel}`.replace(/\s+/g, "-");
    const exportRoot = reportExportRef.current ?? document;
    // JPG/PNG/PDF memakai komposisi halaman yang sama (tinggi otomatis) —
    // tidak ada lagi perbedaan rasio antar format.
    try {
      const files = type === "jpg" ? await exportJpeg(base, exportRoot)
        : type === "png" ? await exportPng(base, exportRoot)
        : [await exportPdf(base, exportRoot)];
      // Berkas pertama terkirim sekarang (atau semuanya lewat Web Share);
      // sisanya dikembalikan untuk diunduh lewat ketukan pengguna.
      const format = type.toUpperCase();
      const delivery = await deliverFiles(files, base, (via) => {
        setExportStage(via === "share" ? "lembar-berbagi" : "mengunduh-berkas");
      });
      // Nomor halaman dihitung dari URUTAN berkas, bukan dari nama berkas: nama
      // memuat periode yang bisa berakhir angka tahun (mis. "…-Juni-2026.jpg"
      // akan salah dibaca "halaman 2026").
      const firstRemainingIndex = files.length - delivery.remaining.length;
      setPendingFiles(delivery.remaining.map((file, i) => ({
        file,
        label: `halaman ${firstRemainingIndex + i + 1}`,
      })));
      // Dibuat ≠ dibagikan: ekspor hanya mencatat bahwa berkasnya sudah dibuat.
      await upsertReport({ ...report, lastExportedAt: new Date().toISOString() });
      if (delivery.remaining.length === 0) {
        setMessage(delivery.via === "share"
          ? `✓ Berkas ${format} dibuat dan dibagikan lewat lembar berbagi`
          : `✓ Berkas ${format} dibuat dan diunduh`);
      } else {
        setMessage(`✓ Berkas ${format} dibuat — 1 dari ${files.length} halaman terkirim, sisa ${delivery.remaining.length} ada di daftar di bawah`);
      }
    } catch (e) {
      setMessage("Gagal ekspor: " + (e as Error).message);
    } finally {
      setExporting(null);
      setExportStage(null);
    }
  };

  return {
    exporting, exportStage, reportExportRef, doExport, handleMarkReportShared,
    pendingFiles, downloadPendingFile, clearPendingFiles,
  };
}
