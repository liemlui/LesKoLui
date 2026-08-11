import { describe, expect, it } from "vitest";
import type { Session } from "../db/types";
import {
  buildReportAiInput,
  findBlockingReportOverlap,
  resolveReportMutationTarget,
  selectCountReportSessions,
  selectPeriodReportSessions,
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
  it("selects only the latest N uncovered sessions", () => {
    const history = [1, 2, 3, 4, 5, 6].map(makeSession);
    const selected = selectCountReportSessions(history, new Set(["session-5"]), 3);

    expect(selected.map((session) => session.id)).toEqual([
      "session-3",
      "session-4",
      "session-6",
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

    expect(selected.map((session) => session.id)).toEqual(["session-2", "session-3"]);
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

    expect(input.sessions.map((session) => session.id)).toEqual(["session-4", "session-5"]);
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
