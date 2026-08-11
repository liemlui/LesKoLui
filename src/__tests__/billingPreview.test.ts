import { describe, expect, it } from "vitest";
import { buildMonthClosingProjection } from "../lib/billingPreview";

describe("month-closing preview", () => {
  it("does not add a manual payment again when closing will adopt it", () => {
    const projection = buildMonthClosingProjection(
      [
        { studentId: "eko", cost: 450_000 },
        { studentId: "maya", cost: 300_000 },
      ],
      [
        { id: "manual-eko", studentId: "eko", totalCost: 450_000 },
        { id: "report-maya", studentId: "maya", totalCost: 200_000, reportId: "report-old" },
      ],
    );

    expect(projection.rows[0].adoptedPayment?.id).toBe("manual-eko");
    expect(projection.rows[1].adoptedPayment).toBeUndefined();
    expect(projection.additionalTotal).toBe(300_000);
  });

  it("preserves the existing invoice amount in the adoption plan", () => {
    const projection = buildMonthClosingProjection(
      [{ studentId: "eko", cost: 500_000 }],
      [{ id: "manual-eko", studentId: "eko", totalCost: 450_000 }],
    );

    expect(projection.rows[0].adoptedPayment?.totalCost).toBe(450_000);
    expect(projection.additionalTotal).toBe(0);
  });

  it("does not claim a standalone manual invoice will be adopted beside a report invoice", () => {
    const projection = buildMonthClosingProjection(
      [{ studentId: "eko", cost: 225_000 }],
      [
        { id: "report-eko", studentId: "eko", totalCost: 450_000, reportId: "report-june" },
        { id: "manual-eko", studentId: "eko", totalCost: 100_000 },
      ],
    );

    expect(projection.rows[0].adoptedPayment).toBeUndefined();
    expect(projection.additionalTotal).toBe(225_000);
  });
});
