import { describe, expect, it } from "vitest";
import {
  pickDirtyNarrativeSessions,
  reportSummaryFingerprint,
  sessionAiFingerprint,
} from "../lib/aiIncremental";
import type { MonthlyReport, Session } from "../db/types";

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "s1",
    studentId: "stu1",
    date: "2026-08-01",
    durationHours: 1,
    subjects: ["Matematika"],
    shortNote: "latihan fungsi kuadrat",
    status: "DONE",
    rateSnapshot: 100_000,
    cost: 100_000,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    ...overrides,
  };
}

function makeReport(overrides: Partial<MonthlyReport> = {}): MonthlyReport {
  return {
    id: "r1",
    studentId: "stu1",
    month: "2026-08",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    sessionIds: ["s1"],
    templateKey: { themeId: "winter", layoutId: "cards" },
    summaryText: "",
    totalHours: 1,
    totalCost: 100_000,
    createdAt: "2026-08-31T10:00:00.000Z",
    ...overrides,
  };
}

describe("sessionAiFingerprint", () => {
  it("stabil untuk sesi dengan konten yang sama", () => {
    expect(sessionAiFingerprint(makeSession())).toBe(sessionAiFingerprint(makeSession()));
  });

  it("berubah saat shortNote berubah", () => {
    const a = makeSession({ shortNote: "aaa" });
    const b = makeSession({ shortNote: "bbb" });
    expect(sessionAiFingerprint(a)).not.toBe(sessionAiFingerprint(b));
  });

  it("berubah saat predictedGrade / actualGrade berubah", () => {
    const base = makeSession({ predictedGrade: "6", actualGrade: "7" });
    expect(sessionAiFingerprint(base)).not.toBe(
      sessionAiFingerprint(makeSession({ predictedGrade: "6", actualGrade: "5" })),
    );
  });

  it("tidak berubah saat field non-AI berubah (cost/rateSnapshot)", () => {
    const a = makeSession();
    const b = makeSession({ cost: 999_999, rateSnapshot: 1 });
    expect(sessionAiFingerprint(a)).toBe(sessionAiFingerprint(b));
  });
});

describe("pickDirtyNarrativeSessions", () => {
  it("semua sesi tanpa narasi dianggap dirty", () => {
    const sessions = [makeSession({ id: "s1" }), makeSession({ id: "s2" })];
    const { dirty, cleanCount } = pickDirtyNarrativeSessions(sessions);
    expect(dirty).toHaveLength(2);
    expect(cleanCount).toBe(0);
  });

  it("narasi tanpa hash (legacy/manual) dianggap bersih — tidak ditimpa", () => {
    const sessions = [makeSession({ id: "s1", narrative: "sudah ada" })];
    expect(pickDirtyNarrativeSessions(sessions).dirty).toHaveLength(0);
  });

  it("hash berubah → dirty", () => {
    const staleHash = sessionAiFingerprint(makeSession({ shortNote: "versi lama" }));
    const sessions = [makeSession({ id: "s1", narrative: "sudah", aiNarrativeHash: staleHash })];
    expect(pickDirtyNarrativeSessions(sessions).dirty).toHaveLength(1);
  });

  it("hash sama → bersih", () => {
    const base = makeSession({ narrative: "sudah" });
    const sessions = [{ ...base, aiNarrativeHash: sessionAiFingerprint(base) }];
    expect(pickDirtyNarrativeSessions(sessions).dirty).toHaveLength(0);
  });

  it("campuran dirty dan bersih dihitung benar", () => {
    const clean = makeSession({ id: "s1", narrative: "sudah" });
    clean.aiNarrativeHash = sessionAiFingerprint(clean);
    const dirty = makeSession({ id: "s2" });
    const { dirty: dirtyList, cleanCount } = pickDirtyNarrativeSessions([clean, dirty]);
    expect(dirtyList.map((s) => s.id)).toEqual(["s2"]);
    expect(cleanCount).toBe(1);
  });
});

describe("reportSummaryFingerprint", () => {
  it("stabil untuk report + sesi yang sama", () => {
    const report = makeReport();
    const sessions = [makeSession()];
    expect(reportSummaryFingerprint(report, sessions)).toBe(reportSummaryFingerprint(report, sessions));
  });

  it("berubah saat salah satu sesi berubah", () => {
    const report = makeReport();
    const a = [makeSession({ shortNote: "aaa" })];
    const b = [makeSession({ shortNote: "bbb" })];
    expect(reportSummaryFingerprint(report, a)).not.toBe(reportSummaryFingerprint(report, b));
  });
});
