import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { getStudent, listSessionsByStudent } from "../db/repos";
import { dayLabel, monthLabel, monthOf } from "../lib/format";
import type { Session } from "../db/types";

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const student     = useLiveQuery(() => (id ? getStudent(id) : undefined), [id]);
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
    <div className="p-4 space-y-4 pb-24">

      {/* Back button */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors">
        ‹ Kembali ke Daftar Murid
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{student.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{student.level}{student.subjects.length > 0 ? ` · ${student.subjects.join(", ")}` : ""}</p>
        </div>
        <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${student.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {student.active ? "Aktif" : "Nonaktif"}
        </span>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => navigate("/capture")}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors">
          <span>📝</span> Catat Sesi
        </button>
        <button onClick={() => navigate("/report")}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold border border-indigo-200 hover:bg-indigo-100 transition-colors">
          <span>📊</span> Lihat Laporan
        </button>
      </div>

      {/* Profil */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
        <h2 className="font-semibold text-gray-700 text-sm mb-2">Info Murid</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400 w-28 flex-shrink-0">Orang Tua</span>
          <span className="text-gray-700 font-medium">
            {student.parentContact.name ? `${student.parentContact.name}` : "—"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400 w-28 flex-shrink-0">No. HP</span>
          <a href={`tel:${student.parentContact.phone}`}
            className="text-blue-600 font-medium">
            {student.parentContact.phone}
          </a>
        </div>
        {student.notes && (
          <div className="flex items-start gap-2 text-sm">
            <span className="text-gray-400 w-28 flex-shrink-0">Catatan</span>
            <span className="text-gray-700">{student.notes}</span>
          </div>
        )}

        {totalSessions > 0 && (
          <div className="pt-3 mt-1 border-t border-gray-100 grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-blue-700">{totalSessions}</p>
              <p className="text-xs text-blue-500 font-medium">Total Sesi</p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-indigo-700">{totalHours}j</p>
              <p className="text-xs text-indigo-500 font-medium">Total Jam</p>
            </div>
          </div>
        )}
      </div>

      {/* Riwayat per bulan */}
      <h2 className="text-lg font-semibold">Riwayat Sesi</h2>
      {byMonth.length === 0 && (
        <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
          <p className="text-3xl mb-2">📚</p>
          <p className="text-gray-400 text-sm">Belum ada sesi yang dicatat.</p>
          <button onClick={() => navigate("/capture")}
            className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold">
            Catat Sesi Pertama
          </button>
        </div>
      )}
      <div className="space-y-3">
        {byMonth.map(([month, data]) => (
          <div key={month} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <p className="font-semibold text-sm">{monthLabel(month)}</p>
              <p className="text-xs text-gray-500 font-medium">{data.sessions.length} sesi · {data.totalHours}j</p>
            </div>
            <div className="divide-y divide-gray-50">
              {data.sessions.map((s) => (
                <div key={s.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {(s.subjects ?? []).join(", ") || "Sesi umum"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {dayLabel(s.date).split(",")[1]?.trim() ?? s.date.slice(5)}
                        {s.time ? ` · ${s.time}` : ""}
                        {` · ${s.durationHours}j`}
                        {s.mood ? ` · ${s.mood}` : ""}
                      </p>
                      {s.shortNote && <p className="text-xs text-gray-500 mt-1 italic">"{s.shortNote}"</p>}
                    </div>
                    <span className="flex-shrink-0 text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">
                      {s.durationHours}j
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
