import Skeleton from "../components/Skeleton";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  listPayments, listStudents, getSettings,
  listExpenses, listBillableSessionsForMonth,
  listAllReports, listSessionCountBillingProgress,
} from "../db/repos";
import { todayWIB, monthLabel } from "../lib/format";
import { reportStatus } from "../db/types";
import { usePinGate } from "../hooks/usePinGate";
import Breadcrumb from "../components/Breadcrumb";
import Tabs from "../components/Tabs";
import FinancePeriodPicker from "../components/FinancePeriodPicker";
import RingkasanTab from "./payments/RingkasanTab";
import TagihanTab from "./payments/TagihanTab";
import PengeluaranTab from "./payments/PengeluaranTab";
import RekapTab from "./payments/RekapTab";

type Tab = "ringkasan" | "tagihan" | "pengeluaran" | "rekap";

const TAB_KEYS: Tab[] = ["ringkasan", "tagihan", "pengeluaran", "rekap"];
const MONTH_QUERY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Legacy deep links used `tab=audit` for the yearly recap. */
const LEGACY_TAB_ALIAS: Record<string, Tab> = { audit: "rekap" };

/**
 * One scope sentence per tab. The finance module mixes a single selected month
 * (Ringkasan, Pengeluaran) with genuinely cross-period lists (Tagihan), so every
 * tab states its own coverage instead of leaving the user to infer it.
 */
const TAB_SCOPE: Record<Tab, string> = {
  ringkasan: "Angka untuk bulan terpilih.",
  tagihan: "Semua periode — tidak mengikuti bulan terpilih.",
  pengeluaran: "Hanya transaksi keluar pada bulan terpilih.",
  rekap: "Januari–Desember pada tahun terpilih (di dalam tab).",
};

/**
 * PaymentsPage — halaman keuangan dengan 4 area kerja:
 * Ringkasan (bulan terpilih), Tagihan (lintas periode),
 * Pengeluaran (bulan terpilih), dan Rekap & Ekspor (per tahun).
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
  const urlTab = searchParams.get("tab") ?? "";
  const resolvedTab = LEGACY_TAB_ALIAS[urlTab] ?? (urlTab as Tab);
  const activeTab: Tab = TAB_KEYS.includes(resolvedTab) ? resolvedTab : "ringkasan";
  const [message, setMessage] = useState("");

  // Satu bulan terpilih, dipakai bersama oleh Ringkasan dan Pengeluaran.
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
    reportStatus(report) === "confirmed"
    && report.totalCost > 0
    && report.billingMode !== "session_count"
    && !invoiceReportIds.has(report.id)
  )).length;
  const tagihanBadge = packageActionCount + readyReportInvoiceCount;

  // Uang yang benar-benar masuk bulan ini (mengikuti tanggal pembayaran) —
  // dipakai Pengeluaran untuk menghitung sisa kas, bukan untuk mengulang
  // kartu ringkasan yang sudah ada di tab Ringkasan.
  const cashInMonth = (payments ?? [])
    .filter((p) => p.status === "PAID" && (p.paidAt?.slice(0, 7) ?? p.month) === month)
    .reduce((sum, p) => sum + p.totalCost, 0);

  // ── Ringkasan cepat untuk header ──
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
    <div className="pb-24">
      {/* Header lengket: periode dan area kerja selalu terlihat bersama, sehingga
          pindah tab tidak pernah menyembunyikan konteks waktu. */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <Breadcrumb />
        <div className="space-y-2 px-4 pb-2 pt-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h1 className="text-xl font-bold">Keuangan</h1>
            <p aria-live="polite" className="text-sm font-semibold text-slate-700">
              {monthLabel(month)}
            </p>
          </div>
          <FinancePeriodPicker month={month} onChange={handleMonthChange} />
          <p className="text-xs leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-600">Cakupan tab ini:</span> {TAB_SCOPE[activeTab]}
          </p>
        </div>
        <Tabs
          tabs={[
            // Label sengaja pendek: empat tab harus muat dalam satu baris tanpa terpotong.
            { key: "ringkasan", label: "Ringkasan", compactLabel: "Ringkas" },
            { key: "tagihan", label: "Tagihan", compactLabel: "Tagihan", count: tagihanBadge },
            { key: "pengeluaran", label: "Pengeluaran", compactLabel: "Keluar" },
            { key: "rekap", label: "Rekap", compactLabel: "Rekap" },
          ]}
          active={activeTab}
          onChange={handleTabChange}
          fullWidth
        />
      </div>

      <div className="space-y-4 p-4">
        {message && (
          <div
            role={message.startsWith("Gagal") ? "alert" : "status"}
            aria-live={message.startsWith("Gagal") ? "assertive" : "polite"}
            className={`flex items-start gap-2 rounded-lg p-3 text-sm ${message.includes("✓") ? "bg-green-50 text-green-700" : message.startsWith("Gagal") ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"}`}>
            <span className="flex-1">{message}</span>
            <button
              type="button"
              aria-label="Tutup pesan"
              onClick={() => setMessage("")}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
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
            payments={payments}
            students={students}
            settings={settings}
            reports={reports}
            setMessage={setMessage}
            navigate={navigate}
            requestedStudentId={requestedStudentId}
          />
        )}
        {activeTab === "pengeluaran" && (
          <PengeluaranTab
            month={month}
            monthExpenses={monthExpenses}
            cashInMonth={cashInMonth}
            setMessage={setMessage}
            students={students ?? []}
          />
        )}
        {activeTab === "rekap" && (
          <RekapTab
            payments={payments}
            students={students}
          />
        )}
      </div>
    </div>
  );
}
