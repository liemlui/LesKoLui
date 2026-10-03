import { useMemo, useState } from "react";
import { deleteExpense } from "../../db/repos";
import type { Expense, Student } from "../../db/types";
import { dayLabel, formatRupiah, todayWIB, monthLabel } from "../../lib/format";
import { EXPENSE_LABELS, sumExpensesByCategory } from "../../lib/finance";
import QuickExpenseModal from "../../components/QuickExpenseModal";
import ConfirmSheet from "../../components/ConfirmSheet";
import StatTile from "../../components/ui/StatTile";
import ActionBar from "../../components/ui/ActionBar";
import EmptyState from "../../components/ui/EmptyState";

interface PengeluaranTabProps {
  month: string;
  monthExpenses: Expense[];
  /** Uang yang benar-benar masuk pada bulan ini (dari tanggal pembayaran). */
  cashInMonth: number;
  setMessage: (message: string) => void;
  students: Student[];
}

export default function PengeluaranTab({ month, monthExpenses, cashInMonth, setMessage, students }: PengeluaranTabProps) {
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; description: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const todayStr = useMemo(() => todayWIB(), []);
  const isHistoricalMonth = month < todayStr.slice(0, 7);
  const expenseTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netCash = cashInMonth - expenseTotal;
  const categories = Array.from(sumExpensesByCategory(monthExpenses).entries())
    .sort((a, b) => b[1] - a[1]);
  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);

  const handleDeleteExpense = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteExpense(deleteTarget.id);
      setMessage("Pengeluaran dihapus ✓");
      setDeleteTarget(null);
    } catch (e) {
      setMessage("Gagal: " + (e as Error).message);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-muted)]">Pengeluaran periode</p>
          <h2 className="mt-0.5 text-base font-bold text-[var(--ink-strong)]">{monthLabel(month)}</h2>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">Catat semua uang yang keluar pada bulan keuangan ini.</p>
        </div>
        <ActionBar emphasis>
          <button onClick={() => setShowExpenseModal(true)}
            className="shrink-0 px-3 py-2 rounded-[var(--radius-card)] bg-[var(--bg-danger-strong)] text-[var(--on-strong)] text-body font-semibold hover:opacity-90 transition-colors">
            + Catat
          </button>
        </ActionBar>
      </div>

      {isHistoricalMonth && (
        <div className="rounded-xl border border-[var(--brand-tint-strong)] bg-[var(--brand-tint)] px-3 py-2 text-xs leading-relaxed text-[var(--ink-brand)]">
          Anda sedang membuka bulan lampau. Saat menambah pengeluaran, tanggal awal diatur ke 1 {monthLabel(month)}; periksa tanggal transaksi sebelum menyimpan.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <StatTile
          label="Total pengeluaran"
          value={formatRupiah(expenseTotal)}
          hint={`${monthExpenses.length} transaksi`}
        />
        <StatTile
          label="Sisa kas bulan ini"
          value={formatRupiah(netCash)}
          hint={`${formatRupiah(cashInMonth)} uang masuk − pengeluaran`}
          delta={{ text: netCash >= 0 ? "Surplus" : "Defisit", tone: netCash >= 0 ? "up" : "down" }}
        />
      </div>

      {/* Ringkasan pengeluaran per kategori — dengan proporsi visual */}
      {monthExpenses.length > 0 && (
        <div className="bg-[var(--surface-strong)] rounded-xl p-4 shadow-sm border border-[var(--border)] space-y-2">
          <p className="text-xs text-[var(--ink-muted)] font-medium uppercase tracking-wide">Pengeluaran per Kategori</p>
          <div className="space-y-1.5">
            {categories.map(([cat, total]) => {
              const pct = expenseTotal > 0 ? (total / expenseTotal) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="font-medium text-[var(--ink-muted)]">{EXPENSE_LABELS[cat as keyof typeof EXPENSE_LABELS] ?? cat}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--ink-strong)]">{formatRupiah(total)}</span>
                      {expenseTotal > 0 && (
                        <span className="text-xs text-[var(--ink-muted)] w-8 text-right">{Math.round(pct)}%</span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--bg-danger-strong)] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-[var(--surface-strong)] rounded-xl p-4 shadow-sm border border-[var(--border)]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-[var(--ink-muted)] font-medium uppercase tracking-wide">Rincian {monthLabel(month)}</p>
          <span className="text-xs text-[var(--ink-muted)]">Terbaru di atas</span>
        </div>
        {monthExpenses.length === 0 ? (
          <EmptyState
            title={`Belum ada pengeluaran pada ${monthLabel(month)}`}
            message="Catat pengeluaran pertama bulan ini supaya sisa kas ikut terhitung."
            action={
              <button onClick={() => setShowExpenseModal(true)} className="text-body font-semibold text-[var(--ink-brand)]">
                Catat pengeluaran pertama
              </button>
            }
          />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {[...monthExpenses].reverse().map((expense) => (
              <div key={expense.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-xs font-semibold text-[var(--ink-muted)]">
                      {EXPENSE_LABELS[expense.category] ?? expense.category}
                    </span>
                    <span className="text-xs text-[var(--ink-muted)]">{dayLabel(expense.date)}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-[var(--ink-strong)] break-words">{expense.description}</p>
                  {expense.studentId && (
                    <span className="mt-0.5 inline-flex rounded-full bg-[var(--accent-tint)] px-1.5 py-0.5 text-xs font-semibold text-[var(--ink-accent)]">
                      {studentMap.get(expense.studentId) ?? "—"}
                    </span>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-bold text-[var(--ink-danger)]">{formatRupiah(expense.amount)}</p>
                  <div className="mt-1 flex justify-end gap-2">
                    <button type="button" aria-label={`Edit pengeluaran ${expense.description}`}
                      onClick={() => setEditTarget(expense)}
                      className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink-brand)] px-1.5 py-1 -mx-1.5 rounded transition-colors">Edit</button>
                    <button type="button" aria-label={`Hapus pengeluaran ${expense.description}`}
                      onClick={() => setDeleteTarget({ id: expense.id, description: expense.description })}
                      className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink-danger)] px-1.5 py-1 -mx-1.5 rounded transition-colors">Hapus</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showExpenseModal && (
        <QuickExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onSaved={(msg) => setMessage(msg)}
          initialDate={month === todayStr.slice(0, 7) ? todayStr : `${month}-01`}
          students={students}
        />
      )}

      {editTarget && (
        <QuickExpenseModal
          expense={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(msg) => setMessage(msg)}
          students={students}
        />
      )}

      <ConfirmSheet
        open={deleteTarget !== null}
        title="Hapus Pengeluaran"
        message={`Hapus pengeluaran "${deleteTarget?.description ?? ""}"?`}
        confirmLabel="Hapus"
        danger
        busy={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteExpense()}
      />
    </div>
  );
}
