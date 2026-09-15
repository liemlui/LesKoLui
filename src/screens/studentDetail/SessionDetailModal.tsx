import { useEffect, useState } from "react";
import type { Session, Settings, EngagementLevel } from "../../db/types";
import { dayLabel, formatRupiah } from "../../lib/format";
import { Z } from "../../lib/zIndex";
import { ENGAGEMENT_LEVELS, scoreLabel, engagementScoreBasis, calcEngagementScore } from "../../lib/engagement";
import { BEHAVIOR_TAGS, RESPONSE_TAGS, getResponseTag } from "../../lib/responseTaxonomy";
import { MOODS } from "../../lib/moods";

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
  openSettings: () => void;
  /** Simpan koreksi kondisi sesi (audit P2 #16). Bila tidak diberikan, panel
   *  koreksi tidak ditampilkan (mis. di layar yang tidak boleh menulis). */
  onUpdateSession?: (patch: Partial<Session>) => Promise<void> | void;
}

/** Daftar label indikator yang AKTIF — mencakup ke-12 indikator.
 *  Sebelum audit P2 #16 modal ini hanya menampilkan 8, sehingga ⏰ Telat,
 *  🚻 Sering ke toilet, 🦘 Gelisah, dan 🙈 Sibuk sendiri tidak pernah bisa
 *  diperiksa ulang — padahal keempatnya ikut menentukan skor. */
const FLAG_LABELS: ReadonlyArray<{ key: string; label: string; positive: boolean }> = [
  { key: "prepared",       label: "✓ Siap belajar",       positive: true },
  { key: "focused",        label: "✓ Fokus",              positive: true },
  { key: "activeAsking",   label: "✓ Aktif bertanya",     positive: true },
  { key: "quickLearner",   label: "✓ Cepat paham",        positive: true },
  { key: "playingPhone",   label: "📱 Main HP",            positive: false },
  { key: "drowsy",         label: "🌙 Mengantuk",          positive: false },
  { key: "needsRepetition",label: "↩ Perlu diulang",      positive: false },
  { key: "hwMissed",       label: "✗ PR tidak dikerjakan", positive: false },
  { key: "late",           label: "⏰ Telat",              positive: false },
  { key: "bathroomBreaks", label: "🚻 Sering ke toilet",   positive: false },
  { key: "restless",       label: "🦘 Gelisah",            positive: false },
  { key: "offTask",        label: "🙈 Sibuk sendiri",      positive: false },
];

const ALL_EDITABLE_FLAGS = FLAG_LABELS.map((f) => f.key);

/** Session Detail Modal — bottom sheet detail satu sesi, termasuk koreksi kondisi. */
export default function SessionDetailModal({
  detailSession,
  photoUrls, sigUrls,
  setDetailSession, settings,
  showDeletePin, setShowDeletePin,
  deletePinInput, setDeletePinInput,
  deletePinError, setDeletePinError,
  handleDeleteSession, openEditNote, openSettings, onUpdateSession,
}: SessionDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [draftFlags, setDraftFlags] = useState<string[]>([]);
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [draftResponse, setDraftResponse] = useState<string | undefined>();
  const [draftLevel, setDraftLevel] = useState<EngagementLevel | undefined>();
  const [draftMood, setDraftMood] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const session = detailSession;
  // Reset panel koreksi setiap kali modal dibuka untuk sesi lain.
  useEffect(() => {
    setEditing(false);
    setSaving(false);
  }, [session?.id]);

  if (!session) return null;
  const s = session;
  const photoUrl = photoUrls.get(s.id);
  const sigUrl   = sigUrls.get(s.id);
  const eng      = s.engagement;

  const startEditing = () => {
    setDraftFlags(ALL_EDITABLE_FLAGS.filter((k) => Boolean((eng as Record<string, unknown> | undefined)?.[k])));
    setDraftTags(s.behaviorTags ?? []);
    setDraftResponse(s.responseTag);
    setDraftLevel(eng?.level);
    setDraftMood(s.mood);
    setEditing(true);
  };

  const toggleDraftFlag = (key: string) =>
    setDraftFlags((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  const toggleDraftTag = (id: string) =>
    setDraftTags((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const saveCorrections = async () => {
    if (!onUpdateSession) return;
    setSaving(true);
    try {
      const flags = Object.fromEntries(ALL_EDITABLE_FLAGS.map((k) => [k, draftFlags.includes(k)]));
      const behaviorValences = draftTags.length > 0
        ? draftTags
            .map((id) => BEHAVIOR_TAGS.find((t) => t.id === id)?.valence)
            .filter(Boolean) as ("positive" | "neutral" | "negative")[]
        : undefined;
      const scored = { ...flags, behaviorValences, responseTagId: draftResponse };
      const basis = engagementScoreBasis(scored);
      // Pertahankan `level` yang sudah ada bila pengguna tidak menyentuhnya.
      const nextEngagement = basis === "none"
        ? { ...flags, level: draftLevel, scoreBasis: basis, score: 0 }
        : {
            ...flags,
            level: draftLevel,
            scoreBasis: basis,
            score: calcEngagementScore(scored),
          };
      await onUpdateSession({
        engagement: nextEngagement,
        behaviorTags: draftTags.length > 0 ? draftTags : undefined,
        responseTag: draftResponse,
        mood: draftMood,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const activeFlags = FLAG_LABELS.filter(
    (f) => Boolean((eng as Record<string, unknown> | undefined)?.[f.key]),
  );

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
            {s.mood && <span className="text-xs px-3 py-1 rounded-full bg-orange-50 text-orange-600 font-medium">Suasana: {s.mood}</span>}
            {eng?.level && (
              <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
                {ENGAGEMENT_LEVELS.find((l) => l.value === eng.level)?.icon}{" "}
                {ENGAGEMENT_LEVELS.find((l) => l.value === eng.level)?.label ?? eng.level}
              </span>
            )}
            {eng && eng.scoreBasis !== "none" && (
              <span className="text-xs px-3 py-1 rounded-full bg-purple-50 text-purple-600 font-semibold">Skor {eng.score}/10</span>
            )}
          </div>

          {/* Catatan */}
          {s.shortNote && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Catatan</p>
              <p className="text-sm text-gray-700 italic">"{s.shortNote}"</p>
            </div>
          )}

          {/* Situasi hari ini — konteks humanis */}
          {s.situasiNote && (
            <div className="bg-teal-50 rounded-xl p-3">
              <p className="text-xs text-teal-500 font-medium mb-1">🫶 Situasi hari ini</p>
              <p className="text-sm text-teal-800">{s.situasiNote}</p>
            </div>
          )}

          {/* Topik */}
          {s.topic && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Topik</p>
              <p className="text-sm text-gray-700">{s.topic}</p>
              {s.topicUnit && <p className="text-xs text-gray-500 mt-0.5">📚 {s.topicUnit}</p>}
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

          {/* ── Kondisi sesi: SEMUA indikator + tag (audit P2 #16) ── */}
          {(eng || (s.behaviorTags && s.behaviorTags.length > 0) || s.responseTag) && (
            <div className="bg-purple-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-purple-500 font-medium">Kondisi &amp; observasi sesi</p>
                {onUpdateSession && !editing && (
                  <button type="button" onClick={startEditing}
                    className="text-xs font-semibold text-purple-700 underline underline-offset-2 hover:text-purple-900">
                    ✏️ Koreksi
                  </button>
                )}
              </div>

              {!editing ? (
                <>
                  {activeFlags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {activeFlags.map((f) => (
                        <span key={f.key} className={`text-xs px-2 py-0.5 rounded-full bg-white ${f.positive ? "text-green-600" : "text-orange-600"}`}>
                          {f.label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">
                      {eng?.scoreBasis === "none"
                        ? "Tidak ada pengamatan kondisi pada sesi ini — skor tidak dihitung."
                        : "Tidak ada indikator perilaku yang ditandai."}
                    </p>
                  )}
                  {(s.behaviorTags ?? []).length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Observasi lanjutan</p>
                      <div className="flex flex-wrap gap-1">
                        {(s.behaviorTags ?? []).map((id) => {
                          const t = BEHAVIOR_TAGS.find((x) => x.id === id);
                          if (!t) return null;
                          const color = t.valence === "positive" ? "bg-green-100 text-green-700"
                            : t.valence === "negative" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600";
                          return <span key={id} className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{t.icon} {t.label}</span>;
                        })}
                      </div>
                    </div>
                  )}
                  {s.responseTag && (() => {
                    const t = getResponseTag(s.responseTag);
                    return t ? (
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-1">Respons akademik</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white text-blue-700">{t.icon} {t.label}</span>
                      </div>
                    ) : null;
                  })()}
                </>
              ) : (
                <div className="space-y-3">
                  {/* Indikator */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Indikator</p>
                    <div className="flex flex-wrap gap-1.5">
                      {FLAG_LABELS.map((f) => {
                        const active = draftFlags.includes(f.key);
                        return (
                          <button key={f.key} type="button"
                            aria-pressed={active}
                            onClick={() => toggleDraftFlag(f.key)}
                            className={`rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              active
                                ? f.positive ? "border-green-600 bg-green-600 text-white" : "border-rose-600 bg-rose-600 text-white"
                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                            }`}>
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Observasi lanjutan */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Observasi lanjutan</p>
                    <div className="flex flex-wrap gap-1.5">
                      {BEHAVIOR_TAGS.map((t) => {
                        const active = draftTags.includes(t.id);
                        return (
                          <button key={t.id} type="button"
                            aria-pressed={active}
                            onClick={() => toggleDraftTag(t.id)}
                            className={`rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              active ? "border-purple-600 bg-purple-600 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                            }`}>
                            {t.icon} {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Respons akademik */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Respons akademik</p>
                    <div className="flex flex-wrap gap-1.5">
                      {RESPONSE_TAGS.map((t) => {
                        const active = draftResponse === t.id;
                        return (
                          <button key={t.id} type="button"
                            aria-pressed={active}
                            onClick={() => setDraftResponse(active ? undefined : t.id)}
                            className={`rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              active ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                            }`}>
                            {t.icon} {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Kondisi umum + suasana */}
                  <div className="grid gap-2">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Kondisi les</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ENGAGEMENT_LEVELS.map((opt) => (
                          <button key={opt.value} type="button"
                            aria-pressed={draftLevel === opt.value}
                            onClick={() => setDraftLevel(draftLevel === opt.value ? undefined : opt.value)}
                            className={`rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              draftLevel === opt.value ? opt.activeClass : opt.idleClass
                            }`}>
                            {opt.icon} {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Suasana hati</p>
                      <div className="flex flex-wrap gap-1.5">
                        {MOODS.map((m) => (
                          <button key={m.v} type="button"
                            aria-pressed={draftMood === m.v}
                            onClick={() => setDraftMood(draftMood === m.v ? undefined : m.v)}
                            className={`rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              draftMood === m.v ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-indigo-300"
                            }`}>
                            {m.icon} {m.v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditing(false)} disabled={saving}
                      className="flex-1 rounded-xl bg-gray-100 py-2 text-sm font-semibold text-gray-600 disabled:opacity-50">
                      Batal
                    </button>
                    <button type="button" onClick={() => void saveCorrections()} disabled={saving}
                      className="flex-1 rounded-xl bg-purple-600 py-2 text-sm font-semibold text-white disabled:opacity-50">
                      {saving ? "Menyimpan…" : "Simpan koreksi"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Skor dihitung ulang dari koreksi ini. Bila semua pengamatan dikosongkan, skor menjadi
                    0 dan sesi ini tidak lagi ikut rata-rata.
                  </p>
                  {eng?.score != null && !editing && (
                    <p className="text-xs text-gray-500">Skor tersimpan saat ini: {scoreLabel(eng.score).text} ({eng.score}/10)</p>
                  )}
                </div>
              )}
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
              ✏️ Edit Catatan &amp; Nilai Sesi
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
              {settings?.financialPin ? (
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
              ) : (
                <div className="rounded-lg bg-white/70 p-2.5 text-xs text-red-700">
                  <p>Atur PIN Keuangan terlebih dahulu agar penghapusan sesi tetap aman.</p>
                  <button type="button" onClick={openSettings}
                    className="mt-2 font-semibold text-blue-600 hover:underline">Atur PIN Keuangan</button>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => { setShowDeletePin(false); setDeletePinInput(""); setDeletePinError(""); }}
                  className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">
                  Batal
                </button>
                {settings?.financialPin && (
                  <button onClick={handleDeleteSession}
                    className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold">
                    Hapus
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
