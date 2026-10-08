/**
 * Panel "Narasi Sesi" (G3-05 butir 6, 8, 9).
 *
 *  - butir 6: setiap narasi yang bisa disunting dirender sebagai tombol sungguhan
 *    (peran tombol, urutan fokus, Enter/Spasi bekerja).
 *  - butir 8: penanda "dibuat AI" per narasi, hilang sendiri setelah disunting
 *    manual — dibaca dari `aiNarrativeTextHash` sesi (fingerprint teks narasi
 *    saat AI menulisnya), bukan dari bendera terpisah.
 *  - butir 9: penyimpanan otomatis setelah berhenti mengetik, dengan status
 *    "sedang menyimpan" dan waktu tersimpan.
 *  - butir 7: chip yang menyebut berapa sesi yang sedang ditampilkan.
 */

import { EyeIcon, BoltIcon, PencilIcon } from "../../components/icons";
import PaginationControls from "../../components/PaginationControls";
import { dayLabel } from "../../lib/format";
import { narrativeIsAiWritten } from "./aiFieldMarks";
import type { Session } from "../../db/types";
import type { NarrativeSaveState } from "./useNarrativeAutosave";

interface ReportNarrativePanelProps {
  open: boolean;
  onToggle: () => void;
  /** Sesi pada halaman yang sedang tampil. */
  sessions: readonly Session[];
  /** Semua sesi laporan (dasar kesiapan) dan yang sudah punya narasi. */
  totalSessions: number;
  sessionsWithNarrative: number;
  /** Jumlah sesi setelah penyaring mapel — dasar penomoran halaman. */
  filteredTotal: number;
  /** Chip cakupan penyaring; undefined = tidak sedang menyaring. */
  scopeChip?: string;
  editingId: string | null;
  draftText: string;
  onStartEdit: (session: Session) => void;
  onDraftChange: (text: string) => void;
  onFinishEdit: () => void;
  saveState: NarrativeSaveState;
  savedLabel?: string;
  onGenerateFree: () => void;
  page: number;
  onPageChange: (page: number) => void;
}

function saveStatusLabel(state: NarrativeSaveState, savedLabel?: string): string | undefined {
  switch (state) {
    case "pending": return "Menunggu tersimpan…";
    case "saving": return "Sedang menyimpan…";
    case "saved": return savedLabel ?? "Tersimpan";
    case "error": return "Gagal menyimpan — periksa penyimpanan lalu ketik lagi.";
    default: return undefined;
  }
}

/** Penanda AI pada narasi sebuah sesi: masih ada hanya bila isinya belum disunting. */
export default function ReportNarrativePanel({
  open, onToggle, sessions, totalSessions, sessionsWithNarrative, filteredTotal, scopeChip,
  editingId, draftText, onStartEdit, onDraftChange, onFinishEdit,
  saveState, savedLabel, onGenerateFree, page, onPageChange,
}: ReportNarrativePanelProps) {
  const status = saveStatusLabel(saveState, savedLabel);

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-sm">
      <button
        className="flex w-full items-center justify-between p-4 text-left"
        aria-expanded={open}
        onClick={onToggle}
      >
        <div>
          <p className="text-sm font-semibold text-[var(--ink-strong)]">
            <PencilIcon size={13} className="mr-1 inline align-[-2px]" /> Narasi Sesi
          </p>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
            {sessionsWithNarrative}/{totalSessions} narasi siap
            {scopeChip ? ` · ${scopeChip}` : ""}
          </p>
        </div>
        <span className="text-sm text-[var(--ink-muted)]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-[var(--border)] px-4 pb-4">
          <div className="flex gap-2 pt-3">
            <button className="btn btn-secondary text-xs" onClick={onGenerateFree}>
              <BoltIcon size={13} className="mr-1 inline align-[-2px]" /> Generate Narasi Gratis
            </button>
            <span className="self-center text-xs text-[var(--ink-muted)]">
              Isi narasi kosong dari catatan singkat/topik/perhatian tanpa AI.
            </span>
          </div>

          {sessions.map((session) => {
            const isEditing = editingId === session.id;
            const aiMarked = narrativeIsAiWritten(session);
            return (
              <div key={session.id} className="mt-2 rounded-xl bg-[var(--surface)] p-3">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="text-xs text-[var(--ink-muted)]">
                    {dayLabel(session.date)} — {session.subjects.join(", ")}
                  </p>
                  {aiMarked && (
                    <span
                      className="rounded-full bg-[var(--accent-tint)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--ink-accent)]"
                      title="Narasi ini ditulis AI. Menyuntingnya sendiri akan melepas penandanya."
                    >
                      ✨ AI
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      className="input text-sm"
                      rows={3}
                      aria-label={`Narasi sesi ${dayLabel(session.date)}`}
                      value={draftText}
                      onChange={(e) => onDraftChange(e.target.value)}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-primary text-xs"
                        onClick={onFinishEdit}
                      >
                        Selesai
                      </button>
                      {status && (
                        <span
                          role="status"
                          aria-live="polite"
                          className={`text-xs ${saveState === "error" ? "font-semibold text-[var(--ink-danger)]" : "text-[var(--ink-muted)]"}`}
                        >
                          {status}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onStartEdit(session)}
                    aria-label={`Sunting narasi sesi ${dayLabel(session.date)}`}
                    className="group flex w-full items-start gap-2 rounded-lg p-1 text-left transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-brand)]"
                  >
                    <span className="line-clamp-2 flex-1 text-sm text-[var(--ink-strong)] transition-colors group-hover:text-[var(--ink-brand)]">
                      {session.narrative ?? session.shortNote}
                    </span>
                    <span className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                      session.narrative
                        ? "bg-[var(--bg-success)] text-[var(--ink-success)]"
                        : "bg-[var(--bg-warn)] text-[var(--ink-warn)]"
                    }`}>
                      {session.narrative ? "✓" : "Edit"}
                    </span>
                  </button>
                )}
                {!isEditing && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--ink-muted)]">
                    <EyeIcon size={11} /> Ketuk untuk menyunting — perubahan tersimpan otomatis.
                  </p>
                )}
              </div>
            );
          })}

          <PaginationControls
            page={page}
            total={filteredTotal}
            onPageChange={onPageChange}
            label="narasi"
          />
        </div>
      )}
    </section>
  );
}
