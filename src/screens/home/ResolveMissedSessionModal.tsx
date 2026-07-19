import { useState } from "react";
import type { Session } from "../../db/types";
import { cancelSession, markSessionNoShow, rescheduleSession } from "../../db/repos";
import { dayLabel, todayWIB } from "../../lib/format";
import { DURATIONS } from "../../lib/calendar";
import Modal from "../../components/Modal";
import ClockTimePicker from "../../components/ClockTimePicker";

type Resolution = "reschedule" | "no-show" | "cancel";

interface Props {
  session: Session;
  studentName: string;
  onClose: () => void;
  onResult: (message: string) => void;
}

/**
 * Resolves a missed appointment without losing its original history.
 * The new replacement session is deliberately a one-off: a recurring series
 * continues unchanged while this exception remains visible in audit history.
 */
export default function ResolveMissedSessionModal({ session, studentName, onClose, onResult }: Props) {
  const [resolution, setResolution] = useState<Resolution>("reschedule");
  const [date, setDate]             = useState(todayWIB());
  const [time, setTime]             = useState(session.time ?? "08:00");
  const [duration, setDuration]     = useState(session.durationHours);
  const [reason, setReason]         = useState("");
  const [billable, setBillable]     = useState(false);
  const [saving, setSaving]         = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (resolution === "reschedule") {
        await rescheduleSession(session.id, { date, time, durationHours: duration, reason });
        onResult("Sesi dijadwalkan ulang ✓");
      } else if (resolution === "no-show") {
        await markSessionNoShow(session.id, { reason, billable });
        onResult(billable ? "Tidak hadir ditandai — tetap ditagihkan." : "Tidak hadir ditandai — tidak ditagihkan.");
      } else {
        await cancelSession(session.id, reason);
        onResult("Sesi dibatalkan.");
      }
      onClose();
    } catch (e) {
      onResult("Gagal: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const optionClass = (value: Resolution, active: string, idle: string) =>
    `text-left rounded-xl border p-3 transition-colors ${resolution === value ? active : idle}`;

  return (
    <Modal onClose={onClose} ariaLabel="Kelola sesi terlewat">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-lg">Kelola Sesi Terlewat</h3>
          <p className="text-sm text-gray-500 mt-0.5">{studentName} · {dayLabel(session.date)}</p>
        </div>
        <button aria-label="Tutup" onClick={onClose} className="text-gray-400 text-xl leading-none">✕</button>
      </div>

      <p className="text-xs text-gray-400 -mt-2">Pilih hasil sesi ini. Riwayat jadwal asal tetap tersimpan.</p>

      <div className="grid gap-2">
        <button type="button" onClick={() => setResolution("reschedule")}
          className={optionClass("reschedule", "bg-blue-50 border-blue-500 text-blue-800", "bg-white border-gray-200 text-gray-700")}>
          <span className="block text-sm font-semibold">📅 Jadwalkan ulang</span>
          <span className="block text-xs mt-0.5 opacity-70">Buat jadwal pengganti; sesi asal tidak ditagihkan.</span>
        </button>
        <button type="button" onClick={() => setResolution("no-show")}
          className={optionClass("no-show", "bg-orange-50 border-orange-500 text-orange-800", "bg-white border-gray-200 text-gray-700")}>
          <span className="block text-sm font-semibold">🚫 Murid tidak hadir</span>
          <span className="block text-xs mt-0.5 opacity-70">Catat no-show dan tentukan kebijakan tagihannya.</span>
        </button>
        <button type="button" onClick={() => setResolution("cancel")}
          className={optionClass("cancel", "bg-red-50 border-red-500 text-red-700", "bg-white border-gray-200 text-gray-700")}>
          <span className="block text-sm font-semibold">Batalkan sesi</span>
          <span className="block text-xs mt-0.5 opacity-70">Tidak dijadwalkan ulang dan tidak ditagihkan.</span>
        </button>
      </div>

      {resolution === "reschedule" && (
        <div className="space-y-4 rounded-xl bg-blue-50/60 border border-blue-100 p-3">
          <div>
            <label className="label">Tanggal pengganti</label>
            <input className="input" type="date" min={todayWIB()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Jam mulai</label>
            <ClockTimePicker value={time} onChange={setTime} />
          </div>
          <div>
            <label className="label">Durasi</label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button key={d} type="button" onClick={() => setDuration(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${duration === d ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}>
                  {d}j
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {resolution === "no-show" && (
        <div className="rounded-xl bg-orange-50 border border-orange-200 p-3">
          <p className="text-sm font-semibold text-orange-800">Kebijakan tagihan</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button type="button" onClick={() => setBillable(false)}
              className={`rounded-lg border px-2 py-2 text-xs font-semibold ${!billable ? "bg-white border-orange-500 text-orange-700" : "border-orange-100 text-orange-500"}`}>
              Gratis / tidak tagih
            </button>
            <button type="button" onClick={() => setBillable(true)}
              className={`rounded-lg border px-2 py-2 text-xs font-semibold ${billable ? "bg-orange-600 border-orange-600 text-white" : "border-orange-100 text-orange-600"}`}>
              Tetap tagihkan
            </button>
          </div>
          <p className="text-xs text-orange-700 mt-2">
            {billable ? "Biaya sesi ini akan masuk ke tagihan bulan berjalan." : "Biaya sesi ini tidak akan masuk ke tagihan."}
          </p>
        </div>
      )}

      <div>
        <label className="label">Alasan <span className="text-gray-400 font-normal">(opsional)</span></label>
        <textarea className="input min-h-20 resize-y" value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder={resolution === "no-show" ? "Contoh: murid sakit / tidak ada kabar" : resolution === "reschedule" ? "Contoh: permintaan orang tua" : "Contoh: libur sekolah"} />
      </div>

      <button onClick={handleSave} disabled={saving} className={`w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50 ${resolution === "cancel" ? "bg-red-600" : resolution === "no-show" ? "bg-orange-600" : "bg-blue-600"}`}>
        {saving ? "Menyimpan..." : resolution === "reschedule" ? "Simpan Jadwal Pengganti" : resolution === "no-show" ? "Simpan Status Tidak Hadir" : "Batalkan Sesi"}
      </button>
    </Modal>
  );
}
