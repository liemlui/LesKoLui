import type { ReactNode } from "react";

interface ListRowProps {
  /** mis. jam "15:30" */
  leading?: ReactNode;
  title: string;
  /** mis. "Fisika · Gelombang" */
  subtitle?: string;
  trailing?: ReactNode;
  onClick?: () => void;
  /**
   * Baris lampau "diredupkan" TANPA kehilangan kontras teks:
   * yang berubah hanya token warna teks (--text → --text-muted) dan latar,
   * bukan `opacity` — `opacity` akan menurunkan rasio di bawah ambang AA.
   */
  muted?: boolean;
}

/** Baris daftar (G2-01 — TASK-04 §3). Pengganti .slot / .slot-main / .slot-meta. */
export default function ListRow({ leading, title, subtitle, trailing, onClick, muted = false }: ListRowProps) {
  const tone = muted
    ? "bg-[var(--surface-soft)] text-[var(--text-muted)]"
    : "bg-[var(--surface-strong)] text-[var(--text)]";
  const base = `w-full flex items-center gap-[var(--space-3)] rounded-[var(--radius-card)] px-[var(--space-3)] py-[var(--space-3)] text-left ${tone}`;
  const body = (
    <>
      {leading && <span className="shrink-0 text-caption text-[var(--text-muted)]">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-body font-bold truncate">{title}</span>
        {subtitle && <span className="block text-caption truncate">{subtitle}</span>}
      </span>
      {trailing && <span className="shrink-0">{trailing}</span>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} cursor-pointer hover:bg-[var(--surface-soft)] transition-colors`}
      >
        {body}
      </button>
    );
  }
  return <div className={base}>{body}</div>;
}
