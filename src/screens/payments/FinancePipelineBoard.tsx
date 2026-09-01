/**
 * Papan pantau pipeline murid untuk Ringkasan Keuangan — READ-ONLY.
 *
 * Menampilkan status per murid: Sesi → Laporan → Tagihan → Lunas → Dibagikan.
 * Tombol aksi penagihan sudah dihapus agar peran Ringkasan (pantau) dan
 * Penagihan (eksekusi) tidak tumpang tindih. Baris yang perlu tindakan
 * menampilkan link "Tindak lanjuti …" yang mengarahkan ke tab Penagihan atau
 * halaman Laporan.
 */
import type { Dispatch, ReactNode, SetStateAction } from "react";
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

/** Label + rute untuk setiap aksi pipeline, tanpa eksekusi — hanya navigasi. */
const ACTION_LINK: Record<Exclude<PipelineNextAction, null>, {
  label: string;
  route: string;
}> = {
  "create-report":   { label: "Lengkapi Laporan", route: "/report?studentId=" },
  "confirm-report":  { label: "Sahkan Laporan",   route: "/report?studentId=" },
  "share-report":    { label: "Bagikan Laporan",  route: "/report?studentId=" },
  "create-invoice":  { label: "Tindak lanjuti di Penagihan", route: "/payments?tab=tagihan&studentId=" },
  "send-wa":         { label: "Tindak lanjuti di Penagihan", route: "/payments?tab=tagihan&studentId=" },
  "mark-paid":       { label: "Tindak lanjuti di Penagihan", route: "/payments?tab=tagihan&studentId=" },
};

function Chip({ tone, children }: { tone: "green" | "amber" | "violet" | "gray"; children: ReactNode }) {
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

  return (
    <section aria-labelledby="pipeline-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Papan pantau per murid</p>
        <h2 id="pipeline-title" className="text-base font-bold text-slate-800">
          Sesi → Laporan → Tagihan → Lunas → Dibagikan
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {summary ?? (needsAction === 0
            ? "Semua alur penagihan sinkron — tidak ada yang perlu ditindaklanjuti."
            : `${needsAction} murid perlu tindakan — buka tab Penagihan untuk mengeksekusi.`)}
        </p>
      </div>
      <ul className="space-y-2">
        {rows.map((row) => {
          const reportLabel =
            row.reportDisplayStatus === "draft" ? "Draft laporan"
            : row.reportDisplayStatus === "shared" ? "Laporan dibagikan"
            : row.reportDisplayStatus === "final" ? "Laporan final"
            : "Belum ada laporan";
          const reportTone =
            row.reportDisplayStatus === "draft" ? "amber"
            : row.reportDisplayStatus === "shared" ? "violet"
            : row.reportDisplayStatus === "final" ? "green"
            : "gray";
          const invoiceTone =
            row.invoiceStatus === "paid" ? "green"
            : row.invoiceStatus === "unpaid" ? "amber"
            : "gray";
          const invoiceLabel =
            row.invoiceStatus === "paid" ? "Lunas"
            : row.invoiceStatus === "unpaid" ? "Belum bayar"
            : "Belum terbit";
          const sharedTone =
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
                      {row.unpaidAmount > 0 && ` · ${formatRupiah(row.unpaidAmount)} piutang`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {row.nextAction ? (
                      <button
                        type="button"
                        onClick={() => navigate(ACTION_LINK[row.nextAction].route + row.student.id)}
                        className="rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                      >
                        {ACTION_LINK[row.nextAction].label} ↗
                      </button>
                    ) : (
                      <span className="rounded-lg bg-green-100 px-2.5 py-1.5 text-[11px] font-semibold text-green-700">
                        ✓ Sinkron
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Chip tone={row.sessionCount > 0 ? "green" : "gray"}>
                    {row.sessionCount > 0 ? `${row.sessionCount} sesi` : "0 sesi"}
                  </Chip>
                  <Chip tone={reportTone}>{reportLabel}</Chip>
                  <Chip tone={invoiceTone}>{invoiceLabel}</Chip>
                  <Chip tone={sharedTone}>
                    {row.reportDisplayStatus === "shared" ? "Sudah dibagikan" : "Belum dibagikan"}
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
