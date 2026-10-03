import { useEffect, useState } from "react";
import type { Session } from "../../db/types";
import type { StudentMap } from "../../lib/studentColor";
import { dayLabel } from "../../lib/format";
import { addDays } from "../../lib/calendar";
import {
  DAY_DENSITY, DENSITY_ORDER, densityForHeight, FULL_DAY_END, FULL_DAY_START,
  TIMELINE_VIEWPORT_FRACTION, useDayDensity,
} from "../../lib/dayDensity";
import SessionPill, { type SessionActions } from "./SessionPill";
import { PencilIcon } from "../../components/icons";

interface Props extends SessionActions {
  anchor: string;
  setAnchor: (d: string) => void;
  today: string;
  sessions: Session[];   // this day's sessions, already student-filtered
  studentMap: StudentMap;
  onJumpToday: () => void;
  onAdd: (date: string) => void;
}

const LABEL_W = 44;

export default function DayView({
  anchor, setAnchor, today, sessions, studentMap, onJumpToday, onAdd, ...actions
}: Props) {
  const timed   = sessions.filter((s) => s.time);
  const untimed = sessions.filter((s) => !s.time);

  const { density, setDensity } = useDayDensity();
  /** ⇱: rentang dipaksa 06:00–24:00 (tetap melebar bila ada sesi di luarnya). */
  const [fullDay, setFullDay] = useState(false);
  const pxPerHr = DAY_DENSITY[density];

  // Dynamic grid range: default 07:00–22:00 (atau 06:00–24:00 di mode sehari
  // penuh), selalu melebar untuk memuat sesi di luar rentang.
  let minH = fullDay ? FULL_DAY_START : 7;
  let maxH = fullDay ? FULL_DAY_END   : 22;
  for (const s of timed) {
    const [sh, sm] = (s.time ?? "07:00").split(":").map(Number);
    minH = Math.min(minH, sh);
    const endMin = sh * 60 + sm + Math.round(s.durationHours * 60);
    maxH = Math.max(maxH, Math.ceil(endMin / 60));
  }
  const DAY_START = Math.max(0, Math.min(fullDay ? FULL_DAY_START : 7, minH));
  const DAY_END   = Math.min(24, Math.max(fullDay ? FULL_DAY_END : 22, maxH));
  const gridHours = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);
  const totalH    = (DAY_END - DAY_START) * pxPerHr;

  // "Now" line — only on today's column, within the visible range.
  // Snapshot at mount, refresh each minute (kept out of render to stay pure).
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const nowWib = new Date(nowMs + 7 * 60 * 60 * 1000);
  const nowH   = nowWib.getUTCHours() + nowWib.getUTCMinutes() / 60;
  const showNow = anchor === today && nowH >= DAY_START && nowH <= DAY_END;
  // Garis "sekarang" WAJIB memakai kerapatan aktif — kalau tidak, posisinya salah.
  const nowTop  = (nowH - DAY_START) * pxPerHr;

  /** ⇱ "Muat sehari penuh": rentang 18 jam + kerapatan terbesar yang masih muat. */
  const handleFullDay = () => {
    setFullDay(true);
    const available = typeof window === "undefined"
      ? 0
      : Math.round(window.innerHeight * TIMELINE_VIEWPORT_FRACTION);
    setDensity(densityForHeight(available));
  };

  const hourFontSize = density === "rapat" ? 11.5 : 12;
  const rangeLabel = `${String(DAY_START).padStart(2, "0")}.00–${String(DAY_END).padStart(2, "0")}.00`;

  return (
    <div className="mx-4 bg-[var(--surface-strong)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
        <button aria-label="Hari sebelumnya" onClick={() => setAnchor(addDays(anchor, -1))} className="text-[var(--ink-muted)] hover:text-[var(--ink-strong)] text-xl w-11 h-11 flex items-center justify-center">‹</button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-[var(--ink-strong)] text-sm truncate">{dayLabel(anchor)}</span>
          {anchor !== today && (
            <button onClick={onJumpToday} className="inline-flex min-h-[36px] flex-shrink-0 items-center text-xs font-semibold text-[var(--ink-brand)] bg-[var(--brand-tint)] hover:bg-[var(--brand-tint-strong)] px-2.5 py-1 rounded-lg transition-colors">Hari Ini</button>
          )}
        </div>
        <button aria-label="Hari berikutnya" onClick={() => setAnchor(addDays(anchor, 1))} className="text-[var(--ink-muted)] hover:text-[var(--ink-strong)] text-xl w-11 h-11 flex items-center justify-center">›</button>
      </div>

      {/* Bilah kerapatan (G2-07): tiga tingkat + "Muat sehari penuh" ⇱ */}
      <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)]">
        <p className="text-xs text-[var(--ink-muted)]">
          {sessions.length} sesi · {rangeLabel}
        </p>
        <div className="flex items-center gap-1.5">
          <div role="radiogroup" aria-label="Kerapatan jadwal" className="flex rounded-lg bg-[var(--bg-subtle)] p-0.5">
            {DENSITY_ORDER.map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={density === key}
                onClick={() => setDensity(key)}
                className={`inline-flex min-h-[36px] items-center rounded-md px-2.5 text-xs font-semibold capitalize transition-colors ${
                  density === key
                    ? "bg-[var(--surface-strong)] text-[var(--ink-brand)] shadow-sm"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink-strong)]"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleFullDay}
            aria-label="Muat sehari penuh"
            title="Muat sehari penuh (06.00–24.00)"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--brand-tint)] text-[var(--ink-brand)] transition-colors hover:bg-[var(--brand-tint-strong)]"
          >
            ⇱
          </button>
          <button onClick={() => onAdd(anchor)} className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-[var(--ink-brand)] bg-[var(--brand-tint)] hover:bg-[var(--brand-tint-strong)] px-2.5 py-1.5 rounded-lg transition-colors">+ Jadwal</button>
        </div>
      </div>

      {untimed.length > 0 && (
        <div className="px-3 pt-2 pb-1 border-b border-[var(--border)] space-y-1">
          <p className="text-xs text-[var(--ink-muted)] font-medium">Tanpa waktu</p>
          {untimed.map((s) => (
            <SessionPill key={s.id} session={s} dateCtx={anchor} studentMap={studentMap} today={today} {...actions} />
          ))}
        </div>
      )}
      <div className="overflow-y-auto" style={{ maxHeight: "62vh" }}>
        <div className="relative select-none" style={{ height: totalH }}>
          {gridHours.map((h) => (
            <div key={h} className="absolute left-0 right-0 pointer-events-none" style={{ top: (h - DAY_START) * pxPerHr }}>
              <div className="flex">
                <span className="flex-shrink-0 text-right pr-2 text-[var(--ink-muted)]"
                  style={{ width: LABEL_W, fontSize: hourFontSize, lineHeight: 1, marginTop: -6 }}>
                  {`${String(h).padStart(2, "0")}:00`}
                </span>
                <div className="flex-1 border-t border-[var(--border)]" />
              </div>
            </div>
          ))}
          {gridHours.slice(0, -1).map((h) => (
            <div key={`h30-${h}`} className="absolute right-0 border-t border-dashed border-[var(--border)] pointer-events-none"
              style={{ top: (h - DAY_START) * pxPerHr + pxPerHr / 2, left: LABEL_W }} />
          ))}
          {showNow && (
            <div className="absolute right-0 pointer-events-none z-10" style={{ top: nowTop, left: LABEL_W }}>
              <div className="relative border-t-2 border-[var(--ink-danger)]">
                <span className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-[var(--bg-danger-strong)]" />
              </div>
            </div>
          )}
          {timed.map((s) => {
            const info   = studentMap.get(s.studentId);
            const color  = info?.color ?? "#9CA3AF";
            const [sh, sm] = (s.time ?? "07:00").split(":").map(Number);
            const topPx    = (sh - DAY_START) * pxPerHr + (sm / 60) * pxPerHr;
            // Batas bawah 22 px (dulu 28) supaya blok tidak bertumpuk di mode rapat.
            const heightPx = Math.max(s.durationHours * pxPerHr - 2, 22);
            const isDone   = s.status === "DONE";
            const isEditable = s.status === "SCHEDULED";
            const endH     = new Date(0, 0, 0, sh, sm + Math.round(s.durationHours * 60));
            const endLabel = `${String(endH.getHours()).padStart(2, "0")}:${String(endH.getMinutes()).padStart(2, "0")}`;
            return (
              <button key={s.id} type="button"
                className={`absolute rounded-lg overflow-hidden shadow-sm text-left transition-all ${isEditable ? "cursor-pointer hover:brightness-95" : "cursor-default"}`}
                style={{ top: topPx + 1, left: LABEL_W + 4, right: 6, height: heightPx,
                  background: color + (isDone ? "22" : "3A"), borderLeft: `3px solid ${color}` }}
                onClick={() => isEditable && (s.date < today ? actions.onResolveMissed(s) : actions.onEdit(s))}>
                <div className="px-2 py-1">
                  <p className="font-bold text-xs leading-tight truncate" style={{ color }}>
                    {info?.name ?? "—"}{isDone ? " ✓" : ""}{s.status === "NO_SHOW" ? " " : ""}{s.seriesId ? " " : ""}
                  </p>
                  <p className="opacity-70 truncate" style={{ color, fontSize: 10 }}>
                    {s.time} – {endLabel} · {s.durationHours}j
                  </p>
                </div>
                {isEditable && <span className="absolute top-1 right-1 text-xs opacity-50"><PencilIcon size={13} className="mr-1 inline align-[-2px]" /></span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
