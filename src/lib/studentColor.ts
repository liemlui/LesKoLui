/**
 * Stable per-student colors.
 * Color is derived from a hash of the student id, so it never shifts when
 * students are added, removed, or reordered (unlike index-based palettes).
 */
export const STUDENT_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981",
  "#EF4444", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];

/** djb2-ish hash of the id → stable index into STUDENT_COLORS. */
export function colorForStudent(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return STUDENT_COLORS[Math.abs(hash) % STUDENT_COLORS.length];
}

export type StudentInfo = { name: string; color: string };
export type StudentMap = Map<string, StudentInfo>;
