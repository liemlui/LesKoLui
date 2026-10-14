/**
 * Panel "Narasi Sesi" (G3-05 butir 7 & 8, lalu butir 6 & 9 dihentikan 2026-10-14).
 *
 *  - butir 7: chip yang menyebut berapa sesi yang sedang ditampilkan.
 *  - butir 8: penanda "dibuat AI" per narasi — dibaca dari `aiNarrativeTextHash`
 *    sesi (fingerprint teks narasi saat AI menulisnya), bukan bendera terpisah.
 *  - **butir 6 dan 9 tidak berlaku lagi di layar ini** sejak keputusan pemilik
 *    2026-10-14: narasi tidak lagi disunting di sini karena sudah dibuat dengan AI
 *    di alur Catat Sesi setiap hari. Karena itu tidak ada tombol penyunting maupun
 *    penyimpanan otomatis di panel ini — narasinya hanya ditampilkan.
 */

import { EyeIcon, BoltIcon, PencilIcon } from "../../components/icons";
import PaginationControls from "../../components/PaginationControls";
import { dayLabel } from "../../lib/format";
import { narrativeIsAiWritten } from "./aiFieldMarks";
import type { Session } from "../../db/types";

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
  onGenerateFree: () => void;
  page: number;
  onPageChange: (page: number) => void;
}

/** Penanda AI pada narasi sebuah sesi; lihat `narrativeIsAiWritten`. */
export default function ReportNarrativePanel({
  open, onToggle, sessions, totalSessions, sessionsWithNarrative, filteredTotal, scopeChip,
  onGenerateFree, page, onPageChange,
}: ReportNarrativePanelProps) {

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
            // Narasi tidak lagi disunting di layar Laporan (keputusan pemilik
            // 2026-10-14); penyuntingannya ada di alur Catat Sesi.
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

                {/* Sejak v1.105.0 narasi **tidak disunting di layar Laporan**
                    (keputusan pemilik 2026-10-14: narasi sudah dibuat dengan AI
                    di alur Catat Sesi setiap hari, jadi di sini cukup dibaca).
                    Yang dirender adalah paragraf biasa — bukan tombol — supaya
                    tidak ada ajakan menyunting yang menyesatkan. */}
                <div className="flex w-full items-start gap-2 p-1">
                  <span className="flex-1 text-sm text-[var(--ink-strong)]">
                    {session.narrative ?? session.shortNote}
                  </span>
                  <span className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                    session.narrative
                      ? "bg-[var(--bg-success)] text-[var(--ink-success)]"
                      : "bg-[var(--bg-warn)] text-[var(--ink-warn)]"
                  }`}>
                    {session.narrative ? "✓" : "Belum ada"}
                  </span>
                </div>
                {(
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--ink-muted)]">
                    <EyeIcon size={11} /> Narasi dibuat dari alur <strong>Catat Sesi</strong> — di sini hanya dibaca.
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
