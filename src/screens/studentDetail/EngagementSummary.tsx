import type { Session, Student } from "../../db/types";
import { scoreLabel } from "../../lib/engagement";
import { clampPage, paginateItems } from "../../lib/pagination";
import PaginationControls from "../../components/PaginationControls";
import { LineChart, RatingIndicator } from "../../components/charts";

interface EngagementSummaryProps {
  engSessions: Session[];
  avgEngScore: number | null;
  engTrend: string | null;
  recentEng: Session[];
  subjectEngStats: { subject: string; avgScore: number; count: number; prepRate: number; phoneRate: number; drowsyRate: number }[];
  subjectPage: number;
  setSubjectPage: (v: number) => void;
  student: Student;
}

/** Keseriusan Belajar — ringkasan engagement per murid. */
export default function EngagementSummary({
  engSessions, avgEngScore, engTrend, recentEng,
  subjectEngStats, subjectPage, setSubjectPage, student,
}: EngagementSummaryProps) {
  if (engSessions.length === 0) return null;
  const safeSubjectPage = clampPage(subjectPage, subjectEngStats.length);
  const paginatedSubjectEngStats = paginateItems(subjectEngStats, safeSubjectPage);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-700">Keseriusan Belajar</h2>
        <span className="text-xs text-gray-500">{engSessions.length} sesi tercatat</span>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 divide-x divide-gray-100">
        <div className="p-3 text-center">
          {avgEngScore !== null && (() => {
            const { text, color } = scoreLabel(avgEngScore);
            return (
              <>
                <div className="flex justify-center">
                  <RatingIndicator value={Math.round(avgEngScore)} max={10} size="md" variant="dots"
                    tone={avgEngScore >= 7 ? "green" : avgEngScore >= 4 ? "amber" : "red"} />
                </div>
                <p className="text-xs font-medium mt-0.5" style={{ color }}>{text}</p>
                <p className="text-xs text-gray-500">rata-rata</p>
              </>
            );
          })()}
        </div>
        <div className="p-3 text-center">
          <p className="text-2xl">
            {engTrend === "up" ? "📈" : engTrend === "down" ? "📉" : "➡️"}
          </p>
          <p className="text-xs font-medium text-gray-600">
            {engTrend === "up" ? "Membaik" : engTrend === "down" ? "Menurun" : engTrend === "stable" ? "Stabil" : "—"}
          </p>
          <p className="text-xs text-gray-500">trend</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-2xl font-bold text-red-500">
            {Math.round((engSessions.filter((s) => s.engagement?.playingPhone).length / engSessions.length) * 100)}%
          </p>
          <p className="text-xs font-medium text-red-400">Main HP</p>
          <p className="text-xs text-gray-500">dari sesi</p>
        </div>
      </div>

      {/* Trend summary */}
      {recentEng.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-500">
            📈 Rata-rata fokus: <span className="font-semibold text-gray-700">{avgEngScore}/10</span>
            {" "}dari {recentEng.length} sesi terakhir
            {engTrend === "up" && <span className="text-green-500 ml-1">↑ meningkat</span>}
            {engTrend === "down" && <span className="text-red-500 ml-1">↓ menurun</span>}
            {engTrend === "stable" && <span className="text-gray-500 ml-1">→ stabil</span>}
            {" "}— lihat grafik di atas
          </p>
        </div>
      )}

      {/* Trend chart: skor 15 sesi terakhir (konteks visual pergerakan fokus) */}
      {recentEng.length >= 3 && (
        <div className="px-4 pb-3 border-t border-gray-100 pt-3">
          <LineChart
            series={[{
              label: "Engagement",
              data: recentEng.map((s, i) => ({ x: String(i + 1), y: s.engagement?.score ?? 0 })),
              areaFill: true,
              color: "#2563eb",
            }]}
            height={120}
            dateXAxis={false}
            formatY={(v) => `${Math.round(v)}`}
          />
          <p className="mt-1 text-center text-xs text-gray-500">Skor fokus per sesi — 15 sesi terakhir</p>
        </div>
      )}

      {/* Per-subject breakdown */}
      {subjectEngStats.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Per Mata Pelajaran</p>
          <div className="space-y-2.5">
            {paginatedSubjectEngStats.map((stat) => {
              const { color, bg } = scoreLabel(stat.avgScore);
              return (
                <div key={stat.subject}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-gray-700">{stat.subject}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ color, background: bg }}>
                        {stat.avgScore}/10
                      </span>
                      <span className="text-xs text-gray-500">{stat.count}×</span>
                    </div>
                  </div>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(stat.avgScore / 10) * 100}%`, background: color }} />
                  </div>
                  <div className="flex gap-3 mt-1">
                    {stat.prepRate > 0 && <span className="text-xs text-green-600">📚 Siap {stat.prepRate}%</span>}
                    {stat.phoneRate > 0 && <span className="text-xs text-red-500">📱 Main HP {stat.phoneRate}%</span>}
                    {stat.drowsyRate > 0 && <span className="text-xs text-orange-500">😴 Ngantuk {stat.drowsyRate}%</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <PaginationControls
            page={safeSubjectPage}
            total={subjectEngStats.length}
            onPageChange={setSubjectPage}
            label="mapel"
          />
        </div>
      )}

      {/* AI summary insight */}
      {engSessions.length >= 5 && avgEngScore !== null && (
        <div className="mx-4 mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-xs text-gray-600 leading-relaxed">
            <span className="font-semibold">📊 Insight: </span>
            Dari {engSessions.length} sesi yang tercatat, {student.name.split(" ")[0]} rata-rata{" "}
            mendapat skor <span className="font-semibold">{avgEngScore}/10</span>{" "}
            ({scoreLabel(avgEngScore).text.toLowerCase()}).
            {engSessions.filter((s) => s.engagement?.playingPhone).length > 0 && (
              ` Main HP tercatat di ${engSessions.filter((s) => s.engagement?.playingPhone).length} sesi (${Math.round(engSessions.filter((s) => s.engagement?.playingPhone).length / engSessions.length * 100)}%).`
            )}
            {engTrend === "up" && " Tren terbaru menunjukkan peningkatan keseriusan."}
            {engTrend === "down" && " Perlu perhatian — tren terbaru menurun."}
          </p>
        </div>
      )}
    </div>
  );
}
