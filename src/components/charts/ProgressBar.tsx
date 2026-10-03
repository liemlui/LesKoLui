type ProgressTone = "blue" | "green" | "amber" | "red" | "slate";

const TONE_BAR: Record<ProgressTone, string> = {
  blue: "bg-[var(--brand-solid)]", green: "bg-[var(--bg-success-strong)]", amber: "bg-[var(--bg-warn-strong)]",
  red: "bg-[var(--bg-danger-strong)]", slate: "bg-[var(--surface-inverse)]",
};
const TONE_BG: Record<ProgressTone, string> = {
  blue: "bg-[var(--brand-tint-strong)]", green: "bg-[var(--bg-success)]", amber: "bg-[var(--bg-warn)]",
  red: "bg-[var(--bg-danger)]", slate: "bg-[var(--bg-subtle)]",
};
const TONE_TEXT: Record<ProgressTone, string> = {
  blue: "text-[var(--ink-brand)]", green: "text-[var(--ink-success)]", amber: "text-[var(--ink-warn)]",
  red: "text-[var(--ink-danger)]", slate: "text-[var(--ink-strong)]",
};

interface Props {
  value: number;
  max: number;
  label?: string;
  detail?: string;
  showPercent?: boolean;
  tone?: ProgressTone;
  /** Color-coded thresholds: when percent >= threshold, use that tone */
  thresholds?: { pct: number; tone: ProgressTone }[];
  size?: "sm" | "md" | "lg";
}

/** Horizontal progress bar with label, percentage, and color-coded thresholds. */
export default function ProgressBar({
  value,
  max,
  label,
  detail,
  showPercent = true,
  tone = "blue",
  thresholds,
  size = "md",
}: Props) {
  const safeMax = Math.max(1, max);
  const safeValue = Math.max(0, Math.min(value, safeMax));
  const percent = Math.round((safeValue / safeMax) * 100);

  // Determine tone from thresholds
  let activeTone = tone;
  if (thresholds) {
    const sorted = [...thresholds].sort((a, b) => b.pct - a.pct);
    for (const t of sorted) {
      if (percent >= t.pct) { activeTone = t.tone; break; }
    }
  }

  const heights = { sm: "h-2", md: "h-3", lg: "h-4" };
  const textSizes = { sm: "text-xs", md: "text-xs", lg: "text-sm" };

  return (
    <div className="w-full" aria-label={label ? `${label}: ${safeValue} dari ${safeMax}` : undefined}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between mb-1">
          {label && (
            <span className={`font-semibold ${textSizes[size]} text-[var(--ink-strong)]`}>{label}</span>
          )}
          {showPercent && (
            <span className={`font-bold ${TONE_TEXT[activeTone]} ${textSizes[size]}`}>{percent}%</span>
          )}
        </div>
      )}
      <div className={`w-full rounded-full ${TONE_BG[activeTone]} overflow-hidden ${heights[size]}`}>
        <div
          className={`${TONE_BAR[activeTone]} ${heights[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percent}%`, minWidth: percent > 0 ? "4px" : 0 }}
        />
      </div>
      {detail && (
        <p className={`mt-1 text-xs text-[var(--ink-muted)]`}>{detail}</p>
      )}
    </div>
  );
}
