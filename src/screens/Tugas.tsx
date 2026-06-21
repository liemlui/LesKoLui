import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { listAllPendingHomework, markHomeworkDone, markHomeworkNotDone, deleteHomework } from "../db/repos";
import { todayWIB } from "../lib/format";

export default function TugasPage() {
  const homeworks = useLiveQuery(() => listAllPendingHomework(), []);
  const today = todayWIB();
  const [filter, setFilter] = useState<"menunggu" | "telat" | "semua">("menunggu");

  if (!homeworks) return <div className="p-4 text-gray-500">Memuat...</div>;

  const pendingCount  = homeworks.filter((h) => h.status === "assigned" && (!h.dueAt || h.dueAt >= today)).length;
  const overdueCount  = homeworks.filter((h) => h.status === "overdue"  || (h.dueAt && h.dueAt < today && h.status === "assigned")).length;

  const filtered = filter === "menunggu"
    ? homeworks.filter((h) => h.status === "assigned" && (!h.dueAt || h.dueAt >= today))
    : filter === "telat"
    ? homeworks.filter((h) => h.status === "overdue" || (h.dueAt && h.dueAt < today))
    : homeworks;

  // Group by student
  const byStudent = filtered.reduce<Record<string, typeof filtered>>((acc, h) => {
    const key = h.studentName ?? h.studentId;
    (acc[key] = acc[key] ?? []).push(h);
    return acc;
  }, {});

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tugas / PR</h1>
          <p className="text-xs text-gray-400 mt-0.5">Centang yang sudah dikerjakan, silang yang tidak</p>
        </div>
        {overdueCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {overdueCount} telat
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
        {([
          ["menunggu", `Aktif (${pendingCount})`],
          ["telat",    `Telat (${overdueCount})`],
          ["semua",    `Semua (${homeworks.length})`],
        ] as const).map(([f, label]) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === f ? "bg-white text-gray-800 shadow-sm" : "text-gray-400"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-gray-400 text-sm font-medium">
            {filter === "menunggu" ? "Tidak ada tugas aktif." : "Tidak ada tugas telat."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byStudent).map(([studentName, tasks]) => (
            <div key={studentName} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Student header */}
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <p className="font-bold text-sm text-gray-800">{studentName}</p>
                <span className="text-xs text-gray-400">{tasks.length} tugas</span>
              </div>

              {/* Tasks */}
              <div className="divide-y divide-gray-50">
                {tasks
                  .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"))
                  .map((h) => {
                    const isOverdue = h.status === "overdue" || (h.dueAt && h.dueAt < today);
                    const daysLeft = h.dueAt
                      ? Math.ceil((new Date(h.dueAt).getTime() - new Date(today).getTime()) / 86400000)
                      : null;

                    return (
                      <div key={h.id} className={`px-4 py-3 ${isOverdue ? "bg-red-50/40" : ""}`}>
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">{h.title}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              {h.subject && (
                                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                                  {h.subject}
                                </span>
                              )}
                              {h.dueAt && (
                                <span className={`text-xs font-medium ${
                                  isOverdue ? "text-red-500" :
                                  daysLeft !== null && daysLeft <= 2 ? "text-orange-500" :
                                  "text-gray-400"
                                }`}>
                                  {isOverdue ? `Lewat ${Math.abs(daysLeft ?? 0)}h` :
                                   daysLeft === 0 ? "Deadline hari ini!" :
                                   daysLeft === 1 ? "Besok" : `${daysLeft}h lagi`}
                                </span>
                              )}
                              {h.assignedAt && (
                                <span className="text-xs text-gray-300">Diberi {h.assignedAt.slice(5)}</span>
                              )}
                            </div>
                            {h.instructions && (
                              <p className="text-xs text-gray-400 mt-1 line-clamp-2 italic">{h.instructions}</p>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-1.5 flex-shrink-0">
                            {/* Done ✓ */}
                            <button
                              onClick={() => markHomeworkDone(h.id)}
                              title="Sudah dikerjakan"
                              className="w-9 h-9 rounded-xl bg-green-50 border border-green-200 text-green-600 font-bold text-base flex items-center justify-center hover:bg-green-100 active:scale-95 transition-all">
                              ✓
                            </button>
                            {/* Not done ✗ */}
                            <button
                              onClick={() => markHomeworkNotDone(h.id)}
                              title="Tidak dikerjakan — dicatat sebagai bukti"
                              className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 text-red-500 font-bold text-base flex items-center justify-center hover:bg-red-100 active:scale-95 transition-all">
                              ✗
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => deleteHomework(h.id)}
                              title="Hapus tugas"
                              className="w-9 h-9 rounded-xl bg-gray-50 text-gray-300 font-bold text-lg flex items-center justify-center hover:text-red-400 hover:bg-red-50 transition-all">
                              ×
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center pt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-lg bg-green-50 border border-green-200 text-green-600 text-xs font-bold flex items-center justify-center">✓</span>
          <span className="text-xs text-gray-400">Sudah kerjakan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-lg bg-red-50 border border-red-200 text-red-500 text-xs font-bold flex items-center justify-center">✗</span>
          <span className="text-xs text-gray-400">Tidak kerjakan (dicatat)</span>
        </div>
      </div>
    </div>
  );
}
