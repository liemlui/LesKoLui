import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getCashSummary } from "../../db/repos";
import type { Payment, Student } from "../../db/types";
import { formatRupiah, todayWIB, monthLabel, periodLabel } from "../../lib/format";
import { downloadBlob } from "../../lib/download";

const monthsBetween = (a: string, b: string): number => {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
};

interface AuditTabProps {
  payments: Payment[];
  students: Student[];
}

export default function AuditTab({ payments, students }: AuditTabProps) {
  const [auditYear, setAuditYear] = useState(() => Number(todayWIB().slice(0, 4)));
  const auditMonths = useMemo(
    () => Array.from({ length: 12 }, (_, i) => `${auditYear}-${String(i + 1).padStart(2, "0")}`),
    [auditYear]
  );
  const auditData = useLiveQuery(() => getCashSummary(auditMonths), [auditMonths]);

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const piutangRows = payments
    .filter((p) => p.status === "UNPAID")
    .map((p) => ({ payment: p, student: studentMap.get(p.studentId) }))
    .sort((a, b) => a.payment.month.localeCompare(b.payment.month));

  const auditTotals = {
    potensi: (auditData ?? []).reduce((s, r) => s + r.potensi, 0),
    realisasi: (auditData ?? []).reduce((s, r) => s + r.realisasi, 0),
    piutang: (auditData ?? []).reduce((s, r) => s + r.piutang, 0),
    pengeluaran: (auditData ?? []).reduce((s, r) => s + r.pengeluaran, 0),
    laba: (auditData ?? []).reduce((s, r) => s + r.laba, 0),
  };

  const exportAuditCsv = () => {
    const rows = auditData ?? [];
    const header = "Bulan,Potensi Sesi,Kas Masuk,Piutang,Pengeluaran,Laba Kas,Status";
    const body = rows.map((r) => `${r.month},${r.potensi},${r.realisasi},${r.piutang},${r.pengeluaran},${r.laba},${r.closed ? "Ditutup" : "Terbuka"}`);
    const total = `Total ${auditYear},${auditTotals.potensi},${auditTotals.realisasi},${auditTotals.piutang},${auditTotals.pengeluaran},${auditTotals.laba},`;
    const csv = [header, ...body, total].join("\n");
    downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `Audit-Keuangan-${auditYear}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Audit Tahunan</p>
          <div className="flex items-center gap-3">
            <button aria-label="Tahun sebelumnya" onClick={() => setAuditYear((y) => y - 1)} className="text-gray-500 hover:text-gray-700 text-lg leading-none">‹</button>
            <span className="font-semibold text-gray-700">{auditYear}</span>
            <button aria-label="Tahun berikutnya" onClick={() => setAuditYear((y) => y + 1)} className="text-gray-500 hover:text-gray-700 text-lg leading-none">›</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-xs">
            <thead>
              <tr className="text-gray-500 text-left">
                <th className="font-medium pb-1">Bln</th>
                <th className="font-medium pb-1 text-right">Potensi</th>
                <th className="font-medium pb-1 text-right">Kas Masuk</th>
                <th className="font-medium pb-1 text-right">Piutang</th>
                <th className="font-medium pb-1 text-right">Keluar</th>
                <th className="font-medium pb-1 text-right">Laba</th>
                <th className="font-medium pb-1 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {(auditData ?? []).map((r) => {
                const has = r.potensi || r.realisasi || r.piutang || r.pengeluaran;
                return (
                  <tr key={r.month} className="border-t border-gray-50">
                    <td className="py-1 text-gray-600">{r.month.slice(5)}</td>
                    <td className="py-1 text-right text-gray-600">{r.potensi ? formatRupiah(r.potensi) : "–"}</td>
                    <td className="py-1 text-right text-green-700">{r.realisasi ? formatRupiah(r.realisasi) : "–"}</td>
                    <td className="py-1 text-right text-amber-600">{r.piutang ? formatRupiah(r.piutang) : "–"}</td>
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
                <td className="py-1 text-right text-gray-700">{formatRupiah(auditTotals.potensi)}</td>
                <td className="py-1 text-right text-green-700">{formatRupiah(auditTotals.realisasi)}</td>
                <td className="py-1 text-right text-amber-600">{formatRupiah(auditTotals.piutang)}</td>
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
                const periodLbl = payment.periodStart && payment.periodEnd ? ` · ${periodLabel(payment.periodStart, payment.periodEnd)}` : "";
                return (
                  <div key={payment.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 min-w-0 truncate">{student?.name ?? "(dihapus)"} · {monthLabel(payment.month)}{periodLbl}</span>
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
  );
}
