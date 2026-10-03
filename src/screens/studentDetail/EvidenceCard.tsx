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
      return { text: "Sangat fokus saat les — potensi nilai bisa terus meningkat.", color: "text-[var(--ink-brand)]" };
    if (avgEngScore >= 5)
      return { text: "Cukup fokus, masih bisa ditingkatkan dengan latihan tambahan.", color: "text-[var(--ink-attention)]" };
    return { text: "Perlu perhatian ekstra untuk meningkatkan fokus saat les.", color: "text-[var(--ink-danger)]" };
  })();

  return (
    <div className="bg-[var(--surface-strong)] rounded-2xl p-4 border border-[var(--border)] space-y-3">
      <h2 className="text-base font-semibold text-[var(--ink-strong)]">Bukti Keaktifan</h2>
      <p className="text-xs text-[var(--ink-muted)]">Keaktifan sesi sebagai bukti progres belajar.</p>

      <div className={`rounded-xl p-3 text-center ${avgEngScore === null ? "bg-[var(--surface)]" : avgEngScore >= 7 ? "bg-[var(--brand-tint)]" : avgEngScore >= 5 ? "bg-[var(--bg-warn)]" : "bg-[var(--bg-danger)]"}`}>
        <p className={`text-xl font-bold ${avgEngScore === null ? "text-[var(--ink-muted)]" : avgEngScore >= 7 ? "text-[var(--ink-brand)]" : avgEngScore >= 5 ? "text-[var(--ink-warn)]" : "text-[var(--ink-danger)]"}`}>
          {avgEngScore !== null ? `${avgEngScore}` : "—"}
        </p>
        <p className="text-xs font-medium text-[var(--ink-muted)] mt-0.5">Avg Fokus</p>
        {engSessions.length > 0 && (
          <p className="text-xs text-[var(--ink-muted)] mt-0.5">{engSessions.length} sesi</p>
        )}
      </div>

      {interpretation && (
        <div className="rounded-xl p-3 bg-[var(--surface)] border border-[var(--border)]">
          <p className={`text-xs font-semibold ${interpretation.color}`}>{interpretation.text}</p>
        </div>
      )}
    </div>
  );
}
