import Skeleton from "../components/Skeleton";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { listAllHomeworkFull, markHomeworkDone, markHomeworkNotDone, deleteHomework } from "../db/repos";
import { todayWIB } from "../lib/format";
import { useToastCtx } from "../components/ToastProvider";
import Breadcrumb from "../components/Breadcrumb";
import Badge from "../components/Badge";

type FilterTab = "menunggu" | "telat" | "selesai" | "semua";

export default function TugasPage() {
  const homeworks = useLiveQuery(() => listAllHomeworkFull(), []);
  const today = todayWIB();
  const [filter, setFilter] = useState<FilterTab>("menunggu");
  const [search, setSearch] = useState("");
  const toast = useToastCtx();
  const msg = (t: string) => { toast.info(t); };

  if (!homeworks) return <Skeleton variant="card" lines={4} className="p-4" />;

  const pendingCount   = homeworks.filter((h) => h.status === "assigned" && (!h.dueAt || h.dueAt >= today)).length;
  const overdueCount   = homeworks.filter((h) => h.status === "overdue"  || (h.dueAt && h.dueAt < today && h.status === "assigned")).length;
  const doneCount      = homeworks.filter((h) => h.status === "done" || h.status === "not_done" || h.status === "cancelled").length;

  const filtered = filter === "menunggu"
    ? homeworks.filter((h) => h.status === "assigned" && (!h.dueAt || h.dueAt >= today))
    : filter === "telat"
    ? homeworks.filter((h) => h.status === "overdue" || (h.dueAt && h.dueAt < today && h.status === "assigned"))
    : filter === "selesai"
    ? homeworks.filter((h) => h.status === "done" || h.status === "not_done" || h.status === "cancelled")
    : homeworks;

  const q = search.toLowerCase().trim();
  const searched = q
    ? filtered.filter((h) => h.title.toLowerCase().includes(q) || (h.studentName ?? "").toLowerCase().includes(q))
    : filtered;

  const byStudent = searched.reduce<Record<string, typeof filtered>>((acc, h) => {
    const key = h.studentName ?? h.studentId;
    (acc[key] = acc[key] ?? []).push(h);
    return acc;
  }, {});

  const tabs: [FilterTab, string][] = [
    ["menunggu", `Aktif (${pendingCount})`],
    ["telat",    `Telat (${overdueCount})`],
    ["selesai",  `Selesai (${doneCount})`],
    ["semua",    `Semua (${homeworks.length})`],
  ];

  function statusChip(status: string, dueAt?: string) {
    if (status === "done")      return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Selesai</span>;
    if (status === "not_done")  return <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">✗ Tidak kerjakan</span>;
    if (status === "cancelled") return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Dibatalkan</span>;
    if (status === "overdue" || (dueAt && dueAt < today)) return <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Terlambat</span>;
    return null;
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      <Breadcrumb />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tugas / PR</h1>
          <p className="text-xs text-gray-500 mt-0.5">Centang yang sudah dikerjakan, silang yang tidak</p>
        </div>
        {overdueCount > 0 && (
          <Badge tone="red" count={overdueCount}>Telat</Badge>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
        <input
          className="input pl-9 w-full"
          placeholder="Cari tugas atau nama murid..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button aria-label="Hapus pencarian" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map(([f, label]) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap px-1 ${
              filter === f ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {searched.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">{filter === "selesai" ? "📭" : "✅"}</p>
          <p className="text-gray-500 text-sm font-medium">
            {filter === "menunggu" ? "Tidak ada tugas aktif." :
             filter === "telat"    ? "Tidak ada tugas telat." :
             filter === "selesai"  ? "Belum ada tugas yang selesai." :
                                     "Belum ada tugas apapun."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byStudent).map(([studentName, tasks]) => (
            <div key={studentName} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <p className="font-bold text-sm text-gray-800">{studentName}</p>
                <span className="text-xs text-gray-500">{tasks.length} tugas</span>
              </div>

              <div className="divide-y divide-gray-50">
                {tasks
                  .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"))
                  .map((h) => {
                    const isOverdue = h.status === "overdue" || (h.dueAt && h.dueAt < today && h.status === "assigned");
                    const isDone    = h.status === "done" || h.status === "not_done" || h.status === "cancelled";
                    const daysLeft  = h.dueAt
                      ? Math.ceil((new Date(h.dueAt + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000)
                      : null;

                    return (
                      <div key={h.id} className={`px-4 py-3 ${isOverdue && !isDone ? "bg-red-50/40" : isDone ? "bg-gray-50/60" : ""}`}>
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${isDone ? "text-gray-500 line-through" : "text-gray-800"}`}>{h.title}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              {h.subject && (
                                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                                  {h.subject}
                                </span>
                              )}
                              {statusChip(h.status, h.dueAt)}
                              {!isDone && h.dueAt && (
                                <span className={`text-xs font-medium ${
                                  isOverdue ? "text-red-500" :
                                  daysLeft !== null && daysLeft <= 2 ? "text-orange-500" :
                                  "text-gray-500"
                                }`}>
                                  {isOverdue ? `Lewat ${Math.abs(daysLeft ?? 0)}h` :
                                   daysLeft === 0 ? "Deadline hari ini!" :
                                   daysLeft === 1 ? "Besok" : `${daysLeft}h lagi`}
                                </span>
                              )}
                              {h.assignedAt && (
                                <span className="text-xs text-gray-500">Diberi {h.assignedAt.slice(5)}</span>
                              )}
                            </div>
                            {h.instructions && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2 italic">{h.instructions}</p>
                            )}
                          </div>

                          <div className="flex gap-1.5 flex-shrink-0">
                            {!isDone && (
                              <>
                                <button onClick={async () => { try { await markHomeworkDone(h.id); } catch { msg("Gagal menandai."); } }}
                                  title="Sudah dikerjakan"
                                  className="w-11 h-11 rounded-xl bg-green-50 border border-green-200 text-green-600 font-bold text-base flex items-center justify-center hover:bg-green-100 active:scale-95 transition-all">
                                  ✓
                                </button>
                                <button onClick={async () => { try { await markHomeworkNotDone(h.id); } catch { msg("Gagal menandai."); } }}
                                  title="Tidak dikerjakan"
                                  className="w-11 h-11 rounded-xl bg-red-50 border border-red-200 text-red-500 font-bold text-base flex items-center justify-center hover:bg-red-100 active:scale-95 transition-all">
                                  ✗
                                </button>
                              </>
                            )}
                            <button onClick={async () => {
                              if (!confirm(`Hapus tugas "${h.title}"?`)) return;
                              try { await deleteHomework(h.id); } catch { msg("Gagal menghapus."); }
                            }}
                              title="Hapus tugas"
                              className="w-11 h-11 rounded-xl bg-gray-50 text-gray-500 font-bold text-lg flex items-center justify-center hover:text-red-400 hover:bg-red-50 transition-all">
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

      <div className="flex items-center gap-4 justify-center pt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-lg bg-green-50 border border-green-200 text-green-600 text-xs font-bold flex items-center justify-center">✓</span>
          <span className="text-xs text-gray-500">Sudah kerjakan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-lg bg-red-50 border border-red-200 text-red-500 text-xs font-bold flex items-center justify-center">✗</span>
          <span className="text-xs text-gray-500">Tidak kerjakan</span>
        </div>
      </div>
    </div>
  );
}
