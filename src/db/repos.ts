import { db } from "./db";
import type {
  Student, Session, MonthlyReport, Payment, Settings, RaporGrade,
  Homework, HomeworkStatus, FollowUpItem, FollowUpType,
} from "./types";
import { MIN_DURATION, DURATION_STEP, DEFAULT_RATE } from "./types";
import { hashPin, isHashedPin } from "../lib/crypto";

// ── Helpers ────────────────────────────────────────────────────────

function todayWIB(): string {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, "0")}-${String(wib.getUTCDate()).padStart(2, "0")}`;
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
  const tables = [
    db.students, db.sessions, db.reports,
    db.payments, db.homeworks, db.followUps, db.raporGrades,
  ];
  await db.transaction("rw", tables, async () => {
    await db.students.delete(id);
    await db.sessions.where({ studentId: id }).delete();
    await db.reports.where({ studentId: id }).delete();
    await db.payments.where({ studentId: id }).delete();
    await db.homeworks.where({ studentId: id }).delete();
    await db.followUps.where({ studentId: id }).delete();
    await db.raporGrades.where({ studentId: id }).delete();
  });
}

// ── Sessions ───────────────────────────────────────────────────────

function nowTimeWIB(): string {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return `${String(wib.getUTCHours()).padStart(2,"0")}:${String(wib.getUTCMinutes()).padStart(2,"0")}`;
}

function subtractHoursFromTime(hhmm: string, hours: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const totalMin = h * 60 + m - Math.round(hours * 60);
  const norm = ((totalMin % 1440) + 1440) % 1440;
  return `${String(Math.floor(norm / 60)).padStart(2,"0")}:${String(norm % 60).padStart(2,"0")}`;
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
  const cost = input.durationHours * rateSnapshot;

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
    cost: duration * session.rateSnapshot,
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
      finalPatch.cost = patch.durationHours * session.rateSnapshot;
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
  await db.sessions.delete(id);
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
    cost: input.durationHours * rateSnapshot,
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
    cost: item.durationHours * rateSnapshot,
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
        finalPatch.cost = patch.durationHours * s.rateSnapshot;
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
    .where({ studentId })
    .filter((r) => r.month === month)
    .first();
}

export async function upsertReport(report: Omit<MonthlyReport, "createdAt"> & { createdAt?: string }): Promise<string> {
  const existing = await getReport(report.studentId, report.month);
  const now = timestamp();
  if (existing) {
    await db.reports.update(existing.id, { ...report, createdAt: existing.createdAt });
    return existing.id;
  } else {
    const id = crypto.randomUUID();
    await db.reports.add({ ...report, id, createdAt: report.createdAt ?? now });
    return id;
  }
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
  const existing = await getPayment(payment.studentId, payment.month);
  if (existing) {
    await db.payments.update(existing.id, payment);
  } else {
    await db.payments.add({ ...payment, id: crypto.randomUUID() });
  }
}

export async function listPayments(month?: string): Promise<Payment[]> {
  if (month) {
    return db.payments
      .filter((p) => p.month === month)
      .toArray();
  }
  return db.payments.toArray();
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
  const today = todayWIB();
  const rows  = await db.homeworks
    .where({ studentId })
    .filter((h) => h.status === "assigned" || h.status === "overdue")
    .sortBy("dueAt");
  // Auto-mark overdue in memory (don't write to DB for performance)
  return rows.map((h) => ({
    ...h,
    status: (h.status === "assigned" && h.dueAt && h.dueAt < today)
      ? ("overdue" as HomeworkStatus)
      : h.status,
  }));
}

export async function listAllPendingHomework(): Promise<(Homework & { studentName?: string })[]> {
  const today = todayWIB();
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
      status: (h.status === "assigned" && h.dueAt && h.dueAt < today)
        ? ("overdue" as HomeworkStatus)
        : h.status,
      studentName: studMap.get(h.studentId),
    }))
    .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));
}

export async function listAllHomeworkFull(): Promise<(Homework & { studentName?: string })[]> {
  const today = todayWIB();
  const rows  = await db.homeworks.toArray();
  const studentIds = [...new Set(rows.map((h) => h.studentId))];
  const studMap    = new Map(
    await Promise.all(studentIds.map(async (id) => [id, (await db.students.get(id))?.name ?? "—"] as const))
  );
  return rows
    .map((h) => ({
      ...h,
      status: (h.status === "assigned" && h.dueAt && h.dueAt < today)
        ? ("overdue" as HomeworkStatus)
        : h.status,
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

export interface HomeworkStats {
  total: number;
  done: number;
  notDone: number;
  pending: number;
  completionRate: number; // 0–100
}

export async function getHomeworkStats(studentId: string): Promise<HomeworkStats> {
  const all = await db.homeworks.where({ studentId }).toArray();
  const done    = all.filter((h) => h.status === "done").length;
  const notDone = all.filter((h) => h.status === "not_done" || h.status === "overdue").length;
  const pending = all.filter((h) => h.status === "assigned").length;
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
export type { HomeworkStatus, FollowUpType };
