/**
 * Logika generasi AI untuk laporan bulanan — narasi per sesi, ringkasan, dan
 * fallback gratis (tanpa AI). Dipecah dari MonthlyReport.tsx agar seluruh
 * logika AI berada di satu modul yang mudah dibaca (dan murah token).
 */

import { useCallback, useRef, useState } from "react";
import { generateReportSummary, generateNarratives } from "../../lib/aiClient";
import { buildReportAiInput } from "../../lib/reportSessionScope";
import { pickDirtyNarrativeSessions, reportSummaryFingerprint, sessionAiFingerprint } from "../../lib/aiIncremental";
import { normaliseAiPlan, cleanText, buildSessionNarrative, sessionSubjectLabel } from "./helpers";
import { applyAiNarrativeBatch, upsertReport, updateSession } from "../../db/repos";
import { periodLabel, monthLabel } from "../../lib/format";
import type { MonthlyReport, Session, Student, NextMonthPlan } from "../../db/types";

export interface ReportGenerationDeps {
  student?: Student;
  report?: MonthlyReport;
  reportSessions: readonly Session[];
  periodStart: string;
  periodEnd: string;
  month: string;
  prevAvgEngagement?: number;
  totalHours: number;
  avgEngagement?: number;
  ensureReport: () => Promise<MonthlyReport | undefined>;
  setMessage: (message: string) => void;
  setOpenNarasi: (open: boolean) => void;
  setOpenTeks: (open: boolean) => void;
  setOpenPlan: (open: boolean) => void;
}

export function useReportGeneration(deps: ReportGenerationDeps) {
  const [aiLoading, setAiLoading] = useState(false);
  const aiRequestRef = useRef(0);
  const [prevTexts, setPrevTexts] = useState<{
    summaryText: string;
    teacherNote?: string;
    quote?: string;
    nextMonthPlan?: NextMonthPlan;
    /** Narasi per sesi sebelum ditimpa AI — untuk Undo penuh. */
    narratives?: Array<{ id: string; narrative?: string }>;
  } | null>(null);

  /** Batalkan request AI yang sedang berjalan — dipanggil saat scope berganti. */
  const invalidateAiRequests = useCallback(() => {
    aiRequestRef.current += 1;
    setAiLoading(false);
  }, []);

  const handlePolish = async (force = false) => {
    const { student, reportSessions, prevAvgEngagement, periodStart, periodEnd, month, ensureReport, setMessage, setOpenTeks, setOpenPlan } = deps;
    if (!student || reportSessions.length === 0) return;
    if (!navigator.onLine) { setMessage("Offline."); return; }
    const requestId = ++aiRequestRef.current;
    const selectedSessions = reportSessions;
    setAiLoading(true);
    try {
      const draft = await ensureReport();
      if (!draft || requestId !== aiRequestRef.current) return;

      // Efisiensi: lewati AI bila sesi tidak berubah sejak ringkasan terakhir.
      // "force" dipakai untuk menulis ulang ringkasan walau tak ada perubahan.
      if (!force && draft.summaryHash !== undefined && draft.summaryText?.trim()) {
        const currentHash = reportSummaryFingerprint(draft, selectedSessions);
        if (currentHash === draft.summaryHash) {
          setMessage("Tidak ada perubahan sesi sejak ringkasan terakhir — dilewati. Centang 'Tulis ulang paksa' bila ingin regenerasi.");
          return;
        }
      }

      const out = await generateReportSummary(buildReportAiInput(
        student,
        periodLabel(periodStart, periodEnd) || monthLabel(month),
        selectedSessions,
        prevAvgEngagement,
      ));
      if (requestId !== aiRequestRef.current) return;
      const prev = { summaryText: draft.summaryText, quote: draft.quote, nextMonthPlan: draft.nextMonthPlan };
      const aiPlan = normaliseAiPlan(out.nextMonthPlan);
      await upsertReport({
        ...draft,
        summaryText: out.summary ?? "",
        quote: out.quote,
        nextMonthPlan: aiPlan ?? draft.nextMonthPlan,
        summaryHash: reportSummaryFingerprint(draft, selectedSessions),
      });
      if (requestId !== aiRequestRef.current) return;
      setPrevTexts(prev);
      setMessage("Poles AI selesai ✓ Ringkasan, kutipan & rencana depan terisi");
      setOpenTeks(true);
      setOpenPlan(true);
    } catch (e) {
      if (requestId === aiRequestRef.current) setMessage("Gagal: " + (e as Error).message);
    } finally {
      if (requestId === aiRequestRef.current) setAiLoading(false);
    }
  };
  /** Narasi AI penuh: perluas shortNote tiap sesi jadi narasi 40–60 kata,
   *  plus ringkasan, catatan guru, dan kutipan. Semua bisa di-Undo.
   *  Hanya sesi yang berubah (dirty) yang dikirim — hemat token AI. */
  const handleGenerateNarratives = async (force = false) => {
    const { student, reportSessions, prevAvgEngagement, periodStart, periodEnd, month, ensureReport, setMessage, setOpenNarasi, setOpenPlan } = deps;
    if (!student || reportSessions.length === 0) return;
    if (!navigator.onLine) { setMessage("Offline."); return; }
    const requestId = ++aiRequestRef.current;
    const selectedSessions = reportSessions;
    const { dirty } = pickDirtyNarrativeSessions(selectedSessions);
    const targetSessions = force ? selectedSessions : dirty;
    if (targetSessions.length === 0) {
      setMessage("Semua narasi sudah terbaru ✓ Centang 'Tulis ulang paksa' bila ingin regenerasi.");
      return;
    }
    const sentAll = targetSessions.length === selectedSessions.length;
    setAiLoading(true);
    try {
      const draft = await ensureReport();
      if (!draft || requestId !== aiRequestRef.current) return;
      const out = await generateNarratives(buildReportAiInput(
        student,
        periodLabel(periodStart, periodEnd) || monthLabel(month),
        targetSessions,
        prevAvgEngagement,
      ));
      if (requestId !== aiRequestRef.current) return;

      // Simpan versi lama SEBELUM menimpa — untuk Undo penuh
      const prevNarratives = targetSessions.map((s) => ({ id: s.id, narrative: s.narrative }));
      const sourceById = new Map(selectedSessions.map((s) => [s.id, s]));

      const validIds = new Set(targetSessions.map((s) => s.id));
      const updates: Array<{ id: string; narrative: string; aiNarrativeHash: number }> = [];
      for (const entry of out.entries ?? []) {
        if (validIds.has(entry.id) && entry.narrative?.trim()) {
          const source = sourceById.get(entry.id);
          if (source) updates.push({
            id: entry.id,
            narrative: entry.narrative.trim(),
            aiNarrativeHash: sessionAiFingerprint(source),
          });
        }
      }
      if (requestId !== aiRequestRef.current) return;
      // Ringkasan/kutipan hanya ditimpa bila SEMUA sesi ikut dikirim — bila
      // parsial, ringkasan lama dipertahankan (jangan meringkas data sebagian).
      const aiPlan = normaliseAiPlan(out.nextMonthPlan);
      await applyAiNarrativeBatch(draft, updates, sentAll ? {
        summaryText: out.summary.trim() || draft.summaryText,
        teacherNote: out.teacherNote?.trim() || draft.teacherNote,
        quote: out.quote?.trim() || draft.quote,
        nextMonthPlan: aiPlan ?? draft.nextMonthPlan,
      } : {});
      if (requestId !== aiRequestRef.current) return;
      setPrevTexts({
        summaryText: draft.summaryText, teacherNote: draft.teacherNote,
        quote: draft.quote, nextMonthPlan: draft.nextMonthPlan, narratives: prevNarratives,
      });
      setMessage(sentAll
        ? `Narasi AI selesai ✓ ${updates.length} narasi sesi + ringkasan & kutipan terisi`
        : `Narasi AI selesai ✓ ${updates.length}/${targetSessions.length} sesi berubah (${selectedSessions.length - targetSessions.length} dipertahankan). Ringkasan tidak diubah.`);
      setOpenNarasi(true);
      setOpenPlan(true);
    } catch (e) {
      if (requestId === aiRequestRef.current) setMessage("Gagal: " + (e as Error).message);
    } finally {
      if (requestId === aiRequestRef.current) setAiLoading(false);
    }
  };
  /** Generate narasi sesi GRATIS dari data yang sudah ada (tanpa AI). */
  const handleGenerateLocalNarratives = async () => {
    const { report, reportSessions, setMessage, setOpenNarasi } = deps;
    if (!report || reportSessions.length === 0) return;
    let applied = 0;
    for (const s of reportSessions) {
      if (s.narrative?.trim()) continue;
      const narrative = buildSessionNarrative(s, sessionSubjectLabel(s.subjects)).trim();
      if (narrative) {
        await updateSession(s.id, { narrative });
        applied++;
      }
    }
    setMessage(`⚡ ${applied} narasi sesi dibuat otomatis (gratis) ✓`);
    setOpenNarasi(true);
  };

  /** Generate ringkasan/catatan guru/kutipan GRATIS dari data sesi (tanpa AI). */
  const handleGenerateLocalTexts = async () => {
    const { student, report, reportSessions, totalHours, avgEngagement, periodStart, periodEnd, month, ensureReport, setMessage, setOpenTeks } = deps;
    if (!student || !report || reportSessions.length === 0) return;
    const draft = await ensureReport();
    if (!draft) return;

    const subjects = [...new Set(reportSessions.flatMap((s) => s.subjects.map((x) => x.trim()).filter(Boolean)))];
    const topics = reportSessions.map((s) => cleanText(s.topic)).filter(Boolean).slice(0, 3);
    const needs = reportSessions.map((s) => cleanText(s.needsWork)).filter(Boolean).slice(0, 3);
    const period = periodLabel(periodStart, periodEnd) || monthLabel(month);

    const summary = [
      `Periode ${period} berisi ${reportSessions.length} sesi (${totalHours} jam) untuk ${subjects.join(", ") || "materi yang dipelajari"}.`,
      topics.length > 0 ? `Topik yang dibahas antara lain ${topics.join(", ")}.` : undefined,
      avgEngagement != null ? `Rata-rata fokus ${avgEngagement}/10.` : undefined,
      needs.length > 0 ? `Area yang masih perlu perhatian: ${needs.join("; ")}.` : undefined,
    ].filter((line): line is string => Boolean(line)).join(" ");

    const teacherNote = [
      `Kemajuan terbesar terlihat dari konsistensi ${reportSessions.length} sesi pada periode ini.`,
      needs.length > 0 ? `Fokus berikutnya: ${needs[0]}.` : "Lanjutkan latihan topik yang sudah dibahas.",
    ].join(" ");

    const quote = `Terus semangat, ${student.name}! Setiap sesi membawa kamu selangkah lebih dekat ke targetmu.`;

    await upsertReport({
      ...draft,
      summaryText: draft.summaryText?.trim() || summary,
      teacherNote: draft.teacherNote?.trim() || teacherNote,
      quote: draft.quote?.trim() || quote,
    });
    setMessage("⚡ Teks laporan dibuat otomatis (gratis) ✓");
    setOpenTeks(true);
  };

  return {
    aiLoading,
    prevTexts,
    setPrevTexts,
    invalidateAiRequests,
    handlePolish,
    handleGenerateNarratives,
    handleGenerateLocalNarratives,
    handleGenerateLocalTexts,
  };
}
