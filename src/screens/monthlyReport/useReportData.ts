/**
 * Menyusun `ReportData` untuk pratinjau dan ekspor (dipisah dari MonthlyReport.tsx
 * pada refactor terbatas G3-05).
 *
 * Dua hal yang sengaja dipertahankan persis seperti sebelumnya:
 *  - **Foto dipakai apa adanya** (tanpa center-crop permanen) supaya wajah tidak
 *    terpotong dan hasil JPG/PDF tidak buram.
 *  - **Urutan kronologis** (awal→akhir periode): orang tua membaca laporan
 *    sebagai cerita perkembangan, dan semua visual tren mengandalkan urutan ini.
 */

import { useEffect, useState } from "react";
import { db } from "../../db/db";
import { listConfirmedReportsByStudent } from "../../db/repos";
import { blobToDataUrl } from "../../lib/imageUtils";
import { dayLabel, monthLabel, periodLabel } from "../../lib/format";
import { findPreviousPeriodReport } from "../../lib/reportSessionScope";
import { averageEngagement, scoreLabel, sessionEngagementScore } from "../../lib/engagement";
import { gradeDelta } from "../../template/layouts";
import { buildSessionNarrative, cleanText, formatHours, sessionSubjectLabel, sessionTimeLabel } from "./helpers";
import type { MonthlyReport, Session, Settings, Student } from "../../db/types";
import type { ReportData } from "../../template/types";

export function useReportData(deps: {
  student?: Student;
  report?: MonthlyReport;
  reportSessions: readonly Session[];
  settings?: Settings;
  periodStart: string;
  periodEnd: string;
  month: string;
  /** Mode tagihan laporan ini — paket per pertemuan tidak mencetak jam & durasi. */
  billingMode?: MonthlyReport["billingMode"];
  totalHours: number;
}) {
  const { student, report, reportSessions, settings, periodStart, periodEnd, month, billingMode, totalHours } = deps;
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [prevAvgEngagement, setPrevAvgEngagement] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!student || reportSessions.length === 0) { setReportData(null); setPrevAvgEngagement(undefined); return; }
    setReportData(null);
    let cancelled = false;
    (async () => {
      const logoUrl = settings?.logo ? await blobToDataUrl(settings.logo) : undefined;
      // Rata-rata engagement periode SEBELUMNYA (tren bulan-ke-bulan). Best-effort:
      // gagal membaca laporan lama tidak boleh menggagalkan pratinjau.
      const prevAvg = await (async () => {
        try {
          const confirmed = await listConfirmedReportsByStudent(student.id);
          const prev = findPreviousPeriodReport(confirmed, periodStart);
          if (!prev) return undefined;
          const rows = await db.sessions.bulkGet(prev.sessionIds);
          return averageEngagement(rows.filter((s): s is Session => Boolean(s)));
        } catch {
          return undefined;
        }
      })();
      if (cancelled) return;
      setPrevAvgEngagement(prevAvg);
      const sorted = [...reportSessions].sort((a, b) => a.date.localeCompare(b.date));
      const entries = await Promise.all(
        sorted.map(async (s) => {
          const engScore = sessionEngagementScore(s);
          const engLabel = engScore != null ? scoreLabel(engScore).text : undefined;
          const subject = sessionSubjectLabel(s.subjects);
          return {
            date: dayLabel(s.date).split(",")[1]?.trim() ?? s.date.slice(5),
            subject,
            photoUrl: s.photo ? await blobToDataUrl(s.photo) : undefined,
            narrative: buildSessionNarrative(s, subject),
            topic: cleanText(s.topic) || undefined,
            mood: cleanText(s.mood) || undefined,
            timeLabel: billingMode === "session_count" ? undefined : sessionTimeLabel(s),
            durationLabel: billingMode === "session_count" ? undefined : formatHours(s.durationHours),
            needsWork: cleanText(s.needsWork) || undefined,
            predictedGrade: cleanText(s.predictedGrade) || undefined,
            actualGrade: cleanText(s.actualGrade) || undefined,
            signatureUrl: s.signature ? await blobToDataUrl(s.signature) : undefined,
            engagementScore: engScore,
            engagementLabel: engLabel,
          };
        })
      );
      const scores = entries.filter((entry) => entry.engagementScore != null).map((entry) => entry.engagementScore!);
      const avgEngagement = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : undefined;
      const photoUrls = entries.filter((entry) => entry.photoUrl).map((entry) => entry.photoUrl!);
      // Tabel prediksi vs nilai aktual — konteks ujian jelas (topik/mapel).
      const gradeComparison = sorted
        .filter((s) => cleanText(s.predictedGrade) || cleanText(s.actualGrade))
        .map((s) => {
          const fullDate = dayLabel(s.date).split(",")[1]?.trim() ?? s.date.slice(5);
          return {
            date: fullDate.split(" ").slice(0, 2).join(" "),
            exam: cleanText(s.topic) || sessionSubjectLabel(s.subjects) || "Ujian",
            predicted: cleanText(s.predictedGrade) || undefined,
            actual: cleanText(s.actualGrade) || undefined,
            delta: gradeDelta(s.predictedGrade, s.actualGrade),
          };
        });
      // Agregat periode penuh untuk layout infografis (akurat lintas halaman).
      const distMap = new Map<string, number>();
      reportSessions.forEach((s) => s.subjects.map((x) => x.trim()).filter(Boolean)
        .forEach((sub) => distMap.set(sub, (distMap.get(sub) ?? 0) + 1)));
      const subjectDist = [...distMap.entries()]
        .map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
      if (cancelled) return;
      setReportData({
        studentName: student.name,
        period: periodLabel(periodStart, periodEnd) || monthLabel(month),
        tutorName: settings?.tutorProfile?.name ?? "",
        logoUrl,
        entries,
        summary: report?.summaryText ?? "",
        teacherNote: report?.teacherNote,
        quote: report?.quote,
        nextMonthPlan: report?.nextMonthPlan,
        avgEngagement,
        prevAvgEngagement: prevAvg,
        photoUrls,
        totalHours,
        totalSessions: entries.length,
        subjectDist,
        // entries sudah kronologis → seri fokus langsung searah waktu
        engagementSeries: scores,
        gradeComparison,
      });
    })();
    return () => { cancelled = true; };
  }, [student, reportSessions, month, periodStart, periodEnd, report, billingMode, settings, totalHours]);

  return { reportData, prevAvgEngagement };
}
