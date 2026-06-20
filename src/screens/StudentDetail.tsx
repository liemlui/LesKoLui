import { useParams, Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { getStudent, listPayments } from "../db/repos";
import { formatRupiah, dayLabel } from "../lib/format";

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const student = useLiveQuery(() => (id ? getStudent(id) : undefined), [id]);
  const payments = useLiveQuery(() => (id ? listPayments() : []), [id]);

  if (!student) return <div className="p-4 text-gray-500">Memuat...</div>;

  const studentPayments = payments?.filter((p) => p.studentId === student.id) ?? [];

  return (
    <div className="p-4 space-y-4 pb-20">
      <Link to="/students" className="text-blue-600 text-sm">&larr; Kembali</Link>

      <h1 className="text-2xl font-bold">{student.name}</h1>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
        <p><span className="text-gray-500">Level:</span> {student.level}</p>
        <p><span className="text-gray-500">Mata Pelajaran:</span> {student.subjects.join(", ")}</p>
        <p><span className="text-gray-500">Tarif:</span> {formatRupiah(student.hourlyRate)}/jam</p>
        <p><span className="text-gray-500">Kontak:</span> {student.parentContact.name ? `${student.parentContact.name} — ` : ""}{student.parentContact.phone}</p>
        {student.notes && <p><span className="text-gray-500">Catatan:</span> {student.notes}</p>}
      </div>

      <h2 className="text-lg font-semibold">Riwayat Bayaran</h2>
      {studentPayments.length === 0 && <p className="text-gray-400 text-sm">Belum ada pembayaran.</p>}
      <div className="space-y-2">
        {studentPayments.map((p) => (
          <div key={p.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
              <p className="font-medium">{p.month}</p>
              <p className="text-sm text-gray-500">{formatRupiah(p.totalCost)}</p>
            </div>
            <span className={`text-sm font-medium ${p.status === "PAID" ? "text-green-600" : "text-red-500"}`}>
              {p.status === "PAID" ? `Lunas ${p.paidAt ? dayLabel(p.paidAt) : ""}` : "Belum Dibayar"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
