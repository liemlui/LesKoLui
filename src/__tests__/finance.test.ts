import { describe, expect, it } from "vitest";
import {
  ageBucket,
  invoiceAgeDays,
  lastDayOfMonth,
  AGE_BUCKET_LABEL,
  invoiceIssuedAt,
  computeStudentProfit,
} from "../lib/finance";

function pay(month: string, periodEnd?: string) {
  return { month, periodEnd };
}

describe("lastDayOfMonth", () => {
  it("mengembalikan hari terakhir bulan (termasuk kabisat)", () => {
    expect(lastDayOfMonth("2026-02")).toBe("2026-02-28");
    expect(lastDayOfMonth("2024-02")).toBe("2024-02-29");
    expect(lastDayOfMonth("2026-06")).toBe("2026-06-30");
    expect(lastDayOfMonth("2026-08")).toBe("2026-08-31");
  });
});

describe("invoiceAgeDays", () => {
  it("menghitung umur dari periodEnd", () => {
    expect(invoiceAgeDays(pay("2026-06", "2026-06-30"), "2026-08-01")).toBe(32);
  });

  it("memakai akhir bulan kalender bila periodEnd kosong", () => {
    expect(invoiceAgeDays(pay("2026-06"), "2026-08-01")).toBe(32);
  });

  it("tidak pernah negatif untuk tagihan yang belum jatuh tempo", () => {
    expect(invoiceAgeDays(pay("2026-06", "2026-06-30"), "2026-06-15")).toBe(0);
  });
});

describe("ageBucket", () => {
  it("mengelompokkan pada batas 30 dan 60 hari", () => {
    expect(ageBucket(0)).toBe("0-30");
    expect(ageBucket(30)).toBe("0-30");
    expect(ageBucket(31)).toBe("31-60");
    expect(ageBucket(60)).toBe("31-60");
    expect(ageBucket(61)).toBe(">60");
  });
});

describe("AGE_BUCKET_LABEL", () => {
  it("menyediakan label untuk semua bucket", () => {
    expect(AGE_BUCKET_LABEL["0-30"]).toContain("30");
    expect(AGE_BUCKET_LABEL["31-60"]).toContain("60");
    expect(AGE_BUCKET_LABEL[">60"]).toContain("60");
  });
});

describe("invoiceIssuedAt", () => {
  it("mengembalikan createdAt bila ada", () => {
    expect(invoiceIssuedAt({ createdAt: "2026-08-01", paidAt: "2026-08-15", periodEnd: "2026-07-31", month: "2026-07" })).toBe("2026-08-01");
  });

  it("fallback ke paidAt", () => {
    expect(invoiceIssuedAt({ paidAt: "2026-08-15", periodEnd: "2026-07-31", month: "2026-07" })).toBe("2026-08-15");
  });

  it("fallback ke periodEnd", () => {
    expect(invoiceIssuedAt({ periodEnd: "2026-07-31", month: "2026-07" })).toBe("2026-07-31");
  });

  it("fallback ke akhir bulan kalender", () => {
    expect(invoiceIssuedAt({ month: "2026-07" })).toBe("2026-07-31");
  });
});

const profitStudent = (id: string, name: string, active = true) => ({ id, name, active });

describe("computeStudentProfit", () => {
  it("menghitung laba = income PAID - directExpense", () => {
    const { rows, commonExpense } = computeStudentProfit(
      [profitStudent("a", "Alya"), profitStudent("b", "Budi")],
      [
        { studentId: "a", status: "PAID", totalCost: 500_000 },
        { studentId: "a", status: "UNPAID", totalCost: 100_000 },
        { studentId: "b", status: "PAID", totalCost: 300_000 },
      ],
      [
        { studentId: "a", amount: 50_000 },
        { studentId: "a", amount: 20_000 },
        { studentId: "b", amount: 30_000 },
        { amount: 100_000 }, // umum
      ],
    );
    expect(rows).toHaveLength(2);
    const alya = rows.find((r) => r.studentId === "a");
    expect(alya?.income).toBe(500_000);
    expect(alya?.netProfit).toBe(430_000);
    const budi = rows.find((r) => r.studentId === "b");
    expect(budi?.netProfit).toBe(270_000);
    expect(commonExpense).toBe(100_000);
  });

  it("pengeluaran umum tidak dialokasikan", () => {
    const { rows, commonExpense } = computeStudentProfit(
      [profitStudent("a", "Alya")],
      [{ studentId: "a", status: "PAID", totalCost: 200_000 }],
      [{ amount: 50_000 }],
    );
    expect(rows[0].directExpense).toBe(0);
    expect(rows[0].netProfit).toBe(200_000);
    expect(commonExpense).toBe(50_000);
  });

  it("mengurutkan dari laba terbesar", () => {
    const { rows } = computeStudentProfit(
      [profitStudent("a", "Alya"), profitStudent("b", "Budi")],
      [
        { studentId: "a", status: "PAID", totalCost: 200_000 },
        { studentId: "b", status: "PAID", totalCost: 500_000 },
      ],
      [],
    );
    expect(rows[0].studentId).toBe("b");
    expect(rows[1].studentId).toBe("a");
  });
});
