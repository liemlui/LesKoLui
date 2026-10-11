import { useMemo } from "react";
import type { Session, Student } from "../../db/types";
import { scoreLabel, sessionEngagementScore } from "../../lib/engagement";
import { studentConclusion, buildConclusionLog } from "../../lib/studentConclusion";
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
 * Keseriusan Belajar — kesimpulan tentang murid, bukan tabel angka.
 *
 * Perubahan 2026-10-09 (keputusan pemilik K6): dua kartu yang menampilkan
 * rata-rata fokus DIGABUNG, dan yang diutamakan adalah **kesimpulan**: murid ini
 * seperti apa. Sebelumnya rata-rata yang sama muncul di empat tempat dengan tiga
 * penyebut berbeda, dan salah satunya (`:146` versi lama) menempelkan rata-rata
 * seluruh riwayat pada penyebut "15 sesi terakhir". Sekarang:
 *
 * - satu blok kesimpulan di atas, dihasilkan `lib/studentConclusion.ts`;
 * - angka pendukung tinggal satu baris, dan hanya memuat yang BELUM disebut
 *   kesimpulan (main HP + penyebut, jumlah sesi berdata);
 * - tidak ada lagi baris "rata-rata fokus" yang mengulang rata-rata.
 *
 * Cakupan data tetap ditampilkan apa adanya — itu bagian dari kejujuran angka,
 * bukan pengulangan (audit P3 #17).
 */
export default function EngagementSummary({
  engSessions, avgEngScore, engTrend, recentEng,
  subjectEngStats, subjectPage, setSubjectPage, student, responseStats,
}: EngagementSummaryProps) {
  const conclusion = useMemo(() => {
    const scored = engSessions.filter((s) => sessionEngagementScore(s) != null);
    const counted = scored.length;
    const topRow = responseStats?.rows[0];
    return studentConclusion({
      firstName: student.name.split(" ")[0] ?? student.name,
      avgScore: avgEngScore,
      counted,
      total: engSessions.length,
      trend: engTrend,
      recentCount: recentEng.length,
      log: buildConclusionLog(scored),
      topResponse: topRow ? { label: topRow.label, count: topRow.count } : null,
      responseAnswered: responseStats?.answered ?? 0,
      // Dianggap ada catatan topik bila minimal satu sesi selesai punya topik.
      // Ambang "minimal satu" dipilih supaya kesimpulan tidak menuduh data tidak
      // ada hanya karena sebagian sesi memang belum diisi topiknya.
      hasTopicNotes: engSessions.some((s) => Boolean(s.topic?.trim())),
    });
  }, [engSessions, avgEngScore, engTrend, recentEng, responseStats, student.name]);

  if (engSessions.length === 0) return null;

  const safeSubjectPage = clampPage(subjectPage, subjectEngStats.length);
  const paginatedSubjectEngStats = paginateItems(subjectEngStats, safeSubjectPage);

  const counted = engSessions.filter((s) => sessionEngagementScore(s) != null).length;
  const phoneCount = engSessions.filter(
    (s) => sessionEngagementScore(s) != null && s.engagement?.playingPhone
  ).length;
  const phonePct = counted > 0 ? Math.round((phoneCount / counted) * 100) : 0;
  const countedPct = engSessions.length > 0 ? Math.round((counted / engSessions.length) * 100) : 0;

  const behaviourTone =
    conclusion.behaviour === "baik" ? "text-[var(--ink-success)]" :
    conclusion.behaviour === "cukup" ? "text-[var(--ink-attention)]" :
    "text-[var(--ink-danger)]";

  return (
    <div className="bg-[var(--surface-strong)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-2">
        <h2 className="font-semibold text-[var(--ink-strong)]">Kesimpulan</h2>
        <span className="text-xs text-[var(--ink-muted)] flex-shrink-0">
          {counted} dari {engSessions.length} sesi berdata
        </span>
      </div>

      {/* ── Blok utama: kesimpulan tentang murid ini ── */}
      <div className="px-4 py-3">
        <p className={`text-sm font-semibold leading-relaxed ${behaviourTone}`}>{conclusion.headline}</p>

        {conclusion.details.length > 0 && (
          <ul className="mt-2 space-y-1">
            {conclusion.details.map((d) => (
              <li key={d} className="text-xs leading-relaxed text-[var(--ink-muted)]">• {d}</li>
            ))}
          </ul>
        )}

        {conclusion.caveat && (
          <p className="mt-2 rounded-xl border border-[var(--border-warn)] bg-[var(--bg-warn)] px-3 py-2 text-xs leading-relaxed text-[var(--ink-warn)]">
            {conclusion.caveat}
          </p>
        )}
      </div>

      {/* ── Angka pendukung: hanya yang belum disebut kesimpulan ── */}
      {counted > 0 && (
        <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-t border-[var(--border)]">
          <div className="p-3 text-center">
            {avgEngScore !== null && (() => {
              const { text, color } = scoreLabel(avgEngScore);
              // Angka rata-ratanya SENGAJA tidak ditulis lagi di sini: kesimpulan
              // di atas sudah menyebutnya beserta penyebutnya. Yang tinggal adalah
              // bentuk visualnya (titik) + label keadaan, supaya "8/10" tidak
              // muncul tiga kali dalam satu kartu.
              return (
                <>
                  <div className="flex justify-center">
                    <RatingIndicator value={Math.round(avgEngScore)} max={10} size="md" variant="dots" hideValue
                      tone={avgEngScore >= 7 ? "green" : avgEngScore >= 4 ? "amber" : "red"} />
                  </div>
                  <p className="text-xs font-medium mt-0.5" style={{ color }}>{text}</p>
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
            <p className="text-xs text-[var(--ink-muted)]">tren</p>
          </div>
          <div className="p-3 text-center">
            <p className="text-2xl font-bold text-[var(--ink-danger)]">{phonePct}%</p>
            <p className="text-xs font-medium text-[var(--ink-danger)]">Main HP</p>
            <p className="text-xs text-[var(--ink-muted)]">dari {counted} sesi berdata</p>
          </div>
        </div>
      )}

      {/* ── Cakupan data: apa yang TIDAK tercatat (audit P3 #17) ── */}
      {countedPct < 100 && (
        <div className="mx-4 my-3 rounded-xl border border-[var(--border-warn)] bg-[var(--bg-warn)] px-3 py-2">
          <p className="text-xs text-[var(--ink-warn)]">
            <span className="font-semibold">Cakupan data {countedPct}%.</span>{" "}
            {engSessions.length - counted} sesi tercatat tanpa pengamatan kondisi, jadi tidak ikut
            rata-rata — angka di atas menggambarkan {counted} sesi yang benar-benar diisi, bukan seluruh riwayat.
          </p>
        </div>
      )}

      {/* ── Sebaran kualitas respons akademik (audit P3 #17) ── */}
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

      {/* ── Grafik skor per sesi ── */}
      {recentEng.length >= 3 && (
        <div className="px-4 pb-3 border-t border-[var(--border)] pt-3">
          <LineChart
            series={[{
              label: "Fokus",
              data: recentEng.map((s, i) => ({ x: String(i + 1), y: sessionEngagementScore(s) ?? 0 })),
              areaFill: true,
              color: "#2563eb",
            }]}
            height={120}
            dateXAxis={false}
            formatY={(v) => `${Math.round(v)}`}
            ariaLabel={`Skor fokus ${recentEng.length} sesi terakhir`}
          />
          <p className="mt-1 text-center text-xs text-[var(--ink-muted)]">
            Skor fokus per sesi — {recentEng.length} sesi terakhir yang punya skor
          </p>
        </div>
      )}

      {/* ── Rincian per mata pelajaran ── */}
      {subjectEngStats.length > 0 && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <p className="text-xs text-[var(--ink-muted)] font-semibold uppercase tracking-wide mb-2">Per Mata Pelajaran</p>
          <div className="space-y-2.5">
            {paginatedSubjectEngStats.map((stat) => {
              const { color } = scoreLabel(stat.avgScore);
              return (
                <div key={stat.subject}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-[var(--ink-strong)]">{stat.subject}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ color }}>
                        {stat.avgScore}/10
                      </span>
                      <span className="text-xs text-[var(--ink-muted)]">dari {stat.count} sesi</span>
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
    </div>
  );
}
