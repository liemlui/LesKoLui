/**
 * Panel "Laporan tersimpan" (riwayat laporan lintas murid).
 *
 * Menu Laporan harus bisa membuka laporan yang sudah pernah dibuat — tanpa panel
 * ini, satu-satunya jalan masuk adalah tautan `?reportId=` dari Keuangan
 * (keputusan pemilik 2026-10-01). Dipisah dari MonthlyReport.tsx pada refactor
 * terbatas G3-05.
 */

import MaskedMoney from "../../components/ui/MaskedMoney";
import EmptyState from "../../components/EmptyState";
import { BookIcon } from "../../components/icons";
import { dayLabel, monthLabel, periodLabel } from "../../lib/format";
import { reportStatus, type MonthlyReport, type Student } from "../../db/types";

interface ReportHistoryPanelProps {
  open: boolean;
  onToggle: () => void;
  /** Semua laporan yang dimuat (untuk keadaan kosong). */
  history: readonly MonthlyReport[];
  /** Laporan yang sedang ditampilkan (sudah dipotong bila belum diperluas). */
  visible: readonly MonthlyReport[];
  filteredCount: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  studentOptions: readonly Student[];
  filterStudentId: string;
  onFilterStudent: (studentId: string) => void;
  /** id laporan yang sedang dibuka — diberi tanda "sedang dibuka". */
  currentReportId?: string;
  onOpen: (report: MonthlyReport) => void;
}

export default function ReportHistoryPanel({
  open, onToggle, history, visible, filteredCount, expanded, onToggleExpanded,
  studentOptions, filterStudentId, onFilterStudent, currentReportId, onOpen,
}: ReportHistoryPanelProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-sm">
      <button
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
        aria-expanded={open}
        onClick={onToggle}
      >
        <div>
          <p className="text-sm font-semibold text-[var(--ink-strong)]">
            <BookIcon size={13} className="mr-1 inline align-[-2px]" /> Laporan tersimpan
          </p>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
            Buka lagi laporan yang sudah pernah dibuat — draft maupun yang sudah final.
          </p>
        </div>
        <span className="text-sm text-[var(--ink-muted)]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-[var(--border)] p-4">
          {history.length === 0 ? (
            <EmptyState
              message="Belum ada laporan tersimpan"
              description="Pilih murid dan periode di bawah, lalu buat laporan pertama."
              icon="🗂️"
            />
          ) : (
            <>
              <select
                className="input text-sm"
                aria-label="Saring riwayat laporan menurut murid"
                value={filterStudentId}
                onChange={(e) => onFilterStudent(e.target.value)}
              >
                <option value="">Semua murid</option>
                {studentOptions.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
              </select>
              <ul className="divide-y divide-[var(--border)]">
                {visible.map((row) => {
                  const owner = studentOptions.find((student) => student.id === row.studentId);
                  const status = reportStatus(row);
                  const isCurrent = currentReportId === row.id;
                  return (
                    <li key={row.id} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--ink-strong)]">
                          {owner?.name ?? "Murid dihapus"}
                          {isCurrent && <span className="ml-1 text-xs text-[var(--ink-brand)]">• sedang dibuka</span>}
                        </p>
                        <p className="text-xs text-[var(--ink-muted)]">
                          {periodLabel(row.periodStart, row.periodEnd) || monthLabel(row.month)}
                          {" · "}
                          {status === "confirmed" ? "Final" : "Draft"}
                          {" · "}<MaskedMoney amount={row.totalCost} />
                        </p>
                        {/* Rentang penuh + jumlah sesi apa adanya: di sinilah
                            terlihat kalau sebuah laporan diam-diam mengunci
                            rentang yang lebih lebar daripada sesinya. */}
                        <p className="text-[11px] text-[var(--ink-muted)]">
                          {row.periodStart} → {row.periodEnd} · {row.sessionIds.length} sesi
                          {row.createdAt ? ` · dibuat ${dayLabel(row.createdAt.slice(0, 10))}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => onOpen(row)}
                        className="inline-flex min-h-[36px] shrink-0 items-center rounded-lg bg-[var(--brand-tint)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-brand)] transition-colors hover:bg-[var(--brand-tint-strong)]"
                      >
                        Buka
                      </button>
                    </li>
                  );
                })}
              </ul>
              {filteredCount > 6 && (
                <button
                  onClick={onToggleExpanded}
                  className="w-full rounded-lg bg-[var(--surface)] py-2 text-xs font-semibold text-[var(--ink-muted)] transition-colors hover:bg-[var(--bg-subtle)]"
                >
                  {expanded ? "Tampilkan lebih sedikit" : `Tampilkan semua ${filteredCount} laporan`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
