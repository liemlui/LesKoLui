/**
 * TASK-10 L2–L5 — pembatalan & pemulihan tagihan (R1 snapshot + Undo),
 * guard G1–G9, perubahan jatuh tempo, dan pembekuan total laporan final.
 *
 * Semua tes berjalan di atas `fake-indexeddb` (lihat `src/setupTests.ts`) —
 * tidak ada satu pun perintah di berkas ini yang menyentuh IndexedDB aplikasi
 * pengguna.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import {
  cancelReportInvoice, cancelSessionCountInvoice, createManualPayment, createSessionCountInvoice,
  deleteManualPayment, listInvoiceCancellations, listSessionCountBillingProgress,
  restoreCancelledInvoice, syncReportPayment, updatePaymentDueAt, upsertReport, updateStudent,
} from "../db/repos";
import { frozenReportTotals, reportTotalsDrifted } from "../db/repos/reportRepo";
import type { MonthlyReport, Session, Student } from "../db/types";

const RATE = 100_000;

function student(id: string, policy: Student["billingPolicy"] = "session_count", quota = 2): Student {
  return {
    id,
    name: `Murid ${id}`,
    level: "MYP",
    subjects: ["Math"],
    parentContact: { phone: "0800000000" },
    hourlyRate: RATE,
    billingPolicy: policy,
    billingSessionCount: quota,
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

function confirmedReport(
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

async function soleInvoiceForReport(reportId: string): Promise<string> {
  const rows = await db.payments.where("reportId").equals(reportId).toArray();
  expect(rows).toHaveLength(1);
  return rows[0].id;
}

beforeEach(async () => {
  await db.students.clear();
  await db.sessions.clear();
  await db.reports.clear();
  await db.payments.clear();
  await db.auditLog.clear();
});

describe("pemulihan paket (L2)", () => {
  async function seedPackageStudent(id = "pkg"): Promise<{ studentId: string; sessionIds: string[] }> {
    await db.students.add(student(id, "session_count", 2));
    const sessionIds = [`${id}-1`, `${id}-2`];
    await db.sessions.bulkAdd([
      session(sessionIds[0], id, "2026-01-01"),
      session(sessionIds[1], id, "2026-01-02"),
    ]);
    return { studentId: id, sessionIds };
  }

  it("pembatalan menulis snapshot di dalam transaksi dan tidak menyentuh sesi", async () => {
    const { studentId, sessionIds } = await seedPackageStudent();
    const issued = await createSessionCountInvoice(studentId);

    await cancelSessionCountInvoice(issued.paymentId);

    expect(await db.payments.get(issued.paymentId)).toBeUndefined();
    expect(await db.reports.get(issued.reportId)).toBeUndefined();
    expect(await db.sessions.bulkGet(sessionIds)).toHaveLength(2);
    expect(await db.sessions.bulkGet(sessionIds)).not.toContain(undefined);

    const snapshots = await db.auditLog.toArray();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({ action: "payment.cancel", entityType: "payment", entityId: issued.paymentId });
    const parsed = JSON.parse(snapshots[0].details ?? "{}");
    expect(parsed).toMatchObject({ version: 1, kind: "package" });
    expect(parsed.sessionIds).toEqual(sessionIds);
    expect(parsed.payment.id).toBe(issued.paymentId);
    expect(parsed.report.id).toBe(issued.reportId);

    const cancellations = await listInvoiceCancellations();
    expect(cancellations).toHaveLength(1);
    expect(cancellations[0]).toMatchObject({
      snapshotId: snapshots[0].id,
      kind: "package",
      paymentId: issued.paymentId,
      sessionCount: 2,
    });
  });

  it("pemulihan mengembalikan tagihan, laporan, dan siklus murid dengan ID & nilai sama", async () => {
    const { studentId, sessionIds } = await seedPackageStudent();
    const issued = await createSessionCountInvoice(studentId);
    const beforePayment = (await db.payments.get(issued.paymentId))!;
    const beforeReport = (await db.reports.get(issued.reportId))!;
    const beforeStudent = (await db.students.get(studentId))!;

    await cancelSessionCountInvoice(issued.paymentId);
    expect(await listSessionCountBillingProgress()).toMatchObject([
      { studentId, unbilledCount: 2, readyBatchCount: 1 },
    ]);

    const [cancellation] = await listInvoiceCancellations();
    const result = await restoreCancelledInvoice(cancellation.snapshotId);

    expect(result).toEqual({ status: "restored", kind: "package" });
    expect(await db.payments.get(issued.paymentId)).toEqual(beforePayment);
    expect(await db.reports.get(issued.reportId)).toEqual(beforeReport);
    expect(await db.students.get(studentId)).toEqual(beforeStudent);
    // Sesi tidak pernah tersentuh, jadi antrean kembali persis seperti semula.
    expect(await listSessionCountBillingProgress()).toMatchObject([
      { studentId, unbilledCount: 0, readyBatchCount: 0 },
    ]);
    expect((await db.sessions.bulkGet(sessionIds)).filter(Boolean)).toHaveLength(2);
    // Snapshot tidak ditawarkan lagi setelah dipulihkan.
    expect(await listInvoiceCancellations()).toHaveLength(0);
    const actions = (await db.auditLog.toArray()).map((entry) => entry.action).sort();
    expect(actions).toEqual(["payment.cancel", "payment.restore"]);
  });

  it("pemulihan kedua kali idempoten (no-op, tidak menimpa apa pun)", async () => {
    const { studentId } = await seedPackageStudent();
    const issued = await createSessionCountInvoice(studentId);
    await cancelSessionCountInvoice(issued.paymentId);
    const [cancellation] = await listInvoiceCancellations();
    await restoreCancelledInvoice(cancellation.snapshotId);
    const restored = (await db.payments.get(issued.paymentId))!;

    const again = await restoreCancelledInvoice(cancellation.snapshotId);
    expect(again).toEqual({ status: "noop", kind: "package" });
    expect(await db.payments.get(issued.paymentId)).toEqual(restored);
    expect(await db.auditLog.count()).toBe(2);
  });

  it("pemulihan ditolak tanpa menimpa bila tagihan dengan ID sama sudah berbeda (G9)", async () => {
    const { studentId } = await seedPackageStudent();
    const issued = await createSessionCountInvoice(studentId);
    await cancelSessionCountInvoice(issued.paymentId);
    const [cancellation] = await listInvoiceCancellations();

    // Baris lain memakai ID yang sama dengan nilai berbeda (mis. hasil impor).
    await db.payments.add({
      id: issued.paymentId, studentId, month: "2026-01", totalCost: 99_000,
      status: "UNPAID", source: "manual",
    });

    await expect(restoreCancelledInvoice(cancellation.snapshotId))
      .rejects.toThrow("sudah ada dengan data berbeda");
    await expect(db.payments.get(issued.paymentId)).resolves.toMatchObject({ totalCost: 99_000 });
    await expect(db.reports.get(issued.reportId)).resolves.toBeUndefined();
  });

  it("pemulihan ditolak bila siklus murid berubah setelah pembatalan (G8)", async () => {
    const { studentId } = await seedPackageStudent();
    const issued = await createSessionCountInvoice(studentId);
    await cancelSessionCountInvoice(issued.paymentId);
    const [cancellation] = await listInvoiceCancellations();

    await updateStudent(studentId, { billingSessionCount: 10 });

    await expect(restoreCancelledInvoice(cancellation.snapshotId))
      .rejects.toThrow("siklus tagihan murid sudah berubah");
    await expect(db.payments.get(issued.paymentId)).resolves.toBeUndefined();
    await expect(db.students.get(studentId)).resolves.toMatchObject({ billingSessionCount: 10 });
  });

  it("pemulihan ditolak bila sesinya sudah tidak ada (G6)", async () => {
    const { studentId } = await seedPackageStudent();
    const issued = await createSessionCountInvoice(studentId);
    await cancelSessionCountInvoice(issued.paymentId);
    const [cancellation] = await listInvoiceCancellations();

    await db.sessions.delete(`${studentId}-1`);

    await expect(restoreCancelledInvoice(cancellation.snapshotId))
      .rejects.toThrow("1 sesi pada tagihan ini sudah tidak ada");
    await expect(db.payments.get(issued.paymentId)).resolves.toBeUndefined();
  });

  it("pemulihan ditolak bila paket pengganti untuk sesi sama sudah terbit (G2)", async () => {
    const { studentId } = await seedPackageStudent();
    const issued = await createSessionCountInvoice(studentId);
    await cancelSessionCountInvoice(issued.paymentId);
    const [cancellation] = await listInvoiceCancellations();

    const replacement = await createSessionCountInvoice(studentId);

    await expect(restoreCancelledInvoice(cancellation.snapshotId))
      .rejects.toThrow("paket pengganti untuk sesi yang sama");
    await expect(db.payments.get(issued.paymentId)).resolves.toBeUndefined();
    await expect(db.payments.get(replacement.paymentId)).resolves.toBeDefined();
    expect(await db.payments.count()).toBe(1);
  });

  it("pemulihan ditolak bila murid sudah dihapus (G7)", async () => {
    const { studentId } = await seedPackageStudent();
    const issued = await createSessionCountInvoice(studentId);
    await cancelSessionCountInvoice(issued.paymentId);
    const [cancellation] = await listInvoiceCancellations();

    await db.students.delete(studentId);

    await expect(restoreCancelledInvoice(cancellation.snapshotId))
      .rejects.toThrow("murid tagihan ini sudah dihapus");
  });

  it("snapshot hilang (mis. Hapus Semua Data) ⇒ tidak ditawarkan dan pemulihan gagal jelas", async () => {
    const { studentId } = await seedPackageStudent();
    const issued = await createSessionCountInvoice(studentId);
    await cancelSessionCountInvoice(issued.paymentId);
    const [cancellation] = await listInvoiceCancellations();

    await db.auditLog.clear();

    expect(await listInvoiceCancellations()).toHaveLength(0);
    await expect(restoreCancelledInvoice(cancellation.snapshotId))
      .rejects.toThrow("Snapshot pembatalan tidak ditemukan di perangkat ini");
    expect(await db.payments.count()).toBe(0);
  });

  it("snapshot rusak diabaikan saat menawarkan pemulihan dan ditolak saat dipulihkan", async () => {
    await db.auditLog.add({
      id: "rusak", action: "payment.cancel", entityType: "payment",
      entityId: "p", timestamp: "2026-01-01T00:00:00.000Z", details: "{bukan json",
    });
    await db.auditLog.add({
      id: "asing", action: "payment.cancel", entityType: "payment",
      entityId: "p", timestamp: "2026-01-02T00:00:00.000Z", details: JSON.stringify({ version: 9 }),
    });

    expect(await listInvoiceCancellations()).toHaveLength(0);
    await expect(restoreCancelledInvoice("rusak")).rejects.toThrow("tidak dapat dibaca");
  });
});

describe("invoice laporan (L3)", () => {
  async function seedReportInvoice(id = "rp"): Promise<{ studentId: string; report: MonthlyReport; sessionIds: string[] }> {
    await db.students.add(student(id, "monthly", undefined));
    const sessionIds = [`${id}-1`, `${id}-2`];
    await db.sessions.bulkAdd([
      session(sessionIds[0], id, "2026-05-10"),
      session(sessionIds[1], id, "2026-05-12"),
    ]);
    const report = confirmedReport(`${id}-report`, id, sessionIds);
    await db.reports.add(report);
    await syncReportPayment(report);
    return { studentId: id, report, sessionIds };
  }

  it("pembatalan hanya menghapus tagihan; laporan tetap final dan tidak ditulis ulang", async () => {
    const { report, sessionIds } = await seedReportInvoice();
    const paymentId = await soleInvoiceForReport(report.id);
    const before = (await db.reports.get(report.id))!;

    await cancelReportInvoice(paymentId);

    expect(await db.payments.get(paymentId)).toBeUndefined();
    expect(await db.reports.get(report.id)).toEqual(before);
    expect((await db.reports.get(report.id))!.status).toBe("confirmed");
    expect((await db.sessions.bulkGet(sessionIds)).filter(Boolean)).toHaveLength(2);

    const [cancellation] = await listInvoiceCancellations();
    expect(cancellation).toMatchObject({ kind: "report", paymentId, reportId: report.id, sessionCount: 2 });
  });

  it("pemulihan mengembalikan tagihan tanpa menyentuh laporan (pengecualian G1)", async () => {
    const { report } = await seedReportInvoice();
    const paymentId = await soleInvoiceForReport(report.id);
    const beforePayment = (await db.payments.get(paymentId))!;

    await cancelReportInvoice(paymentId);
    const [cancellation] = await listInvoiceCancellations();
    const result = await restoreCancelledInvoice(cancellation.snapshotId);

    expect(result).toEqual({ status: "restored", kind: "report" });
    expect(await db.payments.get(paymentId)).toEqual(beforePayment);
    expect((await db.reports.get(report.id))!.status).toBe("confirmed");
    // Setelah dipulihkan, laporan tidak lagi muncul di "Siap ditagih".
    expect(await listInvoiceCancellations()).toHaveLength(0);
  });

  it("menolak batal untuk laporan legacy tanpa status final eksplisit (D3)", async () => {
    const { report } = await seedReportInvoice("legacy");
    const paymentId = await soleInvoiceForReport(report.id);
    await db.reports.update(report.id, { status: undefined });

    await expect(cancelReportInvoice(paymentId)).rejects.toThrow("final eksplisit");
    await expect(db.payments.get(paymentId)).resolves.toBeDefined();
    expect(await listInvoiceCancellations()).toHaveLength(0);
  });

  it("menolak batal untuk tagihan lunas, nominal manual, tagihan paket, dan bukan tagihan laporan", async () => {
    const { report } = await seedReportInvoice("guards");
    const paymentId = await soleInvoiceForReport(report.id);

    await db.payments.update(paymentId, { status: "PAID", paidAt: "2026-06-01" });
    await expect(cancelReportInvoice(paymentId)).rejects.toThrow("lunas atau diedit manual");
    await db.payments.update(paymentId, { status: "UNPAID", paidAt: undefined });

    await db.payments.update(paymentId, { source: "manual" });
    await expect(cancelReportInvoice(paymentId)).rejects.toThrow("lunas atau diedit manual");
    await db.payments.update(paymentId, { source: "auto" });

    const packageId = "pkg-guard";
    await db.students.add(student(packageId));
    await db.sessions.bulkAdd([session("pkg-guard-1", packageId, "2026-05-01"), session("pkg-guard-2", packageId, "2026-05-02")]);
    const issued = await createSessionCountInvoice(packageId);
    await expect(cancelReportInvoice(issued.paymentId)).rejects.toThrow("antrean paket");

    await expect(cancelReportInvoice("tidak-ada")).rejects.toThrow("Tagihan tidak ditemukan");
    await expect(db.payments.get(paymentId)).resolves.toBeDefined();
  });

  it("pemulihan ditolak bila laporan sudah terbit ulang (G3)", async () => {
    const { report } = await seedReportInvoice("reissue");
    const paymentId = await soleInvoiceForReport(report.id);
    await cancelReportInvoice(paymentId);
    const [cancellation] = await listInvoiceCancellations();

    const reissued = await syncReportPayment(report);
    void reissued;

    await expect(restoreCancelledInvoice(cancellation.snapshotId))
      .rejects.toThrow("laporan ini sudah punya tagihan lain");
    await expect(db.payments.get(paymentId)).resolves.toBeUndefined();
    expect(await db.payments.count()).toBe(1);
  });

  it("pemulihan ditolak bila cakupan sesi laporan sudah berubah (G4)", async () => {
    const { report, sessionIds } = await seedReportInvoice("drift");
    const paymentId = await soleInvoiceForReport(report.id);
    await cancelReportInvoice(paymentId);
    const [cancellation] = await listInvoiceCancellations();

    await db.reports.update(report.id, { sessionIds: [sessionIds[0]] });

    await expect(restoreCancelledInvoice(cancellation.snapshotId))
      .rejects.toThrow("cakupan sesi laporan sudah berubah");
    await expect(db.payments.get(paymentId)).resolves.toBeUndefined();
  });

  it("pemulihan ditolak bila laporan lain sudah memakai sesi yang sama (G1)", async () => {
    const { report, studentId, sessionIds } = await seedReportInvoice("overlap");
    const paymentId = await soleInvoiceForReport(report.id);
    await cancelReportInvoice(paymentId);
    const [cancellation] = await listInvoiceCancellations();

    // Draft (belum final) dengan sesi yang tumpang tindih — tetap menolak,
    // karena sesi itu sudah diklaim ringkasan lain.
    await upsertReport({
      ...confirmedReport(`${report.id}-draft`, studentId, [sessionIds[0]]),
      status: "draft",
      totalCost: RATE,
      totalHours: 1,
    });

    await expect(restoreCancelledInvoice(cancellation.snapshotId))
      .rejects.toThrow("sudah tercakup laporan lain");
    await expect(db.payments.get(paymentId)).resolves.toBeUndefined();
  });
});

describe("tagihan manual (L4)", () => {
  it("hapus → pulihkan mengembalikan tagihan identik (nominal, tanggal, ID)", async () => {
    await db.students.add(student("man", "manual", undefined));
    const paymentId = await createManualPayment({
      studentId: "man", month: "2026-04", totalCost: 450_000, status: "UNPAID",
    });
    const before = (await db.payments.get(paymentId))!;

    await deleteManualPayment(paymentId);
    expect(await db.payments.get(paymentId)).toBeUndefined();

    const [cancellation] = await listInvoiceCancellations();
    expect(cancellation).toMatchObject({ kind: "manual", paymentId, totalCost: 450_000, sessionCount: 0 });

    const result = await restoreCancelledInvoice(cancellation.snapshotId);
    expect(result).toEqual({ status: "restored", kind: "manual" });
    expect(await db.payments.get(paymentId)).toEqual(before);
    expect(await listInvoiceCancellations()).toHaveLength(0);
  });

  it("menolak hapus untuk tagihan lunas dan tagihan yang terbit dari laporan", async () => {
    await db.students.add(student("man2", "manual", undefined));
    const paidId = await createManualPayment({
      studentId: "man2", month: "2026-04", totalCost: 100_000, status: "PAID", paidAt: "2026-04-10",
    });
    await expect(deleteManualPayment(paidId)).rejects.toThrow("sudah lunas");
    await expect(db.payments.get(paidId)).resolves.toBeDefined();

    const report = confirmedReport("man2-report", "man2", []);
    report.totalCost = 0;
    await db.reports.add(report);
    await db.payments.add({
      id: "man2-report-payment", studentId: "man2", month: "2026-05", totalCost: 200_000,
      status: "UNPAID", source: "auto", reportId: report.id,
    });
    await expect(deleteManualPayment("man2-report-payment")).rejects.toThrow("terbit dari laporan");
  });

  it("pemulihan ditolak bila sudah ada tagihan manual lain murid+bulan sama (G5)", async () => {
    await db.students.add(student("man3", "manual", undefined));
    const first = await createManualPayment({
      studentId: "man3", month: "2026-04", totalCost: 150_000, status: "UNPAID",
    });
    await deleteManualPayment(first);
    const [cancellation] = await listInvoiceCancellations();

    await createManualPayment({
      studentId: "man3", month: "2026-04", totalCost: 175_000, status: "UNPAID",
    });

    await expect(restoreCancelledInvoice(cancellation.snapshotId))
      .rejects.toThrow("tagihan manual lain untuk murid dan bulan ini");
    expect(await db.payments.count()).toBe(1);
  });
});

describe("jatuh tempo (L5)", () => {
  it("hanya mengubah dueAt dan mencatat audit", async () => {
    await db.students.add(student("due", "monthly", undefined));
    const sessionIds = ["due-1"];
    await db.sessions.add(session(sessionIds[0], "due", "2026-05-10"));
    const report = confirmedReport("due-report", "due", sessionIds);
    await db.reports.add(report);
    await syncReportPayment(report);
    const paymentId = await soleInvoiceForReport(report.id);
    const before = (await db.payments.get(paymentId))!;
    const reportBefore = (await db.reports.get(report.id))!;
    const sessionBefore = (await db.sessions.get(sessionIds[0]))!;

    await updatePaymentDueAt(paymentId, "2026-07-15");

    const after = (await db.payments.get(paymentId))!;
    expect(after.dueAt).toBe("2026-07-15");
    // Tidak ada field lain yang berubah.
    expect({ ...after, dueAt: undefined }).toEqual({ ...before, dueAt: undefined });
    expect(await db.reports.get(report.id)).toEqual(reportBefore);
    expect(await db.sessions.get(sessionIds[0])).toEqual(sessionBefore);

    const audits = (await db.auditLog.toArray()).filter((entry) => entry.action === "payment.due");
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ entityType: "payment", entityId: paymentId });
    expect(audits[0].details).toContain("2026-07-15");
    // Jatuh tempo bukan aksi destruktif: tidak ada snapshot pemulihan dibuat.
    expect(await listInvoiceCancellations()).toHaveLength(0);
  });

  it("menolak tanggal tidak valid, tagihan lunas, dan tagihan tidak ditemukan", async () => {
    await db.students.add(student("due2", "manual", undefined));
    const paymentId = await createManualPayment({
      studentId: "due2", month: "2026-04", totalCost: 100_000, status: "UNPAID",
    });
    const before = (await db.payments.get(paymentId))!;

    await expect(updatePaymentDueAt(paymentId, "2026-02-31")).rejects.toThrow("tidak valid");
    await expect(updatePaymentDueAt(paymentId, "31-12-2026")).rejects.toThrow("tidak valid");
    await expect(updatePaymentDueAt(paymentId, "")).rejects.toThrow("tidak valid");
    await expect(updatePaymentDueAt("tidak-ada", "2026-07-15")).rejects.toThrow("tidak ditemukan");

    await db.payments.update(paymentId, { status: "PAID", paidAt: "2026-04-10" });
    await expect(updatePaymentDueAt(paymentId, "2026-07-15")).rejects.toThrow("belum dibayar");

    expect(await db.payments.get(paymentId)).toEqual({ ...before, status: "PAID", paidAt: "2026-04-10" });
    expect((await db.auditLog.toArray()).filter((entry) => entry.action === "payment.due")).toHaveLength(0);
  });
});

describe("total laporan final dibekukan (L6 / D6)", () => {
  it("draft boleh dihitung ulang, final tidak", () => {
    const live = { sessionIds: ["a", "b", "c"], totalHours: 3, totalCost: 300_000 };
    const draft = confirmedReport("r-draft", "s", ["a"], { status: "draft", totalCost: 100_000, totalHours: 1 });
    const final = confirmedReport("r-final", "s", ["a"], { totalCost: 100_000, totalHours: 1 });

    expect(frozenReportTotals(draft, live)).toEqual(live);
    expect(frozenReportTotals(final, live)).toEqual({
      sessionIds: ["a"], totalHours: 1, totalCost: 100_000,
    });
    // Laporan legacy tanpa status diperlakukan sama seperti final.
    const legacy = { ...final, status: undefined };
    expect(frozenReportTotals(legacy, live)).toEqual({
      sessionIds: ["a"], totalHours: 1, totalCost: 100_000,
    });
  });

  it("deteksi penyimpangan dipakai untuk memberi tahu tutor", () => {
    const frozen = { sessionIds: ["a", "b"], totalHours: 2, totalCost: 200_000 };
    expect(reportTotalsDrifted(frozen, { sessionIds: ["a", "b"], totalHours: 2, totalCost: 200_000 })).toBe(false);
    expect(reportTotalsDrifted(frozen, { sessionIds: ["a", "b"], totalHours: 2, totalCost: 250_000 })).toBe(true);
    expect(reportTotalsDrifted(frozen, { sessionIds: ["a"], totalHours: 1, totalCost: 100_000 })).toBe(true);
    expect(reportTotalsDrifted(frozen, { sessionIds: ["a", "c"], totalHours: 2, totalCost: 200_000 })).toBe(true);
  });

  it("jalur rekap (J1) tidak menulis ulang total laporan yang sudah final", async () => {
    await db.students.add(student("d6", "monthly", undefined));
    const sessionIds = ["d6-1", "d6-2"];
    await db.sessions.bulkAdd([
      session(sessionIds[0], "d6", "2026-05-10"),
      session(sessionIds[1], "d6", "2026-05-12"),
    ]);
    const report = confirmedReport("d6-report", "d6", sessionIds);
    await db.reports.add(report);
    await syncReportPayment(report);

    // Simulasi J1: sesi dihitung ulang dengan angka berbeda (mis. repricing).
    const live = { sessionIds, totalHours: 2, totalCost: 999_000 };
    const frozen = frozenReportTotals((await db.reports.get(report.id))!, live);
    await upsertReport({ ...(await db.reports.get(report.id))!, ...frozen });

    const stored = (await db.reports.get(report.id))!;
    expect(stored.totalCost).toBe(2 * RATE);
    expect(stored.totalHours).toBe(2);
    expect(stored.sessionIds).toEqual(sessionIds);
    // Nominal yang sudah dibagikan tidak ikut berubah.
    const paymentId = await soleInvoiceForReport(report.id);
    expect((await db.payments.get(paymentId))!.totalCost).toBe(2 * RATE);

    // Draft tetap boleh dihitung ulang.
    const draft = confirmedReport("d6-draft", "d6", ["d6-3"], { status: "draft", totalCost: RATE, totalHours: 1 });
    await db.reports.add(draft);
    const liveDraft = { sessionIds: ["d6-3", "d6-4"], totalHours: 2, totalCost: 2 * RATE };
    const draftFrozen = frozenReportTotals((await db.reports.get(draft.id))!, liveDraft);
    await upsertReport({ ...(await db.reports.get(draft.id))!, ...draftFrozen });
    expect((await db.reports.get(draft.id))!).toMatchObject({ totalCost: 2 * RATE, totalHours: 2 });
  });
});
