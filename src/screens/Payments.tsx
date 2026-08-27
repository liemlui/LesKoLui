import Skeleton from "../components/Skeleton";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  listPayments, listStudents, getSettings,
  listExpenses, listBillableSessionsForMonth,
  listAllReports, listSessionCountBillingProgress,
} from "../db/repos";
import { todayWIB, formatRupiah, monthLabel } from "../lib/format";
import { reportStatus } from "../db/types";
import { usePinGate } from "../hooks/usePinGate";
import Breadcrumb from "../components/Breadcrumb";
import Tabs from "../components/Tabs";
import FinancePeriodPicker from "../components/FinancePeriodPicker";
import RingkasanTab from "./payments/RingkasanTab";
import TagihanTab from "./payments/TagihanTab";
import PengeluaranTab from "./payments/PengeluaranTab";
import AuditTab from "./payments/AuditTab";

type Tab = "ringkasan" | "tagihan" | "pengeluaran" | "audit";

const TAB_KEYS: Tab[] = ["ringkasan", "tagihan", "pengeluaran", "audit"];
const MONTH_QUERY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * PaymentsPage — halaman keuangan dengan 4 tab:
 * Ringkasan, Penagihan, Pengeluaran, Rekap Tahunan.
 *
 * Fitur: tutup bulan otomatis, tagihan manual, tracking pengeluaran,
 * export PDF/CSV, forecasting, WhatsApp billing, dan audit trail.
 *
 * @component
 * @route /payments
 */
export default function PaymentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const payments  = useLiveQuery(() => listPayments(), []);
  // Historical invoices must retain their student names even after a student
  // becomes inactive, so finance intentionally loads active + inactive rows.
  const students  = useLiveQuery(() => listStudents(), []);
  const settings  = useLiveQuery(() => getSettings(), []);
  const pin = usePinGate();
  const requestedStudentId = searchParams.get("studentId") ?? "";

  // Tab disinkronkan dengan URL agar bisa di-bookmark / di-share.
  const urlTab = searchParams.get("tab");
  const activeTab: Tab = TAB_KEYS.includes(urlTab as Tab) ? (urlTab as Tab) : "ringkasan";
  const [message, setMessage] = useState("");

  // Shared month for Ringkasan + Penagihan/Tutup Bulan + Pengeluaran
  const requestedMonth = searchParams.get("month");
  const month = requestedMonth && MONTH_QUERY_PATTERN.test(requestedMonth)
    ? requestedMonth
    : todayWIB().slice(0, 7);

  // ── Shared queries (loaded once for the whole page) ──
  const monthSessions = useLiveQuery(() => listBillableSessionsForMonth(month), [month]);
  const monthExpenses = useLiveQuery(() => listExpenses(month), [month]);
  const reports = useLiveQuery(() => listAllReports(), []);
  // A package may span calendar months, so this queue intentionally does not
  // depend on the month picker used by the rest of the finance dashboard.
  // Kept here only to badge the Penagihan tab; the tab queries its own copy.
  const sessionCountBillingProgress = useLiveQuery(() => listSessionCountBillingProgress(), []);

  const packageActionCount = (sessionCountBillingProgress ?? []).filter((row) => (
    row.readyBatchCount > 0
    || Boolean(row.pendingBillingPolicy && row.unbilledCount > 0 && row.unbilledCount < row.targetCount)
  )).length;
  const invoiceReportIds = new Set((payments ?? []).flatMap((payment) => payment.reportId ? [payment.reportId] : []));
  const readyReportInvoiceCount = (reports ?? []).filter((report) => (
    report.month === month
    && reportStatus(report) === "confirmed"
    && report.totalCost > 0
    && report.billingMode !== "session_count"
    && !invoiceReportIds.has(report.id)
  )).length;
  const tagihanBadge = packageActionCount + readyReportInvoiceCount;

  // ── Ringkasan cepat untuk header ──
  const monthPayments = (payments ?? []).filter((p) => p.month === month);
  const cashInMonth = (payments ?? [])
    .filter((p) => p.status === "PAID" && (p.paidAt?.slice(0, 7) ?? p.month) === month)
    .reduce((sum, p) => sum + p.totalCost, 0);
  const piutangMonth = monthPayments
    .filter((p) => p.status === "UNPAID")
    .reduce((sum, p) => sum + p.totalCost, 0);
  const expenseMonth = (monthExpenses ?? []).reduce((sum, e) => sum + e.amount, 0);

  if (!payments || !students || !settings
    || monthSessions === undefined || monthExpenses === undefined
    || reports === undefined || sessionCountBillingProgress === undefined
  ) return <Skeleton variant="card" lines={4} className="p-4" />;

  if (!settings.financialPin) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-4xl">🔐</p>
        <p className="font-bold text-lg text-gray-800">PIN Keuangan Belum Aktif</p>
        <p className="text-sm text-gray-500 text-center">Buat PIN dulu sebelum membuka data keuangan, penagihan, dan rekap tahunan.</p>
        <button
          onClick={() => navigate("/settings")}
          className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors">
          Buka Pengaturan
        </button>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-600">← Kembali</button>
      </div>
    );
  }

  if (settings.financialPin && !pin.unlocked) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-4xl">🔐</p>
        <p className="font-bold text-lg text-gray-800">Data Keuangan</p>
        <p className="text-sm text-gray-500 text-center">Masukkan PIN untuk mengakses keuangan</p>
        <input type="password" inputMode="numeric" maxLength={6} placeholder="PIN (6 digit)"
          value={pin.pinInput} onChange={(e) => pin.setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="input text-center tracking-widest text-xl w-40" autoFocus />
        {pin.pinError && <p className="text-sm text-red-500">{pin.pinError}</p>}
        <button
          onClick={async () => { await pin.attemptPin(settings.financialPin!); }}
          className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors">
          Buka
        </button>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-600">← Kembali</button>
      </div>
    );
  }

  const handleTabChange = (key: string) => {
    const next = new URLSearchParams(searchParams);
    if (key === "ringkasan") next.delete("tab");
    else next.set("tab", key);
    setSearchParams(next, { replace: true });
  };

  const handleMonthChange = (nextMonth: string) => {
    if (!MONTH_QUERY_PATTERN.test(nextMonth)) return;
    const next = new URLSearchParams(searchParams);
    next.set("month", nextMonth);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <Breadcrumb />
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Keuangan</h1>
      </div>

      {/* Konteks cepat hanya untuk tab operasional pada bulan yang dipilih. */}
      {(activeTab === "tagihan" || activeTab === "pengeluaran") && (
        <div className="space-y-2" aria-label={`Ringkasan keuangan ${monthLabel(month)}`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Ringkasan {monthLabel(month)}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-green-100 bg-green-50/60 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600">Kas diterima</p>
              <p className="mt-0.5 text-sm font-bold text-green-700">{formatRupiah(cashInMonth)}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">Belum dibayar</p>
              <p className="mt-0.5 text-sm font-bold text-amber-700">{formatRupiah(piutangMonth)}</p>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50/60 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-red-600">Pengeluaran</p>
              <p className="mt-0.5 text-sm font-bold text-red-700">{formatRupiah(expenseMonth)}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab !== "audit" && (
        <FinancePeriodPicker month={month} onChange={handleMonthChange} />
      )}

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: "ringkasan", label: "Ringkasan", compactLabel: "Ringkas" },
          { key: "tagihan", label: "Penagihan", compactLabel: "Tagih", count: tagihanBadge },
          { key: "pengeluaran", label: "Pengeluaran", compactLabel: "Keluar" },
          { key: "audit", label: "Rekap Tahunan", compactLabel: "Rekap" },
        ]}
        active={activeTab}
        onChange={handleTabChange}
        fullWidth
      />

      {message && (
        <div
          role={message.startsWith("Gagal") ? "alert" : "status"}
          aria-live={message.startsWith("Gagal") ? "assertive" : "polite"}
          onClick={() => setMessage("")}
          className={`p-3 rounded-lg text-sm cursor-pointer ${message.includes("✓") ? "bg-green-50 text-green-700" : message.startsWith("Gagal") ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"}`}>
          {message}
        </div>
      )}

      {/* Tab components mount on demand so each tab's useLiveQuery runs lazily. */}
      {activeTab === "ringkasan" && (
        <RingkasanTab
          month={month}
          payments={payments}
          students={students}
          settings={settings}
          reports={reports}
          monthSessions={monthSessions}
          monthExpenses={monthExpenses}
          sessionCountBillingProgress={sessionCountBillingProgress}
          setMessage={setMessage}
        />
      )}
      {activeTab === "tagihan" && (
        <TagihanTab
          month={month}
          setMonth={handleMonthChange}
          payments={payments}
          students={students}
          settings={settings}
          reports={reports}
          monthSessions={monthSessions}
          monthExpenses={monthExpenses}
          setMessage={setMessage}
          navigate={navigate}
          requestedStudentId={requestedStudentId}
        />
      )}
      {activeTab === "pengeluaran" && (
        <PengeluaranTab
          month={month}
          monthExpenses={monthExpenses}
          setMessage={setMessage}
        />
      )}
      {activeTab === "audit" && (
        <AuditTab
          payments={payments}
          students={students}
        />
      )}
    </div>
  );
}
