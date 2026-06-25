import { useState } from "react";
import type { Session, Student } from "../../db/types";
import { cancelSeriesSessions, updateSeriesSessions } from "../../db/repos";
import type { CancelMode, EditMode } from "../../db/repos";
import { dayLabel } from "../../lib/format";
import { DURATIONS } from "../../lib/calendar";
import Modal from "../../components/Modal";
import ClockTimePicker from "../../components/ClockTimePicker";

interface Props {
  target: Session;
  students: Student[];
  onClose: () => void;
  onResult: (msg: string) => void;
}

export default function EditSessionModal({ target, students, onClose, onResult }: Props) {
  const [studentId, setStudentId] = useState(target.studentId);
  const [date, setDate]           = useState(target.date);
  const [time, setTime]           = useState(target.time ?? "08:00");
  const [duration, setDuration]   = useState(target.durationHours);
  const [mode, setMode]           = useState<EditMode>("this");
  const [saving, setSaving]       = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const patch: Parameters<typeof updateSeriesSessions>[1] = {
        studentId: studentId || target.studentId,
        time,
        durationHours: duration,
      };
      // Date change only applies to "this" mode
      if (mode === "this" && date !== target.date) {
        (patch as Record<string, unknown>).date = date;
      }
      await updateSeriesSessions({ id: target.id, seriesId: target.seriesId, date: target.date }, patch, mode);
      onResult("Jadwal diperbarui ✓");
      onClose();
    } catch (e) { onResult("Gagal: " + (e as Error).message); }
    finally { setSaving(false); }
  };

  const handleCancel = async (cancelMode: CancelMode) => {
    await cancelSeriesSessions({ id: target.id, seriesId: target.seriesId, date: target.date }, cancelMode);
    onResult("Jadwal dibatalkan.");
    onClose();
  };

  return (
    <Modal onClose={onClose} ariaLabel="Edit jadwal"
      panelClassName="bg-white w-full max-w-md rounded-t-2xl pb-8 max-h-[92vh] overflow-y-auto overflow-x-hidden outline-none">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="font-bold text-lg">Edit Jadwal</h3>
          <p className="text-xs text-gray-400">{dayLabel(target.date)}{target.seriesId ? " · Sesi berulang 🔁" : ""}</p>
        </div>
        <button aria-label="Tutup" onClick={onClose} className="text-gray-400 text-xl leading-none">✕</button>
      </div>

      <div className="p-5 space-y-4">
        {/* Murid */}
        <div>
          <label className="label">Murid</label>
          <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Tanggal — hanya bisa edit untuk mode "this" */}
        <div>
          <label className="label">
            Tanggal
            {target.seriesId && mode !== "this" && (
              <span className="ml-2 text-xs text-gray-400 font-normal">(tanggal hanya bisa diubah untuk sesi ini saja)</span>
            )}
          </label>
          <input className="input" type="date" value={date}
            disabled={!!target.seriesId && mode !== "this"}
            onChange={(e) => setDate(e.target.value)} />
        </div>

        {/* Jam */}
        <div>
          <label className="label">Jam Mulai</label>
          <ClockTimePicker value={time} onChange={setTime} />
        </div>

        {/* Durasi */}
        <div>
          <label className="label">Durasi</label>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button key={d} type="button"
                onClick={() => setDuration(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${duration === d ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}>
                {d}j
              </button>
            ))}
          </div>
        </div>

        {/* Mode (hanya jika ada seri) */}
        {target.seriesId && (
          <div>
            <label className="label">Ubah untuk</label>
            <div className="grid grid-cols-3 gap-2">
              {(["this", "future", "all"] as EditMode[]).map((m) => (
                <button key={m} onClick={() => { setMode(m); if (m !== "this") setDate(target.date); }}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${mode === m ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                  {m === "this" ? "Sesi ini" : m === "future" ? "Ini & berikutnya" : "Semua seri"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Save */}
        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>

        {/* Cancel section */}
        <div className="border-t border-gray-100 pt-3">
          {!showCancel ? (
            <button onClick={() => setShowCancel(true)}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors">
              Batalkan Jadwal Ini
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-red-600 mb-2">Batalkan jadwal — pilih scope:</p>
              {target.seriesId ? (
                <>
                  <button onClick={() => handleCancel("this")}
                    className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-medium border border-gray-200">
                    Sesi ini saja ({dayLabel(target.date).split(",")[1]?.trim()})
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
              <button onClick={() => setShowCancel(false)} className="w-full text-center text-gray-400 text-sm py-1">
                Jangan batalkan
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
