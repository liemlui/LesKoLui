import type { Session, Settings } from "../../db/types";
import { dayLabel, formatRupiah } from "../../lib/format";
import { Z } from "../../lib/zIndex";

interface SessionDetailModalProps {
  detailSession: Session | null;
  photoUrls: Map<string, string>;
  sigUrls: Map<string, string>;
  setDetailSession: (s: Session | null) => void;
  settings: Settings | undefined;
  showDeletePin: boolean;
  setShowDeletePin: (v: boolean) => void;
  deletePinInput: string;
  setDeletePinInput: (v: string) => void;
  deletePinError: string;
  setDeletePinError: (v: string) => void;
  handleDeleteSession: () => void;
  openEditNote: (s: Session) => void;
}

/** Session Detail Modal — bottom sheet menampilkan detail satu sesi. */
export default function SessionDetailModal({
  detailSession,
  photoUrls, sigUrls,
  setDetailSession, settings,
  showDeletePin, setShowDeletePin,
  deletePinInput, setDeletePinInput,
  deletePinError, setDeletePinError,
  handleDeleteSession, openEditNote,
}: SessionDetailModalProps) {
  if (!detailSession) return null;
  const s = detailSession;
  const photoUrl = photoUrls.get(s.id);
  const sigUrl   = sigUrls.get(s.id);
  const eng      = s.engagement;

  return (
    <div role="dialog" aria-modal="true" aria-label="Detail Sesi" className={`fixed inset-0 bg-black/50 ${Z.picker} flex items-end justify-center`} onClick={() => { setDetailSession(null); setShowDeletePin(false); setDeletePinInput(""); setDeletePinError(""); }}>
      <div className="bg-white w-full max-w-md rounded-t-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-base">{(s.subjects ?? []).join(", ") || "Sesi umum"}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{dayLabel(s.date)}</p>
          </div>
          <button onClick={() => setDetailSession(null)} aria-label="Tutup" className="text-gray-500 text-xl"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Waktu & durasi */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-500 font-medium">Waktu</p>
              <p className="text-sm font-bold text-blue-800 mt-0.5">
                {s.timeIn && s.timeOut ? `${s.timeIn} — ${s.timeOut}` : s.time ?? "—"}
              </p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-3">
              <p className="text-xs text-indigo-500 font-medium">Durasi</p>
              <p className="text-sm font-bold text-indigo-800 mt-0.5">{s.durationHours} jam</p>
            </div>
          </div>

          {/* Status + mood */}
          <div className="flex gap-2 flex-wrap">
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${s.status === "DONE" ? "bg-green-50 text-green-600" : s.status === "CANCELLED" ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-600"}`}>
              {s.status === "DONE" ? "✓ Selesai" : s.status === "CANCELLED" ? "✗ Dibatalkan" : "Terjadwal"}
            </span>
            {s.mood && <span className="text-xs px-3 py-1 rounded-full bg-orange-50 text-orange-600 font-medium">Mood: {s.mood}</span>}
            {eng && <span className="text-xs px-3 py-1 rounded-full bg-purple-50 text-purple-600 font-semibold">Engagement {eng.score}/10</span>}
          </div>

          {/* Catatan */}
          {s.shortNote && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Catatan</p>
              <p className="text-sm text-gray-700 italic">"{s.shortNote}"</p>
            </div>
          )}

          {/* Topik */}
          {s.topic && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Topik</p>
              <p className="text-sm text-gray-700">{s.topic}</p>
            </div>
          )}

          {/* Nilai: prediksi → aktual + refleksi */}
          {(s.predictedGrade || s.actualGrade) && (
            <div className="bg-amber-50 rounded-xl p-3 space-y-1.5">
              <p className="text-xs text-amber-500 font-medium">Nilai</p>
              <div className="flex flex-wrap gap-2">
                {s.predictedGrade && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white text-amber-700 font-semibold">📈 Prediksi: {s.predictedGrade}</span>
                )}
                {s.actualGrade && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white text-amber-800 font-semibold">✅ Akhir: {s.actualGrade}</span>
                )}
              </div>
              {s.gradeReflection && (
                <p className="text-xs text-amber-700 leading-relaxed">💭 Refleksi: {s.gradeReflection}</p>
              )}
            </div>
          )}

          {/* Biaya */}
          {s.cost > 0 && (
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xs text-green-500 font-medium">Biaya Sesi</p>
              <p className="text-sm font-bold text-green-800 mt-0.5">{formatRupiah(s.cost)}</p>
            </div>
          )}

          {/* Engagement detail */}
          {eng && (
            <div className="bg-purple-50 rounded-xl p-3 space-y-1">
              <p className="text-xs text-purple-500 font-medium">Detail Engagement</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {eng.prepared && <span className="text-xs px-2 py-0.5 rounded-full bg-white text-green-600">✓ Siap belajar</span>}
                {eng.focused && <span className="text-xs px-2 py-0.5 rounded-full bg-white text-green-600">✓ Fokus</span>}
                {eng.activeAsking && <span className="text-xs px-2 py-0.5 rounded-full bg-white text-green-600">✓ Aktif bertanya</span>}
                {eng.quickLearner && <span className="text-xs px-2 py-0.5 rounded-full bg-white text-green-600">✓ Cepat paham</span>}
                {eng.playingPhone && <span className="text-xs px-2 py-0.5 rounded-full bg-white text-orange-500">📱 Main HP</span>}
                {eng.drowsy && <span className="text-xs px-2 py-0.5 rounded-full bg-white text-blue-400">😴 Ngantuk</span>}
                {eng.needsRepetition && <span className="text-xs px-2 py-0.5 rounded-full bg-white text-yellow-600">↩ Perlu diulang</span>}
                {eng.hwMissed && <span className="text-xs px-2 py-0.5 rounded-full bg-white text-red-500">✗ PR tidak dikerjakan</span>}
              </div>
            </div>
          )}

          {/* Foto */}
          {photoUrl && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Foto Sesi</p>
              <img src={photoUrl} alt="foto sesi" className="w-full max-h-48 object-cover rounded-xl" />
            </div>
          )}

          {/* Tanda tangan */}
          {sigUrl && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Tanda Tangan Murid</p>
              <div className="border border-gray-200 rounded-xl bg-gray-50 p-3 flex items-center justify-center">
                <img src={sigUrl} alt="TTD murid" className="max-h-20 object-contain" />
              </div>
            </div>
          )}

          {/* Tombol edit catatan */}
          {s.status === "DONE" && (
            <button
              onClick={(e) => { e.stopPropagation(); setDetailSession(null); openEditNote(s); }}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
              ✏️ Edit Catatan Sesi
            </button>
          )}

          {/* Hapus sesi (PIN protected) */}
          {!showDeletePin ? (
            <button
              onClick={() => setShowDeletePin(true)}
              className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors">
              🗑️ Hapus Sesi
            </button>
          ) : (
            <div className="space-y-2 border border-red-200 rounded-xl p-3 bg-red-50">
              <p className="text-xs text-red-600 font-semibold">Hapus sesi ini? Tidak bisa dibatalkan.</p>
              {settings?.financialPin && (
                <>
                  <input
                    type="password" inputMode="numeric" maxLength={6} placeholder="PIN"
                    value={deletePinInput}
                    onChange={(e) => { setDeletePinInput(e.target.value); setDeletePinError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleDeleteSession()}
                    className="input text-center tracking-widest text-base w-full"
                    autoFocus
                  />
                  {deletePinError && <p className="text-xs text-red-500">{deletePinError}</p>}
                </>
              )}
              <div className="flex gap-2">
                <button onClick={() => { setShowDeletePin(false); setDeletePinInput(""); setDeletePinError(""); }}
                  className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">
                  Batal
                </button>
                <button onClick={handleDeleteSession}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold">
                  Hapus
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
