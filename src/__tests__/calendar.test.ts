import { describe, it, expect } from "vitest";
import { calendarCells, weekDates, addDays, prevMonth, nextMonth, byDay } from "../lib/calendar";
import type { Session } from "../db/types";

const mkSession = (date: string): Session => ({
  id: "s-" + date, studentId: "s1", date, durationHours: 2, subjects: [], shortNote: "",
  status: "DONE", rateSnapshot: 200000, cost: 400000, createdAt: "", updatedAt: "",
});

describe("prevMonth", () => {
  it("handles January -> December", () => {
    expect(prevMonth("2026-01")).toBe("2025-12");
  });

  it("handles normal months", () => {
    expect(prevMonth("2026-06")).toBe("2026-05");
  });
});

describe("nextMonth", () => {
  it("handles December -> January", () => {
    expect(nextMonth("2026-12")).toBe("2027-01");
  });

  it("handles normal months", () => {
    expect(nextMonth("2026-06")).toBe("2026-07");
  });
});

describe("calendarCells", () => {
  it("returns 28-31 date strings + leading nulls", () => {
    const cells = calendarCells("2026-06");
    const dates = cells.filter((c): c is string => c !== null);
    expect(dates.length).toBeGreaterThanOrEqual(28);
    expect(dates.length).toBeLessThanOrEqual(31);
  });

  it("all date strings are within the month", () => {
    const cells = calendarCells("2026-06");
    const dates = cells.filter((c): c is string => c !== null);
    dates.forEach((d) => {
      expect(d).toMatch(/^2026-06-\d{2}$/);
    });
  });

  it("contains sequential dates", () => {
    const cells = calendarCells("2026-01");
    const dates = cells.filter((c): c is string => c !== null);
    expect(dates[0]).toBe("2026-01-01");
    expect(dates[dates.length - 1]).toBe("2026-01-31");
  });
});

describe("weekDates", () => {
  it("returns exactly 7 dates", () => {
    const week = weekDates("2026-06-15");
    expect(week).toHaveLength(7);
  });

  it("all dates are YYYY-MM-DD", () => {
    const week = weekDates("2026-06-15");
    week.forEach((d) => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  });

  it("starts on Sunday", () => {
    const week = weekDates("2026-06-15");
    const first = new Date(week[0] + "T00:00:00");
    expect(first.getDay()).toBe(0); // Sunday
  });
});

describe("addDays", () => {
  it("adds positive days", () => {
    expect(addDays("2026-06-15", 1)).toBe("2026-06-16");
  });

  it("crosses month boundary", () => {
    expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
  });
});

describe("byDay", () => {
  it("groups sessions by date", () => {
    const sessions = [mkSession("2026-06-15"), mkSession("2026-06-15"), mkSession("2026-06-16")];
    const grouped = byDay(sessions);
    expect(grouped.get("2026-06-15")).toHaveLength(2);
    expect(grouped.get("2026-06-16")).toHaveLength(1);
  });

  it("handles undefined input", () => {
    const grouped = byDay(undefined);
    expect(grouped.size).toBe(0);
  });
});
