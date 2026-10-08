/**
 * Kartu pemilih cakupan laporan: murid, periode belajar, draft yang menggantung,
 * periode yang sudah dikunci, dan penyaring mapel.
 *
 * Dipisah dari MonthlyReport.tsx pada refactor terbatas G3-05.
 *
 * Satu perilaku yang sengaja diperbaiki di sini: hapus draft dulu memakai
 * `confirm()` bawaan peramban, padahal ATURAN-AI §4.1 menetapkan semua dialog
 * konfirmasi memakai komponen internal. Sekarang memakai `ConfirmSheet`, yang
 * juga memberi tombol Escape, penguncian fokus, dan nama tombol yang jelas.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import ConfirmSheet from "../../components/ConfirmSheet";
import EmptyState from "../../components/EmptyState";
import MaskedMoney from "../../components/ui/MaskedMoney";
import { dayLabel, monthLabel, periodLabel } from "../../lib/format";
import { reportStatus, billingPolicyOf, type MonthlyReport, type Student } from "../../db/types";
import type { Session } from "../../db/types";
import type { RecapMode } from "./helpers";

export type { RecapMode };

const MODE_LABEL: ReadonlyArray<{ value: RecapMode; label: string }> = [
  { value: "bulan", label: "Bulan Kalender" },
  { value: "jumlah", label: "Jumlah Sesi" },
  { value: "range", label: "Rentang Tanggal" },
];

interface ReportScopeControlsProps {
  studentId: string;
  studentOptions: readonly Student[];
  student?: Student;
  onStudentChange: (studentId: string) => void;
  /**
   * Jalankan perubahan cakupan. Perubahannya datang sebagai callback, bukan
   * sebagai efek samping langsung, supaya pemanggil bisa menyimpan narasi yang
   * belum tersimpan dulu (G3-05 butir 9) sebelum cakupannya benar-benar pindah.
   */
  onScopeChange: (apply: () => void) => void;

  drafts: readonly MonthlyReport[];
  onOpenDraft: (report: MonthlyReport) => void;
  onDeleteDraft: (report: MonthlyReport) => Promise<void>;

  mode: RecapMode;
  onModeChange: (mode: RecapMode) => void;
  /** Tombol mode selain "Jumlah Sesi" mati selama murid memakai paket pertemuan. */
  modeLocked: boolean;

  month: string;
  onMonthChange: (month: string) => void;
  /** Sesi yang benar-benar ada di jendela tanggal terpilih. */
  sessions: readonly Session[];
  reportSessionCount: number;
  reportTargetCount: number;
  onCountChange: (count: number) => void;

  rangeStart: string;
  rangeEnd: string;
  onRangeChange: (range: { start?: string; end?: string }) => void;

  periodStart: string;
  periodEnd: string;

  confirmedReports: readonly MonthlyReport[];

  uniqueSubjects: readonly string[];
  subjectFilter: string;
  onSubjectFilter: (subject: string) => void;
  /** Chip cakupan penyaring (G3-05 butir 7). */
  scopeChip?: string;

  availability: { ok: boolean; reason: string; blockingReportId?: string };
  protectedNewSessionCount: number;
  /** Murid memakai siklus paket pertemuan. */
  packageStudent: boolean;
  report?: MonthlyReport;
  billingHref: string;
  onShowBillingHelp: () => void;
}

export default function ReportScopeControls({
  studentId, studentOptions, student, onStudentChange, onScopeChange,
  drafts, onOpenDraft, onDeleteDraft,
  mode, onModeChange, modeLocked,
  month, onMonthChange, sessions, reportSessionCount, reportTargetCount, onCountChange,
  rangeStart, rangeEnd, onRangeChange,
  periodStart, periodEnd, confirmedReports,
  uniqueSubjects, subjectFilter, onSubjectFilter, scopeChip,
  availability, protectedNewSessionCount, packageStudent, report,
  billingHref, onShowBillingHelp,
}: ReportScopeControlsProps) {
  const [draftToDelete, setDraftToDelete] = useState<MonthlyReport | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const confirmDeleteDraft = async () => {
    if (!draftToDelete) return;
    setDeleteBusy(true);
    try {
      await onDeleteDraft(draftToDelete);
      setDraftToDelete(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-2">
        <div>
          <label htmlFor="mr-murid" className="label">Murid</label>
          <select
            id="mr-murid"
            className="input"
            value={studentId}
            onChange={(e) => onScopeChange(() => onStudentChange(e.target.value))}
          >
            <option value="">Pilih murid...</option>
            {studentOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </div>

        {drafts.length > 0 && (
          <div className="space-y-1.5 rounded-lg border border-[var(--border-warn)] bg-[var(--bg-warn)] p-2.5">
            <p className="text-xs font-semibold text-[var(--ink-warn)]">📋 {drafts.length} laporan draft — belum final</p>
            {drafts.map((draft) => (
              <div key={draft.id} className="flex items-center justify-between gap-1 text-xs">
                <span className="truncate font-medium text-[var(--ink-strong)]">{periodLabel(draft.periodStart, draft.periodEnd)}</span>
                <MaskedMoney amount={draft.totalCost} className="text-[var(--ink-muted)]" />
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => onOpenDraft(draft)}
                    className="inline-flex min-h-[32px] items-center rounded bg-[var(--brand-tint-strong)] px-2.5 py-1 text-xs font-medium text-[var(--ink-brand)] transition-colors hover:bg-[var(--brand-tint-strong)]"
                  >
                    Buka
                  </button>
                  <button
                    type="button"
                    aria-label={`Hapus draft ${periodLabel(draft.periodStart, draft.periodEnd)}`}
                    onClick={() => setDraftToDelete(draft)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded text-xs text-[var(--ink-danger)] transition-colors hover:bg-[var(--bg-danger)]"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between">
            <label className="label">Periode belajar</label>
            <button
              type="button"
              onClick={onShowBillingHelp}
              aria-label="Bantuan memilih periode belajar dan memahami penagihan"
              title="Periode belajar & penagihan"
              className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[var(--bg-subtle)] text-sm font-bold text-[var(--ink-muted)] transition-colors hover:bg-[var(--brand-tint-strong)] hover:text-[var(--ink-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-brand)]"
            >?</button>
          </div>
          <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Cara memilih periode belajar">
            {MODE_LABEL.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                disabled={modeLocked && value !== "jumlah"}
                onClick={() => onScopeChange(() => onModeChange(value))}
                className={`rounded-lg px-1 py-2 text-xs font-semibold leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  mode === value
                    ? "bg-[var(--brand-solid)] text-[var(--on-strong)]"
                    : "bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          {mode === "bulan" && (
            <>
              <label htmlFor="mr-bulan" className="label">Bulan belajar</label>
              <input
                id="mr-bulan"
                className="input"
                type="month"
                value={month}
                onChange={(e) => onScopeChange(() => onMonthChange(e.target.value))}
              />
              {/* Rentang terpakai diperlihatkan apa adanya (sesi pertama →
                  sesi terakhir), supaya tutor tidak menebak-nebak tanggal
                  yang benar-benar masuk laporan. */}
              {studentId && sessions.length > 0 && (
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-xs text-[var(--ink-muted)]">
                    Sesi bulan ini: {dayLabel(sessions[0].date)}
                    {sessions.length > 1 ? ` → ${dayLabel(sessions[sessions.length - 1].date)}` : ""}
                    {` · ${sessions.length} sesi`}
                  </p>
                  <button
                    type="button"
                    onClick={() => onScopeChange(() => {
                      onRangeChange({ start: sessions[0].date, end: sessions[sessions.length - 1].date });
                      onModeChange("range");
                    })}
                    title="Pindah ke Rentang Tanggal dengan tanggal sesi pertama & terakhir terisi"
                    className="inline-flex min-h-[32px] items-center rounded-md bg-[var(--bg-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-muted)] transition-colors hover:bg-[var(--bg-subtle)]"
                  >
                    Sesuaikan tanggal
                  </button>
                </div>
              )}
            </>
          )}

          {mode === "jumlah" && (
            <>
              <label htmlFor="mr-jumlah" className="label">Jumlah sesi</label>
              <input
                id="mr-jumlah"
                className="input"
                type="number"
                min={1}
                max={20}
                value={reportTargetCount}
                disabled={packageStudent}
                onChange={(e) => onScopeChange(() => onCountChange(Math.max(1, Math.min(20, Number(e.target.value) || 1))))}
              />
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                {packageStudent
                  ? "Mengambil N sesi tertua sesuai siklus murid. Invoice paket tetap diterbitkan dari Keuangan."
                  : "Mengambil N sesi tertua yang belum masuk laporan final."}
              </p>
              {packageStudent && (
                <div className="mt-1 space-y-1.5">
                  <p className="text-xs font-semibold text-[var(--ink-accent)]">
                    Siklus murid dikunci pada {student?.billingSessionCount ?? 8} pertemuan. Terbitkan tagihan paket melalui Keuangan agar sesi diklaim secara atomik.
                  </p>
                  {(!report || reportStatus(report) !== "confirmed") && (
                    <Link
                      to={billingHref}
                      className="inline-flex rounded-lg bg-[var(--accent-tint)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ink-accent)] hover:bg-[var(--accent-tint)]"
                    >
                      Buka Antrean Tagihan
                    </Link>
                  )}
                </div>
              )}
            </>
          )}

          {mode === "range" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="mr-tanggal-awal" className="label">Tanggal awal</label>
                <input
                  id="mr-tanggal-awal"
                  className="input"
                  type="date"
                  value={rangeStart}
                  onChange={(e) => onScopeChange(() => onRangeChange({ start: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="mr-tanggal-akhir" className="label">Tanggal akhir</label>
                <input
                  id="mr-tanggal-akhir"
                  className="input"
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => onScopeChange(() => onRangeChange({ end: e.target.value }))}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {studentId && periodStart && periodEnd && (
        <p className="text-xs text-[var(--ink-muted)]">
          Periode belajar: <strong>{periodLabel(periodStart, periodEnd)}</strong>
          {mode === "jumlah" && ` · ${reportSessionCount}/${reportTargetCount} pertemuan`}
        </p>
      )}

      {/* Periode yang sudah terkunci — daftar terbuka, bukan hanya keluhan
          saat tombol ditekan. Tutor bisa melihat sendiri rentang mana yang
          sudah direkap sebelum memilih periode. */}
      {studentId && confirmedReports.length > 0 && (
        <details className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5">
          <summary className="cursor-pointer select-none text-xs font-semibold text-[var(--ink-muted)]">
            🔒 {confirmedReports.length} periode sudah direkap (final) — lihat rentangnya
          </summary>
          <ul className="mt-1.5 space-y-1">
            {[...confirmedReports]
              .sort((a, b) => (b.periodStart ?? "").localeCompare(a.periodStart ?? ""))
              .map((locked) => (
                <li key={locked.id} className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs text-[var(--ink-muted)]">
                  <span>
                    {periodLabel(locked.periodStart, locked.periodEnd)}
                    <span className="text-[var(--ink-muted)]"> · {locked.sessionIds.length} sesi</span>
                  </span>
                  <Link to={`/report?reportId=${encodeURIComponent(locked.id)}`} className="font-semibold text-[var(--ink-brand)] hover:underline">
                    Buka
                  </Link>
                </li>
              ))}
          </ul>
          <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--ink-muted)]">
            Yang dikunci adalah <b>sesinya</b>, bukan tanggalnya: sesi yang sudah masuk laporan final
            tidak bisa direkap dua kali, tetapi tanggal di luar sesi itu tetap bebas dipakai.
          </p>
        </details>
      )}

      {uniqueSubjects.length > 1 && studentId && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSubjectFilter("")}
            aria-pressed={!subjectFilter}
            className={`inline-flex min-h-[36px] items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              !subjectFilter ? "bg-[var(--brand-solid)] text-[var(--on-strong)]" : "bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)]"
            }`}
          >
            Semua
          </button>
          {uniqueSubjects.map((subject) => (
            <button
              key={subject}
              type="button"
              aria-pressed={subject === subjectFilter}
              onClick={() => onSubjectFilter(subject === subjectFilter ? "" : subject)}
              className={`inline-flex min-h-[36px] items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                subject === subjectFilter ? "bg-[var(--brand-solid)] text-[var(--on-strong)]" : "bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)]"
              }`}
            >
              {subject}
            </button>
          ))}
          {scopeChip && (
            <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-muted)]">
              {scopeChip}
            </span>
          )}
        </div>
      )}

      {!studentId && (
        <p className="py-1 text-center text-sm text-[var(--ink-muted)]">Pilih murid untuk mulai menyusun laporan.</p>
      )}

      {studentId && sessions.length === 0 && (
        <EmptyState
          message={`Belum ada sesi di ${periodLabel(periodStart, periodEnd) || monthLabel(month)}`}
          description="Laporan disusun dari sesi yang sudah dicatat. Catat sesi dulu, atau geser periode ke bulan yang sudah punya sesi."
          action={<Link to="/capture" className="btn btn-primary w-full text-sm">Rekam Sesi Sekarang</Link>}
        />
      )}

      {studentId && sessions.length > 0 && reportSessionCount === 0 && (
        <p className="py-1 text-center text-sm text-[var(--ink-muted)]">
          {mode === "jumlah"
            ? "Belum ada pertemuan yang siap dimasukkan ke paket ini."
            : "Semua sesi di periode ini sudah pernah direkap — pilih periode lain."}
        </p>
      )}

      {studentId && periodStart && periodEnd && reportSessionCount > 0 && (
        availability.ok ? (
          <p className="rounded-lg border border-[var(--border-success)] bg-[var(--bg-success)] px-2.5 py-1.5 text-xs text-[var(--ink-success)]">
            {report
              ? "✓ Laporan ini dapat diperbarui."
              : mode === "jumlah"
                ? "✓ Paket tersedia — seluruh pertemuan belum pernah ditagih."
                : "✓ Periode tersedia — sesi di periode ini belum pernah direkap."}
          </p>
        ) : (
          <div className="space-y-1.5 rounded-lg border border-[var(--border-danger)] bg-[var(--bg-danger)] px-2.5 py-1.5">
            <p className="text-xs text-[var(--ink-danger)]">⛔ {availability.reason}</p>
            {availability.blockingReportId && (
              <Link
                to={`/report?reportId=${encodeURIComponent(availability.blockingReportId)}`}
                className="inline-flex rounded-lg bg-[var(--surface-strong)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ink-danger)] ring-1 ring-[var(--border-danger)] hover:bg-[var(--bg-danger)]"
              >
                📄 Buka laporan yang memblokir →
              </Link>
            )}
          </div>
        )
      )}

      {protectedNewSessionCount > 0 && (
        <p className="rounded-lg border border-[var(--border-warn)] bg-[var(--bg-warn)] px-2.5 py-1.5 text-xs text-[var(--ink-warn)]">
          🔒 {protectedNewSessionCount} sesi baru tidak dimasukkan ke invoice yang sudah manual/lunas. {packageStudent || report?.billingMode === "session_count"
            ? "Sesi tersebut tetap masuk antrean Tagihan untuk paket berikutnya."
            : student && billingPolicyOf(student) === "manual"
              ? "Buat laporan susulan secara manual dari sesi tersebut."
              : "Gunakan Tutup Bulan untuk membuat laporan susulan."}
        </p>
      )}

      <ConfirmSheet
        open={Boolean(draftToDelete)}
        title="Hapus draft laporan ini?"
        message={draftToDelete
          ? `Draft ${periodLabel(draftToDelete.periodStart, draftToDelete.periodEnd)} (${draftToDelete.sessionIds.length} sesi) akan dibatalkan. Sesinya tidak dihapus dan tetap bisa direkap lagi di periode lain.`
          : ""}
        confirmLabel="Hapus draft"
        danger
        busy={deleteBusy}
        onCancel={() => setDraftToDelete(null)}
        onConfirm={() => void confirmDeleteDraft()}
      />
    </section>
  );
}
