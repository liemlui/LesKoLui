import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  listStudents, listAllStudyNotes, saveStudyNote, getStudyNote,
  getRecentDoneSessions, getSettings,
} from "../db/repos";
import { draftStudyNote, estimateDraftStudyNoteCost } from "../lib/aiClient";
import type { Session } from "../db/types";
import Breadcrumb from "../components/Breadcrumb";
import Skeleton from "../components/Skeleton";

/**
 * CatatanBelajar — catatan belajar per murid.
 * Guru privat mencatat topik sekolah, progres, atau rencana sesi berikutnya.
 * Auto-save setelah 800ms berhenti mengetik.
 *
 * @component
 * @route /catatan
 */
export default function CatatanBelajar() {
  const navigate = useNavigate();
  const students = useLiveQuery(() => listStudents(true), []);
  const savedNotes = useLiveQuery(() => listAllStudyNotes(), []);
  const settings = useLiveQuery(() => getSettings(), []);

  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Session context per student
  const [recentSessions, setRecentSessions] = useState<Record<string, Session[]>>({});
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiError, setAiError] = useState<Record<string, string>>({});

  // Sync from DB on load
  useEffect(() => {
    if (!students || !savedNotes) return;
    const map: Record<string, string> = {};
    const noteMap = new Map(savedNotes.map((n) => [n.studentId, n.content]));
    for (const s of students) {
      map[s.id] = noteMap.get(s.id) ?? "";
      if (!noteMap.has(s.id)) {
        getStudyNote(s.id).then((n) => {
          if (n) setNotes((prev) => ({ ...prev, [s.id]: n.content }));
        });
      }
    }
    setNotes((prev) => ({ ...map, ...prev }));

    // Fetch recent sessions for context
    (async () => {
      const sessionsMap: Record<string, Session[]> = {};
      await Promise.all(
        students.map(async (s) => {
          try {
            const sessions = await getRecentDoneSessions(s.id, 5);
            // Only keep sessions with actual shortNotes
            sessionsMap[s.id] = sessions.filter((ses) => ses.shortNote?.trim());
          } catch {
            sessionsMap[s.id] = [];
          }
        })
      );
      setRecentSessions(sessionsMap);
    })();
  }, [students, savedNotes]);

  const debouncedSave = useCallback((studentId: string, content: string) => {
    const existing = timers.current.get(studentId);
    if (existing) clearTimeout(existing);

    setNotes((prev) => ({ ...prev, [studentId]: content }));

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

  const handleAiDraft = useCallback(async (studentId: string, studentName: string, subjects: string[]) => {
    if (!settings?.ai?.enabled || !settings.ai.apiKey) {
      setAiError((prev) => ({ ...prev, [studentId]: "AI belum diaktifkan di Pengaturan." }));
      return;
    }
    const sessions = recentSessions[studentId];
    if (!sessions || sessions.length === 0) {
      setAiError((prev) => ({ ...prev, [studentId]: "Tidak ada sesi dengan catatan untuk dirangkum." }));
      return;
    }

    setAiLoading((prev) => ({ ...prev, [studentId]: true }));
    setAiError((prev) => { const next = { ...prev }; delete next[studentId]; return next; });
    try {
      const result = await draftStudyNote({
        studentName,
        subjects,
        sessions: sessions.map((s) => ({
          date: s.date,
          shortNote: s.shortNote ?? "",
          topic: s.topic,
          mood: s.mood,
        })),
        existingNote: notes[studentId]?.trim() || undefined,
      });
      // Update local state + save to DB
      setNotes((prev) => ({ ...prev, [studentId]: result.content }));
      await saveStudyNote(studentId, result.content);
    } catch (err) {
      setAiError((prev) => ({ ...prev, [studentId]: (err as Error).message || "Gagal merangkum." }));
    } finally {
      setAiLoading((prev) => ({ ...prev, [studentId]: false }));
    }
  }, [settings, recentSessions, notes]);

  const toggleSessions = (studentId: string) => {
    setExpandedSessions((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const aiEnabled = settings?.ai?.enabled && settings.ai.apiKey;

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
          const isLoading = aiLoading[s.id];
          const error = aiError[s.id];
          const savedNote = savedNotes?.find((n) => n.studentId === s.id);
          const sessions = recentSessions[s.id] ?? [];
          const showSessions = expandedSessions[s.id] ?? false;
          const hasSessions = sessions.length > 0;

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

              {/* Session context — expandable chips */}
              {hasSessions && (
                <div className="px-4 pb-1">
                  <button
                    onClick={() => toggleSessions(s.id)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors py-1"
                  >
                    <span>{showSessions ? "▾" : "▸"}</span>
                    <span>
                      📋 {sessions.length} sesi terakhir
                    </span>
                  </button>
                  {showSessions && (
                    <div className="mb-2 space-y-1 max-h-32 overflow-y-auto">
                      {sessions.map((ses) => (
                        <div
                          key={ses.id}
                          className="text-[11px] text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5 leading-relaxed"
                        >
                          <span className="font-medium text-gray-600">
                            {new Date(ses.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}:
                          </span>{" "}
                          {ses.shortNote && ses.shortNote.length > 100
                            ? ses.shortNote.slice(0, 100) + "…"
                            : ses.shortNote}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Note textarea */}
              <div className="px-4 pb-3 relative">
                <textarea
                  placeholder="Tulis catatan belajar... (contoh: topik sekolah, PR dari sekolah, progres, rencana sesi berikutnya)"
                  value={content}
                  onChange={(e) => debouncedSave(s.id, e.target.value)}
                  rows={3}
                  className="w-full text-sm rounded-xl border border-gray-200 p-3 resize-y focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-colors"
                />

                {/* Error */}
                {error && (
                  <p className="text-[11px] text-red-500 mt-1">{error}</p>
                )}

                {/* Saving indicator + timestamp + AI button */}
                <div className="flex items-center justify-between gap-2 mt-1 min-h-[18px]">
                  <div className="flex items-center gap-2">
                    {isSaving && (
                      <span className="text-[10px] text-blue-500 animate-pulse">menyimpan...</span>
                    )}
                    {!isSaving && content.trim() && savedNote?.updatedAt && (
                      <span className="text-[10px] text-gray-400">
                        Disimpan {formatRelative(savedNote.updatedAt)}
                      </span>
                    )}
                  </div>

                  {/* AI Ringkas button */}
                  {aiEnabled && hasSessions && (
                    <button
                      onClick={() => handleAiDraft(s.id, s.name, s.subjects)}
                      disabled={isLoading}
                      className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-1 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                      title={`~Rp${Math.round(estimateDraftStudyNoteCost(sessions.length)).toLocaleString("id-ID")}`}
                    >
                      {isLoading ? (
                        <span className="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "✨ Ringkas"
                      )}
                      <span className="text-indigo-400">
                        ({sessions.length})
                      </span>
                    </button>
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
  // Bandingkan instan absolut (epoch ms). Tidak perlu konversi WIB — menambah
  // +7 jam ke "sekarang" justru membuat "x menit lalu" jadi "x+7 jam lalu".
  const now = Date.now();
  const d = new Date(iso);
  const diffMs = now - d.getTime();
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
