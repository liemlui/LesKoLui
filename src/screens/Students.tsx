import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { listStudents, createStudent, updateStudent } from "../db/repos";
import type { Student } from "../db/types";
import StudentForm from "../components/StudentForm";

export default function Students() {
  const students = useLiveQuery(() => listStudents(true), []);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);

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
        <button className="btn-primary text-sm" onClick={() => { setEditing(null); setShowForm(!showForm); }}>
          {showForm ? "Tutup" : "+ Tambah"}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3">{editing ? "Edit Murid" : "Murid Baru"}</h2>
          <StudentForm initial={editing ?? undefined} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />
        </div>
      )}

      {students.length === 0 && !showForm && (
        <p className="text-gray-400 text-center py-8">Belum ada murid. Tambahkan!</p>
      )}

      <div className="space-y-2">
        {students.map((s) => (
          <Link key={s.id} to={`/students/${s.id}`}
            className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{s.name}</p>
                <p className="text-sm text-gray-500">{s.level} · {s.subjects.join(", ")}</p>
              </div>
              <button onClick={(e) => { e.preventDefault(); setEditing(s); setShowForm(true); }}
                className="text-blue-600 text-sm">Edit</button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
