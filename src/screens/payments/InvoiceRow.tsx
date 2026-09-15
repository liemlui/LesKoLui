import type { MonthlyReport, Payment, Session, Settings, Student } from "../../db/types";
import { reportDisplayStatus } from "../../db/types";
import { formatRupiah, monthLabel, periodLabel } from "../../lib/format";
import { AGE_BUCKET_LABEL, ageBucket, invoiceAgeDays, invoiceDueAt } from "../../lib/finance";
import {
  INVOICE_ORIGIN_CLASS, INVOICE_ORIGIN_LABEL, buildManualBillingText,
  invoiceOriginOf, statusPillClass, toneForPayment,
} from "../../lib/invoicePresentation";
import { buildBillingMessage, toWaNumber } from "../../lib/waBilling";

interface InvoiceRowProps {
  invoice: Payment;
  report?: MonthlyReport;
  student?: Student;
  sessions: Session[];
  settings: Settings;
  expanded: boolean;
  amount: string;
  cancelBusy: boolean;
  onOpen: () => void;
  onAmountChange: (value: string) => void;
  onAmountSave: () => void;
  onTogglePaid: () => void;
  onOpenReport: () => void;
  onOpenInvoice: () => void;
  onCancelPackage: () => void;
}

const REPORT_DISPLAY_STATUS_LABEL: Record<ReturnType<typeof reportDisplayStatus>, string> = {
  draft: "Draft", final: "Final", shared: "Sudah dibagikan",
};

const REPORT_DISPLAY_STATUS_CLASS: Record<ReturnType<typeof reportDisplayStatus>, string> = {
  draft: "bg-amber-100 text-amber-700", final: "bg-emerald-100 text-emerald-700", shared: "bg-violet-100 text-violet-700",
};

export default function InvoiceRow({
  invoice, report, student, sessions, settings, expanded, amount, cancelBusy,
  onOpen, onAmountChange, onAmountSave, onTogglePaid, onOpenReport, onOpenInvoice, onCancelPackage,
}: InvoiceRowProps) {
  const paid = invoice.status === "PAID";
  const periodLbl = invoice.periodStart && invoice.periodEnd ? periodLabel(invoice.periodStart, invoice.periodEnd) : "";
  const totalHours = sessions.reduce((sum, session) => sum + session.durationHours, 0);
  const origin = invoiceOriginOf(invoice, report);
  const standaloneManual = origin === "manual";
  const phone = student?.parentContact?.phone ? toWaNumber(student.parentContact.phone) : "";
  const waText = student
    ? standaloneManual
      ? buildManualBillingText(student, invoice, settings)
      : buildBillingMessage({
          student, sessions, month: invoice.month, settings, amountOverride: invoice.totalCost,
          period: invoice.periodStart && invoice.periodEnd ? { start: invoice.periodStart, end: invoice.periodEnd } : undefined,
          periodLabelText: periodLbl || undefined, tone: toneForPayment(invoice),
        }).text
    : "";
  const metaLine = standaloneManual
    ? "Nominal manual · tanpa sesi"
    : `${sessions.length} pertemuan · ${totalHours} jam · ${periodLbl || "tanpa periode"}`;
  const ageLabel = paid ? null : AGE_BUCKET_LABEL[ageBucket(invoiceAgeDays(invoice))];

  return (
    <li>
      <button type="button" aria-expanded={expanded} onClick={onOpen}
        className="flex w-full items-center gap-2 py-2.5 text-left transition-colors hover:bg-gray-50">
        <span aria-hidden="true" className={`shrink-0 text-xs text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`}>▶</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate text-sm font-semibold text-gray-800">{student?.name ?? "(dihapus)"}</span>
            <span className={`shrink-0 text-sm font-bold ${paid ? "text-green-700" : "text-gray-800"}`}>{formatRupiah(invoice.totalCost)}</span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[13px] font-bold ${INVOICE_ORIGIN_CLASS[origin]}`}>{INVOICE_ORIGIN_LABEL[origin]}</span>
            <span className="truncate text-xs text-gray-500">{metaLine}</span>
          </span>
          <span className="mt-0.5 block text-xs font-semibold">
            {paid ? <span className="text-green-700">Lunas{invoice.paidAt ? ` · ${invoice.paidAt}` : ""}</span> : <span className="text-amber-700">Belum dibayar{ageLabel ? ` · ${ageLabel}` : ""}</span>}
          </span>
        </span>
      </button>

      {expanded && <div className="mb-3 space-y-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className={statusPillClass(paid)}>{paid ? "Lunas" : "Belum dibayar"}</span>
          {report && <span className={`inline-flex rounded-full px-1.5 py-0.5 font-bold ${REPORT_DISPLAY_STATUS_CLASS[reportDisplayStatus(report)]}`}>Laporan: {REPORT_DISPLAY_STATUS_LABEL[reportDisplayStatus(report)]}</span>}
          {origin === "package" && <span className="inline-flex rounded-full bg-indigo-100 px-1.5 py-0.5 font-bold text-indigo-700">{report?.finalBillingBatch ? "Paket penutup" : `Paket ${report?.billingSessionCount ?? sessions.length} pertemuan`}</span>}
        </div>
        <div className="rounded-lg bg-white px-2.5 py-1.5 text-xs leading-relaxed text-slate-600">
          <p>Periode pertemuan: <strong>{periodLbl || "Tanpa sesi"}</strong></p><p>Bulan tagihan: <strong>{monthLabel(invoice.month)}</strong></p><p>Jatuh tempo: <strong>{invoiceDueAt(invoice) ?? "—"}</strong></p>
        </div>
        <div className="flex items-center gap-2"><label htmlFor={`amount-${invoice.id}`} className="text-xs text-gray-500">Rp</label><input id={`amount-${invoice.id}`} aria-label={`Nominal tagihan ${student?.name ?? "murid"}`} className="input flex-1 py-1.5 text-sm" inputMode="numeric" value={amount} disabled={paid} onChange={(event) => onAmountChange(event.target.value)} onBlur={onAmountSave} /></div>
        <div className="flex flex-wrap gap-2">
          {phone && !paid && <a href={`https://wa.me/${phone}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer" className="min-w-[120px] flex-1 rounded-lg bg-green-500 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-green-600">Kirim tagihan via WA</a>}
          <button onClick={onTogglePaid} className={`min-w-[120px] flex-1 rounded-lg py-2 text-xs transition-colors ${paid ? "border border-gray-200 text-gray-600 font-medium hover:bg-gray-50" : "bg-blue-600 text-white font-semibold hover:bg-blue-700"}`}>{paid ? "Batalkan pelunasan" : "Tandai sudah dibayar"}</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {student && <button onClick={onOpenReport} className="min-w-[88px] flex-1 rounded-lg border border-blue-200 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50">{report ? "Buka laporan" : "Lengkapi laporan"}</button>}
          {student && <button onClick={onOpenInvoice} className="min-w-[88px] flex-1 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50">Unduh invoice PDF</button>}
          {report?.billingMode === "session_count" && !paid && invoice.source !== "manual" && <button type="button" disabled={cancelBusy} onClick={onCancelPackage} className="min-w-[128px] flex-1 rounded-lg border border-red-200 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-50">{cancelBusy ? "Membatalkan..." : report.finalBillingBatch ? "Batalkan tagihan penutup" : "Batalkan tagihan paket"}</button>}
        </div>
      </div>}
    </li>
  );
}
