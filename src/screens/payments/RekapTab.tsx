import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getCashSummary } from "../../db/repos";
import type { Payment, Student } from "../../db/types";
import { formatRupiah, todayWIB, monthLabel, periodLabel } from "../../lib/format";
import { downloadBlob } from "../../lib/download";
import { escapeCsvCell } from "../../lib/csv";
import { DownloadIcon } from "../../components/icons";

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
  /**
   * Tabel penuh 8 kolom disembunyikan di belakang satu tombol. Tabel 8 kolom di
   * layar 390px hanya bisa dibaca dengan menggeser ke samping, jadi tampilan
   * utama memakai 3 kolom dan kemampuan lama tetap utuh satu ketukan di baliknya.
   */
  const [showFullTable, setShowFullTable] = useState(false);
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
      <div className="bg-[var(--surface-strong)] rounded-xl p-4 shadow-sm border border-[var(--border)] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <p className="text-xs text-[var(--ink-muted)] font-medium uppercase tracking-wide">Rekap & Ekspor</p>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">Per tahun buku — tidak mengikuti bulan keuangan.</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button aria-label="Tahun sebelumnya" onClick={() => setAuditYear((y) => y - 1)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-strong)] transition-colors">‹</button>
            <span className="min-w-[3.5rem] text-center font-bold text-[var(--ink-strong)]">{auditYear}</span>
            <button aria-label="Tahun berikutnya" onClick={() => setAuditYear((y) => y + 1)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-strong)] transition-colors">›</button>
          </div>
        </div>

        {/* Ringkasan tahunan — 4 kartu inti + badge konteks */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--accent-tint)]/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-accent)]">Pendapatan (akrual)</p>
            <p className="mt-0.5 text-base font-bold text-[var(--ink-accent)]">{formatRupiah(auditTotals.pendapatan)}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-[var(--ink-accent)]">Dihitung saat les berlangsung</p>
          </div>
          <div className="rounded-xl border border-[var(--border-success)] bg-[var(--bg-success)]/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-success)]">Uang masuk (kas)</p>
            <p className="mt-0.5 text-base font-bold text-[var(--ink-success)]">{formatRupiah(auditTotals.realisasi)}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-[var(--ink-success)]">Dihitung saat transfer diterima</p>
          </div>
          <div className="rounded-xl border border-[var(--border-danger)] bg-[var(--bg-danger)]/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-danger)]">Pengeluaran</p>
            <p className="mt-0.5 text-base font-bold text-[var(--ink-danger)]">{formatRupiah(auditTotals.pengeluaran)}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-[var(--ink-danger)]">Transaksi keluar tahun ini</p>
          </div>
          <div className={`rounded-xl border p-3 ${auditTotals.laba >= 0 ? "border-[var(--border-success)] bg-[var(--bg-success-strong)]" : "border-[var(--border-danger)] bg-[var(--bg-danger-strong)]"}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--on-strong)]/90">Sisa kas</p>
            <p className="mt-0.5 text-base font-bold text-[var(--on-strong)]">{formatRupiah(auditTotals.laba)}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-[var(--on-strong)]/90">Uang masuk − pengeluaran</p>
          </div>
        </div>

        {unexplainedGap > 0 && (
          <p className="rounded-lg bg-[var(--surface)] px-3 py-2 text-xs leading-relaxed text-[var(--ink-muted)]">
            Selisih <strong>{formatRupiah(unexplainedGap)}</strong> antara pendapatan dan uang masuk adalah tagihan yang belum dibayar:
            sudah dihitung sebagai pendapatan, tetapi transfernya belum diterima pada {auditYear}.
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 text-xs">
          {auditTotals.sesi > 0 && <span className="rounded-full bg-[var(--bg-subtle)] text-[var(--ink-muted)] px-2 py-0.5 font-semibold">{auditTotals.sesi} pertemuan · {auditTotals.jam} jam</span>}
          {auditTotals.piutang > 0 && <span className="rounded-full bg-[var(--bg-warn)] text-[var(--ink-warn)] px-2 py-0.5 font-semibold">Belum dibayar {formatRupiah(auditTotals.piutang)}</span>}
          {marginRate > 0 && <span className="rounded-full bg-[var(--accent-tint)] text-[var(--ink-accent)] px-2 py-0.5 font-semibold">Margin {marginRate}%</span>}
        </div>

        {/* Tabel utama: 3 kolom. Bulan · Sisa kas · Belum dibayar — cukup untuk
            menjawab "bulan mana yang bocor" tanpa menggeser layar. */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[var(--ink-muted)] text-left">
                <th className="font-medium pb-1">Bulan</th>
                <th className="font-medium pb-1 text-right">Sisa kas</th>
                <th className="font-medium pb-1 text-right">Belum dibayar</th>
              </tr>
            </thead>
            <tbody>
              {(auditData ?? []).map((r) => {
                const has = r.sesi || r.pendapatan || r.realisasi || r.piutang || r.pengeluaran;
                return (
                  <tr key={r.month} className="border-t border-[var(--border)]">
                    <td className="py-1.5 text-[var(--ink-strong)]">
                      {monthLabel(r.month)}
                      <span className="block text-[13px] leading-snug text-[var(--ink-muted)]">
                        {r.sesi ? `${r.sesi} pertemuan · ${r.jam} jam` : "Tidak ada pertemuan"}
                      </span>
                    </td>
                    <td className={`py-1.5 text-right font-semibold ${r.laba >= 0 ? "text-[var(--ink-success)]" : "text-[var(--ink-danger)]"}`}>
                      {has ? formatRupiah(r.laba) : "–"}
                    </td>
                    <td className="py-1.5 text-right text-[var(--ink-warn)]">
                      {r.piutang > 0 ? formatRupiah(r.piutang) : "–"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--border)] font-bold">
                <td className="py-1 text-[var(--ink-strong)]">Total</td>
                <td className={`py-1 text-right ${auditTotals.laba >= 0 ? "text-[var(--ink-success)]" : "text-[var(--ink-danger)]"}`}>
                  {formatRupiah(auditTotals.laba)}
                </td>
                <td className="py-1 text-right text-[var(--ink-warn)]">{formatRupiah(auditTotals.piutang)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <button
          type="button"
          aria-expanded={showFullTable}
          aria-controls="rekap-tabel-lengkap"
          onClick={() => setShowFullTable((current) => !current)}
          className="w-full rounded-lg border border-[var(--border)] py-2 text-sm font-medium text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface)]"
        >
          {showFullTable ? "Sembunyikan lengkap" : "Lihat lengkap ▸"}
        </button>

        {showFullTable && (
          <div id="rekap-tabel-lengkap" className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-xs">
              <thead>
                <tr className="text-[var(--ink-muted)] text-left">
                  <th className="font-medium pb-1">Bulan</th>
                  <th className="font-medium pb-1 text-right">Pertemuan</th>
                  <th className="font-medium pb-1 text-right">Pendapatan</th>
                  <th className="font-medium pb-1 text-right">Uang masuk</th>
                  <th className="font-medium pb-1 text-right">Pengeluaran</th>
                  <th className="font-medium pb-1 text-right">Sisa kas</th>
                  <th className="font-medium pb-1 text-right">Belum dibayar</th>
                  <th className="font-medium pb-1 text-center">CSV</th>
                </tr>
              </thead>
              <tbody>
                {(auditData ?? []).map((r) => {
                  const has = r.sesi || r.pendapatan || r.realisasi || r.piutang || r.pengeluaran;
                  return (
                    <tr key={r.month} className="border-t border-[var(--border)]">
                      <td className="py-1 text-[var(--ink-muted)]">{monthLabel(r.month)}</td>
                      <td className="py-1 text-right text-[var(--ink-muted)] whitespace-nowrap">{r.sesi ? `${r.sesi} sesi · ${r.jam}j` : "–"}</td>
                      <td className="py-1 text-right text-[var(--ink-accent)]">{r.pendapatan ? formatRupiah(r.pendapatan) : "–"}</td>
                      <td className="py-1 text-right text-[var(--ink-success)]">{r.realisasi ? formatRupiah(r.realisasi) : "–"}</td>
                      <td className="py-1 text-right text-[var(--ink-danger)]">{r.pengeluaran ? formatRupiah(r.pengeluaran) : "–"}</td>
                      <td className={`py-1 text-right font-semibold ${r.laba >= 0 ? "text-[var(--ink-success)]" : "text-[var(--ink-danger)]"}`}>{has ? formatRupiah(r.laba) : "–"}</td>
                      <td className="py-1 text-right text-[var(--ink-warn)]">{r.piutang ? formatRupiah(r.piutang) : "–"}</td>
                      <td className="py-1 text-center">
                        <button onClick={() => exportMonthlyCsv(r.month)}
                          className="text-xs font-semibold text-[var(--ink-brand)] hover:text-[var(--ink-brand)] transition-colors"
                        >CSV</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--border)] font-bold">
                  <td className="py-1 text-[var(--ink-strong)]">Total</td>
                  <td className="py-1 text-right text-[var(--ink-muted)] whitespace-nowrap">{auditTotals.sesi} sesi · {auditTotals.jam}j</td>
                  <td className="py-1 text-right text-[var(--ink-accent)]">{formatRupiah(auditTotals.pendapatan)}</td>
                  <td className="py-1 text-right text-[var(--ink-success)]">{formatRupiah(auditTotals.realisasi)}</td>
                  <td className="py-1 text-right text-[var(--ink-danger)]">{formatRupiah(auditTotals.pengeluaran)}</td>
                  <td className={`py-1 text-right ${auditTotals.laba >= 0 ? "text-[var(--ink-success)]" : "text-[var(--ink-danger)]"}`}>{formatRupiah(auditTotals.laba)}</td>
                  <td className="py-1 text-right text-[var(--ink-warn)]">{formatRupiah(auditTotals.piutang)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <button onClick={exportAuditCsv}
          className="w-full py-2 rounded-lg border border-[var(--border)] text-[var(--ink-muted)] text-sm font-medium hover:bg-[var(--surface)] transition-colors">
          <DownloadIcon size={13} className="mr-1 inline align-[-2px]" /> Ekspor CSV {auditYear}
        </button>

        <div className="pt-2 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--ink-warn)] font-semibold mb-2 uppercase tracking-wide">Belum dibayar · {auditYear}</p>
          {piutangRows.length === 0 ? (
            <p className="rounded-lg bg-[var(--bg-success)] px-3 py-2 text-xs text-[var(--ink-success)]">Tidak ada invoice belum dibayar pada {auditYear}.</p>
          ) : (
            <div className="space-y-1">
              {piutangRows.map(({ payment, student }) => {
                const age = monthsBetween(payment.month, todayWIB().slice(0, 7));
                const periodLbl = payment.periodStart && payment.periodEnd ? ` · ${periodLabel(payment.periodStart, payment.periodEnd)}` : "";
                return (
                  <div key={payment.id} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--ink-strong)] min-w-0 truncate">{student?.name ?? "(dihapus)"} · {monthLabel(payment.month)}{periodLbl}</span>
                    <span className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[var(--ink-warn)] font-semibold">{formatRupiah(payment.totalCost)}</span>
                      {age > 0 && <span className="text-[var(--ink-danger)]">{age} bln</span>}
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
