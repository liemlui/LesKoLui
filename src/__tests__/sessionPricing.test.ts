import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import { createStudent, updateStudent } from "../db/repos/studentRepo";
import { createSession, scheduleSession, markSessionDone, updateSession, scheduleBatch, updateSeriesSessions } from "../db/repos/sessionRepo";
import { createSessionCountInvoice } from "../db/repos/paymentRepo";
import type { Student } from "../db/types";

const RATE = 200_000;

function makeStudent(billingPolicy: Student["billingPolicy"]): Omit<Student, "id"> {
  return {
    name: "Siswa Pricing",
    level: "MYP",
    subjects: ["Math"],
    parentContact: { phone: "0800000000" },
    hourlyRate: RATE,
    billingPolicy,
    billingSessionCount: billingPolicy === "session_count" ? 10 : undefined,
    active: true,
    enrolledAt: "2026-01-01",
  };
}

beforeEach(async () => {
  await db.students.clear();
  await db.sessions.clear();
  await db.reports.clear();
  await db.payments.clear();
  await db.auditLog.clear();
});

describe("per-meeting pricing (session_count)", () => {
  it("charges a flat rate per meeting when recording a session_count session", async () => {
    const sid = await createStudent(makeStudent("session_count"));
    const sessionId = await createSession({
      studentId: sid, date: "2026-05-20", durationHours: 1.5,
      subjects: ["Math"], shortNote: "", status: "DONE",
    });
    const s = await db.sessions.get(sessionId);
    expect(s!.cost).toBe(RATE); // flat, not 1.5 × RATE
  });

  it("keeps hourly pricing for monthly students", async () => {
    const sid = await createStudent(makeStudent("monthly"));
    const sessionId = await createSession({
      studentId: sid, date: "2026-05-20", durationHours: 1.5,
      subjects: ["Math"], shortNote: "", status: "DONE",
    });
    const s = await db.sessions.get(sessionId);
    expect(s!.cost).toBe(Math.round(1.5 * RATE));
  });

  it("schedules at a flat rate for session_count students", async () => {
    const sid = await createStudent(makeStudent("session_count"));
    const sessionId = await scheduleSession({ studentId: sid, date: "2026-06-01", durationHours: 1.5 });
    const s = await db.sessions.get(sessionId);
    expect(s!.cost).toBe(RATE);
  });

  it("applies the flat rate when marking a scheduled session done", async () => {
    const sid = await createStudent(makeStudent("session_count"));
    const sessionId = await scheduleSession({ studentId: sid, date: "2026-06-01", durationHours: 1.5 });
    await markSessionDone(sessionId, { shortNote: "ok", durationHours: 2 });
    const s = await db.sessions.get(sessionId);
    expect(s!.status).toBe("DONE");
    expect(s!.cost).toBe(RATE);
  });

  it("applies the flat rate when the duration is edited", async () => {
    const sid = await createStudent(makeStudent("session_count"));
    const sessionId = await scheduleSession({ studentId: sid, date: "2026-06-01", durationHours: 1.5 });
    await updateSession(sessionId, { durationHours: 3 });
    const s = await db.sessions.get(sessionId);
    expect(s!.cost).toBe(RATE);
  });

  it("re-prices existing unbilled sessions when switching to session_count", async () => {
    const sid = await createStudent(makeStudent("monthly"));
    const a = await createSession({ studentId: sid, date: "2026-05-20", durationHours: 1.5, subjects: ["Math"], shortNote: "", status: "DONE" });
    const b = await createSession({ studentId: sid, date: "2026-05-21", durationHours: 2, subjects: ["Math"], shortNote: "", status: "DONE" });

    // hourly cost before the switch
    expect((await db.sessions.get(a))!.cost).toBe(Math.round(1.5 * RATE));
    expect((await db.sessions.get(b))!.cost).toBe(Math.round(2 * RATE));

    await updateStudent(
      sid,
      { billingPolicy: "session_count", billingSessionCount: 10 },
      { includeExistingUnbilledInPackage: true },
    );

    expect((await db.sessions.get(a))!.cost).toBe(RATE);
    expect((await db.sessions.get(b))!.cost).toBe(RATE);
  });
});

// ── TASK-10 L1 / D1(c): tarif historis dibekukan ────────────────────────────
// Default = tarif lama tidak tersentuh. Retroaktif hanya lewat jalur eksplisit
// dan selalu meninggalkan jejak audit.
describe("tarif historis beku (D1(c))", () => {
  const NEW_RATE = 250_000;

  it("menyimpan profil murid paket tanpa ubah tarif tidak menyentuh sesi", async () => {
    const sid = await createStudent(makeStudent("session_count"));
    const sessionId = await createSession({
      studentId: sid, date: "2026-05-20", durationHours: 1.5,
      subjects: ["Math"], shortNote: "", status: "DONE",
    });
    const before = (await db.sessions.get(sessionId))!;

    await updateStudent(sid, {
      name: "Siswa Pricing", hourlyRate: RATE, billingPolicy: "session_count",
      billingSessionCount: 10, subjects: ["Math"], parentContact: { phone: "0800000000" },
      active: true, level: "MYP", enrolledAt: "2026-01-01",
    });

    const after = (await db.sessions.get(sessionId))!;
    expect(after.rateSnapshot).toBe(before.rateSnapshot);
    expect(after.cost).toBe(before.cost);
    expect(after.updatedAt).toBe(before.updatedAt);
    expect(await db.auditLog.count()).toBe(0);
  });

  it("perubahan tarif tanpa konfirmasi tidak retroaktif untuk murid bulanan maupun paket", async () => {
    const monthly = await createStudent(makeStudent("monthly"));
    const monthlySession = await createSession({
      studentId: monthly, date: "2026-05-20", durationHours: 2,
      subjects: ["Math"], shortNote: "", status: "DONE",
    });
    await updateStudent(monthly, { hourlyRate: NEW_RATE });
    const afterMonthly = (await db.sessions.get(monthlySession))!;
    expect(afterMonthly.rateSnapshot).toBe(RATE);
    expect(afterMonthly.cost).toBe(Math.round(2 * RATE));

    const packageId = await createStudent(makeStudent("session_count"));
    const packageSession = await createSession({
      studentId: packageId, date: "2026-05-20", durationHours: 2,
      subjects: ["Math"], shortNote: "", status: "DONE",
    });
    await updateStudent(packageId, { hourlyRate: NEW_RATE });
    const afterPackage = (await db.sessions.get(packageSession))!;
    expect(afterPackage.rateSnapshot).toBe(RATE);
    expect(afterPackage.cost).toBe(RATE);

    expect((await db.students.get(monthly))!.hourlyRate).toBe(NEW_RATE);
    // Sesi BARU memakai tarif terbaru.
    const fresh = await createSession({
      studentId: monthly, date: "2026-06-01", durationHours: 2,
      subjects: ["Math"], shortNote: "", status: "DONE",
    });
    expect((await db.sessions.get(fresh))!.cost).toBe(Math.round(2 * NEW_RATE));
    expect(await db.auditLog.count()).toBe(0);
  });
});

describe("repricing eksplisit (D1(c))", () => {
  const NEW_RATE = 250_000;

  it("mengubah sesi lama dan mencatat satu audit per batch", async () => {
    const sid = await createStudent(makeStudent("monthly"));
    const a = await createSession({
      studentId: sid, date: "2026-05-20", durationHours: 1.5,
      subjects: ["Math"], shortNote: "", status: "DONE",
    });
    const b = await createSession({
      studentId: sid, date: "2026-05-21", durationHours: 2,
      subjects: ["Math"], shortNote: "", status: "DONE",
    });

    await updateStudent(sid, { hourlyRate: NEW_RATE }, { repriceUnbilledSessions: true });

    expect((await db.sessions.get(a))!.cost).toBe(Math.round(1.5 * NEW_RATE));
    expect((await db.sessions.get(b))!.cost).toBe(Math.round(2 * NEW_RATE));
    expect((await db.sessions.get(a))!.rateSnapshot).toBe(NEW_RATE);

    const audits = await db.auditLog.toArray();
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ action: "session.reprice", entityType: "student", entityId: sid });
    const details = JSON.parse(audits[0].details ?? "{}");
    expect(details).toMatchObject({
      rateTo: NEW_RATE,
      perSession: false,
      count: 2,
      // Sesi terdampak boleh berangkat dari tarif lama yang berbeda-beda —
      // jangan dicatat seolah semua berawal dari satu tarif.
      rateFromHistogram: { [String(RATE)]: 2 },
    });
    expect(details.sessionIds.sort()).toEqual([a, b].sort());
  });

  it("retroaktif per-pertemuan memakai tarif flat dan melewati sesi ber-costOverride", async () => {
    const sid = await createStudent(makeStudent("session_count"));
    const plain = await createSession({
      studentId: sid, date: "2026-05-20", durationHours: 2,
      subjects: ["Math"], shortNote: "", status: "DONE",
    });
    const overridden = await createSession({
      studentId: sid, date: "2026-05-21", durationHours: 1,
      subjects: ["Math"], shortNote: "", status: "DONE",
    });
    await updateSession(overridden, { costOverride: 175_000 });

    await updateStudent(sid, { hourlyRate: NEW_RATE }, { repriceUnbilledSessions: true });

    expect((await db.sessions.get(plain))!.cost).toBe(NEW_RATE);
    expect((await db.sessions.get(overridden))!.cost).toBe(175_000);
    expect((await db.sessions.get(overridden))!.costOverride).toBe(175_000);
    const details = JSON.parse((await db.auditLog.toArray())[0].details ?? "{}");
    expect(details.count).toBe(1);
    expect(details.sessionIds).toEqual([plain]);
  });

  it("tidak menyentuh sesi yang sudah tercakup tagihan paket", async () => {
    const sid = await createStudent(makeStudent("session_count"));
    const a = await createSession({
      studentId: sid, date: "2026-05-20", durationHours: 1,
      subjects: ["Math"], shortNote: "", status: "DONE",
    });
    const b = await createSession({
      studentId: sid, date: "2026-05-21", durationHours: 1,
      subjects: ["Math"], shortNote: "", status: "DONE",
    });
    const free = await createSession({
      studentId: sid, date: "2026-05-22", durationHours: 1,
      subjects: ["Math"], shortNote: "", status: "DONE",
    });
    // Kuota 2 pertemuan agar dua sesi tertua membentuk satu paket penuh.
    await updateStudent(sid, { billingSessionCount: 2 });
    await createSessionCountInvoice(sid);

    await updateStudent(sid, { hourlyRate: NEW_RATE }, { repriceUnbilledSessions: true });

    expect((await db.sessions.get(a))!.cost).toBe(RATE);
    expect((await db.sessions.get(b))!.cost).toBe(RATE);
    expect((await db.sessions.get(free))!.cost).toBe(NEW_RATE);
    const reprices = (await db.auditLog.toArray()).filter((entry) => entry.action === "session.reprice");
    expect(reprices).toHaveLength(1);
    const details = JSON.parse(reprices[0].details ?? "{}");
    expect(details.sessionIds).toEqual([free]);
    expect(details.perSession).toBe(true);
  });

  it("idempoten: menyimpan ulang tarif yang sama tidak menulis apa pun", async () => {
    const sid = await createStudent(makeStudent("monthly"));
    const sessionId = await createSession({
      studentId: sid, date: "2026-05-20", durationHours: 1,
      subjects: ["Math"], shortNote: "", status: "DONE",
    });
    await updateStudent(sid, { hourlyRate: NEW_RATE }, { repriceUnbilledSessions: true });
    const first = (await db.sessions.get(sessionId))!;

    await updateStudent(sid, { hourlyRate: NEW_RATE }, { repriceUnbilledSessions: true });
    const second = (await db.sessions.get(sessionId))!;
    expect(second.updatedAt).toBe(first.updatedAt);
    expect(await db.auditLog.count()).toBe(1);
  });

  it("edit durasi seri melepas override manual — sama seperti edit tunggal (W3/W7)", async () => {
    const sid = await createStudent(makeStudent("monthly"));
    await scheduleBatch([
      { studentId: sid, date: "2026-07-07", time: "15:00", durationHours: 1.5 },
      { studentId: sid, date: "2026-07-14", time: "15:00", durationHours: 1.5 },
    ], "seri-1");
    const rows = (await db.sessions.where({ studentId: sid }).toArray()).sort((a, b) => a.date.localeCompare(b.date));
    expect(rows).toHaveLength(2);

    // Edit tunggal (W3) → override dilepas.
    await updateSession(rows[0].id, { costOverride: 175_000 });
    await updateSession(rows[0].id, { durationHours: 2 });
    const single = (await db.sessions.get(rows[0].id))!;
    expect(single.costOverride).toBeUndefined();
    expect(single.cost).toBe(Math.round(2 * RATE));

    // Edit seri (W7) → perilaku yang sama.
    await updateSession(rows[1].id, { costOverride: 180_000 });
    await updateSeriesSessions({ id: rows[1].id, seriesId: "seri-1", date: rows[1].date }, { durationHours: 3 }, "all");
    const series = (await db.sessions.get(rows[1].id))!;
    expect(series.costOverride).toBeUndefined();
    expect(series.cost).toBe(Math.round(3 * RATE));
  });
});

/**
 * Perbaikan 2026-10-05 (temuan penyelidikan alur Beranda).
 *
 * Kontrak yang dijaga: **memindahkan sesi ke murid lain atau menggeser jamnya tidak
 * boleh menghapus nominal manual tutor.** Patch itu persis yang dikirim sheet
 * "Kelola sesi" lewat `patchUbahJadwal()` — tanpa `durationHours` selama durasinya
 * tidak berubah.
 *
 * Sengaja **tidak** ada tes yang mengunci kebalikannya ("mengirim durasi yang sama
 * tetap menghapus override"), karena tes seperti itu akan gagal begitu repo ini
 * membaik — pelajaran yang sudah tercatat di `topicCoverage.test.ts`.
 */
describe("ubah jadwal tanpa menyentuh nominal", () => {
  it("ganti murid + geser jam tanpa mengirim durasi mempertahankan nominal manual", async () => {
    const muridA = await createStudent(makeStudent("monthly"));
    const muridB = await createStudent({ ...makeStudent("monthly"), name: "Siswa Pindahan" });
    const sid = await createSession({
      studentId: muridA, date: "2026-05-20", durationHours: 2,
      subjects: ["Math"], shortNote: "", status: "SCHEDULED",
    });
    await updateSession(sid, { costOverride: 175_000 });

    await updateSession(sid, { studentId: muridB, time: "15:00" });

    const s = (await db.sessions.get(sid))!;
    expect(s.studentId).toBe(muridB);
    expect(s.time).toBe("15:00");
    expect(s.costOverride).toBe(175_000);
    expect(s.cost).toBe(175_000);
  });
});

