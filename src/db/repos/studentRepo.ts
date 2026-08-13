// ── Students Repository ────────────────────────────────────────────

import { db } from "../db";
import type { Student } from "../types";
import { billingPolicyOf, reportStatus } from "../types";
import { isBillableSession } from "./sessionRepo";
import { logAudit } from "./auditRepo";

export async function listStudents(activeOnly?: boolean): Promise<Student[]> {
  const coll = db.students.orderBy("name");
  if (activeOnly) {
    return coll.filter((s) => s.active).toArray();
  }
  return coll.toArray();
}

export async function getStudent(id: string): Promise<Student | undefined> {
  return db.students.get(id);
}

export async function createStudent(input: Omit<Student, "id">): Promise<string> {
  const id = crypto.randomUUID();
  await db.students.add({ ...input, id });
  return id;
}

export interface StudentBillingUpdateOptions {
  includeExistingUnbilledInPackage?: boolean;
  deferSessionCountPolicyChange?: boolean;
}

async function countUnbilledBillableSessions(studentId: string): Promise<number> {
  const [sessions, reports] = await Promise.all([
    db.sessions.where({ studentId }).toArray(),
    db.reports.where({ studentId }).toArray(),
  ]);
  const coveredIds = new Set(
    reports
      .filter((report) => reportStatus(report) === "confirmed")
      .flatMap((report) => report.sessionIds),
  );
  return sessions.filter((session) => isBillableSession(session) && !coveredIds.has(session.id)).length;
}

export async function updateStudent(
  id: string,
  patch: Partial<Student>,
  options: StudentBillingUpdateOptions = {},
): Promise<void> {
  await db.transaction("rw", db.students, db.sessions, db.reports, async () => {
    const existing = await db.students.get(id);
    if (!existing) return;
    const fromPolicy = billingPolicyOf(existing);
    const toPolicy = billingPolicyOf({ billingPolicy: patch.billingPolicy ?? existing.billingPolicy });
    if (fromPolicy !== toPolicy && (fromPolicy === "session_count" || toPolicy === "session_count")) {
      const unbilledCount = await countUnbilledBillableSessions(id);
      if (unbilledCount > 0 && fromPolicy === "session_count") {
        if (!options.deferSessionCountPolicyChange) {
          throw new Error("Selesaikan atau buat tagihan penutup untuk sesi paket yang belum ditagih terlebih dahulu");
        }
        if (toPolicy === "session_count") return;
        await db.students.update(id, {
          ...patch,
          billingPolicy: "session_count",
          billingSessionCount: existing.billingSessionCount,
          pendingBillingPolicy: toPolicy,
        });
        return;
      }
      if (unbilledCount > 0 && toPolicy === "session_count" && !options.includeExistingUnbilledInPackage) {
        throw new Error("Ada sesi lama yang belum ditagih; konfirmasi agar sesi tersebut masuk antrean paket");
      }
    }
    await db.students.update(id, {
      ...patch,
      pendingBillingPolicy: patch.billingPolicy === "session_count" || fromPolicy !== toPolicy
        ? undefined
        : existing.pendingBillingPolicy,
    });
  });
}

export async function deleteStudent(id: string): Promise<void> {
  const student = await db.students.get(id);
  const tables = [
    db.students, db.sessions, db.reports,
    db.payments, db.followUps, db.raporGrades,
    db.iaeeProjects, db.studyNotes,
  ];
  await db.transaction("rw", tables, async () => {
    await db.students.delete(id);
    await db.sessions.where({ studentId: id }).delete();
    await db.reports.where({ studentId: id }).delete();
    await db.payments.where({ studentId: id }).delete();
    await db.followUps.where({ studentId: id }).delete();
    await db.raporGrades.where({ studentId: id }).delete();
    await db.iaeeProjects.where({ studentId: id }).delete();
    await db.studyNotes.where({ studentId: id }).delete();
  });
  await logAudit("student.delete", "student", id, student?.name);
}

// ── Rapor Grades ───────────────────────────────────────────────────

import type { RaporGrade } from "../types";
import { timestamp } from "./helpers";

export async function listRaporGrades(studentId: string): Promise<RaporGrade[]> {
  return db.raporGrades
    .where({ studentId })
    .sortBy("semester");
}

export async function upsertRaporGrade(
  grade: Omit<RaporGrade, "id" | "createdAt">
): Promise<void> {
  const existing = await db.raporGrades
    .where({ studentId: grade.studentId })
    .filter((r) => r.semester === grade.semester)
    .first();
  if (existing) {
    await db.raporGrades.update(existing.id, grade);
  } else {
    await db.raporGrades.add({ ...grade, id: crypto.randomUUID(), createdAt: timestamp() });
  }
}

export async function deleteRaporGrade(id: string): Promise<void> {
  await db.raporGrades.delete(id);
}
