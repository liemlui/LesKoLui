import { describe, expect, it } from "vitest";
import type { Session, MonthlyReport } from "../db/types";
import { reportBlocksSiblingScope } from "../db/repos/helpers";
import {
  buildReportAiInput,
  findBlockingReportOverlap,
  findPreviousPeriodReport,
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

  it("does not let an unprotected legacy snapshot hide a July session", () => {
    const sessions = [
      { ...makeSession(1), id: "caithlyn-2026-07-28", date: "2026-07-28" },
      { ...makeSession(2), id: "caithlyn-2026-07-30", date: "2026-07-30" },
    ];
    const legacySessionIds = new Set(["caithlyn-2026-07-28"]);

    expect(reportBlocksSiblingScope({}, false)).toBe(false);
    expect(reportBlocksSiblingScope({ status: "confirmed" }, false)).toBe(true);
    expect(reportBlocksSiblingScope({}, true)).toBe(true);

    const blockedIds = reportBlocksSiblingScope({}, false)
      ? legacySessionIds
      : new Set<string>();
    expect(selectPeriodReportSessions(sessions, blockedIds, new Set(), false)
      .map((session) => session.id)).toEqual([
      "caithlyn-2026-07-28",
      "caithlyn-2026-07-30",
    ]);
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

  it("mengunci lewat SESI: laporan berentang lebar tidak memblokir bulan yang sesinya belum direkap", () => {
    // Kasus nyata: laporan lama 1 Agu – 30 Sep menyimpan sesi Agustus saja.
    // Memilih September (sesi September belum pernah direkap) TIDAK boleh
    // diblokir hanya karena rentang tanggalnya bertumpuk.
    const wideReport = {
      id: "aug-sep",
      periodStart: "2026-08-01",
      periodEnd: "2026-09-30",
      sessionIds: ["aug-1", "aug-2"],
    };
    const septemberWindow = new Set(["sep-1", "sep-2"]);

    expect(findBlockingReportOverlap(
      [wideReport],
      "2026-09-01",
      "2026-09-30",
      undefined,
      ["sep-1", "sep-2"],
      septemberWindow,
    )).toBeUndefined();

    // Bulan yang sesinya MEMANG sudah diklaim tetap diblokir.
    const augustWindow = new Set(["aug-1"]);
    expect(findBlockingReportOverlap(
      [wideReport],
      "2026-08-01",
      "2026-08-31",
      undefined,
      ["aug-1"],
      augustWindow,
    )?.id).toBe("aug-sep");
  });

  it("laporan warisan tanpa id sesi tetap mengunci lewat kalender", () => {
    const legacy = { id: "legacy", periodStart: "2026-06-01", periodEnd: "2026-06-30" };
    expect(findBlockingReportOverlap(
      [legacy],
      "2026-06-15",
      "2026-07-15",
      undefined,
      [],
      new Set(["other-session"]),
    )?.id).toBe("legacy");
  });

  it("kasus Marcia: laporan lama berakhir 30 Sep hanya memakai sesi Agustus, September tetap bisa direkap", () => {
    // Data nyata (ekspor 30 Sep 2026): sesi Marcia = 27 Jul, 7/11/17/21/25 Agu,
    // lalu 1/8/14/22 Sep. Laporan Agustus dibuat dengan periode kalender
    // 1 Agu – 30 Sep sehingga dulu memblokir September.
    const marcia = [
      { id: "jul-27", periodStart: "2026-07-27", periodEnd: "2026-08-25", sessionIds: ["jul-27", "agu-07", "agu-11", "agu-17", "agu-21", "agu-25"] },
    ];
    const septemberWindow = new Set(["sep-01", "sep-08", "sep-14", "sep-22"]);

    expect(findBlockingReportOverlap(
      marcia,
      "2026-09-01",
      "2026-09-30",
      undefined,
      ["sep-01", "sep-08", "sep-14", "sep-22"],
      septemberWindow,
    )).toBeUndefined();

    // Sesi Agustus yang sudah masuk laporan itu tetap tidak bisa diklaim ulang.
    const augustWindow = new Set(["agu-25"]);
    expect(findBlockingReportOverlap(
      marcia,
      "2026-08-01",
      "2026-08-31",
      undefined,
      ["agu-25"],
      augustWindow,
    )?.id).toBe("jul-27");
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

describe("findPreviousPeriodReport", () => {
  const makeReport = (overrides: Partial<MonthlyReport> = {}): MonthlyReport => ({
    id: "r1",
    studentId: "student-a",
    month: "2026-06",
    periodStart: "2026-06-01",
    periodEnd: "2026-06-30",
    sessionIds: ["session-1"],
    templateKey: { themeId: "winter", layoutId: "cards" },
    summaryText: "",
    totalHours: 1,
    totalCost: 200_000,
    createdAt: "2026-06-30T00:00:00.000Z",
    ...overrides,
  });

  it("memilih laporan periode reguler terakhir yang berakhir sebelum periode berjalan", () => {
    const current = makeReport({ id: "cur", periodStart: "2026-08-01", periodEnd: "2026-08-31" });
    const prev = [
      makeReport({ id: "jun", periodStart: "2026-06-01", periodEnd: "2026-06-30", createdAt: "2026-06-30T00:00:00.000Z" }),
      makeReport({ id: "jul", periodStart: "2026-07-01", periodEnd: "2026-07-31", createdAt: "2026-07-31T00:00:00.000Z" }),
    ];
    expect(findPreviousPeriodReport(prev, current.periodStart)?.id).toBe("jul");
  });

  it("mengabaikan laporan paket (session_count) dan susulan", () => {
    const reports = [
      makeReport({ id: "pkg", billingMode: "session_count", periodEnd: "2026-07-31" }),
      makeReport({ id: "supp", supplementalForReportId: "x", periodEnd: "2026-07-31" }),
      makeReport({ id: "reg", periodStart: "2026-07-01", periodEnd: "2026-07-31" }),
    ];
    expect(findPreviousPeriodReport(reports, "2026-08-01")?.id).toBe("reg");
  });

  it("mengabaikan laporan yang periodenya tidak berakhir sebelum periode berjalan", () => {
    const reports = [
      makeReport({ id: "late", periodStart: "2026-08-15", periodEnd: "2026-08-31" }),
    ];
    expect(findPreviousPeriodReport(reports, "2026-08-01")).toBeUndefined();
  });

  it("undefined bila tidak ada laporan", () => {
    expect(findPreviousPeriodReport([], "2026-08-01")).toBeUndefined();
  });
});
