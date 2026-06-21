export type Level = "MYP" | "IBDP" | "UNIV";
export type SessionStatus = "SCHEDULED" | "DONE" | "CANCELLED";
export type PaymentStatus = "UNPAID" | "PAID";

export const DEFAULT_RATE = 200_000;   // IDR per hour
export const MIN_DURATION = 1.5;       // hours
export const DURATION_STEP = 0.5;      // hours
export const PHOTO_MAX_PX = 800;       // longest side

export interface ParentContact { name?: string; phone: string; }

export interface EngagementLog {
  prepared?: boolean;     // sudah siap belajar (+2)
  focused?: boolean;      // sangat fokus (+1)
  drowsy?: boolean;       // mengantuk (-2)
  playingPhone?: boolean; // main HP (-3)
  score: number;          // 1-10, computed
}

export type HomeworkStatus = "assigned" | "done" | "overdue" | "cancelled";
export type FollowUpType   = "continue-topic" | "misconception" | "send-resource" | "check-homework" | "other";

export interface Homework {
  id: string;
  studentId: string;
  sessionId?: string;
  subject: string;
  title: string;
  instructions?: string;
  assignedAt: string;   // YYYY-MM-DD
  dueAt?: string;       // YYYY-MM-DD
  status: HomeworkStatus;
  tutorFeedback?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpItem {
  id: string;
  studentId: string;
  sourceSessionId?: string;
  type: FollowUpType;
  text: string;
  completedAt?: string;
  createdAt: string;
}

export interface RaporGrade {
  id: string;
  studentId: string;
  semester: string;       // e.g. "2024/2025-S1"
  grades: { subject: string; grade: string }[];
  notes?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  photo?: Blob;
  level: Level;
  subjects: string[];
  studentPhone?: string;
  parentContact: ParentContact;
  hourlyRate: number;
  active: boolean;
  enrolledAt: string;
  notes?: string;
}

export interface Session {
  id: string;
  studentId: string;
  date: string;
  time?: string;
  durationHours: number;
  subjects: string[];
  photo?: Blob;
  shortNote: string;
  mood?: string;
  topic?: string;
  needsWork?: string;
  predictedGrade?: string;
  narrative?: string;
  engagement?: EngagementLog;
  projectId?: string;
  seriesId?: string;
  status: SessionStatus;
  rateSnapshot: number;
  cost: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateKey {
  themeId: string;
  layoutId: string;
}

export interface MonthlyReport {
  id: string;
  studentId: string;
  month: string;
  sessionIds: string[];
  templateKey: TemplateKey;
  summaryText: string;
  teacherNote?: string;
  quote?: string;
  totalHours: number;
  totalCost: number;
  createdAt: string;
  pdfGeneratedAt?: string;
}

export interface Payment {
  id: string;
  studentId: string;
  month: string;
  totalCost: number;
  status: PaymentStatus;
  paidAt?: string;
  method?: string;
}

export interface Settings {
  id: "app";
  tutorProfile: { name: string; phone: string; email?: string; address?: string };
  logo?: Blob;
  defaultRate: number;
  paymentInfo: string;
  subjects: string[];
  financialPin?: string;
  ai: { enabled: boolean; workerUrl: string; model: string };
  templatePref: { excludedThemeIds?: string[] };
}
