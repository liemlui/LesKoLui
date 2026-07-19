import type { HomeworkStats } from "../../db/repos";
import type { Session, RaporGrade } from "../../db/types";
import { semesterLabel } from "../../lib/format";

interface EvidenceCardProps {
  hwStats: HomeworkStats | null;
  avgEngScore: number | null;
  engSessions: Session[];
  raporList: RaporGrade[] | undefined;
}

/** Kartu "Bukti Keaktifan" — perbandingan PR, fokus, dan nilai rapor. */
export default function EvidenceCard({ hwStats, avgEngScore, engSessions, raporList }: EvidenceCardProps) {
  const latestRapor = raporList && raporList.length > 0
    ? [...raporList].sort((a, b) => b.semester.localeCompare(a.semester))[0]
    : null;
  const avgGradeStr = latestRapor
    ? (() => {
        const vals = latestRapor.grades
          .map((g) => parseFloat(g.grade))
          .filter((n) => !isNaN(n));
        return vals.length > 0
          ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
          : latestRapor.grades[0]?.grade ?? "—";
      })()
    : null;

  const hwRate = hwStats && (hwStats.done + hwStats.notDone) > 0 ? hwStats.completionRate : null;

  const interpretation = (() => {
    if (hwRate === null || avgEngScore === null) return null;
    if (hwRate >= 80 && avgEngScore >= 7) return { text: "Aktif & patuh — murid terbaik!", color: "text-green-600" };
    if (hwRate >= 80 && avgEngScore < 6) return { text: "Rajin kerjakan PR tapi kurang fokus saat les.", color: "text-orange-500" };
    if (hwRate >= 50 && hwRate < 80 && avgEngScore >= 5 && avgEngScore < 7) return { text: "Cukup konsisten — PR dan fokus bisa ditingkatkan.", color: "text-blue-500" };
    if (hwRate < 50 && avgEngScore >= 7) return { text: "Aktif saat les, tapi PR sering tidak dikerjakan.", color: "text-orange-500" };
    if (hwRate < 50 && avgEngScore < 5) return { text: "Perlu perhatian ekstra — kurang aktif & PR jarang dikerjakan.", color: "text-red-500" };
    return { text: "Cukup baik, masih bisa ditingkatkan.", color: "text-blue-600" };
  })();

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <h2 className="text-base font-semibold text-gray-700">Bukti Keaktifan</h2>
      <p className="text-xs text-gray-400">Perbandingan PR, keaktifan sesi, dan nilai sekolah sebagai bukti progres.</p>

      <div className="grid grid-cols-3 gap-2">
        {/* PR Compliance */}
        <div className={`rounded-xl p-3 text-center ${hwRate === null ? "bg-gray-50" : hwRate >= 70 ? "bg-green-50" : hwRate >= 40 ? "bg-orange-50" : "bg-red-50"}`}>
          <p className={`text-xl font-bold ${hwRate === null ? "text-gray-300" : hwRate >= 70 ? "text-green-700" : hwRate >= 40 ? "text-orange-600" : "text-red-600"}`}>
            {hwRate !== null ? `${hwRate}%` : "—"}
          </p>
          <p className="text-xs font-medium text-gray-500 mt-0.5">Kepatuhan PR</p>
          {hwStats && hwStats.done + hwStats.notDone > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{hwStats.done}✓ {hwStats.notDone}✗</p>
          )}
        </div>

        {/* Avg Engagement */}
        <div className={`rounded-xl p-3 text-center ${avgEngScore === null ? "bg-gray-50" : avgEngScore >= 7 ? "bg-blue-50" : avgEngScore >= 5 ? "bg-yellow-50" : "bg-red-50"}`}>
          <p className={`text-xl font-bold ${avgEngScore === null ? "text-gray-300" : avgEngScore >= 7 ? "text-blue-700" : avgEngScore >= 5 ? "text-yellow-600" : "text-red-600"}`}>
            {avgEngScore !== null ? `${avgEngScore}` : "—"}
          </p>
          <p className="text-xs font-medium text-gray-500 mt-0.5">Avg Fokus</p>
          {engSessions.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{engSessions.length} sesi</p>
          )}
        </div>

        {/* Rapor */}
        <div className={`rounded-xl p-3 text-center ${!avgGradeStr ? "bg-gray-50" : "bg-indigo-50"}`}>
          <p className={`text-xl font-bold ${!avgGradeStr ? "text-gray-300" : "text-indigo-700"}`}>
            {avgGradeStr ?? "—"}
          </p>
          <p className="text-xs font-medium text-gray-500 mt-0.5">Nilai Rapor</p>
          {latestRapor && (
            <p className="text-xs text-gray-400 mt-0.5">{semesterLabel(latestRapor.semester)}</p>
          )}
        </div>
      </div>

      {interpretation && (
        <div className={`rounded-xl p-3 bg-gray-50 border border-gray-100`}>
          <p className={`text-xs font-semibold ${interpretation.color}`}>{interpretation.text}</p>
        </div>
      )}

      {hwStats && hwStats.total > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-green-400 rounded-full transition-all"
              style={{ width: `${(hwStats.done / hwStats.total) * 100}%` }} />
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {hwStats.done}/{hwStats.total} PR selesai
          </span>
        </div>
      )}
    </div>
  );
}
