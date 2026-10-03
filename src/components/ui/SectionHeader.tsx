import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  /** teks kanan, mis. "Maks 3" */
  hint?: string;
  /** mis. tombol biaya AI */
  action?: ReactNode;
  /** Sembunyikan judul secara visual, tetap dibacakan pembaca layar. */
  className?: string;
}

/**
 * Judul blok (G2-01 — TASK-04 §3).
 * `title` dirender sebagai <h2> supaya struktur heading layar tetap sah
 * (penjaga `e2e-uiux` menuntut setiap layar punya minimal satu h2 dan
 * tidak ada lompatan level).
 */
export default function SectionHeader({ title, hint, action, className = "" }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-[var(--space-3)] ${className}`}>
      <h2 className="text-caption font-bold uppercase tracking-wide text-[var(--text-muted)] m-0">{title}</h2>
      <div className="flex items-center gap-[var(--space-2)]">
        {hint && <span className="text-caption text-[var(--text-muted)]">{hint}</span>}
        {action}
      </div>
    </div>
  );
}
