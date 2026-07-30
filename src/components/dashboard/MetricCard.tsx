import { type JSX } from "react";

type Tone = "blue" | "green" | "amber" | "red" | "slate";

const TONE: Record<Tone, string> = {
  blue: "bg-blue-50 border-blue-100 text-blue-700",
  green: "bg-green-50 border-green-100 text-green-700",
  amber: "bg-amber-50 border-amber-100 text-amber-700",
  red: "bg-red-50 border-red-100 text-red-700",
  slate: "bg-slate-50 border-slate-200 text-slate-700",
};

const TONE_ACTION: Record<Tone, string> = {
  blue: "text-blue-600",
  green: "text-green-600",
  amber: "text-amber-600",
  red: "text-red-600",
  slate: "text-slate-600",
};

interface Props {
  label: string;
  value: string | number;
  description: string;
  icon?: string;
  tone?: Tone;
  /** Optional CTA text shown at the bottom with a trailing chevron. */
  action?: string;
  /** When provided, the entire card becomes tappable. */
  onClick?: () => void;
}

/** Reusable dashboard metric with optional action affordance. */
export default function MetricCard({ label, value, description, icon, tone = "slate", action, onClick }: Props) {
  const isInteractive = !!onClick;
  const as = isInteractive ? "button" : "div";

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">{label}</p>
        {icon && <span aria-hidden="true" className="text-sm leading-none">{icon}</span>}
      </div>
      <p className="mt-1 text-xl font-bold leading-none">{value}</p>
      <p className="mt-1.5 text-[11px] leading-snug text-slate-600">{description}</p>
      {action && (
        <p className={`mt-2 text-[11px] font-semibold flex items-center gap-1 ${TONE_ACTION[tone]}`}>
          {action}
          <span aria-hidden="true" className="text-[10px]">›</span>
        </p>
      )}
    </>
  );

  const shared = {
    className: `rounded-xl border p-3 w-full text-left ${TONE[tone]} ${isInteractive ? "cursor-pointer hover:shadow-sm transition-shadow active:scale-[0.98]" : ""}`,
    ...(isInteractive ? { type: "button" as const, onClick } : {}),
    ...(!isInteractive ? { role: undefined } : {}),
  };

  // Render as a <button> when interactive for a11y, otherwise a <div>
  const Tag = as as "div" | "button";
  return isInteractive
    ? <button {...shared as JSX.IntrinsicElements["button"]}>{content}</button>
    : <div {...shared as JSX.IntrinsicElements["div"]}>{content}</div>;
}
