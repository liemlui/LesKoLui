import { describe, it, expect } from "vitest";
import { dateInWIB, todayWIB, monthOf, dayLabel, monthLabel, formatRupiah, parseDate } from "../lib/format";

describe("monthOf", () => {
  it("extracts YYYY-MM from YYYY-MM-DD", () => {
    expect(monthOf("2026-06-15")).toBe("2026-06");
    expect(monthOf("2025-01-01")).toBe("2025-01");
    expect(monthOf("2024-12-31")).toBe("2024-12");
  });
});

describe("dayLabel", () => {
  it("returns Indonesian day + date format", () => {
    const label = dayLabel("2026-06-15");
    expect(label).toContain("Juni");
    expect(label).toContain("2026");
    expect(label).toContain("15");
  });

  it("works for known dates", () => {
    // 2026-01-01 is Thursday in WIB
    const label = dayLabel("2026-01-01");
    expect(label).toMatch(/^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)/);
  });
});

describe("monthLabel", () => {
  it("returns Indonesian month + year", () => {
    expect(monthLabel("2026-06")).toBe("Juni 2026");
    expect(monthLabel("2025-01")).toBe("Januari 2025");
    expect(monthLabel("2024-12")).toBe("Desember 2024");
  });
});

describe("formatRupiah", () => {
  it("formats integers with thousand separators", () => {
    expect(formatRupiah(150000)).toBe("Rp 150.000");
    expect(formatRupiah(0)).toBe("Rp 0");
    expect(formatRupiah(2_000_000)).toBe("Rp 2.000.000");
  });

  it("rounds floats before formatting", () => {
    expect(formatRupiah(150000.7)).toBe("Rp 150.001");
    expect(formatRupiah(150000.3)).toBe("Rp 150.000");
  });

  it("never shows decimal fractions", () => {
    const result = formatRupiah(1000.5);
    expect(result).not.toContain(","); // no decimal comma
    expect(result).toMatch(/^Rp [\d.]+$/);
  });
});

describe("todayWIB", () => {
  it("converts a UTC instant using the WIB business date", () => {
    expect(dateInWIB("2026-08-31T21:30:00.000Z")).toBe("2026-09-01");
  });

  it("returns YYYY-MM-DD format", () => {
    expect(todayWIB()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns a valid date", () => {
    const today = todayWIB();
    const [, m, d] = today.split("-").map(Number);
    expect(m).toBeGreaterThanOrEqual(1);
    expect(m).toBeLessThanOrEqual(12);
    expect(d).toBeGreaterThanOrEqual(1);
    expect(d).toBeLessThanOrEqual(31);
  });
});

describe("parseDate", () => {
  it("creates a Date at local midnight", () => {
    const date = parseDate("2026-06-15");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(5); // June = 5 (0-indexed)
    expect(date.getDate()).toBe(15);
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
  });
});

describe("periodLabel", () => {
  it("uses month label when the period is inside a single month", async () => {
    const { periodLabel } = await import("../lib/format");
    expect(periodLabel("2026-06-01", "2026-06-30")).toBe("Juni 2026");
    expect(periodLabel("2026-06-05", "2026-06-20")).toBe("Juni 2026");
  });

  it("shows a range when the period spans months", async () => {
    const { periodLabel } = await import("../lib/format");
    expect(periodLabel("2026-01-20", "2026-02-03")).toBe("20 Januari – 3 Februari 2026");
  });

  it("includes both years when the period spans years", async () => {
    const { periodLabel } = await import("../lib/format");
    expect(periodLabel("2026-12-28", "2027-01-05")).toBe("28 Desember 2026 – 5 Januari 2027");
  });

  it("returns empty string when dates are missing", async () => {
    const { periodLabel } = await import("../lib/format");
    expect(periodLabel("", "")).toBe("");
  });
});
