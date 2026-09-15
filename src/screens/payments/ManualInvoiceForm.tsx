import type { Student } from "../../db/types";
import { clampCurrencyAmount, MAX_PAYMENT_AMOUNT } from "../../lib/money";
import { todayWIB } from "../../lib/format";

interface ManualInvoiceFormProps {
  students: Student[];
  open: boolean;
  selectedStudentId: string;
  selectedMonth: string;
  totalCost: number;
  onOpenChange: (open: boolean) => void;
  onStudentChange: (studentId: string) => void;
  onMonthChange: (month: string) => void;
  onTotalCostChange: (totalCost: number) => void;
  onSubmit: () => void;
}

export default function ManualInvoiceForm({
  students, open, selectedStudentId, selectedMonth, totalCost,
  onOpenChange, onStudentChange, onMonthChange, onTotalCostChange, onSubmit,
}: ManualInvoiceFormProps) {
  const toggle = () => {
    const opening = !open;
    if (opening) onMonthChange(todayWIB().slice(0, 7));
    onOpenChange(opening);
  };

  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <button type="button" onClick={toggle} className="flex w-full items-center justify-between text-sm font-semibold text-gray-600">
        <span>+ Tagihan Manual (di luar tutup bulan)</span>
        <span>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <select className="input" value={selectedStudentId} onChange={(event) => onStudentChange(event.target.value)}>
            <option value="">Pilih murid...</option>
            {students.filter((student) => student.active).map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
          </select>
          <div>
            <label htmlFor="manual-invoice-month" className="mb-1 block text-xs font-medium text-gray-600">Bulan tagihan</label>
            <input id="manual-invoice-month" className="input" type="month" value={selectedMonth} onChange={(event) => onMonthChange(event.target.value)} />
          </div>
          <input className="input" type="number" placeholder="Total biaya (IDR)" value={totalCost || ""} min={1} max={MAX_PAYMENT_AMOUNT}
            onChange={(event) => onTotalCostChange(clampCurrencyAmount(Number(event.target.value), MAX_PAYMENT_AMOUNT))} />
          <button type="button" onClick={onSubmit} className="btn-primary w-full">Buat Tagihan</button>
        </div>
      )}
    </div>
  );
}
