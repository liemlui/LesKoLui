import { useEffect, useState } from "react";
import type { Session, Settings, EngagementLevel } from "../../db/types";
import { dayLabel } from "../../lib/format";
import MaskedMoney from "../../components/ui/MaskedMoney";
import { Z } from "../../lib/zIndex";
import { ENGAGEMENT_LEVELS, scoreLabel, engagementScoreBasis, calcEngagementScore } from "../../lib/engagement";
import { engagementLevelClass } from "../../lib/toneStyles";
import { BEHAVIOR_TAGS, RESPONSE_TAGS, getResponseTag } from "../../lib/responseTaxonomy";
import { MOODS } from "../../lib/moods";
import { TrashIcon, PencilIcon } from "../../components/icons";

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
    <div role="dialog" aria-modal="true" aria-label="Detail Sesi" className={`fixed inset-0 bg-[var(--scrim)]/50 ${Z.picker} flex items-end justify-center`} onClick={() => { setDetailSession(null); setShowDeletePin(false); setDeletePinInput(""); setDeletePinError(""); }}>
      <div className="bg-[var(--surface-strong)] w-full max-w-md rounded-t-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <h3 className="font-bold text-base">{(s.subjects ?? []).join(", ") || "Sesi umum"}</h3>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">{dayLabel(s.date)}</p>
          </div>
          <button onClick={() => setDetailSession(null)} aria-label="Tutup" className="text-[var(--ink-muted)] text-xl"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Waktu & durasi */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--brand-tint)] rounded-xl p-3">
              <p className="text-xs text-[var(--ink-brand)] font-medium">Waktu</p>
              <p className="text-sm font-bold text-[var(--ink-brand)] mt-0.5">
                {s.timeIn && s.timeOut ? `${s.timeIn} — ${s.timeOut}` : s.time ?? "—"}
              </p>
            </div>
            <div className="bg-[var(--accent-tint)] rounded-xl p-3">
              <p className="text-xs text-[var(--ink-accent)] font-medium">Durasi</p>
              <p className="text-sm font-bold text-[var(--ink-accent)] mt-0.5">{s.durationHours} jam</p>
            </div>
          </div>

          {/* Status + mood */}
          <div className="flex gap-2 flex-wrap">
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${s.status === "DONE" ? "bg-[var(--bg-success)] text-[var(--ink-success)]" : s.status === "CANCELLED" ? "bg-[var(--bg-danger)] text-[var(--ink-danger)]" : "bg-[var(--brand-tint)] text-[var(--ink-brand)]"}`}>
              {s.status === "DONE" ? "✓ Selesai" : s.status === "CANCELLED" ? "✗ Dibatalkan" : "Terjadwal"}
            </span>
            {s.mood && <span className="text-xs px-3 py-1 rounded-full bg-[var(--bg-attention)] text-[var(--ink-attention)] font-medium">Suasana: {s.mood}</span>}
            {eng?.level && (
              <span className="text-xs px-3 py-1 rounded-full bg-[var(--bg-subtle)] text-[var(--ink-strong)] font-medium">
                {ENGAGEMENT_LEVELS.find((l) => l.value === eng.level)?.icon}{" "}
                {ENGAGEMENT_LEVELS.find((l) => l.value === eng.level)?.label ?? eng.level}
              </span>
            )}
            {eng && eng.scoreBasis !== "none" && (
              <span className="text-xs px-3 py-1 rounded-full bg-[var(--accent-tint)] text-[var(--ink-purple)] font-semibold">Skor {eng.score}/10</span>
            )}
          </div>

          {/* Catatan */}
          {s.shortNote && (
            <div className="bg-[var(--surface)] rounded-xl p-3">
              <p className="text-xs text-[var(--ink-muted)] font-medium mb-1">Catatan</p>
              <p className="text-sm text-[var(--ink-strong)] italic">"{s.shortNote}"</p>
            </div>
          )}

          {/* Situasi hari ini — konteks humanis */}
          {s.situasiNote && (
            <div className="bg-[var(--bg-success)] rounded-xl p-3">
              <p className="text-xs text-[var(--ink-success)] font-medium mb-1">🫶 Situasi hari ini</p>
              <p className="text-sm text-[var(--ink-success)]">{s.situasiNote}</p>
            </div>
          )}

          {/* Topik */}
          {s.topic && (
            <div>
              <p className="text-xs text-[var(--ink-muted)] font-medium mb-1">Topik</p>
              <p className="text-sm text-[var(--ink-strong)]">{s.topic}</p>
              {s.topicUnit && <p className="text-xs text-[var(--ink-muted)] mt-0.5">📚 {s.topicUnit}</p>}
            </div>
          )}

          {/* Nilai: prediksi → aktual + refleksi */}
          {(s.predictedGrade || s.actualGrade) && (
            <div className="bg-[var(--bg-warn)] rounded-xl p-3 space-y-1.5">
              <p className="text-xs text-[var(--ink-warn)] font-medium">Nilai</p>
              <div className="flex flex-wrap gap-2">
                {s.predictedGrade && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-strong)] text-[var(--ink-warn)] font-semibold">📈 Prediksi: {s.predictedGrade}</span>
                )}
                {s.actualGrade && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-strong)] text-[var(--ink-warn)] font-semibold">✅ Akhir: {s.actualGrade}</span>
                )}
              </div>
              {s.gradeReflection && (
                <p className="text-xs text-[var(--ink-warn)] leading-relaxed">💭 Refleksi: {s.gradeReflection}</p>
              )}
            </div>
          )}

          {/* Biaya — satu bentuk terkunci (K3.2); angkanya ikut status buka-kunci global */}
          {s.cost > 0 && (
            <div className="bg-[var(--bg-success)] rounded-xl p-3">
              <p className="text-xs text-[var(--ink-success)] font-medium">Biaya Sesi</p>
              <p className="text-sm font-bold text-[var(--ink-success)] mt-0.5"><MaskedMoney amount={s.cost} /></p>
            </div>
          )}

          {/* ── Kondisi sesi: SEMUA indikator + tag (audit P2 #16) ── */}
          {(eng || (s.behaviorTags && s.behaviorTags.length > 0) || s.responseTag) && (
            <div className="bg-[var(--accent-tint)] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-[var(--ink-purple)] font-medium">Kondisi &amp; observasi sesi</p>
                {onUpdateSession && !editing && (
                  <button type="button" onClick={startEditing}
                    className="text-xs font-semibold text-[var(--ink-purple)] underline underline-offset-2 hover:text-[var(--ink-purple)]">
                    <PencilIcon size={13} className="mr-1 inline align-[-2px]" /> Koreksi
                  </button>
                )}
              </div>

              {!editing ? (
                <>
                  {activeFlags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {activeFlags.map((f) => (
                        <span key={f.key} className={`text-xs px-2 py-0.5 rounded-full bg-[var(--surface-strong)] ${f.positive ? "text-[var(--ink-success)]" : "text-[var(--ink-attention)]"}`}>
                          {f.label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--ink-muted)]">
                      {eng?.scoreBasis === "none"
                        ? "Tidak ada pengamatan kondisi pada sesi ini — skor tidak dihitung."
                        : "Tidak ada indikator perilaku yang ditandai."}
                    </p>
                  )}
                  {(s.behaviorTags ?? []).length > 0 && (
                    <div>
                      <p className="text-xs text-[var(--ink-muted)] font-medium mb-1">Observasi lanjutan</p>
                      <div className="flex flex-wrap gap-1">
                        {(s.behaviorTags ?? []).map((id) => {
                          const t = BEHAVIOR_TAGS.find((x) => x.id === id);
                          if (!t) return null;
                          const color = t.valence === "positive" ? "bg-[var(--bg-success)] text-[var(--ink-success)]"
                            : t.valence === "negative" ? "bg-[var(--bg-danger)] text-[var(--ink-danger)]" : "bg-[var(--bg-subtle)] text-[var(--ink-muted)]";
                          return <span key={id} className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{t.icon} {t.label}</span>;
                        })}
                      </div>
                    </div>
                  )}
                  {s.responseTag && (() => {
                    const t = getResponseTag(s.responseTag);
                    return t ? (
                      <div>
                        <p className="text-xs text-[var(--ink-muted)] font-medium mb-1">Respons akademik</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-strong)] text-[var(--ink-brand)]">{t.icon} {t.label}</span>
                      </div>
                    ) : null;
                  })()}
                </>
              ) : (
                <div className="space-y-3">
                  {/* Indikator */}
                  <div>
                    <p className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-1.5">Indikator</p>
                    <div className="flex flex-wrap gap-1.5">
                      {FLAG_LABELS.map((f) => {
                        const active = draftFlags.includes(f.key);
                        return (
                          <button key={f.key} type="button"
                            aria-pressed={active}
                            onClick={() => toggleDraftFlag(f.key)}
                            className={`rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              active
                                ? f.positive ? "border-[var(--border-success)] bg-[var(--bg-success-strong)] text-[var(--on-strong)]" : "border-[var(--border-danger)] bg-[var(--bg-danger-strong)] text-[var(--on-strong)]"
                                : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--ink-muted)] hover:border-[var(--border-strong)]"
                            }`}>
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Observasi lanjutan */}
                  <div>
                    <p className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-1.5">Observasi lanjutan</p>
                    <div className="flex flex-wrap gap-1.5">
                      {BEHAVIOR_TAGS.map((t) => {
                        const active = draftTags.includes(t.id);
                        return (
                          <button data-emoji-vocab="affect" key={t.id} type="button"
                            aria-pressed={active}
                            onClick={() => toggleDraftTag(t.id)}
                            className={`rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              active ? "border-[var(--border-accent)] bg-[var(--accent-solid)] text-[var(--on-strong)]" : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--ink-muted)] hover:border-[var(--border-strong)]"
                            }`}>
                            {t.icon} {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Respons akademik */}
                  <div>
                    <p className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-1.5">Respons akademik</p>
                    <div className="flex flex-wrap gap-1.5">
                      {RESPONSE_TAGS.map((t) => {
                        const active = draftResponse === t.id;
                        return (
                          <button data-emoji-vocab="affect" key={t.id} type="button"
                            aria-pressed={active}
                            onClick={() => setDraftResponse(active ? undefined : t.id)}
                            className={`rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              active ? "border-[var(--border-brand)] bg-[var(--brand-solid)] text-[var(--on-strong)]" : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--ink-muted)] hover:border-[var(--border-strong)]"
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
                      <p className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-1.5">Kondisi les</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ENGAGEMENT_LEVELS.map((opt) => (
                          <button data-emoji-vocab="affect" key={opt.value} type="button"
                            aria-pressed={draftLevel === opt.value}
                            onClick={() => setDraftLevel(draftLevel === opt.value ? undefined : opt.value)}
                            className={`rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              engagementLevelClass(opt.value, draftLevel === opt.value)
                            }`}>
                            {opt.icon} {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-1.5">Suasana hati</p>
                      <div className="flex flex-wrap gap-1.5">
                        {MOODS.map((m) => (
                          <button data-emoji-vocab="affect" key={m.v} type="button"
                            aria-pressed={draftMood === m.v}
                            onClick={() => setDraftMood(draftMood === m.v ? undefined : m.v)}
                            className={`rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              draftMood === m.v ? "border-[var(--border-accent)] bg-[var(--accent-solid)] text-[var(--on-strong)]" : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--ink-muted)] hover:border-[var(--border-accent)]"
                            }`}>
                            {m.icon} {m.v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditing(false)} disabled={saving}
                      className="flex-1 rounded-xl bg-[var(--bg-subtle)] py-2 text-sm font-semibold text-[var(--ink-muted)] disabled:opacity-50">
                      Batal
                    </button>
                    <button type="button" onClick={() => void saveCorrections()} disabled={saving}
                      className="flex-1 rounded-xl bg-[var(--accent-solid)] py-2 text-sm font-semibold text-[var(--on-strong)] disabled:opacity-50">
                      {saving ? "Menyimpan…" : "Simpan koreksi"}
                    </button>
                  </div>
                  <p className="text-xs text-[var(--ink-muted)]">
                    Skor dihitung ulang dari koreksi ini. Bila semua pengamatan dikosongkan, skor menjadi
                    0 dan sesi ini tidak lagi ikut rata-rata.
                  </p>
                  {eng?.score != null && !editing && (
                    <p className="text-xs text-[var(--ink-muted)]">Skor tersimpan saat ini: {scoreLabel(eng.score).text} ({eng.score}/10)</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Foto */}
          {photoUrl && (
            <div>
              <p className="text-xs text-[var(--ink-muted)] font-medium mb-1">Foto Sesi</p>
              <img src={photoUrl} alt="foto sesi" className="w-full max-h-48 object-cover rounded-xl" />
            </div>
          )}

          {/* Tanda tangan */}
          {sigUrl && (
            <div>
              <p className="text-xs text-[var(--ink-muted)] font-medium mb-1">Tanda Tangan Murid</p>
              <div className="border border-[var(--border)] rounded-xl bg-[var(--surface)] p-3 flex items-center justify-center">
                <img src={sigUrl} alt="TTD murid" className="max-h-20 object-contain" />
              </div>
            </div>
          )}

          {/* Tombol edit catatan */}
          {s.status === "DONE" && (
            <button
              onClick={(e) => { e.stopPropagation(); setDetailSession(null); openEditNote(s); }}
              className="w-full py-2.5 rounded-xl border border-[var(--border)] text-[var(--ink-muted)] text-sm font-medium hover:bg-[var(--surface)] transition-colors">
              <PencilIcon size={13} className="mr-1 inline align-[-2px]" /> Edit Catatan &amp; Nilai Sesi
            </button>
          )}

          {/* Hapus sesi (PIN protected) */}
          {!showDeletePin ? (
            <button
              onClick={() => setShowDeletePin(true)}
              className="w-full py-2.5 rounded-xl border border-[var(--border-danger)] text-[var(--ink-danger)] text-sm font-medium hover:bg-[var(--bg-danger)] transition-colors">
              <TrashIcon size={13} className="mr-1 inline align-[-2px]" /> Hapus Sesi
            </button>
          ) : (
            <div className="space-y-2 border border-[var(--border-danger)] rounded-xl p-3 bg-[var(--bg-danger)]">
              <p className="text-xs text-[var(--ink-danger)] font-semibold">Hapus sesi ini? Tidak bisa dibatalkan.</p>
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
                  {deletePinError && <p className="text-xs text-[var(--ink-danger)]">{deletePinError}</p>}
                </>
              ) : (
                <div className="rounded-lg bg-[var(--surface-strong)]/70 p-2.5 text-xs text-[var(--ink-danger)]">
                  <p>Atur PIN Keuangan terlebih dahulu agar penghapusan sesi tetap aman.</p>
                  <button type="button" onClick={openSettings}
                    className="mt-2 font-semibold text-[var(--ink-brand)] hover:underline">Atur PIN Keuangan</button>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => { setShowDeletePin(false); setDeletePinInput(""); setDeletePinError(""); }}
                  className="flex-1 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-muted)] text-sm font-semibold">
                  Batal
                </button>
                {settings?.financialPin && (
                  <button onClick={handleDeleteSession}
                    className="flex-1 py-2 rounded-xl bg-[var(--bg-danger-strong)] text-[var(--on-strong)] text-sm font-semibold">
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
