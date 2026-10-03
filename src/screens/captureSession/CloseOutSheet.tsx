import { useState } from "react";
import Modal from "../../components/Modal";
import PaginationControls from "../../components/PaginationControls";
import { dayLabel } from "../../lib/format";
import { clampPage, paginateItems } from "../../lib/pagination";
import { PencilIcon, ChatIcon } from "../../components/icons";

interface CloseOutSheetProps {
  studentName: string;
  parentName: string;
  session: { id: string; date: string; subjects: string[]; durationHours: number; shortNote: string; topic?: string; topicUnit?: string };
  followUps: Array<{ id: string; text: string }>;
  followUpText: string;
  setFollowUpText: (v: string) => void;
  saving: boolean;
  waNumber: string;
  originalWaMessage: string;
  aiWaText: string | null;
  onAddFollowUp: () => void;
  onDeleteFollowUp: (id: string) => void;
  onDone: () => void;
  onClose: () => void;
  onFixNote: () => void;
  onPolishWa: () => void;
  aiWaEnabled: boolean;
  aiWaLoading: boolean;
  aiError: string | null;
  onClearAiWa: () => void;
  /**
   * Audit Q16d: kegagalan menyimpan tindak lanjut ditampilkan DI DALAM modal ini.
   * Banner halaman tidak bisa dipakai karena `Modal` mengunci fokus di dalam
   * dialog — tombol "Coba lagi" di luar dialog tidak terjangkau keyboard.
   */
  closeOutError: string | null;
  /** Ulangi aksi yang gagal (menyimpan tindak lanjut), bukan menyimpan sesi lagi. */
  onRetry: () => void;
  engagement?: { score: number; color: string; background: string; text: string; narrative: string };
}

/** Laporan sesi pasca-simpan yang sebelumnya dirender oleh CaptureSession. */
export default function CloseOutSheet({
  studentName, parentName, session, followUps, followUpText, setFollowUpText,
  saving, waNumber, originalWaMessage, aiWaText, onAddFollowUp, onDeleteFollowUp,
  onDone, onClose, onFixNote, onPolishWa, aiWaEnabled, aiWaLoading, aiError,
  onClearAiWa, closeOutError, onRetry, engagement,
}: CloseOutSheetProps) {
  const [followUpPage, setFollowUpPage] = useState(1);
  const safeFollowUpPage = clampPage(followUpPage, followUps.length);
  const paginatedFollowUps = paginateItems(followUps, safeFollowUpPage);
  const waMessage = aiWaText ?? originalWaMessage;

  return (
    <Modal ariaLabel="Laporan sesi" onClose={onClose} showCloseButton={false}
      panelClassName="relative bg-[var(--surface-strong)] w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto overscroll-contain outline-none">
      <div style={{ fontFamily: "'Nunito', sans-serif" }}>
        <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)" }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[var(--surface-strong)] opacity-10" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-[var(--surface-strong)] opacity-10" />
          <div className="absolute top-4 right-16 w-8 h-8 rounded-full bg-[var(--surface-strong)] opacity-10" />
          <div className="relative px-5 pt-6 pb-5">
            <button type="button" onClick={onClose} aria-label="Tutup laporan" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-strong)]/25 text-[var(--on-strong)] backdrop-blur-sm hover:bg-[var(--surface-strong)]/40 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--surface-strong)]/25 backdrop-blur-sm flex items-center justify-center shadow-lg border-2 border-[var(--surface-strong)]/30"><span className="text-2xl font-black text-[var(--on-strong)]">{studentName.charAt(0).toUpperCase()}</span></div>
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 bg-[var(--surface-strong)]/20 text-[var(--on-strong)]/90 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-1">✅ Sesi Selesai!</div>
                <h2 className="text-[var(--on-strong)] text-xl font-black truncate">{studentName}</h2>
                <p className="text-[var(--on-strong)]/80 text-sm mt-0.5">{dayLabel(session.date).split(",")[0]}{session.subjects.length > 0 && <span> · {session.subjects.join(", ")}</span>}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="📅 Tanggal" value={session.date.slice(5).replace("-", "/")} />
              <Stat label="⏱️ Durasi" value={`${session.durationHours} jam`} />
              <Stat label="🎯 Skor" value={engagement ? `${engagement.score}/10` : "—"} />
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-[var(--brand-tint)] rounded-2xl p-4 border border-[var(--brand-tint-strong)]">
            <p className="text-xs font-black text-[var(--ink-brand)] uppercase tracking-widest mb-2">📝 Catatan Sesi</p>
            <p className="text-sm text-[var(--ink-strong)] leading-relaxed font-semibold">{session.shortNote}</p>
            {session.topic && <div className="flex items-center gap-1.5 mt-2"><span className="text-[var(--ink-brand)] text-xs">💡</span><p className="text-xs text-[var(--ink-brand)] font-semibold">Topik: {session.topic}</p></div>}
          </div>
          {engagement && <div className="rounded-2xl p-4 border" style={{ borderColor: engagement.color + "30", background: engagement.background }}>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: engagement.color }}>😊 Kondisi Belajar</p>
            <div className="flex items-center gap-3"><div className="relative w-16 h-16 flex-shrink-0"><svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90"><circle cx="18" cy="18" r="14" fill="none" stroke="rgba(0,0,0,.06)" strokeWidth="3.5" /><circle cx="18" cy="18" r="14" fill="none" stroke={engagement.color} strokeWidth="3.5" strokeDasharray={`${(engagement.score / 10) * 100 * 0.879} 100`} strokeLinecap="round" /></svg><span className="absolute inset-0 flex items-center justify-center font-black text-base" style={{ color: engagement.color }}>{engagement.score}</span></div><div className="flex-1"><p className="font-black text-base" style={{ color: engagement.color }}>{engagement.text}</p><p className="text-xs text-[var(--ink-strong)] mt-1 leading-relaxed">{engagement.narrative}</p></div></div>
          </div>}
          <div><p className="text-xs font-black text-[var(--ink-muted)] uppercase tracking-widest mb-2">Fokus Sesi Berikutnya <span className="font-normal normal-case text-[var(--ink-muted)]">(opsional)</span></p><div className="flex gap-2"><input className="input flex-1 text-sm" aria-label="Fokus sesi berikutnya (opsional)" placeholder="Topik/hal yang perlu dilanjutkan..." value={followUpText} onChange={(e) => setFollowUpText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onAddFollowUp()} /><button onClick={onAddFollowUp} disabled={!followUpText.trim()} className="px-3 py-2 rounded-xl bg-[var(--bg-warn-strong)] text-[var(--on-strong)] text-sm font-bold disabled:opacity-40 hover:bg-[var(--bg-warn-strong)] transition-colors">+</button></div>
            {followUps.length > 0 && <div className="mt-2 space-y-1.5">{paginatedFollowUps.map((followUp) => <div key={followUp.id} className="flex items-center gap-2 bg-[var(--bg-warn)] rounded-xl px-3 py-2.5 border border-[var(--border-warn)]"><span className="text-[var(--ink-warn)]">🔁</span><p className="flex-1 text-sm font-semibold text-[var(--ink-strong)]">{followUp.text}</p><button onClick={() => onDeleteFollowUp(followUp.id)} aria-label={`Hapus tindak lanjut: ${followUp.text}`} className="text-[var(--ink-muted)] hover:text-[var(--ink-danger)]"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg></button></div>)}<PaginationControls page={safeFollowUpPage} total={followUps.length} onPageChange={setFollowUpPage} label="follow-up" /></div>}
          </div>
          {waNumber && <div><p className="text-xs font-black text-[var(--ink-muted)] uppercase tracking-widest mb-2">Update Orang Tua</p>{aiError && <p className="text-xs text-[var(--ink-danger)] bg-[var(--bg-danger)] border border-[var(--border-danger)] rounded-lg px-3 py-2 mb-2">{aiError}</p>}<div className="bg-[var(--bg-success)] border border-[var(--border-success)] rounded-2xl p-3.5 mb-2"><pre className="text-xs text-[var(--ink-strong)] whitespace-pre-wrap leading-relaxed font-sans">{waMessage}</pre></div>{aiWaEnabled && <div className="flex gap-2 mb-2"><button type="button" disabled={aiWaLoading} onClick={onPolishWa} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-[var(--ink-accent)] bg-[var(--accent-tint)] hover:bg-[var(--accent-tint)] border border-[var(--border-accent)] px-3 py-2.5 rounded-xl transition-colors disabled:opacity-50">{aiWaLoading ? " Poles AI..." : " Poles AI"}</button>{aiWaText && <button type="button" onClick={onClearAiWa} className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink-muted)] px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] font-semibold">↩ Original</button>}</div>}<a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-[var(--bg-success-strong)] text-[var(--on-strong)] font-black text-sm hover:bg-[var(--bg-success-strong)] transition-colors shadow-md shadow-green-200"><ChatIcon size={16} className="inline align-[-3px]" /> Kirim ke {parentName || "Orang Tua"}</a></div>}
          <button type="button" onClick={onFixNote} className="w-full py-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--ink-strong)] font-bold text-sm hover:bg-[var(--surface)] transition-colors"><PencilIcon size={13} className="mr-1 inline align-[-2px]" /> Perbaiki catatan sesi</button>
          {/* Audit Q16d: jalan keluar kegagalan harus berada di dalam dialog. */}
          {closeOutError && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-[var(--border-danger)] bg-[var(--bg-danger)] p-3 text-sm font-medium text-[var(--ink-danger)]">
              <span className="flex-1">{closeOutError}</span>
              <button
                type="button"
                disabled={saving}
                onClick={onRetry}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border border-[var(--border-danger)] bg-[var(--surface-strong)] px-3 text-sm font-bold text-[var(--ink-danger)] transition hover:bg-[var(--bg-danger)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-brand)]"
              >
                Coba lagi
              </button>
            </div>
          )}
          <button onClick={onDone} disabled={saving} className="w-full py-4 rounded-2xl font-black text-base text-[var(--on-strong)] transition-all disabled:opacity-50 shadow-lg" style={{ background: "linear-gradient(135deg, #1f2937, #374151)" }}>{saving ? " Menyimpan..." : " Selesai & Lihat Profil"}</button>
        </div>
      </div>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="bg-[var(--surface-strong)]/20 backdrop-blur-sm rounded-2xl p-3 text-center border border-[var(--surface-strong)]/20"><p className="text-[var(--on-strong)]/70 text-xs font-bold uppercase tracking-wider">{label}</p><p className="text-[var(--on-strong)] text-sm font-black mt-0.5">{value}</p></div>;
}
