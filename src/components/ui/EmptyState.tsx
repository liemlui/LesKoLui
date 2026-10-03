import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  /** mis. "Belum ada tagihan" */
  title: string;
  /** harus menjelaskan LANGKAH BERIKUTNYA, bukan hanya "kosong" */
  message: string;
  action?: ReactNode;
}

/** Keadaan kosong (G2-01 — TASK-04 §3, pola E kontrak K1/K4). */
export default function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center gap-[var(--space-2)] rounded-[var(--radius-card)] bg-[var(--surface-soft)] p-[var(--space-5)]">
      {icon && (
        <span className="text-[var(--text-muted)]" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="text-title font-bold text-[var(--text)] m-0">{title}</p>
      <p className="text-body text-[var(--text-muted)] m-0 max-w-[36ch]">{message}</p>
      {action && <div className="mt-[var(--space-2)]">{action}</div>}
    </div>
  );
}
