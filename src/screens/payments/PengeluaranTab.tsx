import { useMemo, useState } from "react";
import { deleteExpense } from "../../db/repos";
import type { Expense, Student } from "../../db/types";
import { dayLabel, formatRupiah, todayWIB, monthLabel } from "../../lib/format";
import { EXPENSE_LABELS, sumExpensesByCategory } from "../../lib/finance";
import QuickExpenseModal from "../../components/QuickExpenseModal";
import ConfirmSheet from "../../components/ConfirmSheet";

interface PengeluaranTabProps {
  month: string;
  monthExpenses: Expense[];
  setMessage: (message: string) => void;
  students: Student[];
}

export default function PengeluaranTab({ month, monthExpenses, setMessage, students }: PengeluaranTabProps) {
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; description: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const todayStr = useMemo(() => todayWIB(), []);
  const isHistoricalMonth = month < todayStr.slice(0, 7);
  const expenseTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
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
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Pengeluaran periode</p>
          <h2 className="mt-0.5 text-base font-bold text-slate-800">{monthLabel(month)}</h2>
          <p className="mt-1 text-xs text-slate-500">Catat semua uang yang keluar pada bulan keuangan ini.</p>
        </div>
        <button onClick={() => setShowExpenseModal(true)}
          className="shrink-0 px-3 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
          + Catat
        </button>
      </div>

      {isHistoricalMonth && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-700">
          Anda sedang membuka bulan lampau. Saat menambah pengeluaran, tanggal awal diatur ke 1 {monthLabel(month)}; periksa tanggal transaksi sebelum menyimpan.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Pengeluaran</p>
          <p className="text-lg font-bold text-red-600">{formatRupiah(expenseTotal)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Jumlah Transaksi</p>
          <p className="text-lg font-bold text-gray-700">{monthExpenses.length}</p>
        </div>
      </div>

      {/* Ringkasan pengeluaran per kategori — dengan proporsi visual */}
      {monthExpenses.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pengeluaran per Kategori</p>
          <div className="space-y-1.5">
            {categories.map(([cat, total]) => {
              const pct = expenseTotal > 0 ? (total / expenseTotal) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="font-medium text-gray-600">{EXPENSE_LABELS[cat as keyof typeof EXPENSE_LABELS] ?? cat}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-gray-700">{formatRupiah(total)}</span>
                      {expenseTotal > 0 && (
                        <span className="text-xs text-gray-500 w-8 text-right">{Math.round(pct)}%</span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Rincian {monthLabel(month)}</p>
          <span className="text-xs text-gray-500">Terbaru di atas</span>
        </div>
        {monthExpenses.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500">Belum ada pengeluaran pada {monthLabel(month)}.</p>
            <button onClick={() => setShowExpenseModal(true)} className="mt-2 text-sm font-semibold text-blue-600">Catat pengeluaran pertama</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {[...monthExpenses].reverse().map((expense) => (
              <div key={expense.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {EXPENSE_LABELS[expense.category] ?? expense.category}
                    </span>
                    <span className="text-xs text-gray-500">{dayLabel(expense.date)}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-700 break-words">{expense.description}</p>
                  {expense.studentId && (
                    <span className="mt-0.5 inline-flex rounded-full bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-indigo-600">
                      {studentMap.get(expense.studentId) ?? "—"}
                    </span>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-bold text-red-600">{formatRupiah(expense.amount)}</p>
                  <div className="mt-1 flex justify-end gap-2">
                    <button type="button" aria-label={`Edit pengeluaran ${expense.description}`}
                      onClick={() => setEditTarget(expense)}
                      className="text-xs text-gray-500 hover:text-blue-600 px-1.5 py-1 -mx-1.5 rounded transition-colors">Edit</button>
                    <button type="button" aria-label={`Hapus pengeluaran ${expense.description}`}
                      onClick={() => setDeleteTarget({ id: expense.id, description: expense.description })}
                      className="text-xs text-gray-500 hover:text-red-600 px-1.5 py-1 -mx-1.5 rounded transition-colors">Hapus</button>
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
