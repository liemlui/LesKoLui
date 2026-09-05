import { db } from "../db";
import type { CaptureDraft } from "../types";
import { timestamp } from "./helpers";

export class CaptureDraftConflictError extends Error {
  readonly draftId: string;

  constructor(draftId: string) {
    super("Draf berubah di tab lain. Muat versi terbaru sebelum menyimpan lagi.");
    this.name = "CaptureDraftConflictError";
    this.draftId = draftId;
  }
}

export async function getCaptureDraft(draftId: string): Promise<CaptureDraft | undefined> {
  return db.captureDrafts.get(draftId);
}

export async function getCaptureDraftByScope(scopeKey: string): Promise<CaptureDraft | undefined> {
  return db.captureDrafts.where("scopeKey").equals(scopeKey).first();
}

/** Save only when the caller still owns the revision it read. */
export async function saveCaptureDraft(
  draft: Omit<CaptureDraft, "revision" | "updatedAt">,
  expectedRevision: number,
): Promise<CaptureDraft> {
  return db.transaction("rw", db.captureDrafts, async () => {
    const current = await db.captureDrafts.get(draft.draftId);
    if ((current?.revision ?? 0) !== expectedRevision) {
      throw new CaptureDraftConflictError(draft.draftId);
    }
    const next: CaptureDraft = {
      ...draft,
      revision: expectedRevision + 1,
      updatedAt: timestamp(),
    };
    await db.captureDrafts.put(next);
    return next;
  });
}

export async function deleteCaptureDraft(draftId: string): Promise<void> {
  await db.captureDrafts.delete(draftId);
}

export async function deleteCaptureDraftsForStudent(studentId: string): Promise<void> {
  await db.captureDrafts.where("studentId").equals(studentId).delete();
}

export async function clearCaptureDrafts(): Promise<void> {
  await db.captureDrafts.clear();
}