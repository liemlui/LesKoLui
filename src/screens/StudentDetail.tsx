import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getStudent, listSessionsByStudent, listScheduledForStudent,
  cancelSeriesSessions, updateSeriesSessions,
} from "../db/repos";
import type { CancelMode, EditMode } from "../db/repos";
import { dayLabel, monthLabel, monthOf, todayWIB } from "../lib/format";
import type { Session } from "../db/types";

const DURATIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4];

export default function StudentDetail() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const today      = todayWIB();

  const student        = useLiveQuery(() => (id ? getStudent(id) : undefined), [id]);
  const allSessions    = useLiveQuery(() => (id ? listSessionsByStudent(id) : []), [id]);
  const upcomingSched  = useLiveQuery(() => (id ? listScheduledForStudent(id, today) : []), [id, today]);

  // Edit scheduled session modal state
  const [editTarget,       setEditTarget]       = useState<Session | null>(null);
  const [editDate,         setEditDate]         = useState("");
  const [editTime,         setEditTime]         = useState("");
  const [editDuration,     setEditDuration]     = useState(1);
  const [editMode,         setEditMode]         = useState<EditMode>("this");
  const [editSaving,       setEditSaving]       = useState(false);
  const [showCancelSect,   setShowCancelSect]   = useState(false);
  const [flash,            setFlash]            = useState("");

  const byMonth = useMemo(() => {
    const map = new Map<string, { sessions: Session[]; totalHours: number }>();
    (allSessions ?? []).forEach((s) => {
      const m    = monthOf(s.date);
      const curr = map.get(m) ?? { sessions: [], totalHours: 0 };
      curr.sessions.push(s);
      curr.totalHours += s.durationHours;
      map.set(m, curr);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [allSessions]);

  const totalSessions = allSessions?.length ?? 0;
  const totalHours    = useMemo(() => (allSessions ?? []).reduce((s, x) => s + x.durationHours, 0), [allSessions]);

  function msg(t: string) { setFlash(t); setTimeout(() => setFlash(""), 3000); }

  const openEditSched = (s: Session) => {
    setEditTarget(s);
    setEditDate(s.date);
    setEditTime(s.time ?? "08:00");
    setEditDuration(s.durationHours);
    setEditMode("this");
    setShowCancelSect(false);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      const patch: Parameters<typeof updateSeriesSessions>[1] = {
        time: editTime,
        durationHours: editDuration,
      };
      if (editMode === "this" && editDate !== editTarget.date) {
        (patch as Record<string, unknown>).date = editDate;
      }
      await updateSeriesSessions(
        { id: editTarget.id, seriesId: editTarget.seriesId, date: editTarget.date },
        patch, editMode
      );
      msg("Jadwal diperbarui ✓");
      setEditTarget(null);
    } catch (e) { msg("Gagal: " + (e as Error).message); }
    finally { setEditSaving(false); }
  };

  const handleCancel = async (mode: CancelMode) => {
    if (!editTarget) return;
    await cancelSeriesSessions({ id: editTarget.id, seriesId: editTarget.seriesId, date: editTarget.date }, mode);
    setEditTarget(null);
    msg("Jadwal dibatalkan.");
  };

  if (!student) return <div className="p-4 text-gray-500">Memuat...</div>;

  return (
    <div className="p-4 space-y-4 pb-24">

      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors">
        ‹ Kembali ke Daftar Murid
      </button>

      {flash && (
        <div className={`p-2 rounded-lg text-sm text-center font-medium ${flash.includes("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {flash}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{student.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {student.level}{student.subjects.length > 0 ? ` · ${student.subjects.join(", ")}` : ""}
          </p>
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
          <span className="text-gray-700 font-medium">{student.parentContact.name || "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400 w-28 flex-shrink-0">WA Ortu</span>
          <a href={`https://wa.me/${student.parentContact.phone.replace(/^0/, "62").replace(/[^0-9]/g, "")}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-green-600 font-medium hover:text-green-700">
            <span>💬</span>{student.parentContact.phone}
          </a>
        </div>
        {student.studentPhone && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400 w-28 flex-shrink-0">WA Murid</span>
            <a href={`https://wa.me/${student.studentPhone.replace(/^0/, "62").replace(/[^0-9]/g, "")}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-blue-600 font-medium hover:text-blue-700">
              <span>💬</span>{student.studentPhone}
            </a>
          </div>
        )}
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

      {/* ── JADWAL MENDATANG ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Jadwal Mendatang</h2>
          <span className="text-xs text-gray-400 font-medium">{(upcomingSched ?? []).length} jadwal</span>
        </div>
        {(upcomingSched ?? []).length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-6 text-center">
            <p className="text-2xl mb-1">📅</p>
            <p className="text-sm text-gray-400">Belum ada jadwal mendatang</p>
            <p className="text-xs text-gray-300 mt-0.5">Buat jadwal dari kalender</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(upcomingSched ?? []).map((s) => {
              const isToday   = s.date === today;
              const isSeries  = !!s.seriesId;
              return (
                <div key={s.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:border-blue-200 transition-colors"
                  onClick={() => openEditSched(s)}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {isToday && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">Hari ini</span>}
                      {isSeries && <span className="text-xs text-gray-400">🔁 Rutin</span>}
                    </div>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{dayLabel(s.date)}</p>
                    <p className="text-xs text-gray-400">
                      {s.time ? `${s.time} · ` : ""}{s.durationHours} jam
                    </p>
                  </div>
                  <span className="text-gray-300 text-xs flex-shrink-0">✏️ Edit</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── RIWAYAT SESI ── */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Riwayat Sesi</h2>
        {byMonth.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
            <p className="text-3xl mb-2">📚</p>
            <p className="text-gray-400 text-sm">Belum ada sesi yang dicatat.</p>
            <button onClick={() => navigate("/capture")}
              className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold">
              Catat Sesi Pertama
            </button>
          </div>
        ) : (
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
        )}
      </div>

      {/* ── EDIT SCHEDULE MODAL ── */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end" onClick={() => setEditTarget(null)}>
          <div className="bg-white w-full rounded-t-2xl pb-8 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-lg">Edit Jadwal</h3>
                <p className="text-xs text-gray-400">
                  {dayLabel(editTarget.date)}{editTarget.seriesId ? " · Sesi berulang 🔁" : ""}
                </p>
              </div>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 text-xl">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Tanggal */}
              <div>
                <label className="label">
                  Tanggal
                  {editTarget.seriesId && editMode !== "this" && (
                    <span className="ml-2 text-xs text-gray-400 font-normal">(hanya bisa diubah untuk sesi ini saja)</span>
                  )}
                </label>
                <input className="input" type="date" value={editDate}
                  disabled={!!editTarget.seriesId && editMode !== "this"}
                  onChange={(e) => setEditDate(e.target.value)} />
              </div>

              {/* Jam */}
              <div>
                <label className="label">Jam Mulai</label>
                <input className="input" type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
              </div>

              {/* Durasi */}
              <div>
                <label className="label">Durasi</label>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <button key={d} type="button" onClick={() => setEditDuration(d)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${editDuration === d ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}>
                      {d}j
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode — hanya untuk seri */}
              {editTarget.seriesId && (
                <div>
                  <label className="label">Ubah untuk</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["this", "future", "all"] as EditMode[]).map((m) => (
                      <button key={m} onClick={() => { setEditMode(m); if (m !== "this") setEditDate(editTarget.date); }}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${editMode === m ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                        {m === "this" ? "Sesi ini" : m === "future" ? "Ini & berikutnya" : "Semua seri"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={handleSaveEdit} disabled={editSaving}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {editSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>

              {/* Cancel section */}
              <div className="border-t border-gray-100 pt-3">
                {!showCancelSect ? (
                  <button onClick={() => setShowCancelSect(true)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors">
                    Batalkan Jadwal Ini
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-red-600 mb-2">Batalkan — pilih scope:</p>
                    {editTarget.seriesId ? (
                      <>
                        <button onClick={() => handleCancel("this")}
                          className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-medium border border-gray-200">
                          Sesi ini saja
                        </button>
                        <button onClick={() => handleCancel("future")}
                          className="w-full text-left px-4 py-3 rounded-xl bg-orange-50 text-sm font-medium text-orange-700 border border-orange-200 hover:bg-orange-100">
                          Hari ini dan semua sesi berikutnya
                        </button>
                        <button onClick={() => handleCancel("all")}
                          className="w-full text-left px-4 py-3 rounded-xl bg-red-50 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-100">
                          Semua sesi dalam seri ini
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleCancel("this")}
                        className="w-full px-4 py-3 rounded-xl bg-red-50 text-red-600 font-medium text-sm border border-red-200">
                        Ya, batalkan sesi ini
                      </button>
                    )}
                    <button onClick={() => setShowCancelSect(false)} className="w-full text-center text-gray-400 text-sm py-1">
                      Jangan batalkan
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
