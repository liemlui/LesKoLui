import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import type { CaptureDraft } from "../db/types";
import {
  deleteCaptureDraft,
  getCaptureDraftByScope,
  saveCaptureDraft,
  CaptureDraftConflictError,
} from "../db/repos/captureDraftRepo";

/**
 * Regresi dari verifikasi alur "Buang draf & mulai baru" (audit C-06 → C-17):
 * setelah draf lama dihapus, penulisan berikutnya HARUS memakai identitas &
 * revisi baru. Kalau hook masih memakai revisi draf lama, setiap penulisan
 * melempar CaptureDraftConflictError dan sesi gagal disimpan
 * ("Gagal: Draf berubah sebelum sesi disimpan").
 */

const SCOPE = "student:student-discard";

function draft(overrides: Partial<CaptureDraft> = {}): CaptureDraft {
  return {
    draftId: "draft-lama",
    formatVersion: 1,
    revision: 78,
    updatedAt: new Date().toISOString(),
    scopeKey: SCOPE,
    studentId: "student-discard",
    phase: "editing",
    form: {
      step: 6,
      date: "2026-09-12",
      durationHours: 1,
      subjects: ["Mathematics AA"],
      topic: "",
      topicSearch: "",
      shortNote: "Catatan sesi",
      needsWork: "",
      predictedGrade: "",
      engagementFlags: {},
      behaviorTags: [],
      situasiNote: "",
    },
    ...overrides,
  };
}

/** Payload tulis draf: sama seperti draf, tanpa `revision`/`updatedAt`
 *  (keduanya ditentukan repositori). */
function payload(draftId: string) {
  const base = draft({ draftId });
  return {
    draftId: base.draftId,
    formatVersion: base.formatVersion,
    scopeKey: base.scopeKey,
    studentId: base.studentId,
    scheduleId: base.scheduleId,
    phase: base.phase,
    savedSessionId: base.savedSessionId,
    form: base.form,
  };
}

beforeEach(async () => {
  await db.captureDrafts.clear();
});

describe("identitas draf setelah draf lama dibuang", () => {
  it("menulis dengan identitas & revisi baru → berhasil", async () => {
    await db.captureDrafts.add(draft());
    await deleteCaptureDraft("draft-lama");

    const saved = await saveCaptureDraft(payload("draft-baru"), 0);
    expect(saved.revision).toBe(1);
  });

  it("memakai revisi draf lama setelah penghapusan → konflik (perilaku yang diperbaiki)", async () => {
    await db.captureDrafts.add(draft());
    await deleteCaptureDraft("draft-lama");

    await expect(saveCaptureDraft(payload("draft-baru"), 78))
      .rejects.toBeInstanceOf(CaptureDraftConflictError);
  });

  it("hanya menyisakan satu draf per scope setelah draf lama dibuang", async () => {
    await db.captureDrafts.add(draft());
    await deleteCaptureDraft("draft-lama");
    await saveCaptureDraft(payload("draft-baru"), 0);

    expect(await db.captureDrafts.where("scopeKey").equals(SCOPE).count()).toBe(1);
    await expect(getCaptureDraftByScope(SCOPE)).resolves.toMatchObject({ draftId: "draft-baru", revision: 1 });
  });
});
