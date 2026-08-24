import Skeleton from "../components/Skeleton";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  listPayments, listStudents, getSettings,
  listExpenses, listBillableSessionsForMonth,
  listAllReports, listSessionCountBillingProgress,
} from "../db/repos";
import { todayWIB } from "../lib/format";
import { usePinGate } from "../hooks/usePinGate";
import Breadcrumb from "../components/Breadcrumb";
import Tabs from "../components/Tabs";
import FinancePeriodPicker from "../components/FinancePeriodPicker";
import RingkasanTab from "./payments/RingkasanTab";
import TagihanTab from "./payments/TagihanTab";
import PengeluaranTab from "./payments/PengeluaranTab";
import AuditTab from "./payments/AuditTab";

type Tab = "ringkasan" | "tagihan" | "pengeluaran" | "audit";

/**
 * PaymentsPage — halaman keuangan dengan 4 tab:
 * Ringkasan, Tagihan, Pengeluaran, Audit.
 *
 * Fitur: tutup bulan otomatis, tagihan manual, tracking pengeluaran,
 * export PDF/CSV, forecasting, WhatsApp billing, dan audit trail.
 *
 * @component
 * @route /payments
 */
export default function PaymentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const payments  = useLiveQuery(() => listPayments(), []);
  // Historical invoices must retain their student names even after a student
  // becomes inactive, so finance intentionally loads active + inactive rows.
  const students  = useLiveQuery(() => listStudents(), []);
  const settings  = useLiveQuery(() => getSettings(), []);
  const pin = usePinGate();
  const requestedStudentId = searchParams.get("studentId") ?? "";

  const [activeTab, setActiveTab] = useState<Tab>(() =>
    searchParams.get("tab") === "tagihan" ? "tagihan" : "ringkasan"
  );
  const [message, setMessage] = useState("");

  // Shared month for Ringkasan + Tagihan/Tutup Bulan + Pengeluaran
  const [month, setMonth] = useState(() => todayWIB().slice(0, 7));

  // ── Shared queries (loaded once for the whole page) ──
  const monthSessions = useLiveQuery(() => listBillableSessionsForMonth(month), [month]);
  const monthExpenses = useLiveQuery(() => listExpenses(month), [month]);
  const reports = useLiveQuery(() => listAllReports(), []);
  // A package may span calendar months, so this queue intentionally does not
  // depend on the month picker used by the rest of the finance dashboard.
  // Kept here only to badge the Tagihan tab; the tab queries its own copy.
  const sessionCountBillingProgress = useLiveQuery(() => listSessionCountBillingProgress(), []);

  const tagihanBadge = (sessionCountBillingProgress ?? []).filter((row) => (
    row.readyBatchCount > 0
    || Boolean(row.pendingBillingPolicy && row.unbilledCount > 0 && row.unbilledCount < row.targetCount)
  )).length;

  if (!payments || !students || !settings
    || monthSessions === undefined || monthExpenses === undefined
    || reports === undefined || sessionCountBillingProgress === undefined
  ) return <Skeleton variant="card" lines={4} className="p-4" />;

  if (!settings.financialPin) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-4xl">🔐</p>
        <p className="font-bold text-lg text-gray-800">PIN Keuangan Belum Aktif</p>
        <p className="text-sm text-gray-500 text-center">Buat PIN dulu sebelum membuka data keuangan, tagihan, dan audit.</p>
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

  return (
    <div className="p-4 pb-24 space-y-4">
      <Breadcrumb />
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Keuangan</h1>
      </div>

      {activeTab !== "audit" && (
        <FinancePeriodPicker month={month} onChange={setMonth} />
      )}

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: "ringkasan", label: "Ringkasan", compactLabel: "Ringkas" },
          { key: "tagihan", label: "Tagihan", compactLabel: "Tagih", count: tagihanBadge },
          { key: "pengeluaran", label: "Pengeluaran", compactLabel: "Keluar" },
          { key: "audit", label: "Audit" },
        ]}
        active={activeTab}
        onChange={(k) => setActiveTab(k as Tab)}
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
          setMessage={setMessage}
        />
      )}
      {activeTab === "tagihan" && (
        <TagihanTab
          month={month}
          setMonth={setMonth}
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
