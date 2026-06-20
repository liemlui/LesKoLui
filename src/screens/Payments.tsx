import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { listPayments, listStudents, getPayment, upsertPayment } from "../db/repos";
import { formatRupiah } from "../lib/format";
import InvoiceCard from "../components/InvoiceCard";

export default function PaymentsPage() {
  const payments = useLiveQuery(() => listPayments(), []);
  const students = useLiveQuery(() => listStudents(true), []);

  const [filterMonth, setFilterMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [totalCost, setTotalCost] = useState(0);
  const [message, setMessage] = useState("");

  const studentMap = new Map(students?.map((s) => [s.id, s]));

  const filtered = filterMonth
    ? (payments ?? []).filter((p) => p.month === filterMonth)
    : (payments ?? []);

  // New payment form
  const handleCreatePayment = async () => {
    if (!selectedStudentId || !selectedMonth || totalCost <= 0) {
      setMessage("Lengkapi semua data!");
      return;
    }
    const existing = await getPayment(selectedStudentId, selectedMonth);
    if (existing) {
      setMessage("Tagihan untuk murid & bulan ini sudah ada!");
      return;
    }
    await upsertPayment({
      studentId: selectedStudentId,
      month: selectedMonth,
      totalCost,
      status: "UNPAID",
    });
    setMessage("Tagihan baru dibuat ✓");
    setTotalCost(0);
  };

  const handleMarkPaid = async (studentId: string, month: string) => {
    const p = await getPayment(studentId, month);
    if (!p) return;
    const method = prompt("Metode pembayaran (transfer/tunai/dll):") || "transfer";
    await upsertPayment({
      ...p,
      status: "PAID",
      paidAt: new Date().toISOString().slice(0, 10),
      method,
    });
    setMessage(`Pembayaran ${studentMap.get(studentId)?.name} ditandai lunas ✓`);
  };

  if (!payments || !students) return <div className="p-4 text-gray-500">Memuat...</div>;

  const totalsByMonth = payments.reduce<Record<string, number>>((acc, p) => {
    acc[p.month] = (acc[p.month] || 0) + p.totalCost;
    return acc;
  }, {});

  return (
    <div className="p-4 space-y-4 pb-20">
      <h1 className="text-2xl font-bold">Bayaran</h1>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {message}
        </div>
      )}

      {/* New Invoice */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold">Tagihan Baru</h2>
        <select className="input" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
          <option value="">Pilih murid...</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input className="input" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
        <input className="input" type="number" placeholder="Total biaya (IDR)" value={totalCost || ""}
          onChange={(e) => setTotalCost(Number(e.target.value))} />
        <button onClick={handleCreatePayment} className="btn-primary w-full">Buat Tagihan</button>
      </div>

      {/* Filter by month */}
      <div className="flex gap-2">
        <input className="input flex-1" type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(totalsByMonth).sort().map(([m, total]) => (
          <button key={m}
            className={`px-3 py-1 rounded-full text-sm border ${
              filterMonth === m ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"
            }`}
            onClick={() => setFilterMonth(m)}>
            {m} — {formatRupiah(total)}
          </button>
        ))}
      </div>

      {/* Invoices */}
      {filtered.length === 0 && <p className="text-gray-400 text-center py-8">Belum ada tagihan.</p>}

      <div className="space-y-3">
        {filtered.map((p) => (
          <InvoiceCard
            key={p.id}
            payment={p}
            studentName={studentMap.get(p.studentId)?.name ?? "(dihapus)"}
            onMarkPaid={p.status === "UNPAID" ? () => handleMarkPaid(p.studentId, p.month) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
