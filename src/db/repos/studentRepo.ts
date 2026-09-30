// ── Students Repository ────────────────────────────────────────────

import { db } from "../db";
import type { Student, Session } from "../types";
import { billingPolicyOf } from "../types";
import { isBillableSession, sessionCost } from "./sessionRepo";
import { logAudit } from "./auditRepo";
import { packageCoveredSessionIds } from "./helpers";

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
  /**
   * D1(c) — tarif historis dibekukan secara default. Set `true` HANYA setelah
   * tutor menyetujui secara eksplisit bahwa sesi yang belum ditagih ikut memakai
   * tarif baru. Tanpa flag ini, edit tarif tidak pernah menyentuh sesi lama.
   */
  repriceUnbilledSessions?: boolean;
}

export async function listUnbilledBillableSessions(studentId: string): Promise<Session[]> {
  const [sessions, reports, payments] = await Promise.all([
    db.sessions.where({ studentId }).toArray(),
    db.reports.where({ studentId }).toArray(),
    db.payments.where({ studentId }).toArray(),
  ]);
  const coveredIds = packageCoveredSessionIds(reports, payments);
  return sessions.filter((session) => isBillableSession(session) && !coveredIds.has(session.id));
}

export async function countUnbilledBillableSessions(studentId: string): Promise<number> {
  return (await listUnbilledBillableSessions(studentId)).length;
}

interface RepriceOutcome {
  count: number;
  sessionIds: string[];
  rateFromHistogram: Record<string, number>;
}

/**
 * D1(c) — satu-satunya jalur yang boleh menulis `rateSnapshot`/`cost`/`updatedAt`
 * sesi lama. Selalu dipanggil di dalam transaksi dan hanya setelah persetujuan
 * eksplisit tutor (centang retroaktif atau peralihan siklus ke paket).
 *
 * Aturan yang dipegang:
 * - sesi ber-`costOverride` dilewati: harga yang sudah disepakati manual tidak
 *   boleh ditebak ulang (sifat W8 lama menghapusnya tanpa pesan);
 * - sesi yang tarifnya sudah sama TIDAK ditulis sama sekali, sehingga `updatedAt`
 *   tidak melompat hanya karena profil murid disimpan;
 * - sesi yang sudah tercakup paket/invoice tidak pernah muncul di daftar ini.
 *
 * Audit ditulis oleh pemanggil sebagai SATU entri per batch berisi histogram
 * tarif lama, karena sesi terdampak bisa berangkat dari tarif yang berbeda-beda.
 */
async function repriceUnbilledSessions(
  studentId: string,
  rate: number,
  perSession: boolean,
): Promise<RepriceOutcome> {
  const unbilled = await listUnbilledBillableSessions(studentId);
  const now = timestamp();
  const sessionIds: string[] = [];
  const rateFromHistogram: Record<string, number> = {};
  for (const session of unbilled) {
    if (session.costOverride != null) continue;
    const nextCost = sessionCost(rate, session.durationHours, perSession);
    if (session.rateSnapshot === rate && session.cost === nextCost) continue;
    const previousRate = String(session.rateSnapshot);
    rateFromHistogram[previousRate] = (rateFromHistogram[previousRate] ?? 0) + 1;
    sessionIds.push(session.id);
    await db.sessions.update(session.id, { rateSnapshot: rate, cost: nextCost, updatedAt: now });
  }
  return { count: sessionIds.length, sessionIds, rateFromHistogram };
}

export async function updateStudent(
  id: string,
  patch: Partial<Student>,
  options: StudentBillingUpdateOptions = {},
): Promise<void> {
  await db.transaction("rw", db.students, db.sessions, db.reports, db.payments, db.auditLog, async () => {
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
    // ── D1(c): tarif historis dibekukan ───────────────────────────────────
    // Dua jalur eksplisit yang boleh menulis ulang tarif sesi lama:
    //   (i) peralihan siklus ke paket dengan centang `includeExistingUnbilledInPackage`;
    //   (ii) konfirmasi perubahan tarif (`repriceUnbilledSessions`).
    // Di luar itu, menyimpan profil murid TIDAK menyentuh `rateSnapshot`, `cost`,
    // maupun `updatedAt` sesi mana pun (gejala W8 lama).
    const approvedReprice = options.repriceUnbilledSessions === true
      || (options.includeExistingUnbilledInPackage === true && fromPolicy !== toPolicy);
    if (approvedReprice) {
      const rateTo = patch.hourlyRate ?? existing.hourlyRate;
      const outcome = await repriceUnbilledSessions(id, rateTo, toPolicy === "session_count");
      if (outcome.count > 0) {
        // Audit di dalam transaksi: repricing tanpa jejak tidak boleh terjadi.
        await db.auditLog.add({
          id: crypto.randomUUID(),
          action: "session.reprice",
          entityType: "student",
          entityId: id,
          timestamp: timestamp(),
          details: JSON.stringify({
            rateTo,
            perSession: toPolicy === "session_count",
            count: outcome.count,
            sessionIds: outcome.sessionIds,
            rateFromHistogram: outcome.rateFromHistogram,
          }),
        });
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
    db.iaeeProjects, db.studyNotes, db.captureDrafts,
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
    await db.captureDrafts.where({ studentId: id }).delete();
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
