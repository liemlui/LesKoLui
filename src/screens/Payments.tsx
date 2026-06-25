import { useState, useMemo, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import {
  listPayments, listStudents, getPayment, upsertPayment, getSettings,
  createExpense, listExpenses, deleteExpense,
  listSessionsForMonth, listSessionsByStudentMonth, listAllUpcomingScheduled,
  getMonthlyIncomeVsExpense,
} from "../db/repos";
import type { ExpenseCategory } from "../db/repos";
import type { Payment, Student, Settings } from "../db/types";
import { formatRupiah, todayWIB } from "../lib/format";
import { verifyPin } from "../lib/crypto";
import { getPinLockoutDelay, recordPinFailure, resetPinLockout } from "../lib/pinLockout";
import InvoiceCard from "../components/InvoiceCard";
import PaginationControls from "../components/PaginationControls";
import { clampPage, paginateItems } from "../lib/pagination";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { generatePaymentReminder, estimatePaymentReminderCost } from "../lib/aiClient";
import { AiCostModal } from "../components/AiCostModal";

type Tab = "tagihan" | "pengeluaran" | "dashboard";

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  transport: "🚗 Transport",
  buku: "📚 Buku",
  alat: "🛠 Alat",
  platform: "💻 Platform",
  lainnya: "🗂 Lainnya",
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

export default function PaymentsPage() {
  const navigate = useNavigate();
  const payments  = useLiveQuery(() => listPayments(), []);
  const students  = useLiveQuery(() => listStudents(true), []);
  const settings  = useLiveQuery(() => getSettings(), []);
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("tagihan");

  // Tagihan state
  const [filterMonth, setFilterMonth] = useState(() => todayWIB().slice(0, 7));
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [totalCost, setTotalCost] = useState(0);
  const [message, setMessage] = useState("");
  const [summaryPage, setSummaryPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
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

  // Dashboard
  const [dashMonth, setDashMonth] = useState(() => todayWIB().slice(0, 7));
  const chartData = useLiveQuery(() => getMonthlyIncomeVsExpense(getLast12Months()), []);
  const dashSessions   = useLiveQuery(() => listSessionsForMonth(dashMonth), [dashMonth]);
  const nextMonthStr = useMemo(() => {
    const [y, m] = dashMonth.split("-").map(Number);
    const nm = new Date(y, m, 1);
    return `${nm.getFullYear()}-${String(nm.getMonth() + 1).padStart(2, "0")}`;
  }, [dashMonth]);
  const nextSessions = useLiveQuery(
    () => listAllUpcomingScheduled(nextMonthStr + "-01"),
    [nextMonthStr]
  );
  const dashExpenses = useLiveQuery(() => listExpenses(dashMonth), [dashMonth]);

  const ITEMS_PER_PDF_PAGE = 5;

  const handleExportCsv = () => {
    const rows = [
      ["Murid", "Bulan", "Total (IDR)", "Status", "Bayar Tgl", "Metode"],
      ...filtered.map((p) => [
        studentMap.get(p.studentId)?.name ?? "(dihapus)",
        p.month,
        String(p.totalCost),
        p.status === "PAID" ? "Lunas" : "Belum Bayar",
        p.paidAt ?? "",
        p.method ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `keuangan-${filterMonth || "semua"}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
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

  const handleCreatePayment = async () => {
    if (!selectedStudentId || !selectedMonth || totalCost <= 0) {
      setMessage("Lengkapi semua data!"); return;
    }
    const existing = await getPayment(selectedStudentId, selectedMonth);
    if (existing) { setMessage("Tagihan untuk murid & bulan ini sudah ada!"); return; }
    await upsertPayment({ studentId: selectedStudentId, month: selectedMonth, totalCost, status: "UNPAID" });
    setMessage("Tagihan baru dibuat ✓");
    setTotalCost(0);
  };

  const handleMarkPaid = async (studentId: string, month: string) => {
    const p = await getPayment(studentId, month);
    if (!p) return;
    const method = prompt("Metode pembayaran (transfer/tunai/dll):") || "transfer";
    await upsertPayment({ ...p, status: "PAID", paidAt: todayWIB(), method });
    setMessage(`Pembayaran ${studentMap.get(studentId)?.name} ditandai lunas ✓`);
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoiceTarget.student.name.replace(/\s+/g, "-")}-${invoiceTarget.payment.month}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 200);
    } catch (e) { setMessage("Gagal ekspor: " + (e as Error).message); }
    finally { setInvoiceExporting(false); }
  };

  const handleAnnualCsv = async (year: number) => {
    const months = Array.from({ length: 12 }, (_, i) =>
      `${year}-${String(i + 1).padStart(2, "0")}`
    );
    const data = await getMonthlyIncomeVsExpense(months);
    const studentList = students ?? [];
    const rows: string[][] = [
      ["Bulan", "Pendapatan", "Pengeluaran", "Net", "Sesi"]
    ];
    for (const d of data) {
      const sessions = await listSessionsForMonth(d.month);
      rows.push([
        d.month,
        String(d.income),
        String(d.expense),
        String(d.net),
        String(sessions.length),
      ]);
    }
    // Per-student breakdown
    rows.push([], ["=== Per Murid ==="], ["Murid", ...months]);
    for (const s of studentList) {
      const sessPerMonth = await Promise.all(
        months.map((m) => listSessionsByStudentMonth(s.id, m))
      );
      rows.push([s.name, ...sessPerMonth.map((ss) => String(ss.reduce((sum, x) => sum + x.cost, 0)))]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `laporan-tahunan-${year}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 200);
  };

  const handleAddExpense = async () => {
    if (!expDate || !expDesc || expAmount <= 0) { setExpMsg("Lengkapi semua data!"); return; }
    await createExpense({ date: expDate, category: expCategory, description: expDesc, amount: expAmount });
    setExpMsg("Pengeluaran ditambahkan ✓");
    setExpDesc(""); setExpAmount(0);
  };

  if (!payments || !students || !settings) return <div className="p-4 text-gray-500">Memuat...</div>;

  if (settings.financialPin && !unlocked) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-4xl">🔐</p>
        <p className="font-bold text-lg text-gray-800">Data Keuangan</p>
        <p className="text-sm text-gray-400 text-center">Masukkan PIN untuk mengakses rekap keuangan</p>
        <input type="password" inputMode="numeric" maxLength={6} placeholder="PIN (6 digit)"
          value={pinInput} onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinError(""); }}
          className="input text-center tracking-widest text-xl w-40" autoFocus />
        {pinError && <p className="text-sm text-red-500">{pinError}</p>}
        <button
          onClick={async () => {
            const delay = getPinLockoutDelay();
            if (delay > 0) { setPinError(`Tunggu ${Math.ceil(delay / 1000)} detik.`); return; }
            const ok = await verifyPin(pinInput, settings.financialPin!);
            if (!ok) { recordPinFailure(); setPinError("PIN salah."); return; }
            resetPinLockout(); setUnlocked(true); setPinInput("");
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
  const safeSummaryPage  = clampPage(summaryPage, sortedMonthTotals.length);
  const safePaymentPage  = clampPage(paymentPage, filtered.length);
  const paginatedMonthTotals = paginateItems(sortedMonthTotals, safeSummaryPage);
  const paginatedPayments    = paginateItems(filtered, safePaymentPage);
  const pdfPageGroups: typeof filtered[] = [];
  for (let i = 0; i < filtered.length; i += ITEMS_PER_PDF_PAGE)
    pdfPageGroups.push(filtered.slice(i, i + ITEMS_PER_PDF_PAGE));

  // Dashboard computations
  const dashIncome   = (dashSessions ?? []).reduce((s, sess) => s + sess.cost, 0);
  const dashExpTotal = (dashExpenses ?? []).reduce((s, e) => s + e.amount, 0);
  const dashNet      = dashIncome - dashExpTotal;
  const dashHours    = (dashSessions ?? []).reduce((s, sess) => s + sess.durationHours, 0);
  const revenueByStudent = (dashSessions ?? []).reduce<Map<string, number>>((m, sess) => {
    m.set(sess.studentId, (m.get(sess.studentId) ?? 0) + sess.cost);
    return m;
  }, new Map());
  const nextMonthPred = (nextSessions ?? [])
    .filter((s) => s.date.startsWith(nextMonthStr))
    .reduce((sum, s) => sum + s.cost, 0);

  // Chart bars
  const chartMax = Math.max(...(chartData ?? []).map((d) => Math.max(d.income, d.expense, 1)));

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
        {(["tagihan", "pengeluaran", "dashboard"] as Tab[]).map((tab) => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg capitalize transition-colors ${
              activeTab === tab ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
            }`}>
            {tab === "tagihan" ? "Tagihan" : tab === "pengeluaran" ? "Pengeluaran" : "Dashboard"}
          </button>
        ))}
      </div>

      {/* ── TAGIHAN TAB ───────────────────────────────────── */}
      {activeTab === "tagihan" && (
        <div className="space-y-4">
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
              min={1} max={100000000}
              onChange={(e) => setTotalCost(Math.min(100_000_000, Math.max(0, Number(e.target.value))))} />
            <button onClick={handleCreatePayment} className="btn-primary w-full">Buat Tagihan</button>
          </div>

          {/* Filter */}
          <input className="input w-full" type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />

          {/* Summary chips */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
            <p className="text-sm font-semibold text-gray-500">Rekap per Bulan</p>
            <div className="flex flex-wrap gap-2">
              {paginatedMonthTotals.map(([m, total]) => (
                <button key={m}
                  className={`px-3 py-1 rounded-full text-sm border ${filterMonth === m ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}
                  onClick={() => setFilterMonth(m)}>
                  {m} — {formatRupiah(total)}
                </button>
              ))}
            </div>
            <PaginationControls page={safeSummaryPage} total={sortedMonthTotals.length} onPageChange={setSummaryPage} label="bulan" />
          </div>

          {filtered.length === 0 && <p className="text-gray-400 text-center py-8">Belum ada tagihan.</p>}

          <div className="space-y-3">
            {paginatedPayments.map((p) => {
              const student = studentMap.get(p.studentId);
              const sName = student?.name ?? "(dihapus)";
              return (
                <div key={p.id}>
                  <InvoiceCard payment={p} studentName={sName}
                    onMarkPaid={p.status === "UNPAID" ? () => handleMarkPaid(p.studentId, p.month) : undefined} />
                  <button
                    onClick={() => student && setInvoiceTarget({ payment: p, student })}
                    className="mt-1 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-xl transition-colors">
                    📄 Invoice Profesional
                  </button>
                  {p.status === "UNPAID" && settings?.ai?.enabled && settings.ai.apiKey && (
                    <button
                      disabled={reminderLoading === p.id}
                      onClick={() => setReminderModal({ paymentId: p.id!, studentName: sName, parentName: student?.parentContact?.name, month: p.month, amount: p.totalCost })}
                      className="mt-1.5 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-2 rounded-xl transition-colors disabled:opacity-50">
                      {reminderLoading === p.id ? "⏳ Buat Reminder..." : "✨ Reminder WA AI"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <PaginationControls page={safePaymentPage} total={filtered.length} onPageChange={setPaymentPage} label="tagihan" />

          {/* Hidden PDF pages */}
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
      )}

      {/* ── PENGELUARAN TAB ───────────────────────────────── */}
      {activeTab === "pengeluaran" && (
        <div className="space-y-4">
          {/* Add expense form */}
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
            <input className="input" placeholder="Deskripsi..." value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)} />
            <input className="input" type="number" placeholder="Jumlah (IDR)"
              value={expAmount || ""} min={1}
              onChange={(e) => setExpAmount(Math.max(0, Number(e.target.value)))} />
            <button onClick={handleAddExpense} className="btn-primary w-full">+ Tambah</button>
            {expMsg && (
              <p className={`text-xs ${expMsg.includes("✓") ? "text-green-600" : "text-red-500"}`}>{expMsg}</p>
            )}
          </div>

          {/* Month filter */}
          <div className="flex items-center gap-2">
            <input className="input flex-1" type="month" value={expMonth}
              onChange={(e) => setExpMonth(e.target.value)} />
          </div>

          {/* Total */}
          {(expenses ?? []).length > 0 && (
            <div className="bg-red-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-red-700">Total Pengeluaran</span>
              <span className="text-sm font-bold text-red-700">
                {formatRupiah((expenses ?? []).reduce((s, e) => s + e.amount, 0))}
              </span>
            </div>
          )}

          {/* Category summary */}
          {(expenses ?? []).length > 0 && (() => {
            const bycat = (expenses ?? []).reduce<Record<string, number>>((acc, e) => {
              acc[e.category] = (acc[e.category] ?? 0) + e.amount;
              return acc;
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

          {/* Expense list */}
          {(expenses ?? []).length === 0 && (
            <p className="text-gray-400 text-center py-8">Belum ada pengeluaran bulan ini.</p>
          )}
          <div className="space-y-2">
            {(expenses ?? []).sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
              <div key={e.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {CATEGORY_LABEL[e.category]}
                    </span>
                    <span className="text-xs text-gray-400">{e.date}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 mt-1 truncate">{e.description}</p>
                  <p className="text-sm font-bold text-red-600">{formatRupiah(e.amount)}</p>
                </div>
                <button
                  onClick={async () => { if (confirm("Hapus pengeluaran ini?")) await deleteExpense(e.id); }}
                  className="text-gray-300 hover:text-red-400 p-1.5 flex-shrink-0">
                  🗑
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DASHBOARD TAB ─────────────────────────────────── */}
      {activeTab === "dashboard" && (
        <div className="space-y-4">
          {/* Month selector */}
          <input className="input w-full" type="month" value={dashMonth}
            onChange={(e) => setDashMonth(e.target.value)} />

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-2xl p-4">
              <p className="text-xs text-blue-400 font-medium">Pendapatan</p>
              <p className="text-lg font-bold text-blue-700 mt-1">{formatRupiah(dashIncome)}</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-4">
              <p className="text-xs text-red-400 font-medium">Pengeluaran</p>
              <p className="text-lg font-bold text-red-600 mt-1">{formatRupiah(dashExpTotal)}</p>
            </div>
            <div className={`rounded-2xl p-4 ${dashNet >= 0 ? "bg-green-50" : "bg-orange-50"}`}>
              <p className={`text-xs font-medium ${dashNet >= 0 ? "text-green-400" : "text-orange-400"}`}>Net Profit</p>
              <p className={`text-lg font-bold mt-1 ${dashNet >= 0 ? "text-green-700" : "text-orange-600"}`}>
                {dashNet >= 0 ? "" : "-"}{formatRupiah(Math.abs(dashNet))}
              </p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-4">
              <p className="text-xs text-purple-400 font-medium">Jam Mengajar</p>
              <p className="text-lg font-bold text-purple-700 mt-1">{dashHours} jam</p>
            </div>
          </div>

          {/* Next-month prediction */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <p className="text-xs font-semibold text-amber-600">Prediksi Bulan Depan ({nextMonthStr})</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{formatRupiah(nextMonthPred)}</p>
            <p className="text-xs text-amber-500 mt-0.5">
              {(nextSessions ?? []).filter(s => s.date.startsWith(nextMonthStr)).length} sesi terjadwal × tarif
            </p>
          </div>

          {/* Revenue per student */}
          {revenueByStudent.size > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-500">Pendapatan per Murid</p>
              {Array.from(revenueByStudent.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([sid, rev]) => {
                  const pct = dashIncome > 0 ? Math.round((rev / dashIncome) * 100) : 0;
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

          {/* Annual report download */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-500">Laporan Tahunan (CSV)</p>
            <div className="flex gap-2 flex-wrap">
              {[new Date().getFullYear(), new Date().getFullYear() - 1].map((yr) => (
                <button key={yr}
                  onClick={() => handleAnnualCsv(yr)}
                  className="flex-1 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold border border-indigo-200 hover:bg-indigo-100 transition-colors">
                  📅 {yr}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">Income, pengeluaran, net per bulan + per murid</p>
          </div>

          {/* 12-month income vs expense bar chart */}
          {(chartData ?? []).length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-500">Pendapatan vs Pengeluaran (12 Bln)</p>
              <div className="overflow-x-auto">
                <svg width={Math.max(300, (chartData ?? []).length * 28)} height={120} className="block">
                  {(chartData ?? []).map((d, i) => {
                    const barW = 10;
                    const gap = 28;
                    const x = i * gap + 4;
                    const incH = chartMax > 0 ? Math.round((d.income / chartMax) * 90) : 0;
                    const expH = chartMax > 0 ? Math.round((d.expense / chartMax) * 90) : 0;
                    return (
                      <g key={d.month}>
                        <rect x={x} y={100 - incH} width={barW} height={incH} fill="#3b82f6" rx={2} opacity={0.85} />
                        <rect x={x + barW + 1} y={100 - expH} width={barW} height={expH} fill="#ef4444" rx={2} opacity={0.75} />
                        <text x={x + barW} y={116} fontSize={7} textAnchor="middle" fill="#9ca3af">
                          {d.month.slice(5)}
                        </text>
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
                const found = students?.find(s => s.name === m.studentName);
                const phone = found?.parentContact?.phone?.replace(/^0/, "62").replace(/[^0-9]/g, "") ?? "";
                const url = phone
                  ? `https://wa.me/${phone}?text=${encodeURIComponent(res.message)}`
                  : `https://wa.me/?text=${encodeURIComponent(res.message)}`;
                window.open(url, "_blank");
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
          {/* Off-screen capture target */}
          <div style={{ position: "absolute", left: -9999, top: 0, pointerEvents: "none" }}>
            <InvoiceContent
              refProp={invoiceRef}
              payment={payment} student={student} sessions={sessions}
              tutor={tutor} bank={bank} monthStr={monthStr} />
          </div>
          {/* Visible preview */}
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
        <p style={{ fontSize: 18, fontWeight: 800, color: "#1e40af", margin: 0 }}>INVOICE LES PRIVAT</p>
        <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>{monthStr}</p>
        {tutor.name && <p style={{ fontSize: 12, fontWeight: 700, margin: "6px 0 0" }}>{tutor.name}</p>}
        {tutor.phone && <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{tutor.phone}</p>}
        {tutor.email && <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{tutor.email}</p>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, letterSpacing: 1, margin: "0 0 4px" }}>TAGIHAN UNTUK</p>
        <p style={{ fontWeight: 700, margin: 0 }}>{student.name}</p>
        {student.parentContact.name && <p style={{ color: "#6b7280", margin: "2px 0 0" }}>Wali: {student.parentContact.name}</p>}
        {student.school && <p style={{ color: "#6b7280", margin: "2px 0 0" }}>{student.school}</p>}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
        <thead>
          <tr style={{ background: "#eff6ff" }}>
            {["Tanggal","Mapel","Jam","Biaya"].map((h, i) => (
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

      <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 10, marginTop: 16 }}>Terima kasih atas kepercayaannya 🙏</p>
    </div>
  );
}
