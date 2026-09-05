import { db } from "../db";
import type { MonthlyReport } from "../types";

export interface AiNarrativeUpdate {
  id: string;
  narrative: string;
  aiNarrativeHash: number;
}

/** Apply a validated AI batch atomically; callers must validate before entering this transaction. */
export async function applyAiNarrativeBatch(
  report: MonthlyReport,
  narratives: AiNarrativeUpdate[],
  reportPatch: Partial<Pick<MonthlyReport, "summaryText" | "teacherNote" | "quote" | "nextMonthPlan">>,
): Promise<void> {
  await db.transaction("rw", db.students, db.sessions, db.reports, db.payments, async () => {
    const sessions = await db.sessions.bulkGet(narratives.map((item) => item.id));
    if (sessions.some((session) => !session)) throw new Error("Sesi untuk respons AI tidak ditemukan.");
    const currentReport = await db.reports.get(report.id);
    if (!currentReport) throw new Error("Laporan untuk respons AI tidak ditemukan.");
    for (const item of narratives) {
      await db.sessions.update(item.id, {
        narrative: item.narrative,
        aiNarrativeHash: item.aiNarrativeHash,
      });
    }
    await db.reports.update(report.id, reportPatch);
  });
}