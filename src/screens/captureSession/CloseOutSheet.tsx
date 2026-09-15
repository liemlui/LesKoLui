import { useState } from "react";
import Modal from "../../components/Modal";
import PaginationControls from "../../components/PaginationControls";
import { dayLabel } from "../../lib/format";
import { clampPage, paginateItems } from "../../lib/pagination";

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
  engagement?: { score: number; color: string; background: string; text: string; narrative: string };
}

/** Laporan sesi pasca-simpan yang sebelumnya dirender oleh CaptureSession. */
export default function CloseOutSheet({
  studentName, parentName, session, followUps, followUpText, setFollowUpText,
  saving, waNumber, originalWaMessage, aiWaText, onAddFollowUp, onDeleteFollowUp,
  onDone, onClose, onFixNote, onPolishWa, aiWaEnabled, aiWaLoading, aiError,
  onClearAiWa, engagement,
}: CloseOutSheetProps) {
  const [followUpPage, setFollowUpPage] = useState(1);
  const safeFollowUpPage = clampPage(followUpPage, followUps.length);
  const paginatedFollowUps = paginateItems(followUps, safeFollowUpPage);
  const waMessage = aiWaText ?? originalWaMessage;

  return (
    <Modal ariaLabel="Laporan sesi" onClose={onClose} showCloseButton={false}
      panelClassName="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto overscroll-contain outline-none">
      <div style={{ fontFamily: "'Nunito', sans-serif" }}>
        <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)" }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white opacity-10" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white opacity-10" />
          <div className="absolute top-4 right-16 w-8 h-8 rounded-full bg-white opacity-10" />
          <div className="relative px-5 pt-6 pb-5">
            <button type="button" onClick={onClose} aria-label="Tutup laporan" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur-sm hover:bg-white/40 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center shadow-lg border-2 border-white/30"><span className="text-2xl font-black text-white">{studentName.charAt(0).toUpperCase()}</span></div>
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 bg-white/20 text-white/90 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-1">✅ Sesi Selesai!</div>
                <h2 className="text-white text-xl font-black truncate">{studentName}</h2>
                <p className="text-white/80 text-sm mt-0.5">{dayLabel(session.date).split(",")[0]}{session.subjects.length > 0 && <span> · {session.subjects.join(", ")}</span>}</p>
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
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <p className="text-xs font-black text-blue-700 uppercase tracking-widest mb-2">📝 Catatan Sesi</p>
            <p className="text-sm text-gray-700 leading-relaxed font-semibold">{session.shortNote}</p>
            {session.topic && <div className="flex items-center gap-1.5 mt-2"><span className="text-blue-600 text-xs">💡</span><p className="text-xs text-blue-700 font-semibold">Topik: {session.topic}</p></div>}
          </div>
          {engagement && <div className="rounded-2xl p-4 border" style={{ borderColor: engagement.color + "30", background: engagement.background }}>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: engagement.color }}>😊 Kondisi Belajar</p>
            <div className="flex items-center gap-3"><div className="relative w-16 h-16 flex-shrink-0"><svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90"><circle cx="18" cy="18" r="14" fill="none" stroke="rgba(0,0,0,.06)" strokeWidth="3.5" /><circle cx="18" cy="18" r="14" fill="none" stroke={engagement.color} strokeWidth="3.5" strokeDasharray={`${(engagement.score / 10) * 100 * 0.879} 100`} strokeLinecap="round" /></svg><span className="absolute inset-0 flex items-center justify-center font-black text-base" style={{ color: engagement.color }}>{engagement.score}</span></div><div className="flex-1"><p className="font-black text-base" style={{ color: engagement.color }}>{engagement.text}</p><p className="text-xs text-gray-700 mt-1 leading-relaxed">{engagement.narrative}</p></div></div>
          </div>}
          <div><p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">🔁 Fokus Sesi Berikutnya <span className="font-normal normal-case text-gray-500">(opsional)</span></p><div className="flex gap-2"><input className="input flex-1 text-sm" placeholder="Topik/hal yang perlu dilanjutkan..." value={followUpText} onChange={(e) => setFollowUpText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onAddFollowUp()} /><button onClick={onAddFollowUp} disabled={!followUpText.trim()} className="px-3 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold disabled:opacity-40 hover:bg-amber-600 transition-colors">+</button></div>
            {followUps.length > 0 && <div className="mt-2 space-y-1.5">{paginatedFollowUps.map((followUp) => <div key={followUp.id} className="flex items-center gap-2 bg-amber-50 rounded-xl px-3 py-2.5 border border-amber-100"><span className="text-amber-400">🔁</span><p className="flex-1 text-sm font-semibold text-gray-700">{followUp.text}</p><button onClick={() => onDeleteFollowUp(followUp.id)} className="text-gray-500 hover:text-red-400"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg></button></div>)}<PaginationControls page={safeFollowUpPage} total={followUps.length} onPageChange={setFollowUpPage} label="follow-up" /></div>}
          </div>
          {waNumber && <div><p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">💬 Update Orang Tua</p>{aiError && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">{aiError}</p>}<div className="bg-green-50 border border-green-200 rounded-2xl p-3.5 mb-2"><pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">{waMessage}</pre></div>{aiWaEnabled && <div className="flex gap-2 mb-2"><button type="button" disabled={aiWaLoading} onClick={onPolishWa} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-2.5 rounded-xl transition-colors disabled:opacity-50">{aiWaLoading ? "⏳ Poles AI..." : "✨ Poles AI"}</button>{aiWaText && <button type="button" onClick={onClearAiWa} className="text-xs text-gray-500 hover:text-gray-600 px-3 py-2 rounded-xl border border-gray-200 bg-white font-semibold">↩ Original</button>}</div>}<a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-green-500 text-white font-black text-sm hover:bg-green-600 transition-colors shadow-md shadow-green-200"><span className="text-lg">💬</span> Kirim ke {parentName || "Orang Tua"}</a></div>}
          <button type="button" onClick={onFixNote} className="w-full py-3 rounded-2xl border border-gray-300 bg-white text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors">✏️ Perbaiki catatan sesi</button>
          <button onClick={onDone} disabled={saving} className="w-full py-4 rounded-2xl font-black text-base text-white transition-all disabled:opacity-50 shadow-lg" style={{ background: "linear-gradient(135deg, #1f2937, #374151)" }}>{saving ? "⏳ Menyimpan..." : "🏁 Selesai & Lihat Profil"}</button>
        </div>
      </div>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20"><p className="text-white/70 text-xs font-bold uppercase tracking-wider">{label}</p><p className="text-white text-sm font-black mt-0.5">{value}</p></div>;
}
