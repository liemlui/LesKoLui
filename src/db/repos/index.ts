// ── Barrel export — re-exports all repo functions ─────────────────
// Import from "../db/repos" as before — no breaking changes.

// Helpers (internal use by other repos)
export { monthRange, timestamp, nowTimeWIB, subtractHoursFromTime, timeToMin } from "./helpers";
export { todayWIB } from "../../lib/format";

// Audit
export { logAudit, listAuditLog } from "./auditRepo";

// Settings
export { getSettings, initSettings, saveSettings } from "./settingsRepo";

// Students + Rapor Grades
export { listStudents, getStudent, createStudent, updateStudent, deleteStudent } from "./studentRepo";
export { listRaporGrades, upsertRaporGrade, deleteRaporGrade } from "./studentRepo";

// Sessions + Scheduling + Photo maintenance + Streak
export {
  createSession, markSessionDone, updateSession, deleteSession,
  cancelSession, markSessionNoShow, rescheduleSession,
  listSessionsByStudent, listSessionsForMonth, listSessionsByStudentMonth,
  listSessionsByStudentRange,
  isBillableSession, listBillableSessionsForMonth, listBillableSessionsByStudentMonth,
  listScheduledForMonth, listAllSessionsForMonth,
  listAllSessionsForWeek, listDoneSessionsForDate,
  listPastScheduledSessions,
  scheduleSession, scheduleBatch,
  cancelSeriesSessions, updateSeriesSessions,
  findConflicts,
  listScheduledForStudent, listAllUpcomingScheduled,
  recentShortNotes,
  getLastDoneSession, getRecentDoneSessions,
  countSessionPhotos, pruneSessionPhotosBefore,
} from "./sessionRepo";
export type { CancelMode, EditMode } from "./sessionRepo";

// Reports
export {
  getReport, upsertReport, listReportsByStudent, listAllReports,
  findReportByPeriod, listOverlappingReports, listConfirmedReportsByStudent,
  confirmReport, discardReport,
} from "./reportRepo";

// Payments + Month Closing + Expenses
export {
  getPayment, upsertPayment, listPayments,
  markPaymentTransferred, markPaymentUnpaid, updatePaymentAmount,
  getPaymentByReport, syncReportPayment,
  markPaymentTransferredById, markPaymentUnpaidById, updatePaymentAmountById,
  getMonthClosing, listMonthClosings, closeMonth, reopenMonth,
  computeMonthBills, getCashSummary,
  createExpense, listExpenses, deleteExpense,
  getMonthlyIncomeVsExpense,
} from "./paymentRepo";
export type { StudentBill, MonthCashSummary } from "./paymentRepo";
export type { ExpenseCategory } from "./paymentRepo";

// IA / EE Projects
export {
  createIaEeProject, listIaEeProjects, deleteIaEeProject,
  addMilestone, updateMilestone, deleteMilestone,
} from "./iaeeRepo";
export type { IaEeMilestone } from "./paymentRepo";

// Follow-ups
export { createFollowUp, listPendingFollowUps, completeFollowUp } from "./followUpRepo";
export type { FollowUpType } from "./followUpRepo";

// Study Notes
export { getStudyNote, saveStudyNote, listAllStudyNotes } from "./studyNotesRepo";
