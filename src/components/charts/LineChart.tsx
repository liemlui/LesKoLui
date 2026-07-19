import { useMemo, useState } from "react";

export interface LineSeries {
  label: string;
  data: { x: string; y: number }[];
  color?: string;
  /** Fill area under the line */
  areaFill?: boolean;
}

interface Props {
  series: LineSeries[];
  height?: number;
  showAxes?: boolean;
  emptyLabel?: string;
  formatY?: (v: number) => string;
  /** Whether X axis labels are dates — shortens formatting */
  dateXAxis?: boolean;
}

const DEFAULT_COLORS = [
  "#2563eb", "#16a34a", "#d97706", "#dc2626",
  "#7c3aed", "#0891b2", "#be185d",
];

function shortDateLabel(d: string): string {
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return d.length > 5 ? d.slice(5) : d;
}

/** Pure-SVG line chart with optional area fill and multi-series. */
export default function LineChart({
  series,
  height = 200,
  showAxes = true,
  emptyLabel = "Belum ada data",
  formatY = (v) => String(v),
  dateXAxis = true,
}: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const { allLabels, yMin, yMax, seriesData } = useMemo(() => {
    // Collect all unique x labels, preserving order
    const labelSet = new Set<string>();
    series.forEach((s) => s.data.forEach((d) => labelSet.add(d.x)));
    const labels = Array.from(labelSet).sort();

    let min = Infinity;
    let max = -Infinity;
    series.forEach((s) => s.data.forEach((d) => {
      if (d.y < min) min = d.y;
      if (d.y > max) max = d.y;
    }));

    if (!isFinite(min) || !isFinite(max)) { min = 0; max = 10; }
    const range = max - min || 10;
    const paddedMin = min - range * 0.05;
    const paddedMax = max + range * 0.1;

    // Map each series data to coordinates
    const sd = series.map((s) => {
      const pointMap = new Map(s.data.map((d) => [d.x, d.y]));
      return { ...s, pointMap };
    });

    return { allLabels: labels, yMin: paddedMin, yMax: paddedMax, seriesData: sd };
  }, [series]);

  const padding = { top: 10, right: 16, bottom: showAxes ? 32 : 8, left: showAxes ? 48 : 8 };
  const chartW = 600;
  const chartH = height + padding.top + padding.bottom;
  const plotW = chartW - padding.left - padding.right;
  const plotH = height;
  const yRange = yMax - yMin || 1;

  const toX = (i: number) =>
    padding.left + (allLabels.length > 1 ? (i / (allLabels.length - 1)) * plotW : plotW / 2);
  const toY = (val: number) =>
    padding.top + plotH - ((val - yMin) / yRange) * plotH;

  if (allLabels.length === 0 || series.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100" style={{ height }}>
        <p className="text-sm text-slate-400">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="relative" onMouseLeave={() => setTooltip(null)}>
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ maxHeight: chartH }}
        role="img" aria-label="Line chart">
        {/* Y-axis grid lines */}
        {showAxes && Array.from({ length: 5 }).map((_, i) => {
          const val = yMin + (yRange / 4) * i;
          const y = toY(val);
          return (
            <g key={`y-${i}`}>
              <line x1={padding.left} x2={chartW - padding.right} y1={y} y2={y}
                stroke="#e2e8f0" strokeWidth={0.5} />
              <text x={padding.left - 6} y={y + 4} textAnchor="end"
                className="text-[9px] fill-slate-400" fontFamily="system-ui">{formatY(val)}</text>
            </g>
          );
        })}

        {/* Axes */}
        {showAxes && (
          <>
            <line x1={padding.left} x2={padding.left} y1={padding.top} y2={padding.top + plotH}
              stroke="#cbd5e1" strokeWidth={1} />
            <line x1={padding.left} x2={chartW - padding.right}
              y1={padding.top + plotH} y2={padding.top + plotH} stroke="#cbd5e1" strokeWidth={1} />
          </>
        )}

        {/* Series */}
        {seriesData.map((s, si) => {
          const color = s.color ?? DEFAULT_COLORS[si % DEFAULT_COLORS.length];
          const points = allLabels.map((l, li) => {
            const val = s.pointMap.get(l);
            return val != null ? { x: toX(li), y: toY(val), val } : null;
          }).filter((p): p is { x: number; y: number; val: number } => p !== null);

          if (points.length < 2) {
            // Single point — draw a dot
            const p = points[0];
            if (!p) return null;
            return (
              <g key={si}>
                <circle cx={p.x} cy={p.y} r={4} fill={color} />
                {showAxes && (
                  <text x={toX(allLabels.indexOf(s.data[0]?.x ?? ""))} y={chartH - 6}
                    textAnchor="middle" className="text-[9px] fill-slate-400" fontFamily="system-ui">
                    {dateXAxis ? shortDateLabel(s.data[0]?.x ?? "") : (s.data[0]?.x ?? "")}
                  </text>
                )}
              </g>
            );
          }

          const lineD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

          return (
            <g key={si}>
              {/* Area fill */}
              {s.areaFill && (
                <path
                  d={`${lineD} L${points[points.length - 1].x},${toY(yMin)} L${points[0].x},${toY(yMin)} Z`}
                  fill={color} fillOpacity={0.1}
                />
              )}
              {/* Line */}
              <path d={lineD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              {/* Data points */}
              {points.map((p, pi) => (
                <circle
                  key={pi} cx={p.x} cy={p.y} r={3} fill="white" stroke={color} strokeWidth={2}
                  onMouseEnter={(e) => {
                    const svg = (e.currentTarget.closest("svg") as SVGSVGElement)?.getBoundingClientRect();
                    if (svg) {
                      const rect = (e.currentTarget as SVGCircleElement).getBoundingClientRect();
                      setTooltip({
                        x: rect.left - svg.left + 6,
                        y: rect.top - svg.top - 6,
                        text: `${s.label}: ${formatY(p.val)}`,
                      });
                    }
                  }}
                  onClick={(e) => {
                    const svg = (e.currentTarget.closest("svg") as SVGSVGElement)?.getBoundingClientRect();
                    if (svg) {
                      const rect = (e.currentTarget as SVGCircleElement).getBoundingClientRect();
                      setTooltip((prev) =>
                        prev ? null : {
                          x: rect.left - svg.left + 6,
                          y: rect.top - svg.top - 6,
                          text: `${s.label}: ${formatY(p.val)}`,
                        }
                      );
                    }
                  }}
                />
              ))}
            </g>
          );
        })}

        {/* X-axis labels */}
        {showAxes && allLabels.length <= 14 && allLabels.map((label, li) => (
          <text key={`xl-${li}`} x={toX(li)} y={chartH - 6} textAnchor="middle"
            className="text-[9px] fill-slate-400" fontFamily="system-ui">
            {dateXAxis ? shortDateLabel(label) : (label.length > 6 ? label.slice(0, 5) + "…" : label)}
          </text>
        ))}
      </svg>

      {tooltip && (
        <div
          className="absolute pointer-events-none bg-gray-800 text-white text-[11px] font-semibold px-2 py-1 rounded-lg shadow-lg whitespace-nowrap z-10"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
