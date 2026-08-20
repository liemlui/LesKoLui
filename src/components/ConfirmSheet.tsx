import Modal from "./Modal";

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Mobile bottom-sheet confirmation dialog.
 * Reuses Modal for role="dialog", aria-modal, backdrop click/Escape close,
 * and focus trapping. Adds a danger-styled confirm button and busy state.
 */
export default function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel = "Konfirmasi",
  danger = false,
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmSheetProps) {
  if (!open) return null;
  return (
    <Modal onClose={onCancel} ariaLabel={title}>
      <h3 className="font-bold text-base text-gray-800">{title}</h3>
      <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">
        {message}
      </p>
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`flex-1 rounded-xl py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 ${
            danger
              ? "bg-red-600 hover:bg-red-700"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {busy ? "Memproses..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
