import type { Session, Student } from "../../db/types";
import { scoreLabel, sessionEngagementScore } from "../../lib/engagement";
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
  /** Sebaran kualitas respons akademik — sumbu kedua (audit P3 #17). */
  responseStats?: {
    answered: number;
    rows: { label: string; count: number }[];
  };
}

/**
 * Keseriusan Belajar — ringkasan kondisi belajar per murid.
 *
 * Perubahan audit P3 #17 (#17):
 *  - rata-rata SELALU disertai penyebut ("dari N sesi berdata"), supaya angka
 *    tidak dibaca sebagai penilaian atas seluruh sesi;
 *  - ditampilkan **cakupan data**: berapa sesi yang mencatat kondisi sama sekali
 *    (pada data nyata tutor hanya 8 dari 1.238 sesi) — tanpa ini, "0% Main HP"
 *    terlihat seperti fakta padahal artinya "tidak pernah diisi";
 *  - ditambahkan **sumbu kedua**: sebaran kualitas respons akademik, karena satu
 *    angka gabungan menutupi sisi yang lain (murid dengan "Miskonsepsi" tetap
 *    bisa punya fokus tinggi).
 */
export default function EngagementSummary({
  engSessions, avgEngScore, engTrend, recentEng,
  subjectEngStats, subjectPage, setSubjectPage, student, responseStats,
}: EngagementSummaryProps) {
  if (engSessions.length === 0) return null;
  const safeSubjectPage = clampPage(subjectPage, subjectEngStats.length);
  const paginatedSubjectEngStats = paginateItems(subjectEngStats, safeSubjectPage);

  const scoredSessions = engSessions.filter((s) => sessionEngagementScore(s) != null);
  const counted = scoredSessions.length;
  const noObservation = engSessions.filter((s) => s.engagement?.scoreBasis === "none").length;
  const noObservationPct = Math.round((noObservation / engSessions.length) * 100);
  const phoneCount = scoredSessions.filter((s) => s.engagement?.playingPhone).length;
  const phonePct = counted > 0 ? Math.round((phoneCount / counted) * 100) : 0;

  return (
    <div className="bg-[var(--surface-strong)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <h2 className="font-semibold text-[var(--ink-strong)]">Keseriusan Belajar</h2>
        <span className="text-xs text-[var(--ink-muted)]">
          {counted} dari {engSessions.length} sesi berdata
        </span>
      </div>

      {/* Cakupan data — jujur soal apa yang TIDAK dicatat (audit P3 #17) */}
      {noObservationPct > 0 && (
        <div className="mx-4 mt-3 rounded-xl border border-[var(--border-warn)] bg-[var(--bg-warn)] px-3 py-2">
          <p className="text-xs text-[var(--ink-warn)]">
            {counted === 0 ? (
              <>
                <span className="font-semibold">Belum ada sesi yang mencatat pengamatan kondisi.</span>{" "}
                Semua {engSessions.length} sesi tercatat tanpa indikator apa pun, jadi belum ada rata-rata yang
                bisa dihitung — catat kondisi saat mengisi Catat Sesi agar angka ini bermakna.
              </>
            ) : (
              <>
                <span className="font-semibold">Cakupan data {100 - noObservationPct}%.</span>{" "}
                {noObservation} sesi ({noObservationPct}%) tercatat tanpa pengamatan kondisi, jadi tidak ikut
                rata-rata — angka di bawah menggambarkan {counted} sesi yang benar-benar diisi, bukan seluruh riwayat.
              </>
            )}
          </p>
        </div>
      )}

      {/* Summary row */}
      <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
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
                <p className="text-xs text-[var(--ink-muted)]">rata-rata dari {counted} sesi</p>
              </>
            );
          })()}
        </div>
        <div className="p-3 text-center">
          <p className="text-2xl">
            {engTrend === "up" ? "📈" : engTrend === "down" ? "📉" : "➡️"}
          </p>
          <p className="text-xs font-medium text-[var(--ink-muted)]">
            {engTrend === "up" ? "Membaik" : engTrend === "down" ? "Menurun" : engTrend === "stable" ? "Stabil" : "—"}
          </p>
          <p className="text-xs text-[var(--ink-muted)]">trend</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-2xl font-bold text-[var(--ink-danger)]">{phonePct}%</p>
          <p className="text-xs font-medium text-[var(--ink-danger)]">Main HP</p>
          {/* Penyebut, bukan "dari sesi" — kata terakhir itu menyiratkan
              seluruh riwayat padahal hanya sesi berdata. */}
          <p className="text-xs text-[var(--ink-muted)]">dari {counted} sesi berdata</p>
        </div>
      </div>

      {/* Sumbu 2 — kualitas respons akademik (audit P3 #17) */}
      {responseStats && responseStats.rows.length > 0 && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <p className="text-xs text-[var(--ink-muted)] font-semibold uppercase tracking-wide mb-2">
            Kualitas Respons Akademik
          </p>
          <div className="space-y-1.5">
            {responseStats.rows.slice(0, 5).map((row) => {
              const pct = Math.round((row.count / responseStats.answered) * 100);
              return (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 truncate text-xs text-[var(--ink-muted)]">{row.label}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                    <span className="block h-full rounded-full bg-[var(--brand-solid)]" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-14 shrink-0 text-right text-xs text-[var(--ink-muted)]">{row.count}× · {pct}%</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-[var(--ink-muted)]">
            Dari {responseStats.answered} sesi yang mencatat respons akademik.
          </p>
        </div>
      )}

      {/* Trend summary */}
      {recentEng.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-xs text-[var(--ink-muted)]">
            📈 Rata-rata fokus: <span className="font-semibold text-[var(--ink-strong)]">{avgEngScore}/10</span>
            {" "}dari {recentEng.length} sesi terakhir
            {engTrend === "up" && <span className="text-[var(--ink-success)] ml-1">↑ meningkat</span>}
            {engTrend === "down" && <span className="text-[var(--ink-danger)] ml-1">↓ menurun</span>}
            {engTrend === "stable" && <span className="text-[var(--ink-muted)] ml-1">→ stabil</span>}
            {" "}— lihat grafik di atas
          </p>
        </div>
      )}

      {/* Trend chart: skor 15 sesi terakhir (konteks visual pergerakan fokus) */}
      {recentEng.length >= 3 && (
        <div className="px-4 pb-3 border-t border-[var(--border)] pt-3">
          <LineChart
            series={[{
              label: "Engagement",
              data: recentEng.map((s, i) => ({ x: String(i + 1), y: sessionEngagementScore(s) ?? 0 })),
              areaFill: true,
              color: "#2563eb",
            }]}
            height={120}
            dateXAxis={false}
            formatY={(v) => `${Math.round(v)}`}
          />
          <p className="mt-1 text-center text-xs text-[var(--ink-muted)]">Skor fokus per sesi — 15 sesi terakhir</p>
        </div>
      )}

      {/* Per-subject breakdown */}
      {subjectEngStats.length > 0 && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <p className="text-xs text-[var(--ink-muted)] font-semibold uppercase tracking-wide mb-2">Per Mata Pelajaran</p>
          <div className="space-y-2.5">
            {paginatedSubjectEngStats.map((stat) => {
              const { color, bg } = scoreLabel(stat.avgScore);
              return (
                <div key={stat.subject}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-[var(--ink-strong)]">{stat.subject}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ color, background: bg }}>
                        {stat.avgScore}/10
                      </span>
                      <span className="text-xs text-[var(--ink-muted)]">{stat.count}×</span>
                    </div>
                  </div>
                  <div className="flex-1 h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(stat.avgScore / 10) * 100}%`, background: color }} />
                  </div>
                  <div className="flex gap-3 mt-1">
                    {stat.prepRate > 0 && <span className="text-xs text-[var(--ink-success)]">📚 Siap {stat.prepRate}%</span>}
                    {stat.phoneRate > 0 && <span className="text-xs text-[var(--ink-danger)]">📱 Main HP {stat.phoneRate}%</span>}
                    {stat.drowsyRate > 0 && <span className="text-xs text-[var(--ink-attention)]">😴 Ngantuk {stat.drowsyRate}%</span>}
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

      {/* Ringkasan kalimat — penyebutnya disebut, bukan disamarkan (P3 #17) */}
      {counted >= 5 && avgEngScore !== null && (
        <div className="mx-4 mb-3 p-3 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
            <span className="font-semibold">📊 Insight: </span>
            Dari {counted} sesi yang mencatat kondisi (dari total {engSessions.length} sesi),{" "}
            {student.name.split(" ")[0]} rata-rata mendapat skor{" "}
            <span className="font-semibold">{avgEngScore}/10</span>{" "}
            ({scoreLabel(avgEngScore).text.toLowerCase()}).
            {phoneCount > 0 && (
              ` Main HP tercatat di ${phoneCount} sesi (${phonePct}% dari sesi berdata).`
            )}
            {responseStats && responseStats.rows[0] && (
              ` Respons akademik yang paling sering: ${responseStats.rows[0].label} (${responseStats.rows[0].count}×).`
            )}
            {engTrend === "up" && " Tren terbaru menunjukkan peningkatan keseriusan."}
            {engTrend === "down" && " Perlu perhatian — tren terbaru menurun."}
          </p>
        </div>
      )}
    </div>
  );
}
