import type { Session } from "../../db/types";

interface EvidenceCardProps {
  avgEngScore: number | null;
  engSessions: Session[];
}

/** Kartu "Bukti Keaktifan" — fokus pada keaktifan sesi (tanpa nilai rapor manual). */
export default function EvidenceCard({ avgEngScore, engSessions }: EvidenceCardProps) {
  const interpretation = (() => {
    if (avgEngScore === null) return null;
    if (avgEngScore >= 7)
      return { text: "Sangat fokus saat les — potensi nilai bisa terus meningkat.", color: "text-blue-500" };
    if (avgEngScore >= 5)
      return { text: "Cukup fokus, masih bisa ditingkatkan dengan latihan tambahan.", color: "text-orange-500" };
    return { text: "Perlu perhatian ekstra untuk meningkatkan fokus saat les.", color: "text-red-500" };
  })();

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <h2 className="text-base font-semibold text-gray-700">Bukti Keaktifan</h2>
      <p className="text-xs text-gray-500">Keaktifan sesi sebagai bukti progres belajar.</p>

      <div className={`rounded-xl p-3 text-center ${avgEngScore === null ? "bg-gray-50" : avgEngScore >= 7 ? "bg-blue-50" : avgEngScore >= 5 ? "bg-yellow-50" : "bg-red-50"}`}>
        <p className={`text-xl font-bold ${avgEngScore === null ? "text-gray-500" : avgEngScore >= 7 ? "text-blue-700" : avgEngScore >= 5 ? "text-yellow-600" : "text-red-600"}`}>
          {avgEngScore !== null ? `${avgEngScore}` : "—"}
        </p>
        <p className="text-xs font-medium text-gray-500 mt-0.5">Avg Fokus</p>
        {engSessions.length > 0 && (
          <p className="text-xs text-gray-500 mt-0.5">{engSessions.length} sesi</p>
        )}
      </div>

      {interpretation && (
        <div className="rounded-xl p-3 bg-gray-50 border border-gray-100">
          <p className={`text-xs font-semibold ${interpretation.color}`}>{interpretation.text}</p>
        </div>
      )}
    </div>
  );
}
