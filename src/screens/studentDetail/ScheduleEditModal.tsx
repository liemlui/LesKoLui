import { useState } from "react";
import type { Session } from "../../db/types";
import type { CancelMode, EditMode } from "../../db/repos";
import { cancelSeriesSessions, updateSeriesSessions } from "../../db/repos";
import { dayLabel } from "../../lib/format";
import { Z } from "../../lib/zIndex";
import ClockTimePicker from "../../components/ClockTimePicker";

/** Pilihan durasi, sama dengan layar Catat Sesi. */
const DURATIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];

interface ScheduleEditModalProps {
  session: Session;
  notify: (text: string) => void;
  onClose: () => void;
}

/**
 * Modal "Edit Jadwal" — dipindahkan dari `StudentDetail.tsx` (G3-06 fase A).
 *
 * Delapan `useState` dan kedua handler-nya (`handleSaveEdit`, `handleCancel`)
 * ikut pindah. Induknya hanya menyimpan JADWAL MANA yang sedang disunting.
 *
 * Dua aturan yang harus dijaga saat menyunting berkas ini:
 *
 * - **Sesi berulang (`seriesId`) mengubah tanggal hanya untuk "Sesi ini".**
 *   Memilih "Ini & berikutnya" atau "Semua seri" mengunci kolom tanggal kembali
 *   ke tanggal asal, karena pergeseran tanggal seluruh seri bukan yang diminta
 *   tutor di sini; jam dan durasi yang berlaku untuk semua mode.
 * - **Pembatalan memakai `cancelSeriesSessions`** dengan mode yang dipilih tutor
 *   (`this` / `future` / `all`), bukan penghapusan sesi.
 */
export default function ScheduleEditModal({ session, notify, onClose }: ScheduleEditModalProps) {
  const [date, setDate]             = useState(session.date);
  const [time, setTime]             = useState(session.time ?? "08:00");
  const [duration, setDuration]     = useState(session.durationHours);
  const [mode, setMode]             = useState<EditMode>("this");
  const [saving, setSaving]         = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const handleSave = async () => {
    setSaving(true);
    try {
      const patch: Parameters<typeof updateSeriesSessions>[1] = { time, durationHours: duration };
      if (mode === "this" && date !== session.date) (patch as Record<string, unknown>).date = date;
      await updateSeriesSessions(
        { id: session.id, seriesId: session.seriesId, date: session.date },
        patch,
        mode,
      );
      notify("Jadwal diperbarui ✓");
      onClose();
    } catch (e) {
      notify("Gagal: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (cancelMode: CancelMode) => {
    await cancelSeriesSessions(
      { id: session.id, seriesId: session.seriesId, date: session.date },
      cancelMode,
      cancelReason,
    );
    notify("Jadwal dibatalkan.");
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit jadwal"
      className={`fixed inset-0 bg-[var(--scrim)]/40 ${Z.modal} flex items-end justify-center`}
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface-strong)] w-full max-w-md rounded-t-2xl pb-8 max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <h3 className="font-bold text-lg">Edit Jadwal</h3>
            <p className="text-xs text-[var(--ink-muted)]">{dayLabel(session.date)}{session.seriesId ? " · Sesi berulang 🔁" : ""}</p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="text-[var(--ink-muted)] text-xl">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label htmlFor="sd-tanggal" className="label">Tanggal{session.seriesId && mode !== "this" && <span className="ml-2 text-xs text-[var(--ink-muted)] font-normal">(hanya bisa diubah untuk sesi ini saja)</span>}</label>
            <input id="sd-tanggal" className="input" type="date" value={date}
              disabled={!!session.seriesId && mode !== "this"}
              onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Jam Mulai</label>
            <ClockTimePicker value={time} onChange={setTime} />
          </div>
          <div>
            <label className="label">Durasi</label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button key={d} type="button" onClick={() => setDuration(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${duration === d ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]" : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)]"}`}>
                  {d}j
                </button>
              ))}
            </div>
          </div>
          {session.seriesId && (
            <div>
              <label className="label">Ubah untuk</label>
              <div className="grid grid-cols-3 gap-2">
                {(["this", "future", "all"] as EditMode[]).map((m) => (
                  <button key={m} onClick={() => { setMode(m); if (m !== "this") setDate(session.date); }}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${mode === m ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]" : "bg-[var(--surface)] text-[var(--ink-muted)] border-[var(--border)]"}`}>
                    {m === "this" ? "Sesi ini" : m === "future" ? "Ini & berikutnya" : "Semua seri"}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] font-semibold hover:bg-[var(--brand-solid)] disabled:opacity-50 transition-colors">
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
          <div className="border-t border-[var(--border)] pt-3">
            {!showCancel ? (
              <button onClick={() => setShowCancel(true)}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-[var(--ink-danger)] bg-[var(--bg-danger)] hover:bg-[var(--bg-danger)] transition-colors">
                Batalkan Jadwal Ini
              </button>
            ) : (
              <div className="space-y-2">
                <label htmlFor="sd-alasan" className="text-sm font-semibold text-[var(--ink-danger)] mb-2 block">Batalkan — pilih scope:</label>
                <textarea id="sd-alasan" className="input min-h-20 resize-y text-sm" value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)} placeholder="Alasan pembatalan (opsional)" />
                {session.seriesId ? (
                  <>
                    <button onClick={() => handleCancel("this")} className="w-full text-left px-4 py-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--bg-subtle)] text-sm font-medium border border-[var(--border)]">Sesi ini saja</button>
                    <button onClick={() => handleCancel("future")} className="w-full text-left px-4 py-3 rounded-xl bg-[var(--bg-attention)] text-sm font-medium text-[var(--ink-attention)] border border-[var(--border-attention)]">Hari ini dan semua sesi berikutnya</button>
                    <button onClick={() => handleCancel("all")} className="w-full text-left px-4 py-3 rounded-xl bg-[var(--bg-danger)] text-sm font-medium text-[var(--ink-danger)] border border-[var(--border-danger)]">Semua sesi dalam seri ini</button>
                  </>
                ) : (
                  <button onClick={() => handleCancel("this")} className="w-full px-4 py-3 rounded-xl bg-[var(--bg-danger)] text-[var(--ink-danger)] font-medium text-sm border border-[var(--border-danger)]">Ya, batalkan sesi ini</button>
                )}
                <button onClick={() => setShowCancel(false)} className="w-full text-center text-[var(--ink-muted)] text-sm py-1">Jangan batalkan</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
