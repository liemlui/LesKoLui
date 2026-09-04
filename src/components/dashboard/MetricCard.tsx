type Tone = "blue" | "green" | "amber" | "red" | "slate";

const TONE: Record<Tone, string> = {
  blue: "bg-blue-50 border-blue-100 text-blue-700",
  green: "bg-green-50 border-green-100 text-green-700",
  amber: "bg-amber-50 border-amber-100 text-amber-700",
  red: "bg-red-50 border-red-100 text-red-700",
  slate: "bg-slate-50 border-slate-200 text-slate-700",
};

const TONE_ACTION: Record<Tone, string> = {
  blue: "text-blue-700",
  green: "text-green-700",
  amber: "text-amber-700",
  red: "text-red-700",
  slate: "text-slate-600",
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
  icon?: string;
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
        <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">{label}</p>
        {icon && <span aria-hidden="true" className="text-sm leading-none">{icon}</span>}
      </div>
      <p className="mt-1 text-xl font-bold leading-none text-slate-800">{value}</p>
      <p className="mt-1.5 text-[12px] leading-snug text-slate-600">{description}</p>
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
