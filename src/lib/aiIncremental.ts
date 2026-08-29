/**
 * Fingerprint deterministik untuk deteksi perubahan konten sesi laporan.
 *
 * Tujuan: AI tidak perlu membaca ulang sesi yang tidak berubah. Setiap sesi
 * diberi hash non-kriptografis (FNV-1a 32-bit) atas field yang benar-benar
 * dipakai AI (shortNote, mood, topic, ...). Saat generate narasi, hanya sesi
 * `dirty` (fingerprint berubah ATAU narasi belum ada) yang dikirim ke DeepSeek.
 *
 * Hash ini BUKAN untuk keamanan — hanya untuk dedup. Kolisi FNV-1a 32-bit
 * sangat jarang dan dampaknya (AI membaca ulang satu sesi) tidak berbahaya.
 */

import type { Session, MonthlyReport } from "../db/types";

const FNV_OFFSET = 0x811c9dc5;

/** FNV-1a 32-bit — cepat, deterministik, cukup untuk dedup non-kripto. */
function fnv1a(str: string): number {
  let hash = FNV_OFFSET >>> 0;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Seragamkan nilai opsional agar undefined/null dianggap sama (tidak memicu dirty). */
function n(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v);
}

/**
 * Fingerprint satu sesi berdasarkan field yang dibaca AI saat menyusun narasi.
 * Field yang TIDAK relevan AI (foto, jam, biaya, status, dll.) sengaja diabaikan
 * agar edit non-naratif tidak memicu regenerate.
 */
export function sessionAiFingerprint(session: Session): number {
  const parts = [
    session.id,
    session.date,
    (session.subjects ?? []).join(","),
    session.shortNote,
    n(session.mood),
    n(session.topic),
    n(session.needsWork),
    n(session.predictedGrade),
    n(session.situasiNote),
    n(session.actualGrade),
    n(session.gradeReflection),
    n(session.engagement?.score ?? ""),
    (session.behaviorTags ?? []).join(","),
    n(session.responseTag),
  ];
  return fnv1a(parts.join("\u001f"));
}

/**
 * Pilih sesi yang perlu (re-)generate narasi AI:
 *  - narasi masih kosong → selalu dirty (belum pernah dibuat), ATAU
 *  - fingerprint saat ini berbeda dari yang tersimpan (`aiNarrativeHash`).
 *
 * Sesi lama tanpa `aiNarrativeHash` TAPI sudah punya narasi dianggap BERSIH:
 * narasi manual tutor tidak boleh ditimpa saat migrasi pertama kali.
 */
export function pickDirtyNarrativeSessions(sessions: readonly Session[]): {
  dirty: Session[];
  cleanCount: number;
} {
  const dirty: Session[] = [];
  for (const session of sessions) {
    const hasNarrative = Boolean(session.narrative?.trim());
    const current = sessionAiFingerprint(session);
    const isDirty = !hasNarrative
      || (session.aiNarrativeHash !== undefined && session.aiNarrativeHash !== current);
    if (isDirty) dirty.push(session);
  }
  return { dirty, cleanCount: sessions.length - dirty.length };
}

/**
 * Fingerprint ringkasan laporan: gabungan identitas + fingerprint seluruh sesi
 * yang masuk periode. Dipakai untuk skip "Poles Ringkasan" bila tidak ada
 * perubahan sesi sama sekali sejak ringkasan terakhir dibuat.
 */
export function reportSummaryFingerprint(report: MonthlyReport, sessions: readonly Session[]): number {
  const sessionPart = sessions
    .map((session) => `${session.id}:${sessionAiFingerprint(session)}`)
    .join("|");
  return fnv1a([report.id, report.periodStart, report.periodEnd, sessionPart].join("\u001f"));
}
