import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import { createExpense, updateExpense, listExpenses } from "../db/repos";

beforeEach(async () => {
  await db.expenses.clear();
  await db.auditLog.clear();
});

describe("updateExpense", () => {
  it("mengubah pengeluaran yang sudah ada dan mencatat audit", async () => {
    const id = await createExpense({
      date: "2026-08-01",
      category: "transport",
      description: "Bensin",
      amount: 50_000,
    });

    await updateExpense(id, {
      date: "2026-08-02",
      category: "buku",
      description: "Buku latihan",
      amount: 120_000,
    });

    const rows = await listExpenses("2026-08");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id,
      date: "2026-08-02",
      category: "buku",
      description: "Buku latihan",
      amount: 120_000,
    });

    const audit = await db.auditLog.toArray();
    expect(audit.some((entry) => entry.action === "expense.update" && entry.entityId === id)).toBe(true);
  });

  it("menolak nominal tidak valid", async () => {
    const id = await createExpense({
      date: "2026-08-01",
      category: "lainnya",
      description: "Parkir",
      amount: 5_000,
    });
    await expect(updateExpense(id, {
      date: "2026-08-01",
      category: "lainnya",
      description: "Parkir",
      amount: 0,
    })).rejects.toThrow("Invalid expense amount");
  });
});
