// ── Follow-up Items Repository ──────────────────────────────────────

import { db } from "../db";
import type { FollowUpItem, FollowUpType } from "../types";
import { timestamp } from "./helpers";

export type { FollowUpType };

export async function createFollowUp(
  input: Omit<FollowUpItem, "id" | "createdAt">
): Promise<string> {
  const id = crypto.randomUUID();
  await db.followUps.add({ ...input, id, createdAt: timestamp() });
  return id;
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

export async function deleteFollowUp(id: string): Promise<void> {
  await db.followUps.delete(id);
}
