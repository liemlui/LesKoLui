import type { ReactNode } from "react";

interface ActionBarProps {
  /** deretan tombol */
  children: ReactNode;
  /** true = tombol utama diletakkan paling kanan dan melebar. */
  emphasis?: boolean;
  className?: string;
}

/**
 * Baris aksi (G2-01 — TASK-04 §3).
 * `emphasis` membuat anak TERAKHIR melebar — konvensi: aksi utama paling kanan.
 */
export default function ActionBar({ children, emphasis = false, className = "" }: ActionBarProps) {
  const layout = emphasis
    ? "justify-end [&>*:last-child]:flex-1"
    : "justify-start";

  return (
    <div className={`flex flex-wrap items-center gap-[var(--space-2)] ${layout} ${className}`}>{children}</div>
  );
}
