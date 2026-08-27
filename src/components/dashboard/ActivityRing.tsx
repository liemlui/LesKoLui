type Tone = "blue" | "green" | "amber" | "red" | "slate";

const TONE: Record<Tone, { stroke: string; track: string; text: string }> = {
  blue:  { stroke: "#2563eb", track: "#dbeafe", text: "text-blue-700" },
  green: { stroke: "#16a34a", track: "#dcfce7", text: "text-green-700" },
  amber: { stroke: "#d97706", track: "#fef3c7", text: "text-amber-700" },
  red:   { stroke: "#dc2626", track: "#fee2e2", text: "text-red-700" },
  slate: { stroke: "#475569", track: "#e2e8f0", text: "text-slate-700" },
};

interface Props {
  value: number;
  total: number;
  label: string;
  detail?: string;
  tone?: Tone;
  size?: "sm" | "md";
}

/** Compact progress ring for a single actionable metric. */
export default function ActivityRing({ value, total, label, detail, tone = "blue", size = "md" }: Props) {
  const safeTotal = Math.max(0, total);
  const safeValue = Math.max(0, Math.min(value, safeTotal));
  const percent = safeTotal > 0 ? Math.round((safeValue / safeTotal) * 100) : 0;
  const radius = size === "sm" ? 22 : 30;
  const width = size === "sm" ? 6 : 7;
  const side = (radius + width) * 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;
  const palette = TONE[tone];

  return (
    <div className="flex items-center gap-3 min-w-0" aria-label={`${label}: ${safeValue} dari ${safeTotal}`}>
      <div
        className="relative flex-shrink-0"
        style={{ width: side, height: side }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuenow={safeValue}
        aria-valuetext={`${percent}%`}
        aria-label={`${label}: ${safeValue} dari ${safeTotal}`}
      >
        <svg width={side} height={side} viewBox={`0 0 ${side} ${side}`} className="-rotate-90">
          <circle cx={side / 2} cy={side / 2} r={radius} fill="none" stroke={palette.track} strokeWidth={width} />
          <circle
            cx={side / 2} cy={side / 2} r={radius} fill="none" stroke={palette.stroke} strokeWidth={width}
            strokeLinecap="round" strokeDasharray={`${dash} ${circumference - dash}`} />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center font-bold ${palette.text} ${size === "sm" ? "text-[10px]" : "text-xs"}`}>
          {safeTotal > 0 ? `${percent}%` : "—"}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-700">{label}</p>
        <p className={`font-bold ${palette.text} ${size === "sm" ? "text-sm" : "text-base"}`}>{safeValue}/{safeTotal}</p>
        {detail && <p className="text-[11px] text-gray-500 leading-snug">{detail}</p>}
      </div>
    </div>
  );
}
