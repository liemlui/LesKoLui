interface Props {
  value: number;   // 1-10
  max?: number;    // default 10
  label?: string;
  size?: "sm" | "md" | "lg";
  /** Visual style */
  variant?: "dots" | "stars" | "bars";
  tone?: "blue" | "green" | "amber" | "red" | "slate";
}

const TONE_COLORS: Record<string, { fill: string; empty: string }> = {
  blue:  { fill: "#2563eb", empty: "#dbeafe" },
  green: { fill: "#16a34a", empty: "#dcfce7" },
  amber: { fill: "#d97706", empty: "#fef3c7" },
  red:   { fill: "#dc2626", empty: "#fee2e2" },
  slate: { fill: "#475569", empty: "#e2e8f0" },
};

/** Visual 1-10 rating indicator — dots, stars, or mini bars. */
export default function RatingIndicator({
  value,
  max = 10,
  label,
  size = "md",
  variant = "dots",
  tone = "blue",
}: Props) {
  const safeValue = Math.max(0, Math.min(value, max));
  const colors = TONE_COLORS[tone];

  const dims = { sm: 6, md: 8, lg: 12 };
  const gap = { sm: 2, md: 3, lg: 4 };
  const d = dims[size];
  const g = gap[size];

  const totalW = max * d + (max - 1) * g;

  if (variant === "bars") {
    return (
      <div className="inline-flex flex-col gap-0.5" aria-label={label ? `${label}: ${safeValue}/${max}` : undefined}>
        {label && <span className="text-[10px] font-semibold text-slate-500">{label}</span>}
        <div className="flex items-end gap-px" style={{ height: d * 3 }}>
          {Array.from({ length: max }).map((_, i) => {
            const h = Math.round(((i + 1) / max) * d * 3);
            const active = i < Math.round(safeValue);
            return (
              <div
                key={i}
                className="rounded-t-sm transition-colors"
                style={{
                  width: d,
                  height: h,
                  background: active ? colors.fill : colors.empty,
                  opacity: active ? 1 : 0.5,
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Dots variant
  return (
    <div className="inline-flex items-center gap-1.5" aria-label={label ? `${label}: ${safeValue}/${max}` : undefined}>
      {label && <span className="text-[10px] font-semibold text-slate-500">{label}</span>}
      <svg width={totalW} height={d} viewBox={`0 0 ${totalW} ${d}`} aria-hidden="true" className="flex-shrink-0">
        {Array.from({ length: max }).map((_, i) => {
          const cx = i * (d + g) + d / 2;
          const cy = d / 2;
          const r = d / 2 - 0.5;
          const active = i < Math.round(safeValue);
          if (variant === "stars") {
            // Simple 5-point star
            const pts = starPoints(cx, cy, r, 5);
            return (
              <polygon
                key={i}
                points={pts}
                fill={active ? colors.fill : colors.empty}
                stroke={active ? colors.fill : "#cbd5e1"}
                strokeWidth={0.5}
              />
            );
          }
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill={active ? colors.fill : colors.empty}
              stroke={active ? colors.fill : "#cbd5e1"}
              strokeWidth={0.5}
            />
          );
        })}
      </svg>
      <span className={`text-[11px] font-bold`} style={{ color: colors.fill }}>{safeValue}/{max}</span>
    </div>
  );
}

function starPoints(cx: number, cy: number, r: number, points: number): string {
  const result: string[] = [];
  const innerR = r * 0.4;
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? r : innerR;
    const angle = (Math.PI / 2) * -1 + (Math.PI / points) * i;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    result.push(`${x},${y}`);
  }
  return result.join(" ");
}
