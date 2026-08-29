/**
 * Papan komando pipeline murid untuk Ringkasan Keuangan.
 *
 * Menampilkan status per murid: Sesi → Laporan → Tagihan → Lunas → Dibagikan,
 * lengkap dengan aksi cepat kontekstual tanpa harus pindah ke tab Penagihan.
 * Aksi hanya memanggil repo existing (syncReportPayment / markPaymentTransferredById)
 * atau mengarahkan ke halaman Laporan / Penagihan — tidak menduplikasi logika billing.
 */
import type { Dispatch, SetStateAction } from "react";
import { Link } from "react-router-dom";
import {
  syncReportPayment,
  markPaymentTransferredById,
} from "../../db/repos";
import { billingPolicyOf } from "../../db/types";
import { formatRupiah, monthLabel } from "../../lib/format";
import type { PipelineNextAction, StudentPipelineRow } from "../../lib/financePipeline";

interface Props {
  rows: StudentPipelineRow[];
  month: string;
  setMessage: Dispatch<SetStateAction<string>>;
  navigate: (to: string) => void;
  /** Ringkasan teks keadaan bulan ini (opsional). */
  summary?: string;
}

const POLICY_LABEL: Record<string, string> = {
  monthly: "Bulanan",
  session_count: "Paket",
  manual: "Manual",
};

const ACTION_META: Record<Exclude<PipelineNextAction, null>, {
  label: string;
  className: string;
}> = {
  "create-report": { label: "Buat Laporan", className: "bg-blue-600 text-white hover:bg-blue-700" },
  "confirm-report": { label: "Sahkan Laporan", className: "bg-indigo-600 text-white hover:bg-indigo-700" },
  "create-invoice": { label: "Buat Tagihan", className: "bg-blue-600 text-white hover:bg-blue-700" },
  "send-wa": { label: "Kirim WA Tagihan", className: "bg-green-600 text-white hover:bg-green-700" },
  "share-report": { label: "Bagikan Laporan", className: "bg-violet-600 text-white hover:bg-violet-700" },
  "mark-paid": { label: "Tandai Lunas", className: "bg-emerald-600 text-white hover:bg-emerald-700" },
};

function Chip({ tone, children }: { tone: "green" | "amber" | "violet" | "gray"; children: React.ReactNode }) {
  const tones: Record<typeof tone, string> = {
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    violet: "bg-violet-100 text-violet-700",
    gray: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export default function FinancePipelineBoard({
  rows,
  month,
  setMessage,
  navigate,
  summary,
}: Props) {
  const needsAction = rows.filter((row) => row.nextAction !== null).length;

  const handleCreateInvoice = async (row: StudentPipelineRow) => {
    const report = row.report;
    if (!report) return;
    try {
      await syncReportPayment({
        id: report.id,
        studentId: report.studentId,
        month: report.month,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        totalCost: report.totalCost,
        billingMode: report.billingMode,
      });
      setMessage(`✓ Tagihan ${row.student.name} diterbitkan`);
    } catch (error) {
      setMessage("Gagal: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleMarkPaid = async (row: StudentPipelineRow) => {
    const invoice = row.invoice;
    if (!invoice) return;
    try {
      await markPaymentTransferredById(invoice.id);
      setMessage(`✓ ${row.student.name}: ${formatRupiah(invoice.totalCost)} ditandai lunas`);
    } catch (error) {
      setMessage("Gagal: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const reportHref = (row: StudentPipelineRow): string => {
    const base = `/report?studentId=${encodeURIComponent(row.student.id)}`;
    if ((row.nextAction === "confirm-report" || row.nextAction === "share-report") && row.report) {
      return `${base}&reportId=${encodeURIComponent(row.report.id)}`;
    }
    return base;
  };

  const runPrimaryAction = (row: StudentPipelineRow) => {
    switch (row.nextAction) {
      case "create-invoice":
        void handleCreateInvoice(row);
        return;
      case "mark-paid":
        void handleMarkPaid(row);
        return;
      case "send-wa":
        navigate(`/payments?tab=tagihan&month=${encodeURIComponent(month)}`);
        return;
      case "create-report":
      case "confirm-report":
      case "share-report":
        navigate(reportHref(row));
        return;
      default:
        return;
    }
  };

  return (
    <section aria-labelledby="pipeline-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Papan komando</p>
          <h2 id="pipeline-title" className="text-base font-bold text-slate-800">
            Alur penagihan {monthLabel(month)}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {summary ?? `Sesi → Laporan → Tagihan → Lunas → Dibagikan.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {needsAction > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
              {needsAction} butuh tindakan
            </span>
          )}
          <Link
            to={`/payments?tab=tagihan&month=${encodeURIComponent(month)}`}
            className="shrink-0 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Buka Penagihan →
          </Link>
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {rows.map((row) => {
          const reportLabel =
            row.reportDisplayStatus === "draft" ? "Draft"
            : row.reportDisplayStatus === "shared" ? "Dibagikan"
            : row.reportDisplayStatus === "final" ? "Final"
            : "Belum ada";
          const reportTone: "green" | "amber" | "violet" | "gray" =
            row.reportDisplayStatus === "draft" ? "amber"
            : row.reportDisplayStatus === "shared" ? "violet"
            : row.reportDisplayStatus === "final" ? "green"
            : "gray";
          const invoiceTone: "green" | "amber" | "violet" | "gray" =
            row.invoiceStatus === "paid" ? "green"
            : row.invoiceStatus === "unpaid" ? "amber"
            : "gray";
          const invoiceLabel =
            row.invoiceStatus === "paid" ? "Lunas"
            : row.invoiceStatus === "unpaid" ? "Belum bayar"
            : "Belum terbit";
          const sharedTone: "green" | "amber" | "violet" | "gray" =
            row.reportDisplayStatus === "shared" ? "violet" : "gray";
          return (
            <li key={row.student.id}>
              <div className={`rounded-xl border p-3 ${row.nextAction ? "border-amber-200 bg-amber-50/40" : "border-gray-100 bg-white"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{row.student.name}</p>
                    <p className="text-[11px] text-gray-500">
                      {POLICY_LABEL[billingPolicyOf(row.student)] ?? "—"}
                      {row.potential > 0 && ` · ${formatRupiah(row.potential)} potensi`}
                      {row.unpaidAmount > 0 && ` · ${formatRupiah(row.unpaidAmount)} belum dibayar`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {row.nextAction ? (
                      <button
                        type="button"
                        onClick={() => runPrimaryAction(row)}
                        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${ACTION_META[row.nextAction].className}`}
                      >
                        {ACTION_META[row.nextAction].label}
                      </button>
                    ) : (
                      <span className="rounded-lg bg-green-100 px-2.5 py-1.5 text-[11px] font-semibold text-green-700">✓ Sinkron</span>
                    )}
                    {row.nextAction === "send-wa" && row.invoice && (
                      <button
                        type="button"
                        onClick={() => handleMarkPaid(row)}
                        className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                      >
                        Tandai Lunas
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Chip tone={row.sessionCount > 0 ? "green" : "gray"}>
                    {row.sessionCount > 0 ? `✓ ${row.sessionCount} sesi` : "0 sesi"}
                  </Chip>
                  <Chip tone={reportTone}>{reportLabel}</Chip>
                  <Chip tone={invoiceTone}>{invoiceLabel}</Chip>
                  <Chip tone={sharedTone}>
                    {row.reportDisplayStatus === "shared" ? "✓ dibagikan" : "belum dibagikan"}
                  </Chip>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {rows.length === 0 && (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2.5 text-xs text-gray-500">
          Belum ada murid pada {monthLabel(month)}.
        </p>
      )}
    </section>
  );
}
