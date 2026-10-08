/**
 * Jenjang murid.
 *
 * Sebelum audit P0 (T-07), tipe ini hanya `"MYP" | "IBDP" | "UNIV"` dan SEMUA
 * kurikulum non-IB dipetakan ke `"UNIV"` — sehingga siswa Cambridge O Level
 * kelas 9 tertulis sebagai jenjang universitas di kartu murid, ekspor, dan
 * laporan. Anggota baru di bawah menutup celah itu; `"UNIV"` tetap ada untuk
 * kurikulum Custom dan data lama.
 */
export type Level =
  | "MYP" | "IBDP"
  | "IGCSE" | "O Level" | "A Level" | "AP"
  | "SMP" | "SMA"
  | "UNIV";

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
 *  internal final; `sharedAt` (cadangan lama: `pdfGeneratedAt`) menandai laporan
 *  sudah benar-benar dibagikan ke orang tua.
 *
 *  G3-05 butir 3 memisahkan istilah **dibuat** dan **dibagikan**: mengekspor berkas
 *  hanya berarti berkasnya dibuat (`lastExportedAt`), sedangkan "sudah dibagikan"
 *  tetap pernyataan eksplisit tutor (`sharedAt`). */
export type ReportDisplayStatus = "draft" | "final" | "shared";

/** Isian laporan yang bisa ditulis AI (G3-05 butir 8) — penanda per isian. */
export type AiReportField = "summaryText" | "teacherNote" | "quote" | "nextMonthPlan";

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
  report: { status?: ReportStatus; pdfGeneratedAt?: string; sharedAt?: string },
): ReportDisplayStatus {
  if (reportStatus(report) === "draft") return "draft";
  // `sharedAt` didahulukan; `pdfGeneratedAt` tetap dibaca sebagai cadangan
  // supaya laporan lama (dan backup lama) tidak berubah arti.
  return report.sharedAt || report.pdfGeneratedAt ? "shared" : "final";
}

/** Kurikulum → jenjang murid. Setiap kurikulum punya jenjangnya sendiri (T-07):
 *  pemetaan lama mengembalikan "UNIV" untuk IGCSE/O Level/A Level/AP/National. */
export function levelForCurriculum(curriculum: CurriculumType): Level {
  switch (curriculum) {
    case "IB MYP":              return "MYP";
    case "IB DP":               return "IBDP";
    case "Cambridge IGCSE":     return "IGCSE";
    case "Cambridge O Level":   return "O Level";
    case "Cambridge AS Level":
    case "Cambridge A Level":   return "A Level";
    case "AP":                  return "AP";
    case "National":            return "SMP";   // dinaikkan ke "SMA" saat kelas ≥ 10 (lihat levelForStudent)
    default:                    return "UNIV";  // Custom
  }
}

/** Label jenjang untuk ditampilkan (kartu murid, ekspor, laporan).
 *  Kelas menentukan SMP/SMA untuk kurikulum Nasional dan memberi konteks pada
 *  jenjang Cambridge. */
export function levelLabel(student: Pick<Student, "level" | "curriculum" | "grade">): string {
  const grade = student.grade?.trim();
  if (student.curriculum === "National" && grade) {
    const n = Number((grade.match(/(\d{1,2})/) ?? [])[1]);
    const jenjang = n >= 10 ? "SMA" : n >= 7 ? "SMP" : "Nasional";
    return `${jenjang} · Kelas ${n || grade}`;
  }
  if (student.curriculum === "IB MYP" && grade) return `MYP · ${grade}`;
  return grade ? `${student.level} · ${grade}` : student.level;
}

export const DEFAULT_RATE = 200_000;   // IDR per hour
export const MIN_DURATION = 1;         // hours
export const DURATION_STEP = 0.5;      // hours
export const PHOTO_MAX_PX = 640;       // longest side — cukup untuk tampil di laporan PDF

export interface ParentContact { name?: string; phone: string; }

/** Kondisi umum satu sesi (audit P2 #12) — satu nilai eksplisit yang TIDAK
 *  mengklaim indikator perilaku apa pun. Menggantikan tombol preset lama yang
 *  menyalakan "aktif bertanya"/"cepat paham" hanya karena tutor menekan
 *  "Lancar". */
export type EngagementLevel = "lancar" | "biasa" | "berat";

/** Seberapa lengkap dasar perhitungan skor (audit P2 #11).
 *  - `full`    : diisi sampai lapisan observasi lanjutan/ respons akademik
 *  - `partial` : hanya lapisan 1–2 (kondisi + beberapa penanda)
 *  - `none`    : tidak ada pengamatan — skor TIDAK dihitung, `score` = 0 */
export type EngagementScoreBasis = "full" | "partial" | "none";

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
  score: number;            // 1-10, computed. 0 = tidak ada pengamatan (lihat scoreBasis)
  /** Kondisi umum sesi; tidak menambah/mengurangi skor. */
  level?: EngagementLevel;
  /** Kelengkapan dasar skor — dipakai laporan agar rata-rata tidak menyesatkan. */
  scoreBasis?: EngagementScoreBasis;
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

export type CaptureDraftPhase = "editing" | "closeout";

export interface CaptureDraftFollowUp {
  id: string;
  text: string;
}

export interface CaptureDraftForm {
  step: number;
  date: string;
  durationHours: number;
  subjects: string[];
  topic: string;
  /** Bab katalog untuk topik terpilih (audit P1 #9). Opsional agar draf lama
   *  di IndexedDB (yang belum punya kolom ini) tetap bisa dipulihkan. */
  topicUnit?: string;
  topicSearch: string;
  shortNote: string;
  needsWork: string;
  predictedGrade: string;
  mood?: string;
  /** Kondisi umum sesi (audit P2 #12) — tidak mengubah skor. Opsional agar draf
   *  lama tetap bisa dipulihkan. */
  engagementLevel?: EngagementLevel;
  engagementFlags: Omit<EngagementLog, "score">;
  behaviorTags: string[];
  responseTag?: string;
  situasiNote: string;
  sessionType?: string;
  photo?: Blob;
  signature?: Blob;
  closeout?: {
    session: {
      id: string;
      date: string;
      subjects: string[];
      durationHours: number;
      shortNote: string;
      topic?: string;
      topicUnit?: string;
    };
    followUps: CaptureDraftFollowUp[];
    followUpText: string;
  };
}

export interface CaptureDraft {
  draftId: string;
  formatVersion: 1;
  revision: number;
  updatedAt: string;
  scopeKey: string;
  studentId?: string;
  scheduleId?: string;
  phase: CaptureDraftPhase;
  savedSessionId?: string;
  form: CaptureDraftForm;
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
  /** Bab/unit katalog tempat topik di atas diambil (audit P1 #9). Opsional:
   *  topik yang diketik bebas tidak punya bab. Membuat topik bisa direkap per
   *  bab, bukan hanya sebagai teks yang tidak bisa dibandingkan. */
  topicUnit?: string;
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
  /**
   * Fingerprint TEKS narasi saat AI menulisnya (G3-05 butir 8).
   *
   * Terpisah dari `aiNarrativeHash`: hash itu sengaja tidak memuat narasi supaya
   * menyunting narasi tidak membuat AI menulis ulang tulisan tutor. Akibatnya ia
   * juga tidak bisa dipakai untuk tahu apakah narasinya masih tulisan AI. Field
   * ini yang menjawabnya: selama teks narasinya identik, penanda "dibuat AI"
   * masih tampil; begitu tutor menyuntingnya, fingerprint tidak lagi cocok dan
   * penandanya hilang sendiri tanpa perlu dibersihkan manual.
   */
  aiNarrativeTextHash?: number;
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
  /** Kapan berkas laporan terakhir dibuat (ekspor JPG/PNG/PDF). Terpisah dari
   *  "sudah dibagikan": mengekspor tidak lagi berarti sudah dikirim (G3-05 butir 3). */
  lastExportedAt?: string;
  /** Pernyataan eksplisit tutor bahwa laporan sudah dikirim ke orang tua. */
  sharedAt?: string;
  /** Kapan berkas laporan terakhir dibuat — nama lama yang masih ditulis oleh
   *  tombol "Tandai Sudah Dibagikan"; dibaca sebagai penanda dibagikan. */
  pdfGeneratedAt?: string;
  /** Jumlah sesi per halaman pilihan tutor — ikut tersimpan ke laporan, bukan
   *  hanya keadaan sementara di layar (G3-05 butir 10). */
  entriesPerPage?: number;
  /** Penanda per isian bahwa isinya ditulis AI: nilai fingerprint saat AI
   *  menulisnya. Penyuntingan manual mengubah isinya sehingga fingerprint tidak
   *  lagi cocok dan penandanya hilang sendiri (G3-05 butir 8). */
  aiFieldHashes?: Partial<Record<AiReportField, number>>;
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
  | "session.reprice"
  | "report.unlock"
  | "student.delete"
  | "payment.paid"
  | "payment.unpaid"
  | "payment.amount"
  | "payment.due"
  | "payment.cancel"
  | "payment.restore"
  /** Salinan pemulihan tagihan dibuang (tidak bisa dipulihkan lagi). */
  | "payment.discard"
  | "expense.create"
  | "expense.update"
  | "expense.delete"
  | "month.close"
  | "data.reset"
  | "data.restore"
  | "photos.prune"
  /** Foto sesi lama diperkecil (tidak dihapus) untuk menghemat penyimpanan. */
  | "photos.shrink"
  /**
   * Satu panggilan AI yang benar-benar berjalan (G3-04). Entri ini yang membuat
   * biaya bisa dipertanggungjawabkan: ia mencatat fitur apa yang memanggil,
   * berapa perkiraannya, dan berapa hasil sesudah panggilan selesai.
   */
  | "ai.call";

export interface AuditEntry {
  id: string;
  action: AuditAction;
  entityType: string;     // "session" | "student" | "payment" | "data" | "ai" | ...
  entityId?: string;
  timestamp: string;      // ISO
  details?: string;       // ringkasan untuk dibaca manusia
  /**
   * Biaya panggilan AI dalam rupiah (G3-04). Hanya diisi untuk `action: "ai.call"`.
   *
   * **Kenapa disimpan di sini dan bukan di tabel baru.** `auditLog` sudah ada dan
   * sudah punya semua yang dibutuhkan; menambah tabel akan menuntut kenaikan
   * versi skema Dexie, dan itu perubahan yang menyentuh data pengguna nyata demi
   * dua kolom opsional. Karena IndexedDB tidak menuntut bentuk tetap, kolom
   * opsional di entri yang sudah ada aman tanpa migrasi.
   */
  costIdr?: number;
  /** Fitur AI yang memanggil (mis. "Draft catatan", "Ringkasan keuangan"). */
  aiFeature?: string;
  /** Perkiraan biaya saat modal dibuka, untuk membandingkan dengan hasil akhir. */
  estimatedIdr?: number;
}

// ── Snapshot pembatalan tagihan (R1 — pemulihan lokal per perangkat) ────────
// Disimpan sebagai `details` JSON pada entri auditLog `payment.cancel`. IndexedDB
// tidak punya tabel baru (skema Dexie tetap v15) dan auditLog sengaja TIDAK ikut
// backup/restore ("Hapus Semua Data" menghapusnya), sehingga pemulihan ini hanya
// berlaku di perangkat ini — bukan pengganti backup.

/** Jenis invoice yang dibatalkan; menentukan guard pemulihan yang berlaku. */
export type InvoiceCancelKind = "package" | "report" | "manual";

/** Tiga field murid yang ikut berubah saat paket dibatalkan (P7). */
export interface StudentBillingSnapshot {
  billingPolicy?: BillingPolicy;
  billingSessionCount?: number;
  pendingBillingPolicy?: Exclude<BillingPolicy, "session_count">;
}

export interface InvoiceCancelSnapshot {
  version: 1;
  kind: InvoiceCancelKind;
  /** Baris tagihan apa adanya — dipulihkan dengan ID & nilai yang sama. */
  payment: Payment;
  /** Laporan paket yang ikut dihapus (khusus `kind: "package"`). */
  report?: MonthlyReport;
  /** Sesi yang dicakup invoice — dipakai guard G1/G6. */
  sessionIds: string[];
  /** Siklus murid sesaat sebelum pembatalan (yang dipulihkan). */
  studentBeforeCancel?: StudentBillingSnapshot;
  /** Siklus murid sesudah pembatalan — guard G8 membandingkan keadaan ini. */
  studentAfterCancel?: StudentBillingSnapshot;
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
  ai: {
    enabled: boolean;
    apiKey?: string;
    model: string;
    /**
     * Batas belanja AI per bulan dalam rupiah (keputusan pemilik B4, G3-04).
     *
     * **Kosong berarti tanpa batas** — itu bawaannya, dan AI tidak pernah
     * diblokir karena kolom ini kosong. Batas hanya berlaku kalau diisi, dan
     * saat terlampaui tombol AI nonaktif dengan alasan yang terlihat.
     */
    monthlyBudgetIdr?: number;
  };
  templatePref: { excludedThemeIds?: string[]; customThemes?: import("../template/types").CustomTheme[] };
  bankAccounts?: { bca?: string; cimb?: string; bri?: string; mandiri?: string; bsi?: string; ewallet?: string; accountName?: string };
  driveBackup?: { fileId: string; backupAt: string };
  lastBackupAt?: string; // waktu backup terakhir (File atau Drive) — ISO string
  /**
   * Waktu terakhir foto sesi lama diperkecil otomatis (ISO string).
   * Dipakai agar perawatan penyimpanan berjalan sendiri tanpa tombol manual.
   */
  lastPhotoShrinkAt?: string;
}
