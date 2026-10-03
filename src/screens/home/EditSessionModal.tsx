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
  const [cancelReason, setCancelReason] = useState("");

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
    await cancelSeriesSessions({ id: target.id, seriesId: target.seriesId, date: target.date }, cancelMode, cancelReason);
    onResult("Jadwal dibatalkan.");
    onClose();
  };

  return (
    <Modal onClose={onClose} ariaLabel="Edit jadwal" showCloseButton={false}
      panelClassName="bg-[var(--surface-strong)] w-full max-w-md rounded-t-2xl pb-8 max-h-[92vh] overflow-y-auto overflow-x-hidden outline-none">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <div>
          <h3 className="font-bold text-lg">Edit Jadwal</h3>
          <p className="text-xs text-[var(--ink-muted)]">{dayLabel(target.date)}{target.seriesId ? " · Sesi berulang 🔁" : ""}</p>
        </div>
        <button aria-label="Tutup" onClick={onClose} className="text-[var(--ink-muted)] hover:text-[var(--ink-muted)] text-xl w-10 h-10 flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>

      <div className="p-5 space-y-4">
        {/* Murid */}
        <div>
          <label htmlFor="esm-murid" className="label">Murid</label>
          <select id="esm-murid" className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Tanggal — hanya bisa edit untuk mode "this" */}
        <div>
          <label htmlFor="esm-tanggal" className="label">
            Tanggal
            {target.seriesId && mode !== "this" && (
              <span className="ml-2 text-xs text-[var(--ink-muted)] font-normal">(tanggal hanya bisa diubah untuk sesi ini saja)</span>
            )}
          </label>
          <input id="esm-tanggal" className="input" type="date" value={date}
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
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${duration === d ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]" : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)]"}`}>
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
                  className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${mode === m ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]" : "bg-[var(--surface)] text-[var(--ink-muted)] border-[var(--border)]"}`}>
                  {m === "this" ? "Sesi ini" : m === "future" ? "Ini & berikutnya" : "Semua seri"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Save */}
        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] font-semibold hover:bg-[var(--brand-solid)] disabled:opacity-50 transition-colors">
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>

        {/* Cancel section */}
        <div className="border-t border-[var(--border)] pt-3">
          {!showCancel ? (
            <button onClick={() => setShowCancel(true)}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-[var(--ink-danger)] bg-[var(--bg-danger)] hover:bg-[var(--bg-danger)] transition-colors">
              Batalkan Jadwal Ini
            </button>
          ) : (
            <div className="space-y-2">
              <label htmlFor="esm-alasan" className="text-sm font-semibold text-[var(--ink-danger)] mb-2 block">Batalkan jadwal — pilih scope:</label>
              <textarea id="esm-alasan" className="input min-h-20 resize-y text-sm" value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)} placeholder="Alasan pembatalan (opsional)" />
              {target.seriesId ? (
                <>
                  <button onClick={() => handleCancel("this")}
                    className="w-full text-left px-4 py-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--bg-subtle)] text-sm font-medium border border-[var(--border)]">
                    Sesi ini saja ({dayLabel(target.date).split(",")[1]?.trim()})
                  </button>
                  <button onClick={() => handleCancel("future")}
                    className="w-full text-left px-4 py-3 rounded-xl bg-[var(--bg-attention)] text-sm font-medium text-[var(--ink-attention)] border border-[var(--border-attention)] hover:bg-[var(--bg-attention)]">
                    Hari ini dan semua sesi berikutnya
                  </button>
                  <button onClick={() => handleCancel("all")}
                    className="w-full text-left px-4 py-3 rounded-xl bg-[var(--bg-danger)] text-sm font-medium text-[var(--ink-danger)] border border-[var(--border-danger)] hover:bg-[var(--bg-danger)]">
                    Semua sesi dalam seri ini
                  </button>
                </>
              ) : (
                <button onClick={() => handleCancel("this")}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-danger)] text-[var(--ink-danger)] font-medium text-sm border border-[var(--border-danger)]">
                  Ya, batalkan sesi ini
                </button>
              )}
              <button onClick={() => setShowCancel(false)} className="w-full text-center text-[var(--ink-muted)] text-sm py-1">
                Jangan batalkan
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
