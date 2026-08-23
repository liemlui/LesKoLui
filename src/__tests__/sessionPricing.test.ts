import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import { createStudent, updateStudent } from "../db/repos/studentRepo";
import { createSession, scheduleSession, markSessionDone, updateSession } from "../db/repos/sessionRepo";
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
