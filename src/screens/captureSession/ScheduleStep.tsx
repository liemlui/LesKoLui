import PaginationControls from "../../components/PaginationControls";
import { dayLabel } from "../../lib/format";
import { DURATIONS } from "./constants";
import { SESSION_TYPE_OPTIONS } from "../../lib/sessionTemplates";
import type { FollowUpItem, Session, Student } from "../../db/types";
import type { SessionType } from "../../lib/sessionTemplates";

interface ScheduleStepProps {
  scheduleId?: string;
  student?: Student;
  studentId: string;
  students: Student[];
  sessionDate: string;
  today: string;
  duration: number;
  sessionType?: SessionType;
  conflictCount: number;
  lastSession?: Session;
  followUps: FollowUpItem[];
  paginatedFollowUps: FollowUpItem[];
  followUpPage: number;
  onNavigateToNewCapture: () => void;
  onStudentChange: (studentId: string) => void;
  onSessionDateChange: (date: string) => void;
  onDurationChange: (duration: number) => void;
  onSessionTypeChange: (sessionType: SessionType | undefined) => void;
  onFollowUpPageChange: (page: number) => void;
}

/** Langkah pertama wizard Catat Sesi: jadwal, murid, dan konteks persiapan. */
export default function ScheduleStep({
  scheduleId, student, studentId, students, sessionDate, today, duration, sessionType,
  conflictCount, lastSession, followUps,
  paginatedFollowUps, followUpPage, onNavigateToNewCapture, onStudentChange,
  onSessionDateChange, onDurationChange, onSessionTypeChange, onFollowUpPageChange,
}: ScheduleStepProps) {
  return (
    <div className="px-4 space-y-4">
      {scheduleId && (
        <div className="rounded-xl border border-[var(--brand-tint-strong)] bg-[var(--brand-tint)] p-3.5">
          <p className="text-xs font-bold text-[var(--ink-brand)] uppercase tracking-wide">🗓️ Menyelesaikan jadwal</p>
          <p className="mt-1 text-sm font-bold text-[var(--ink-brand)]">
            {student?.name ?? "Murid jadwal"}
            <span className="font-semibold text-[var(--ink-brand)]"> · {dayLabel(sessionDate)} · {duration} jam</span>
          </p>
          <p className="mt-1 text-xs text-[var(--ink-brand)]">
            Murid dan tanggal mengikuti jadwal ini. Salah jadwal?{" "}
            <button type="button" onClick={onNavigateToNewCapture}
              className="font-semibold underline hover:text-[var(--ink-brand)]">Catat sesi baru</button>.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="cs-murid" className="label">👤 Murid <span className="text-[var(--ink-danger)]">*</span></label>
        <select id="cs-murid" className="input disabled:bg-[var(--bg-subtle)] disabled:text-[var(--ink-muted)]"
          value={studentId} disabled={Boolean(scheduleId)}
          aria-describedby={scheduleId ? "cs-murid-hint" : undefined}
          onChange={(e) => onStudentChange(e.target.value)}>
          <option value="">Pilih murid...</option>
          {students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        {scheduleId && <p id="cs-murid-hint" className="text-xs text-[var(--ink-muted)] mt-1">Terkunci karena sesi ini menyelesaikan jadwal yang sudah ada.</p>}
      </div>

      <div>
        <label htmlFor="cs-tanggal" className="label">📅 Tanggal Sesi</label>
        <input id="cs-tanggal" className="input disabled:bg-[var(--bg-subtle)] disabled:text-[var(--ink-muted)]" type="date" value={sessionDate}
          max={today} disabled={Boolean(scheduleId)} aria-describedby={scheduleId ? "cs-tanggal-hint" : undefined}
          onChange={(e) => onSessionDateChange(e.target.value)} />
        {scheduleId ? <p id="cs-tanggal-hint" className="text-xs text-[var(--ink-muted)] mt-1">Tanggal terkunci mengikuti jadwal.</p>
          : sessionDate !== today && <p className="text-xs text-[var(--ink-attention)] mt-1">⏪ Merekam sesi masa lalu</p>}
      </div>

      <div>
        <label className="label">⏱️ Durasi</label>
        <div className="relative"><div className="flex gap-2 overflow-x-auto pb-1 pr-8 snap-x">
          {DURATIONS.map((item) => <button key={item} type="button"
            className={`snap-start flex-shrink-0 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${duration === item ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]" : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)]"}`}
            onClick={() => onDurationChange(item)}>{item}j</button>)}
        </div><div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" aria-hidden="true" /></div>
      </div>

      <div>
        <label className="label">🗂️ Tipe Sesi <span className="text-[var(--ink-muted)] font-normal text-xs">(opsional)</span></label>
        <div className="flex flex-wrap gap-2 mt-1">
          {SESSION_TYPE_OPTIONS.map((option) => <button key={option.value} type="button"
            onClick={() => onSessionTypeChange(sessionType === option.value ? undefined : option.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${sessionType === option.value ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]" : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)] hover:border-[var(--brand-tint-strong)]"}`}>
            <span><option.Icon size={14} aria-hidden="true" /></span> {option.label}
          </button>)}
        </div>
      </div>

      {conflictCount > 0 && <div className="bg-[var(--bg-attention)] border border-[var(--border-attention)] rounded-xl p-3"><p className="text-sm font-semibold text-[var(--ink-attention)]">⚠️ Perhatian</p><p className="text-xs text-[var(--ink-attention)] mt-0.5">Tanggal ini sudah ada sesi DONE untuk murid lain ({conflictCount} sesi). Pastikan jadwal tidak bentrok.</p></div>}

      {studentId && (lastSession || followUps.length > 0) && <div className="bg-[var(--bg-warn)] border border-[var(--border-warn)] rounded-xl p-3.5 space-y-2.5">
        <p className="text-xs font-bold text-[var(--ink-warn)] uppercase tracking-wide">📋 Persiapan Sesi</p>
        {lastSession && <div className="space-y-0.5"><p className="text-xs font-semibold text-[var(--ink-warn)]">Sesi terakhir — {dayLabel(lastSession.date).split(",")[1]?.trim() ?? lastSession.date.slice(5)}{lastSession.subjects.length > 0 && ` (${lastSession.subjects.join(", ")})`}</p><p className="text-xs text-[var(--ink-muted)] leading-relaxed">&quot;{lastSession.shortNote}&quot;</p>{lastSession.topic && <p className="text-xs text-[var(--ink-muted)]">💡 Topik: {lastSession.topic}</p>}</div>}
        {followUps.length > 0 && <div><p className="text-xs font-semibold text-[var(--ink-brand)] mb-1">🔁 Lanjutkan dari sesi lalu:</p>{paginatedFollowUps.map((item) => <p key={item.id} className="text-xs text-[var(--ink-muted)]">• {item.text}</p>)}<PaginationControls page={followUpPage} total={followUps.length} onPageChange={onFollowUpPageChange} label="follow-up" /></div>}
      </div>}
    </div>
  );
}
