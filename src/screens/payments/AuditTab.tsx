import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getCashSummary } from "../../db/repos";
import type { Payment, Student } from "../../db/types";
import { formatRupiah, todayWIB, monthLabel, periodLabel } from "../../lib/format";
import { downloadBlob } from "../../lib/download";
import { escapeCsvCell } from "../../lib/csv";

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
    .filter((p) => p.status === "UNPAID" && p.month.startsWith(`${auditYear}-`))
    .map((p) => ({ payment: p, student: studentMap.get(p.studentId) }))
    .sort((a, b) => a.payment.month.localeCompare(b.payment.month));

  const auditTotals = {
    sesi: (auditData ?? []).reduce((s, r) => s + r.sesi, 0),
    jam: (auditData ?? []).reduce((s, r) => s + r.jam, 0),
    pendapatan: (auditData ?? []).reduce((s, r) => s + r.pendapatan, 0),
    realisasi: (auditData ?? []).reduce((s, r) => s + r.realisasi, 0),
    piutang: (auditData ?? []).reduce((s, r) => s + r.piutang, 0),
    pengeluaran: (auditData ?? []).reduce((s, r) => s + r.pengeluaran, 0),
    laba: (auditData ?? []).reduce((s, r) => s + r.laba, 0),
  };
  const marginRate = auditTotals.pendapatan > 0
    ? Math.round((auditTotals.laba / auditTotals.pendapatan) * 100)
    : 0;

  const exportAuditCsv = () => {
    const rows = auditData ?? [];
    const header = "Bulan,Sesi,Jam,Pendapatan,Uang Masuk,Belum Dibayar,Pengeluaran,Laba";
    const body = rows.map((r) => `${r.month},${r.sesi},${r.jam},${r.pendapatan},${r.realisasi},${r.piutang},${r.pengeluaran},${r.laba}`);
    const total = `Total ${auditYear},${auditTotals.sesi},${auditTotals.jam},${auditTotals.pendapatan},${auditTotals.realisasi},${auditTotals.piutang},${auditTotals.pengeluaran},${auditTotals.laba},`;
    const csv = [header, ...body, total].join("\n");
    downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `Rekap-Keuangan-${auditYear}.csv`);
  };

  const exportMonthlyCsv = (month: string) => {
    const found = (auditData ?? []).find((r) => r.month === month);
    if (!found) return;
    const monthPayments = payments.filter((p) => p.month === month);
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const invoiceRows = monthPayments.map((p) => [
      escapeCsvCell(studentMap.get(p.studentId)?.name ?? "(dihapus)"),
      p.totalCost,
      p.status,
      p.paidAt ?? "",
      p.reportId ?? "",
    ]);

    const csv = `\uFEFF### LAPORAN BULANAN - ${monthLabel(month)}
Bulan,${month}
Sesi,${found.sesi}
Jam,${found.jam}
Pendapatan,${found.pendapatan}
Uang Masuk,${found.realisasi}
Belum Dibayar,${found.piutang}
Pengeluaran,${found.pengeluaran}
Laba,${found.laba}
Collection Rate,${found.realisasi > 0 ? Math.round((found.realisasi / (found.realisasi + found.piutang)) * 100) + "%" : "-"}

### TAGIHAN
Murid,Nominal,Status,Dibayar,ID Laporan
${invoiceRows.join("\n")}
`;
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `Laporan-Bulanan-${month}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Rekap Tahunan</p>
            <p className="mt-0.5 text-xs text-gray-400">Pendapatan saat sesi berlangsung · Uang Masuk saat transfer diterima.</p>
          </div>
          <div className="flex items-center gap-3">
            <button aria-label="Tahun sebelumnya" onClick={() => setAuditYear((y) => y - 1)} className="text-gray-500 hover:text-gray-700 text-lg leading-none">‹</button>
            <span className="font-semibold text-gray-700">{auditYear}</span>
            <button aria-label="Tahun berikutnya" onClick={() => setAuditYear((y) => y + 1)} className="text-gray-500 hover:text-gray-700 text-lg leading-none">›</button>
          </div>
        </div>

        {/* Ringkasan tahunan — 4 kartu inti + badge konteks */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">Pendapatan</p>
            <p className="mt-0.5 text-base font-bold text-indigo-700">{formatRupiah(auditTotals.pendapatan)}</p>
          </div>
          <div className="rounded-xl border border-green-100 bg-green-50/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600">Uang Masuk</p>
            <p className="mt-0.5 text-base font-bold text-green-700">{formatRupiah(auditTotals.realisasi)}</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-red-600">Pengeluaran</p>
            <p className="mt-0.5 text-base font-bold text-red-600">{formatRupiah(auditTotals.pengeluaran)}</p>
          </div>
          <div className={`rounded-xl border p-3 ${auditTotals.laba >= 0 ? "border-emerald-200 bg-emerald-600" : "border-red-300 bg-red-600"}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Laba</p>
            <p className="mt-0.5 text-base font-bold text-white">{formatRupiah(auditTotals.laba)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          {auditTotals.sesi > 0 && <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 font-semibold">📚 {auditTotals.sesi} sesi · {auditTotals.jam} jam</span>}
          {auditTotals.piutang > 0 && <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 font-semibold">Belum dibayar {formatRupiah(auditTotals.piutang)}</span>}
          {marginRate > 0 && <span className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 font-semibold">Margin {marginRate}%</span>}
        </div>
        <div className="space-y-2 md:hidden" aria-label={`Rincian bulanan ${auditYear}`}>
          {(auditData ?? []).map((r) => {
            const has = r.sesi || r.pendapatan || r.realisasi || r.piutang || r.pengeluaran;
            return (
              <div key={r.month} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-sm font-bold text-slate-700">{monthLabel(r.month)}</p>
                <p className="mt-1 text-[11px] text-gray-400">{r.sesi ? `${r.sesi} sesi · ${r.jam} jam` : "Tidak ada sesi"}</p>
                <div className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1.5 text-xs">
                  <div><p className="text-gray-400">Pendapatan</p><p className="font-semibold text-indigo-700">{r.pendapatan ? formatRupiah(r.pendapatan) : "–"}</p></div>
                  <div><p className="text-gray-400">Uang Masuk</p><p className="font-semibold text-green-700">{r.realisasi ? formatRupiah(r.realisasi) : "–"}</p></div>
                  <div><p className="text-gray-400">Pengeluaran</p><p className="font-semibold text-red-600">{r.pengeluaran ? formatRupiah(r.pengeluaran) : "–"}</p></div>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 text-xs">
                  <p className="text-gray-500">Laba</p>
                  <p className={`font-bold ${r.laba >= 0 ? "text-green-700" : "text-red-600"}`}>{has ? formatRupiah(r.laba) : "–"}</p>
                </div>
                {r.piutang > 0 && (
                  <p className="mt-1.5 text-[11px] text-amber-700">⚠️ Belum dibayar: {formatRupiah(r.piutang)}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[800px] text-xs">
            <thead>
              <tr className="text-gray-500 text-left">
                <th className="font-medium pb-1">Bulan</th>
                <th className="font-medium pb-1 text-right">Selesai</th>
                <th className="font-medium pb-1 text-right">Pendapatan</th>
                <th className="font-medium pb-1 text-right">Uang Masuk</th>
                <th className="font-medium pb-1 text-right">Pengeluaran</th>
                <th className="font-medium pb-1 text-right">Laba</th>
                <th className="font-medium pb-1 text-right">Belum Dibayar</th>
                <th className="font-medium pb-1 text-center">CSV</th>
              </tr>
            </thead>
            <tbody>
              {(auditData ?? []).map((r) => {
                const has = r.sesi || r.pendapatan || r.realisasi || r.piutang || r.pengeluaran;
                return (
                  <tr key={r.month} className="border-t border-gray-50">
                    <td className="py-1 text-gray-600">{monthLabel(r.month)}</td>
                    <td className="py-1 text-right text-gray-500 whitespace-nowrap">{r.sesi ? `${r.sesi} sesi · ${r.jam}j` : "–"}</td>
                    <td className="py-1 text-right text-indigo-700">{r.pendapatan ? formatRupiah(r.pendapatan) : "–"}</td>
                    <td className="py-1 text-right text-green-700">{r.realisasi ? formatRupiah(r.realisasi) : "–"}</td>
                    <td className="py-1 text-right text-red-600">{r.pengeluaran ? formatRupiah(r.pengeluaran) : "–"}</td>
                    <td className={`py-1 text-right font-semibold ${r.laba >= 0 ? "text-green-700" : "text-red-600"}`}>{has ? formatRupiah(r.laba) : "–"}</td>
                    <td className="py-1 text-right text-amber-600">{r.piutang ? formatRupiah(r.piutang) : "–"}</td>
                    <td className="py-1 text-center">
                      <button onClick={() => exportMonthlyCsv(r.month)}
                        className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >CSV</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-100 font-bold">
                <td className="py-1 text-gray-700">Total</td>
                <td className="py-1 text-right text-gray-500 whitespace-nowrap">{auditTotals.sesi} sesi · {auditTotals.jam}j</td>
                <td className="py-1 text-right text-indigo-700">{formatRupiah(auditTotals.pendapatan)}</td>
                <td className="py-1 text-right text-green-700">{formatRupiah(auditTotals.realisasi)}</td>
                <td className="py-1 text-right text-red-600">{formatRupiah(auditTotals.pengeluaran)}</td>
                <td className={`py-1 text-right ${auditTotals.laba >= 0 ? "text-green-700" : "text-red-600"}`}>{formatRupiah(auditTotals.laba)}</td>
                <td className="py-1 text-right text-amber-600">{formatRupiah(auditTotals.piutang)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <button onClick={exportAuditCsv}
          className="w-full py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
          ⬇ Ekspor CSV {auditYear}
        </button>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-amber-600 font-semibold mb-2 uppercase tracking-wide">Invoice Belum Dibayar · {auditYear}</p>
          {piutangRows.length === 0 ? (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">Tidak ada invoice belum dibayar pada {auditYear}.</p>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
