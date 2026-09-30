/**
 * Hook aksi pemulihan & pembatalan tagihan (TASK-10 L7).
 *
 * Semua aksi destruktif di sini mengikuti satu jalur yang sama:
 *   konfirmasi jelas → PIN Keuangan (D4) → aksi repo → pesan hasil.
 *
 * PIN tidak diverifikasi di sini: `PinConfirmModal` yang memverifikasi (pola
 * yang sudah ada: lockout + pesan galat), sehingga tidak ada pemeriksaan PIN
 * ganda dan tidak ada aksi yang bisa lolos tanpa PIN.
 *
 * Pemulihan memakai snapshot R1 di `auditLog` yang bersifat LOKAL per perangkat
 * dan tidak ikut backup — karena itu setiap konfirmasi menyarankan Backup ke
 * File lebih dulu. R1 bukan pengganti backup.
 */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  cancelReportInvoice, deleteManualPayment, listInvoiceCancellations,
  restoreCancelledInvoice, updatePaymentDueAt,
} from "../../db/repos";
import type { InvoiceCancellation } from "../../db/repos";
import type { Payment } from "../../db/types";
import { formatRupiah, monthLabel } from "../../lib/format";

export type RecoveryConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  onConfirm: () => void;
};

export type PinAction = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
};

interface UseInvoiceRecoveryArgs {
  setMessage: (message: string) => void;
  setConfirmState: (state: RecoveryConfirmState | null) => void;
  /** D4: tanpa PIN Keuangan, aksi destruktif tidak dijalankan sama sekali. */
  pinAvailable: boolean;
}

const KIND_LABEL: Record<InvoiceCancellation["kind"], string> = {
  package: "Paket pertemuan",
  report: "Invoice laporan",
  manual: "Tagihan manual",
};

/** Kalimat pengingat batas R1 yang dipakai semua aksi destruktif di Keuangan. */
export const RECOVERY_LIMITS_HINT = "Pemulihan hanya tersedia di perangkat ini dan tidak ikut backup. Buat Backup ke File dari Pengaturan untuk salinan permanen.";

export function invoiceKindLabel(kind: InvoiceCancellation["kind"]): string {
  return KIND_LABEL[kind];
}

export function useInvoiceRecovery({ setMessage, setConfirmState, pinAvailable }: UseInvoiceRecoveryArgs) {
  /** Snapshot pembatalan yang masih bisa dipulihkan (lokal per perangkat). */
  const cancellations = useLiveQuery(() => listInvoiceCancellations(), []);
  const [busyKeys, setBusyKeys] = useState<Record<string, boolean>>({});
  const [pinAction, setPinAction] = useState<PinAction | null>(null);

  const setBusy = (key: string, value: boolean) => {
    setBusyKeys((current) => {
      if (value) return { ...current, [key]: true };
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const execute = async (key: string, action: () => Promise<void>, success: string) => {
    setBusy(key, true);
    try {
      await action();
      setMessage(success);
    } catch (error) {
      setMessage(`Gagal: ${(error as Error).message}`);
    } finally {
      setBusy(key, false);
    }
  };

  /**
   * Minta PIN untuk aksi destruktif yang tidak dijalankan lewat hook ini
   * (mis. pembatalan paket dari antrean). D4 berlaku untuk SEMUA pembatalan.
   */
  const requestPin = (action: PinAction) => {
    if (!pinAvailable) {
      setMessage("Buat PIN Keuangan di Pengaturan dulu sebelum membatalkan, memulihkan, atau mengubah jatuh tempo tagihan.");
      return;
    }
    setPinAction(action);
  };

  /** Konfirmasi → PIN → aksi. Satu-satunya jalur untuk aksi destruktif (D4). */
  const askWithPin = (args: {
    key: string;
    confirmTitle: string;
    confirmMessage: string;
    confirmLabel: string;
    action: () => Promise<void>;
    success: string;
    warning?: string;
  }) => {
    if (busyKeys[args.key]) return;
    if (!pinAvailable) {
      setMessage("Buat PIN Keuangan di Pengaturan dulu sebelum membatalkan, memulihkan, atau mengubah jatuh tempo tagihan.");
      return;
    }
    setConfirmState({
      title: args.confirmTitle,
      message: `${args.confirmMessage}\n\n${args.warning ? `${args.warning}\n\n` : ""}${RECOVERY_LIMITS_HINT}`,
      confirmLabel: args.confirmLabel,
      danger: true,
      onConfirm: () => {
        setConfirmState(null);
        requestPin({
          title: args.confirmTitle,
          description: "Masukkan PIN Keuangan untuk melanjutkan aksi ini.",
          confirmLabel: args.confirmLabel,
          onConfirm: () => {
            setPinAction(null);
            void execute(args.key, args.action, args.success);
          },
        });
      },
    });
  };

  /** Batalkan invoice laporan yang belum lunas (laporan tetap final). */
  const askCancelReportInvoice = (invoice: Payment, studentName: string) => {
    askWithPin({
      key: `cancel-${invoice.id}`,
      confirmTitle: "Batalkan tagihan ini?",
      confirmMessage:
        `Batalkan tagihan ${studentName} (${formatRupiah(invoice.totalCost)}, ${monthLabel(invoice.month)})?\n`
        + "Tagihannya dihapus dan laporan itu kembali muncul di \"Siap ditagih\". Laporan tetap final dan tidak diubah.",
      confirmLabel: "Batalkan",
      action: () => cancelReportInvoice(invoice.id),
      success: `Tagihan ${studentName} dibatalkan; laporan tetap final dan siap ditagih ulang ✓`,
    });
  };

  /** Hapus tagihan manual yang belum lunas. */
  const askDeleteManualPayment = (invoice: Payment, studentName: string) => {
    askWithPin({
      key: `cancel-${invoice.id}`,
      confirmTitle: "Hapus tagihan manual ini?",
      confirmMessage:
        `Hapus tagihan manual ${studentName} (${formatRupiah(invoice.totalCost)}, ${monthLabel(invoice.month)})?\n`
        + "Baris tagihan hilang dari daftar piutang.",
      confirmLabel: "Hapus",
      action: () => deleteManualPayment(invoice.id),
      success: `Tagihan manual ${studentName} dihapus ✓`,
    });
  };

  /** Pulihkan tagihan yang dibatalkan dari snapshot di perangkat ini. */
  const askRestoreCancellation = (cancellation: InvoiceCancellation, studentName: string) => {
    askWithPin({
      key: `restore-${cancellation.snapshotId}`,
      confirmTitle: "Pulihkan tagihan yang dibatalkan?",
      confirmMessage:
        `Pulihkan ${KIND_LABEL[cancellation.kind].toLowerCase()} ${studentName} `
        + `(${formatRupiah(cancellation.totalCost)}, ${monthLabel(cancellation.month)}, ${cancellation.sessionCount} sesi) `
        + "dengan ID dan nilai yang sama seperti sebelum dibatalkan.",
      confirmLabel: "Pulihkan",
      action: async () => {
        const result = await restoreCancelledInvoice(cancellation.snapshotId);
        if (result.status === "noop") {
          throw new Error("tagihan ini sudah berada persis seperti sebelum dibatalkan");
        }
      },
      success: `Tagihan ${studentName} dipulihkan ✓`,
      warning: "Pemulihan ditolak bila sesi, laporan, atau siklus murid sudah berubah setelah pembatalan.",
    });
  };

  /** Ubah jatuh tempo tagihan yang belum lunas (D5). */
  const askUpdateDueAt = (invoice: Payment, studentName: string, dueAt: string) => {
    askWithPin({
      key: `due-${invoice.id}`,
      confirmTitle: "Ubah jatuh tempo tagihan?",
      confirmMessage:
        `Ubah jatuh tempo ${studentName} (${formatRupiah(invoice.totalCost)}) menjadi ${dueAt}?\n`
        + "Hanya tanggal jatuh tempo yang berubah: nominal, status, pembayaran, dan laporan tetap sama.",
      confirmLabel: "Simpan",
      action: () => updatePaymentDueAt(invoice.id, dueAt),
      success: `Jatuh tempo ${studentName} diubah ke ${dueAt} ✓`,
    });
  };

  return {
    cancellations,
    busyKeys,
    pinAction,
    cancelPinAction: () => setPinAction(null),
    requestPin,
    askCancelReportInvoice,
    askDeleteManualPayment,
    askRestoreCancellation,
    askUpdateDueAt,
  };
}
