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
  /**
   * Pendapatan (akrual) vs uang masuk (kas) berbeda persis sebesar piutang yang
   * belum tertagih. Menampilkan selisihnya mencegah pertanyaan "kenapa dua angka
   * ini tidak sama".
   */
  const unexplainedGap = Math.max(0, auditTotals.pendapatan - auditTotals.realisasi);

  const exportAuditCsv = () => {
    const rows = auditData ?? [];
    const header = "Bulan,Pertemuan,Jam,Pendapatan,Uang masuk,Piutang,Pengeluaran,Sisa kas";
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
Pertemuan,${found.sesi}
Jam,${found.jam}
Pendapatan,${found.pendapatan}
Uang masuk,${found.realisasi}
Piutang,${found.piutang}
Pengeluaran,${found.pengeluaran}
Sisa kas,${found.laba}
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
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Rekap & Ekspor</p>
            <p className="mt-0.5 text-xs text-gray-400">Per tahun buku — tidak mengikuti bulan keuangan.</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button aria-label="Tahun sebelumnya" onClick={() => setAuditYear((y) => y - 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">‹</button>
            <span className="min-w-[3.5rem] text-center font-bold text-gray-800">{auditYear}</span>
            <button aria-label="Tahun berikutnya" onClick={() => setAuditYear((y) => y + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">›</button>
          </div>
        </div>

        {/* Ringkasan tahunan — 4 kartu inti + badge konteks */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Pendapatan (akrual)</p>
            <p className="mt-0.5 text-base font-bold text-indigo-700">{formatRupiah(auditTotals.pendapatan)}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-indigo-600">Dihitung saat les berlangsung</p>
          </div>
          <div className="rounded-xl border border-green-100 bg-green-50/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Uang masuk (kas)</p>
            <p className="mt-0.5 text-base font-bold text-green-700">{formatRupiah(auditTotals.realisasi)}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-green-700">Dihitung saat transfer diterima</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Pengeluaran</p>
            <p className="mt-0.5 text-base font-bold text-red-600">{formatRupiah(auditTotals.pengeluaran)}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-red-600">Transaksi keluar tahun ini</p>
          </div>
          <div className={`rounded-xl border p-3 ${auditTotals.laba >= 0 ? "border-emerald-200 bg-emerald-600" : "border-red-300 bg-red-600"}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/90">Sisa kas</p>
            <p className="mt-0.5 text-base font-bold text-white">{formatRupiah(auditTotals.laba)}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-white/90">Uang masuk − pengeluaran</p>
          </div>
        </div>

        {unexplainedGap > 0 && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
            Selisih <strong>{formatRupiah(unexplainedGap)}</strong> antara pendapatan dan uang masuk adalah piutang:
            sudah dihitung sebagai pendapatan, tetapi transfernya belum diterima pada {auditYear}.
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 text-xs">
          {auditTotals.sesi > 0 && <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 font-semibold">{auditTotals.sesi} pertemuan · {auditTotals.jam} jam</span>}
          {auditTotals.piutang > 0 && <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 font-semibold">Piutang {formatRupiah(auditTotals.piutang)}</span>}
          {marginRate > 0 && <span className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 font-semibold">Margin {marginRate}%</span>}
        </div>

        {/* Di bawah lg: tabel 8 kolom tidak muat tanpa scroll horizontal, jadi
            tiap bulan diringkas menjadi dua baris. */}
        <div className="space-y-1.5 lg:hidden" aria-label={`Rincian bulanan ${auditYear}`}>
          {(auditData ?? []).map((r) => {
            const has = r.sesi || r.pendapatan || r.realisasi || r.piutang || r.pengeluaran;
            return (
              <div key={r.month} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-slate-700">{monthLabel(r.month)}</p>
                  <p className={`text-sm font-bold ${r.laba >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {has ? formatRupiah(r.laba) : "–"}
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  {r.sesi ? `${r.sesi} pertemuan · ${r.jam} jam` : "Tidak ada pertemuan"}
                  {r.piutang > 0 && <span className="text-amber-700"> · piutang {formatRupiah(r.piutang)}</span>}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                  <span className="text-gray-500">Pendapatan <b className="text-indigo-700">{r.pendapatan ? formatRupiah(r.pendapatan) : "–"}</b></span>
                  <span className="text-gray-500">Uang masuk <b className="text-green-700">{r.realisasi ? formatRupiah(r.realisasi) : "–"}</b></span>
                  <span className="text-gray-500">Keluar <b className="text-red-600">{r.pengeluaran ? formatRupiah(r.pengeluaran) : "–"}</b></span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[800px] text-xs">
            <thead>
              <tr className="text-gray-500 text-left">
                <th className="font-medium pb-1">Bulan</th>
                <th className="font-medium pb-1 text-right">Pertemuan</th>
                <th className="font-medium pb-1 text-right">Pendapatan</th>
                <th className="font-medium pb-1 text-right">Uang masuk</th>
                <th className="font-medium pb-1 text-right">Pengeluaran</th>
                <th className="font-medium pb-1 text-right">Sisa kas</th>
                <th className="font-medium pb-1 text-right">Piutang</th>
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
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
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
          <p className="text-xs text-amber-600 font-semibold mb-2 uppercase tracking-wide">Piutang · {auditYear}</p>
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
