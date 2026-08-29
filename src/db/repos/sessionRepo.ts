// ── Sessions Repository ────────────────────────────────────────────
// CRUD sessions, scheduling, conflicts, photo maintenance, streak.

import { db } from "../db";
import type { Payment, Session } from "../types";
import { MIN_DURATION, DURATION_STEP, reportStatus, billingPolicyOf } from "../types";
import { timestamp, nowTimeWIB, subtractHoursFromTime, monthRange, timeToMin } from "./helpers";
import { todayWIB } from "../../lib/format";
import { logAudit } from "./auditRepo";

// ── Photo maintenance ──────────────────────────────────────────────

export async function countSessionPhotos(beforeDate?: string): Promise<number> {
  let n = 0;
  await db.sessions.each((s) => {
    if (s.photo && (!beforeDate || s.date < beforeDate)) n++;
  });
  return n;
}

export async function pruneSessionPhotosBefore(beforeDate: string): Promise<number> {
  let pruned = 0;
  await db.transaction("rw", db.sessions, async () => {
    await db.sessions.where("date").below(beforeDate).modify((s) => {
      if (s.photo) { delete s.photo; s.updatedAt = timestamp(); pruned++; }
    });
  });
  if (pruned > 0) await logAudit("photos.prune", "data", undefined, `${pruned} foto sesi < ${beforeDate} dihapus`);
  return pruned;
}

// ── Session CRUD ───────────────────────────────────────────────────

// ── Pricing ─────────────────────────────────────────────────────────
// Per-meeting billing (session_count) charges a flat rate per meeting;
// everyone else charges by duration (rate × hours).
function sessionCost(rate: number, durationHours: number, perSession: boolean): number {
  return perSession ? Math.round(rate) : Math.round(durationHours * rate);
}

async function isPerSessionStudent(studentId: string): Promise<boolean> {
  const student = await db.students.get(studentId);
  return student != null && billingPolicyOf(student) === "session_count";
}

export async function createSession(
  input: Omit<Session, "id" | "rateSnapshot" | "cost" | "createdAt" | "updatedAt">
): Promise<string> {
  const student = await db.students.get(input.studentId);
  if (!student) throw new Error("Student not found");

  if (input.durationHours < MIN_DURATION) {
    throw new Error(`Duration must be >= ${MIN_DURATION} hours`);
  }
  if (input.durationHours % DURATION_STEP !== 0) {
    throw new Error(`Duration must be multiple of ${DURATION_STEP}`);
  }

  const id = crypto.randomUUID();
  const now = timestamp();
  const rateSnapshot = student.hourlyRate;
  const cost = sessionCost(rateSnapshot, input.durationHours, billingPolicyOf(student) === "session_count");

  const tout = input.status === "DONE" ? nowTimeWIB() : undefined;
  const tin  = tout ? subtractHoursFromTime(tout, input.durationHours) : undefined;

  const session: Session = {
    ...input,
    id,
    rateSnapshot,
    cost,
    timeIn:  input.timeIn  ?? tin,
    timeOut: input.timeOut ?? tout,
    createdAt: now,
    updatedAt: now,
  };
  await db.sessions.add(session);
  return id;
}

export async function markSessionDone(
  id: string,
  data: {
    subjects?: string[];
    photo?: Blob;
    shortNote: string;
    mood?: string;
    topic?: string;
    needsWork?: string;
    predictedGrade?: string;
    situasiNote?: string;
    engagement?: Session["engagement"];
    behaviorTags?: string[];
    responseTag?: string;
    signature?: Blob;
    durationHours?: number;
  }
): Promise<void> {
  const session = await db.sessions.get(id);
  if (!session) throw new Error("Session not found");
  const duration = data.durationHours ?? session.durationHours;
  const perSession = await isPerSessionStudent(session.studentId);
  const tout = nowTimeWIB();
  const tin  = subtractHoursFromTime(tout, duration);
  await db.sessions.update(id, {
    ...data,
    durationHours: duration,
    cost: sessionCost(session.rateSnapshot, duration, perSession),
    timeIn:  session.timeIn  ?? tin,
    timeOut: session.timeOut ?? tout,
    status: "DONE",
    updatedAt: timestamp(),
  });
}

export async function listPastScheduledSessions(beforeDate: string): Promise<Session[]> {
  return db.sessions
    .where("date").below(beforeDate)
    .and((s) => s.status === "SCHEDULED")
    .toArray();
}

export async function updateSession(id: string, patch: Partial<Session>): Promise<void> {
  if (patch.durationHours !== undefined) {
    if (patch.durationHours < MIN_DURATION) throw new Error(`Duration must be >= ${MIN_DURATION} hours`);
    if (patch.durationHours % DURATION_STEP !== 0) throw new Error(`Duration must be multiple of ${DURATION_STEP}`);
  }
  const finalPatch: Partial<Session> = { ...patch, updatedAt: timestamp() };
  if (patch.durationHours !== undefined) {
    const session = await db.sessions.get(id);
    if (session) {
      const perSession = await isPerSessionStudent(session.studentId);
      finalPatch.cost = sessionCost(session.rateSnapshot, patch.durationHours, perSession);
    }
  }
  await db.sessions.update(id, finalPatch);
}

export async function listSessionsByStudent(studentId: string): Promise<Session[]> {
  return db.sessions
    .where("studentId").equals(studentId)
    .and((s) => s.status === "DONE")
    .sortBy("date");
}

export async function listSessionsForMonth(month: string): Promise<Session[]> {
  const { start, end } = monthRange(month);
  return db.sessions
    .where("date").between(start, end, true, true)
    .and((s) => s.status === "DONE")
    .toArray();
}

/** A completed lesson, or a no-show explicitly configured to remain chargeable. */
export function isBillableSession(session: Pick<Session, "status" | "noShowBillable">): boolean {
  return session.status === "DONE" || (session.status === "NO_SHOW" && session.noShowBillable === true);
}

/** Stable order used when a billing batch must always claim the oldest work first. */
export function compareSessionsChronologically(
  a: Pick<Session, "date" | "time" | "id">,
  b: Pick<Session, "date" | "time" | "id">,
): number {
  return a.date.localeCompare(b.date)
    || (a.time ?? "").localeCompare(b.time ?? "")
    || a.id.localeCompare(b.id);
}

/** Revenue-only query; keeps chargeable no-shows out of academic lesson history. */
export async function listBillableSessionsForMonth(month: string): Promise<Session[]> {
  const { start, end } = monthRange(month);
  return db.sessions
    .where("date").between(start, end, true, true)
    .and((s) => isBillableSession(s))
    .toArray();
}

export async function listBillableSessionsByStudentMonth(studentId: string, month: string): Promise<Session[]> {
  const { start, end } = monthRange(month);
  const sessions = await db.sessions
    .where("studentId").equals(studentId)
    .and((s) => isBillableSession(s) && s.date >= start && s.date <= end)
    .toArray();
  return sessions.sort(compareSessionsChronologically);
}

/** Billing query for an arbitrary inclusive period, including chargeable no-shows. */
export async function listBillableSessionsByStudentRange(
  studentId: string, start: string, end: string
): Promise<Session[]> {
  const sessions = await db.sessions
    .where("studentId").equals(studentId)
    .and((s) => isBillableSession(s) && s.date >= start && s.date <= end)
    .toArray();
  return sessions.sort(compareSessionsChronologically);
}

/**
 * Resolve the session rows printed on an invoice.
 *
 * A report-backed payment uses the report's sessionIds as the authoritative
 * snapshot. `bulkGet` preserves the requested order, so a partial report never
 * absorbs other sessions merely because their dates overlap its period.
 * Legacy/manual payments retain the previous period/month fallback, but use
 * billing semantics (DONE + explicitly chargeable NO_SHOW). A standalone
 * manual invoice beside a report invoice intentionally has no session rows:
 * reusing the report's sessions would make the invoice look double-billed.
 */
export async function listInvoiceSessions(
  payment: Pick<Payment, "studentId" | "month" | "reportId" | "periodStart" | "periodEnd">
): Promise<Session[]> {
  if (payment.reportId) {
    const report = await db.reports.get(payment.reportId);
    if (!report) return [];
    const rows = await db.sessions.bulkGet(report.sessionIds);
    return rows.filter((session): session is Session => session !== undefined);
  }
  const hasReportInvoice = await db.payments
    .where("[studentId+month]")
    .equals([payment.studentId, payment.month])
    .filter((candidate) => Boolean(candidate.reportId))
    .count();
  if (hasReportInvoice > 0) return [];
  if (payment.periodStart && payment.periodEnd) {
    return listBillableSessionsByStudentRange(payment.studentId, payment.periodStart, payment.periodEnd);
  }
  return listBillableSessionsByStudentMonth(payment.studentId, payment.month);
}

export async function listSessionsByStudentMonth(
  studentId: string, month: string
): Promise<Session[]> {
  const { start, end } = monthRange(month);
  return db.sessions
    .where("studentId").equals(studentId)
    .and((s) => s.status === "DONE" && s.date >= start && s.date <= end)
    .sortBy("date");
}

/** Sesi DONE murid dalam rentang tanggal bebas [start, end] — dasar rekap periode. */
export async function listSessionsByStudentRange(
  studentId: string, start: string, end: string
): Promise<Session[]> {
  const sessions = await db.sessions
    .where("studentId").equals(studentId)
    .and((s) => s.status === "DONE" && s.date >= start && s.date <= end)
    .toArray();
  return sessions.sort(compareSessionsChronologically);
}

export async function listScheduledForMonth(month: string): Promise<Session[]> {
  const { start, end } = monthRange(month);
  return db.sessions
    .where("date").between(start, end, true, true)
    .and((s) => s.status === "SCHEDULED")
    .toArray();
}

export async function listAllSessionsForMonth(month: string): Promise<Session[]> {
  const { start, end } = monthRange(month);
  return db.sessions
    .where("date").between(start, end, true, true)
    .and((s) => s.status !== "CANCELLED" && s.status !== "RESCHEDULED")
    .toArray();
}

export async function listAllSessionsForWeek(weekStart: string, weekEnd: string): Promise<Session[]> {
  return db.sessions
    .where("date").between(weekStart, weekEnd, true, true)
    .and((s) => s.status !== "CANCELLED" && s.status !== "RESCHEDULED")
    .toArray();
}

export async function listDoneSessionsForDate(date: string): Promise<Session[]> {
  return db.sessions
    .where("date").equals(date)
    .and((s) => s.status === "DONE")
    .toArray();
}

export async function cancelSession(id: string, statusReason?: string): Promise<void> {
  const session = await db.sessions.get(id);
  if (!session) throw new Error("Session not found");
  if (session.status !== "SCHEDULED") throw new Error("Only scheduled sessions can be cancelled");
  await db.sessions.update(id, {
    status: "CANCELLED",
    statusReason: statusReason?.trim() || undefined,
    updatedAt: timestamp(),
  });
  await logAudit("session.cancel", "session", id, statusReason?.trim() || undefined);
}

export async function markSessionNoShow(
  id: string,
  input: { reason?: string; billable: boolean },
): Promise<void> {
  const session = await db.sessions.get(id);
  if (!session) throw new Error("Session not found");
  if (session.status !== "SCHEDULED") throw new Error("Only scheduled sessions can be marked no-show");
  await db.sessions.update(id, {
    status: "NO_SHOW",
    statusReason: input.reason?.trim() || undefined,
    noShowBillable: input.billable,
    updatedAt: timestamp(),
  });
  await logAudit(
    "session.no_show",
    "session",
    id,
    `${input.billable ? "Ditagihkan" : "Tidak ditagihkan"}${input.reason?.trim() ? ` — ${input.reason.trim()}` : ""}`,
  );
}

export async function rescheduleSession(
  id: string,
  input: { date: string; time?: string; durationHours: number; reason?: string },
): Promise<string> {
  const session = await db.sessions.get(id);
  if (!session) throw new Error("Session not found");
  if (session.status !== "SCHEDULED") throw new Error("Only scheduled sessions can be rescheduled");
  if (input.date < todayWIB()) throw new Error("Tanggal pengganti tidak boleh sudah lewat");
  if (input.durationHours < MIN_DURATION) throw new Error(`Duration must be >= ${MIN_DURATION} hours`);
  if (input.durationHours % DURATION_STEP !== 0) throw new Error(`Duration must be multiple of ${DURATION_STEP}`);

  const perSession = await isPerSessionStudent(session.studentId);
  const replacementId = crypto.randomUUID();
  const now = timestamp();
  const replacement: Session = {
    id: replacementId,
    studentId: session.studentId,
    date: input.date,
    time: input.time,
    durationHours: input.durationHours,
    subjects: [],
    shortNote: "",
    status: "SCHEDULED",
    rateSnapshot: session.rateSnapshot,
    cost: sessionCost(session.rateSnapshot, input.durationHours, perSession),
    rescheduledFromId: id,
    createdAt: now,
    updatedAt: now,
  };
  await db.transaction("rw", db.sessions, async () => {
    await db.sessions.update(id, {
      status: "RESCHEDULED",
      statusReason: input.reason?.trim() || undefined,
      rescheduledToId: replacementId,
      updatedAt: now,
    });
    await db.sessions.add(replacement);
  });
  await logAudit(
    "session.reschedule",
    "session",
    id,
    `${session.date}${session.time ? ` ${session.time}` : ""} → ${input.date}${input.time ? ` ${input.time}` : ""}${input.reason?.trim() ? ` — ${input.reason.trim()}` : ""}`,
  );
  return replacementId;
}

export async function deleteSession(id: string): Promise<void> {
  await db.transaction("rw", db.students, db.sessions, db.followUps, db.reports, db.payments, async () => {
    const session = await db.sessions.get(id);
    const affectedReports = await db.reports
      .filter((report) => report.sessionIds.includes(id))
      .toArray();
    const reportPayments = new Map<string, Payment | undefined>();
    for (const report of affectedReports) {
      const payment = await db.payments.where("reportId").equals(report.id).first();
      reportPayments.set(report.id, payment);
      if (report.billingMode === "session_count") {
        if (reportStatus(report) === "draft") {
          throw new Error("Sesi ada di draft paket. Hapus draft laporan terlebih dahulu.");
        }
        if (payment?.status === "UNPAID" && payment.source !== "manual") {
          throw new Error("Sesi sudah masuk tagihan paket. Batalkan tagihan di Keuangan terlebih dahulu.");
        }
        throw new Error("Sesi sudah masuk tagihan paket yang lunas atau diedit manual, sehingga tidak dapat dihapus.");
      }
    }

    await db.sessions.delete(id);
    await db.followUps
      .filter((f) => f.sourceSessionId === id)
      .modify((f) => { delete f.sourceSessionId; });
    for (const report of affectedReports) {
      const payment = reportPayments.get(report.id);

      const sessionIds = report.sessionIds.filter((sid) => sid !== id);
      // Hitung ulang total laporan dari sesi yang tersisa agar tidak melayang.
      const remaining = await db.sessions.bulkGet(sessionIds);
      const totalHours = remaining.reduce((sum, item) => sum + (item?.durationHours ?? 0), 0);
      const totalCost = remaining.reduce((sum, item) => sum + (item?.cost ?? 0), 0);
      await db.reports.update(report.id, { sessionIds, totalHours, totalCost });
      // Tagihan yang terbit dari laporan periode ikut disesuaikan — asal
      // belum lunas dan belum diedit manual (nominalnya sudah disepakati).
      if (payment && payment.status === "UNPAID" && payment.source !== "manual") {
        if (totalCost > 0) {
          await db.payments.update(payment.id, { totalCost });
        } else {
          await db.payments.delete(payment.id); // sesi sudah nol — tagihan hantu dihapus
        }
      }
    }

    // Jaga konsistensi keuangan: tagihan otomatis (auto, UNPAID) harus mencerminkan
    // sesi billable yang tersisa di bulan itu. Sesi yang dihapus bisa pernah masuk
    // tagihan (piutang hantu) — atau sesi billable yang ditambah SETELAH closeMonth
    // yang tidak pernah masuk tagihan. Jadi hitung ulang dari sesi yang tersisa,
    // bukan sekadar mengurangi biaya sesi yang dihapus.
    // Tagihan manual/PAID sengaja dibiarkan: nominalnya sudah disepakati/diterima.
    // Tagihan terikat laporan periode sudah disesuaikan lewat laporan di atas.
    if (session && isBillableSession(session)) {
      const month = session.date.slice(0, 7);
      const payments = await db.payments
        .where({ studentId: session.studentId })
        .filter((p) => p.month === month)
        .toArray();
      const payment = payments.find((p) => !p.reportId); // hindari tagihan laporan (ada 2+ baris sebulan)
      if (payment && payment.status === "UNPAID" && payment.source === "auto" && !payment.reportId) {
        const { start, end } = monthRange(month);
        const remaining = await db.sessions
          .filter((s) => s.studentId === session.studentId && isBillableSession(s) && s.date >= start && s.date <= end)
          .toArray();
        await db.payments.update(payment.id, {
          totalCost: Math.max(0, remaining.reduce((sum, s) => sum + s.cost, 0)),
        });
      }

      const student = await db.students.get(session.studentId);
      if (student?.billingPolicy === "session_count" && student.pendingBillingPolicy) {
        const confirmedCoveredIds = new Set(
          (await db.reports.where({ studentId: session.studentId }).toArray())
            .filter((report) => reportStatus(report) === "confirmed")
            .flatMap((report) => report.sessionIds),
        );
        const unbilledCount = await db.sessions
          .where({ studentId: session.studentId })
          .filter((candidate) => isBillableSession(candidate) && !confirmedCoveredIds.has(candidate.id))
          .count();
        if (unbilledCount === 0) {
          await db.students.update(student.id, {
            billingPolicy: student.pendingBillingPolicy,
            pendingBillingPolicy: undefined,
          });
        }
      }
    }
  });
  await logAudit("session.delete", "session", id);
}

// ── Scheduling ─────────────────────────────────────────────────────

export async function scheduleSession(
  input: { studentId: string; date: string; time?: string; durationHours: number }
): Promise<string> {
  const student = await db.students.get(input.studentId);
  if (!student) throw new Error("Student not found");
  const id = crypto.randomUUID();
  const now = timestamp();
  const rateSnapshot = student.hourlyRate;
  await db.sessions.add({
    id,
    studentId: input.studentId,
    date: input.date,
    time: input.time,
    durationHours: input.durationHours,
    subjects: [],
    shortNote: "",
    status: "SCHEDULED",
    rateSnapshot,
    cost: sessionCost(rateSnapshot, input.durationHours, billingPolicyOf(student) === "session_count"),
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function scheduleBatch(
  items: { studentId: string; date: string; time?: string; durationHours: number }[],
  seriesId?: string
): Promise<number> {
  if (!items.length) return 0;
  const studentId = items[0].studentId;
  if (items.some((item) => item.studentId !== studentId)) {
    throw new Error("Batch schedule must use the same student");
  }
  for (const item of items) {
    if (item.durationHours < MIN_DURATION) throw new Error(`Duration must be >= ${MIN_DURATION} hours`);
    if (item.durationHours % DURATION_STEP !== 0) throw new Error(`Duration must be multiple of ${DURATION_STEP}`);
  }
  const student = await db.students.get(studentId);
  if (!student) throw new Error("Student not found");
  const rateSnapshot = student.hourlyRate;
  const now = timestamp();
  const sid = seriesId ?? crypto.randomUUID();
  const sessions = items.map((item) => ({
    id: crypto.randomUUID(),
    studentId: item.studentId,
    date: item.date,
    time: item.time,
    durationHours: item.durationHours,
    subjects: [] as string[],
    shortNote: "",
    status: "SCHEDULED" as const,
    seriesId: sid,
    rateSnapshot,
    cost: sessionCost(rateSnapshot, item.durationHours, billingPolicyOf(student) === "session_count"),
    createdAt: now,
    updatedAt: now,
  }));
  await db.sessions.bulkAdd(sessions);
  return sessions.length;
}

export type CancelMode = "this" | "future" | "all";

export async function cancelSeriesSessions(
  session: { id: string; seriesId?: string; date: string },
  mode: CancelMode,
  statusReason?: string,
): Promise<void> {
  if (!session.seriesId || mode === "this") {
    await cancelSession(session.id, statusReason);
    return;
  }
  const all = await db.sessions
    .filter((s) => s.seriesId === session.seriesId && s.status === "SCHEDULED")
    .toArray();
  const toCancel = mode === "all"
    ? all
    : all.filter((s) => s.date >= session.date);
  const ids = toCancel.map((s) => s.id);
  const now = timestamp();
  await db.transaction("rw", db.sessions, async () => {
    for (const id of ids) await db.sessions.update(id, {
      status: "CANCELLED",
      statusReason: statusReason?.trim() || undefined,
      updatedAt: now,
    });
  });
  if (ids.length > 0) await logAudit("session.cancel", "session", session.id, statusReason?.trim() || `${ids.length} sesi seri dibatalkan`);
}

export async function listScheduledForStudent(studentId: string, fromDate?: string): Promise<Session[]> {
  const from = fromDate ?? "0000-00-00";
  return db.sessions
    .where("studentId").equals(studentId)
    .and((s) => s.status === "SCHEDULED" && s.date >= from)
    .sortBy("date");
}

export async function listAllUpcomingScheduled(fromDate: string): Promise<Session[]> {
  return db.sessions
    .where("date").aboveOrEqual(fromDate)
    .and((s) => s.status === "SCHEDULED")
    .sortBy("date");
}

export type EditMode = "this" | "future" | "all";

export async function updateSeriesSessions(
  session: { id: string; seriesId?: string; date: string },
  patch: Partial<Pick<Session, "time" | "durationHours" | "studentId" | "date">>,
  mode: EditMode
): Promise<void> {
  if (patch.durationHours !== undefined) {
    if (patch.durationHours < MIN_DURATION) throw new Error(`Duration must be >= ${MIN_DURATION} hours`);
    if (patch.durationHours % DURATION_STEP !== 0) throw new Error(`Duration must be multiple of ${DURATION_STEP}`);
  }
  if (!session.seriesId || mode === "this") {
    await updateSession(session.id, patch);
    return;
  }
  const all = await db.sessions
    .filter((s) => s.seriesId === session.seriesId && s.status === "SCHEDULED")
    .toArray();
  const toUpdate = mode === "all" ? all : all.filter((s) => s.date >= session.date);
  const perSession = all.length > 0 ? await isPerSessionStudent(all[0].studentId) : false;
  const now = timestamp();
  await db.transaction("rw", db.sessions, async () => {
    for (const s of toUpdate) {
      const finalPatch: Partial<Session> = { ...patch, updatedAt: now };
      if (patch.durationHours !== undefined) {
        finalPatch.cost = sessionCost(s.rateSnapshot, patch.durationHours, perSession);
      }
      await db.sessions.update(s.id, finalPatch);
    }
  });
}

// ── Conflicts ──────────────────────────────────────────────────────

export async function findConflicts(
  dates: string[], time: string, durationHours: number
): Promise<{ date: string; studentName: string; time: string }[]> {
  if (!dates.length || !time) return [];
  const startMin = timeToMin(time);
  const endMin   = startMin + durationHours * 60;
  const start = dates[0]; const end = dates[dates.length - 1];
  const candidates = await db.sessions
    .where("date").between(start, end, true, true)
    .and((s) => s.status === "SCHEDULED" && s.time != null && dates.includes(s.date))
    .toArray();
  const conflicts: { date: string; studentName: string; time: string }[] = [];
  for (const s of candidates) {
    const sStart = timeToMin(s.time!);
    const sEnd   = sStart + s.durationHours * 60;
    if (startMin < sEnd && endMin > sStart) {
      const student = await db.students.get(s.studentId);
      conflicts.push({ date: s.date, studentName: student?.name ?? "—", time: s.time! });
    }
  }
  return conflicts;
}

// ── Other ──────────────────────────────────────────────────────────

export async function recentShortNotes(limit = 50): Promise<string[]> {
  const notes = await db.sessions
    .orderBy("createdAt")
    .reverse()
    .limit(limit)
    .toArray();
  const seen = new Set<string>();
  const distinct: string[] = [];
  for (const s of notes) {
    if (s.shortNote && !seen.has(s.shortNote)) {
      seen.add(s.shortNote);
      distinct.push(s.shortNote);
    }
  }
  return distinct;
}

export async function getLastDoneSession(studentId: string): Promise<Session | undefined> {
  const all = await db.sessions
    .where("studentId").equals(studentId)
    .and((s) => s.status === "DONE")
    .sortBy("date");
  return all[all.length - 1];
}

/** Ambil N sesi DONE terakhir untuk satu murid, terurut dari terbaru. */
export async function getRecentDoneSessions(
  studentId: string, limit = 5
): Promise<Session[]> {
  const all = await db.sessions
    .where("studentId").equals(studentId)
    .and((s) => s.status === "DONE")
    .sortBy("date");
  return all.slice(-limit).reverse();
}

// ── Streak ─────────────────────────────────────────────────────────

// (getStreak dihapus — dead code tanpa pemanggil)
