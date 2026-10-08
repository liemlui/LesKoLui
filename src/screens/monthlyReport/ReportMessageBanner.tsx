/**
 * Banner pesan hasil aksi halaman Laporan.
 *
 * Audit R-13 / G1-10 (butir 12 G3-05): perannya harus benar supaya pembaca layar
 * tahu apakah aksinya berhasil atau gagal — `alert` untuk galat, `status` untuk
 * kabar baik. Pola yang sama dipakai Payments.tsx.
 */

interface ReportMessageBannerProps {
  message: string;
  onDismiss: () => void;
}

function messageIsFailure(message: string): boolean {
  return message.startsWith("Gagal") || message.startsWith("Error");
}

export default function ReportMessageBanner({ message, onDismiss }: ReportMessageBannerProps) {
  if (!message) return null;
  const failed = messageIsFailure(message);
  return (
    <div
      role={failed ? "alert" : "status"}
      aria-live={failed ? "assertive" : "polite"}
      className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
        message.includes("✓")
          ? "bg-[var(--bg-success)] text-[var(--ink-success)]"
          : failed
            ? "bg-[var(--bg-danger)] text-[var(--ink-danger)]"
            : "bg-[var(--brand-tint)] text-[var(--ink-brand)]"
      }`}
    >
      <span className="flex-1">{message}</span>
      <button
        type="button"
        aria-label="Tutup pesan"
        onClick={onDismiss}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-current/80 transition hover:bg-[var(--scrim)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-brand)]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
