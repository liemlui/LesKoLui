import { useMemo, useState } from "react";

export interface BarSeries {
  label: string;
  value: number;
  color?: string;
  /** Stack group — bars in the same group stack together */
  stack?: string;
}

export type BarChartRange = "daily" | "weekly" | "monthly";

interface Props {
  series: BarSeries[];
  /** Labels for each bar position (x-axis) */
  labels: string[];
  /** Height in pixels */
  height?: number;
  /** Show axis labels */
  showAxes?: boolean;
  /** Dynamic range toggle */
  range?: BarChartRange;
  onRangeChange?: (r: BarChartRange) => void;
  /** Tone for empty state */
  emptyLabel?: string;
  /** Format y-axis values */
  formatValue?: (v: number) => string;
  /** Visual separators between stacked bars */
  showSeparators?: boolean;
}

const DEFAULT_COLORS = [
  "#2563eb", "#16a34a", "#d97706", "#dc2626",
  "#7c3aed", "#0891b2", "#be185d", "#65a30d",
];

/** Pure-SVG bar chart with stacked bars, visual separators, and optional range toggle. */
export default function BarChart({
  series,
  labels,
  height = 200,
  showAxes = true,
  range,
  onRangeChange,
  emptyLabel = "Belum ada data",
  formatValue = (v) => String(v),
  showSeparators = true,
}: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  // Compute stacked heights per label position
  const { maxStack, stacksByLabel } = useMemo(() => {
    const map = new Map<string, { total: number; items: { series: BarSeries; y0: number }[] }>();
    labels.forEach((l) => map.set(l, { total: 0, items: [] }));

    // Group by label, then by stack
    const byLabel = new Map<string, BarSeries[]>();
    series.forEach((s) => {
      const arr = byLabel.get(s.label) ?? [];
      arr.push(s);
      byLabel.set(s.label, arr);
    });

    let max = 0;
    byLabel.forEach((items, label) => {
      // Group items by stack name
      const stackGroups = new Map<string, BarSeries[]>();
      items.forEach((item) => {
        const key = item.stack ?? item.label;
        const g = stackGroups.get(key) ?? [];
        g.push(item);
        stackGroups.set(key, g);
      });

      let runningY0 = 0;
      const stacked: { total: number; items: { series: BarSeries; y0: number }[] } = { total: 0, items: [] };
      stackGroups.forEach((group) => {
        const groupTotal = group.reduce((s, i) => s + Math.max(0, i.value), 0);
        stacked.items.push({ series: { ...group[0], value: groupTotal }, y0: runningY0 });
        runningY0 += groupTotal;
        stacked.total += groupTotal;
      });
      max = Math.max(max, stacked.total);
      map.set(label, stacked);
    });

    return { maxStack: max, stacksByLabel: map };
  }, [series, labels]);

  const padding = { top: 10, right: 16, bottom: showAxes ? 32 : 8, left: showAxes ? 48 : 8 };
  const chartW = 600; // viewBox width
  const chartH = height + padding.top + padding.bottom;
  const barAreaW = chartW - padding.left - padding.right;
  const barAreaH = height;
  const barGap = Math.max(4, barAreaW / (labels.length * 4));
  const barWidth = labels.length > 0 ? (barAreaW - barGap * (labels.length + 1)) / labels.length : 0;

  const yMax = maxStack > 0 ? maxStack * 1.15 : 10;
  const yTicks = 4;
  const yStep = yMax / yTicks;

  if (labels.length === 0 || series.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100" style={{ height }}>
        <p className="text-sm text-slate-400">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div>
      {range && onRangeChange && (
        <div className="flex items-center gap-1 mb-2">
          {(["daily", "weekly", "monthly"] as BarChartRange[]).map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                range === r
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              }`}>
              {r === "daily" ? "Harian" : r === "weekly" ? "Mingguan" : "Bulanan"}
            </button>
          ))}
        </div>
      )}

      <div className="relative" onMouseLeave={() => setTooltip(null)}>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ maxHeight: chartH }}
          role="img" aria-label="Bar chart">
          {/* Y-axis grid lines + labels */}
          {showAxes && Array.from({ length: yTicks + 1 }).map((_, i) => {
            const val = yStep * i;
            const y = padding.top + barAreaH - (val / yMax) * barAreaH;
            return (
              <g key={`y-${i}`}>
                <line x1={padding.left} x2={chartW - padding.right} y1={y} y2={y}
                  stroke="#e2e8f0" strokeWidth={i === 0 ? 1 : 0.5} />
                <text x={padding.left - 6} y={y + 4} textAnchor="end"
                  className="text-[10px] fill-slate-400" fontFamily="system-ui">{formatValue(val)}</text>
              </g>
            );
          })}

          {/* Bars */}
          {labels.map((label, li) => {
            const stack = stacksByLabel.get(label);
            if (!stack) return null;
            const x = padding.left + barGap + li * (barWidth + barGap);
            return (
              <g key={label}>
                {stack.items.map((item, si) => {
                  const barH = yMax > 0 ? (item.series.value / yMax) * barAreaH : 0;
                  const y = padding.top + barAreaH - (yMax > 0 ? ((item.y0 + item.series.value) / yMax) * barAreaH : 0);
                  const color = item.series.color ?? DEFAULT_COLORS[si % DEFAULT_COLORS.length];
                  return (
                    <g key={`${label}-${si}`}>
                      <rect
                        x={x} y={Math.max(padding.top, y)} width={Math.max(1, barWidth)}
                        height={Math.max(0, barH)}
                        fill={color} rx={2}
                        onMouseEnter={(e) => {
                          const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
                          const svg = (e.currentTarget.closest("svg") as SVGSVGElement)?.getBoundingClientRect();
                          if (svg) {
                            setTooltip({
                              x: rect.left - svg.left + rect.width / 2,
                              y: rect.top - svg.top - 8,
                              text: `${item.series.label}: ${formatValue(item.series.value)}`,
                            });
                          }
                        }}
                        onClick={(e) => {
                          const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
                          const svg = (e.currentTarget.closest("svg") as SVGSVGElement)?.getBoundingClientRect();
                          if (svg) {
                            setTooltip((prev) =>
                              prev ? null : {
                                x: rect.left - svg.left + rect.width / 2,
                                y: rect.top - svg.top - 8,
                                text: `${item.series.label}: ${formatValue(item.series.value)}`,
                              }
                            );
                          }
                        }}
                      />
                      {/* Visual separator between stacked bars */}
                      {showSeparators && si > 0 && barH > 2 && (
                        <line
                          x1={x} x2={x + Math.max(1, barWidth)} y1={y} y2={y}
                          stroke="rgba(255,255,255,0.35)" strokeWidth={1}
                        />
                      )}
                    </g>
                  );
                })}
                {/* X-axis label */}
                {showAxes && (
                  <text x={x + barWidth / 2} y={chartH - 6} textAnchor="middle"
                    className="text-[10px] fill-slate-400" fontFamily="system-ui">
                    {label.length > 6 ? label.slice(0, 5) + "…" : label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Baseline */}
          {showAxes && (
            <line x1={padding.left} x2={chartW - padding.right}
              y1={padding.top + barAreaH} y2={padding.top + barAreaH}
              stroke="#cbd5e1" strokeWidth={1} />
          )}
        </svg>

        {/* Tooltip overlay */}
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-gray-800 text-white text-xs font-semibold px-2 py-1 rounded-lg shadow-lg whitespace-nowrap z-10"
            style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}>
            {tooltip.text}
          </div>
        )}
      </div>
    </div>
  );
}
