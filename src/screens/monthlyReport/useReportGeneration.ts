/**
 * Logika generasi AI untuk laporan bulanan — narasi per sesi, ringkasan, dan
 * fallback gratis (tanpa AI). Dipecah dari MonthlyReport.tsx agar seluruh
 * logika AI berada di satu modul yang mudah dibaca (dan murah token).
 *
 * G3-05 butir 2: hook ini juga menyimpan **ringkasan hasil** putaran AI terakhir
 * (sesi yang berhasil, sesi yang gagal, keadaan panggilan ringkasan) supaya layar
 * bisa menampilkan daftarnya dan menawarkan "ulangi yang gagal". Ringkasan itu
 * sengaja TIDAK ikut dibersihkan saat cakupan laporan berpindah — ia melaporkan
 * apa yang sudah terjadi, bukan keadaan sementara layar.
 */

import { useCallback, useRef, useState } from "react";
import { chunkSessionsForAi, generateReportSummary, generateNarratives } from "../../lib/aiClient";
import { buildReportAiInput } from "../../lib/reportSessionScope";
import { pickDirtyNarrativeSessions, reportSummaryFingerprint, sessionAiFingerprint } from "../../lib/aiIncremental";
import { normaliseAiPlan, cleanText, buildSessionNarrative, sessionSubjectLabel } from "./helpers";
import { markAiFields, planContent } from "./aiFieldMarks";
import { applyAiNarrativeBatch, upsertReport, updateSession } from "../../db/repos";
import { periodLabel, monthLabel } from "../../lib/format";
import type { AiReportField, MonthlyReport, Session, Student, NextMonthPlan } from "../../db/types";

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

/** Satu sesi di dalam ringkasan hasil AI. */
export interface AiSessionOutcome {
  id: string;
  /** Label siap tampil, mis. "12 Sep — Matematika". */
  label: string;
}

/** Ringkasan satu putaran AI — dipakai panel hasil AI (G3-05 butir 2). */
export interface AiRunResult {
  ok: AiSessionOutcome[];
  failed: Array<AiSessionOutcome & { error: string }>;
  summary: { ok: boolean; error?: string };
  finishedAt: string;
}

/** Pesan jalan keluar lebih awal (G3-05 butir 4) — selalu menyebut langkah berikutnya. */
export const AI_OFFLINE_HINT =
  "Gagal: sedang tanpa jaringan, jadi AI belum bisa dipanggil. Pakai “Generate Narasi Gratis” dan "
  + "“Generate Teks Gratis” untuk mengisi laporan dari data sesi tanpa AI, lalu jalankan AI setelah tersambung.";

export const AI_NO_SESSION_HINT =
  "Gagal: belum ada sesi di periode ini. Catat sesi dulu atau pilih periode/murid lain, lalu jalankan AI lagi.";

function sessionLabel(session: Session): string {
  return `${session.date} — ${sessionSubjectLabel(session.subjects)}`;
}

export function useReportGeneration(deps: ReportGenerationDeps) {
  const [aiLoading, setAiLoading] = useState(false);
  /** Progres tombol "Isi Semua dengan AI" — batch narasi yang sedang diproses. */
  const [aiProgress, setAiProgress] = useState<{ done: number; total: number; step: string } | null>(null);
  /** Hasil putaran AI terakhir: siapa berhasil, siapa gagal, ringkasan jadi atau tidak. */
  const [aiResult, setAiResult] = useState<AiRunResult | null>(null);
  const aiRequestRef = useRef(0);
  const [prevTexts, setPrevTexts] = useState<{
    summaryText: string;
    teacherNote?: string;
    quote?: string;
    nextMonthPlan?: NextMonthPlan;
    /** Narasi per sesi sebelum ditimpa AI — untuk Undo penuh. */
    narratives?: Array<{ id: string; narrative?: string }>;
  } | null>(null);

  /** Batalkan request AI yang sedang berjalan — dipanggil saat scope berganti.
   *  Ringkasan hasil AI sengaja TIDAK dihapus di sini (G3-05 butir 2). */
  const invalidateAiRequests = useCallback(() => {
    aiRequestRef.current += 1;
    setAiLoading(false);
    setAiProgress(null);
  }, []);

  const clearAiResult = useCallback(() => setAiResult(null), []);

  const handlePolish = async (force = false) => {
    const { student, reportSessions, prevAvgEngagement, periodStart, periodEnd, month, ensureReport, setMessage, setOpenTeks, setOpenPlan } = deps;
    if (!student) return;
    if (reportSessions.length === 0) { setMessage(AI_NO_SESSION_HINT); return; }
    if (!navigator.onLine) { setMessage(AI_OFFLINE_HINT); return; }
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
      // Penanda "dibuat AI" per isian: hanya untuk isian yang benar-benar diisi AI.
      const written: Partial<Record<AiReportField, string>> = {};
      if (out.summary?.trim()) written.summaryText = out.summary.trim();
      if (out.quote?.trim()) written.quote = out.quote.trim();
      if (aiPlan) written.nextMonthPlan = planContent(aiPlan);
      await upsertReport({
        ...draft,
        summaryText: out.summary ?? "",
        quote: out.quote,
        nextMonthPlan: aiPlan ?? draft.nextMonthPlan,
        summaryHash: reportSummaryFingerprint(draft, selectedSessions),
        aiFieldHashes: markAiFields(draft.aiFieldHashes, written),
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
    if (!student) return;
    if (reportSessions.length === 0) { setMessage(AI_NO_SESSION_HINT); return; }
    if (!navigator.onLine) { setMessage(AI_OFFLINE_HINT); return; }
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
      const written: Partial<Record<AiReportField, string>> = {};
      if (out.summary?.trim()) written.summaryText = out.summary.trim();
      if (out.teacherNote?.trim()) written.teacherNote = out.teacherNote.trim();
      if (out.quote?.trim()) written.quote = out.quote.trim();
      if (aiPlan) written.nextMonthPlan = planContent(aiPlan);
      await applyAiNarrativeBatch(draft, updates, sentAll ? {
        summaryText: out.summary.trim() || draft.summaryText,
        teacherNote: out.teacherNote?.trim() || draft.teacherNote,
        quote: out.quote?.trim() || draft.quote,
        nextMonthPlan: aiPlan ?? draft.nextMonthPlan,
        aiFieldHashes: markAiFields(draft.aiFieldHashes, written),
      } : {});
      if (requestId !== aiRequestRef.current) return;
      setPrevTexts({
        summaryText: draft.summaryText, teacherNote: draft.teacherNote,
        quote: draft.quote, nextMonthPlan: draft.nextMonthPlan, narratives: prevNarratives,
      });
      setAiResult({
        ok: updates.map((update) => ({ id: update.id, label: sessionLabel(sourceById.get(update.id)!) })),
        failed: targetSessions
          .filter((session) => !updates.some((update) => update.id === session.id))
          .map((session) => ({ id: session.id, label: sessionLabel(session), error: "AI tidak mengembalikan narasi untuk sesi ini" })),
        summary: { ok: true },
        finishedAt: new Date().toISOString(),
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
  /**
   * Inti "Isi Semua dengan AI" untuk sekumpulan sesi tertentu.
   *  - Narasi sesi dikirim per batch kecil (maks 8 sesi / ~12rb karakter) dan
   *    diproses BERURUTAN, supaya konteks tiap panggilan tetap kecil dan tidak
   *    lagi gagal dengan "Respons AI terpotong karena batas token".
   *  - Batch yang sukses langsung disimpan; batch yang gagal dilewati tanpa
   *    membatalkan batch lain, dan sesinya dicatat untuk "ulangi yang gagal".
   *  - Terakhir SATU panggilan ringkasan memakai seluruh sesi (konteks kecil,
   *    tanpa narasi per sesi) untuk summary, kutipan, dan rencana depan. */
  const runAiForSessions = async (
    requested: readonly Session[],
    opts: { withSummary: boolean },
  ) => {
    const { student, reportSessions, prevAvgEngagement, periodStart, periodEnd, month, ensureReport, setMessage, setOpenNarasi, setOpenTeks, setOpenPlan } = deps;
    if (!student) return;
    if (reportSessions.length === 0) { setMessage(AI_NO_SESSION_HINT); return; }
    if (!navigator.onLine) { setMessage(AI_OFFLINE_HINT); return; }
    const requestId = ++aiRequestRef.current;
    const selectedSessions = reportSessions;
    // Hanya sesi yang masih ada di cakupan sekarang yang boleh dikirim.
    const inScope = new Set(selectedSessions.map((session) => session.id));
    const targetSessions = requested.filter((session) => inScope.has(session.id));
    const batches = chunkSessionsForAi(targetSessions);
    setAiLoading(true);
    setAiProgress({
      done: 0,
      total: targetSessions.length,
      step: targetSessions.length === 0 ? "Menyusun ringkasan…" : `Narasi 0/${targetSessions.length} sesi…`,
    });
    const okSessions: AiSessionOutcome[] = [];
    const failedSessions: Array<AiSessionOutcome & { error: string }> = [];
    let narrativeSuccess = 0;
    let failedBatches = 0;
    let firstError: string | undefined;
    let summaryError: string | undefined;
    let summaryOk = false;
    try {
      const draft = await ensureReport();
      if (!draft || requestId !== aiRequestRef.current) return;
      // Snapshot untuk Undo — diambil SEBELUM ada field yang ditimpa.
      const prevReport = {
        summaryText: draft.summaryText,
        teacherNote: draft.teacherNote,
        quote: draft.quote,
        nextMonthPlan: draft.nextMonthPlan,
      };
      const period = periodLabel(periodStart, periodEnd) || monthLabel(month);
      const sourceById = new Map(selectedSessions.map((s) => [s.id, s]));
      const prevNarratives: Array<{ id: string; narrative?: string }> = [];
      const overwritten = new Set<string>();
      let processed = 0;
      // Field laporan yang hanya boleh dipercaya bila batch itu memuat SEMUA sesi
      // (kalau sebagian, ringkasan/catatan guru akan menilai data sepotong).
      let batchTeacherNote: string | undefined;
      let batchQuote: string | undefined;
      let batchPlan: ReturnType<typeof normaliseAiPlan>;

      // Narasi per batch — berurutan, satu panggilan AI per batch.
      for (const batch of batches) {
        if (requestId !== aiRequestRef.current) return;
        setAiProgress({ done: processed, total: targetSessions.length, step: `Narasi ${processed}/${targetSessions.length} sesi…` });
        try {
          const out = await generateNarratives(buildReportAiInput(student, period, batch, prevAvgEngagement));
          if (requestId !== aiRequestRef.current) return;
          const validIds = new Set(batch.map((s) => s.id));
          const updates: Array<{ id: string; narrative: string; aiNarrativeHash: number }> = [];
          for (const entry of out.entries ?? []) {
            if (!validIds.has(entry.id) || !entry.narrative?.trim()) continue;
            const source = sourceById.get(entry.id);
            if (!source) continue;
            updates.push({
              id: entry.id,
              narrative: entry.narrative.trim(),
              aiNarrativeHash: sessionAiFingerprint(source),
            });
          }
          // Simpan batch ini sekarang juga — kegagalan batch lain tidak menghapus hasil ini.
          await applyAiNarrativeBatch(draft, updates, {});
          if (requestId !== aiRequestRef.current) return;
          // Catatan guru/kutipan/rencana dari batch ini dipakai HANYA bila batch
          // memuat seluruh sesi (batch tunggal penuh) — sama seperti perilaku
          // lama yang menulis field laporan dari panggilan narasi penuh.
          if (batch.length === selectedSessions.length) {
            batchTeacherNote = out.teacherNote?.trim() || batchTeacherNote;
            batchQuote = out.quote?.trim() || batchQuote;
            batchPlan = normaliseAiPlan(out.nextMonthPlan) ?? batchPlan;
          }
          const updatedIds = new Set(updates.map((update) => update.id));
          for (const update of updates) {
            if (overwritten.has(update.id)) continue;
            overwritten.add(update.id);
            prevNarratives.push({ id: update.id, narrative: sourceById.get(update.id)?.narrative });
          }
          for (const session of batch) {
            const label = sessionLabel(session);
            if (updatedIds.has(session.id)) {
              okSessions.push({ id: session.id, label });
            } else {
              failedSessions.push({ id: session.id, label, error: "AI tidak mengembalikan narasi untuk sesi ini" });
            }
          }
          narrativeSuccess += updates.length;
        } catch (e) {
          // Batch gagal tidak membatalkan sisanya — catat error pertama lalu lanjut.
          failedBatches += 1;
          if (!firstError) firstError = (e as Error).message;
          const error = (e as Error).message;
          for (const session of batch) {
            failedSessions.push({ id: session.id, label: sessionLabel(session), error });
          }
        }
        processed += batch.length;
      }

      // Satu panggilan ringkasan atas SELURUH sesi (bukan per batch) untuk
      // ringkasan, CATATAN GURU, kutipan, dan rencana depan.
      let summaryText: string | undefined;
      let teacherNote: string | undefined;
      let quote: string | undefined;
      let plan: ReturnType<typeof normaliseAiPlan>;
      if (opts.withSummary) {
        setAiProgress({ done: targetSessions.length, total: targetSessions.length, step: "Menyusun ringkasan…" });
        try {
          const out = await generateReportSummary(buildReportAiInput(student, period, selectedSessions, prevAvgEngagement));
          if (requestId !== aiRequestRef.current) return;
          summaryText = out.summary ?? "";
          teacherNote = out.teacherNote?.trim() || undefined;
          quote = out.quote?.trim() || undefined;
          plan = normaliseAiPlan(out.nextMonthPlan);
          summaryOk = true;
        } catch (e) {
          summaryError = (e as Error).message;
        }
      }

      // Tulis field laporan SEKALI saja — dengan cadangan dari batch penuh bila
      // panggilan ringkasan gagal, supaya "Catatan Guru"/"Rencana Depan" tidak
      // pernah kosong hanya karena satu panggilan gagal.
      const finalTeacherNote = teacherNote ?? batchTeacherNote;
      const finalQuote = quote ?? batchQuote;
      const finalPlan = plan ?? batchPlan;
      // Penanda per isian hanya untuk isian yang benar-benar diisi AI.
      const written: Partial<Record<AiReportField, string>> = {};
      if (summaryText?.trim()) written.summaryText = summaryText.trim();
      if (finalTeacherNote) written.teacherNote = finalTeacherNote;
      if (finalQuote) written.quote = finalQuote;
      if (finalPlan) written.nextMonthPlan = planContent(finalPlan);
      if (requestId !== aiRequestRef.current) return;
      if (Object.keys(written).length > 0 || summaryOk) {
        await upsertReport({
          ...draft,
          summaryText: summaryText?.trim() || draft.summaryText,
          teacherNote: finalTeacherNote ?? draft.teacherNote,
          quote: finalQuote ?? draft.quote,
          nextMonthPlan: finalPlan ?? draft.nextMonthPlan,
          ...(summaryOk ? { summaryHash: reportSummaryFingerprint(draft, selectedSessions) } : {}),
          aiFieldHashes: markAiFields(draft.aiFieldHashes, written),
        });
      }
      if (requestId !== aiRequestRef.current) return;
      if (finalTeacherNote || finalQuote || finalPlan) setOpenPlan(true);
      setAiResult({
        ok: okSessions,
        failed: failedSessions,
        summary: summaryOk ? { ok: true } : { ok: false, error: summaryError ?? "ringkasan tidak dijalankan" },
        finishedAt: new Date().toISOString(),
      });

      if (narrativeSuccess === 0 && !summaryOk) {
        setMessage("Gagal: " + (firstError ?? summaryError ?? "tidak ada hasil AI yang bisa disimpan."));
        return;
      }
      // Undo penuh tetap bekerja lewat tombol "↩ Undo Hasil AI" yang sudah ada.
      setPrevTexts({ ...prevReport, narratives: prevNarratives });
      if (narrativeSuccess === 0 && batches.length === 0) {
        setMessage(`Semua ${selectedSessions.length} narasi sudah terbaru ✓ Ringkasan, catatan guru & rencana depan terisi`);
      } else if (failedBatches === 0 && summaryOk) {
        setMessage(`Isi AI selesai ✓ ${narrativeSuccess} narasi + ringkasan, catatan guru & rencana depan terisi`);
      } else {
        const parts = [`${narrativeSuccess} narasi tersimpan`];
        if (failedBatches > 0) parts.push(`${failedBatches} batch gagal (${firstError}) dan dilewati`);
        parts.push(summaryOk
          ? "ringkasan, catatan guru & rencana depan terisi"
          : `ringkasan gagal (${summaryError})${batchTeacherNote ? " — catatan guru dari batch tetap disimpan" : ""}`);
        setMessage(`Isi AI sebagian ✓ ${parts.join(" · ")}`);
      }
      if (narrativeSuccess > 0) setOpenNarasi(true);
      if (summaryOk) { setOpenTeks(true); setOpenPlan(true); }
    } catch (e) {
      if (requestId === aiRequestRef.current) setMessage("Gagal: " + (e as Error).message);
    } finally {
      if (requestId === aiRequestRef.current) {
        setAiLoading(false);
        setAiProgress(null);
      }
    }
  };

  /** SATU tombol AI: isi semua isian laporan (narasi + teks + rencana). */
  const handleGenerateAll = async (force = false) => {
    const selectedSessions = deps.reportSessions;
    const { dirty } = pickDirtyNarrativeSessions(selectedSessions);
    await runAiForSessions(force ? selectedSessions : dirty, { withSummary: true });
  };

  /** Sesi yang gagal pada putaran AI terakhir dan masih ada di cakupan sekarang. */
  const pickFailedSessions = useCallback(
    () => {
      const failedIds = new Set((aiResult?.failed ?? []).map((item) => item.id));
      return deps.reportSessions.filter((session) => failedIds.has(session.id));
    },
    [aiResult, deps.reportSessions],
  );

  /** Ulangi hanya sesi yang gagal; ringkasan diulang bila panggilan ringkasan ikut gagal. */
  const retryFailedAi = async () => {
    const targets = pickFailedSessions();
    if (targets.length === 0) {
      setAiResult(null);
      deps.setMessage("Tidak ada sesi gagal yang masih ada di periode ini — jalankan “Isi Semua dengan AI” untuk mencoba dari awal.");
      return;
    }
    await runAiForSessions(targets, { withSummary: aiResult?.summary.ok === false });
  };

  /** Generate narasi sesi GRATIS dari data yang sudah ada (tanpa AI). */
  const handleGenerateLocalNarratives = async () => {
    const { report, reportSessions, setMessage, setOpenNarasi } = deps;
    if (!report) { setMessage("Gagal: buat laporan dulu untuk periode ini, lalu jalankan lagi."); return; }
    if (reportSessions.length === 0) { setMessage(AI_NO_SESSION_HINT); return; }
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
    if (!student) return;
    if (!report) { setMessage("Gagal: buat laporan dulu untuk periode ini, lalu jalankan lagi."); return; }
    if (reportSessions.length === 0) { setMessage(AI_NO_SESSION_HINT); return; }
    const draft = await ensureReport();
    if (!draft) return;

    const subjects = [...new Set(reportSessions.flatMap((s) => s.subjects.map((x) => x.trim()).filter(Boolean)))];
    const topics = reportSessions.map((s) => cleanText(s.topic)).filter(Boolean).slice(0, 3);
    const needs = reportSessions.map((s) => cleanText(s.needsWork)).filter(Boolean).slice(0, 3);
    const period = periodLabel(periodStart, periodEnd) || monthLabel(month);

    const summary = [
      `Periode ${period} berisi ${reportSessions.length} sesi (${totalHours} jam) untuk ${subjects.join(", ") || "materi yang dipelajari"}.`,
      topics.length > 0 ? `Topik yang dibahas antara lain ${topics.join(", ")}.` : undefined,
      avgEngagement != null ? `Fokus rata-rata ${avgEngagement}/10.` : undefined,
      needs.length > 0 ? `Area yang masih perlu perhatian: ${needs.join("; ")}.` : undefined,
    ].filter((line): line is string => Boolean(line)).join(" ");

    const teacherNote = [
      `Kemajuan terbesar terlihat dari konsistensi ${reportSessions.length} sesi pada periode ini.`,
      needs.length > 0 ? `Fokus berikutnya: ${needs[0]}.` : "Lanjutkan latihan topik yang sudah dibahas.",
    ].join(" ");

    const quote = `Terus semangat, ${student.name}! Setiap sesi membawa kamu selangkah lebih dekat ke targetmu.`;

    // Teks gratis BUKAN tulisan AI: tidak ada penanda "dibuat AI" di sini.
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
    aiProgress,
    aiResult,
    clearAiResult,
    prevTexts,
    setPrevTexts,
    invalidateAiRequests,
    handlePolish,
    handleGenerateNarratives,
    handleGenerateAll,
    pickFailedSessions,
    retryFailedAi,
    handleGenerateLocalNarratives,
    handleGenerateLocalTexts,
  };
}
