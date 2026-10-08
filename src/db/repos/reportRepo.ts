// ── Monthly Reports Repository ─────────────────────────────────────

import { db } from "../db";
import type { MonthlyReport, ReportStatus } from "../types";
import { billingPolicyOf, reportStatus } from "../types";
import {
  protectedInvoiceReportIds,
  reportBlocksSiblingScope,
  reportIdsWithInvoice,
  timestamp,
} from "./helpers";

export type ReportWrite = Omit<MonthlyReport, "createdAt" | "periodStart" | "periodEnd">
  & Partial<Pick<MonthlyReport, "periodStart" | "periodEnd">>
  & { createdAt?: string };

function compareReportIdentity(a: MonthlyReport, b: MonthlyReport): number {
  // A regular report is the canonical period lookup. Supplemental reports are
  // addressable by id and must never hijack an ordinary full/range selection.
  // Session-count packages are also addressed by id, not by their date span.
  const reportKind = (report: MonthlyReport): number =>
    report.billingMode === "session_count" ? 2 : Number(Boolean(report.supplementalForReportId));
  const kind = reportKind(a) - reportKind(b);
  return kind || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

function sameSessionIds(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const ids = new Set(a);
  return b.every((id) => ids.has(id));
}

function sessionScopesOverlap(a: readonly string[], b: readonly string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const ids = new Set(a);
  return b.some((id) => ids.has(id));
}

/** Laporan lama (tanpa periode) dianggap satu bulan kalender penuh. */
export function reportPeriodOf(report: { month: string; periodStart?: string; periodEnd?: string }): { periodStart: string; periodEnd: string } {
  if (report.periodStart && report.periodEnd) {
    return { periodStart: report.periodStart, periodEnd: report.periodEnd };
  }
  const lastDay = new Date(+report.month.slice(0, 4), +report.month.slice(5, 7), 0).getDate();
  return { periodStart: `${report.month}-01`, periodEnd: `${report.month}-${String(lastDay).padStart(2, "0")}` };
}

type ReportTotals = Pick<MonthlyReport, "sessionIds" | "totalHours" | "totalCost">;

/**
 * D6 — laporan yang sudah FINAL membekukan `sessionIds`/`totalHours`/`totalCost`.
 * Angka yang sudah dikirim ke orang tua tidak boleh berubah hanya karena sesi
 * dihitung ulang saat laporan dibuka atau profil murid disimpan. Draft tetap
 * boleh dihitung ulang, dan pembekuan berlaku tepat pada saat difinalkan.
 *
 * Jalur perbaikan yang sah untuk laporan final (tercatat, bukan diam-diam):
 * batalkan invoice yang belum lunas lewat Keuangan → perbaiki sesi →
 * terbitkan ulang; atau terbitkan laporan susulan untuk sesi yang menyusul.
 */
export function frozenReportTotals(
  existing: Pick<MonthlyReport, "status" | "sessionIds" | "totalHours" | "totalCost">,
  next: ReportTotals,
): ReportTotals {
  if (reportStatus(existing) !== "confirmed") return next;
  return { sessionIds: existing.sessionIds, totalHours: existing.totalHours, totalCost: existing.totalCost };
}

/** True bila hasil hitung ulang menyimpang dari total final yang sudah beku. */
export function reportTotalsDrifted(
  frozen: Pick<MonthlyReport, "sessionIds" | "totalHours" | "totalCost">,
  live: ReportTotals,
): boolean {
  if (frozen.totalHours !== live.totalHours || frozen.totalCost !== live.totalCost) return true;
  if (frozen.sessionIds.length !== live.sessionIds.length) return true;
  const ids = new Set(frozen.sessionIds);
  return live.sessionIds.some((id) => !ids.has(id));
}

export async function getReport(
  studentId: string, month: string
): Promise<MonthlyReport | undefined> {
  const reports = await db.reports
    .where({ studentId, month })
    .toArray();
  return reports
    .filter((report) => report.billingMode !== "session_count")
    .sort(compareReportIdentity)[0];
}

/** Stable report identity for deep-links and supplemental invoice editing. */
export async function getReportById(id: string): Promise<MonthlyReport | undefined> {
  return db.reports.get(id);
}

/** Cari laporan reguler dengan periode persis; supplemental memakai identity id. */
export async function findReportByPeriod(
  studentId: string, periodStart: string, periodEnd: string
): Promise<MonthlyReport | undefined> {
  const reports = await listReportsByStudent(studentId);
  return reports
    .filter((r) =>
      !r.supplementalForReportId
      && r.billingMode !== "session_count"
      && r.periodStart === periodStart
      && r.periodEnd === periodEnd
    )
    .sort(compareReportIdentity)[0];
}

/** Laporan murid YANG SUDAH SAH yang periodenya BERTUMPUK dengan [start, end] —
 *  draft tidak mengunci tanggal. */
export async function listOverlappingReports(
  studentId: string,
  start: string,
  end: string,
  excludeId?: string,
  sessionIds?: readonly string[],
): Promise<MonthlyReport[]> {
  const [reports, payments] = await Promise.all([
    listConfirmedReportsByStudent(studentId),
    db.payments.where({ studentId }).toArray(),
  ]);
  const invoiceReportIds = reportIdsWithInvoice(payments);
  const protectedReportIds = protectedInvoiceReportIds(reports, payments);
  return reports.filter((report) => {
    if (report.id === excludeId) return false;
    const blocksScope = report.billingMode === "session_count"
      ? report.status === "confirmed" || invoiceReportIds.has(report.id)
      : reportBlocksSiblingScope(report, protectedReportIds.has(report.id));
    if (!blocksScope) return false;
    if (report.billingMode === "session_count") {
      return sessionIds ? sessionScopesOverlap(report.sessionIds, sessionIds) : false;
    }
    return report.periodStart <= end && report.periodEnd >= start;
  });
}

/** Laporan murid yang sudah disahkan (bukan draft). */
export async function listConfirmedReportsByStudent(studentId: string): Promise<MonthlyReport[]> {
  return db.reports
    .where({ studentId })
    .filter((r) => reportStatus(r) === "confirmed")
    .sortBy("createdAt");
}

/** Hapus laporan draft — tanggal & sesi kembali bebas. */
export async function discardReport(id: string): Promise<void> {
  await db.reports.delete(id);
}

/** Sahkan laporan draft → kunci tanggal + terbitkan tagihan (dipanggil terpisah). */
export async function confirmReport(id: string): Promise<void> {
  const report = await db.reports.get(id);
  if (!report) return;
  await upsertReport({ ...report, status: "confirmed" as ReportStatus });
}

export interface UnlockReportOptions {
  /** Wajib `true` bila laporan sudah ditandai dibagikan; UI menanyakannya lebih dulu. */
  confirmShared?: boolean;
}

export interface UnlockReportResult {
  /** Laporan ini pernah ditandai sudah dibagikan sebelum kuncinya dibuka. */
  wasShared: boolean;
}

/**
 * Buka kunci laporan final → kembali menjadi draft supaya cakupan sesi, periode,
 * dan nominalnya bisa diperbaiki. Ini jalur untuk kasus **laporannya** yang salah,
 * bukan tagihannya: membatalkan tagihan saja akan menghasilkan tagihan yang sama,
 * karena laporan final membekukan totalnya.
 *
 * Urutan yang benar: batalkan dulu tagihannya di Keuangan (tagihan belum lunas),
 * lalu buka kunci, perbaiki laporan, finalkan lagi, terbitkan tagihan baru.
 * Laporan yang tagihannya sudah **lunas** atau nominalnya **diedit manual**
 * ditolak: angkanya sudah dipakai untuk uang yang benar-benar berpindah.
 *
 * Seluruh guard diperiksa SEBELUM penulisan apa pun, dan pembukaan kunci berjalan
 * dalam satu transaksi + meninggalkan entri audit `report.unlock`.
 */
export async function unlockReport(
  reportId: string,
  options: UnlockReportOptions = {},
): Promise<UnlockReportResult> {
  return db.transaction("rw", db.reports, db.payments, db.auditLog, async () => {
    const report = await db.reports.get(reportId);
    if (!report) throw new Error("Laporan tidak ditemukan");
    if (reportStatus(report) !== "confirmed") {
      throw new Error("Laporan ini belum final; tidak ada kunci yang perlu dibuka");
    }
    if (report.billingMode === "session_count") {
      throw new Error(
        "Laporan paket per pertemuan dibuka lewat Keuangan: batalkan tagihan paketnya di antrean Tagihan per Pertemuan, sesinya kembali ke antrean, lalu terbitkan paket yang benar",
      );
    }
    const linked = await db.payments.where("reportId").equals(report.id).toArray();
    if (linked.some((payment) => payment.status === "PAID")) {
      throw new Error(
        "Tidak bisa dibuka: tagihannya sudah lunas dan uangnya sudah diterima, jadi laporan ini tetap final",
      );
    }
    if (linked.some((payment) => payment.source === "manual")) {
      throw new Error(
        "Tidak bisa dibuka: nominal tagihannya sudah diedit manual. Rapikan nominalnya dulu di Keuangan",
      );
    }
    if (linked.length > 0) {
      throw new Error(
        `Tidak bisa dibuka: masih ada ${linked.length} tagihan belum lunas dari laporan ini. Batalkan dulu tagihannya di Keuangan → Tagihan, lalu buka kunci laporan ini`,
      );
    }
    const siblings = await db.reports.where({ studentId: report.studentId }).toArray();
    if (siblings.some((candidate) => candidate.supplementalForReportId === report.id)) {
      throw new Error(
        "Tidak bisa dibuka: sudah ada laporan susulan dari laporan ini. Perbaiki lewat laporan susulan itu supaya sesinya tidak terhitung dua kali",
      );
    }
    const wasShared = Boolean(report.pdfGeneratedAt || report.sharedAt);
    if (wasShared && options.confirmShared !== true) {
      throw new Error(
        "Laporan ini sudah ditandai dibagikan ke orang tua. Buka kunci tetap bisa, tetapi angka yang sudah dikirim tidak bisa ditarik — konfirmasi dulu",
      );
    }
    await db.reports.update(report.id, {
      status: "draft" as ReportStatus,
      // Tanda "sudah dibagikan" dilepas: versi yang beredar tidak lagi sama
      // dengan draft yang sedang diperbaiki. Jejaknya tetap ada di audit.
      // G3-05: dua penanda dibersihkan — `sharedAt` (pernyataan tutor) dan
      // `pdfGeneratedAt` (nama lama) — supaya statusnya benar-benar kembali draft.
      pdfGeneratedAt: undefined,
      sharedAt: undefined,
      lastExportedAt: undefined,
    });
    await db.auditLog.add({
      id: crypto.randomUUID(),
      action: "report.unlock",
      entityType: "report",
      entityId: report.id,
      timestamp: timestamp(),
      details: JSON.stringify({
        previousStatus: "confirmed",
        totalCost: report.totalCost,
        totalHours: report.totalHours,
        sessionCount: report.sessionIds.length,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        wasShared,
        sharedAt: report.sharedAt ?? report.pdfGeneratedAt ?? null,
      }),
    });
    return { wasShared };
  });
}

async function assertConfirmedScopeAvailable(
  report: MonthlyReport,
  existing?: MonthlyReport,
): Promise<void> {
  if (reportStatus(report) !== "confirmed") return;
  const payments = await db.payments.where({ studentId: report.studentId }).toArray();
  const invoiceReportIds = reportIdsWithInvoice(payments);
  const isSessionCount = report.billingMode === "session_count";
  if (isSessionCount) {
    const target = report.billingSessionCount;
    if (!Number.isInteger(target) || (target ?? 0) < 1 || (target ?? 0) > 20) {
      throw new Error("Jumlah sesi penagihan tidak valid");
    }
    if (report.sessionIds.length !== target) {
      throw new Error(`Laporan paket harus berisi tepat ${target} sesi`);
    }
    if (report.finalBillingBatch) {
      const normalTarget = report.billingTargetSessionCount;
      if (!Number.isInteger(normalTarget) || (normalTarget ?? 0) < 1 || (normalTarget ?? 0) > 20) {
        throw new Error("Target normal tagihan penutup tidak valid");
      }
      if (target >= normalTarget!) {
        throw new Error("Tagihan penutup harus lebih kecil dari target normal");
      }
      // Partial closing batches are issued atomically by the billing workflow.
      // Existing snapshots remain editable, but a direct report write cannot
      // mint or change their accounting identity.
      const sameExistingFinal = existing?.finalBillingBatch === true
        && sameSessionIds(existing.sessionIds, report.sessionIds)
        && existing.billingSessionCount === report.billingSessionCount
        && existing.billingTargetSessionCount === report.billingTargetSessionCount
        && existing.billingPolicyAfterBatch === report.billingPolicyAfterBatch
        && existing.billingPolicyTransitionTarget === report.billingPolicyTransitionTarget;
      if (!sameExistingFinal) {
        throw new Error("Tagihan penutup paket hanya dapat diterbitkan dari Keuangan");
      }
    }
    const student = await db.students.get(report.studentId);
    if (student && billingPolicyOf(student) === "session_count") {
      const configuredTarget = student.billingSessionCount;
      if (!Number.isInteger(configuredTarget) || configuredTarget !== target) {
        throw new Error(`Laporan paket harus mengikuti kuota murid ${configuredTarget ?? "yang valid"} sesi`);
      }
    } else if (student) {
      // Murid non-paket hanya boleh mengedit paket lama yang SUDAH SAH tanpa
      // mengubah snapshot sesinya (mis. mengisi narasi setelah peralihan
      // kebijakan). Membuat atau mengonfirmasi paket baru lewat jalur laporan
      // akan membocorkan invoice yang tidak sinkron dengan siklus penagihan.
      const sameExistingPackage = existing
        && reportStatus(existing) === "confirmed"
        && existing.billingMode === "session_count"
        && sameSessionIds(existing.sessionIds, report.sessionIds)
        && existing.billingSessionCount === report.billingSessionCount;
      if (!sameExistingPackage) {
        throw new Error("Tagihan paket hanya untuk murid dengan siklus per pertemuan");
      }
    }
  } else {
    const student = await db.students.get(report.studentId);
    const unchangedConfirmedLegacy = existing
      && reportStatus(existing) === "confirmed"
      && existing.billingMode !== "session_count"
      && sameSessionIds(existing.sessionIds, report.sessionIds);
    if (student && billingPolicyOf(student) === "session_count" && !unchangedConfirmedLegacy) {
      throw new Error("Tagihan murid paket harus diterbitkan dari Keuangan sesuai kuota pertemuan");
    }
  }
  const existingIsSessionCount = existing?.billingMode === "session_count";
  const scopeUnchanged = existing && (isSessionCount || existingIsSessionCount
    ? sameSessionIds(existing.sessionIds, report.sessionIds)
    : reportPeriodOf(existing).periodStart === report.periodStart
      && reportPeriodOf(existing).periodEnd === report.periodEnd);
  // Preserve editability of already-confirmed legacy collisions without
  // allowing a draft to bypass the guard merely because its own dates match.
  // An ordinary report edit still checks package snapshots, because its period
  // can stay unchanged while its selected session ids change.
  if (scopeUnchanged && existing && reportStatus(existing) === "confirmed") {
    if (isSessionCount || existingIsSessionCount) return;
    const packageConflict = await db.reports
      .where({ studentId: report.studentId })
      .filter((candidate) =>
        candidate.id !== report.id
        && candidate.billingMode === "session_count"
        && reportStatus(candidate) === "confirmed"
        && (candidate.status === "confirmed" || invoiceReportIds.has(candidate.id))
        && sessionScopesOverlap(candidate.sessionIds, report.sessionIds)
      )
      .first();
    if (packageConflict) throw new Error("Sesi laporan sudah masuk tagihan paket lain");
    return;
  }

  const candidates = await db.reports
    .where({ studentId: report.studentId })
    .filter((candidate) => reportStatus(candidate) === "confirmed")
    .toArray();
  const protectedReportIds = protectedInvoiceReportIds(candidates, payments);
  // Kunci periode mengikuti SESI, bukan kalender: laporan lama berentang lebar
  // (mis. 1 Agu – 30 Sep) tidak boleh memblokir September yang sesinya belum
  // pernah direkap. Sesi yang sudah diklaim tetap tidak bisa diklaim dua kali,
  // jadi anti-rekap-ganda justru jadi lebih tepat. Laporan warisan tanpa id
  // sesi tetap diblokir lewat kalender agar tidak ada klaim diam-diam.
  const windowReportIds = new Set(report.sessionIds);
  const overlap = candidates.find((candidate) => {
    if (candidate.id === report.id) return false;
    // Parent ↔ child edits are one accounting family. Siblings remain blocked.
    if (candidate.supplementalForReportId === report.id) return false;
    if (report.supplementalForReportId === candidate.id) return false;
    const blocksScope = candidate.billingMode === "session_count"
      ? candidate.status === "confirmed" || invoiceReportIds.has(candidate.id)
      : reportBlocksSiblingScope(candidate, protectedReportIds.has(candidate.id));
    if (!blocksScope) return false;
    if (isSessionCount || candidate.billingMode === "session_count") {
      return sessionScopesOverlap(candidate.sessionIds, report.sessionIds);
    }
    const period = reportPeriodOf(candidate);
    if (!(period.periodStart <= report.periodEnd && period.periodEnd >= report.periodStart)) return false;
    if (candidate.sessionIds.length === 0) return true;
    return candidate.sessionIds.some((id) => windowReportIds.has(id));
  });
  if (overlap) {
    throw new Error("Periode laporan bertumpuk dengan laporan sah lain");
  }

  if (isSessionCount) return;
}

/** Save one report identity and enforce confirmed-scope invariants atomically. */
export async function upsertReport(report: ReportWrite): Promise<string> {
  const now = timestamp();
  const period = reportPeriodOf(report);
  const normalized = { ...report, ...period } as MonthlyReport;
  return db.transaction("rw", db.students, db.reports, db.payments, async () => {
    if (normalized.id) {
      const existing = await db.reports.get(normalized.id);
      if (existing) {
        await assertConfirmedScopeAvailable(normalized, existing);
        await db.reports.update(existing.id, { ...normalized, createdAt: existing.createdAt });
        return existing.id;
      }
    }
    const id = normalized.id ?? crypto.randomUUID();
    const created = { ...normalized, id, createdAt: normalized.createdAt ?? now };
    await assertConfirmedScopeAvailable(created);
    await db.reports.add(created);
    return id;
  });
}

/**
 * Atomically create one regular draft per exact student/period. Concurrent
 * tabs and double taps receive the same existing id instead of adding twins.
 */
export async function createReportForPeriod(
  report: ReportWrite,
): Promise<{ reportId: string; created: boolean }> {
  if (report.supplementalForReportId) {
    throw new Error("Supplemental reports must be created by the billing workflow");
  }
  const now = timestamp();
  const period = reportPeriodOf(report);
  const normalized = { ...report, ...period } as MonthlyReport;
  return db.transaction("rw", db.students, db.reports, db.payments, async () => {
    const matches = await db.reports
      .where({ studentId: normalized.studentId })
      .filter((candidate) => {
        const candidatePeriod = reportPeriodOf(candidate);
        if (normalized.billingMode === "session_count") {
          return candidate.billingMode === "session_count"
            && sameSessionIds(candidate.sessionIds, normalized.sessionIds);
        }
        return !candidate.supplementalForReportId
          && candidate.billingMode !== "session_count"
          && candidatePeriod.periodStart === normalized.periodStart
          && candidatePeriod.periodEnd === normalized.periodEnd;
      })
      .toArray();
    const existing = matches.sort(compareReportIdentity)[0];
    if (existing) return { reportId: existing.id, created: false };

    const id = normalized.id ?? crypto.randomUUID();
    const created = { ...normalized, id, createdAt: normalized.createdAt ?? now };
    await assertConfirmedScopeAvailable(created);
    await db.reports.add(created);
    return { reportId: id, created: true };
  });
}

export async function listReportsByStudent(studentId: string): Promise<MonthlyReport[]> {
  const reports = await db.reports
    .where({ studentId })
    .toArray();
  return reports.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export async function listAllReports(): Promise<MonthlyReport[]> {
  return db.reports.toArray();
}
