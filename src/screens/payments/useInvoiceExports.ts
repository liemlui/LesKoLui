/**
 * Hook ekspor tagihan (CSV, PDF rekap, PDF/JPG invoice tunggal) — diekstraksi
 * dari TagihanTab.tsx. Dynamic import html-to-image/jsPDF tetap lazy.
 */
import { useRef, useState } from "react";
import type { Payment, Student } from "../../db/types";
import { loadHtmlToImage, loadJsPdf } from "../../lib/exportDeps";
import { downloadBlob } from "../../lib/download";
import { escapeCsvCell } from "../../lib/csv";
import { INVOICE_ORIGIN_LABEL, invoiceOriginOf } from "../../lib/invoicePresentation";
import type { MessageSetter } from "./useSessionCountBilling";
import type { BillRow } from "./useInvoiceFilters";

/** Nama berkas "Rincian Les" — PDF dan JPG memakai pola yang sama. */
function rincianLesFileName(target: { payment: Payment; student: Student }, ext: string): string {
  return `rincian-les-${target.student.name.replace(/\s+/g, "-")}-${target.payment.month}.${ext}`;
}

interface UseInvoiceExportsArgs {
  studentMap: Map<string, Student>;
  filteredBillRows: BillRow[];
  invoiceStatusFilter: string;
  invoiceOriginFilter: string;
  setMessage: MessageSetter;
}

export function useInvoiceExports({
  studentMap, filteredBillRows, invoiceStatusFilter, invoiceOriginFilter, setMessage,
}: UseInvoiceExportsArgs) {
  const [pdfExporting, setPdfExporting] = useState(false);
  const [invoiceTarget, setInvoiceTarget] = useState<{ payment: Payment; student: Student } | null>(null);
  const [invoiceExporting, setInvoiceExporting] = useState(false);
  const [invoiceJpgExporting, setInvoiceJpgExporting] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  /**
   * Awalan nama berkas ekspor. Keputusan pemilik 2026-10-07: yang sudah lunas
   * bukan tagihan melainkan riwayat transaksi, jadi berkas yang isinya transaksi
   * lunas tidak boleh dinamai "tagihan".
   */
  const namaBerkas = (ext: string) => invoiceStatusFilter === "paid"
    ? `riwayat-transaksi-${invoiceOriginFilter}.${ext}`
    : `tagihan-semua-periode-${invoiceStatusFilter}-${invoiceOriginFilter}.${ext}`;

  const handleExportInvoicePdf = async () => {
    if (!invoiceRef.current || !invoiceTarget) return;
    setInvoiceExporting(true);
    try {
      const [{ toPng }, { jsPDF }] = await Promise.all([loadHtmlToImage(), loadJsPdf()]);
      await document.fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      const el = invoiceRef.current;
      el.scrollIntoView({ block: "nearest" });
      const dataUrl = await toPng(el, { pixelRatio: 2, cacheBust: true, style: { overflow: "visible" } });
      const w = el.offsetWidth; const h = el.offsetHeight;
      const pdf = new jsPDF({ orientation: "p", unit: "px", format: [w, h] });
      pdf.addImage(dataUrl, "PNG", 0, 0, w, h);
      const blob = pdf.output("blob");
      downloadBlob(blob, rincianLesFileName(invoiceTarget, "pdf"));
    } catch (e) { setMessage("Gagal ekspor: " + (e as Error).message); }
    finally { setInvoiceExporting(false); }
  };

  /**
   * Ekspor invoice sebagai JPG — potret elemen yang sama dengan PDF, tanpa jsPDF.
   * Latar putih dipaksa karena JPEG tidak punya kanal transparan. Berlaku untuk
   * tagihan belum lunas maupun sudah lunas; blok status ikut terpotret
   * ("Menunggu Pembayaran" atau "✓ Lunas").
   *
   * Sengaja lewat kanvas + `canvas.toBlob`, bukan `toJpeg` lalu `fetch(data:)`:
   * CSP produksi (`vercel.json`) hanya mengizinkan `connect-src 'self' blob:`,
   * sehingga `fetch` atas data URL akan ditolak di alamat online.
   */
  const handleExportInvoiceJpg = async () => {
    if (!invoiceRef.current || !invoiceTarget) return;
    setInvoiceJpgExporting(true);
    try {
      const { toCanvas } = await loadHtmlToImage();
      await document.fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      const el = invoiceRef.current;
      el.scrollIntoView({ block: "nearest" });
      const canvas = await toCanvas(el, {
        pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true, style: { overflow: "visible" },
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
      if (!blob) throw new Error("kanvas tidak menghasilkan gambar");
      downloadBlob(blob, rincianLesFileName(invoiceTarget, "jpg"));
    } catch (e) { setMessage("Gagal ekspor JPG: " + (e as Error).message); }
    finally { setInvoiceJpgExporting(false); }
  };

  const handleExportCsv = () => {
    if (filteredBillRows.length === 0) {
      setMessage("Tidak ada tagihan yang cocok dengan filter untuk diekspor.");
      return;
    }
    const rows = [
      ["Murid", "Bulan", "Periode", "Asal", "Total (IDR)", "Status", "Bayar Tgl", "Metode"],
      ...filteredBillRows.map(({ payment, report }) => [
        studentMap.get(payment.studentId)?.name ?? "(dihapus)",
        payment.month,
        payment.periodStart && payment.periodEnd ? `${payment.periodStart} s/d ${payment.periodEnd}` : "Tanpa sesi",
        INVOICE_ORIGIN_LABEL[invoiceOriginOf(payment, report)],
        String(payment.totalCost),
        payment.status === "PAID" ? "Lunas" : "Belum dibayar",
        payment.paidAt ?? "", payment.method ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map(escapeCsvCell).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, namaBerkas("csv"));
  };

  const handleExportPdf = async () => {
    setPdfExporting(true);
    try {
      const [{ toPng }, { jsPDF }] = await Promise.all([loadHtmlToImage(), loadJsPdf()]);
      await document.fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      const pages = Array.from(document.querySelectorAll<HTMLElement>("[data-pdf-page]"));
      if (pages.length === 0) { setMessage("Tidak ada tagihan untuk diekspor."); return; }
      let pdf: InstanceType<typeof jsPDF> | null = null;
      for (let i = 0; i < pages.length; i++) {
        pages[i].scrollIntoView({ block: "nearest" });
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const dataUrl = await toPng(pages[i], { pixelRatio: 2, cacheBust: true, style: { overflow: "visible" } });
        const w = pages[i].offsetWidth; const h = pages[i].offsetHeight;
        if (!pdf) { pdf = new jsPDF({ orientation: "p", unit: "px", format: [w, h] }); }
        else { pdf.addPage([w, h], "p"); }
        pdf.addImage(dataUrl, "PNG", 0, 0, w, h);
      }
      if (!pdf) return;
      const blob = pdf.output("blob");
      downloadBlob(blob, namaBerkas("pdf"));
    } catch (e) { setMessage("Gagal ekspor PDF: " + (e as Error).message); }
    finally { setPdfExporting(false); }
  };

  return {
    pdfExporting,
    invoiceTarget,
    setInvoiceTarget,
    invoiceExporting,
    invoiceJpgExporting,
    invoiceRef,
    handleExportInvoicePdf,
    handleExportInvoiceJpg,
    handleExportCsv,
    handleExportPdf,
  };
}
