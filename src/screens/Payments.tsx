import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { listPayments, listStudents, getPayment, upsertPayment, getSettings } from "../db/repos";
import { formatRupiah } from "../lib/format";
import { hashPin } from "../lib/crypto";
import InvoiceCard from "../components/InvoiceCard";
import PaginationControls from "../components/PaginationControls";
import { clampPage, paginateItems } from "../lib/pagination";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

export default function PaymentsPage() {
  const navigate = useNavigate();
  const payments = useLiveQuery(() => listPayments(), []);
  const students = useLiveQuery(() => listStudents(true), []);
  const settings = useLiveQuery(() => getSettings(), []);
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const [filterMonth, setFilterMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [totalCost, setTotalCost] = useState(0);
  const [message, setMessage] = useState("");
  const [summaryPage, setSummaryPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [pdfExporting, setPdfExporting] = useState(false);

  const ITEMS_PER_PDF_PAGE = 5;

  const handleExportPdf = async () => {
    setPdfExporting(true);
    try {
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `rekap-keuangan-${filterMonth || "semua"}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) { setMessage("Gagal ekspor PDF: " + (e as Error).message); }
    finally { setPdfExporting(false); }
  };

  const studentMap = new Map(students?.map((s) => [s.id, s]));

  const filtered = filterMonth
    ? (payments ?? []).filter((p) => p.month === filterMonth)
    : (payments ?? []);

  // New payment form
  const handleCreatePayment = async () => {
    if (!selectedStudentId || !selectedMonth || totalCost <= 0) {
      setMessage("Lengkapi semua data!");
      return;
    }
    const existing = await getPayment(selectedStudentId, selectedMonth);
    if (existing) {
      setMessage("Tagihan untuk murid & bulan ini sudah ada!");
      return;
    }
    await upsertPayment({
      studentId: selectedStudentId,
      month: selectedMonth,
      totalCost,
      status: "UNPAID",
    });
    setMessage("Tagihan baru dibuat ✓");
    setTotalCost(0);
  };

  const handleMarkPaid = async (studentId: string, month: string) => {
    const p = await getPayment(studentId, month);
    if (!p) return;
    const method = prompt("Metode pembayaran (transfer/tunai/dll):") || "transfer";
    await upsertPayment({
      ...p,
      status: "PAID",
      paidAt: new Date().toISOString().slice(0, 10),
      method,
    });
    setMessage(`Pembayaran ${studentMap.get(studentId)?.name} ditandai lunas ✓`);
  };

  if (!payments || !students || !settings) return <div className="p-4 text-gray-500">Memuat...</div>;

  // PIN gate — only if financialPin is set and not yet unlocked
  if (settings.financialPin && !unlocked) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-4xl">🔐</p>
        <p className="font-bold text-lg text-gray-800">Data Keuangan</p>
        <p className="text-sm text-gray-400 text-center">Masukkan PIN untuk mengakses rekap keuangan</p>
        <input type="password" inputMode="numeric" maxLength={6} placeholder="PIN"
          value={pinInput} onChange={(e) => { setPinInput(e.target.value); setPinError(""); }}
          className="input text-center tracking-widest text-xl w-40" autoFocus />
        {pinError && <p className="text-sm text-red-500">{pinError}</p>}
        <button
          onClick={async () => {
            const h = await hashPin(pinInput);
            if (h !== settings.financialPin) { setPinError("PIN salah."); return; }
            setUnlocked(true); setPinInput("");
          }}
          className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors">
          Buka
        </button>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-400 hover:text-gray-600">← Kembali</button>
      </div>
    );
  }

  const totalsByMonth = payments.reduce<Record<string, number>>((acc, p) => {
    acc[p.month] = (acc[p.month] || 0) + p.totalCost;
    return acc;
  }, {});
  const sortedMonthTotals = Object.entries(totalsByMonth).sort();
  const safeSummaryPage = clampPage(summaryPage, sortedMonthTotals.length);
  const safePaymentPage = clampPage(paymentPage, filtered.length);
  const paginatedMonthTotals = paginateItems(sortedMonthTotals, safeSummaryPage);
  const paginatedPayments = paginateItems(filtered, safePaymentPage);

  // Build PDF pages (5 per page)
  const pdfPageGroups: typeof filtered[] = [];
  for (let i = 0; i < filtered.length; i += ITEMS_PER_PDF_PAGE) {
    pdfPageGroups.push(filtered.slice(i, i + ITEMS_PER_PDF_PAGE));
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bayaran</h1>
        <button onClick={handleExportPdf} disabled={pdfExporting}
          className="flex items-center gap-1.5 text-sm font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50">
          {pdfExporting ? "⏳ Ekspor..." : "📄 PDF"}
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {message}
        </div>
      )}

      {/* New Invoice */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold">Tagihan Baru</h2>
        <select className="input" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
          <option value="">Pilih murid...</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input className="input" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
        <input className="input" type="number" placeholder="Total biaya (IDR)" value={totalCost || ""}
          onChange={(e) => setTotalCost(Number(e.target.value))} />
        <button onClick={handleCreatePayment} className="btn-primary w-full">Buat Tagihan</button>
      </div>

      {/* Filter by month */}
      <div className="flex gap-2">
        <input className="input flex-1" type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
        <p className="text-sm font-semibold text-gray-500">Rekap per Bulan</p>
      <div className="flex flex-wrap gap-2">
        {paginatedMonthTotals.map(([m, total]) => (
          <button key={m}
            className={`px-3 py-1 rounded-full text-sm border ${
              filterMonth === m ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"
            }`}
            onClick={() => setFilterMonth(m)}>
            {m} — {formatRupiah(total)}
          </button>
        ))}
      </div>
      <PaginationControls
        page={safeSummaryPage}
        total={sortedMonthTotals.length}
        onPageChange={setSummaryPage}
        label="bulan"
      />
      </div>

      {/* Invoices */}
      {filtered.length === 0 && <p className="text-gray-400 text-center py-8">Belum ada tagihan.</p>}

      <div className="space-y-3">
        {paginatedPayments.map((p) => (
          <InvoiceCard
            key={p.id}
            payment={p}
            studentName={studentMap.get(p.studentId)?.name ?? "(dihapus)"}
            onMarkPaid={p.status === "UNPAID" ? () => handleMarkPaid(p.studentId, p.month) : undefined}
          />
        ))}
      </div>
      <PaginationControls
        page={safePaymentPage}
        total={filtered.length}
        onPageChange={setPaymentPage}
        label="tagihan"
      />

      {/* Hidden PDF export pages — captured by handleExportPdf */}
      <div style={{ position: "absolute", left: -9999, top: 0, pointerEvents: "none" }}>
        {pdfPageGroups.map((group, pageIdx) => (
          <div key={pageIdx} data-pdf-page
            style={{ width: 400, background: "#fff", padding: "24px 20px", fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "2px solid #e5e7eb", paddingBottom: 10 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 18, margin: 0, color: "#1e40af" }}>Rekap Keuangan</p>
                <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{filterMonth || "Semua Bulan"}</p>
              </div>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Hal {pageIdx + 1}/{pdfPageGroups.length}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {group.map((p) => {
                const sName = studentMap.get(p.studentId)?.name ?? "(dihapus)";
                return (
                  <div key={p.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px",
                    background: p.status === "PAID" ? "#f0fdf4" : "#fffbeb" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: "#111827" }}>{sName}</p>
                        <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>{p.month}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: "#1e40af" }}>{formatRupiah(p.totalCost)}</p>
                        <span style={{ fontSize: 11, fontWeight: 600,
                          color: p.status === "PAID" ? "#16a34a" : "#d97706",
                          background: p.status === "PAID" ? "#dcfce7" : "#fef3c7",
                          padding: "2px 8px", borderRadius: 999, display: "inline-block", marginTop: 3 }}>
                          {p.status === "PAID" ? "Lunas" : "Belum Bayar"}
                        </span>
                      </div>
                    </div>
                    {p.status === "PAID" && p.paidAt && (
                      <p style={{ fontSize: 11, color: "#6b7280", margin: "6px 0 0" }}>
                        Bayar {p.paidAt} via {p.method ?? "-"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
