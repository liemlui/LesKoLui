import { useEffect, useState } from "react";
import type { Student } from "../../db/types";
import { MIN_DURATION } from "../../db/types";
import { findConflicts, scheduleBatch, scheduleSession } from "../../db/repos";
import { dayLabel } from "../../lib/format";
import { DOW_LABELS, DURATIONS, getDatesForWeekdays } from "../../lib/calendar";
import Modal from "../../components/Modal";
import ClockTimePicker from "../../components/ClockTimePicker";
import Toggle from "../../components/Toggle";

interface Props {
  date: string;
  students: Student[];
  onClose: () => void;
  onResult: (msg: string) => void;
}

export default function AddScheduleModal({ date, students, onClose, onResult }: Props) {
  const [studentId, setStudentId] = useState("");
  const [time, setTime]           = useState("08:00");
  const [duration, setDuration]   = useState(MIN_DURATION);
  const [repeat, setRepeat]       = useState(false);
  const [weekdays, setWeekdays]   = useState<number[]>(() => [new Date(date + "T00:00:00").getDay()]);
  const [conflicts, setConflicts] = useState<{ date: string; studentName: string; time: string }[]>([]);
  const [saving, setSaving]       = useState(false);

  // Conflict check covers single sessions too (not just repeating ones).
  const checkConflicts = async (wd: number[], t: string, dur: number, rep: boolean) => {
    if (!t) { setConflicts([]); return; }
    let dates: string[];
    if (rep) {
      if (wd.length === 0) { setConflicts([]); return; }
      dates = getDatesForWeekdays(date, wd).slice(0, 52);
    } else {
      dates = [date];
    }
    setConflicts(await findConflicts(dates, t, dur));
  };

  // Check the (single) default date as soon as the modal opens.
  useEffect(() => {
    let active = true;
    findConflicts([date], time, duration).then((c) => { if (active) setConflicts(c); });
    return () => { active = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!studentId) { onResult("Pilih murid dulu."); return; }
    setSaving(true);
    try {
      if (repeat && weekdays.length > 0) {
        const dates = getDatesForWeekdays(date, weekdays);
        const n = await scheduleBatch(dates.map((d) => ({ studentId, date: d, time, durationHours: duration })));
        onResult(`${n} jadwal dibuat ✓`);
      } else {
        await scheduleSession({ studentId, date, time, durationHours: duration });
        onResult("Jadwal ditambahkan ✓");
      }
      onClose();
    } catch (e) { onResult("Gagal: " + (e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} ariaLabel="Jadwalkan sesi" showCloseButton={false}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">Jadwalkan Sesi</h3>
        <button aria-label="Tutup" onClick={onClose} className="text-[var(--ink-muted)] text-xl leading-none"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>
      <p className="text-sm text-[var(--ink-muted)] -mt-2">{dayLabel(date)}</p>

      <div>
        <label htmlFor="as-murid" className="label">Murid</label>
        <select id="as-murid" className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">Pilih murid...</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Jam Mulai</label>
        <ClockTimePicker value={time}
          onChange={(v) => { setTime(v); void checkConflicts(weekdays, v, duration, repeat); }} />
      </div>
      <div>
        <label className="label">Durasi</label>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button key={d} type="button"
              onClick={() => { setDuration(d); void checkConflicts(weekdays, time, d, repeat); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${duration === d ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]" : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)]"}`}>
              {d}j
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Toggle checked={repeat} onChange={(v) => { setRepeat(v); void checkConflicts(weekdays, time, duration, v); }} label="Ulangi setiap minggu" />
        <span className="text-sm font-medium text-[var(--ink-strong)]">Ulangi setiap minggu (selamanya)</span>
      </div>
      {repeat && (
        <div>
          <label className="label">Hari yang diulang</label>
          <div className="flex gap-2 flex-wrap">
            {DOW_LABELS.map((label, dow) => (
              <button key={dow} type="button"
                onClick={() => {
                  const next = weekdays.includes(dow) ? weekdays.filter((x) => x !== dow) : [...weekdays, dow];
                  setWeekdays(next); void checkConflicts(next, time, duration, repeat);
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${weekdays.includes(dow) ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]" : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)]"}`}>
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--ink-muted)] mt-1.5">Jadwal otomatis dibuat ~1 tahun ke depan</p>
        </div>
      )}
      {conflicts.length > 0 && (
        <div className="bg-[var(--bg-attention)] border border-[var(--border-attention)] rounded-xl p-3">
          <p className="text-sm font-semibold text-[var(--ink-attention)] mb-1">⚠️ Berpotensi tabrakan</p>
          {/* B-02: peringatan bentrok tidak boleh murni informatif — ia harus
              menyebut jumlahnya dan menyebut cakupannya dengan istilah yang sama
              seperti ManageSessionSheet ("Sesi ini saja" / "Hari ini dan semua sesi
              berikutnya"), supaya tutor tahu apa yang benar-benar ia simpan. */}
          <p className="text-xs text-[var(--ink-attention)] mb-1">
            Bentrok dengan {conflicts.length} sesi lain pada jam ini
            {repeat ? " — hari ini dan semua sesi berikutnya." : "."}
          </p>
          {conflicts.slice(0, 4).map((c, i) => (
            <p key={i} className="text-xs text-[var(--ink-attention)]">{c.date} {c.time} — {c.studentName}</p>
          ))}
          {conflicts.length > 4 && <p className="text-xs text-[var(--ink-attention)]">+{conflicts.length - 4} lainnya</p>}
        </div>
      )}
      <button onClick={handleSave} disabled={saving}
        className={conflicts.length > 0
          ? "w-full py-3 rounded-xl font-semibold bg-[var(--bg-attention-strong)] text-[var(--on-strong)] hover:bg-[var(--bg-attention-strong)] disabled:opacity-50 transition-colors"
          : "btn-primary w-full py-3 font-semibold"}>
        {saving
          ? "Menyimpan..."
          : conflicts.length > 0
            ? `Tetap simpan (${conflicts.length} bentrok)`
            : repeat ? "Buat Jadwal Berulang" : "Simpan Jadwal"}
      </button>
    </Modal>
  );
}
