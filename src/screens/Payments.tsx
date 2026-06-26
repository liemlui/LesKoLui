import { useState, useMemo, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import {
  listPayments, listStudents, getPayment, upsertPayment, getSettings,
  createExpense, listExpenses, deleteExpense,
  listSessionsForMonth, listSessionsByStudentMonth, listAllUpcomingScheduled,
  listScheduledForMonth,
  getMonthClosing, listMonthClosings, closeMonth, reopenMonth,
  markPaymentTransferred, markPaymentUnpaid, updatePaymentAmount, getCashSummary,
  getMonthlyIncomeVsExpense,
} from "../db/repos";
import type { ExpenseCategory } from "../db/repos";
import type { Payment, Student, Settings } from "../db/types";
import { formatRupiah, todayWIB, monthLabel } from "../lib/format";
import { usePinGate } from "../hooks/usePinGate";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { generatePaymentReminder, estimatePaymentReminderCost } from "../lib/aiClient";
import { AiCostModal } from "../components/AiCostModal";
import { buildBillingMessage, toWaNumber } from "../lib/waBilling";
import { forecastNextMonth } from "../lib/forecast";
import { escapeCsvCell } from "../lib/csv";
import { downloadBlob } from "../lib/download";
import { MAX_PAYMENT_AMOUNT, clampCurrencyAmount, isValidCurrencyAmount, parseCurrencyDigits } from "../lib/money";

type Tab = "ringkasan" | "tagihan" | "pengeluaran" | "audit";

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  transport: "🚗 Transport",
  buku: "📚 Buku",
  alat: "🛠 Alat",
  platform: "💻 Platform",
  lainnya: "🗂 Lainnya",
};

const TAB_LABEL: Record<Tab, string> = {
  ringkasan: "Ringkasan",
  tagihan: "Tagihan",
  pengeluaran: "Pengeluaran",
  audit: "Audit",
};

function getLast12Months(): string[] {
  const months: string[] = [];
  const now = new Date(Date.now() + 7 * 3600000);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

const monthsBetween = (a: string, b: string): number => {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
};

export default function PaymentsPage() {
  const navigate = useNavigate();
  const payments  = useLiveQuery(() => listPayments(), []);
  const students  = useLiveQuery(() => listStudents(true), []);
  const settings  = useLiveQuery(() => getSettings(), []);
  const pin = usePinGate();

  const [activeTab, setActiveTab] = useState<Tab>("ringkasan");
  const [message, setMessage] = useState("");

  // Shared month for Ringkasan + Tagihan/Tutup Bulan
  const [month, setMonth] = useState(() => todayWIB().slice(0, 7));

  // Tutup Bulan workflow
  const [billEdits, setBillEdits] = useState<Record<string, string>>({});
  const [closingBusy, setClosingBusy] = useState(false);
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);

  // Manual invoice
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [totalCost, setTotalCost] = useState(0);
  const [showManual, setShowManual] = useState(false);

  // Invoice / reminder
  const [pdfExporting, setPdfExporting] = useState(false);
  const [reminderLoading, setReminderLoading] = useState<string | null>(null);
  const [reminderModal,   setReminderModal]   = useState<{ paymentId: string; studentName: string; parentName?: string; month: string; amount: number } | null>(null);
  const [invoiceTarget, setInvoiceTarget] = useState<{ payment: Payment; student: Student } | null>(null);
  const [invoiceExporting, setInvoiceExporting] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Pengeluaran state
  const [expMonth, setExpMonth] = useState(() => todayWIB().slice(0, 7));
  const [expDate, setExpDate] = useState(() => todayWIB());
  const [expCategory, setExpCategory] = useState<ExpenseCategory>("transport");
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState(0);
  const [expMsg, setExpMsg] = useState("");
  const expenses = useLiveQuery(() => listExpenses(expMonth || undefined), [expMonth]);

  // Audit
  const [auditYear, setAuditYear] = useState(() => Number(todayWIB().slice(0, 4)));

  // ── Data for the selected month ──
  const monthSessions = useLiveQuery(() => listSessionsForMonth(month), [month]);
  const monthExpenses = useLiveQuery(() => listExpenses(month), [month]);
  const closings = useLiveQuery(() => listMonthClosings(), []);
  const monthClosing = useLiveQuery(() => getMonthClosing(month), [month]);

  const chartData = useLiveQuery(() => getMonthlyIncomeVsExpense(getLast12Months()), []);

  const nextMonthStr = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const nm = new Date(y, m, 1);
    return `${nm.getFullYear()}-${String(nm.getMonth() + 1).padStart(2, "0")}`;
  }, [month]);
  const nextSessions = useLiveQuery(() => listAllUpcomingScheduled(nextMonthStr + "-01"), [nextMonthStr]);

  const histMonths = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return [2, 1, 0].map((i) => {
      const d = new Date(y, m - 1 - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  }, [month]);
  const histData = useLiveQuery(() => getCashSummary(histMonths), [histMonths]);

  const auditMonths = useMemo(
    () => Array.from({ length: 12 }, (_, i) => `${auditYear}-${String(i + 1).padStart(2, "0")}`),
    [auditYear]
  );
  const auditData = useLiveQuery(() => getCashSummary(auditMonths), [auditMonths]);

  // ── Handlers ──
  const handleCreatePayment = async () => {
    if (!selectedStudentId || !selectedMonth || !isValidCurrencyAmount(totalCost)) { setMessage("Lengkapi semua data dengan nominal valid!"); return; }
    const existing = await getPayment(selectedStudentId, selectedMonth);
    if (existing) { setMessage("Tagihan untuk murid & bulan ini sudah ada!"); return; }
    await upsertPayment({ studentId: selectedStudentId, month: selectedMonth, totalCost, status: "UNPAID" });
    setMessage("Tagihan baru dibuat ✓");
    setTotalCost(0);
  };

  const handleCloseMonth = async () => {
    // Cek apakah masih ada sesi SCHEDULED yang belum diajar
    const scheduled = await listScheduledForMonth(month);
    if (scheduled.length > 0) {
      const names = scheduled.map((s) => studentMap.get(s.studentId)?.name ?? "(dihapus)");
      const unique = [...new Set(names)];
      const ok = window.confirm(
        `⚠️ Masih ada ${scheduled.length} sesi terjadwal yang BELUM diajar:\n${unique.join(", ")}\n\nTetap tutup bulan?`
      );
      if (!ok) { setClosingBusy(false); return; }
    }
    setClosingBusy(true);
    try {
      await closeMonth(month);
      setMessage(`Bulan ${monthLabel(month)} ditutup ✓ Tagihan dibuat otomatis.`);
    } catch (e) { setMessage("Gagal: " + (e as Error).message); }
    finally { setClosingBusy(false); }
  };

  const handleReopenMonth = async () => {
    if (!window.confirm(`Buka kembali ${monthLabel(month)}? Tagihan otomatis yang belum lunas akan dihapus (tagihan manual dan yang sudah lunas tetap).`)) return;
    await reopenMonth(month);
    setMessage(`Bulan ${monthLabel(month)} dibuka kembali.`);
  };

  const saveBillAmount = async (studentId: string, fallback: number) => {
    const raw = billEdits[studentId];
    setBillEdits((prev) => { const c = { ...prev }; delete c[studentId]; return c; });
    if (raw == null || raw === "") return;
    const n = Number(raw);
    if (!isValidCurrencyAmount(n)) { setMessage(`Nominal harus 1 sampai ${formatRupiah(MAX_PAYMENT_AMOUNT)}.`); return; }
    if (n !== fallback) await updatePaymentAmount(studentId, month, n);
  };

  const handleAddExpense = async () => {
    if (!expDate || !expDesc || expAmount <= 0) { setExpMsg("Lengkapi semua data!"); return; }
    await createExpense({ date: expDate, category: expCategory, description: expDesc, amount: expAmount });
    setExpMsg("Pengeluaran ditambahkan ✓");
    setExpDesc(""); setExpAmount(0);
  };

  const handleExportInvoicePdf = async () => {
    if (!invoiceRef.current || !invoiceTarget) return;
    setInvoiceExporting(true);
    try {
      await document.fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      const el = invoiceRef.current;
      el.scrollIntoView({ block: "nearest" });
      const dataUrl = await toPng(el, { pixelRatio: 2, cacheBust: true, style: { overflow: "visible" } });
      const w = el.offsetWidth; const h = el.offsetHeight;
      const pdf = new jsPDF({ orientation: "p", unit: "px", format: [w, h] });
      pdf.addImage(dataUrl, "PNG", 0, 0, w, h);
      const blob = pdf.output("blob");
      downloadBlob(blob, `invoice-${invoiceTarget.student.name.replace(/\s+/g, "-")}-${invoiceTarget.payment.month}.pdf`);
    } catch (e) { setMessage("Gagal ekspor: " + (e as Error).message); }
    finally { setInvoiceExporting(false); }
  };

  // Bulk export for the selected month's bills
  const handleExportCsv = () => {
    const rows = [
      ["Murid", "Bulan", "Total (IDR)", "Status", "Bayar Tgl", "Metode"],
      ...monthPayments.map((p) => [
        studentMap.get(p.studentId)?.name ?? "(dihapus)",
        p.month, String(p.totalCost),
        p.status === "PAID" ? "Lunas" : "Belum Bayar",
        p.paidAt ?? "", p.method ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map(escapeCsvCell).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `tagihan-${month}.csv`);
  };

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
      downloadBlob(blob, `tagihan-${month}.pdf`);
    } catch (e) { setMessage("Gagal ekspor PDF: " + (e as Error).message); }
    finally { setPdfExporting(false); }
  };

  const exportAuditCsv = () => {
    const rows = auditData ?? [];
    const header = "Bulan,Pemasukan (Realisasi),Pengeluaran,Laba,Status";
    const body = rows.map((r) => `${r.month},${r.realisasi},${r.pengeluaran},${r.laba},${r.closed ? "Ditutup" : "Terbuka"}`);
    const total = `Total ${auditYear},${auditTotals.realisasi},${auditTotals.pengeluaran},${auditTotals.laba},`;
    const csv = [header, ...body, total].join("\n");
    downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `Audit-Keuangan-${auditYear}.csv`);
  };

  if (!payments || !students || !settings) return <div className="p-4 text-gray-500">Memuat...</div>;

  if (!settings.financialPin) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-4xl">ðŸ”</p>
        <p className="font-bold text-lg text-gray-800">PIN Keuangan Belum Aktif</p>
        <p className="text-sm text-gray-400 text-center">Buat PIN dulu sebelum membuka data keuangan, tagihan, dan audit.</p>
        <button
          onClick={() => navigate("/settings")}
          className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors">
          Buka Pengaturan
        </button>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-400 hover:text-gray-600">â† Kembali</button>
      </div>
    );
  }

  if (settings.financialPin && !pin.unlocked) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-4xl">🔐</p>
        <p className="font-bold text-lg text-gray-800">Data Keuangan</p>
        <p className="text-sm text-gray-400 text-center">Masukkan PIN untuk mengakses keuangan</p>
        <input type="password" inputMode="numeric" maxLength={6} placeholder="PIN (6 digit)"
          value={pin.pinInput} onChange={(e) => pin.setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="input text-center tracking-widest text-xl w-40" autoFocus />
        {pin.pinError && <p className="text-sm text-red-500">{pin.pinError}</p>}
        <button
          onClick={async () => { await pin.attemptPin(settings.financialPin!); }}
          className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors">
          Buka
        </button>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-400 hover:text-gray-600">← Kembali</button>
      </div>
    );
  }

  // ── Derived ──
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const monthPayments = payments.filter((p) => p.month === month);

  const cash = {
    potensi: (monthSessions ?? []).reduce((s, x) => s + x.cost, 0),
    realisasi: monthPayments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.totalCost, 0),
    piutang: monthPayments.filter((p) => p.status === "UNPAID").reduce((s, p) => s + p.totalCost, 0),
    pengeluaran: (monthExpenses ?? []).reduce((s, e) => s + e.amount, 0),
    hours: (monthSessions ?? []).reduce((s, x) => s + x.durationHours, 0),
    laba: 0,
  };
  cash.laba = cash.realisasi - cash.pengeluaran;

  // Tutup Bulan availability: current month only from the 28th; past months always; future never.
  const _today = todayWIB();
  const curMonth = _today.slice(0, 7);
  const curDay = Number(_today.slice(8, 10));
  const canClose = month < curMonth || (month === curMonth && curDay >= 28);
  const closeHint = month > curMonth
    ? "Bulan belum berjalan."
    : "Tutup bulan berjalan tersedia mulai tanggal 28.";

  // Per-student preview (from DONE sessions) before closing
  const previewBills = Array.from(
    (monthSessions ?? []).reduce((m, s) => {
      const cur = m.get(s.studentId) ?? { count: 0, hours: 0, cost: 0 };
      m.set(s.studentId, { count: cur.count + 1, hours: cur.hours + s.durationHours, cost: cur.cost + s.cost });
      return m;
    }, new Map<string, { count: number; hours: number; cost: number }>())
  ).map(([sid, d]) => ({ sid, name: studentMap.get(sid)?.name ?? "(dihapus)", ...d }))
   .sort((a, b) => b.cost - a.cost);

  // Sessions grouped by student for expandable preview detail
  const previewSessionsByStudent = (monthSessions ?? []).reduce<Map<string, import("../db/types").Session[]>>((m, s) => {
    const arr = m.get(s.studentId) ?? [];
    arr.push(s);
    m.set(s.studentId, arr);
    return m;
  }, new Map());

  const billRows = monthPayments
    .map((p) => ({
      payment: p,
      student: studentMap.get(p.studentId),
      sessions: (monthSessions ?? []).filter((s) => s.studentId === p.studentId),
    }))
    .sort((a, b) => b.payment.totalCost - a.payment.totalCost);

  const monthsOverview = (closings ?? []).map((c) => {
    const ps = payments.filter((p) => p.month === c.month);
    return {
      month: c.month,
      total: ps.length,
      paid: ps.filter((p) => p.status === "PAID").length,
      piutang: ps.filter((p) => p.status === "UNPAID").reduce((s, p) => s + p.totalCost, 0),
    };
  });

  const closedMonths = new Set((closings ?? []).map((c) => c.month));
  const piutangRows = payments
    .filter((p) => p.status === "UNPAID" && closedMonths.has(p.month))
    .map((p) => ({ payment: p, student: studentMap.get(p.studentId) }))
    .sort((a, b) => a.payment.month.localeCompare(b.payment.month));

  const forecast = forecastNextMonth({
    scheduledNext: (nextSessions ?? []).filter((s) => s.date.startsWith(nextMonthStr)).reduce((s, x) => s + x.cost, 0),
    history: (histData ?? []).map((d) => d.potensi),
  });

  const auditTotals = {
    realisasi: (auditData ?? []).reduce((s, r) => s + r.realisasi, 0),
    pengeluaran: (auditData ?? []).reduce((s, r) => s + r.pengeluaran, 0),
    laba: (auditData ?? []).reduce((s, r) => s + r.laba, 0),
  };

  const revenueByStudent = (monthSessions ?? []).reduce<Map<string, number>>((m, sess) => {
    m.set(sess.studentId, (m.get(sess.studentId) ?? 0) + sess.cost);
    return m;
  }, new Map());

  const chartMax = Math.max(...(chartData ?? []).map((d) => Math.max(d.income, d.expense, 1)));

  const ITEMS_PER_PDF_PAGE = 5;
  const pdfPageGroups: Payment[][] = [];
  for (let i = 0; i < monthPayments.length; i += ITEMS_PER_PDF_PAGE)
    pdfPageGroups.push(monthPayments.slice(i, i + ITEMS_PER_PDF_PAGE));

  const pill = (paid: boolean) =>
    `text-[11px] font-semibold px-2 py-0.5 rounded-full ${paid ? "text-green-700 bg-green-100" : "text-amber-700 bg-amber-100"}`;

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Keuangan</h1>
        {activeTab === "tagihan" && (
          <div className="flex gap-2">
            <button onClick={handleExportCsv}
              className="flex items-center gap-1.5 text-sm font-semibold bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded-xl hover:bg-green-100 transition-colors">
              📊 CSV
            </button>
            <button onClick={handleExportPdf} disabled={pdfExporting}
              className="flex items-center gap-1.5 text-sm font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50">
              {pdfExporting ? "⏳ Ekspor..." : "📄 PDF"}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
        {(["ringkasan", "tagihan", "pengeluaran", "audit"] as Tab[]).map((tab) => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === tab ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
            }`}>
            {TAB_LABEL[tab]}
          </button>
        ))}
      </div>

      {message && (
        <div onClick={() => setMessage("")}
          className={`p-3 rounded-lg text-sm cursor-pointer ${message.includes("✓") ? "bg-green-50 text-green-700" : message.startsWith("Gagal") ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"}`}>
          {message}
        </div>
      )}

      {/* ── RINGKASAN TAB ─────────────────────────────────── */}
      {activeTab === "ringkasan" && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <label className="text-sm text-gray-500 flex-shrink-0">Bulan:</label>
            <input className="input flex-1" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>

          {/* Cash summary cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">Potensi (sesi)</p>
              <p className="text-lg font-bold text-gray-700">{formatRupiah(cash.potensi)}</p>
              <p className="text-[11px] text-gray-400">{cash.hours} jam mengajar</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">Realisasi (cash)</p>
              <p className="text-lg font-bold text-green-700">{formatRupiah(cash.realisasi)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">Piutang</p>
              <p className="text-lg font-bold text-amber-600">{formatRupiah(cash.piutang)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">Pengeluaran</p>
              <p className="text-lg font-bold text-red-600">{formatRupiah(cash.pengeluaran)}</p>
            </div>
            <div className="col-span-2 bg-green-50 rounded-xl p-3 border border-green-200 flex items-center justify-between">
              <p className="text-sm font-bold text-green-900">Laba (Realisasi − Pengeluaran)</p>
              <p className={`text-xl font-bold ${cash.laba >= 0 ? "text-green-700" : "text-red-600"}`}>{formatRupiah(cash.laba)}</p>
            </div>
          </div>

          {/* Forecast */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Prediksi Bulan Depan ({nextMonthStr})</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{formatRupiah(forecast.estimate)}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
              <span>📅 Terjadwal (terkunci): <b className="text-gray-700">{formatRupiah(forecast.scheduled)}</b></span>
              <span>📈 Tren 3 bln: <b className="text-gray-700">{formatRupiah(forecast.trend)}</b></span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">Estimasi = nilai tertinggi antara jadwal terkunci & tren (weighted moving average).</p>
          </div>

          {/* Revenue per student */}
          {revenueByStudent.size > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-500">Pendapatan per Murid</p>
              {Array.from(revenueByStudent.entries()).sort((a, b) => b[1] - a[1]).map(([sid, rev]) => {
                const pct = cash.potensi > 0 ? Math.round((rev / cash.potensi) * 100) : 0;
                return (
                  <div key={sid}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{studentMap.get(sid)?.name ?? "—"}</span>
                      <span className="text-gray-500">{formatRupiah(rev)} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 12-month income vs expense chart */}
          {(chartData ?? []).length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-500">Pendapatan vs Pengeluaran (12 Bln)</p>
              <div className="overflow-x-auto">
                <svg width={Math.max(300, (chartData ?? []).length * 28)} height={120} className="block">
                  {(chartData ?? []).map((d, i) => {
                    const barW = 10; const gap = 28; const x = i * gap + 4;
                    const incH = chartMax > 0 ? Math.round((d.income / chartMax) * 90) : 0;
                    const expH = chartMax > 0 ? Math.round((d.expense / chartMax) * 90) : 0;
                    return (
                      <g key={d.month}>
                        <rect x={x} y={100 - incH} width={barW} height={incH} fill="#3b82f6" rx={2} opacity={0.85} />
                        <rect x={x + barW + 1} y={100 - expH} width={barW} height={expH} fill="#ef4444" rx={2} opacity={0.75} />
                        <text x={x + barW} y={116} fontSize={7} textAnchor="middle" fill="#9ca3af">{d.month.slice(5)}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-blue-500 inline-block" /> Pendapatan</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-400 inline-block" /> Pengeluaran</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAGIHAN TAB (Tutup Bulan) ─────────────────────── */}
      {activeTab === "tagihan" && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <label className="text-sm text-gray-500 flex-shrink-0">Bulan:</label>
            <input className="input flex-1" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            {monthClosing ? (
              <span className="text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full flex-shrink-0">🔒 Ditutup</span>
            ) : (
              <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full flex-shrink-0">Terbuka</span>
            )}
          </div>

          {/* Tutup Bulan panel */}
          {!monthClosing ? (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Tagihan per Murid (preview)</p>
              <p className="text-[11px] text-gray-400 -mt-2">Tap nama murid untuk lihat detail sesi</p>
              {previewBills.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">Belum ada sesi selesai bulan ini.</p>
              ) : (
                <div className="space-y-1">
                  {previewBills.map((b) => {
                    const isExpanded = expandedPreview === b.sid;
                    const sessions = previewSessionsByStudent.get(b.sid) ?? [];
                    return (
                      <div key={b.sid} className="border-b border-gray-50 last:border-0">
                        {/* Header row — clickable to expand */}
                        <button
                          onClick={() => setExpandedPreview(isExpanded ? null : b.sid)}
                          className="w-full flex items-center justify-between text-sm py-2 hover:bg-gray-50 rounded-lg px-1 transition-colors">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-gray-400 text-xs transition-transform" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>▸</span>
                            <span className="font-medium text-gray-700 truncate">{b.name}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-xs text-gray-400">{b.count} sesi · {b.hours}j</span>
                            <span className="font-semibold text-gray-700">{formatRupiah(b.cost)}</span>
                          </div>
                        </button>
                        {/* Expanded session details */}
                        {isExpanded && sessions.length > 0 && (
                          <div className="ml-5 mb-2 space-y-1 bg-gray-50 rounded-lg p-2">
                            {sessions
                              .sort((a, s) => a.date.localeCompare(s.date))
                              .map((s) => (
                                <div key={s.id} className="flex items-center justify-between text-xs px-2 py-1">
                                  <span className="text-gray-500 font-mono">{s.date.slice(5).replace("-", "/")}</span>
                                  <span className="text-gray-600 flex-1 ml-2 truncate">{s.subjects.slice(0, 2).join(", ") || "—"}</span>
                                  <span className="text-gray-400 mx-2">{s.durationHours}j</span>
                                  <span className="font-medium text-gray-700">{formatRupiah(s.cost)}</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between pt-2 font-bold text-sm">
                    <span className="text-gray-700">Total</span>
                    <span className="text-green-700">{formatRupiah(cash.potensi)}</span>
                  </div>
                </div>
              )}
              <button onClick={handleCloseMonth} disabled={closingBusy || !canClose}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors">
                {closingBusy ? "Memproses..." : `🔒 Tutup Bulan ${monthLabel(month)}`}
              </button>
              {!canClose && <p className="text-xs text-amber-600 text-center">{closeHint}</p>}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Tagihan per Murid</p>
                <button onClick={handleReopenMonth}
                  className="text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg transition-colors">
                  ↩ Buka kembali
                </button>
              </div>
              {billRows.length === 0 ? (
                <p className="text-sm text-gray-400">Belum ada tagihan untuk bulan ini.</p>
              ) : (
                billRows.map(({ payment, student, sessions }) => {
                  const sid = payment.studentId;
                  const paid = payment.status === "PAID";
                  const amountStr = billEdits[sid] ?? String(payment.totalCost);
                  const totalHours = sessions.reduce((s, x) => s + x.durationHours, 0);
                  const phone = student?.parentContact?.phone ? toWaNumber(student.parentContact.phone) : "";
                  const waText = student ? buildBillingMessage({ student, sessions, month, settings, amountOverride: payment.totalCost }).text : "";
                  return (
                    <div key={payment.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-700 text-sm">{student?.name ?? "(dihapus)"}</span>
                        <span className={pill(paid)}>{paid ? "Lunas" : "Belum"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Rp</span>
                        <input className="input flex-1 text-sm py-1.5" inputMode="numeric" value={amountStr} disabled={paid}
                          onChange={(e) => {
                            const { raw } = parseCurrencyDigits(e.target.value, MAX_PAYMENT_AMOUNT);
                            setBillEdits((prev) => ({ ...prev, [sid]: raw }));
                          }}
                          onBlur={() => saveBillAmount(sid, payment.totalCost)} />
                      </div>
                      <div className="flex gap-2">
                        {phone && !paid && (
                          <a href={`https://wa.me/${phone}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer"
                            className="flex-1 text-center py-2 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors">
                            💬 Tagih WA
                          </a>
                        )}
                        {!paid ? (
                          <button onClick={() => markPaymentTransferred(sid, month)}
                            className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
                            ✓ Sudah Transfer
                          </button>
                        ) : (
                          <button onClick={() => markPaymentUnpaid(sid, month)}
                            className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs font-medium hover:bg-gray-50 transition-colors">
                            ↩ Batalkan
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {student && (
                          <button onClick={() => setInvoiceTarget({ payment, student })}
                            className="flex-1 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-xs font-medium hover:bg-gray-50 transition-colors">
                            📄 Invoice
                          </button>
                        )}
                        {!paid && student && settings.ai?.enabled && settings.ai.apiKey && (
                          <button disabled={reminderLoading === payment.id}
                            onClick={() => setReminderModal({ paymentId: payment.id, studentName: student.name, parentName: student.parentContact?.name, month: payment.month, amount: payment.totalCost })}
                            className="flex-1 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 text-xs font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50">
                            {reminderLoading === payment.id ? "⏳..." : "✨ Reminder AI"}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {sessions.length} sesi · {totalHours}j{paid && payment.paidAt ? ` · dibayar ${payment.paidAt}` : ""}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Riwayat Tutup Bulan */}
          {monthsOverview.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">Riwayat Tutup Bulan</p>
              <div className="space-y-1">
                {monthsOverview.map((m) => (
                  <button key={m.month} onClick={() => setMonth(m.month)}
                    className={`w-full flex items-center justify-between text-sm py-1.5 px-2 rounded-lg transition-colors ${m.month === month ? "bg-green-50" : "hover:bg-gray-50"}`}>
                    <span className="font-medium text-gray-700">{monthLabel(m.month)}</span>
                    <span className="text-xs flex items-center gap-2">
                      <span className="text-green-600 font-semibold">{m.paid}/{m.total} lunas</span>
                      {m.piutang > 0 && <span className="text-amber-600">piutang {formatRupiah(m.piutang)}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual invoice (collapsible) */}
          <div className="bg-gray-50 rounded-xl p-4">
            <button onClick={() => setShowManual((v) => !v)} className="w-full flex items-center justify-between text-sm font-semibold text-gray-600">
              <span>+ Tagihan Manual (di luar tutup bulan)</span>
              <span>{showManual ? "▾" : "▸"}</span>
            </button>
            {showManual && (
              <div className="space-y-3 mt-3">
                <select className="input" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                  <option value="">Pilih murid...</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input className="input" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
                <input className="input" type="number" placeholder="Total biaya (IDR)" value={totalCost || ""} min={1} max={100000000}
                  onChange={(e) => setTotalCost(clampCurrencyAmount(Number(e.target.value), MAX_PAYMENT_AMOUNT))} />
                <button onClick={handleCreatePayment} className="btn-primary w-full">Buat Tagihan</button>
              </div>
            )}
          </div>

          {/* Hidden PDF pages for bulk export */}
          <div style={{ position: "absolute", left: -9999, top: 0, pointerEvents: "none" }}>
            {pdfPageGroups.map((group, pageIdx) => (
              <div key={pageIdx} data-pdf-page
                style={{ width: 400, background: "#fff", padding: "24px 20px", fontFamily: "sans-serif" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "2px solid #e5e7eb", paddingBottom: 10 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 18, margin: 0, color: "#1e40af" }}>Rekap Tagihan</p>
                    <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{monthLabel(month)}</p>
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
                          <p style={{ fontSize: 11, color: "#6b7280", margin: "6px 0 0" }}>Bayar {p.paidAt} via {p.method ?? "-"}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PENGELUARAN TAB ───────────────────────────────── */}
      {activeTab === "pengeluaran" && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h2 className="text-base font-semibold">Catat Pengeluaran</h2>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
              <select className="input" value={expCategory} onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}>
                {(Object.entries(CATEGORY_LABEL) as [ExpenseCategory, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <input className="input" placeholder="Deskripsi... (mis. Isi bensin, Service mobil)" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} />
            <input className="input" type="number" placeholder="Jumlah (IDR)" value={expAmount || ""} min={1}
              onChange={(e) => setExpAmount(Math.max(0, Number(e.target.value)))} />
            <button onClick={handleAddExpense} className="btn-primary w-full">+ Tambah</button>
            {expMsg && <p className={`text-xs ${expMsg.includes("✓") ? "text-green-600" : "text-red-500"}`}>{expMsg}</p>}
          </div>

          <input className="input w-full" type="month" value={expMonth} onChange={(e) => setExpMonth(e.target.value)} />

          {(expenses ?? []).length > 0 && (
            <div className="bg-red-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-red-700">Total Pengeluaran</span>
              <span className="text-sm font-bold text-red-700">{formatRupiah((expenses ?? []).reduce((s, e) => s + e.amount, 0))}</span>
            </div>
          )}

          {(expenses ?? []).length > 0 && (() => {
            const bycat = (expenses ?? []).reduce<Record<string, number>>((acc, e) => {
              acc[e.category] = (acc[e.category] ?? 0) + e.amount; return acc;
            }, {});
            return (
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(bycat) as [ExpenseCategory, number][]).map(([cat, total]) => (
                  <div key={cat} className="bg-white border border-gray-100 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-gray-500">{CATEGORY_LABEL[cat]}</p>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">{formatRupiah(total)}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {(expenses ?? []).length === 0 && <p className="text-gray-400 text-center py-8">Belum ada pengeluaran bulan ini.</p>}
          <div className="space-y-2">
            {(expenses ?? []).sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
              <div key={e.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{CATEGORY_LABEL[e.category]}</span>
                    <span className="text-xs text-gray-400">{e.date}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 mt-1 truncate">{e.description}</p>
                  <p className="text-sm font-bold text-red-600">{formatRupiah(e.amount)}</p>
                </div>
                <button onClick={async () => { if (confirm("Hapus pengeluaran ini?")) await deleteExpense(e.id); }}
                  className="text-gray-300 hover:text-red-400 p-1.5 flex-shrink-0">🗑</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AUDIT TAB ─────────────────────────────────────── */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Audit Tahunan</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setAuditYear((y) => y - 1)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">‹</button>
                <span className="font-semibold text-gray-700">{auditYear}</span>
                <button onClick={() => setAuditYear((y) => y + 1)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">›</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 text-left">
                    <th className="font-medium pb-1">Bln</th>
                    <th className="font-medium pb-1 text-right">Masuk</th>
                    <th className="font-medium pb-1 text-right">Keluar</th>
                    <th className="font-medium pb-1 text-right">Laba</th>
                    <th className="font-medium pb-1 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {(auditData ?? []).map((r) => {
                    const has = r.realisasi || r.pengeluaran;
                    return (
                      <tr key={r.month} className="border-t border-gray-50">
                        <td className="py-1 text-gray-600">{r.month.slice(5)}</td>
                        <td className="py-1 text-right text-green-700">{r.realisasi ? formatRupiah(r.realisasi) : "–"}</td>
                        <td className="py-1 text-right text-red-600">{r.pengeluaran ? formatRupiah(r.pengeluaran) : "–"}</td>
                        <td className={`py-1 text-right font-semibold ${r.laba >= 0 ? "text-green-700" : "text-red-600"}`}>{has ? formatRupiah(r.laba) : "–"}</td>
                        <td className="py-1 text-center">{r.closed ? "🔒" : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-100 font-bold">
                    <td className="py-1 text-gray-700">Total</td>
                    <td className="py-1 text-right text-green-700">{formatRupiah(auditTotals.realisasi)}</td>
                    <td className="py-1 text-right text-red-600">{formatRupiah(auditTotals.pengeluaran)}</td>
                    <td className={`py-1 text-right ${auditTotals.laba >= 0 ? "text-green-700" : "text-red-600"}`}>{formatRupiah(auditTotals.laba)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <button onClick={exportAuditCsv}
              className="w-full py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
              ⬇ Export CSV {auditYear}
            </button>

            {piutangRows.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-amber-600 font-semibold mb-2 uppercase tracking-wide">Piutang Belum Tertagih</p>
                <div className="space-y-1">
                  {piutangRows.map(({ payment, student }) => {
                    const age = monthsBetween(payment.month, todayWIB().slice(0, 7));
                    return (
                      <div key={payment.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700 min-w-0 truncate">{student?.name ?? "(dihapus)"} · {monthLabel(payment.month)}</span>
                        <span className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-amber-700 font-semibold">{formatRupiah(payment.totalCost)}</span>
                          {age > 0 && <span className="text-red-500">{age} bln</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── INVOICE MODAL ── */}
      {invoiceTarget && (
        <InvoiceModal
          payment={invoiceTarget.payment}
          student={invoiceTarget.student}
          settings={settings}
          invoiceRef={invoiceRef}
          exporting={invoiceExporting}
          onExport={handleExportInvoicePdf}
          onClose={() => setInvoiceTarget(null)}
        />
      )}

      {/* Reminder WA AI cost modal */}
      {reminderModal && (
        <AiCostModal
          open={!!reminderModal}
          title="Reminder WA AI"
          estimatedIDR={estimatePaymentReminderCost()}
          description={`Pesan pengingat tagihan untuk ${reminderModal.studentName}`}
          onCancel={() => setReminderModal(null)}
          onConfirm={async () => {
            const m = reminderModal;
            setReminderModal(null);
            setReminderLoading(m.paymentId);
            try {
              const res = await generatePaymentReminder({
                studentName: m.studentName,
                parentName: m.parentName,
                month: m.month,
                amount: m.amount,
                tutorName: settings?.tutorProfile?.name || "Ko Lui",
              });
              if (res.message) {
                const found = students?.find((s) => s.name === m.studentName);
                const phone = found?.parentContact?.phone ? toWaNumber(found.parentContact.phone) : "";
                const url = phone
                  ? `https://wa.me/${phone}?text=${encodeURIComponent(res.message)}`
                  : `https://wa.me/?text=${encodeURIComponent(res.message)}`;
                window.open(url, "_blank", "noopener,noreferrer");
              }
            } catch (e) { setMessage("AI error: " + (e as Error).message); }
            finally { setReminderLoading(null); }
          }}
        />
      )}
    </div>
  );
}

function InvoiceModal({
  payment, student, settings, invoiceRef, exporting, onExport, onClose,
}: {
  payment: Payment;
  student: Student;
  settings: Settings;
  invoiceRef: React.RefObject<HTMLDivElement | null>;
  exporting: boolean;
  onExport: () => void;
  onClose: () => void;
}) {
  const sessions = useLiveQuery(
    () => listSessionsByStudentMonth(student.id, payment.month),
    [student.id, payment.month]
  ) ?? [];

  const bank = settings.bankAccounts;
  const tutor = settings.tutorProfile;
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  const [y, mo] = payment.month.split("-").map(Number);
  const monthStr = `${MONTH_NAMES[mo - 1]} ${y}`;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center px-0">
      <div className="w-full max-w-md bg-white rounded-t-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-bold text-base">Invoice Profesional</h3>
          <div className="flex gap-2">
            <button onClick={onExport} disabled={exporting}
              className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">
              {exporting ? "Ekspor..." : "📥 PDF"}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg w-8">✕</button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[75vh] p-4">
          <div style={{ position: "absolute", left: -9999, top: 0, pointerEvents: "none" }}>
            <InvoiceContent
              refProp={invoiceRef}
              payment={payment} student={student} sessions={sessions}
              tutor={tutor} bank={bank} monthStr={monthStr} />
          </div>
          <InvoiceContent
            payment={payment} student={student} sessions={sessions}
            tutor={tutor} bank={bank} monthStr={monthStr} />
        </div>
      </div>
    </div>
  );
}

function InvoiceContent({
  payment, student, sessions, tutor, bank, monthStr, refProp,
}: {
  payment: Payment;
  student: Student;
  sessions: import("../db/types").Session[];
  tutor: Settings["tutorProfile"];
  bank: Settings["bankAccounts"];
  monthStr: string;
  refProp?: React.RefObject<HTMLDivElement | null>;
}) {
  const totalHours = sessions.reduce((s, x) => s + x.durationHours, 0);

  return (
    <div ref={refProp} style={{ width: 360, background: "#fff", padding: "24px 20px", fontFamily: "sans-serif", fontSize: 12, color: "#111827" }}>
      <div style={{ borderBottom: "2px solid #1e40af", paddingBottom: 12, marginBottom: 14 }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: "#1e40af", margin: 0 }}>LES KO LUI</p>
        <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>{monthStr}</p>
        {tutor.name && <p style={{ fontSize: 12, fontWeight: 700, margin: "6px 0 0" }}>{tutor.name}</p>}
        {tutor.phone && <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{tutor.phone}</p>}
        {tutor.email && <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{tutor.email}</p>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, letterSpacing: 1, margin: "0 0 4px" }}>NAMA MURID</p>
        <p style={{ fontWeight: 700, margin: 0 }}>{student.name}</p>
        {student.school && <p style={{ color: "#6b7280", margin: "2px 0 0" }}>{student.school}</p>}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
        <thead>
          <tr style={{ background: "#eff6ff" }}>
            {["Tanggal","Mapel","Jam","Rincian"].map((h, i) => (
              <th key={h} style={{ padding: "6px 8px", textAlign: i > 1 ? "right" : "left", fontSize: 10, color: "#1e40af", fontWeight: 700 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sessions.length === 0 ? (
            <tr><td colSpan={4} style={{ padding: "10px 8px", color: "#9ca3af", textAlign: "center", fontSize: 11 }}>Belum ada sesi tercatat bulan ini</td></tr>
          ) : (
            [...sessions].sort((a, b) => a.date.localeCompare(b.date)).map((s, i) => (
              <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "5px 8px" }}>{s.date.slice(5).replace("-", "/")}</td>
                <td style={{ padding: "5px 8px" }}>{s.subjects.slice(0, 2).join(", ") || "—"}</td>
                <td style={{ padding: "5px 8px", textAlign: "right" }}>{s.durationHours}j</td>
                <td style={{ padding: "5px 8px", textAlign: "right" }}>{formatRupiah(s.cost)}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "2px solid #e5e7eb" }}>
            <td colSpan={2} style={{ padding: "8px 8px", fontWeight: 700 }}>Total</td>
            <td style={{ padding: "8px 8px", textAlign: "right", fontWeight: 700 }}>{totalHours}j</td>
            <td style={{ padding: "8px 8px", textAlign: "right", fontWeight: 800, color: "#1e40af", fontSize: 13 }}>{formatRupiah(payment.totalCost)}</td>
          </tr>
        </tfoot>
      </table>

      <div style={{ background: payment.status === "PAID" ? "#f0fdf4" : "#fffbeb", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
        <p style={{ fontWeight: 700, color: payment.status === "PAID" ? "#16a34a" : "#d97706", margin: 0 }}>
          Status: {payment.status === "PAID" ? "✓ Lunas" : "Menunggu Pembayaran"}
        </p>
        {payment.status === "PAID" && payment.paidAt && (
          <p style={{ color: "#6b7280", margin: "3px 0 0", fontSize: 11 }}>Dibayar {payment.paidAt} via {payment.method ?? "—"}</p>
        )}
      </div>

      {bank && (bank.bca || bank.cimb || bank.bri || bank.mandiri || bank.bsi || bank.ewallet) && (
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
          <p style={{ fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>Transfer ke:</p>
          {bank.bca     && <p style={{ margin: "2px 0" }}>🏦 BCA {bank.bca}{bank.accountName ? ` a.n. ${bank.accountName}` : ""}</p>}
          {bank.cimb    && <p style={{ margin: "2px 0" }}>🏦 CIMB {bank.cimb}{bank.accountName ? ` a.n. ${bank.accountName}` : ""}</p>}
          {bank.bri     && <p style={{ margin: "2px 0" }}>🏦 BRI {bank.bri}{bank.accountName ? ` a.n. ${bank.accountName}` : ""}</p>}
          {bank.mandiri && <p style={{ margin: "2px 0" }}>🏦 Mandiri {bank.mandiri}{bank.accountName ? ` a.n. ${bank.accountName}` : ""}</p>}
          {bank.bsi     && <p style={{ margin: "2px 0" }}>🏦 BSI {bank.bsi}{bank.accountName ? ` a.n. ${bank.accountName}` : ""}</p>}
          {bank.ewallet && <p style={{ margin: "2px 0" }}>💳 E-wallet {bank.ewallet}</p>}
        </div>
      )}

      <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 10, marginTop: 16 }}>Thank you 😇</p>
    </div>
  );
}
