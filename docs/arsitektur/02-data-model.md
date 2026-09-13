# 02 - Data Model (updated 2026-09-05 — v1.70.5, schema 14)

> **Catatan:** Dokumen ini telah diselaraskan dengan kode aktual. Tabel `homeworks` dan `monthClosings` sudah tidak ada di skema. Backup mencakup 10 tabel (lihat `BACKUP_TABLES` di `lib/backup.ts`).

All identifiers are English. Field names below are exact and should match the current code in `src/db/`.

## `src/db/types.ts`

```ts
export type Level = "MYP" | "IBDP" | "UNIV";

export type CurriculumType =
  | "IB MYP" | "IB DP" | "Cambridge IGCSE" | "Cambridge O Level"
  | "Cambridge AS Level" | "Cambridge A Level" | "AP" | "National" | "Custom";
export type SessionStatus = "SCHEDULED" | "DONE" | "CANCELLED";
export type PaymentStatus = "UNPAID" | "PAID";
export type PaymentSource = "auto" | "manual";

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

export type FollowUpType   = "continue-topic" | "misconception" | "send-resource" | "other";

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

export interface TemplateKey { themeId: string; layoutId: string; }

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
  source?: PaymentSource;
  paidAt?: string;
  method?: string;
}

// ── Month Closing (Tutup Bulan) ──────────────────────────────────────────────
export interface MonthClosing {
  id: string;            // uuid
  month: string;         // YYYY-MM (unique)
  closedAt: string;      // ISO timestamp
  totalPotensi: number;  // snapshot: sum of DONE session costs at close time
  totalHours: number;    // snapshot: sum of DONE session hours
  studentCount: number;  // snapshot: number of students billed
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
  financialPin?: string;         // SHA-256 hashed
  ai: { enabled: boolean; apiKey?: string; model: string; workerUrl?: string; workerToken?: string };
  templatePref: { excludedThemeIds?: string[]; customThemes?: CustomTheme[] };
  bankAccounts?: { bca?: string; cimb?: string; bri?: string; mandiri?: string; bsi?: string; ewallet?: string; accountName?: string };
}
```

## `src/db/db.ts` — Schema v8 (11 tables)

```ts
import Dexie, { Table } from "dexie";
// ...
export class JurnalDB extends Dexie {
  students!:    Table<Student,       string>;
  sessions!:    Table<Session,       string>;
  reports!:     Table<MonthlyReport, string>;
  payments!:    Table<Payment,       string>;
  settings!:    Table<Settings,      string>;
  raporGrades!: Table<RaporGrade,    string>;
  homeworks!:   Table<Homework,      string>;
  followUps!:   Table<FollowUpItem,  string>;
  expenses!:    Table<Expense,       string>;
  iaeeProjects!:Table<IaEeProject,   string>;
  monthClosings!:Table<MonthClosing, string>;
}
```

### Migration History

| Version | Changes |
|---------|---------|
| v2 | Initial schema: students, sessions, reports, payments, settings |
| v3 | payments: add studentId index |
| v4 | Migrate sessions.subject (string) → sessions.subjects (string[]) |
| v5 | Add raporGrades table |
| v6 | Add followUps table | |
| v7 | Add expenses + iaeeProjects tables | |
| v8 | Add monthClosings table | *(Dihapus di v14)* |
| v9 | Add auditLog table (lokal, tak ikut backup) | |
| v10 | Add studyNotes table (PK = studentId) | |
| v11 | reports + payments: periodStart, periodEnd, reportId, dueAt | Backfill periode laporan lama |
| v12 | expenses: add studentId index | rebuild index atomik |
| v13 | payments: add dueAt index + backfill | `invoiceDueAt()` untuk data lama |
| v14 | **Hapus monthClosings** — snapshot dianggap bisa dihitung live | Tabel `monthClosings: null` |

### Indexes per Table

```ts
students:    "id, name, level, active"
sessions:    "id, studentId, date, status, createdAt, [studentId+date]"
reports:     "id, studentId, month, [studentId+month]"
payments:    "id, studentId, [studentId+month], status"
settings:    "id"
raporGrades: "id, studentId, semester, [studentId+semester]"
followUps:   "id, studentId, completedAt"
expenses:    "id, date, category"
iaeeProjects:"id, studentId, type"
auditLog:    "id, timestamp, entityType"
studyNotes:  "studentId"
```

## `src/db/repos.ts` — Repository Functions

### Settings (singleton)
```ts
getSettings(): Promise<Settings>
initSettings(): Promise<void>
saveSettings(patch: Partial<Settings>): Promise<void>
```

### Students
```ts
listStudents(activeOnly?: boolean): Promise<Student[]>
getStudent(id: string): Promise<Student | undefined>
createStudent(input: Omit<Student,"id">): Promise<string>
updateStudent(id: string, patch: Partial<Student>): Promise<void>
```

### Sessions (25+ functions)
```ts
createSession(input): Promise<string>
updateSession(id, patch): Promise<void>         // refresh updatedAt, recalc cost if duration changes
listSessionsByStudent(studentId): Promise<Session[]>
listSessionsByStudentMonth(studentId, month): Promise<Session[]>
listSessionsForMonth(month): Promise<Session[]>
listAllSessionsForMonth(month): Promise<Session[]>
listAllSessionsForWeek(start, end): Promise<Session[]>
listSessionsToday(): Promise<Session[]>
listScheduledForMonth(month): Promise<Session[]>
listScheduledForStudent(studentId, fromDate?): Promise<Session[]>
listDoneSessionsForDateRange(start, end): Promise<Session[]>
cancelSession(id): Promise<void>
scheduleSession(input): Promise<string>
scheduleBatch(items, seriesId?): Promise<number>
cancelSeriesSessions(session, mode): Promise<void>
updateSeriesSessions(session, patch, mode): Promise<void>
findConflicts(dates, time, durationHours): Promise<Conflict[]>
recentShortNotes(limit?): Promise<string[]>
getLastDoneSession(studentId): Promise<Session | undefined>
listSessionsInDateRange(studentId, start, end): Promise<Session[]>
listAllUpcomingScheduled(fromDate?): Promise<Session[]>
```

### Reports
```ts
getReport(studentId, month): Promise<MonthlyReport | undefined>
upsertReport(report): Promise<string>
listReportsByStudent(studentId): Promise<MonthlyReport[]>
```

### Payments
```ts
getPayment(studentId, month): Promise<Payment | undefined>
upsertPayment(payment): Promise<void>
listPayments(month?): Promise<Payment[]>
```

### Rapor Grades
```ts
listRaporGrades(studentId): Promise<RaporGrade[]>
upsertRaporGrade(grade): Promise<void>
deleteRaporGrade(id): Promise<void>
```

### Follow-up Items
```ts
createFollowUp(input): Promise<string>
listPendingFollowUps(studentId?): Promise<FollowUpItem[]>
completeFollowUp(id): Promise<void>
```

### Expenses
```ts
listExpenses(month?): Promise<Expense[]>
createExpense(input): Promise<string>
updateExpense(id, patch): Promise<void>
deleteExpense(id): Promise<void>
```

### IA/EE Projects
```ts
listIaEeProjects(studentId): Promise<IaEeProject[]>
getIaEeProject(id): Promise<IaEeProject | undefined>
upsertIaEeProject(project): Promise<void>
deleteIaEeProject(id): Promise<void>
```

## Default Settings

```ts
const DEFAULT_SETTINGS: Settings = {
  id: "app",
  tutorProfile: { name: "", phone: "" },
  defaultRate: DEFAULT_RATE,
  paymentInfo: "",
  subjects: [
    "Mathematics AA","Mathematics AI","Physics","Chemistry","Biology",
    "Economics","Business Management","Geography","History","Psychology",
    "Computer Science","ESS","Bahasa Indonesia","TOK","Other",
  ],
  ai: { enabled: false, apiKey: "", model: "deepseek-chat" },
  templatePref: {},
};
```

## Business Rules

- Cost is snapshotted on session creation: `rateSnapshot = student.hourlyRate`, `cost = durationHours * rateSnapshot`.
- `updateSession` must recalculate `cost` when `durationHours` changes.
- Sessions use `subjects: string[]`, not `subject: string`.
- Monthly report totals aggregate DONE sessions whose `date` falls in the selected month.
- Scheduled sessions can belong to a `seriesId`; series edit/cancel supports this/future/all modes.
- `financialPin` is sensitive and must be stored as a SHA-256 hash.
- Settings writes must read the current row, merge the patch, then `put()` the full row.
- **Backup must include all 10 domain tables** (`BACKUP_TABLES` in `lib/backup.ts`): students, sessions, reports, payments, settings, raporGrades, followUps, expenses, iaeeProjects, studyNotes.
- `auditLog` bersifat lokal per perangkat dan tidak ikut backup.
- Expenses track tutor operational costs (transport, books, tools, platform, other).
- **`monthClosings` sudah dihapus (v14).** Restore mengabaikan tabel legacy tersebut.
- **Tidak ada tabel `homeworks`.** Data PR dikelola melalui `followUps` dan catatan sesi.
- IA/EE projects manage milestones with status (pending/in_progress/done).

## Reactivity Pattern

```tsx
import { useLiveQuery } from "dexie-react-hooks";

const students = useLiveQuery(() => listStudents(true), []);
if (!students) return <Loading />;