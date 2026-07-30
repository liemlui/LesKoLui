import { useState } from "react";
import { createExpense } from "../db/repos";
import type { ExpenseCategory } from "../db/repos";
import { todayWIB } from "../lib/format";
import { isValidCurrencyAmount } from "../lib/money";

/**
 * QuickExpenseModal — catat pengeluaran cepat dari dashboard tanpa PIN.
 *
 * Sengaja TIDAK dilindungi PIN keuangan karena hanya untuk mencatat (write-only),
 * tidak menampilkan data keuangan sensitif (ringkasan, tagihan, audit).
 * Halaman Keuangan (/payments) tetap terlindungi PIN penuh.
 */

interface Props {
  onClose: () => void;
  onSaved: (msg: string) => void;
}

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  transport: "🚗 Transport",
  buku: "📚 Buku",
  alat: "🛠 Alat",
  platform: "💻 Platform",
  lainnya: "🗂 Lainnya",
};

const CATEGORIES: ExpenseCategory[] = ["transport", "buku", "alat", "platform", "lainnya"];

export default function QuickExpenseModal({ onClose, onSaved }: Props) {
  const [date, setDate] = useState(() => todayWIB());
  const [category, setCategory] = useState<ExpenseCategory>("transport");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!date || !description || !isValidCurrencyAmount(amount)) {
      setError("Lengkapi semua data dengan nominal valid!");
      return;
    }
    setSaving(true);
    try {
      await createExpense({ date, category, description, amount });
      onSaved("Pengeluaran dicatat ✓");
      onClose();
    } catch (e) {
      setError("Gagal: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center">
      <div className="w-full max-w-md bg-white rounded-t-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-bold text-base">💰 Catat Pengeluaran</h3>
          <button aria-label="Tutup" onClick={onClose} className="text-gray-500 hover:text-gray-600 text-lg w-10 h-10 flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium">Tanggal</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="input w-full mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Kategori</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="input w-full mt-1">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Deskripsi</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Misal: Bensin 2 minggu"
              className="input w-full mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Jumlah (IDR)</label>
            <input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="0" min={1}
              className="input w-full mt-1" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
            {saving ? "Menyimpan..." : "Simpan Pengeluaran"}
          </button>
        </div>
      </div>
    </div>
  );
}
