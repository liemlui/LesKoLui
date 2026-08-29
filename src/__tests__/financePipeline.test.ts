import { describe, expect, it } from "vitest";
import { buildStudentPipeline, sortPipelineRows } from "../lib/financePipeline";
import type { MonthlyReport, Payment, Session, Student } from "../db/types";

function makeStudent(id: string, overrides: Partial<Student> = {}): Student {
  return {
    id,
    name: id,
    level: "IBDP",
    subjects: [],
    parentContact: { phone: "08123456" },
    hourlyRate: 200_000,
    active: true,
    enrolledAt: "2026-01-01",
    ...overrides,
  };
}

function makeSession(studentId: string, date: string, cost = 100_000): Session {
  return {
    id: `${studentId}-${date}`,
    studentId,
    date,
    durationHours: 1,
    subjects: ["Math"],
    shortNote: "",
    status: "DONE",
    rateSnapshot: 100_000,
    cost,
    createdAt: date,
    updatedAt: date,
  };
}

function makeReport(studentId: string, overrides: Partial<MonthlyReport> = {}): MonthlyReport {
  const month = overrides.month ?? "2026-06";
  return {
    id: `r-${studentId}-${month}`,
    studentId,
    month,
    periodStart: `${month}-01`,
    periodEnd: `${month}-30`,
    status: "confirmed",
    billingMode: "monthly",
    templateKey: { themeId: "blue", layoutId: "cards" },
    summaryText: "",
    sessionIds: [],
    totalHours: 0,
    totalCost: 0,
    createdAt: `${month}-30`,
    ...overrides,
  };
}

function makePayment(studentId: string, overrides: Partial<Payment> = {}): Payment {
  const month = overrides.month ?? "2026-06";
  return {
    id: `p-${studentId}-${month}-${overrides.reportId ?? "x"}`,
    studentId,
    month,
    totalCost: 100_000,
    status: "UNPAID",
    source: "auto",
    ...overrides,
  };
}

const MONTH = "2026-06";

describe("buildStudentPipeline", () => {
  it("menghasilkan baris untuk murid aktif walaupun belum ada aktivitas", () => {
    const rows = buildStudentPipeline({
      students: [makeStudent("a")], sessions: [], reports: [], payments: [], month: MONTH,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].nextAction).toBeNull();
    expect(rows[0].sessionCount).toBe(0);
    expect(rows[0].invoiceStatus).toBe("none");
  });

  it("mengarahkan buat laporan bila ada sesi billable tanpa laporan", () => {
    const rows = buildStudentPipeline({
      students: [makeStudent("a")],
      sessions: [makeSession("a", "2026-06-10")],
      reports: [],
      payments: [],
      month: MONTH,
    });
    expect(rows[0].nextAction).toBe("create-report");
    expect(rows[0].sessionCount).toBe(1);
    expect(rows[0].potential).toBe(100_000);
  });

  it("mengarahkan sahkan laporan bila ada draft", () => {
    const rows = buildStudentPipeline({
      students: [makeStudent("a")],
      sessions: [makeSession("a", "2026-06-10")],
      reports: [makeReport("a", { status: "draft", totalCost: 100_000 })],
      payments: [],
      month: MONTH,
    });
    expect(rows[0].nextAction).toBe("confirm-report");
    expect(rows[0].reportDisplayStatus).toBe("draft");
  });

  it("mengarahkan buat tagihan untuk laporan final tanpa invoice", () => {
    const rows = buildStudentPipeline({
      students: [makeStudent("a")],
      sessions: [makeSession("a", "2026-06-10")],
      reports: [makeReport("a", { totalCost: 100_000 })],
      payments: [],
      month: MONTH,
    });
    expect(rows[0].nextAction).toBe("create-invoice");
  });

  it("mengarahkan kirim WA saat tagihan belum dibayar", () => {
    const rep = makeReport("a", { totalCost: 100_000 });
    const rows = buildStudentPipeline({
      students: [makeStudent("a")],
      sessions: [makeSession("a", "2026-06-10")],
      reports: [rep],
      payments: [makePayment("a", { reportId: rep.id, totalCost: 100_000 })],
      month: MONTH,
    });
    expect(rows[0].nextAction).toBe("send-wa");
    expect(rows[0].invoiceStatus).toBe("unpaid");
  });

  it("mengarahkan bagikan laporan saat lunas tapi laporan final belum dibagikan", () => {
    const rep = makeReport("a", { totalCost: 100_000 });
    const rows = buildStudentPipeline({
      students: [makeStudent("a")],
      sessions: [makeSession("a", "2026-06-10")],
      reports: [rep],
      payments: [makePayment("a", {
        reportId: rep.id, totalCost: 100_000, status: "PAID", paidAt: "2026-06-20",
      })],
      month: MONTH,
    });
    expect(rows[0].nextAction).toBe("share-report");
  });

  it("menandai sinkron saat laporan sudah dibagikan dan lunas", () => {
    const rep = makeReport("a", {
      totalCost: 100_000,
      pdfGeneratedAt: "2026-06-21T00:00:00.000Z",
    });
    const rows = buildStudentPipeline({
      students: [makeStudent("a")],
      sessions: [makeSession("a", "2026-06-10")],
      reports: [rep],
      payments: [makePayment("a", {
        reportId: rep.id, totalCost: 100_000, status: "PAID", paidAt: "2026-06-20",
      })],
      month: MONTH,
    });
    expect(rows[0].nextAction).toBeNull();
  });

  it("murid nonaktif dengan piutang tetap muncul; tanpa aktivitas tidak", () => {
    const rows = buildStudentPipeline({
      students: [
        makeStudent("inactive-with-debt", { active: false }),
        makeStudent("inactive-idle", { active: false }),
      ],
      sessions: [],
      reports: [],
      payments: [makePayment("inactive-with-debt", { totalCost: 150_000 })],
      month: MONTH,
    });
    const names = rows.map((r) => r.student.id);
    expect(names).toContain("inactive-with-debt");
    expect(names).not.toContain("inactive-idle");
    const row = rows.find((r) => r.student.id === "inactive-with-debt");
    expect(row?.nextAction).toBe("send-wa");
  });

  it("laporan paket tanpa invoice tidak diminta create-invoice (langsung dibagikan)", () => {
    const rows = buildStudentPipeline({
      students: [makeStudent("a")],
      sessions: [makeSession("a", "2026-06-10")],
      reports: [makeReport("a", { billingMode: "session_count", totalCost: 300_000 })],
      payments: [],
      month: MONTH,
    });
    expect(rows[0].nextAction).not.toBe("create-invoice");
    expect(rows[0].nextAction).toBe("share-report");
  });
});

describe("sortPipelineRows", () => {
  it("meletakkan baris butuh aksi lebih dulu, lalu piutang terbesar", () => {
    const idle = buildStudentPipeline({
      students: [makeStudent("idle")], sessions: [], reports: [], payments: [], month: MONTH,
    })[0];
    const small = buildStudentPipeline({
      students: [makeStudent("small")],
      sessions: [makeSession("small", "2026-06-10")],
      reports: [],
      payments: [],
      month: MONTH,
    })[0];
    const big = buildStudentPipeline({
      students: [makeStudent("big")],
      sessions: [],
      reports: [],
      payments: [makePayment("big", { totalCost: 900_000 })],
      month: MONTH,
    })[0];
    const sorted = sortPipelineRows([idle, small, big]);
    expect(sorted[0].student.id).toBe("big");   // piutang terbesar dulu
    expect(sorted[1].student.id).toBe("small"); // butuh aksi
    expect(sorted[2].student.id).toBe("idle");  // sinkron paling bawah
  });
});
