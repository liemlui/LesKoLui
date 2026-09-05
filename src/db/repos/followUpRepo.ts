// ── Follow-up Items Repository ──────────────────────────────────────

import { db } from "../db";
import type { FollowUpItem, FollowUpType } from "../types";
import { timestamp } from "./helpers";

export type { FollowUpType };

export interface FollowUpBatchItem {
  id: string;
  text: string;
  type?: FollowUpType;
}

export async function createFollowUp(
  input: Omit<FollowUpItem, "id" | "createdAt">
): Promise<string> {
  const id = crypto.randomUUID();
  await db.followUps.add({ ...input, id, createdAt: timestamp() });
  return id;
}

/** Save close-out follow-ups atomically; retries with the same IDs are safe. */
export async function createFollowUpBatch(
  studentId: string,
  sourceSessionId: string,
  items: FollowUpBatchItem[],
  draftId?: string,
): Promise<void> {
  if (!studentId || !sourceSessionId) throw new Error("Murid dan sesi wajib tersedia.");
  const normalized = items.map((item) => ({
    ...item,
    text: item.text.trim(),
    type: item.type ?? "continue-topic" as const,
  }));
  if (normalized.some((item) => !item.id || !item.text)) {
    throw new Error("Setiap tindak lanjut harus memiliki ID dan teks.");
  }
  if (new Set(normalized.map((item) => item.id)).size !== normalized.length) {
    throw new Error("ID tindak lanjut duplikat.");
  }

  const tables = draftId
    ? [db.students, db.sessions, db.followUps, db.captureDrafts]
    : [db.students, db.sessions, db.followUps];
  await db.transaction("rw", tables, async () => {
    const student = await db.students.get(studentId);
    if (!student) throw new Error("Murid untuk tindak lanjut tidak ditemukan.");
    const session = await db.sessions.get(sourceSessionId);
    if (!session || session.studentId !== studentId) {
      throw new Error("Sesi tindak lanjut tidak cocok dengan murid.");
    }

    const existing = await db.followUps.bulkGet(normalized.map((item) => item.id));
    const now = timestamp();
    const pending: FollowUpItem[] = [];
    normalized.forEach((item, index) => {
      const row = existing[index];
      if (row) {
        if (row.studentId !== studentId || row.sourceSessionId !== sourceSessionId || row.text !== item.text || row.type !== item.type) {
          throw new Error(`Konflik ID tindak lanjut: ${item.id}`);
        }
        return;
      }
      pending.push({
        id: item.id,
        studentId,
        sourceSessionId,
        type: item.type,
        text: item.text,
        createdAt: now,
      });
    });
    if (pending.length > 0) await db.followUps.bulkAdd(pending);
    if (draftId) await db.captureDrafts.delete(draftId);
  });
}

export async function listPendingFollowUps(studentId?: string): Promise<FollowUpItem[]> {
  if (studentId) {
    return db.followUps
      .where({ studentId })
      .filter((f) => !f.completedAt)
      .toArray();
  }
  return db.followUps.filter((f) => !f.completedAt).toArray();
}

export async function completeFollowUp(id: string): Promise<void> {
  await db.followUps.update(id, { completedAt: timestamp() });
}
