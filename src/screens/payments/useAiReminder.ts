/**
 * Hook pengingat pembayaran AI (Reminder WA AI) — diekstraksi dari
 * TagihanTab.tsx. Menangani modal konfirmasi biaya, generasi pesan AI, dan
 * pembukaan wa.me dengan hasil generasi.
 */
import { useState } from "react";
import type { Student } from "../../db/types";
import { generatePaymentReminder, estimatePaymentReminderCost } from "../../lib/aiClient";
import { toWaNumber } from "../../lib/waBilling";
import type { MessageSetter } from "./useSessionCountBilling";

export interface ReminderModalState {
  paymentId: string;
  studentName: string;
  parentName?: string;
  month: string;
  amount: number;
}

interface UseAiReminderArgs {
  students: Student[];
  tutorName: string;
  setMessage: MessageSetter;
}

export function useAiReminder({ students, tutorName, setMessage }: UseAiReminderArgs) {
  const [reminderLoading, setReminderLoading] = useState<string | null>(null);
  const [reminderModal, setReminderModal] = useState<ReminderModalState | null>(null);

  const openReminderModal = (
    paymentId: string,
    student: Student,
    month: string,
    amount: number,
  ) => {
    setReminderModal({
      paymentId,
      studentName: student.name,
      parentName: student.parentContact?.name,
      month,
      amount,
    });
  };

  const confirmGenerateReminder = async () => {
    const m = reminderModal;
    if (!m) return;
    setReminderModal(null);
    setReminderLoading(m.paymentId);
    try {
      const res = await generatePaymentReminder({
        studentName: m.studentName,
        parentName: m.parentName,
        month: m.month,
        amount: m.amount,
        tutorName,
      });
      if (res.message) {
        const found = students.find((s) => s.name === m.studentName);
        const phone = found?.parentContact?.phone ? toWaNumber(found.parentContact.phone) : "";
        const url = phone
          ? `https://wa.me/${phone}?text=${encodeURIComponent(res.message)}`
          : `https://wa.me/?text=${encodeURIComponent(res.message)}`;
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (e) { setMessage("AI error: " + (e as Error).message); }
    finally { setReminderLoading(null); }
  };

  return {
    reminderLoading,
    reminderModal,
    setReminderModal,
    openReminderModal,
    confirmGenerateReminder,
    estimateCost: estimatePaymentReminderCost,
  };
}
