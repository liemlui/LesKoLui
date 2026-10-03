import type { ReactNode } from "react";

interface EmptyStateProps {
  /** Ikon/emoji pembuka (opsional). */
  icon?: string;
  /** Pesan utama. */
  message: string;
  /** Baris penjelas opsional. */
  description?: string;
  /** Aksi/CTA opsional (mis. tombol). */
  action?: ReactNode;
  /** Gaya visual — "plain" untuk teks di dalam kartu, "dashed" untuk kartu kosong. */
  tone?: "plain" | "dashed";
  /** Kelas tambahan. */
  className?: string;
}

/**
 * Empty state seragam untuk seluruh aplikasi — pengganti teks kosong yang
 * tersebar dan saling menyebut nama komponen lain (copy coupling). Pesan tidak
 * boleh menyebut nama section/komponen lain; cukup fakta + aksi bila perlu.
 */
export default function EmptyState({
  icon,
  message,
  description,
  action,
  tone = "plain",
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={
        (tone === "dashed"
          ? "bg-[var(--surface-strong)] rounded-2xl border border-dashed border-[var(--border)] py-6 "
          : "py-3 ") + `text-center ${className}`
      }
    >
      {icon ? <p className="text-2xl mb-1">{icon}</p> : null}
      <p className="text-sm text-[var(--ink-muted)]">{message}</p>
      {description && <p className="text-xs text-[var(--ink-muted)] mt-0.5">{description}</p>}
      {action && <div className="mt-2 flex justify-center">{action}</div>}
    </div>
  );
}