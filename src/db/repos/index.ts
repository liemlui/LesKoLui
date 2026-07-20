// ── Barrel export — re-exports all repo functions ─────────────────
// Import from "../db/repos" as before — no breaking changes.

// Helpers (internal use by other repos)
export { monthRange, timestamp, nowTimeWIB, subtractHoursFromTime, timeToMin } from "./helpers";
export { todayWIB } from "../../lib/format";

// Audit
export { logAudit, listAuditLog, clearAuditLog } from "./auditRepo";

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
  isBillableSession, listBillableSessionsForMonth, listBillableSessionsByStudentMonth,
  listSessionsToday, listScheduledForMonth, listAllSessionsForMonth,
  listAllSessionsForWeek, listDoneSessionsForDateRange, listDoneSessionsForDate,
  listPastScheduledSessions,
  scheduleSession, scheduleBatch,
  cancelSeriesSessions, updateSeriesSessions,
  findConflicts,
  listScheduledForStudent, listAllUpcomingScheduled,
  recentShortNotes,
  getLastDoneSession, listSessionsInDateRange,
  getStreak,
  countSessionPhotos, pruneSessionPhotosBefore,
} from "./sessionRepo";
export type { CancelMode, EditMode } from "./sessionRepo";

// Reports
export { getReport, upsertReport, listReportsByStudent } from "./reportRepo";

// Payments + Month Closing + Expenses
export {
  getPayment, upsertPayment, listPayments,
  markPaymentTransferred, markPaymentUnpaid, updatePaymentAmount,
  getMonthClosing, listMonthClosings, closeMonth, reopenMonth,
  computeMonthBills, getCashSummary,
  createExpense, listExpenses, listExpensesByCategory, deleteExpense,
  getExpenseTotals, getMonthlyIncomeVsExpense,
} from "./paymentRepo";
export type { StudentBill, MonthCashSummary } from "./paymentRepo";
export type { ExpenseCategory } from "./paymentRepo";

// IA / EE Projects
export {
  createIaEeProject, listIaEeProjects, updateIaEeProject, deleteIaEeProject,
  addMilestone, updateMilestone, deleteMilestone,
} from "./iaeeRepo";
export type { IaEeMilestone } from "./paymentRepo";

// Homework
export {
  createHomework, listPendingHomework, listAllPendingHomework, listAllHomeworkFull,
  updateHomework, deleteHomework, markHomeworkDone, markHomeworkNotDone,
  setHomeworkStatus, getHomeworkStats,
} from "./homeworkRepo";
export type { HomeworkStatus, HomeworkStats } from "./homeworkRepo";

// Follow-ups
export { createFollowUp, listPendingFollowUps, completeFollowUp, deleteFollowUp } from "./followUpRepo";
export type { FollowUpType } from "./followUpRepo";
