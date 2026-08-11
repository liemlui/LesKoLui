import type { Session, Student } from "../db/types";
import type { AiInput } from "./aiClient";
import { dayLabel } from "./format";
import { BEHAVIOR_TAGS, RESPONSE_TAGS } from "./responseTaxonomy";

/** Select the latest N uncovered sessions while preserving chronological input order. */
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
  return allowed.slice(-safeCount);
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
}

export interface EditedReportOverlapContext {
  id: string;
  supplementalForReportId?: string;
}

/** A parent and its supplemental children may overlap in either edit direction,
 *  but unrelated reports and supplemental siblings still block each other. */
export function findBlockingReportOverlap<T extends ReportPeriodCandidate>(
  reports: readonly T[],
  start: string,
  end: string,
  editedReport?: EditedReportOverlapContext,
): T | undefined {
  const excludedIds = new Set([
    editedReport?.id,
    editedReport?.supplementalForReportId,
  ].filter((id): id is string => Boolean(id)));
  return reports.find((report) =>
    !excludedIds.has(report.id)
    && report.supplementalForReportId !== editedReport?.id
    && report.periodStart <= end
    && report.periodEnd >= start
  );
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

/** Build AI input from the already-selected report scope, never from history. */
export function buildReportAiInput(
  student: Pick<Student, "name" | "level">,
  period: string,
  reportSessions: readonly Session[],
): AiInput {
  return {
    student: { name: student.name, level: student.level },
    month: period,
    sessions: reportSessions.map((session) => ({
      id: session.id,
      date: dayLabel(session.date),
      subject: session.subjects.join(", "),
      shortNote: session.shortNote,
      mood: session.mood,
      topic: session.topic,
      needsWork: session.needsWork,
      predictedGrade: session.predictedGrade,
      engagementScore: session.engagement?.score,
      behaviorLabels: session.behaviorTags
        ?.map((id) => BEHAVIOR_TAGS.find((tag) => tag.id === id)?.label)
        .filter((label): label is string => Boolean(label)),
      responseLabel: session.responseTag
        ? RESPONSE_TAGS.find((tag) => tag.id === session.responseTag)?.label
        : undefined,
    })),
  };
}
