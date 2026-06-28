import { db } from "./db";
import type {
  Student, Session, MonthlyReport, Payment, Settings, RaporGrade,
  Homework, HomeworkStatus, FollowUpItem, FollowUpType,
  Expense, ExpenseCategory, IaEeProject, IaEeMilestone, MonthClosing,
  AuditEntry, AuditAction,
} from "./types";
import { MIN_DURATION, DURATION_STEP, DEFAULT_RATE } from "./types";
import { hashPin, isHashedPin } from "../lib/crypto";

// ── Helpers ────────────────────────────────────────────────────────

function todayWIB(): string {
  // Use Intl.DateTimeFormat with timeZone for DST-safe WIB date (Asia/Jakarta = UTC+7)
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts();
  const m = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return `${m.year}-${m.month}-${m.day}`;
}

function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  // getDate() returns local day number — avoids toISOString() UTC shift losing the last day in WIB
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function timestamp(): string {
  return new Date().toISOString();
}

// ── Audit Trail (L-1) ──────────────────────────────────────────────
// Catatan lokal aksi penting. Best-effort: kegagalan log TIDAK boleh
// menggagalkan operasi utama (dibungkus try/catch oleh pemanggil bila perlu).

export async function logAudit(
  action: AuditAction, entityType: string, entityId?: string, details?: string,
): Promise<void> {
  try {
    await db.auditLog.add({
      id: crypto.randomUUID(), action, entityType, entityId,
      timestamp: timestamp(), details,
    });
  } catch {
    // jangan pernah mengganggu alur utama hanya karena audit gagal
  }
}

export async function listAuditLog(limit = 50): Promise<AuditEntry[]> {
  return db.auditLog.orderBy("timestamp").reverse().limit(limit).toArray();
}

export async function clearAuditLog(): Promise<void> {
  await db.auditLog.clear();
}

// ── Maintenance foto (M-5) ─────────────────────────────────────────
// Foto disimpan inline di Session.photo (Blob). Tool ini melepas foto
// dari sesi lama untuk membebaskan storage (mendukung peringatan kuota B-1).
// Data sesi (catatan, tanda tangan, biaya) tetap utuh — hanya foto dilepas.

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

function resolvedHomeworkStatus(h: Pick<Homework, "status" | "dueAt">): HomeworkStatus {
  return h.status === "assigned" && h.dueAt && h.dueAt < todayWIB()
    ? "overdue"
    : h.status;
}

// ── Default Settings ───────────────────────────────────────────────

const DEFAULT_SETTINGS: Settings = {
  id: "app",
  tutorProfile: { name: "", phone: "" },
  defaultRate: DEFAULT_RATE,
  paymentInfo: "",
  subjects: [
    "Mathematics AA", "Mathematics AI", "Physics", "Chemistry", "Biology",
    "Economics", "Business Management", "Geography", "History", "Psychology",
    "Computer Science", "ESS", "Bahasa Indonesia", "TOK", "Other",
  ],
  ai: { enabled: false, apiKey: "", model: "deepseek-v4-flash" },
  templatePref: {},
};

// ── Settings ───────────────────────────────────────────────────────

/** Reads settings and migrates legacy plaintext PINs to hashes once. */
export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get("app");
  if (!s) return { ...DEFAULT_SETTINGS };
  if (s.financialPin && !isHashedPin(s.financialPin)) {
    const migrated = { ...s, financialPin: await hashPin(s.financialPin) };
    await db.settings.put(migrated);
    return migrated;
  }
  return s;
}

/** Initialize default settings row if missing — call at app startup */
export async function initSettings(): Promise<void> {
  const exists = await db.settings.get("app");
  if (!exists) {
    await db.settings.add({ ...DEFAULT_SETTINGS });
  }
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch, id: "app" } as Settings);
}

// ── Students ───────────────────────────────────────────────────────

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

export async function updateStudent(id: string, patch: Partial<Student>): Promise<void> {
  await db.students.update(id, patch);
}

export async function deleteStudent(id: string): Promise<void> {
  const student = await db.students.get(id);
  const tables = [
    db.students, db.sessions, db.reports,
    db.payments, db.homeworks, db.followUps, db.raporGrades,
    db.iaeeProjects,
  ];
  await db.transaction("rw", tables, async () => {
    await db.students.delete(id);
    await db.sessions.where({ studentId: id }).delete();
    await db.reports.where({ studentId: id }).delete();
    await db.payments.where({ studentId: id }).delete();
    await db.homeworks.where({ studentId: id }).delete();
    await db.followUps.where({ studentId: id }).delete();
    await db.raporGrades.where({ studentId: id }).delete();
    await db.iaeeProjects.where({ studentId: id }).delete();
  });
  await logAudit("student.delete", "student", id, student?.name);
}

// ── Sessions ───────────────────────────────────────────────────────

function nowTimeWIB(): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts();
  const m = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return `${m.hour}:${m.minute}`;
}

function subtractHoursFromTime(hhmm: string, hours: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const totalMin = h * 60 + m - Math.round(hours * 60);
  // Normalize to [0, 1440) range — handles negative and overflow values correctly
  const norm = ((totalMin % 1440) + 1440) % 1440;
  return `${String(Math.floor(norm / 60)).padStart(2, "0")}:${String(norm % 60).padStart(2, "0")}`;
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
  const cost = Math.round(input.durationHours * rateSnapshot);

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
  const tout = nowTimeWIB();
  const tin  = subtractHoursFromTime(tout, duration);
  await db.sessions.update(id, {
    ...data,
    durationHours: duration,
    cost: Math.round(duration * session.rateSnapshot),
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
      finalPatch.cost = Math.round(patch.durationHours * session.rateSnapshot);
    }
  }
  await db.sessions.update(id, finalPatch);
}

export async function listSessionsByStudent(studentId: string): Promise<Session[]> {
  return db.sessions
    .where({ studentId })
    .filter((s) => s.status === "DONE")
    .sortBy("date");
}

export async function listSessionsForMonth(month: string): Promise<Session[]> {
  const { start, end } = monthRange(month);
  return db.sessions
    .filter((s) => s.status === "DONE" && s.date >= start && s.date <= end)
    .toArray();
}

export async function listSessionsByStudentMonth(
  studentId: string, month: string
): Promise<Session[]> {
  const { start, end } = monthRange(month);
  return db.sessions
    .where({ studentId })
    .filter((s) => s.status === "DONE" && s.date >= start && s.date <= end)
    .toArray();
}

export async function listSessionsToday(): Promise<Session[]> {
  const today = todayWIB();
  return db.sessions
    .where({ status: "SCHEDULED" })
    .filter((s) => s.date === today)
    .toArray();
}

export async function listScheduledForMonth(month: string): Promise<Session[]> {
  const { start, end } = monthRange(month);
  return db.sessions
    .filter((s) => s.status === "SCHEDULED" && s.date >= start && s.date <= end)
    .toArray();
}

export async function listAllSessionsForMonth(month: string): Promise<Session[]> {
  const { start, end } = monthRange(month);
  return db.sessions
    .filter((s) => s.status !== "CANCELLED" && s.date >= start && s.date <= end)
    .toArray();
}

export async function listAllSessionsForWeek(weekStart: string, weekEnd: string): Promise<Session[]> {
  return db.sessions
    .filter((s) => s.status !== "CANCELLED" && s.date >= weekStart && s.date <= weekEnd)
    .toArray();
}

export async function listDoneSessionsForDateRange(start: string, end: string): Promise<Session[]> {
  return db.sessions
    .filter((s) => s.status === "DONE" && s.date >= start && s.date <= end)
    .toArray();
}

export async function listDoneSessionsForDate(date: string): Promise<Session[]> {
  return db.sessions
    .where("date").equals(date)
    .and((s) => s.status === "DONE")
    .toArray();
}

export async function cancelSession(id: string): Promise<void> {
  await db.sessions.update(id, { status: "CANCELLED", updatedAt: timestamp() });
}

export async function deleteSession(id: string): Promise<void> {
  await db.transaction("rw", db.sessions, db.homeworks, db.followUps, db.reports, async () => {
    await db.sessions.delete(id);
    await db.homeworks
      .filter((h) => h.sessionId === id)
      .modify((h) => { delete h.sessionId; h.updatedAt = timestamp(); });
    await db.followUps
      .filter((f) => f.sourceSessionId === id)
      .modify((f) => { delete f.sourceSessionId; });
    await db.reports
      .filter((r) => r.sessionIds.includes(id))
      .modify((r) => { r.sessionIds = r.sessionIds.filter((sid) => sid !== id); });
  });
  await logAudit("session.delete", "session", id);
}

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
    cost: Math.round(input.durationHours * rateSnapshot),
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
    cost: Math.round(item.durationHours * rateSnapshot),
    createdAt: now,
    updatedAt: now,
  }));
  await db.sessions.bulkAdd(sessions);
  return sessions.length;
}

export type CancelMode = "this" | "future" | "all";

export async function cancelSeriesSessions(
  session: { id: string; seriesId?: string; date: string },
  mode: CancelMode
): Promise<void> {
  if (!session.seriesId || mode === "this") {
    await cancelSession(session.id);
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
    for (const id of ids) await db.sessions.update(id, { status: "CANCELLED", updatedAt: now });
  });
}

export async function listScheduledForStudent(studentId: string, fromDate?: string): Promise<Session[]> {
  const from = fromDate ?? "0000-00-00";
  return db.sessions
    .where({ studentId })
    .filter((s) => s.status === "SCHEDULED" && s.date >= from)
    .sortBy("date");
}

export async function listAllUpcomingScheduled(fromDate: string): Promise<Session[]> {
  return db.sessions
    .filter((s) => s.status === "SCHEDULED" && s.date >= fromDate)
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
  const now = timestamp();
  await db.transaction("rw", db.sessions, async () => {
    for (const s of toUpdate) {
      const finalPatch: Partial<Session> = { ...patch, updatedAt: now };
      if (patch.durationHours !== undefined) {
        finalPatch.cost = Math.round(patch.durationHours * s.rateSnapshot);
      }
      await db.sessions.update(s.id, finalPatch);
    }
  });
}

export async function findConflicts(
  dates: string[], time: string, durationHours: number
): Promise<{ date: string; studentName: string; time: string }[]> {
  if (!dates.length || !time) return [];
  const startMin = timeToMin(time);
  const endMin   = startMin + durationHours * 60;
  const start = dates[0]; const end = dates[dates.length - 1];
  const candidates = await db.sessions
    .filter((s) => s.status === "SCHEDULED" && s.time != null && s.date >= start && s.date <= end && dates.includes(s.date))
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

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

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

// ── Reports ────────────────────────────────────────────────────────

export async function getReport(
  studentId: string, month: string
): Promise<MonthlyReport | undefined> {
  return db.reports
    .where({ studentId, month })
    .first();
}

export async function upsertReport(report: Omit<MonthlyReport, "createdAt"> & { createdAt?: string }): Promise<string> {
  const now = timestamp();
  // Dexie transaction serialises concurrent upserts → no duplicate rows
  return db.transaction("rw", db.reports, async () => {
    const existing = await db.reports
      .where({ studentId: report.studentId, month: report.month })
      .first();
    if (existing) {
      await db.reports.update(existing.id, { ...report, createdAt: existing.createdAt });
      return existing.id;
    } else {
      const id = crypto.randomUUID();
      await db.reports.add({ ...report, id, createdAt: report.createdAt ?? now });
      return id;
    }
  });
}

export async function listReportsByStudent(studentId: string): Promise<MonthlyReport[]> {
  return db.reports
    .where({ studentId })
    .sortBy("createdAt");
}

// ── Payments ───────────────────────────────────────────────────────

export async function getPayment(
  studentId: string, month: string
): Promise<Payment | undefined> {
  return db.payments
    .where({ studentId })
    .filter((p) => p.month === month)
    .first();
}

export async function upsertPayment(payment: Omit<Payment, "id">): Promise<void> {
  const normalized: Omit<Payment, "id"> = { source: "manual", ...payment };
  // Atomic read-modify-write: cegah baris duplikat saat double-tap / multi-tab.
  await db.transaction("rw", db.payments, async () => {
    const existing = await getPayment(payment.studentId, payment.month);
    if (existing) {
      await db.payments.update(existing.id, normalized);
    } else {
      await db.payments.add({ ...normalized, id: crypto.randomUUID() });
    }
  });
}

export async function listPayments(month?: string): Promise<Payment[]> {
  if (month) {
    return db.payments
      .filter((p) => p.month === month)
      .toArray();
  }
  return db.payments.toArray();
}

/** Set a payment as transferred (cash received). */
export async function markPaymentTransferred(
  studentId: string, month: string, method = "transfer"
): Promise<void> {
  await db.transaction("rw", db.payments, async () => {
    const existing = await getPayment(studentId, month);
    if (existing) {
      await db.payments.update(existing.id, { status: "PAID", paidAt: todayWIB(), method });
    } else {
      await db.payments.add({
        id: crypto.randomUUID(), studentId, month, totalCost: 0,
        status: "PAID", source: "manual", paidAt: todayWIB(), method,
      });
    }
  });
  await logAudit("payment.paid", "payment", studentId, `${month} via ${method}`);
}

/** Mark a payment back to unpaid (undo "Sudah Transfer"). */
export async function markPaymentUnpaid(studentId: string, month: string): Promise<void> {
  await db.transaction("rw", db.payments, async () => {
    const existing = await getPayment(studentId, month);
    if (existing) {
      await db.payments.update(existing.id, { status: "UNPAID", paidAt: undefined, method: undefined });
    }
  });
  await logAudit("payment.unpaid", "payment", studentId, month);
}

/** Update only the billed amount of an existing payment (edit before sending). */
export async function updatePaymentAmount(
  studentId: string, month: string, totalCost: number
): Promise<void> {
  await db.transaction("rw", db.payments, async () => {
    const existing = await getPayment(studentId, month);
    if (existing) await db.payments.update(existing.id, { totalCost });
  });
}

// ── Month Closing (Tutup Bulan) ────────────────────────────────────

export async function getMonthClosing(month: string): Promise<MonthClosing | undefined> {
  return db.monthClosings.where("month").equals(month).first();
}

export async function listMonthClosings(): Promise<MonthClosing[]> {
  return db.monthClosings.orderBy("month").reverse().toArray();
}

export interface StudentBill {
  studentId: string;
  name: string;
  count: number;
  hours: number;
  cost: number;
}

/** Per-student bills for a month, derived from DONE sessions. No DB writes. */
export async function computeMonthBills(month: string): Promise<StudentBill[]> {
  const sessions = await listSessionsForMonth(month);
  const map = new Map<string, { count: number; hours: number; cost: number }>();
  for (const s of sessions) {
    const cur = map.get(s.studentId) ?? { count: 0, hours: 0, cost: 0 };
    map.set(s.studentId, {
      count: cur.count + 1,
      hours: cur.hours + s.durationHours,
      cost: cur.cost + s.cost,
    });
  }
  const bills = await Promise.all(
    [...map.entries()].map(async ([studentId, data]) => ({
      studentId,
      name: (await db.students.get(studentId))?.name ?? "(dihapus)",
      ...data,
    }))
  );
  return bills.sort((a, b) => b.cost - a.cost);
}

/**
 * Close a month: auto-create a Payment (UNPAID) per student from DONE sessions,
 * then record the closing snapshot. Existing payments for the month are left
 * untouched (respects manual/edited entries). Idempotent.
 */
export async function closeMonth(month: string): Promise<void> {
  const bills = await computeMonthBills(month);
  await db.transaction("rw", db.payments, db.monthClosings, async () => {
    for (const b of bills) {
      const existing = await db.payments
        .where({ studentId: b.studentId })
        .filter((p) => p.month === month)
        .first();
      if (existing) continue;
      await db.payments.add({
        id: crypto.randomUUID(),
        studentId: b.studentId,
        month,
        totalCost: b.cost,
        status: "UNPAID",
        source: "auto",
      });
    }
    const existingClosing = await db.monthClosings.where("month").equals(month).first();
    await db.monthClosings.put({
      id: existingClosing?.id ?? crypto.randomUUID(),
      month,
      closedAt: timestamp(),
      totalPotensi: bills.reduce((s, b) => s + b.cost, 0),
      totalHours: bills.reduce((s, b) => s + b.hours, 0),
      studentCount: bills.length,
    });
  });
  await logAudit("month.close", "data", month, `${bills.length} tagihan dibuat`);
}

/** Reopen a month: drop the closing + any still-UNPAID auto-generated bills. */
export async function reopenMonth(month: string): Promise<void> {
  await db.transaction("rw", db.payments, db.monthClosings, async () => {
    const unpaid = await db.payments
      .filter((p) => p.month === month && p.status === "UNPAID" && p.source === "auto")
      .toArray();
    for (const p of unpaid) await db.payments.delete(p.id);
    const closing = await db.monthClosings.where("month").equals(month).first();
    if (closing) await db.monthClosings.delete(closing.id);
  });
}

export interface MonthCashSummary {
  month: string;
  potensi: number;     // accrued — sum of DONE session costs
  realisasi: number;   // cash — sum of PAID payments
  piutang: number;     // outstanding — sum of UNPAID payments
  pengeluaran: number; // expenses
  laba: number;        // realisasi − pengeluaran
  closed: boolean;
}

/** Cash-basis financial summary per month (Potensi / Realisasi / Piutang / Laba). */
export async function getCashSummary(months: string[]): Promise<MonthCashSummary[]> {
  return Promise.all(
    months.map(async (month) => {
      const sessions = await listSessionsForMonth(month);
      const potensi = sessions.reduce((s, x) => s + x.cost, 0);
      const payments = await listPayments(month);
      const realisasi = payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.totalCost, 0);
      const piutang = payments.filter((p) => p.status === "UNPAID").reduce((s, p) => s + p.totalCost, 0);
      const expenses = await listExpenses(month);
      const pengeluaran = expenses.reduce((s, e) => s + e.amount, 0);
      const closing = await getMonthClosing(month);
      return { month, potensi, realisasi, piutang, pengeluaran, laba: realisasi - pengeluaran, closed: Boolean(closing) };
    })
  );
}

// ── Rapor Grades ───────────────────────────────────────────────────

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

export async function listSessionsInDateRange(
  studentId: string, start: string, end: string
): Promise<Session[]> {
  return db.sessions
    .where({ studentId })
    .filter((s) => s.status === "DONE" && s.date >= start && s.date <= end)
    .toArray();
}

export async function getLastDoneSession(studentId: string): Promise<Session | undefined> {
  const all = await db.sessions
    .where({ studentId })
    .filter((s) => s.status === "DONE")
    .sortBy("date");
  return all[all.length - 1];
}

// ── Homework ────────────────────────────────────────────────────────

export async function createHomework(
  input: Omit<Homework, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const id  = crypto.randomUUID();
  const now = timestamp();
  await db.homeworks.add({ ...input, id, createdAt: now, updatedAt: now });
  return id;
}

export async function listPendingHomework(studentId: string): Promise<Homework[]> {
  const rows  = await db.homeworks
    .where({ studentId })
    .filter((h) => h.status === "assigned" || h.status === "overdue")
    .sortBy("dueAt");
  return rows.map((h) => ({
    ...h,
    status: resolvedHomeworkStatus(h),
  }));
}

export async function listAllPendingHomework(): Promise<(Homework & { studentName?: string })[]> {
  const rows  = await db.homeworks
    .filter((h) => h.status === "assigned" || h.status === "overdue")
    .toArray();
  const studentIds = [...new Set(rows.map((h) => h.studentId))];
  const studMap   = new Map(
    await Promise.all(studentIds.map(async (id) => [id, (await db.students.get(id))?.name ?? "—"] as const))
  );
  return rows
    .map((h) => ({
      ...h,
      status: resolvedHomeworkStatus(h),
      studentName: studMap.get(h.studentId),
    }))
    .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));
}

export async function listAllHomeworkFull(): Promise<(Homework & { studentName?: string })[]> {
  const rows  = await db.homeworks.toArray();
  const studentIds = [...new Set(rows.map((h) => h.studentId))];
  const studMap    = new Map(
    await Promise.all(studentIds.map(async (id) => [id, (await db.students.get(id))?.name ?? "—"] as const))
  );
  return rows
    .map((h) => ({
      ...h,
      status: resolvedHomeworkStatus(h),
      studentName: studMap.get(h.studentId),
    }))
    .sort((a, b) => (b.assignedAt ?? "").localeCompare(a.assignedAt ?? ""));
}

export async function updateHomework(id: string, patch: Partial<Homework>): Promise<void> {
  await db.homeworks.update(id, { ...patch, updatedAt: timestamp() });
}

export async function deleteHomework(id: string): Promise<void> {
  await db.homeworks.delete(id);
}

export async function markHomeworkDone(id: string): Promise<void> {
  await db.homeworks.update(id, { status: "done", updatedAt: timestamp() });
}

export async function markHomeworkNotDone(id: string): Promise<void> {
  await db.homeworks.update(id, { status: "not_done", updatedAt: timestamp() });
}

export async function setHomeworkStatus(id: string, status: HomeworkStatus): Promise<void> {
  await db.homeworks.update(id, { status, updatedAt: timestamp() });
}

export interface HomeworkStats {
  total: number;
  done: number;
  notDone: number;
  pending: number;
  completionRate: number; // 0–100
}

export async function getHomeworkStats(studentId: string): Promise<HomeworkStats> {
  const all = await db.homeworks.where({ studentId }).toArray();
  const statuses = all.map(resolvedHomeworkStatus);
  const done    = statuses.filter((status) => status === "done").length;
  const notDone = statuses.filter((status) => status === "not_done" || status === "overdue").length;
  const pending = statuses.filter((status) => status === "assigned").length;
  const judged  = done + notDone;
  return {
    total: all.length,
    done, notDone, pending,
    completionRate: judged > 0 ? Math.round((done / judged) * 100) : 0,
  };
}

// ── Follow-up Items ─────────────────────────────────────────────────

export async function createFollowUp(
  input: Omit<FollowUpItem, "id" | "createdAt">
): Promise<string> {
  const id = crypto.randomUUID();
  await db.followUps.add({ ...input, id, createdAt: timestamp() });
  return id;
}

export async function listPendingFollowUps(studentId?: string): Promise<FollowUpItem[]> {
  if (studentId) {
    return db.followUps
      .where({ studentId })
      .filter((f) => !f.completedAt)
      .toArray();
  }
  return db.followUps.filter((f) => !f.completedAt).toArray();
}

export async function completeFollowUp(id: string): Promise<void> {
  await db.followUps.update(id, { completedAt: timestamp() });
}

export async function deleteFollowUp(id: string): Promise<void> {
  await db.followUps.delete(id);
}

// Re-export types so screens only need to import from repos
export type { HomeworkStatus, FollowUpType, ExpenseCategory, IaEeMilestone };

// ── Expenses ────────────────────────────────────────────────────────

export async function createExpense(
  input: Omit<Expense, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const id = crypto.randomUUID();
  const now = timestamp();
  await db.expenses.add({ ...input, id, createdAt: now, updatedAt: now });
  return id;
}

export async function listExpenses(month?: string): Promise<Expense[]> {
  if (month) {
    const { start, end } = monthRange(month);
    return db.expenses
      .where("date").between(start, end, true, true)
      .sortBy("date");
  }
  return db.expenses.orderBy("date").reverse().toArray();
}

export async function listExpensesByCategory(category: ExpenseCategory): Promise<Expense[]> {
  return db.expenses.where("category").equals(category).sortBy("date");
}

export async function deleteExpense(id: string): Promise<void> {
  await db.expenses.delete(id);
}

export async function getExpenseTotals(month: string): Promise<Record<string, number>> {
  const expenses = await listExpenses(month);
  const totals: Record<string, number> = {};
  for (const e of expenses) {
    totals[e.category] = (totals[e.category] ?? 0) + e.amount;
  }
  return totals;
}

export async function getMonthlyIncomeVsExpense(
  months: string[]
): Promise<{ month: string; income: number; expense: number; net: number }[]> {
  return Promise.all(
    months.map(async (month) => {
      const sessions = await listSessionsForMonth(month);
      const income = sessions.reduce((s, sess) => s + sess.cost, 0);
      const expenses = await listExpenses(month);
      const expense = expenses.reduce((s, e) => s + e.amount, 0);
      return { month, income, expense, net: income - expense };
    })
  );
}

// ── IA / EE Projects ────────────────────────────────────────────────

export async function createIaEeProject(
  input: Omit<IaEeProject, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const id = crypto.randomUUID();
  const now = timestamp();
  await db.iaeeProjects.add({ ...input, id, createdAt: now, updatedAt: now });
  return id;
}

export async function listIaEeProjects(studentId: string): Promise<IaEeProject[]> {
  return db.iaeeProjects.where({ studentId }).sortBy("createdAt");
}

export async function updateIaEeProject(id: string, patch: Partial<IaEeProject>): Promise<void> {
  await db.iaeeProjects.update(id, { ...patch, updatedAt: timestamp() });
}

export async function deleteIaEeProject(id: string): Promise<void> {
  await db.iaeeProjects.delete(id);
}

export async function addMilestone(projectId: string, milestone: IaEeMilestone): Promise<void> {
  const project = await db.iaeeProjects.get(projectId);
  if (!project) throw new Error("Project not found");
  await db.iaeeProjects.update(projectId, {
    milestones: [...project.milestones, milestone],
    updatedAt: timestamp(),
  });
}

export async function updateMilestone(
  projectId: string,
  milestoneId: string,
  patch: Partial<IaEeMilestone>
): Promise<void> {
  const project = await db.iaeeProjects.get(projectId);
  if (!project) throw new Error("Project not found");
  const updatedMilestones = project.milestones.map((m) =>
    m.id === milestoneId ? { ...m, ...patch } : m
  );
  await db.iaeeProjects.update(projectId, {
    milestones: updatedMilestones,
    updatedAt: timestamp(),
  });
}

export async function deleteMilestone(projectId: string, milestoneId: string): Promise<void> {
  const project = await db.iaeeProjects.get(projectId);
  if (!project) throw new Error("Project not found");
  await db.iaeeProjects.update(projectId, {
    milestones: project.milestones.filter((m) => m.id !== milestoneId),
    updatedAt: timestamp(),
  });
}
