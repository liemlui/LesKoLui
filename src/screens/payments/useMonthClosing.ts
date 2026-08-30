/**
 * Hook tutup buku bulan (month closing) — diekstraksi dari TagihanTab.tsx.
 *
 * Meliputi: preview tagihan (computeMonthBills), proyeksi adopsi invoice
 * manual, pre-flight checklist, ketersediaan tutup (tgl ≥ 28), serta aksi
 * close/reopen dengan konfirmasi. Murni logika — JSX panel ada di TagihanTab.
 */
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  listMonthClosings, getMonthClosing, computeMonthBills,
  closeMonth, reopenMonth, listScheduledForMonth,
} from "../../db/repos";
import type { MonthlyReport, Payment, Session, Student } from "../../db/types";
import { reportStatus } from "../../db/types";
import { todayWIB, monthLabel } from "../../lib/format";
import { buildMonthClosingProjection } from "../../lib/billingPreview";
import { buildClosingChecklist } from "../../lib/closingChecklist";
import type { ConfirmSetter, MessageSetter } from "./useSessionCountBilling";

interface UseMonthClosingArgs {
  month: string;
  payments: Payment[];
  students: Student[] | undefined;
  reports: MonthlyReport[];
  monthSessions: Session[];
  setMessage: MessageSetter;
  setConfirmState: ConfirmSetter;
}

export function useMonthClosing({
  month, payments, students, reports, monthSessions, setMessage, setConfirmState,
}: UseMonthClosingArgs) {
  const closings = useLiveQuery(() => listMonthClosings(), []);
  const monthClosing = useLiveQuery(() => getMonthClosing(month), [month]);
  // Preview tutup bulan dari satu sumber kebenaran (computeMonthBills).
  const previewBills = useLiveQuery(() => computeMonthBills(month, { excludeReportCovered: true }), [month]);

  const [closingBusy, setClosingBusy] = useState(false);
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);

  const coveredSessionIds = useMemo(
    () => new Set(reports.filter((r) => reportStatus(r) === "confirmed").flatMap((r) => r.sessionIds)),
    [reports]
  );
  const closingSessions = useMemo(
    () => monthSessions.filter((session) => {
      if (coveredSessionIds.has(session.id)) return false;
      const student = students?.find((row) => row.id === session.studentId);
      return (student?.billingPolicy ?? "monthly") === "monthly";
    }),
    [monthSessions, coveredSessionIds, students]
  );
  const skippedClosingStudents = useMemo(() => new Set(
    monthSessions
      .filter((session) => {
        if (coveredSessionIds.has(session.id)) return false;
        const policy = students?.find((row) => row.id === session.studentId)?.billingPolicy ?? "monthly";
        return policy !== "monthly";
      })
      .map((session) => session.studentId)
  ).size, [monthSessions, coveredSessionIds, students]);

  const closingProjection = useMemo(
    () => buildMonthClosingProjection(previewBills ?? [], payments.filter((p) => p.month === month)),
    [previewBills, payments, month],
  );
  // Pre-flight checklist tutup bulan: draft laporan, piutang carry-over,
  // murid non-bulanan dengan sesi yang tidak masuk tutup.
  const closingChecklist = useMemo(
    () => buildClosingChecklist({
      month,
      reports,
      sessions: monthSessions,
      payments,
      students: students ?? [],
    }),
    [month, reports, monthSessions, payments, students],
  );
  const previewSessionsByStudent = useMemo(() => closingSessions.reduce<Map<string, Session[]>>((m, s) => {
    const arr = m.get(s.studentId) ?? [];
    arr.push(s);
    m.set(s.studentId, arr);
    return m;
  }, new Map()), [closingSessions]);

  // ── Availability tutup bulan ──
  const _today = todayWIB();
  const curMonth = _today.slice(0, 7);
  const curDay = Number(_today.slice(8, 10));
  const canClose = month < curMonth || (month === curMonth && curDay >= 28);
  const closeHint = month > curMonth
    ? "Bulan belum berjalan."
    : "Tutup bulan berjalan tersedia mulai tanggal 28.";

  const doCloseMonth = async () => {
    setClosingBusy(true);
    try {
      await closeMonth(month);
      setMessage(`Bulan ${monthLabel(month)} ditutup ✓ Laporan dan tagihan diselaraskan.`);
    } catch (e) { setMessage("Gagal: " + (e as Error).message); }
    finally { setClosingBusy(false); }
  };

  const handleCloseMonth = async (studentNameOf: (studentId: string) => string | undefined) => {
    const scheduled = await listScheduledForMonth(month);
    if (scheduled.length > 0) {
      const names = scheduled.map((s) => studentNameOf(s.studentId) ?? "(dihapus)");
      const unique = [...new Set(names)];
      setConfirmState({
        title: "Tutup Bulan",
        message: `⚠️ Masih ada ${scheduled.length} sesi terjadwal yang BELUM diajar:\n${unique.join(", ")}\n\nTetap tutup bulan?`,
        confirmLabel: "Tutup Bulan",
        danger: true,
        onConfirm: () => {
          setConfirmState(null);
          void doCloseMonth();
        },
      });
      return;
    }
    void doCloseMonth();
  };

  const doReopenMonth = async () => {
    await reopenMonth(month);
    setMessage(`Bulan ${monthLabel(month)} dibuka kembali.`);
  };

  const handleReopenMonth = () => {
    setConfirmState({
      title: "Buka Kembali Bulan",
      message: `Buka kembali ${monthLabel(month)}? Tagihan otomatis yang belum lunas akan dihapus (tagihan manual dan yang sudah lunas tetap).`,
      confirmLabel: "Buka Kembali",
      danger: true,
      onConfirm: () => {
        setConfirmState(null);
        void doReopenMonth();
      },
    });
  };

  return {
    closings,
    monthClosing,
    previewBills,
    closingBusy,
    expandedPreview,
    setExpandedPreview,
    coveredSessionIds,
    closingSessions,
    skippedClosingStudents,
    closingProjection,
    closingChecklist,
    previewSessionsByStudent,
    canClose,
    closeHint,
    handleCloseMonth,
    handleReopenMonth,
  };
}
