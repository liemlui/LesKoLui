import { describe, it, expect } from "vitest";
import { paginate } from "../template/paginate";
import type { ReportData } from "../template/types";

const mkData = (entries: number): ReportData => ({
  studentName: "Test", period: "Juni 2026", tutorName: "Ko Lui",
  entries: Array.from({ length: entries }, (_, i) => ({
    date: `2026-06-${String(i + 1).padStart(2, "0")}`,
    subject: "Math", narrative: `Entry ${i + 1}`,
  })),
  summary: "Great month", quote: "Keep going!",
});

describe("paginate", () => {
  it("handles zero entries — returns one empty page", () => {
    const pages = paginate(mkData(0), 4);
    expect(pages).toHaveLength(1);
    expect(pages[0].entries).toHaveLength(0);
  });

  it("returns one page when entries <= maxPerPage", () => {
    const pages = paginate(mkData(3), 4);
    expect(pages).toHaveLength(1);
    expect(pages[0].entries).toHaveLength(3);
  });

  it("splits into multiple pages", () => {
    const pages = paginate(mkData(7), 4);
    expect(pages).toHaveLength(2);
    expect(pages[0].entries).toHaveLength(4);
    expect(pages[1].entries).toHaveLength(3);
  });

  it("preserves top-level fields on each page", () => {
    const pages = paginate(mkData(5), 3);
    expect(pages[0].studentName).toBe("Test");
    expect(pages[1].studentName).toBe("Test");
    expect(pages[1].summary).toBe("Great month");
  });

  it("handles exact multiples", () => {
    const pages = paginate(mkData(8), 4);
    expect(pages).toHaveLength(2);
    expect(pages[0].entries).toHaveLength(4);
    expect(pages[1].entries).toHaveLength(4);
  });
});
