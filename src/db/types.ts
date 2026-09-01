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
export type SessionStatus = "SCHEDULED" | "DONE" | "CANCELLED" | "NO_SHOW" | "RESCHEDULED";
export type PaymentStatus = "UNPAID" | "PAID";
export type PaymentSource = "auto" | "manual";
export type ReportStatus = "draft" | "confirmed";
export type BillingPolicy = "monthly" | "session_count" | "manual";
export type ReportBillingMode = "monthly" | "session_count" | "range";

/** Status laporan untuk ditampilkan ke pengguna. `confirmed` adalah status
 *  internal final; `pdfGeneratedAt` menandai laporan sudah diekspor/dibagikan. */
export type ReportDisplayStatus = "draft" | "final" | "shared";

/** Existing students predate billing policies and remain monthly by default. */
export function billingPolicyOf(
  student: Pick<Student, "billingPolicy">,
): BillingPolicy {
  return student.billingPolicy ?? "monthly";
}

/** Status finalisasi laporan. Draft belum mengunci periode; confirmed berarti
 *  laporan sudah final. Status ini tidak menyatakan invoice sudah diterbitkan
 *  dan tidak menyatakan laporan sudah dikirim/dibagikan.
 *  Laporan lama (sebelum v1.39) tidak punya status → dianggap "confirmed". */
export function reportStatus(report: { status?: ReportStatus }): ReportStatus {
  return report.status ?? "confirmed";
}

/** Status yang dipakai UI: Draft → Final → Sudah dibagikan. */
export function reportDisplayStatus(
  report: { status?: ReportStatus; pdfGeneratedAt?: string },
): ReportDisplayStatus {
  if (reportStatus(report) === "draft") return "draft";
  return report.pdfGeneratedAt ? "shared" : "final";
}

export const DEFAULT_RATE = 200_000;   // IDR per hour
export const MIN_DURATION = 1;         // hours
export const DURATION_STEP = 0.5;      // hours
export const PHOTO_MAX_PX = 640;       // longest side — cukup untuk tampil di laporan PDF

export interface ParentContact { name?: string; phone: string; }

export interface EngagementLog {
  // Positif
  prepared?: boolean;       // sudah siap belajar (+2)
  focused?: boolean;        // sangat fokus (+1)
  activeAsking?: boolean;   // aktif bertanya (+1)
  quickLearner?: boolean;   // cepat paham (+1)
  // Negatif
  drowsy?: boolean;         // mengantuk (-1)
  playingPhone?: boolean;   // main HP (-1)
  needsRepetition?: boolean;// perlu diulang (-1)
  hwMissed?: boolean;       // PR tidak dikerjakan (-1)
  late?: boolean;           // telat (-1)
  bathroomBreaks?: boolean; // sering ke toilet (-1)
  restless?: boolean;       // gelisah, loncat-loncat, tak bisa diam duduk (-1)
  offTask?: boolean;        // sibuk sendiri / melamun, susah diajak fokus (-1)
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
  /** How invoices are issued. Missing on legacy rows means monthly. */
  billingPolicy?: BillingPolicy;
  /** Exact batch size when billingPolicy is session_count. */
  billingSessionCount?: number;
  /** Deferred target after all currently-unbilled package sessions are invoiced. */
  pendingBillingPolicy?: Exclude<BillingPolicy, "session_count">;
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
  /** Konteks humanis hari ini (opsional): situasi pribadi murid (habis sakit,
   *  kurang tidur, ada acara keluarga, dsb.). Murni konteks manusiawi — tidak
   *  memengaruhi skor engagement, dan sengaja tidak dikirim ke pesan WA ortu
   *  karena itu informasi pribadi/kekeluargaan. */
  situasiNote?: string;
  topic?: string;
  needsWork?: string;
  predictedGrade?: string;
  /** Nilai akhir yang benar-benar didapat murid (follow-up dari prediksi). */
  actualGrade?: string;
  /** Refleksi bila nilai akhir lebih rendah dari prediksi. */
  gradeReflection?: string;
  narrative?: string;
  /** Fingerprint konten AI (non-indexed, dedup) — lihat lib/aiIncremental.ts.
   *  Tersimpan saat narasi dibuat AI; dipakai agar AI tidak membaca ulang
   *  sesi yang tidak berubah. Bukan field keamanan. */
  aiNarrativeHash?: number;
  engagement?: EngagementLog;
  behaviorTags?: string[];  // IDs from BEHAVIOR_TAGS in responseTaxonomy
  responseTag?: string;     // single ID from RESPONSE_TAGS in responseTaxonomy
  signature?: Blob;         // student signature drawn on-screen
  timeIn?: string;          // actual start time HH:MM WIB, auto-set on save
  timeOut?: string;         // actual end time HH:MM WIB, auto-set on save
  projectId?: string;
  seriesId?: string;
  /** Optional context recorded when a planned session is cancelled, missed, or moved. */
  statusReason?: string;
  /** A no-show is billable only when the tutor explicitly opts in. */
  noShowBillable?: boolean;
  /** Links the old and replacement records without mutating the original appointment. */
  rescheduledFromId?: string;
  rescheduledToId?: string;
  status: SessionStatus;
  rateSnapshot: number;
  cost: number;
  /** Manual override — diset ketika tutor mengedit biaya secara manual.
   *  Kalau undefined/null, biaya dihitung otomatis dari rateSnapshot × durationHours. */
  costOverride?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateKey {
  themeId: string;
  layoutId: string;
}

/** Rencana tindak lanjut yang disepakati di akhir laporan bulanan. */
export type PlanOwner = "tutor" | "student" | "parent" | "shared";
export type PlanStatus = "planned" | "in_progress" | "achieved";

export interface MonthlyPlanItem {
  id: string;
  subject: string;
  /** Bukti singkat dari perkembangan bulan yang baru selesai. */
  evidence?: string;
  /** Hasil belajar yang ingin dicapai pada bulan berikutnya. */
  target: string;
  /** Strategi atau aktivitas yang dilakukan tutor. */
  tutorAction?: string;
  /** Cara sederhana untuk mengecek target tercapai. */
  successMetric?: string;
  cadence?: string;
  owner?: PlanOwner;
  status?: PlanStatus;
}

export interface NextMonthPlan {
  priorities: MonthlyPlanItem[];
  parentSupport?: string;
  updatedAt?: string;
}

export interface MonthlyReport {
  id: string;
  studentId: string;
  /** Bulan acuan laporan = bulan akhir periode belajar (YYYY-MM). */
  month: string;
  /** Awal periode rekap (YYYY-MM-DD, inklusif) — laporan lama = awal bulan kalender. */
  periodStart: string;
  /** Akhir periode rekap (YYYY-MM-DD, inklusif) — laporan lama = akhir bulan kalender. */
  periodEnd: string;
  /** Status laporan: draft (bisa dibatalkan) atau confirmed (final, kompatibilitas nama lama). */
  status?: ReportStatus;
  /** Billing identity; missing on legacy reports means an ordinary period report. */
  billingMode?: ReportBillingMode;
  /** Immutable quota snapshot for a session-count invoice. */
  billingSessionCount?: number;
  /** Policy target before a deliberately shorter closing package. */
  billingTargetSessionCount?: number;
  /** Explicit closing package issued while changing billing policy. */
  finalBillingBatch?: boolean;
  /** Policy activated after this report drained the final package backlog. */
  billingPolicyAfterBatch?: Exclude<BillingPolicy, "session_count">;
  /** Deferred policy target snapshotted on every batch issued during a transition. */
  billingPolicyTransitionTarget?: Exclude<BillingPolicy, "session_count">;
  /** True hanya untuk paket yang diterbitkan dari antrean billing (Keuangan).
   *  Membatalkannya boleh mengembalikan kebijakan murid ke session_count. */
  fromBillingQueue?: boolean;
  /** Dibuat otomatis oleh Tutup Buku — bisa di-un-sahkan saat bulan dibuka kembali. */
  autoGenerated?: boolean;
  /**
   * Laporan susulan untuk sesi yang masuk setelah invoice induk menjadi
   * immutable (manual/lunas). SessionIds tetap menjadi sumber cakupan utama;
   * relasi ini mencegah laporan susulan menyamar sebagai laporan bulan penuh.
   */
  supplementalForReportId?: string;
  sessionIds: string[];
  templateKey: TemplateKey;
  summaryText: string;
  teacherNote?: string;
  quote?: string;
  /** Opsional agar seluruh laporan lama tetap kompatibel. */
  nextMonthPlan?: NextMonthPlan;
  totalHours: number;
  totalCost: number;
  createdAt: string;
  pdfGeneratedAt?: string;
  /** Fingerprint sesi saat ringkasan terakhir dibuat AI (dedup) — lihat
   *  lib/aiIncremental.ts. Dipakai agar "Poles Ringkasan" bisa dilewati
   *  bila tidak ada perubahan sesi. Bukan field keamanan. */
  summaryHash?: number;
}

export interface Payment {
  id: string;
  studentId: string;
  /** Bulan anchor tagihan (YYYY-MM). Untuk tagihan laporan = bulan akhir periode. */
  month: string;
  totalCost: number;
  status: PaymentStatus;
  source?: PaymentSource;
  /** Jatuh tempo invoice (YYYY-MM-DD). Invoice baru selalu mengisinya;
   *  data lama boleh kosong dan memakai fallback periode saat dibaca. */
  dueAt?: string;
  paidAt?: string;
  method?: string;
  /** Terbit dari laporan periode (rekap N pertemuan / rentang tanggal). */
  reportId?: string;
  periodStart?: string;
  periodEnd?: string;
  /** Waktu invoice terbit (ISO). Optional: entri lama tidak memilikinya —
   *  fallback ke paidAt/periodEnd saat baca. */
  createdAt?: string;
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
  /** Tautan opsional ke murid — untuk laba bersih per murid. */
  studentId?: string;
}

// ── IA / EE / PP Milestone Tracker ──────────────────────────────────────────

export type IaEeType = "IA" | "EE" | "PP";
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

// ── Audit Trail (riwayat aktivitas penting — lokal per perangkat) ────────────

// ── Study Notes (catatan belajar per murid) ─────────────────────────────────

export interface StudyNote {
  studentId: string;     // PK
  content: string;
  updatedAt: string;
}

export type AuditAction =
  | "session.delete"
  | "session.cancel"
  | "session.no_show"
  | "session.reschedule"
  | "student.delete"
  | "payment.paid"
  | "payment.unpaid"
  | "payment.amount"
  | "expense.create"
  | "expense.update"
  | "expense.delete"
  | "month.close"
  | "data.reset"
  | "data.restore"
  | "photos.prune";

export interface AuditEntry {
  id: string;
  action: AuditAction;
  entityType: string;     // "session" | "student" | "payment" | "data" | ...
  entityId?: string;
  timestamp: string;      // ISO
  details?: string;       // ringkasan untuk dibaca manusia
}

export interface Settings {
  id: "app";
  tutorProfile: { name: string; phone: string; email?: string; address?: string };
  logo?: Blob;
  defaultRate: number;
  paymentInfo: string;
  subjects: string[];
  financialPin?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  ai: { enabled: boolean; apiKey?: string; model: string };
  templatePref: { excludedThemeIds?: string[]; customThemes?: import("../template/types").CustomTheme[] };
  bankAccounts?: { bca?: string; cimb?: string; bri?: string; mandiri?: string; bsi?: string; ewallet?: string; accountName?: string };
  driveBackup?: { fileId: string; backupAt: string };
  lastBackupAt?: string; // waktu backup terakhir (File atau Drive) — ISO string
}
