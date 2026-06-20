import { db } from "./db";
import type {
  Student, Session, MonthlyReport, Payment, Settings,
} from "./types";
import { MIN_DURATION, DURATION_STEP, DEFAULT_RATE } from "./types";

// ── Helpers ────────────────────────────────────────────────────────

function todayWIB(): string {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, "0")}-${String(wib.getUTCDate()).padStart(2, "0")}`;
}

function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  // next month minus one day
  const endDate = new Date(y, m, 0); // day 0 of next month = last day of this month
  const end = endDate.toISOString().slice(0, 10);
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
  ai: { enabled: false, workerUrl: "", apiKey: "", model: "deepseek-chat" },
  templatePref: {},
};

// ── Settings ───────────────────────────────────────────────────────

/** Read-only — pure get, does NOT write */
export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get("app");
  return s ?? { ...DEFAULT_SETTINGS };
}

/** Initialize default settings row if missing — call at app startup */
export async function initSettings(): Promise<void> {
  const exists = await db.settings.get("app");
  if (!exists) {
    await db.settings.add({ ...DEFAULT_SETTINGS });
  }
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await db.settings.put({ ...patch, id: "app" } as Settings);
}

// ── Students ───────────────────────────────────────────────────────

export async function listStudents(activeOnly?: boolean): Promise<Student[]> {
  let coll = db.students.orderBy("name");
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

// ── Sessions ───────────────────────────────────────────────────────

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

  const session: Session = {
    ...input,
    id,
    rateSnapshot,
    cost,
    createdAt: now,
    updatedAt: now,
  };
  await db.sessions.add(session);
  return id;
}

export async function updateSession(id: string, patch: Partial<Session>): Promise<void> {
  if (patch.durationHours !== undefined) {
    if (patch.durationHours < MIN_DURATION) throw new Error(`Duration must be >= ${MIN_DURATION} hours`);
    if (patch.durationHours % DURATION_STEP !== 0) throw new Error(`Duration must be multiple of ${DURATION_STEP}`);
  }
  await db.sessions.update(id, { ...patch, updatedAt: timestamp() });
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

export async function cancelSession(id: string): Promise<void> {
  await db.sessions.update(id, { status: "CANCELLED", updatedAt: timestamp() });
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
