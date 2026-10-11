import type { Session } from "../../db/types";
import { dayLabel, monthLabel } from "../../lib/format";
import { scoreLabel } from "../../lib/engagement";
import { getBehaviorTag, getResponseTag } from "../../lib/responseTaxonomy";
import PaginationControls from "../../components/PaginationControls";
import { PencilIcon } from "../../components/icons";

interface RiwayatSesiProps {
  /** Semua sesi murid (dipakai grafik & daftar topik). */
  allSessions: Session[];
  /** Sesi yang sudah difilter bulan + dipotong per halaman. */
  paginatedHistorySessions: Session[];
  historySessions: Session[];
  historyMonth: string;
  historyMonthOptions: string[];
  setHistoryMonth: (m: string) => void;
  safeHistoryPage: number;
  setHistoryPage: (p: number) => void;
  photoUrls: Map<string, string>;
  sigUrls: Map<string, string>;
  setDetailSession: (s: Session) => void;
  openEditNote: (s: Session) => void;
  /** Jalan pintas ke wizard kalau belum ada sesi sama sekali. */
  onCaptureFirst: () => void;
}

/**
 * Riwayat Sesi — grafik skor, daftar topik pernah dibahas, dan daftar sesi.
 *
 * Diekstrak dari `screens/StudentDetail.tsx` (audit utang teknis #3): seksi ini
 * ±190 baris JSX dan hanya butuh data yang sudah dihitung induknya, sehingga
 * tidak ada state baru yang perlu diangkat.
 */
export default function RiwayatSesi({
  allSessions, paginatedHistorySessions, historySessions,
  historyMonth, historyMonthOptions, setHistoryMonth,
  safeHistoryPage, setHistoryPage,
  photoUrls, sigUrls, setDetailSession, openEditNote, onCaptureFirst,
}: RiwayatSesiProps) {
  // Grafik 15 sesi terakhir yang PUNYA skor (sesi tanpa pengamatan tidak
  // digambar — audit P2 #11: skor 0 berarti "tidak diisi", bukan "nol").
  const scored = allSessions
    .filter((s) => s.status === "DONE" && s.engagement?.score != null && s.engagement.score > 0)
    .slice(-15);

  const topics = [...new Set(
    allSessions.filter((s) => s.status === "DONE").map((s) => s.topic).filter(Boolean) as string[],
  )];
  // Penyebut sebenarnya, bukan panjang daftar topik unik: satu sesi bisa
  // menyumbang satu topik, dan banyak sesi tidak menyumbang apa pun.
  const doneSessions = allSessions.filter((s) => s.status === "DONE").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2">
        <h2 className="text-lg font-semibold">Riwayat Sesi</h2>
        <div className="flex items-center gap-2">
          <select
            className="input min-h-[44px] py-1 text-xs w-auto"
            value={historyMonth}
            aria-label="Filter bulan riwayat sesi"
            onChange={(e) => { setHistoryMonth(e.target.value); setHistoryPage(1); }}
          >
            <option value="">Semua bulan</option>
            {historyMonthOptions.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Grafik skor ── */}
      {scored.length >= 2 && (
        <div className="bg-[var(--surface-strong)] rounded-2xl border border-[var(--border)] shadow-sm p-4 mb-3">
          <p className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wide mb-3">Grafik fokus (15 sesi terakhir)</p>
          <div className="relative">
            {/* Garis acuan skor 5 (netral) */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-dashed border-[var(--border)] z-0" />
            <span className="absolute -left-0.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] font-medium" style={{ fontSize: 10 }}>5</span>
            <div className="flex items-end gap-1 h-20 relative z-[1]">
              {scored.map((s) => {
                const score = s.engagement!.score;
                const { color } = scoreLabel(score);
                const pct = Math.max(4, Math.round((score / 10) * 100));
                return (
                  // Kolom h-full + area bar flex-1: tanpa ini height % bar mengacu
                  // ke parent auto-height → bar ter-render 0px (grafik tampak kosong)
                  <div key={s.id} className="flex-1 h-full flex flex-col items-center gap-1">
                    <div className="flex-1 w-full flex items-end min-h-0">
                      <div className="w-full rounded-t-sm" style={{ height: `${pct}%`, background: color }} />
                    </div>
                    <span className="text-[var(--ink-muted)] font-semibold" style={{ fontSize: 10 }}>{score}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-[var(--ink-muted)]">{scored[0]?.date?.slice(5)}</span>
            <span className="text-xs text-[var(--ink-muted)]">{scored[scored.length - 1]?.date?.slice(5)}</span>
          </div>
        </div>
      )}

      {/* ── Topik pernah dibahas ── */}
      {topics.length > 0 && (
        <div className="bg-[var(--surface-strong)] rounded-2xl border border-[var(--border)] shadow-sm p-4 mb-3">
          <p className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wide mb-2">
            Topik Pernah Dibahas ({topics.length} dari {doneSessions} sesi yang punya catatan topik)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topics.slice(0, 20).map((t) => (
              <span key={t} className="text-xs bg-[var(--brand-tint)] text-[var(--ink-brand)] px-2 py-0.5 rounded-full font-medium border border-[var(--brand-tint-strong)]">{t}</span>
            ))}
            {topics.length > 20 && <span className="text-xs text-[var(--ink-muted)]">+{topics.length - 20} lagi</span>}
          </div>
        </div>
      )}

      {/* ── Daftar sesi ── */}
      {historySessions.length === 0 ? (
        <div className="text-center py-10 bg-[var(--surface-strong)] rounded-2xl border border-[var(--border)]">
          <p className="text-3xl mb-2">📚</p>
          {historyMonth && allSessions.length > 0 ? (
            <>
              <p className="text-[var(--ink-muted)] text-sm">Tidak ada sesi di {monthLabel(historyMonth)}.</p>
              <button onClick={() => setHistoryMonth("")}
                className="mt-3 px-4 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-muted)] text-sm font-semibold">
                Tampilkan Semua Bulan
              </button>
            </>
          ) : (
            <>
              <p className="text-[var(--ink-muted)] text-sm">Belum ada sesi yang dicatat.</p>
              <button onClick={onCaptureFirst}
                className="mt-3 px-4 py-2 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] text-sm font-semibold">
                Catat Sesi Pertama
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedHistorySessions.map((s) => {
            const eng      = s.engagement;
            const photoUrl = photoUrls.get(s.id);
            const sigUrl   = sigUrls.get(s.id);
            // Kartu sesi.
            // Butir 10 G3-06: dulu kartu ini `div role="button"` yang memuat
            // tombol "Edit catatan sesi" DI DALAMNYA — kontrol bersarang, yang
            // dilarang karena menabrak aturan HTML dan membingungkan pembaca
            // layar. Sekarang seluruh kartu dibuka oleh SATU `<button>` asli yang
            // melebar lewat lapisan `absolute inset-0`, dan tombol Edit duduk
            // sebagai saudaranya, bukan di dalamnya.
            return (
              <div key={s.id} className="relative bg-[var(--surface-strong)] rounded-xl shadow-sm border border-[var(--border)] px-4 py-3">
                <button
                  type="button"
                  aria-label={`Buka detail sesi ${(s.subjects ?? []).join(", ") || "Sesi umum"}`}
                  onClick={() => setDetailSession(s)}
                  className="absolute inset-0 w-full h-full cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-brand)] active:bg-[var(--surface)]"
                />
                <div className="flex items-start gap-2">
                  {(photoUrl || sigUrl) && (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {photoUrl && (
                        <img src={photoUrl} alt="foto sesi" className="w-12 h-12 rounded-lg object-cover" />
                      )}
                      {sigUrl && (
                        <div className="w-12 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] flex items-center justify-center overflow-hidden">
                          <img src={sigUrl} alt="TTD" className="max-w-full max-h-full object-contain" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--ink-strong)]">
                        {(s.subjects ?? []).join(", ") || "Sesi umum"}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                        {dayLabel(s.date).split(",")[1]?.trim() ?? s.date.slice(5)}
                        {s.timeIn && s.timeOut
                          ? ` · ${s.timeIn}–${s.timeOut}`
                          : s.time ? ` · ${s.time}` : ""}
                        {` · ${s.durationHours}j`}
                        {s.mood ? ` · ${s.mood}` : ""}
                      </p>
                      {s.shortNote && <p className="text-xs text-[var(--ink-muted)] mt-1 italic">"{s.shortNote}"</p>}
                      {((s.behaviorTags && s.behaviorTags.length > 0) || s.responseTag) && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(s.behaviorTags ?? []).map((id) => {
                            const t = getBehaviorTag(id);
                            if (!t) return null;
                            const color = t.valence === "positive" ? "bg-[var(--bg-success)] text-[var(--ink-success)]" : t.valence === "negative" ? "bg-[var(--bg-danger)] text-[var(--ink-danger)]" : "bg-[var(--bg-subtle)] text-[var(--ink-muted)]";
                            return <span key={id} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${color}`}>{t.icon} {t.label}</span>;
                          })}
                          {s.responseTag && (() => {
                            const t = getResponseTag(s.responseTag);
                            return t ? <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-[var(--brand-tint)] text-[var(--ink-brand)]">{t.icon} {t.label}</span> : null;
                          })()}
                        </div>
                      )}
                      {s.needsWork && (
                        <p className="text-xs text-[var(--ink-attention)] mt-1">⚠ {s.needsWork}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        {s.status === "DONE" && (
                          <button type="button" onClick={() => openEditNote(s)}
                            aria-label={`Edit catatan sesi ${(s.subjects ?? []).join(", ") || "Sesi umum"}`}
                            className="relative z-10 text-[var(--ink-muted)] hover:text-[var(--ink-brand)] transition-colors text-xs p-1.5 -m-1.5 rounded-full hover:bg-[var(--bg-subtle)]"><PencilIcon size={13} className="mr-1 inline align-[-2px]" /></button>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status === "DONE" ? "bg-[var(--bg-success)] text-[var(--ink-success)]" : s.status === "CANCELLED" ? "bg-[var(--bg-danger)] text-[var(--ink-danger)]" : "bg-[var(--brand-tint)] text-[var(--ink-brand)]"}`}>
                          {s.status === "DONE" ? `${s.durationHours}j` : s.status}
                        </span>
                      </div>
                      {eng && eng.score > 0 && (() => {
                        const { color, bg } = scoreLabel(eng.score);
                        return (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ color, background: bg }}>
                            {eng.score}/10
                            {eng.playingPhone ? " 📱" : ""}
                            {eng.drowsy ? " 🌙" : ""}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <PaginationControls
            page={safeHistoryPage}
            total={historySessions.length}
            onPageChange={setHistoryPage}
            label="sesi"
          />
        </div>
      )}
    </div>
  );
}
