import type { ReactNode } from "react";

interface StatTileProps {
  /** mis. "Sesi minggu ini" */
  label: string;
  /** string ATAU <MaskedMoney/> dari TASK-08 */
  value: ReactNode;
  /** mis. "7 dari target 10" */
  hint?: string;
  delta?: { text: string; tone: "up" | "down" | "flat" };
  action?: ReactNode;
}

/**
 * Kotak angka (G2-01 — TASK-04 §3).
 * Warna delta memakai token `--ink-*` yang sudah dibuktikan ≥4,5:1
 * (`.design-audit/g2-01-contrast.mjs`), bukan kelas palet langsung.
 */
const DELTA_TONE: Record<NonNullable<StatTileProps["delta"]>["tone"], string> = {
  up: "text-[var(--ink-success)]",
  down: "text-[var(--ink-danger)]",
  flat: "text-[var(--ink-muted)]",
};

export default function StatTile({ label, value, hint, delta, action }: StatTileProps) {
  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--surface-strong)] border border-[var(--border)] p-[var(--space-4)] shadow-[var(--e-flat)]">
      <p className="text-caption text-[var(--text-muted)] m-0">{label}</p>
      <p className="text-display font-bold text-[var(--text)] m-0 mt-[var(--space-1)]">{value}</p>
      {hint && <p className="text-caption text-[var(--text-muted)] m-0 mt-[var(--space-1)]">{hint}</p>}
      {delta && <p className={`text-caption font-bold m-0 mt-[var(--space-1)] ${DELTA_TONE[delta.tone]}`}>{delta.text}</p>}
      {action && <div className="mt-[var(--space-3)]">{action}</div>}
    </div>
  );
}
