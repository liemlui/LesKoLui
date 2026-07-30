import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { listStudents, listAllStudyNotes, saveStudyNote, getStudyNote } from "../db/repos";
import type { Student, StudyNote } from "../db/types";
import { todayWIB } from "../lib/format";
import Breadcrumb from "../components/Breadcrumb";
import Skeleton from "../components/Skeleton";

type StudentWithNote = Student & { noteContent: string; noteUpdatedAt?: string };

/**
 * CatatanBelajar — catatan belajar per murid.
 * Guru privat mencatat topik sekolah, progres, atau rencana sesi berikutnya.
 * Auto-save setelah 1 detik berhenti mengetik.
 *
 * @component
 * @route /catatan
 */
export default function CatatanBelajar() {
  const navigate = useNavigate();
  const students = useLiveQuery(() => listStudents(true), []);
  const savedNotes = useLiveQuery(() => listAllStudyNotes(), []);

  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Sync from DB on load
  useEffect(() => {
    if (!students || !savedNotes) return;
    const map: Record<string, string> = {};
    const noteMap = new Map(savedNotes.map((n) => [n.studentId, n.content]));
    for (const s of students) {
      map[s.id] = noteMap.get(s.id) ?? "";
      // Preload any missing notes from DB directly (in case listAllStudyNotes missed)
      if (!noteMap.has(s.id)) {
        getStudyNote(s.id).then((n) => {
          if (n) setNotes((prev) => ({ ...prev, [s.id]: n.content }));
        });
      }
    }
    setNotes((prev) => ({ ...map, ...prev }));
  }, [students, savedNotes]);

  const debouncedSave = useCallback((studentId: string, content: string) => {
    // Clear existing timer
    const existing = timers.current.get(studentId);
    if (existing) clearTimeout(existing);

    // Update local state immediately
    setNotes((prev) => ({ ...prev, [studentId]: content }));

    // Debounce save to DB
    const timer = setTimeout(async () => {
      setSaving((prev) => ({ ...prev, [studentId]: true }));
      try {
        await saveStudyNote(studentId, content);
      } finally {
        setSaving((prev) => ({ ...prev, [studentId]: false }));
      }
    }, 800);
    timers.current.set(studentId, timer);
  }, []);

  if (!students || !savedNotes) {
    return (
      <div className="pb-20 px-4 pt-5 space-y-4">
        <Skeleton variant="text" lines={2} width="40%" />
        <Skeleton variant="card" lines={3} />
        <Skeleton variant="card" lines={3} />
      </div>
    );
  }

  const searchLower = search.toLowerCase();
  const filtered = students.filter(
    (s) =>
      !searchLower ||
      s.name.toLowerCase().includes(searchLower) ||
      s.subjects.some((subj) => subj.toLowerCase().includes(searchLower))
  );

  // Sort: students with notes first, then by name
  const sorted = [...filtered].sort((a, b) => {
    const aHas = (notes[a.id] ?? "").trim().length > 0;
    const bHas = (notes[b.id] ?? "").trim().length > 0;
    if (aHas !== bHas) return aHas ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="pb-24">
      <Breadcrumb />
      <div className="px-4 pt-2 pb-3">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>
          📝 Catatan Belajar
        </h1>
        <p className="text-gray-500 text-xs mt-1">
          Catat topik sekolah, progres, atau rencana sesi berikutnya per murid
        </p>
      </div>

      {/* Search */}
      <div className="px-4 mb-3">
        <input
          type="search"
          placeholder="Cari murid atau mata pelajaran..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-full"
        />
      </div>

      {/* Student list with notes */}
      <div className="px-4 space-y-3">
        {sorted.length === 0 && (
          <p className="text-center text-gray-400 py-8">
            {search ? "Tidak ada murid yang cocok." : "Belum ada murid aktif. Tambahkan di halaman Murid."}
          </p>
        )}

        {sorted.map((s) => {
          const content = notes[s.id] ?? "";
          const isSaving = saving[s.id];
          // Find the saved note for timestamp
          const savedNote = savedNotes?.find((n) => n.studentId === s.id);

          return (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Student header */}
              <button
                onClick={() => navigate(`/students/${s.id}`)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {s.subjects.slice(0, 3).join(", ") || "Belum ada mapel"}
                  </p>
                </div>
                <span className="text-gray-300 text-sm">›</span>
              </button>

              {/* Note textarea */}
              <div className="px-4 pb-3 relative">
                <textarea
                  placeholder="Tulis catatan belajar... (contoh: topik sekolah, PR dari sekolah, progres, rencana sesi berikutnya)"
                  value={content}
                  onChange={(e) => debouncedSave(s.id, e.target.value)}
                  rows={3}
                  className="w-full text-sm rounded-xl border border-gray-200 p-3 resize-y focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-colors"
                />
                {/* Saving indicator + timestamp */}
                <div className="flex items-center justify-end gap-2 mt-1 min-h-[18px]">
                  {isSaving && (
                    <span className="text-[10px] text-blue-500 animate-pulse">menyimpan...</span>
                  )}
                  {!isSaving && content.trim() && savedNote?.updatedAt && (
                    <span className="text-[10px] text-gray-400">
                      Disimpan {formatRelative(savedNote.updatedAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const now = new Date(Date.now() + 7 * 3600000); // WIB
  const d = new Date(iso);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} jam lalu`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "kemarin";
  if (diffD < 7) return `${diffD} hari lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
