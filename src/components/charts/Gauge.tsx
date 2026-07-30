type GaugeTone = "blue" | "green" | "amber" | "red" | "slate";

const TONE_COLORS: Record<GaugeTone, { stroke: string; track: string }> = {
  blue:  { stroke: "#2563eb", track: "#dbeafe" },
  green: { stroke: "#16a34a", track: "#dcfce7" },
  amber: { stroke: "#d97706", track: "#fef3c7" },
  red:   { stroke: "#dc2626", track: "#fee2e2" },
  slate: { stroke: "#475569", track: "#e2e8f0" },
};

interface Props {
  value: number;
  max: number;
  label: string;
  detail?: string;
  tone?: GaugeTone;
  size?: "sm" | "md" | "lg";
  /** Show tick marks */
  showTicks?: boolean;
}

/** Semi-circular gauge for single-metric display (e.g., completion %, target vs actual). */
export default function Gauge({
  value,
  max,
  label,
  detail,
  tone = "blue",
  size = "md",
  showTicks = true,
}: Props) {
  const safeMax = Math.max(1, max);
  const safeValue = Math.max(0, Math.min(value, safeMax));
  const percent = Math.round((safeValue / safeMax) * 100);

  const dims = { sm: { w: 120, h: 72, r: 40, sw: 8, font: 14 }, md: { w: 160, h: 96, r: 54, sw: 10, font: 20 }, lg: { w: 220, h: 132, r: 76, sw: 14, font: 26 } };
  const d = dims[size];
  const colors = TONE_COLORS[tone];

  const cx = d.w / 2;
  const cy = d.h - 4;
  // Arc: from π to 2π (left to right, half circle)
  const circumference = Math.PI * d.r;
  const dash = (percent / 100) * circumference;
  const arcStartX = cx - d.r;
  const arcStartY = cy;
  const arcEndX = cx + d.r;
  const arcEndY = cy;

  const arcPath = `M ${arcStartX} ${arcStartY} A ${d.r} ${d.r} 0 0 1 ${arcEndX} ${arcEndY}`;

  return (
    <div className="flex flex-col items-center gap-1" aria-label={`${label}: ${safeValue} dari ${safeMax}`}>
      <svg width={d.w} height={d.h} viewBox={`0 0 ${d.w} ${d.h}`} aria-hidden="true">
        {/* Track arc */}
        <path d={arcPath} fill="none" stroke={colors.track} strokeWidth={d.sw} strokeLinecap="round" />
        {/* Value arc */}
        {percent > 0 && (
          <path d={arcPath} fill="none" stroke={colors.stroke} strokeWidth={d.sw}
            strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`} />
        )}
        {/* Tick marks */}
        {showTicks && (
          <>
            {[0, 25, 50, 75, 100].map((tick) => {
              const angle = Math.PI + (tick / 100) * Math.PI;
              const innerR = d.r - d.sw / 2 - 4;
              const outerR = d.r + d.sw / 2 + 4;
              const x1 = cx + innerR * Math.cos(angle);
              const y1 = cy + innerR * Math.sin(angle);
              const x2 = cx + outerR * Math.cos(angle);
              const y2 = cy + outerR * Math.sin(angle);
              return (
                <g key={tick}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth={1} />
                  <text x={x2 + (tick === 0 ? -8 : tick === 100 ? 8 : 0)} y={y2 + (tick < 50 ? -2 : tick > 50 ? 10 : -2)}
                    textAnchor={tick === 0 ? "end" : tick === 100 ? "start" : "middle"}
                    className="text-[10px] fill-slate-500" fontFamily="system-ui">
                    {tick}%
                  </text>
                </g>
              );
            })}
          </>
        )}
        {/* Needle */}
        {percent > 0 && (() => {
          const angle = Math.PI + (percent / 100) * Math.PI;
          const needleLen = d.r - d.sw;
          const nx = cx + needleLen * Math.cos(angle);
          const ny = cy + needleLen * Math.sin(angle);
          return <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={colors.stroke} strokeWidth={2} strokeLinecap="round" />;
        })()}
        {/* Center dot */}
        <circle cx={cx} cy={cy} r={3} fill={colors.stroke} />
      </svg>
      <span className="text-sm font-bold text-slate-800">{percent}%</span>
      <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
      {detail && <span className="text-[10px] text-slate-500">{detail}</span>}
    </div>
  );
}
