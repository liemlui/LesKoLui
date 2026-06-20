import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { listStudents, createStudent, updateStudent, listSessionsForMonth } from "../db/repos";
import { todayWIB, monthOf, monthLabel, formatRupiah } from "../lib/format";
import type { Student } from "../db/types";
import StudentForm from "../components/StudentForm";

export default function Students() {
  const currentMonth = monthOf(todayWIB());
  const students = useLiveQuery(() => listStudents(true), []);
  const monthSessions = useLiveQuery(() => listSessionsForMonth(currentMonth), [currentMonth]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);

  const statsMap = useMemo(() => {
    const m = new Map<string, { count: number; cost: number; hours: number }>();
    (monthSessions ?? []).forEach((s) => {
      const curr = m.get(s.studentId) ?? { count: 0, cost: 0, hours: 0 };
      m.set(s.studentId, {
        count: curr.count + 1,
        cost: curr.cost + s.cost,
        hours: curr.hours + s.durationHours,
      });
    });
    return m;
  }, [monthSessions]);

  const totalMonthCost = useMemo(
    () => [...statsMap.values()].reduce((sum, s) => sum + s.cost, 0),
    [statsMap]
  );
  const totalMonthSessions = useMemo(
    () => [...statsMap.values()].reduce((sum, s) => sum + s.count, 0),
    [statsMap]
  );

  if (!students) return <div className="p-4 text-gray-500">Memuat...</div>;

  const handleSave = async (data: Omit<Student, "id">) => {
    if (editing) {
      await updateStudent(editing.id, data);
    } else {
      await createStudent(data);
    }
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Murid</h1>
        <button
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${showForm ? "bg-gray-100 text-gray-600" : "bg-blue-600 text-white shadow"}`}
          onClick={() => { setEditing(null); setShowForm(!showForm); }}
        >
          <span className="text-base leading-none">{showForm ? "✕" : "+"}</span>
          {showForm ? "Tutup" : "Tambah Murid"}
        </button>
      </div>

      {/* Summary banner bulan ini */}
      {totalMonthSessions > 0 && (
        <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">
              {monthLabel(currentMonth)}
            </p>
            <p className="text-sm font-bold text-blue-900">
              {totalMonthSessions} sesi · {formatRupiah(totalMonthCost)}
            </p>
          </div>
          <span className="text-2xl">📈</span>
        </div>
      )}

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3">{editing ? "Edit Murid" : "Murid Baru"}</h2>
          <StudentForm
            initial={editing ?? undefined}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </div>
      )}

      {students.length === 0 && !showForm && (
        <p className="text-gray-400 text-center py-8">Belum ada murid. Tambahkan!</p>
      )}

      <div className="space-y-2">
        {students.map((s) => {
          const stats = statsMap.get(s.id);
          return (
            <Link
              key={s.id}
              to={`/students/${s.id}`}
              className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{s.name}</p>
                  <p className="text-sm text-gray-500">{s.level} · {s.subjects.join(", ")}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatRupiah(s.hourlyRate)}/jam</p>
                  {stats ? (
                    <p className="text-xs text-green-600 font-medium mt-1">
                      Bulan ini: {stats.count} sesi · {stats.hours}j · {formatRupiah(stats.cost)}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-300 mt-1">Belum ada sesi bulan ini</p>
                  )}
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); setEditing(s); setShowForm(true); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-600 ml-2 flex-shrink-0 transition-colors"
                  title="Edit murid"
                >
                  ✏️
                </button>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
