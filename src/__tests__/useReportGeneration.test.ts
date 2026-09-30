import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MonthlyReport, Session, Student } from "../db/types";

const generateNarrativesMock = vi.hoisted(() => vi.fn());
const generateReportSummaryMock = vi.hoisted(() => vi.fn());
const applyAiNarrativeBatchMock = vi.hoisted(() => vi.fn());
const upsertReportMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/aiClient", async (importOriginal) => {
  // Chunker asli dipakai agar test menguji pemecahan batch yang sebenarnya.
  const actual = await importOriginal<typeof import("../lib/aiClient")>();
  return {
    ...actual,
    generateNarratives: generateNarrativesMock,
    generateReportSummary: generateReportSummaryMock,
  };
});
vi.mock("../db/repos", () => ({
  getSettings: vi.fn(),
  applyAiNarrativeBatch: applyAiNarrativeBatchMock,
  upsertReport: upsertReportMock,
  updateSession: vi.fn(),
}));

import { AI_BATCH_MAX_SESSIONS } from "../lib/aiClient";
import { sessionAiFingerprint } from "../lib/aiIncremental";
import { useReportGeneration, type ReportGenerationDeps } from "../screens/monthlyReport/useReportGeneration";

type Hook = ReturnType<typeof useReportGeneration>;
/** Bentuk input yang diterima generateNarratives (dipakai untuk inspeksi mock). */
type NarrativesInput = { sessions: Array<{ id: string; shortNote: string }> };

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

/** Sesi tanpa narasi → semuanya dirty (belum pernah dibuat AI). */
function makeDirtySessions(count: number): Session[] {
  return Array.from({ length: count }, (_, index) => ({
    ...makeSession(),
    id: `session-${index + 1}`,
    date: `2026-09-${String((index % 28) + 1).padStart(2, "0")}`,
    shortNote: `Latihan sesi ${index + 1}`,
    narrative: undefined,
    aiNarrativeHash: undefined,
  }));
}

function makeDepsFor(sessions: Session[], report: MonthlyReport, messages: string[]): ReportGenerationDeps {
  return {
    ...makeDeps(sessions[0], report, messages),
    report,
    reportSessions: sessions,
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
    generateReportSummaryMock.mockReset();
    applyAiNarrativeBatchMock.mockReset();
    upsertReportMock.mockReset();
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

describe("handleGenerateAll (satu tombol AI)", () => {
  beforeEach(() => {
    generateNarrativesMock.mockReset();
    generateReportSummaryMock.mockReset();
    applyAiNarrativeBatchMock.mockReset();
    upsertReportMock.mockReset();
    applyAiNarrativeBatchMock.mockResolvedValue(undefined);
    upsertReportMock.mockResolvedValue("report-1");
    vi.stubGlobal("navigator", { onLine: true });
  });

  function echoBatch(input: NarrativesInput) {
    return {
      entries: input.sessions.map((session) => ({ id: session.id, narrative: `Narasi ${session.id}` })),
      summary: "Ringkasan batch",
    };
  }

  it("memecah sesi jadi batch kecil dan memanggil AI berurutan, bukan sekali untuk semua sesi", async () => {
    const sessions = makeDirtySessions(19);
    const report = makeReport();
    const messages: string[] = [];
    const hook = renderHook(makeDepsFor(sessions, report, messages));
    generateNarrativesMock.mockImplementation(async (input: NarrativesInput) => echoBatch(input));
    generateReportSummaryMock.mockResolvedValue({ summary: "Ringkasan baru", quote: "Kutipan baru" });

    await hook.handleGenerateAll();

    const batchInputs = generateNarrativesMock.mock.calls.map((call) => call[0] as NarrativesInput);
    expect(batchInputs.length).toBeGreaterThan(1);
    for (const input of batchInputs) {
      expect(input.sessions.length).toBeLessThanOrEqual(AI_BATCH_MAX_SESSIONS);
      expect(input.sessions.length).toBeLessThan(sessions.length);
    }
    expect(batchInputs.map((input) => input.sessions.length)).toEqual([8, 8, 3]);
    // Setiap batch sukses disimpan langsung — tidak menunggu akhir.
    expect(applyAiNarrativeBatchMock).toHaveBeenCalledTimes(batchInputs.length);
    expect(applyAiNarrativeBatchMock.mock.calls[0][1]).toHaveLength(8);
    // Ringkasan tetap satu panggilan kecil atas SELURUH sesi.
    expect(generateReportSummaryMock).toHaveBeenCalledTimes(1);
    expect((generateReportSummaryMock.mock.calls[0][0] as NarrativesInput).sessions).toHaveLength(19);
    expect(messages.at(-1)).toBe("Isi AI selesai ✓ 19 narasi + ringkasan & rencana depan terisi");
  });

  it("batch tengah yang gagal tidak menghapus batch yang sudah tersimpan", async () => {
    const sessions = makeDirtySessions(19);
    const report = makeReport();
    const messages: string[] = [];
    const hook = renderHook(makeDepsFor(sessions, report, messages));
    let call = 0;
    generateNarrativesMock.mockImplementation(async (input: NarrativesInput) => {
      call += 1;
      if (call === 2) throw new Error("AI timeout di batch 2");
      return echoBatch(input);
    });
    generateReportSummaryMock.mockResolvedValue({ summary: "Ringkasan baru", quote: "Kutipan baru" });

    await hook.handleGenerateAll();

    expect(generateNarrativesMock).toHaveBeenCalledTimes(3);
    // Batch 1 (8 sesi) dan batch 3 (3 sesi) tetap tersimpan.
    expect(applyAiNarrativeBatchMock).toHaveBeenCalledTimes(2);
    expect(applyAiNarrativeBatchMock.mock.calls[0][1]).toHaveLength(8);
    expect(applyAiNarrativeBatchMock.mock.calls[1][1]).toHaveLength(3);
    expect(messages.at(-1)).toContain("11 narasi tersimpan");
    expect(messages.at(-1)).toContain("1 batch gagal (AI timeout di batch 2)");
    expect(messages.at(-1)).toContain("ringkasan & rencana depan terisi");
  });

  it("tetap menulis ringkasan walau semua narasi sudah terbaru", async () => {
    const session = makeSession();
    session.narrative = "Narasi final";
    session.aiNarrativeHash = sessionAiFingerprint(session);
    const report = makeReport();
    const messages: string[] = [];
    const hook = renderHook(makeDepsFor([session], report, messages));
    generateReportSummaryMock.mockResolvedValue({ summary: "Ringkasan baru", quote: "Kutipan baru" });

    await hook.handleGenerateAll();

    expect(generateNarrativesMock).not.toHaveBeenCalled();
    expect(applyAiNarrativeBatchMock).not.toHaveBeenCalled();
    expect(upsertReportMock).toHaveBeenCalledTimes(1);
    expect(upsertReportMock.mock.calls[0][0]).toMatchObject({
      summaryText: "Ringkasan baru", quote: "Kutipan baru",
      summaryHash: expect.any(Number),
    });
    expect(messages.at(-1)).toContain("sudah terbaru");
  });
});
