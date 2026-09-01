/**
 * Hook logika tagihan paket (per pertemuan / session_count).
 *
 * Diekstraksi dari TagihanTab.tsx: progres antrean, terbitkan paket/penutup,
 * batalkan invoice, dan deep-link fokus murid (?studentId=).
 * Murni logika + state — JSX panel hidup di TagihanTab.tsx.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  listSessionCountBillingProgress, createSessionCountInvoice, cancelSessionCountInvoice,
} from "../../db/repos";
import type { SessionCountBillingProgress } from "../../db/repos";
import type { Payment, Student } from "../../db/types";
import { formatRupiah } from "../../lib/format";

export type ConfirmState = {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
};

export type MessageSetter = (message: string) => void;
export type ConfirmSetter = (state: ConfirmState | null) => void;

interface UseSessionCountBillingArgs {
  requestedStudentId: string;
  students: Student[] | undefined;
  setMessage: MessageSetter;
  setConfirmState: ConfirmSetter;
}

export function useSessionCountBilling({
  requestedStudentId, students, setMessage, setConfirmState,
}: UseSessionCountBillingArgs) {
  const sessionCountBillingProgress = useLiveQuery(() => listSessionCountBillingProgress(), []);

  const [expandedSessionCountStudent, setExpandedSessionCountStudent] = useState<string | null>(() => requestedStudentId || null);
  const [focusStudentId, setFocusStudentId] = useState<string | null>(() => requestedStudentId || null);
  const [sessionCountInvoiceBusy, setSessionCountInvoiceBusy] = useState<Record<string, boolean>>({});
  const [sessionCountCancelBusy, setSessionCountCancelBusy] = useState<Record<string, boolean>>({});
  const appliedFocusRef = useRef(false);

  // Deep-link focus (searchParams studentId) → buka baris antrean paket yang relevan.
  useEffect(() => {
    if (appliedFocusRef.current) return;
    if (!requestedStudentId || sessionCountBillingProgress === undefined || students === undefined) return;
    appliedFocusRef.current = true;
    if (sessionCountBillingProgress.some((row) => row.studentId === requestedStudentId)) {
      setExpandedSessionCountStudent(requestedStudentId);
    }
    // Murid tanpa antrean paket ditangani TagihanTab lewat fokusStudentId.
  }, [requestedStudentId, sessionCountBillingProgress, students]);

  // Jumlah antrean paket yang butuh aksi (badge tab + counter "Siap Ditagih").
  const needsActionCount = useMemo(() => (sessionCountBillingProgress ?? []).filter((row) => (
    row.readyBatchCount > 0
    || Boolean(row.pendingBillingPolicy && row.unbilledCount > 0 && row.unbilledCount < row.targetCount)
  )).length, [sessionCountBillingProgress]);

  const doCreateSessionCountInvoice = async (
    progress: SessionCountBillingProgress,
    finalBatch: boolean,
  ) => {
    setSessionCountInvoiceBusy((current) => ({ ...current, [progress.studentId]: true }));
    try {
      const result = await createSessionCountInvoice(progress.studentId, { finalBatch });
      
      setFocusStudentId(null);
      setExpandedSessionCountStudent(null);
      setMessage(
        `Tagihan ${result.finalBatch ? "penutup" : "paket"} ${result.sessionCount} pertemuan untuk ${progress.studentName} berhasil diterbitkan (${formatRupiah(result.totalCost)}) ✓`
        + (result.activatedBillingPolicy
          ? ` Siklus tagihan kini ${result.activatedBillingPolicy === "manual" ? "Manual" : "Bulanan"}.`
          : "")
      );
    } catch (error) {
      setMessage(`Gagal menerbitkan tagihan ${progress.studentName}: ${(error as Error).message}`);
    } finally {
      setSessionCountInvoiceBusy((current) => {
        const next = { ...current };
        delete next[progress.studentId];
        return next;
      });
    }
  };
  const handleCreateSessionCountInvoice = (
    progress: SessionCountBillingProgress,
    finalBatch = false,
  ) => {
    const canIssue = finalBatch
      ? Boolean(progress.pendingBillingPolicy)
        && progress.unbilledCount > 0
        && progress.unbilledCount < progress.targetCount
      : progress.readyBatchCount > 0;
    if (!canIssue || sessionCountInvoiceBusy[progress.studentId]) return;
    const sessionCount = finalBatch ? progress.unbilledCount : progress.targetCount;
    const pendingPolicyLabel = progress.pendingBillingPolicy === "manual" ? "Manual" : "Bulanan";
    setConfirmState({
      title: finalBatch ? "Terbitkan Tagihan Penutup" : "Terbitkan Tagihan Paket",
      message:
        `Terbitkan tagihan ${finalBatch ? "penutup" : "paket"} ${sessionCount} pertemuan untuk ${progress.studentName}?\n\n`
        + `Nominal ${formatRupiah(progress.nextBatchTotal)} akan langsung dibuat sebagai invoice belum lunas.`
        + (progress.pendingBillingPolicy
          ? ` Jika antrean menjadi kosong, siklus tagihan otomatis beralih ke ${pendingPolicyLabel}.`
          : ""),
      confirmLabel: "Terbitkan",
      onConfirm: () => {
        setConfirmState(null);
        void doCreateSessionCountInvoice(progress, finalBatch);
      },
    });
  };


    const doCancelSessionCountInvoice = async (
    payment: Payment,
    studentName: string,
    effectiveRestoredPolicy: "monthly" | "manual",
    finalBatch: boolean,
  ) => {
    setSessionCountCancelBusy((current) => ({ ...current, [payment.id]: true }));
    try {
      await cancelSessionCountInvoice(payment.id);
      setMessage(
        `${finalBatch ? "Tagihan penutup" : "Tagihan paket"} ${studentName} dibatalkan; sesi dikembalikan ke antrean ✓`
        + (effectiveRestoredPolicy ? ` Siklus kembali ke paket; peralihan ke ${effectiveRestoredPolicy === "manual" ? "Manual" : "Bulanan"} ditunda.` : ""),
      );
    } catch (error) {
      setMessage(`Gagal membatalkan tagihan ${studentName}: ${(error as Error).message}`);
    } finally {
      setSessionCountCancelBusy((current) => {
        const next = { ...current };
        delete next[payment.id];
        return next;
      });
    }
  };

    const handleCancelSessionCountInvoice = (
    payment: Payment,
    studentName: string,
    restoresPolicy?: "monthly" | "manual",
    finalBatch = false,
  ) => {
    const invoiceKind = finalBatch ? "tagihan penutup" : "tagihan paket";
    if (sessionCountCancelBusy[payment.id]) return;
    const currentPolicy = students?.find((student) => student.id === payment.studentId)?.billingPolicy ?? "monthly";
    const effectiveRestoredPolicy = currentPolicy === "session_count" ? restoresPolicy : currentPolicy;
    const restoredPolicyLabel = effectiveRestoredPolicy === "manual" ? "Manual" : "Bulanan";
    setConfirmState({
      title: `Batalkan ${invoiceKind}?`,
      message:
        `Batalkan ${invoiceKind} ${studentName}?\n\nInvoice dan laporan ${finalBatch ? "penutup" : "paket"} yang belum lunas akan dihapus. Semua sesinya kembali ke antrean dan dapat diterbitkan ulang.`
        + (effectiveRestoredPolicy ? ` Siklus kembali ke paket, lalu peralihan ke ${restoredPolicyLabel} ditunda sampai antrean diselesaikan.` : ""),
      confirmLabel: "Batalkan",
      danger: true,
      onConfirm: () => {
        setConfirmState(null);
        void doCancelSessionCountInvoice(payment, studentName, effectiveRestoredPolicy ?? "monthly", finalBatch);
      },
    });
  };

    return {
    sessionCountBillingProgress,
    needsActionCount,
    expandedSessionCountStudent,
    setExpandedSessionCountStudent,
    focusStudentId,
    setFocusStudentId,
    sessionCountInvoiceBusy,
    sessionCountCancelBusy,
    doCreateSessionCountInvoice,
    handleCreateSessionCountInvoice,
    doCancelSessionCountInvoice,
    handleCancelSessionCountInvoice,
  };
}
