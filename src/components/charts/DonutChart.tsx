export interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}

interface Props {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  emptyLabel?: string;
  /** Show a legend below */
  showLegend?: boolean;
}

const DEFAULT_COLORS = [
  "#2563eb", "#16a34a", "#d97706", "#dc2626",
  "#7c3aed", "#0891b2", "#be185d", "#65a30d",
  "#e11d48", "#0d9488",
];

/** Pure-SVG donut chart — extends the ActivityRing concept into a reusable multi-segment ring. */
export default function DonutChart({
  segments,
  size = 160,
  thickness = 18,
  centerLabel = "Total",
  centerValue,
  emptyLabel = "Belum ada data",
  showLegend = true,
}: Props) {
  const total = segments.reduce((s, seg) => s + Math.max(0, seg.value), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  if (total === 0 || segments.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100" style={{ width: size, height: size }}>
        <p className="text-xs text-slate-400 text-center px-2">{emptyLabel}</p>
      </div>
    );
  }

  let accumulated = 0;

  return (
    <div className="inline-flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90" role="img" aria-label={`Donut chart: ${centerLabel}`}>
          {segments.map((seg, i) => {
            const pct = total > 0 ? Math.max(0, seg.value) / total : 0;
            const dash = pct * circumference;
            const offset = -accumulated;
            accumulated += dash;
            const color = seg.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            return (
              <circle
                key={i}
                cx={center} cy={center} r={radius}
                fill="none"
                stroke={color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                strokeLinecap={pct >= 0.98 ? "butt" : "round"}
              />
            );
          })}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{centerLabel}</span>
          <span className="text-lg font-bold text-slate-800">
            {centerValue ?? String(total)}
          </span>
        </div>
      </div>

      {showLegend && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
          {segments.map((seg, i) => {
            const color = seg.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            const pct = total > 0 ? Math.round((Math.max(0, seg.value) / total) * 100) : 0;
            return (
              <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
                <span className="font-medium">{seg.label}</span>
                <span className="text-slate-400">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
