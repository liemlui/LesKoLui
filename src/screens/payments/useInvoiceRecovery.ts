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
  cancelReportInvoice, deleteManualPayment, discardInvoiceCancellation, listInvoiceCancellations,
  listInvoiceSnapshotPoints, restoreCancelledInvoice, updatePaymentDueAt,
} from "../../db/repos";
import type { InvoiceCancellation, InvoiceSnapshotPoint } from "../../db/repos";
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

/**
 * "3 Okt 2026, 14.05" — penanda tanggal+jam satu titik pemulihan.
 *
 * Bila tanggalnya tidak bisa dibaca, string aslinya dikembalikan apa adanya
 * supaya pesan konfirmasi tidak pernah berbunyi "Invalid Date"
 * (`toLocaleString` tidak melempar untuk tanggal rusak).
 */
export function snapshotMomentLabel(iso: string): string {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return iso;
  return new Date(time).toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function useInvoiceRecovery({ setMessage, setConfirmState, pinAvailable }: UseInvoiceRecoveryArgs) {
  /** Snapshot pembatalan yang masih bisa dipulihkan (lokal per perangkat). */
  const cancellations = useLiveQuery(() => listInvoiceCancellations(), []);
  const [busyKeys, setBusyKeys] = useState<Record<string, boolean>>({});
  const [pinAction, setPinAction] = useState<PinAction | null>(null);
  /**
   * Tagihan yang riwayat titik pemulihannya sedang dibuka (pemilih "mau saya
   * pulihkan di tanggal berapa"). `null` = pemilih tertutup.
   */
  const [snapshotPaymentId, setSnapshotPaymentId] = useState<string | null>(null);
  /**
   * SEMUA titik pemulihan tagihan itu (lama → baru) — termasuk yang sudah
   * dipulihkan atau dibuang, supaya pemilik bisa kembali ke titik yang lebih
   * awal setelah salah memulihkan. `undefined` = masih dimuat.
   */
  const snapshotPoints = useLiveQuery(
    () => (snapshotPaymentId ? listInvoiceSnapshotPoints(snapshotPaymentId) : []),
    [snapshotPaymentId],
  );

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
        + "Baris tagihan hilang dari daftar belum dibayar.",
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

  /**
   * Buka riwayat titik pemulihan satu tagihan (READ-ONLY): pemilik memilih
   * sendiri titik waktu mana yang mau dipulihkan.
   */
  const openSnapshotHistory = (paymentId: string) => setSnapshotPaymentId(paymentId);
  const closeSnapshotHistory = () => setSnapshotPaymentId(null);

  /**
   * Pulihkan tagihan ke SATU titik waktu tertentu dari riwayatnya — bukan
   * sekadar "yang terakhir dibatalkan".
   *
   * Titik yang sudah pernah dipulihkan TETAP bisa dipilih: justru itulah jalan
   * kembali ketika pemulihan sebelumnya salah ("mau saya restore di tanggal
   * berapa berapa"). Yang benar-benar hilang hanyalah titik yang salinannya
   * sudah DIHAPUS (`discardedAt`) — rinciannya sudah tidak tersimpan.
   */
  const askRestoreSnapshot = (point: InvoiceSnapshotPoint, studentName: string) => {
    const moment = snapshotMomentLabel(point.cancelAt);
    const kembali = point.restoredAt
      ? `\nTitik ini pernah dipulihkan ${snapshotMomentLabel(point.restoredAt)}; memilihnya lagi akan mengembalikan tagihan ke keadaan ${moment} dan menimpa perubahan sesudahnya.`
      : "";
    askWithPin({
      key: `restore-${point.snapshotId}`,
      confirmTitle: "Pulihkan tagihan ke titik ini?",
      confirmMessage:
        `Pulihkan ${KIND_LABEL[point.kind].toLowerCase()} ${studentName} persis seperti keadaannya pada ${moment} `
        + `(${formatRupiah(point.totalCost)}, ${monthLabel(point.month)}, ${point.sessionCount} sesi)?\n`
        + `Tagihan, laporan, dan siklus murid dikembalikan seperti pada ${moment} — `
        + "perubahan yang terjadi sesudah tanggal itu tidak ikut kembali."
        + kembali,
      confirmLabel: "Pulihkan",
      action: async () => {
        const result = await restoreCancelledInvoice(point.snapshotId);
        if (result.status === "noop") {
          throw new Error(`tagihan ini sudah berada persis seperti pada ${moment}`);
        }
      },
      success: `Tagihan ${studentName} dipulihkan ke keadaan ${moment} ✓`,
      warning: "Pemulihan ditolak bila sesi, laporan, atau siklus murid sudah berubah setelah pembatalan.",
    });
  };

  /**
   * Buang salinan pemulihan tagihan yang dibatalkan (daftar ini tidak boleh
   * menumpuk selamanya). Tagihan yang sudah dibatalkan TIDAK kembali.
   */
  const askDiscardCancellation = (cancellation: InvoiceCancellation, studentName: string) => {
    askWithPin({
      key: `discard-${cancellation.snapshotId}`,
      confirmTitle: "Hapus entri pemulihan ini?",
      confirmMessage:
        `Hapus salinan pemulihan ${KIND_LABEL[cancellation.kind].toLowerCase()} ${studentName} `
        + `(${formatRupiah(cancellation.totalCost)}, ${monthLabel(cancellation.month)}) dari daftar ini?\n`
        + "Salinan pemulihannya dihapus permanen: tagihan TIDAK kembali dan titik ini tidak bisa "
        + "dipulihkan lagi, termasuk bila suatu saat Anda ingin kembali ke keadaan pada tanggal itu. "
        + "Hanya salinan pemulihannya yang hilang, bukan tagihannya.",
      confirmLabel: "Hapus",
      action: () => discardInvoiceCancellation(cancellation.snapshotId),
      success: `Salinan pemulihan ${studentName} dihapus ✓`,
      warning: "Setelah dihapus, File Backup adalah satu-satunya salinan permanen.",
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
    snapshotPoints,
    snapshotPaymentId,
    openSnapshotHistory,
    closeSnapshotHistory,
    busyKeys,
    pinAction,
    cancelPinAction: () => setPinAction(null),
    requestPin,
    askCancelReportInvoice,
    askDeleteManualPayment,
    askRestoreCancellation,
    askRestoreSnapshot,
    askDiscardCancellation,
    askUpdateDueAt,
  };
}
