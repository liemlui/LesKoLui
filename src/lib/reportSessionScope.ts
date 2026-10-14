import { reportStatus, type MonthlyReport } from "../db/types";
import type { Session, Student } from "../db/types";
import type { AiInput } from "./aiClient";
import { dayLabel, todayWIB } from "./format";

/**
 * Select the oldest N uncovered sessions while preserving chronological input
 * order. Billing cycles are FIFO: an older lesson must never be stranded while
 * a newer lesson is charged first.
 */
export function selectCountReportSessions<T extends Pick<Session, "id">>(
  sessions: readonly T[],
  blockedIds: ReadonlySet<string>,
  count: number,
  ownedIds: ReadonlySet<string> = new Set(),
): T[] {
  const safeCount = Math.max(1, Math.floor(count));
  const allowed = sessions.filter(
    (session) => ownedIds.has(session.id) || !blockedIds.has(session.id),
  );
  return allowed.slice(0, safeCount);
}

/**
 * A draft is only a working selection, so it must keep following the live
 * session queue. An automatically generated invoice that is still unpaid is
 * likewise safe to refresh. Only a paid invoice or an invoice whose amount was
 * edited manually freezes a confirmed report as an accounting snapshot.
 */
export function shouldUseStoredReportSnapshot(
  report: Pick<MonthlyReport, "status"> | undefined,
  snapshotLocked: boolean,
  hasProtectedInvoice: boolean,
): boolean {
  return Boolean(
    snapshotLocked
    && report
    && reportStatus(report) === "confirmed"
    && hasProtectedInvoice,
  );
}

/**
 * Resolve the package-billing range at query time, rather than when the
 * report screen first mounts. A PWA can stay open across midnight; caching
 * this value would otherwise hide sessions recorded on the following day.
 */
export function currentPackageSessionRange(
  getToday: () => string = todayWIB,
): { start: string; end: string } {
  return { start: "0000-01-01", end: getToday() };
}

/** Select month/range rows while keeping an immutable paid/manual invoice's
 * session snapshot closed to newly-arriving sessions. */
export function selectPeriodReportSessions<T extends Pick<Session, "id">>(
  sessions: readonly T[],
  blockedIds: ReadonlySet<string>,
  ownedIds: ReadonlySet<string>,
  preserveOwnedSnapshot: boolean,
): T[] {
  return sessions.filter((session) =>
    ownedIds.has(session.id)
    || (!preserveOwnedSnapshot && !blockedIds.has(session.id))
  );
}

export interface ReportPeriodCandidate {
  id: string;
  periodStart: string;
  periodEnd: string;
  supplementalForReportId?: string;
  billingMode?: "monthly" | "session_count" | "range";
  sessionIds?: readonly string[];
}

export interface EditedReportOverlapContext {
  id: string;
  supplementalForReportId?: string;
}

/**
 * Sesi yang BENAR-BENAR ada di dalam jendela tanggal yang sedang dipilih.
 *
 * Kunci periode harus mengikuti SESI, bukan kalender: laporan lama dengan
 * rentang lebar (mis. 1 Agu – 30 Sep) tidak boleh memblokir September yang
 * sesinya sama sekali belum pernah direkap. Selama tidak ada satu pun id sesi
 * yang dibagi, tumpang-tindih kalender murni adalah artefak rentang tanggal —
 * bukan rekap ganda (laporan arsip karena itu dicatat PER SESI pada
 * `session_count`, dan pola itulah yang diterapkan ke semua mode).
 */
export type SessionWindow = ReadonlySet<string>;

/**
 * Apakah `report` benar-benar mengklaim sesi di dalam jendela ini?
 *
 * - Ada id sesi yang beririsan → YA (rekap ganda sungguhan) → blokir.
 * - Laporan tidak menyimpan id sesi sama sekali (warisan lama) → jatuh ke
 *   perbandingan kalender supaya laporan jadul tetap mengunci tanggalnya
 *   hingga tutor memutuskan sendiri (buka kunci / hapus).
 */
function claimsSessionsInWindow<T extends ReportPeriodCandidate>(
  report: T,
  window?: SessionWindow,
): boolean | undefined {
  if (!window) return undefined;
  const ids = report.sessionIds;
  if (!ids || ids.length === 0) return undefined;
  return ids.some((id) => window.has(id));
}

/** A parent and its supplemental children may overlap in either edit direction.
 * Unrelated ordinary reports use calendar ranges; package reports use session ids. */
export function findBlockingReportOverlap<T extends ReportPeriodCandidate>(
  reports: readonly T[],
  start: string,
  end: string,
  editedReport?: EditedReportOverlapContext,
  selectedSessionIds: readonly string[] = [],
  /** Sesi yang ada di jendela [start, end] — kunci periode jadi per sesi. */
  sessionWindow?: SessionWindow,
): T | undefined {
  const excludedIds = new Set([
    editedReport?.id,
    editedReport?.supplementalForReportId,
  ].filter((id): id is string => Boolean(id)));
  const selectedIds = new Set(selectedSessionIds);
  return reports.find((report) => {
    if (
      excludedIds.has(report.id)
      || (Boolean(editedReport?.id) && report.supplementalForReportId === editedReport?.id)
    ) {
      return false;
    }
    // Package dates are only descriptive. Their accounting scope is the
    // immutable session snapshot, so a calendar overlap alone must not block
    // an ordinary month/range report.
    if (report.billingMode === "session_count") {
      return report.sessionIds?.some((id) => selectedIds.has(id)) ?? false;
    }
    // Kalender hanya menyatakan BENTURAN TANGGAL; yang menentukan rekap ganda
    // adalah sesi yang benar-benar diklaim kedua laporan.
    if (!(report.periodStart <= end && report.periodEnd >= start)) return false;
    const claims = claimsSessionsInWindow(report, sessionWindow);
    return claims ?? true;
  });
}

/** Prefer explicit report identity over an ambiguous legacy period match. */
export async function resolveReportMutationTarget<T>(
  editingReportId: string,
  loadById: (id: string) => Promise<T | undefined>,
  loadByPeriod: () => Promise<T | undefined>,
): Promise<T | undefined> {
  return editingReportId
    ? loadById(editingReportId)
    : loadByPeriod();
}

/** Laporan periode reguler (bukan paket/susulan) terakhir yang berakhir SEBELUM
 *  awal periode saat ini — dasar tren engagement bulan-ke-bulan. */
export function findPreviousPeriodReport(
  reports: readonly MonthlyReport[],
  currentPeriodStart: string,
): MonthlyReport | undefined {
  return reports
    .filter((report) =>
      report.billingMode !== "session_count"
      && !report.supplementalForReportId
      && report.sessionIds.length > 0
      && report.periodEnd < currentPeriodStart
    )
    .sort((a, b) =>
      b.periodEnd.localeCompare(a.periodEnd)
      || b.createdAt.localeCompare(a.createdAt)
    )[0];
}

/** Batas panjang inti sesi di dalam ringkasan yang dikirim ke AI. */
export const DIGEST_TEXT_MAX = 240;

/**
 * Ringkas teks inti sesi: rapikan spasi, potong di batas kata, dan buang
 * pengulangan yang tidak menambah apa pun.
 *
 * Dipotong di batas kata (bukan di tengah kata) supaya kalimatnya tidak rusak;
 * kalau tidak ada spasi yang layak, potong apa adanya dan beri tanda "…" — teks
 * yang jujur terpotong lebih baik daripada kalimat yang tampak utuh padahal bukan.
 */
export function compactSessionText(teks: string | undefined, maks = DIGEST_TEXT_MAX): string {
  const rapi = (teks ?? "").replace(/\s+/g, " ").trim();
  if (rapi.length <= maks) return rapi;
  const potong = rapi.slice(0, maks);
  const spasiTerakhir = potong.lastIndexOf(" ");
  return `${(spasiTerakhir > maks * 0.6 ? potong.slice(0, spasiTerakhir) : potong).trimEnd()}…`;
}

/**
 * Satu sesi dalam bentuk **ringkas** untuk dikirim ke AI.
 *
 * Aturan yang mengikat, beserta alasannya:
 *
 * 1. **Isi intinya diambil dari narasi sesi bila ada, kalau tidak dari catatan.**
 *    Narasi ditulis lebih dulu (di alur Catat Sesi) dan sudah berupa inti yang
 *    rapi, jadi tidak perlu dikirim bersama catatan asli — keduanya menceritakan
 *    sesi yang sama, dan itu pengulangan yang paling mahal.
 * 2. **Panjangnya dibatasi** (`DIGEST_TEXT_MAX`) supaya satu catatan yang sangat
 *    panjang tidak membuat muatan seluruh laporan melewati batas konteks.
 * 3. **Angka yang sudah menjadi data kolom tidak diulang ke dalam teks** — skor
 *    fokus dikirim sebagai `fokus`, bukan disisipkan ke kalimat.
 * 4. **Bagian yang kosong tidak dikirim sama sekali** (bukan `null`).
 */
export interface SessionDigest {
  id: string;
  date: string;
  subject: string;
  topic?: string;
  /** Inti sesi: narasi bila ada, kalau tidak catatan. Sudah dipadatkan. */
  inti?: string;
  /** Skor fokus, dibaca laporan sebagai angka — tidak diulang di dalam `inti`. */
  fokus?: number;
}

export function buildSessionDigest(session: Session): SessionDigest {
  const inti = compactSessionText(session.narrative) || compactSessionText(session.shortNote);
  return {
    id: session.id,
    date: session.date,
    subject: session.subjects.join(", "),
    topic: session.topic?.trim() || undefined,
    inti: inti || undefined,
    fokus: session.engagement?.score,
  };
}

/**
 * Build AI input from the already-selected report scope, never from history.
 *
 * **Perubahan 2026-10-15 (permintaan pemilik).** Sebelumnya fungsi ini mengirim
 * seluruh kolom setiap sesi apa adanya: catatan lengkap + mood + topik + area
 * perhatian + prediksi nilai + nilai akhir + refleksi nilai + skor + label
 * perilaku + label respons. Terukur **±620–1.230 karakter per sesi**, sehingga
 * laporan 40 sesi bisa melewati 48.000 karakter dan panggilan AI gagal dengan
 * keluhan konteks terlalu panjang. Sekarang yang dikirim adalah ringkasan tiap
 * sesi (inti yang sudah dipadatkan + tanggal, mapel, topik, skor fokus).
 *
 * Temuan yang ikut ditutup: **narasi sesi tidak pernah ikut ke laporan.** Fungsi
 * ini mengirim `shortNote` saja, padahal narasi ditulis lebih dulu di alur Catat
 * Sesi dan justru lebih rapi. Sekarang narasi dipakai lebih dulu — lihat
 * `buildSessionDigest`.
 */
export function buildReportAiInput(
  student: Pick<Student, "name" | "level">,
  period: string,
  reportSessions: readonly Session[],
  prevAvgEngagement?: number,
): AiInput {
  return {
    student: { name: student.name, level: student.level },
    month: period,
    prevAvgEngagement,
    sessions: reportSessions.map((session) => {
      const digest = buildSessionDigest(session);
      return {
        id: digest.id,
        date: dayLabel(digest.date),
        subject: digest.subject,
        shortNote: digest.inti ?? "",
        topic: digest.topic,
        engagementScore: digest.fokus,
      };
    }),
  };
}
