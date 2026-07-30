import type { Session, RaporGrade } from "../../db/types";
import { semesterLabel } from "../../lib/engagement";

interface EvidenceCardProps {
  avgEngScore: number | null;
  engSessions: Session[];
  raporList: RaporGrade[] | undefined;
}

/** Kartu "Bukti Keaktifan" — keaktifan sesi dan nilai rapor. */
export default function EvidenceCard({ avgEngScore, engSessions, raporList }: EvidenceCardProps) {
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

  const interpretation = (() => {
    if (avgEngScore === null) return null;
    if (avgEngScore >= 7 && avgGradeStr && parseFloat(avgGradeStr) >= 7)
      return { text: "Fokus & nilai rapor sangat baik — pertahankan!", color: "text-green-600" };
    if (avgEngScore >= 7)
      return { text: "Sangat fokus saat les — potensi nilai bisa terus meningkat.", color: "text-blue-500" };
    if (avgEngScore >= 5)
      return { text: "Cukup fokus, masih bisa ditingkatkan dengan latihan tambahan.", color: "text-orange-500" };
    return { text: "Perlu perhatian ekstra untuk meningkatkan fokus saat les.", color: "text-red-500" };
  })();

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <h2 className="text-base font-semibold text-gray-700">Bukti Keaktifan</h2>
      <p className="text-xs text-gray-500">Keaktifan sesi dan nilai sekolah sebagai bukti progres belajar.</p>

      <div className="grid grid-cols-2 gap-2">
        {/* Avg Engagement */}
        <div className={`rounded-xl p-3 text-center ${avgEngScore === null ? "bg-gray-50" : avgEngScore >= 7 ? "bg-blue-50" : avgEngScore >= 5 ? "bg-yellow-50" : "bg-red-50"}`}>
          <p className={`text-xl font-bold ${avgEngScore === null ? "text-gray-500" : avgEngScore >= 7 ? "text-blue-700" : avgEngScore >= 5 ? "text-yellow-600" : "text-red-600"}`}>
            {avgEngScore !== null ? `${avgEngScore}` : "—"}
          </p>
          <p className="text-xs font-medium text-gray-500 mt-0.5">Avg Fokus</p>
          {engSessions.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">{engSessions.length} sesi</p>
          )}
        </div>

        {/* Rapor */}
        <div className={`rounded-xl p-3 text-center ${!avgGradeStr ? "bg-gray-50" : "bg-indigo-50"}`}>
          <p className={`text-xl font-bold ${!avgGradeStr ? "text-gray-500" : "text-indigo-700"}`}>
            {avgGradeStr ?? "—"}
          </p>
          <p className="text-xs font-medium text-gray-500 mt-0.5">Nilai Rapor</p>
          {latestRapor && (
            <p className="text-xs text-gray-500 mt-0.5">{semesterLabel(latestRapor.semester)}</p>
          )}
        </div>
      </div>

      {interpretation && (
        <div className="rounded-xl p-3 bg-gray-50 border border-gray-100">
          <p className={`text-xs font-semibold ${interpretation.color}`}>{interpretation.text}</p>
        </div>
      )}
    </div>
  );
}
