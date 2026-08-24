import { useMemo, useState } from "react";
import { deleteExpense } from "../../db/repos";
import type { Expense } from "../../db/types";
import { formatRupiah, todayWIB, monthLabel } from "../../lib/format";
import { EXPENSE_LABELS, sumExpensesByCategory } from "../../lib/finance";
import QuickExpenseModal from "../../components/QuickExpenseModal";
import ConfirmSheet from "../../components/ConfirmSheet";

interface PengeluaranTabProps {
  month: string;
  monthExpenses: Expense[];
  setMessage: (message: string) => void;
}

export default function PengeluaranTab({ month, monthExpenses, setMessage }: PengeluaranTabProps) {
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; description: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const todayStr = useMemo(() => todayWIB(), []);
  const expenseTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const categories = Array.from(sumExpensesByCategory(monthExpenses).entries())
    .sort((a, b) => b[1] - a[1]);

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
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Pengeluaran periode</p>
          <h2 className="mt-0.5 text-base font-bold text-slate-800">{monthLabel(month)}</h2>
          <p className="mt-1 text-xs text-slate-500">Catat semua uang yang keluar pada periode laporan ini.</p>
        </div>
        <button onClick={() => setShowExpenseModal(true)}
          className="shrink-0 px-3 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
          + Catat
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Total Pengeluaran</p>
          <p className="text-lg font-bold text-red-600">{formatRupiah(expenseTotal)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Jumlah Transaksi</p>
          <p className="text-lg font-bold text-gray-700">{monthExpenses.length}</p>
        </div>
      </div>

      {monthExpenses.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {categories.map(([cat, total]) => (
            <span key={cat} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {EXPENSE_LABELS[cat as keyof typeof EXPENSE_LABELS] ?? cat}: {formatRupiah(total)}
            </span>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Rincian {monthLabel(month)}</p>
          <span className="text-[11px] text-gray-400">Terbaru di atas</span>
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
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {EXPENSE_LABELS[expense.category] ?? expense.category}
                    </span>
                    <span className="text-[11px] text-gray-400">{expense.date}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-700 break-words">{expense.description}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-bold text-red-600">{formatRupiah(expense.amount)}</p>
                  <button onClick={() => setDeleteTarget({ id: expense.id, description: expense.description })}
                    className="mt-1 text-[11px] text-gray-400 hover:text-red-600">Hapus</button>
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
