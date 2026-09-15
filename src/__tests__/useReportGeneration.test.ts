import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MonthlyReport, Session, Student } from "../db/types";

const generateNarrativesMock = vi.hoisted(() => vi.fn());
const applyAiNarrativeBatchMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/aiClient", () => ({
  generateNarratives: generateNarrativesMock,
  generateReportSummary: vi.fn(),
}));
vi.mock("../db/repos", () => ({
  applyAiNarrativeBatch: applyAiNarrativeBatchMock,
  upsertReport: vi.fn(),
  updateSession: vi.fn(),
}));

import { useReportGeneration, type ReportGenerationDeps } from "../screens/monthlyReport/useReportGeneration";

type Hook = ReturnType<typeof useReportGeneration>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const student: Student = {
  id: "student-1", name: "Murid", level: "SMA", subjects: ["Matematika"],
  parentContact: { name: "Orang Tua", phone: "08123456789" }, hourlyRate: 100_000,
  active: true, enrolledAt: "2026-01-01",
};

function makeSession(): Session {
  return {
    id: "session-1", studentId: student.id, date: "2026-09-10", durationHours: 1,
    subjects: ["Matematika"], shortNote: "Latihan aljabar", narrative: "Narasi lama",
    aiNarrativeHash: 123, status: "DONE", rateSnapshot: 100_000, cost: 100_000,
    createdAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T00:00:00.000Z",
  };
}

function makeReport(): MonthlyReport {
  return {
    id: "report-1", studentId: student.id, month: "2026-09",
    periodStart: "2026-09-01", periodEnd: "2026-09-30", sessionIds: ["session-1"],
    templateKey: { themeId: "classic", layoutId: "standard" }, summaryText: "Ringkasan lama",
    teacherNote: "Catatan lama", quote: "Kutipan lama", totalHours: 1, totalCost: 100_000,
    createdAt: "2026-09-10T00:00:00.000Z",
  };
}

function renderHook(deps: ReportGenerationDeps): Hook {
  let hook: Hook | undefined;
  function Probe() {
    hook = useReportGeneration(deps);
    return null;
  }
  renderToStaticMarkup(createElement(Probe));
  if (!hook) throw new Error("Hook tidak ter-render");
  return hook;
}

function makeDeps(session: Session, report: MonthlyReport, messages: string[]): ReportGenerationDeps {
  return {
    student, report, reportSessions: [session], periodStart: report.periodStart,
    periodEnd: report.periodEnd, month: report.month, totalHours: 1, avgEngagement: 8,
    ensureReport: vi.fn().mockResolvedValue(report), setMessage: (message) => messages.push(message),
    setOpenNarasi: vi.fn(), setOpenTeks: vi.fn(), setOpenPlan: vi.fn(),
  };
}

describe("useReportGeneration resilience", () => {
  beforeEach(() => {
    generateNarrativesMock.mockReset();
    applyAiNarrativeBatchMock.mockReset();
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("respons gagal tidak mengubah narasi atau fingerprint lama; retry sukses baru menulis", async () => {
    const session = makeSession();
    const report = makeReport();
    const messages: string[] = [];
    const hook = renderHook(makeDeps(session, report, messages));

    generateNarrativesMock.mockRejectedValueOnce(new Error("AI timeout"));
    await hook.handleGenerateNarratives(true);

    expect(applyAiNarrativeBatchMock).not.toHaveBeenCalled();
    expect(session).toMatchObject({ narrative: "Narasi lama", aiNarrativeHash: 123 });
    expect(report).toMatchObject({ summaryText: "Ringkasan lama", teacherNote: "Catatan lama", quote: "Kutipan lama" });
    expect(messages.at(-1)).toBe("Gagal: AI timeout");

    generateNarrativesMock.mockResolvedValueOnce({
      entries: [{ id: session.id, narrative: "Narasi baru dari AI" }],
      summary: "Ringkasan baru", teacherNote: "Catatan baru", quote: "Kutipan baru",
    });
    applyAiNarrativeBatchMock.mockImplementation(async (_draft, updates, reportPatch) => {
      Object.assign(session, updates[0]);
      Object.assign(report, reportPatch);
    });
    await hook.handleGenerateNarratives(true);

    expect(session.narrative).toBe("Narasi baru dari AI");
    expect(session.aiNarrativeHash).not.toBe(123);
    expect(report).toMatchObject({ summaryText: "Ringkasan baru", teacherNote: "Catatan baru", quote: "Kutipan baru" });
  });

  it("mengabaikan respons terlambat setelah request diinvalidasi karena scope berubah", async () => {
    const session = makeSession();
    const report = makeReport();
    const pending = deferred<{ entries: Array<{ id: string; narrative: string }>; summary: string }>();
    generateNarrativesMock.mockReturnValueOnce(pending.promise);
    const hook = renderHook(makeDeps(session, report, []));

    const request = hook.handleGenerateNarratives(true);
    hook.invalidateAiRequests();
    pending.resolve({ entries: [{ id: session.id, narrative: "Respons lama" }], summary: "Ringkasan lama yang terlambat" });
    await request;

    expect(applyAiNarrativeBatchMock).not.toHaveBeenCalled();
    expect(session).toMatchObject({ narrative: "Narasi lama", aiNarrativeHash: 123 });
    expect(report.summaryText).toBe("Ringkasan lama");
  });
});
