import { describe, expect, it } from "vitest";
import type { CaptureDraftForm } from "../db/types";
import {
  captureDraftDigest,
  captureDraftPersistKey,
  shouldPersistDraft,
} from "../lib/captureDraftDigest";

function baseForm(): CaptureDraftForm {
  return {
    step: 3,
    date: "2026-09-12",
    durationHours: 1.5,
    subjects: ["Mathematics AA"],
    topic: "Integral substitusi",
    topicSearch: "",
    shortNote: "",
    needsWork: "",
    predictedGrade: "",
    mood: "Fokus",
    engagementFlags: {
      prepared: true, focused: true, activeAsking: false, quickLearner: false,
      drowsy: false, playingPhone: false, needsRepetition: false, hwMissed: false,
      late: false, bathroomBreaks: false, restless: false, offTask: false,
    },
    behaviorTags: [],
    situasiNote: "",
  };
}

describe("captureDraftDigest", () => {
  it("stabil untuk isi yang sama walau objeknya berbeda", () => {
    // Inti regresi C-17: form baru dibuat setiap render, identitasnya berubah,
    // tetapi sidik jarinya harus sama supaya draf tidak ditulis berulang.
    expect(captureDraftDigest(baseForm())).toBe(captureDraftDigest(baseForm()));
  });

  it("berubah ketika satu field berubah", () => {
    const a = baseForm();
    const b = { ...baseForm(), shortNote: "Latihan integral" };
    const c = { ...baseForm(), step: 4 };
    const d = { ...baseForm(), engagementFlags: { ...baseForm().engagementFlags, late: true } };
    const e = { ...baseForm(), subjects: ["Mathematics AA", "Physics"] };
    for (const other of [b, c, d, e]) {
      expect(captureDraftDigest(other)).not.toBe(captureDraftDigest(a));
    }
  });

  it("memakai ukuran/tipe blob sebagai penanda foto & tanda tangan", () => {
    const withPhoto = { ...baseForm(), photo: new Blob(["x".repeat(10)], { type: "image/jpeg" }) };
    const without = baseForm();
    expect(captureDraftDigest(withPhoto)).not.toBe(captureDraftDigest(without));
    // Blob berbeda objek tapi sama ukuran/tipe → dianggap sama (tidak menulis ulang).
    const sameSize = { ...baseForm(), photo: new Blob(["y".repeat(10)], { type: "image/jpeg" }) };
    expect(captureDraftDigest(sameSize)).toBe(captureDraftDigest(withPhoto));
  });

  it("memasukkan fase & sesi tersimpan ke kunci persistensi", () => {
    const form = baseForm();
    expect(captureDraftPersistKey(form, "editing", undefined))
      .not.toBe(captureDraftPersistKey(form, "closeout", undefined));
    expect(captureDraftPersistKey(form, "closeout", undefined))
      .not.toBe(captureDraftPersistKey(form, "closeout", "session-1"));
  });
});

describe("shouldPersistDraft (penjaga anti-loop C-17)", () => {
  const key = captureDraftPersistKey(baseForm(), "editing", undefined);

  it("tidak menjadwalkan penulisan bila isi belum berubah", () => {
    expect(shouldPersistDraft(true, key, key)).toBe(false);
  });

  it("menjadwalkan penulisan saat isi berubah", () => {
    const next = captureDraftPersistKey({ ...baseForm(), step: 4 }, "editing", undefined);
    expect(shouldPersistDraft(true, key, next)).toBe(true);
  });

  it("tidak menulis sebelum scope ter-hidrasi (draf lama belum diputuskan)", () => {
    expect(shouldPersistDraft(false, null, key)).toBe(false);
  });

  it("menulis lagi setelah kegagalan (kunci tersimpan direset)", () => {
    expect(shouldPersistDraft(true, null, key)).toBe(true);
  });
});
