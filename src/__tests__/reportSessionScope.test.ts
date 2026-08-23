import { describe, expect, it } from "vitest";
import type { Session } from "../db/types";
import {
  buildReportAiInput,
  findBlockingReportOverlap,
  currentPackageSessionRange,
  resolveReportMutationTarget,
  selectCountReportSessions,
  selectPeriodReportSessions,
  shouldUseStoredReportSnapshot,
} from "../lib/reportSessionScope";

const makeSession = (index: number): Session => ({
  id: `session-${index}`,
  studentId: "student-a",
  date: `2026-06-${String(index).padStart(2, "0")}`,
  durationHours: 1,
  subjects: ["Math"],
  shortNote: `Catatan ${index}`,
  status: "DONE",
  rateSnapshot: 200_000,
  cost: 200_000,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
});

describe("report session scope", () => {
  it("selects the oldest N uncovered sessions so billing stays FIFO", () => {
    const history = [1, 2, 3, 4, 5, 6].map(makeSession);
    const selected = selectCountReportSessions(history, new Set(["session-5"]), 3);

    expect(selected.map((session) => session.id)).toEqual([
      "session-1",
      "session-2",
      "session-3",
    ]);
  });

  it("keeps current-report sessions eligible while excluding sibling-report sessions", () => {
    const history = [1, 2, 3, 4].map(makeSession);
    const selected = selectCountReportSessions(
      history,
      new Set(history.map((session) => session.id)),
      2,
      new Set(["session-1", "session-2", "session-3"]),
    );

    expect(selected.map((session) => session.id)).toEqual(["session-1", "session-2"]);
  });

  it("does not fall back to sessions owned by other confirmed reports", () => {
    const history = [1, 2, 3].map(makeSession);

    expect(selectCountReportSessions(
      history,
      new Set(history.map((session) => session.id)),
      2,
    )).toEqual([]);
  });

  it("can extend an owned count scope with a newly uncovered session", () => {
    const history = [1, 2, 3, 4].map(makeSession);
    const selected = selectCountReportSessions(
      history,
      new Set(["session-3"]),
      3,
      new Set(["session-1", "session-2"]),
    );

    expect(selected.map((session) => session.id)).toEqual([
      "session-1",
      "session-2",
      "session-4",
    ]);
  });

  it("keeps an automatic-unpaid confirmed package live for late historical sessions", () => {
    const history = Array.from({ length: 10 }, (_, index) => ({
      ...makeSession(index + 1),
      date: `2026-05-${String(index + 1).padStart(2, "0")}`,
    }));
    const owned = new Set(history.slice(0, 8).map((session) => session.id));

    // A confirmed invoice that remains automatic and unpaid may be refreshed.
    expect(shouldUseStoredReportSnapshot({ status: "confirmed" }, true, false)).toBe(false);
    expect(selectCountReportSessions(history, new Set(), 10, owned)
      .map((session) => session.id)).toEqual(history.map((session) => session.id));

    // Paid or manually edited invoices remain immutable.
    expect(shouldUseStoredReportSnapshot({ status: "confirmed" }, true, true)).toBe(true);
  });

  it("refreshes drafts and unpaid automatic reports, but preserves protected invoices", () => {
    expect(shouldUseStoredReportSnapshot({ status: "draft" }, true, false)).toBe(false);
    expect(shouldUseStoredReportSnapshot({ status: "confirmed" }, true, false)).toBe(false);
    // Pre-draft legacy reports are confirmed by default, but stay editable until
    // a paid or manual invoice exists for their scope.
    expect(shouldUseStoredReportSnapshot({}, true, false)).toBe(false);
    expect(shouldUseStoredReportSnapshot({ status: "confirmed" }, true, true)).toBe(true);
    expect(shouldUseStoredReportSnapshot({}, true, true)).toBe(true);
    expect(shouldUseStoredReportSnapshot({ status: "confirmed" }, false, true)).toBe(false);
  });

  it("resolves a fresh package cutoff after the calendar day changes", () => {
    let today = "2026-04-30";
    const getToday = () => today;
    expect(currentPackageSessionRange(getToday)).toEqual({ start: "0000-01-01", end: "2026-04-30" });

    today = "2026-05-01";
    expect(currentPackageSessionRange(getToday)).toEqual({ start: "0000-01-01", end: "2026-05-01" });
  });

  it("keeps a paid/manual report snapshot from absorbing late sessions", () => {
    const history = [1, 2, 3, 4].map(makeSession);
    const blocked = new Set(["session-4"]);
    const owned = new Set(["session-1", "session-2"]);

    expect(selectPeriodReportSessions(history, blocked, owned, true)
      .map((session) => session.id)).toEqual(["session-1", "session-2"]);
    expect(selectPeriodReportSessions(history, blocked, owned, false)
      .map((session) => session.id)).toEqual(["session-1", "session-2", "session-3"]);
  });

  it("builds the AI payload only from the selected report sessions", () => {
    const history = [1, 2, 3, 4, 5].map(makeSession);
    const selected = selectCountReportSessions(history, new Set(), 2);
    const input = buildReportAiInput(
      { name: "Dina", level: "IBDP" },
      "Juni 2026",
      selected,
    );

    expect(input.sessions.map((session) => session.id)).toEqual(["session-1", "session-2"]);
    expect(input.sessions).toHaveLength(2);
  });

  it("lets a supplemental edit overlap only its parent, not a sibling", () => {
    const parent = { id: "parent", periodStart: "2026-06-01", periodEnd: "2026-06-30" };
    const current = { id: "current", periodStart: "2026-06-20", periodEnd: "2026-06-22", supplementalForReportId: "parent" };
    const sibling = { id: "sibling", periodStart: "2026-06-21", periodEnd: "2026-06-25", supplementalForReportId: "parent" };

    expect(findBlockingReportOverlap(
      [parent, current],
      "2026-06-20",
      "2026-06-22",
      { id: "current", supplementalForReportId: "parent" },
    )).toBeUndefined();
    expect(findBlockingReportOverlap(
      [parent, current, sibling],
      "2026-06-20",
      "2026-06-22",
      { id: "current", supplementalForReportId: "parent" },
    )?.id).toBe("sibling");
  });

  it("lets a parent edit overlap its supplemental children", () => {
    const parent = { id: "parent", periodStart: "2026-06-01", periodEnd: "2026-06-30" };
    const child = { id: "child", periodStart: "2026-06-20", periodEnd: "2026-06-22", supplementalForReportId: "parent" };

    expect(findBlockingReportOverlap(
      [parent, child],
      "2026-06-01",
      "2026-06-30",
      { id: "parent" },
    )).toBeUndefined();
  });

  it("blocks an ordinary calendar overlap when creating a new report", () => {
    const existing = {
      id: "existing",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      sessionIds: ["session-1"],
    };

    expect(findBlockingReportOverlap(
      [existing],
      "2026-06-15",
      "2026-07-15",
    )?.id).toBe("existing");
  });

  it("treats package overlap by selected session ids instead of calendar dates", () => {
    const packageReport = {
      id: "package",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      billingMode: "session_count" as const,
      sessionIds: ["session-1", "session-2"],
    };

    expect(findBlockingReportOverlap(
      [packageReport],
      "2026-06-01",
      "2026-06-30",
      undefined,
      ["session-3"],
    )).toBeUndefined();
    expect(findBlockingReportOverlap(
      [packageReport],
      "2026-07-01",
      "2026-07-31",
      undefined,
      ["session-2"],
    )?.id).toBe("package");
  });

  it("targets a deep-linked report id instead of an ambiguous period match", async () => {
    let periodLookupCalled = false;
    const target = await resolveReportMutationTarget(
      "supplemental",
      async (id) => ({ id }),
      async () => {
        periodLookupCalled = true;
        return { id: "parent" };
      },
    );

    expect(target?.id).toBe("supplemental");
    expect(periodLookupCalled).toBe(false);
  });
});
