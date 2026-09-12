/**
 * Papan pantau pipeline murid untuk Ringkasan Keuangan — READ-ONLY.
 *
 * Menampilkan status per murid: Sesi → Laporan → Tagihan → Lunas → Dibagikan.
 * Aksi penagihan tetap di tab Tagihan; baris yang perlu tindakan menampilkan
 * satu tombol dengan kata kerja yang spesifik (bukan satu label seragam) agar
 * pengguna tahu persis langkah berikutnya tanpa harus membuka tab lain dulu.
 *
 * Baris yang sudah sinkron disembunyikan di balik lipatan supaya papan ini
 * hanya menampilkan hal yang menuntut perhatian.
 */
import { useState } from "react";
import { billingPolicyOf } from "../../db/types";
import type { ReportDisplayStatus } from "../../db/types";
import { formatRupiah, monthLabel } from "../../lib/format";
import type { PipelineNextAction, StudentPipelineRow } from "../../lib/financePipeline";

interface Props {
  rows: StudentPipelineRow[];
  month: string;
  navigate: (to: string) => void;
  /** Ringkasan teks keadaan bulan ini (opsional). */
  summary?: string;
}

const POLICY_LABEL: Record<string, string> = {
  monthly: "Bulanan",
  session_count: "Paket",
  manual: "Manual",
};

/**
 * Satu tombol per aksi, dengan kata kerja yang menyebut pekerjaannya.
 * `create-report` dan `confirm-report` tetap di halaman Laporan karena di sana
 * laporan benar-benar disunting; sisanya menuju tab Tagihan.
 */
const ACTION: Record<Exclude<PipelineNextAction, null>, { label: string; route: string }> = {
  "create-report":  { label: "Buat laporan",              route: "/report?studentId=" },
  "confirm-report": { label: "Periksa & finalkan laporan", route: "/report?studentId=" },
  "create-invoice": { label: "Terbitkan invoice",         route: "/payments?tab=tagihan&studentId=" },
  "send-wa":        { label: "Kirim pengingat WA",        route: "/payments?tab=tagihan&studentId=" },
  "mark-paid":      { label: "Tandai lunas",              route: "/payments?tab=tagihan&studentId=" },
  "share-report":   { label: "Bagikan laporan",           route: "/report?studentId=" },
};

const REPORT_LABEL: Record<ReportDisplayStatus, string> = {
  draft: "Draft laporan",
  final: "Laporan final",
  shared: "Laporan dibagikan",
};

/** Satu kalimat keadaan yang menggantikan empat chip status yang saling mengulang. */
function stateSentence(row: StudentPipelineRow): string {
  const parts: string[] = [];
  parts.push(row.sessionCount > 0 ? `${row.sessionCount} pertemuan` : "Belum ada pertemuan");
  if (row.reportDisplayStatus) parts.push(REPORT_LABEL[row.reportDisplayStatus].toLowerCase());
  else parts.push("belum ada laporan");
  if (row.unpaidAmount > 0) parts.push(`${formatRupiah(row.unpaidAmount)} piutang`);
  else if (row.paidAmount > 0) parts.push("sudah lunas");
  return parts.join(" · ");
}

function StudentRow({
  row,
  navigate,
}: {
  row: StudentPipelineRow;
  navigate: (to: string) => void;
}) {
  const nextAction = row.nextAction;
  return (
    <li>
      <div className={`rounded-xl border p-3 ${nextAction ? "border-amber-200 bg-amber-50/40" : "border-gray-100 bg-white"}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{row.student.name}</p>
            <p className="text-xs text-gray-500">
              {POLICY_LABEL[billingPolicyOf(row.student)] ?? "—"}
              {row.potential > 0 && ` · ${formatRupiah(row.potential)} potensi`}
              {row.unpaidAmount > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-amber-700">{formatRupiah(row.unpaidAmount)} belum dibayar</span>
                </>
              )}
            </p>
          </div>
          {nextAction ? (
            <button
              type="button"
              onClick={() => navigate(ACTION[nextAction].route + row.student.id)}
              className="shrink-0 rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50"
            >
              {ACTION[nextAction].label} ↗
            </button>
          ) : (
            <span className="shrink-0 rounded-lg bg-green-100 px-2.5 py-1.5 text-xs font-semibold text-green-700">
              ✓ Sinkron
            </span>
          )}
        </div>
        <p className="mt-1.5 text-xs text-gray-500">{stateSentence(row)}</p>
      </div>
    </li>
  );
}

export default function FinancePipelineBoard({
  rows,
  month,
  navigate,
  summary,
}: Props) {
  const [showSynced, setShowSynced] = useState(false);

  const needsActionRows = rows.filter((row) => row.nextAction !== null);
  const syncedRows = rows.filter((row) => row.nextAction === null);
  const needsAction = needsActionRows.length;

  return (
    <section aria-labelledby="pipeline-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Status per murid</p>
        <h2 id="pipeline-title" className="text-base font-bold text-slate-800">
          Sesi → Laporan → Tagihan → Lunas → Dibagikan
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {summary ?? (needsAction === 0
            ? "Semua alur penagihan sinkron — tidak ada yang perlu ditindaklanjuti."
            : `${needsAction} murid perlu tindakan. Gunakan tombol di tiap baris untuk membuka langkahnya.`)}
        </p>
      </div>

      {needsActionRows.length > 0 ? (
        <ul className="space-y-2">
          {needsActionRows.map((row) => (
            <StudentRow key={row.student.id} row={row} navigate={navigate} />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg bg-green-50 px-3 py-2.5 text-xs text-green-700">
          Semua murid pada {monthLabel(month)} sudah sinkron.
        </p>
      )}

      {syncedRows.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowSynced((v) => !v)}
            aria-expanded={showSynced}
            className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            {showSynced ? "Sembunyikan" : "Lihat"} {syncedRows.length} murid yang sudah sinkron
            <span aria-hidden="true" className="ml-1">{showSynced ? "▾" : "▸"}</span>
          </button>
          {showSynced && (
            <ul className="mt-2 space-y-2">
              {syncedRows.map((row) => (
                <StudentRow key={row.student.id} row={row} navigate={navigate} />
              ))}
            </ul>
          )}
        </>
      )}

      {rows.length === 0 && (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2.5 text-xs text-gray-500">
          Belum ada murid pada {monthLabel(month)}.
        </p>
      )}
    </section>
  );
}
