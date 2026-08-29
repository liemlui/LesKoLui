import { useState } from "react";
import { createExpense, updateExpense } from "../db/repos";
import type { Expense, ExpenseCategory, Student } from "../db/types";
import { todayWIB } from "../lib/format";
import { isValidCurrencyAmount } from "../lib/money";
import { Z } from "../lib/zIndex";

/**
 * QuickExpenseModal — catat pengeluaran cepat dari dashboard tanpa PIN.
 * Bisa dipakai untuk menambah atau mengedit pengeluaran.
 *
 * Sengaja TIDAK dilindungi PIN keuangan karena hanya untuk mencatat (write-only),
 * tidak menampilkan data keuangan sensitif (ringkasan, tagihan, audit).
 * Halaman Keuangan (/payments) tetap terlindungi PIN penuh.
 */

interface Props {
  onClose: () => void;
  onSaved: (msg: string) => void;
  initialDate?: string;
  /** Bila diisi, modal bekerja sebagai editor pengeluaran. */
  expense?: Expense;
  /** Daftar murid untuk dropdown tautan (opsional — laba bersih per murid). */
  students?: Student[];
}

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  transport: "🚗 Transport",
  buku: "📚 Buku",
  alat: "🛠 Alat",
  platform: "💻 Platform",
  lainnya: "🗂 Lainnya",
};

const CATEGORIES: ExpenseCategory[] = ["transport", "buku", "alat", "platform", "lainnya"];

export default function QuickExpenseModal({ onClose, onSaved, initialDate, expense, students }: Props) {
  const editing = Boolean(expense);
  const [date, setDate] = useState(() => expense?.date ?? initialDate ?? todayWIB());
  const [category, setCategory] = useState<ExpenseCategory>(() => expense?.category ?? "transport");
  const [description, setDescription] = useState(() => expense?.description ?? "");
  const [amount, setAmount] = useState(() => expense?.amount ?? 0);
  const [studentId, setStudentId] = useState(() => expense?.studentId ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!date || !description.trim() || !isValidCurrencyAmount(amount)) {
      setError("Lengkapi semua data dengan nominal valid!");
      return;
    }
    setSaving(true);
    try {
      if (editing && expense) {
        await updateExpense(expense.id, { date, category, description, amount, studentId: studentId || undefined });
        onSaved("Pengeluaran diperbarui ✓");
      } else {
        await createExpense({ date, category, description, amount, studentId: studentId || undefined });
        onSaved("Pengeluaran dicatat ✓");
      }
      onClose();
    } catch (e) {
      setError("Gagal: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Catat Pengeluaran" className={`fixed inset-0 bg-black/60 ${Z.invoice} flex items-end justify-center`}>
      <div className="w-full max-w-md bg-white rounded-t-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-bold text-base">{editing ? "✏️ Edit Pengeluaran" : "💰 Catat Pengeluaran"}</h3>
          <button aria-label="Tutup" onClick={onClose} className="text-gray-500 hover:text-gray-600 text-lg w-10 h-10 flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label htmlFor="expense-date" className="text-xs text-gray-500 font-medium">Tanggal</label>
            <input id="expense-date" type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="input w-full mt-1" />
          </div>
          <div>
            <label htmlFor="expense-category" className="text-xs text-gray-500 font-medium">Kategori</label>
            <select id="expense-category" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="input w-full mt-1">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="expense-description" className="text-xs text-gray-500 font-medium">Deskripsi</label>
            <input id="expense-description" type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Misal: Bensin 2 minggu"
              className="input w-full mt-1" />
          </div>
          <div>
            <label htmlFor="expense-amount" className="text-xs text-gray-500 font-medium">Jumlah (IDR)</label>
            <input id="expense-amount" type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="0" min={1}
              className="input w-full mt-1" />
          </div>
          {students && students.length > 0 && (
          <div>
            <label htmlFor="expense-student" className="text-xs text-gray-500 font-medium">Terkait murid (opsional — hitung laba bersih)</label>
            <select id="expense-student" value={studentId} onChange={(e) => setStudentId(e.target.value)}
              className="input w-full mt-1">
              <option value="">— Umum (tidak terkait murid) —</option>
              {students.filter((s) => s.active).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
            {saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Simpan Pengeluaran"}
          </button>
        </div>
      </div>
    </div>
  );
}
