import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import {
  CaptureDraftConflictError,
  deleteCaptureDraft,
  getCaptureDraft,
  getCaptureDraftByScope,
  saveCaptureDraft,
} from "../db/repos/captureDraftRepo";
import type { CaptureDraft } from "../db/types";

function draft(overrides: Partial<CaptureDraft> = {}): Omit<CaptureDraft, "revision" | "updatedAt"> {
  return {
    draftId: "draft-1",
    formatVersion: 1,
    scopeKey: "student:student-1",
    studentId: "student-1",
    phase: "editing",
    form: {
      step: 1,
      date: "2026-09-05",
      durationHours: 1,
      subjects: [],
      topic: "",
      topicSearch: "",
      shortNote: "",
      needsWork: "",
      predictedGrade: "",
      engagementFlags: {},
      behaviorTags: [],
      situasiNote: "",
    },
    ...overrides,
  };
}

beforeEach(async () => {
  await db.captureDrafts.clear();
});

describe("capture draft repository", () => {
  it("creates and updates a draft with monotonically increasing revisions", async () => {
    const first = await saveCaptureDraft(draft(), 0);
    const second = await saveCaptureDraft({ ...first, form: { ...first.form, shortNote: "Aljabar" } }, first.revision);

    expect(first.revision).toBe(1);
    expect(second.revision).toBe(2);
    expect((await getCaptureDraft("draft-1"))?.form.shortNote).toBe("Aljabar");
  });

  it("rejects a stale writer instead of overwriting newer text", async () => {
    const first = await saveCaptureDraft(draft(), 0);
    await saveCaptureDraft({ ...first, form: { ...first.form, shortNote: "Versi tab A" } }, first.revision);

    await expect(saveCaptureDraft({ ...first, form: { ...first.form, shortNote: "Versi tab B" } }, first.revision))
      .rejects.toBeInstanceOf(CaptureDraftConflictError);
    expect((await getCaptureDraft("draft-1"))?.form.shortNote).toBe("Versi tab A");
  });

  it("finds a draft by scope and deletes it explicitly", async () => {
    await saveCaptureDraft(draft(), 0);

    expect((await getCaptureDraftByScope("student:student-1"))?.draftId).toBe("draft-1");
    await deleteCaptureDraft("draft-1");
    expect(await getCaptureDraft("draft-1")).toBeUndefined();
  });
});
