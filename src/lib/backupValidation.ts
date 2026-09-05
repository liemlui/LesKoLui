import { db } from "../db/db";
import type { BackupTable } from "./backup";

// ── Types ──────────────────────────────────────────────────────────

export type ValidationWarning = {
  table: BackupTable;
  rowId: string;
  field: string;
  message: string;
};

export type ValidationError = {
  table: BackupTable;
  rowId?: string;
  field?: string;
  message: string;
};

export type BackupValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
};

// ── Internal helpers ───────────────────────────────────────────────

const BACKUP_TABLES: readonly BackupTable[] = [
  "students", "sessions", "reports", "payments", "settings",
  "raporGrades", "followUps", "expenses", "iaeeProjects",
  "studyNotes",
];

const SESSION_STATUSES = new Set(["SCHEDULED", "DONE", "CANCELLED", "NO_SHOW", "RESCHEDULED"]);
const PAYMENT_STATUSES = new Set(["UNPAID", "PAID"]);
const EXPENSE_CATEGORIES = new Set(["transport", "buku", "alat", "platform", "lainnya"]);
const FOLLOWUP_TYPES = new Set(["continue-topic", "misconception", "send-resource", "other"]);
const IAEE_TYPES = new Set(["IA", "EE", "PP"]);
const MILESTONE_STATUSES = new Set(["pending", "in_progress", "done"]);
const STUDENT_LEVELS = new Set(["MYP", "IBDP", "UNIV"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pushError(errors: ValidationError[], table: BackupTable, message: string, rowId?: string, field?: string): void {
  errors.push({ table, rowId, field, message });
}

function pushWarning(warnings: ValidationWarning[], table: BackupTable, rowId: string, field: string, message: string): void {
  warnings.push({ table, rowId, field, message });
}

// ── Individual validators ──────────────────────────────────────────

function validateNumbers(
  errors: ValidationError[],
  table: BackupTable,
  row: Record<string, unknown>,
  rowId: string,
  field: string,
): void {
  const val = row[field];
  if (val !== undefined && val !== null) {
    if (typeof val !== "number" || !Number.isFinite(val)) {
      pushError(errors, table, `${table}.${rowId}.${field} harus berupa angka finite.`, rowId, field);
    } else if (val < 0 && ["cost", "totalCost", "totalHours", "durationHours", "hourlyRate", "defaultRate", "amount"].includes(field)) {
      pushError(errors, table, `${table}.${rowId}.${field} tidak boleh negatif.`, rowId, field);
    }
  }
}

function validateDateString(
  errors: ValidationError[],
  table: BackupTable,
  row: Record<string, unknown>,
  rowId: string,
  field: string,
  isDateOnly = false,
): void {
  const val = row[field];
  if (val === undefined || val === null) return;
  if (typeof val !== "string") {
    pushError(errors, table, `${table}.${rowId}.${field} harus berupa string tanggal.`, rowId, field);
    return;
  }
  if (isDateOnly) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      pushError(errors, table, `${table}.${rowId}.${field} harus format YYYY-MM-DD.`, rowId, field);
      return;
    }
    const [y, m, d] = val.split("-").map(Number);
    if (m < 1 || m > 12) {
      pushError(errors, table, `${table}.${rowId}.${field} bulan harus 01-12.`, rowId, field);
    }
    const date = new Date(y, m - 1, d);
    if (date.getDate() !== d) {
      pushError(errors, table, `${table}.${rowId}.${field} bukan tanggal kalender yang sah.`, rowId, field);
    }
  } else {
    if (Number.isNaN(Date.parse(val))) {
      pushError(errors, table, `${table}.${rowId}.${field} bukan tanggal ISO yang sah.`, rowId, field);
    }
  }
}

function validateStringArray(
  errors: ValidationError[],
  table: BackupTable,
  row: Record<string, unknown>,
  rowId: string,
  field: string,
): void {
  const val = row[field];
  if (val === undefined || val === null) return;
  if (!Array.isArray(val)) {
    pushError(errors, table, `${table}.${rowId}.${field} harus berupa daftar.`, rowId, field);
    return;
  }
  for (let i = 0; i < val.length; i++) {
    if (typeof val[i] !== "string") {
      pushError(errors, table, `${table}.${rowId}.${field}[${i}] harus berupa teks.`, rowId, field);
    }
  }
}
// ── Student validator ──────────────────────────────────────────────

function validateStudent(
  errors: ValidationError[],
  warnings: ValidationWarning[],
  row: Record<string, unknown>,
  id: string,
): void {
  if (typeof row.name !== "string" || !row.name) pushError(errors, "students", `students.${id}.name wajib diisi.`, id, "name");
  if (row.level !== undefined && row.level !== null && !STUDENT_LEVELS.has(row.level as string)) {
    pushError(errors, "students", `students.${id}.level tidak dikenal (${String(row.level)}).`, id, "level");
  }
  validateStringArray(errors, "students", row, id, "subjects");
  if (row.parentContact !== undefined && row.parentContact !== null) {
    if (!isRecord(row.parentContact)) {
      pushError(errors, "students", `students.${id}.parentContact harus berupa objek.`, id, "parentContact");
    } else if (typeof row.parentContact.phone !== "string" || !row.parentContact.phone) {
      pushError(errors, "students", `students.${id}.parentContact.phone wajib diisi.`, id, "parentContact.phone");
    }
  }
  validateNumbers(errors, "students", row, id, "hourlyRate");
  if (row.active !== undefined && row.active !== null && typeof row.active !== "boolean") {
    pushError(errors, "students", `students.${id}.active harus boolean.`, id, "active");
  }
  validateDateString(errors, "students", row, id, "enrolledAt", true);
  // Extra fields: warn but don't block
  for (const key of Object.keys(row)) {
    if (!["id", "name", "level", "subjects", "parentContact", "hourlyRate", "active", "enrolledAt", "photo", "billingPolicy", "color"].includes(key)) {
      pushWarning(warnings, "students", id, key, `Field ekstra pada students.${id}: ${key}.`);
    }
  }
}

// ── Session validator ──────────────────────────────────────────────

function validateSession(
  errors: ValidationError[],
  row: Record<string, unknown>,
  id: string,
): void {
  if (typeof row.studentId !== "string" || !row.studentId) pushError(errors, "sessions", `sessions.${id}.studentId wajib diisi.`, id, "studentId");
  validateDateString(errors, "sessions", row, id, "date", true);
  validateNumbers(errors, "sessions", row, id, "durationHours");
  if (row.status !== undefined && row.status !== null && !SESSION_STATUSES.has(row.status as string)) {
    pushError(errors, "sessions", `sessions.${id}.status tidak dikenal (${String(row.status)}).`, id, "status");
  }
  validateStringArray(errors, "sessions", row, id, "subjects");
  validateNumbers(errors, "sessions", row, id, "rateSnapshot");
  validateNumbers(errors, "sessions", row, id, "cost");
  validateDateString(errors, "sessions", row, id, "createdAt");
  validateDateString(errors, "sessions", row, id, "updatedAt");
}
// ── Report validator ───────────────────────────────────────────────

function validateReport(
  errors: ValidationError[],
  row: Record<string, unknown>,
  id: string,
): void {
  if (typeof row.studentId !== "string" || !row.studentId) pushError(errors, "reports", `reports.${id}.studentId wajib diisi.`, id, "studentId");
  validateDateString(errors, "reports", row, id, "periodStart", true);
  validateDateString(errors, "reports", row, id, "periodEnd", true);
  if (typeof row.periodStart === "string" && typeof row.periodEnd === "string") {
    if (row.periodStart > row.periodEnd) {
      pushError(errors, "reports", `reports.${id}.periodStart (${row.periodStart}) > periodEnd (${row.periodEnd}).`, id, "periodStart");
    }
  }
  if (row.sessionIds !== undefined && row.sessionIds !== null && !Array.isArray(row.sessionIds)) {
    pushError(errors, "reports", `reports.${id}.sessionIds harus berupa daftar.`, id, "sessionIds");
  }
  if (row.templateKey !== undefined && row.templateKey !== null && !isRecord(row.templateKey)) {
    pushError(errors, "reports", `reports.${id}.templateKey harus berupa objek.`, id, "templateKey");
  }
  validateNumbers(errors, "reports", row, id, "totalHours");
  validateNumbers(errors, "reports", row, id, "totalCost");
  validateDateString(errors, "reports", row, id, "createdAt");
}

// ── Payment validator ──────────────────────────────────────────────

function validatePayment(
  errors: ValidationError[],
  row: Record<string, unknown>,
  id: string,
): void {
  if (typeof row.studentId !== "string" || !row.studentId) pushError(errors, "payments", `payments.${id}.studentId wajib diisi.`, id, "studentId");
  validateNumbers(errors, "payments", row, id, "totalCost");
  if (row.status !== undefined && row.status !== null && !PAYMENT_STATUSES.has(row.status as string)) {
    pushError(errors, "payments", `payments.${id}.status tidak dikenal (${String(row.status)}).`, id, "status");
  }
  if (row.dueAt !== undefined && row.dueAt !== null) {
    validateDateString(errors, "payments", row, id, "dueAt", true);
  }
}

// ── Settings validator ─────────────────────────────────────────────

function validateSettings(
  errors: ValidationError[],
  warnings: ValidationWarning[],
  rows: Record<string, unknown>[],
): void {
  if (rows.length === 0) {
    pushWarning(warnings, "settings", "", "id", "Settings kosong — nilai default akan digunakan.");
    return;
  }
  if (rows.length > 1) {
    pushError(errors, "settings", `settings memiliki ${rows.length} baris (maksimal 1).`, "app");
    return;
  }
  const row = rows[0];
  if (row.id !== "app") {
    pushError(errors, "settings", `settings.id harus "app", bukan "${String(row.id)}".`, String(row.id ?? ""), "id");
    return;
  }
  if (row.tutorProfile !== undefined && row.tutorProfile !== null) {
    if (!isRecord(row.tutorProfile)) {
      pushError(errors, "settings", "settings.app.tutorProfile harus berupa objek.", "app", "tutorProfile");
    } else {
      if (typeof row.tutorProfile.name !== "string") pushError(errors, "settings", "settings.app.tutorProfile.name harus string.", "app", "tutorProfile.name");
      if (typeof row.tutorProfile.phone !== "string") pushError(errors, "settings", "settings.app.tutorProfile.phone harus string.", "app", "tutorProfile.phone");
    }
  }
  validateNumbers(errors, "settings", row, "app", "defaultRate");
  if (typeof row.paymentInfo !== "string") pushError(errors, "settings", "settings.app.paymentInfo harus string.", "app", "paymentInfo");
  validateStringArray(errors, "settings", row, "app", "subjects");
  if (row.ai !== undefined && row.ai !== null) {
    if (!isRecord(row.ai)) {
      pushError(errors, "settings", "settings.app.ai harus berupa objek.", "app", "ai");
    } else {
      if (typeof row.ai.enabled !== "boolean") pushError(errors, "settings", "settings.app.ai.enabled harus boolean.", "app", "ai.enabled");
      if (typeof row.ai.model !== "string") pushError(errors, "settings", "settings.app.ai.model harus string.", "app", "ai.model");
    }
  }
}
// ── RaporGrade validator ───────────────────────────────────────────

function validateRaporGrade(
  errors: ValidationError[],
  row: Record<string, unknown>,
  id: string,
): void {
  if (typeof row.studentId !== "string" || !row.studentId) pushError(errors, "raporGrades", `raporGrades.${id}.studentId wajib diisi.`, id, "studentId");
  if (row.grades !== undefined && row.grades !== null && !Array.isArray(row.grades)) {
    pushError(errors, "raporGrades", `raporGrades.${id}.grades harus berupa daftar.`, id, "grades");
  }
}

// ── FollowUp validator ─────────────────────────────────────────────

function validateFollowUp(
  errors: ValidationError[],
  row: Record<string, unknown>,
  id: string,
): void {
  if (typeof row.studentId !== "string" || !row.studentId) pushError(errors, "followUps", `followUps.${id}.studentId wajib diisi.`, id, "studentId");
  if (row.type !== undefined && row.type !== null && !FOLLOWUP_TYPES.has(row.type as string)) {
    pushError(errors, "followUps", `followUps.${id}.type tidak dikenal (${String(row.type)}).`, id, "type");
  }
  if (typeof row.text !== "string" || !row.text) pushError(errors, "followUps", `followUps.${id}.text wajib diisi.`, id, "text");
}

// ── Expense validator ──────────────────────────────────────────────

function validateExpense(
  errors: ValidationError[],
  warnings: ValidationWarning[],
  row: Record<string, unknown>,
  id: string,
): void {
  validateDateString(errors, "expenses", row, id, "date", true);
  if (row.category !== undefined && row.category !== null && !EXPENSE_CATEGORIES.has(row.category as string)) {
    pushWarning(warnings, "expenses", id, "category", `expenses.${id}.category tidak dikenal (${String(row.category)}) — dipertahankan apa adanya.`);
  }
  validateNumbers(errors, "expenses", row, id, "amount");
  if (row.description !== undefined && row.description !== null && typeof row.description !== "string") {
    pushError(errors, "expenses", `expenses.${id}.description harus string.`, id, "description");
  }
}

// ── IaEeProject validator ──────────────────────────────────────────

function validateIaEeProject(
  errors: ValidationError[],
  warnings: ValidationWarning[],
  row: Record<string, unknown>,
  id: string,
): void {
  if (typeof row.studentId !== "string" || !row.studentId) pushError(errors, "iaeeProjects", `iaeeProjects.${id}.studentId wajib diisi.`, id, "studentId");
  if (row.type !== undefined && row.type !== null && !IAEE_TYPES.has(row.type as string)) {
    pushWarning(warnings, "iaeeProjects", id, "type", `iaeeProjects.${id}.type tidak dikenal (${String(row.type)}) — dipertahankan apa adanya.`);
  }
  if (row.milestones !== undefined && row.milestones !== null) {
    if (!Array.isArray(row.milestones)) {
      pushError(errors, "iaeeProjects", `iaeeProjects.${id}.milestones harus berupa daftar.`, id, "milestones");
    } else {
      for (let i = 0; i < row.milestones.length; i++) {
        const m = row.milestones[i];
        if (isRecord(m) && m.status !== undefined && m.status !== null && !MILESTONE_STATUSES.has(m.status as string)) {
          pushWarning(warnings, "iaeeProjects", id, `milestones[${i}].status`, `Status milestone tidak dikenal (${String(m.status)}).`);
        }
      }
    }
  }
}

// ── StudyNote validator ────────────────────────────────────────────

function validateStudyNote(
  warnings: ValidationWarning[],
  row: Record<string, unknown>,
  id: string,
): void {
  if (typeof row.content !== "string") {
    pushWarning(warnings, "studyNotes", id, "content", "studyNotes.content bukan string.");
  }
}
// ── Cross-table relation validation ────────────────────────────────

function validateRelations(
  errors: ValidationError[],
  warnings: ValidationWarning[],
  data: Record<string, Record<string, unknown>[]>,
): void {
  const studentIds = new Set<string>();
  for (const s of data.students) studentIds.add(s.id as string);

  function checkStudentRef(table: BackupTable, row: Record<string, unknown>, rowId: string, field: string): void {
    const sid = row[field];
    if (typeof sid === "string" && sid && !studentIds.has(sid)) {
      pushError(errors, table, `${table}.${rowId}.${field} menunjuk murid ${sid} yang tidak ada.`, rowId, field);
    }
  }

  // Core required studentId references
  for (const row of data.sessions) checkStudentRef("sessions", row, String(row.id ?? ""), "studentId");
  for (const row of data.reports) checkStudentRef("reports", row, String(row.id ?? ""), "studentId");
  for (const row of data.payments) checkStudentRef("payments", row, String(row.id ?? ""), "studentId");
  for (const row of data.raporGrades) checkStudentRef("raporGrades", row, String(row.id ?? ""), "studentId");
  for (const row of data.followUps) checkStudentRef("followUps", row, String(row.id ?? ""), "studentId");
  for (const row of data.iaeeProjects) checkStudentRef("iaeeProjects", row, String(row.id ?? ""), "studentId");
  for (const row of data.studyNotes) checkStudentRef("studyNotes", row, String(row.id ?? ""), "studentId");

  // Cross-reference check: report <-> payment must not point to different students
  const paymentsByReportId = new Map<string, Record<string, unknown>>();
  for (const p of data.payments) {
    const rid = p.reportId;
    if (typeof rid === "string" && rid) paymentsByReportId.set(rid, p);
  }
  for (const report of data.reports) {
    const rid = report.id as string;
    const payment = paymentsByReportId.get(rid);
    if (payment && typeof payment.studentId === "string" && typeof report.studentId === "string") {
      if (payment.studentId !== report.studentId) {
        pushError(errors, "reports", `reports.${rid}.studentId dan payments.${String(payment.id)}.studentId menunjuk murid berbeda (${report.studentId} vs ${payment.studentId}).`, rid, "studentId");
      }
    }
  }

  // Orphaned expense.studentId: warning (deleteStudent doesn't cascade)
  for (const row of data.expenses) {
    const sid = row.studentId;
    if (typeof sid === "string" && sid && !studentIds.has(sid)) {
      pushWarning(warnings, "expenses", String(row.id ?? ""), "studentId", `expenses.${String(row.id)}.studentId menunjuk murid ${sid} yang tidak ada (deleteStudent tidak menghapus expenses terkait). Data dipertahankan.`);
    }
  }

  // Orphaned followUp.sourceSessionId: warning
  const sessionIds = new Set<string>();
  for (const s of data.sessions) sessionIds.add(s.id as string);
  for (const row of data.followUps) {
    const ssrc = row.sourceSessionId;
    if (typeof ssrc === "string" && ssrc && !sessionIds.has(ssrc)) {
      pushWarning(warnings, "followUps", String(row.id ?? ""), "sourceSessionId", `followUps.${String(row.id)}.sourceSessionId menunjuk sesi ${ssrc} yang tidak ada.`);
    }
  }

  // Orphaned report.sessionIds: warning
  for (const report of data.reports) {
    const sids = report.sessionIds;
    if (Array.isArray(sids)) {
      for (const sid of sids) {
        if (typeof sid === "string" && !sessionIds.has(sid)) {
          pushWarning(warnings, "reports", String(report.id ?? ""), "sessionIds", `reports.${String(report.id)}.sessionIds menunjuk sesi ${sid} yang tidak ada.`);
        }
      }
    }
  }
}
// ── Main entry point ───────────────────────────────────────────────

export function validateBackupData(
  data: Record<string, Record<string, unknown>[]>,
  databaseVersion?: number,
): BackupValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 0. Extra table check: unknown tables should be rejected (except monthClosings legacy)
  const knownTables = new Set(BACKUP_TABLES);
  for (const tableName of Object.keys(data)) {
    if (!knownTables.has(tableName as BackupTable) && tableName !== "monthClosings") {
      pushError(errors, "students", `Backup berisi tabel tidak dikenal (${tableName}). Perbarui aplikasi sebelum restore.`);
    }
  }

  // 1. Schema version check
  if (databaseVersion !== undefined) {
    if (typeof databaseVersion !== "number" || !Number.isInteger(databaseVersion) || databaseVersion < 1) {
      pushError(errors, "students", `Versi skema (${String(databaseVersion)}) tidak valid — harus integer positif.`);
    } else if (databaseVersion > db.verno) {
      pushError(errors, "students", `Versi skema backup (${databaseVersion}) lebih baru dari versi aplikasi (${db.verno}). Perbarui aplikasi sebelum restore.`);
    }
  }

  // 2. Student validation
  for (const row of data.students) {
    const id = String(row.id ?? "");
    if (typeof row.id !== "string" || !row.id) { pushError(errors, "students", "students memiliki baris tanpa ID.", "", "id"); continue; }
    validateStudent(errors, warnings, row, id);
  }

  // 3. Session validation
  for (const row of data.sessions) {
    const id = String(row.id ?? "");
    if (typeof row.id !== "string" || !row.id) { pushError(errors, "sessions", "sessions memiliki baris tanpa ID.", "", "id"); continue; }
    validateSession(errors, row, id);
  }

  // 4. Report validation
  for (const row of data.reports) {
    const id = String(row.id ?? "");
    if (typeof row.id !== "string" || !row.id) { pushError(errors, "reports", "reports memiliki baris tanpa ID.", "", "id"); continue; }
    validateReport(errors, row, id);
  }

  // 5. Payment validation
  for (const row of data.payments) {
    const id = String(row.id ?? "");
    if (typeof row.id !== "string" || !row.id) { pushError(errors, "payments", "payments memiliki baris tanpa ID.", "", "id"); continue; }
    validatePayment(errors, row, id);
  }

  // 6. Settings validation
  validateSettings(errors, warnings, data.settings);

  // 7. RaporGrade validation
  for (const row of data.raporGrades) {
    const id = String(row.id ?? "");
    if (typeof row.id !== "string" || !row.id) { pushError(errors, "raporGrades", "raporGrades memiliki baris tanpa ID.", "", "id"); continue; }
    validateRaporGrade(errors, row, id);
  }

  // 8. FollowUp validation
  for (const row of data.followUps) {
    const id = String(row.id ?? "");
    if (typeof row.id !== "string" || !row.id) { pushError(errors, "followUps", "followUps memiliki baris tanpa ID.", "", "id"); continue; }
    validateFollowUp(errors, row, id);
  }

  // 9. Expense validation
  for (const row of data.expenses) {
    const id = String(row.id ?? "");
    if (typeof row.id !== "string" || !row.id) { pushError(errors, "expenses", "expenses memiliki baris tanpa ID.", "", "id"); continue; }
    validateExpense(errors, warnings, row, id);
  }

  // 10. IaEeProject validation
  for (const row of data.iaeeProjects) {
    const id = String(row.id ?? "");
    if (typeof row.id !== "string" || !row.id) { pushError(errors, "iaeeProjects", "iaeeProjects memiliki baris tanpa ID.", "", "id"); continue; }
    validateIaEeProject(errors, warnings, row, id);
  }

  // 11. StudyNote validation
  for (const row of data.studyNotes) {
    const id = String(row.studentId ?? "");
    if (typeof row.studentId !== "string" || !row.studentId) { pushError(errors, "studyNotes", "studyNotes memiliki baris tanpa studentId.", "", "studentId"); continue; }
    validateStudyNote(warnings, row, id);
  }

  // 12. Cross-table relation validation
  validateRelations(errors, warnings, data);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}