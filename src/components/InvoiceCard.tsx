import type { Payment } from "../db/types";
import { formatRupiah, monthLabel } from "../lib/format";

interface Props {
  payment: Payment;
  studentName: string;
  onMarkPaid?: () => void;
}

export default function InvoiceCard({ payment, studentName, onMarkPaid }: Props) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{studentName}</p>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          payment.status === "PAID" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
        }`}>
          {payment.status === "PAID" ? "Lunas" : "Belum"}
        </span>
      </div>
      <p className="text-sm text-gray-500">{monthLabel(payment.month)}</p>
      <p className="text-lg font-bold">{formatRupiah(payment.totalCost)}</p>
      {payment.paidAt && <p className="text-xs text-gray-400">Dibayar: {payment.paidAt}</p>}
      {payment.method && <p className="text-xs text-gray-400">Metode: {payment.method}</p>}
      {payment.status === "UNPAID" && onMarkPaid && (
        <button onClick={onMarkPaid} className="btn-primary text-sm w-full">Tandai Lunas</button>
      )}
    </div>
  );
}
