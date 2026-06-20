import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { getStudent, listSessionsByStudent } from "../db/repos";
import { dayLabel, monthLabel, monthOf } from "../lib/format";
import type { Session } from "../db/types";

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const student    = useLiveQuery(() => (id ? getStudent(id) : undefined), [id]);
  const allSessions = useLiveQuery(() => (id ? listSessionsByStudent(id) : []), [id]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { sessions: Session[]; totalHours: number }>();
    (allSessions ?? []).forEach((s) => {
      const m = monthOf(s.date);
      const curr = map.get(m) ?? { sessions: [], totalHours: 0 };
      curr.sessions.push(s);
      curr.totalHours += s.durationHours;
      map.set(m, curr);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [allSessions]);

  const totalSessions = allSessions?.length ?? 0;
  const totalHours    = useMemo(() => (allSessions ?? []).reduce((s, x) => s + x.durationHours, 0), [allSessions]);

  if (!student) return <div className="p-4 text-gray-500">Memuat...</div>;

  return (
    <div className="p-4 space-y-4 pb-20">
      <Link to="/students" className="text-blue-600 text-sm">&larr; Kembali</Link>

      <h1 className="text-2xl font-bold">{student.name}</h1>

      {/* Profil */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
        <p><span className="text-gray-500">Level:</span> {student.level}</p>
        {student.subjects.length > 0 && (
          <p><span className="text-gray-500">Mata Pelajaran:</span> {student.subjects.join(", ")}</p>
        )}
        <p>
          <span className="text-gray-500">Kontak:</span>{" "}
          {student.parentContact.name ? `${student.parentContact.name} — ` : ""}
          {student.parentContact.phone}
        </p>
        {student.notes && <p><span className="text-gray-500">Catatan:</span> {student.notes}</p>}

        {totalSessions > 0 && (
          <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-400">Total sesi</p>
              <p className="text-sm font-semibold">{totalSessions} sesi</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Total jam</p>
              <p className="text-sm font-semibold">{totalHours}j</p>
            </div>
          </div>
        )}
      </div>

      {/* Riwayat per bulan */}
      <h2 className="text-lg font-semibold">Riwayat Sesi</h2>
      {byMonth.length === 0 && (
        <p className="text-gray-400 text-sm">Belum ada sesi yang dicatat.</p>
      )}
      <div className="space-y-3">
        {byMonth.map(([month, data]) => (
          <div key={month} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <p className="font-semibold text-sm">{monthLabel(month)}</p>
              <p className="text-xs text-gray-500">{data.sessions.length} sesi · {data.totalHours}j</p>
            </div>
            <div className="divide-y divide-gray-50">
              {data.sessions.map((s) => (
                <div key={s.id} className="px-4 py-2">
                  <p className="text-sm font-medium">{(s.subjects ?? []).join(", ") || "—"}</p>
                  <p className="text-xs text-gray-400">
                    {dayLabel(s.date).split(",")[1]?.trim() ?? s.date.slice(5)} · {s.durationHours}j
                    {s.mood && ` · ${s.mood}`}
                  </p>
                  {s.shortNote && <p className="text-xs text-gray-500 mt-0.5 italic">{s.shortNote}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
