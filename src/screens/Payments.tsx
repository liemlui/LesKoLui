import Skeleton from "../components/Skeleton";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  listPayments, listStudents,
  listExpenses, listBillableSessionsForMonth,
  listAllReports, listSessionCountBillingProgress,
} from "../db/repos";
import { todayWIB, monthLabel } from "../lib/format";
import { reportStatus } from "../db/types";
import { useMoneyVisible } from "../hooks/useMoneyVisible";
import { useSettingsQuery } from "../hooks/useSettingsQuery";
import SettingsLoadError from "../components/SettingsLoadError";
import { LockIcon } from "../components/icons";
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
  const settingsQuery = useSettingsQuery();
  const settings = settingsQuery.settings;
  // G2-04 (K3.4): gerbang layar ini tetap penuh — lapisan kedua — tetapi status
  // buka-kuncinya sekarang BERBAGI dengan layar lain lewat `useMoneyVisible`.
  const money = useMoneyVisible();
  const [pinInput, setPinInput] = useState("");
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
  // G2-10: kegagalan baca pengaturan diperiksa SEBELUM keadaan "PIN belum aktif" —
  // kalau tidak, layar ini akan salah mengira PIN-nya kosong padahal datanya gagal dibaca.
  if (settingsQuery.error || settingsQuery.timedOut) {
    return <SettingsLoadError screen="Keuangan" busy={settingsQuery.retrying} onRetry={settingsQuery.retry} />;
  }
  if (!payments || !students || !settings
    || monthSessions === undefined || monthExpenses === undefined
    || reports === undefined || sessionCountBillingProgress === undefined
  ) return <Skeleton variant="card" lines={4} className="p-4" />;

  if (!settings.financialPin) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-4xl">🔐</p>
        <p className="font-bold text-lg text-[var(--ink-strong)]">PIN Keuangan Belum Aktif</p>
        <p className="text-sm text-[var(--ink-muted)] text-center">Buat PIN dulu sebelum membuka data keuangan, penagihan, dan rekap tahunan.</p>
        <button
          onClick={() => navigate("/settings")}
          className="px-8 py-3 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] font-bold text-sm hover:bg-[var(--brand-solid)] transition-colors">
          Buka Pengaturan
        </button>
        <button onClick={() => navigate(-1)} className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink-muted)]">← Kembali</button>
      </div>
    );
  }

  if (!money.visible) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-4xl">🔐</p>
        <p className="font-bold text-lg text-[var(--ink-strong)]">Data Keuangan</p>
        <p className="text-sm text-[var(--ink-muted)] text-center">Masukkan PIN Keuangan. Sekali dibuka, angka uang juga terbuka di layar lain sampai dikunci lagi.</p>
        <input type="password" inputMode="numeric" maxLength={6} placeholder="PIN (6 digit)" aria-label="PIN Keuangan (6 digit)"
          value={pinInput} onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6)); money.clearError(); }}
          onKeyDown={(e) => { if (e.key === "Enter" && pinInput.length === 6) void money.unlock(pinInput); }}
          className="input text-center tracking-widest text-xl w-40" autoFocus />
        {money.error && <p role="alert" className="text-sm text-[var(--ink-danger)]">{money.error}</p>}
        <button
          onClick={async () => { if (await money.unlock(pinInput)) setPinInput(""); }}
          disabled={pinInput.length !== 6}
          className="px-8 py-3 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] font-bold text-sm hover:bg-[var(--brand-solid)] transition-colors disabled:opacity-40">
          Buka
        </button>
        <button onClick={() => navigate(-1)} className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink-muted)]">← Kembali</button>
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
      <div className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface-strong)]/95 backdrop-blur">
        <Breadcrumb />
        <div className="space-y-2 px-4 pb-2 pt-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h1 className="text-xl font-bold">Keuangan</h1>
            <div className="flex items-center gap-[var(--space-2)]">
              <p aria-live="polite" className="text-sm font-semibold text-[var(--ink-strong)]">
                {monthLabel(month)}
              </p>
              {/* Kontrak K3.4: tombol Kunci manual selalu tersedia. */}
              <button
                type="button"
                onClick={money.lock}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-[var(--radius-card)] bg-[var(--surface-soft)] px-[var(--space-3)] text-caption font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)]"
              >
                <LockIcon size={13} />
                Kunci
              </button>
            </div>
          </div>
          <FinancePeriodPicker month={month} onChange={handleMonthChange} />
          <p className="text-xs leading-relaxed text-[var(--ink-muted)]">
            <span className="font-semibold text-[var(--ink-muted)]">Cakupan tab ini:</span> {TAB_SCOPE[activeTab]}
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
          idPrefix="payments"
          fullWidth
        />
      </div>

      <div className="space-y-4 p-4">
        {message && (
          <div
            role={message.startsWith("Gagal") ? "alert" : "status"}
            aria-live={message.startsWith("Gagal") ? "assertive" : "polite"}
            className={`flex items-start gap-2 rounded-lg p-3 text-sm ${message.includes("✓") ? "bg-[var(--bg-success)] text-[var(--ink-success)]" : message.startsWith("Gagal") ? "bg-[var(--bg-danger)] text-[var(--ink-danger)]" : "bg-[var(--brand-tint)] text-[var(--ink-brand)]"}`}>
            <span className="flex-1">{message}</span>
            <button
              type="button"
              aria-label="Tutup pesan"
              onClick={() => setMessage("")}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:bg-[var(--scrim)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-brand)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Audit L-06: panel per tab SELALU ada di DOM supaya `aria-controls`
            setiap tab menunjuk elemen nyata; komponen tab hanya di-mount saat
            aktif agar useLiveQuery-nya tetap lazy. */}
        <div role="tabpanel" id="payments-panel-ringkasan" aria-labelledby="payments-tab-ringkasan" hidden={activeTab !== "ringkasan"}>
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
        </div>

        <div role="tabpanel" id="payments-panel-tagihan" aria-labelledby="payments-tab-tagihan" hidden={activeTab !== "tagihan"}>
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
        </div>

        <div role="tabpanel" id="payments-panel-pengeluaran" aria-labelledby="payments-tab-pengeluaran" hidden={activeTab !== "pengeluaran"}>
        {activeTab === "pengeluaran" && (
          <PengeluaranTab
            month={month}
            monthExpenses={monthExpenses}
            cashInMonth={cashInMonth}
            setMessage={setMessage}
            students={students ?? []}
          />
        )}
        </div>

        <div role="tabpanel" id="payments-panel-rekap" aria-labelledby="payments-tab-rekap" hidden={activeTab !== "rekap"}>
        {activeTab === "rekap" && (
          <RekapTab
            payments={payments}
            students={students}
          />
        )}
        </div>
      </div>
    </div>
  );
}
