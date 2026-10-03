import type { ReactNode } from "react";

type Tone = "blue" | "green" | "amber" | "red" | "slate";

const TONE: Record<Tone, string> = {
  blue: "bg-[var(--brand-tint)] border-[var(--brand-tint-strong)] text-[var(--ink-brand)]",
  green: "bg-[var(--bg-success)] border-[var(--border-success)] text-[var(--ink-success)]",
  amber: "bg-[var(--bg-warn)] border-[var(--border-warn)] text-[var(--ink-warn)]",
  red: "bg-[var(--bg-danger)] border-[var(--border-danger)] text-[var(--ink-danger)]",
  slate: "bg-[var(--surface)] border-[var(--border)] text-[var(--ink-strong)]",
};

const TONE_ACTION: Record<Tone, string> = {
  blue: "text-[var(--ink-brand)]",
  green: "text-[var(--ink-success)]",
  amber: "text-[var(--ink-warn)]",
  red: "text-[var(--ink-danger)]",
  slate: "text-[var(--ink-muted)]",
};

const TONE_LEFT_BAR: Record<Tone, string> = {
  blue: "border-l-blue-400",
  green: "border-l-green-400",
  amber: "border-l-amber-400",
  red: "border-l-red-400",
  slate: "border-l-slate-300",
};

interface Props {
  label: string;
  value: string | number;
  description: string;
  icon?: ReactNode;
  tone?: Tone;
  /** Optional CTA text shown at the bottom with a trailing chevron. */
  action?: string;
  /** When provided, the entire card becomes tappable. */
  onClick?: () => void;
}

/** Reusable dashboard metric with optional action affordance and left-border accent. */
export default function MetricCard({ label, value, description, icon, tone = "slate", action, onClick }: Props) {
  const isInteractive = !!onClick;

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">{label}</p>
        {icon && <span aria-hidden="true" className="text-sm leading-none">{icon}</span>}
      </div>
      <p className="mt-1 text-xl font-bold leading-none text-[var(--ink-strong)]">{value}</p>
      <p className="mt-1.5 text-[12px] leading-snug text-[var(--ink-muted)]">{description}</p>
      {action && (
        <p className={`mt-2 text-[12px] font-semibold flex items-center gap-1 ${TONE_ACTION[tone]}`}>
          {action}
          <span aria-hidden="true" className="text-[12px]">›</span>
        </p>
      )}
    </>
  );

  const sharedClass = `rounded-xl border-l-4 p-3 w-full text-left ${TONE[tone]} ${TONE_LEFT_BAR[tone]}`;
  const btnClassName = `${sharedClass} cursor-pointer hover:shadow-md hover:brightness-95 transition-all active:scale-[0.98]`;
  const divClassName = sharedClass;

  return isInteractive
    ? <button type="button" onClick={onClick} className={btnClassName}>{content}</button>
    : <div className={divClassName}>{content}</div>;
}
