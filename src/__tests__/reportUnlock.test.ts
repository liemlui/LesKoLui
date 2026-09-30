/**
 * Buka kunci laporan final (`unlockReport`) — jalur perbaikan ketika yang salah
 * adalah **laporannya**, bukan tagihannya.
 *
 * Semua tes berjalan di atas `fake-indexeddb` (lihat `src/setupTests.ts`) — tidak
 * ada perintah di berkas ini yang menyentuh IndexedDB aplikasi pengguna.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import {
  syncReportPayment, unlockReport, upsertReport,
} from "../db/repos";
import type { MonthlyReport, Session, Student } from "../db/types";

const RATE = 100_000;

function student(id: string, policy: Student["billingPolicy"] = "monthly"): Student {
  return {
    id,
    name: `Murid ${id}`,
    level: "MYP",
    subjects: ["Math"],
    parentContact: { phone: "0800000000" },
    hourlyRate: RATE,
    billingPolicy: policy,
    active: true,
    enrolledAt: "2026-01-01",
  };
}

function session(id: string, studentId: string, date: string): Session {
  return {
    id,
    studentId,
    date,
    durationHours: 1,
    subjects: ["Math"],
    shortNote: "",
    status: "DONE",
    rateSnapshot: RATE,
    cost: RATE,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  };
}

function report(
  id: string,
  studentId: string,
  sessionIds: string[],
  overrides: Partial<MonthlyReport> = {},
): MonthlyReport {
  return {
    id,
    studentId,
    month: "2026-05",
    periodStart: "2026-05-01",
    periodEnd: "2026-05-31",
    status: "confirmed",
    sessionIds,
    templateKey: { themeId: "blue", layoutId: "cards" },
    summaryText: "",
    totalHours: sessionIds.length,
    totalCost: sessionIds.length * RATE,
    createdAt: "2026-05-31T00:00:00.000Z",
    ...overrides,
  };
}

/** Laporan final + sesinya, tanpa tagihan. */
async function seedFinalReport(id = "s1"): Promise<{ studentId: string; reportId: string; sessionIds: string[] }> {
  await db.students.add(student(id));
  const sessionIds = [`${id}-a`, `${id}-b`];
  await db.sessions.bulkAdd([
    session(sessionIds[0], id, "2026-05-10"),
    session(sessionIds[1], id, "2026-05-12"),
  ]);
  const stored = report(`${id}-report`, id, sessionIds);
  await db.reports.add(stored);
  return { studentId: id, reportId: stored.id, sessionIds };
}

beforeEach(async () => {
  await db.students.clear();
  await db.sessions.clear();
  await db.reports.clear();
  await db.payments.clear();
  await db.auditLog.clear();
});

describe("unlockReport", () => {
  it("mengembalikan laporan final menjadi draft dan mencatat audit report.unlock", async () => {
    const { studentId, reportId } = await seedFinalReport();

    const result = await unlockReport(reportId);

    expect(result).toEqual({ wasShared: false });
    const stored = await db.reports.get(reportId);
    expect(stored).toMatchObject({
      status: "draft",
      studentId,
      totalCost: 2 * RATE,
      totalHours: 2,
    });

    const audits = await db.auditLog.toArray();
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ action: "report.unlock", entityType: "report", entityId: reportId });
    expect(JSON.parse(audits[0].details ?? "{}")).toMatchObject({
      previousStatus: "confirmed",
      sessionCount: 2,
      totalCost: 2 * RATE,
      wasShared: false,
    });
  });

  it("laporan yang sudah draft ditolak tanpa perubahan", async () => {
    const { reportId } = await seedFinalReport();
    await db.reports.update(reportId, { status: "draft" });

    await expect(unlockReport(reportId)).rejects.toThrow("belum final");
    expect((await db.reports.get(reportId))!.status).toBe("draft");
    expect(await db.auditLog.count()).toBe(0);
  });

  it("menolak bila tagihan laporan belum lunas — arahkan batalkan dulu di Keuangan", async () => {
    const { reportId } = await seedFinalReport();
    const stored = (await db.reports.get(reportId))!;
    await syncReportPayment(stored);

    await expect(unlockReport(reportId)).rejects.toThrow("Batalkan dulu tagihannya");
    expect((await db.reports.get(reportId))!.status).toBe("confirmed");
    expect(await db.auditLog.count()).toBe(0);
  });

  it("menolak bila tagihannya sudah lunas", async () => {
    const { reportId } = await seedFinalReport();
    const stored = (await db.reports.get(reportId))!;
    await syncReportPayment(stored);
    const payment = (await db.payments.where("reportId").equals(reportId).toArray())[0];
    await db.payments.update(payment.id, { status: "PAID" });

    await expect(unlockReport(reportId)).rejects.toThrow("sudah lunas");
    expect((await db.reports.get(reportId))!.status).toBe("confirmed");
  });

  it("menolak bila nominal tagihannya sudah diedit manual", async () => {
    const { reportId } = await seedFinalReport();
    const stored = (await db.reports.get(reportId))!;
    await syncReportPayment(stored);
    const payment = (await db.payments.where("reportId").equals(reportId).toArray())[0];
    await db.payments.update(payment.id, { source: "manual" });

    await expect(unlockReport(reportId)).rejects.toThrow("diedit manual");
    expect((await db.reports.get(reportId))!.status).toBe("confirmed");
  });

  it("menolak laporan paket per pertemuan — arahkan ke antrean Keuangan", async () => {
    await db.students.add(student("pkg", "session_count"));
    await db.sessions.bulkAdd([
      session("pkg-1", "pkg", "2026-05-10"),
      session("pkg-2", "pkg", "2026-05-12"),
    ]);
    await db.reports.add(report("pkg-report", "pkg", ["pkg-1", "pkg-2"], {
      billingMode: "session_count",
      billingSessionCount: 2,
    }));

    await expect(unlockReport("pkg-report")).rejects.toThrow("Keuangan");
    expect((await db.reports.get("pkg-report"))!.status).toBe("confirmed");
    expect(await db.auditLog.count()).toBe(0);
  });

  it("menolak bila sudah ada laporan susulan dari laporan ini", async () => {
    const { studentId, reportId } = await seedFinalReport();
    await db.reports.add(report("child", studentId, ["s1-a"], { supplementalForReportId: reportId }));

    await expect(unlockReport(reportId)).rejects.toThrow("laporan susulan");
    expect((await db.reports.get(reportId))!.status).toBe("confirmed");
  });

  it("laporan yang sudah ditandai dibagikan butuh konfirmasi eksplisit, lalu tanda itu dilepas", async () => {
    const { reportId } = await seedFinalReport();
    await db.reports.update(reportId, { pdfGeneratedAt: "2026-05-31T10:00:00.000Z" });

    await expect(unlockReport(reportId)).rejects.toThrow("sudah ditandai dibagikan");
    expect((await db.reports.get(reportId))!.status).toBe("confirmed");

    const result = await unlockReport(reportId, { confirmShared: true });
    expect(result).toEqual({ wasShared: true });
    const stored = (await db.reports.get(reportId))!;
    expect(stored.status).toBe("draft");
    expect(stored.pdfGeneratedAt).toBeUndefined();
    expect(JSON.parse((await db.auditLog.toArray())[0].details ?? "{}")).toMatchObject({
      wasShared: true,
      sharedAt: "2026-05-31T10:00:00.000Z",
    });
  });

  it("setelah dibuka, laporan bisa difinalkan ulang dengan total hasil perbaikan", async () => {
    const { reportId, sessionIds } = await seedFinalReport();
    await unlockReport(reportId);

    // Perbaikan: satu sesi ternyata bukan milik periode ini → dikeluarkan.
    const fixed = { ...(await db.reports.get(reportId))!, sessionIds: [sessionIds[0]] };
    await db.sessions.update(sessionIds[0], { narrative: "Perbaikan" });
    await upsertReport({ ...fixed, totalHours: 1, totalCost: RATE });

    expect((await db.reports.get(reportId))!).toMatchObject({
      status: "draft",
      totalCost: RATE,
      totalHours: 1,
      sessionIds: [sessionIds[0]],
    });

    const finalized = await upsertReport({ ...(await db.reports.get(reportId))!, status: "confirmed" });
    expect(finalized).toBe(reportId);
    expect((await db.reports.get(reportId))!).toMatchObject({ status: "confirmed", totalCost: RATE });
  });

  it("laporan legacy tanpa field status (dianggap final) juga bisa dibuka", async () => {
    const { reportId } = await seedFinalReport();
    await db.reports.update(reportId, { status: undefined });

    await unlockReport(reportId);

    expect((await db.reports.get(reportId))!.status).toBe("draft");
  });
});
