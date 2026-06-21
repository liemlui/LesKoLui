export type Level = "MYP" | "IBDP" | "UNIV";

export type CurriculumType =
  | "IB MYP"
  | "IB DP"
  | "Cambridge IGCSE"
  | "Cambridge O Level"
  | "Cambridge AS Level"
  | "Cambridge A Level"
  | "AP"
  | "National"
  | "Custom";
export type SessionStatus = "SCHEDULED" | "DONE" | "CANCELLED";
export type PaymentStatus = "UNPAID" | "PAID";

export const DEFAULT_RATE = 200_000;   // IDR per hour
export const MIN_DURATION = 1;         // hours
export const DURATION_STEP = 0.5;      // hours
export const PHOTO_MAX_PX = 800;       // longest side

export interface ParentContact { name?: string; phone: string; }

export interface EngagementLog {
  // Positif
  prepared?: boolean;       // sudah siap belajar (+2)
  focused?: boolean;        // sangat fokus (+1)
  activeAsking?: boolean;   // aktif bertanya (+1)
  quickLearner?: boolean;   // cepat paham (+1)
  // Negatif
  drowsy?: boolean;         // mengantuk (-2)
  playingPhone?: boolean;   // main HP (-3)
  needsRepetition?: boolean;// perlu diulang (-1)
  hwMissed?: boolean;       // PR tidak dikerjakan (-1)
  score: number;            // 1-10, computed
}

export type HomeworkStatus = "assigned" | "done" | "not_done" | "overdue" | "cancelled";
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
  curriculum?: CurriculumType; // richer curriculum info; drives subject picker
  grade?: string;    // e.g. "Grade 10", "Year 11"
  school?: string;   // school name
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
  behaviorTags?: string[];  // IDs from BEHAVIOR_TAGS in responseTaxonomy
  responseTag?: string;     // single ID from RESPONSE_TAGS in responseTaxonomy
  signature?: Blob;         // student signature drawn on-screen
  timeIn?: string;          // actual start time HH:MM WIB, auto-set on save
  timeOut?: string;         // actual end time HH:MM WIB, auto-set on save
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

// ── Expenses ────────────────────────────────────────────────────────────────

export type ExpenseCategory = "transport" | "buku" | "alat" | "platform" | "lainnya";

export interface Expense {
  id: string;
  date: string;          // YYYY-MM-DD
  category: ExpenseCategory;
  description: string;
  amount: number;        // IDR
  createdAt: string;
  updatedAt: string;
}

// ── IA / EE Milestone Tracker ────────────────────────────────────────────────

export type IaEeType = "IA" | "EE";
export type MilestoneStatus = "pending" | "in_progress" | "done";

export interface IaEeMilestone {
  id: string;
  title: string;
  dueAt?: string;        // YYYY-MM-DD
  status: MilestoneStatus;
  notes?: string;
  completedAt?: string;
}

export interface IaEeProject {
  id: string;
  studentId: string;
  type: IaEeType;
  subject: string;
  title: string;
  deadline?: string;     // final submission date YYYY-MM-DD
  milestones: IaEeMilestone[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  id: "app";
  tutorProfile: { name: string; phone: string; email?: string; address?: string };
  logo?: Blob;
  defaultRate: number;
  paymentInfo: string;
  subjects: string[];
  financialPin?: string;
  ai: { enabled: boolean; apiKey?: string; model: string; workerUrl?: string; workerToken?: string };
  templatePref: { excludedThemeIds?: string[] };
  bankAccounts?: { bca?: string; cimb?: string; bri?: string; mandiri?: string; bsi?: string; ewallet?: string; accountName?: string };
}
