export class AiValidationError extends Error {
  constructor(message: string) {
    super(`Respons AI tidak sesuai kontrak: ${message}`);
    this.name = "AiValidationError";
  }
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AiValidationError(`${label} harus berupa object.`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string, required = true): string | undefined {
  if (value === undefined && !required) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    throw new AiValidationError(`${label} harus berupa string tidak kosong.`);
  }
  return value;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new AiValidationError(`${label} harus berupa array.`);
  return value;
}

function plan(value: unknown): unknown {
  if (value === undefined) return undefined;
  const source = object(value, "nextMonthPlan");
  const priorities = array(source.priorities, "nextMonthPlan.priorities");
  if (priorities.length > 3) throw new AiValidationError("nextMonthPlan.priorities maksimal 3 item.");
  const owners = new Set(["tutor", "student", "parent", "shared"]);
  for (const [index, item] of priorities.entries()) {
    const row = object(item, `nextMonthPlan.priorities[${index}]`);
    string(row.subject, `priorities[${index}].subject`, false);
    string(row.evidence, `priorities[${index}].evidence`, false);
    string(row.target, `priorities[${index}].target`, false);
    string(row.tutorAction, `priorities[${index}].tutorAction`, false);
    string(row.successMetric, `priorities[${index}].successMetric`, false);
    if (row.cadence !== undefined) string(row.cadence, `priorities[${index}].cadence`);
    if (row.owner !== undefined && (typeof row.owner !== "string" || !owners.has(row.owner))) {
      throw new AiValidationError(`priorities[${index}].owner tidak valid.`);
    }
  }
  if (source.parentSupport !== undefined) string(source.parentSupport, "nextMonthPlan.parentSupport");
  return value;
}

export function parseJsonObject(value: unknown): unknown {
  return object(value, "root");
}

export function validateAiNarratives(value: unknown, requestedIds: readonly string[]) {
  const source = object(value, "root");
  const entries = array(source.entries, "entries");
  const requested = new Set(requestedIds);
  const seen = new Set<string>();
  for (const [index, item] of entries.entries()) {
    const row = object(item, `entries[${index}]`);
    const id = string(row.id, `entries[${index}].id`)!;
    if (!requested.has(id)) throw new AiValidationError(`entries[${index}].id tidak diminta.`);
    if (seen.has(id)) throw new AiValidationError(`entries[${index}].id duplikat.`);
    seen.add(id);
    string(row.narrative, `entries[${index}].narrative`);
  }
  if (seen.size !== requested.size) throw new AiValidationError("entries tidak lengkap untuk sesi yang diminta.");
  string(source.summary, "summary");
  string(source.teacherNote, "teacherNote", false);
  string(source.quote, "quote", false);
  plan(source.nextMonthPlan);
  return value as { entries: Array<{ id: string; narrative: string }>; summary: string; teacherNote?: string; quote?: string; nextMonthPlan?: unknown };
}

export function validateAiReportSummary(value: unknown) {
  const source = object(value, "root");
  string(source.summary, "summary");
  string(source.quote, "quote", false);
  plan(source.nextMonthPlan);
  return value as { summary: string; quote?: string; nextMonthPlan?: unknown };
}

export function validateAiDraftNote(value: unknown) {
  const source = object(value, "root");
  string(source.note, "note");
  return value as { note: string };
}

export function validateAiPolishedWa(value: unknown) {
  const source = object(value, "root");
  string(source.message, "message");
  return value as { message: string };
}

export function validateAiStudentInsight(value: unknown) {
  const source = object(value, "root");
  const patterns = array(source.patterns, "patterns");
  patterns.forEach((item, index) => string(item, `patterns[${index}]`));
  string(source.nextFocus, "nextFocus");
  string(source.encouragement, "encouragement");
  return value as { patterns: string[]; nextFocus: string; encouragement: string };
}

export function validateAiDraftStudyNote(value: unknown) {
  const source = object(value, "root");
  string(source.content, "content");
  return value as { content: string };
}

export function validateFinancialInsights(value: unknown) {
  const source = object(value, "root");
  const anomalies = array(source.anomali, "anomali");
  const levels = new Set(["info", "warning", "good"]);
  anomalies.forEach((item, index) => {
    const row = object(item, `anomali[${index}]`);
    if (typeof row.level !== "string" || !levels.has(row.level)) throw new AiValidationError(`anomali[${index}].level tidak valid.`);
    string(row.text, `anomali[${index}].text`);
  });
  const recommendations = array(source.rekomendasi, "rekomendasi");
  recommendations.forEach((item, index) => string(item, `rekomendasi[${index}]`));
  return value as { anomali: Array<{ level: "info" | "warning" | "good"; text: string }>; rekomendasi: string[] };
}
