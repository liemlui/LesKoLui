type Tone = "blue" | "green" | "amber" | "red" | "slate";

const TONE: Record<Tone, string> = {
  blue: "bg-blue-50 border-blue-100 text-blue-700",
  green: "bg-green-50 border-green-100 text-green-700",
  amber: "bg-amber-50 border-amber-100 text-amber-700",
  red: "bg-red-50 border-red-100 text-red-700",
  slate: "bg-slate-50 border-slate-200 text-slate-700",
};

interface Props {
  label: string;
  value: string | number;
  description: string;
  icon?: string;
  tone?: Tone;
}

/** Reusable dashboard metric with a short explanation, not just a raw number. */
export default function MetricCard({ label, value, description, icon, tone = "slate" }: Props) {
  return (
    <div className={`rounded-xl border p-3 ${TONE[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-75">{label}</p>
        {icon && <span aria-hidden="true" className="text-sm leading-none">{icon}</span>}
      </div>
      <p className="mt-1 text-xl font-bold leading-none">{value}</p>
      <p className="mt-1.5 text-[11px] leading-snug opacity-75">{description}</p>
    </div>
  );
}
