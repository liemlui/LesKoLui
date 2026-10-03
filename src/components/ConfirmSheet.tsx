import Sheet from "./ui/Sheet";

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
 * G2-01: sekarang memakai primitif `components/ui/Sheet` (token, pola D kontrak
 * K4.6) menggantikan `components/Modal`. Perilaku yang dipertahankan: role="dialog",
 * aria-modal, tutup lewat backdrop & Escape, jebakan fokus, tombol ✕ "Tutup panel",
 * teks tombol, dan `ariaLabel={title}`.
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
  return (
    <Sheet
      open={open}
      onClose={onCancel}
      title={title}
      ariaLabel={title}
      footer={
        <div className="flex gap-[var(--space-3)]">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-[var(--radius-card)] border border-[var(--border)] py-3 text-body font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 rounded-[var(--radius-card)] py-3 text-body font-bold text-[var(--on-strong)] transition-colors disabled:opacity-50 ${
              danger
                ? "bg-[var(--bg-danger-strong)] hover:opacity-90"
                : "bg-[var(--brand-solid)] hover:bg-[var(--brand-solid-hover)]"
            }`}
          >
            {busy ? "Memproses..." : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="whitespace-pre-line text-body leading-relaxed text-[var(--text-muted)] m-0">{message}</p>
    </Sheet>
  );
}
