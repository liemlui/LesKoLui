import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import type { CaptureDraft, Student } from "../db/types";
import {
  createSessionWithCloseoutDraft,
  deleteStudent,
} from "../db/repos";

const student: Student = {
  id: "student-lifecycle",
  name: "Test Student",
  level: "MYP",
  subjects: ["Math"],
  parentContact: { phone: "08123456789" },
  hourlyRate: 200_000,
  active: true,
  enrolledAt: "2026-09-05",
};

function makeDraft(revision = 1): CaptureDraft {
  return {
    draftId: "draft-lifecycle",
    formatVersion: 1,
    revision,
    updatedAt: new Date().toISOString(),
    scopeKey: "student:student-lifecycle",
    studentId: student.id,
    phase: "editing",
    form: {
      step: 5,
      date: "2026-09-05",
      durationHours: 1,
      subjects: ["Math"],
      topic: "Algebra",
      topicSearch: "",
      shortNote: "Mengerjakan persamaan",
      needsWork: "",
      predictedGrade: "",
      engagementFlags: {},
      behaviorTags: [],
      situasiNote: "",
    },
  };
}

beforeEach(async () => {
  await db.students.clear();
  await db.sessions.clear();
  await db.captureDrafts.clear();
  await db.students.add(student);
});

describe("capture draft lifecycle", () => {
  it("commits the session and closeout draft together", async () => {
    const draft = makeDraft();
    await db.captureDrafts.add(draft);

    const result = await createSessionWithCloseoutDraft(
      { studentId: student.id, date: "2026-09-05", durationHours: 1, subjects: ["Math"], shortNote: "Mengerjakan persamaan", status: "DONE" },
      draft,
      [{ id: "follow-up-1", text: "Latihan lagi" }],
    );

    expect(await db.sessions.get(result.id)).toBeDefined();
    await expect(db.captureDrafts.get(draft.draftId)).resolves.toMatchObject({
      phase: "closeout",
      savedSessionId: result.id,
      revision: 2,
    });
  });

  it("rolls back the session when the draft revision is stale", async () => {
    const draft = makeDraft();
    await db.captureDrafts.add({ ...draft, revision: 2 });

    await expect(createSessionWithCloseoutDraft(
      { studentId: student.id, date: "2026-09-05", durationHours: 1, subjects: ["Math"], shortNote: "Mengerjakan persamaan", status: "DONE" },
      draft,
      [],
    )).rejects.toThrow("Draf berubah");
    expect(await db.sessions.count()).toBe(0);
  });

  it("removes drafts when a student is deleted", async () => {
    await db.captureDrafts.add(makeDraft());
    await deleteStudent(student.id);
    expect(await db.captureDrafts.count()).toBe(0);
  });
});
