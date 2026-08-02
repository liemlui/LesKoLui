// ── Study Notes Repository ────────────────────────────────────────

import { db } from "../db";
import type { StudyNote } from "../types";
import { timestamp } from "./helpers";

export async function getStudyNote(studentId: string): Promise<StudyNote | undefined> {
  return db.studyNotes.get(studentId);
}

export async function saveStudyNote(studentId: string, content: string): Promise<void> {
  const existing = await db.studyNotes.get(studentId);
  const now = timestamp();
  if (existing) {
    await db.studyNotes.update(studentId, { content, updatedAt: now });
  } else {
    await db.studyNotes.add({ studentId, content, updatedAt: now });
  }
}

export async function listAllStudyNotes(): Promise<(StudyNote & { studentName?: string })[]> {
  const notes = await db.studyNotes.toArray();
  const studentIds = [...new Set(notes.map((n) => n.studentId))];
  const studMap = new Map(
    await Promise.all(
      studentIds.map(async (id) => [id, (await db.students.get(id))?.name ?? "—"] as const)
    )
  );
  return notes.map((n) => ({ ...n, studentName: studMap.get(n.studentId) }));
}
