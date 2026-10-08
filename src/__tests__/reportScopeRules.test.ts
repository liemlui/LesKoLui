/**
 * Aturan dan penanda baru pada tugas G3-05 (Laporan bulanan) — bagian murni.
 *
 * Semua fungsi di sini sengaja bebas React supaya bisa diuji tanpa merender
 * layar: penunjuk langkah, kesiapan laporan, chip cakupan penyaring, penanda
 * "isian dibuat AI", dan aturan "periode ini boleh dibuatkan laporan".
 */

import { describe, expect, it } from "vitest";
import {
  REPORT_STEPS, reportStepIndex, buildReportReadiness, scopeChipLabel,
  type ReportStepState,
} from "../screens/monthlyReport/helpers";
import { isAiWritten, markAiFields, narrativeIsAiWritten, planContent } from "../screens/monthlyReport/aiFieldMarks";
import { reportAvailabilityOf } from "../screens/monthlyReport/reportAvailability";
import { narrativeSavedLabel } from "../screens/monthlyReport/useNarrativeAutosave";
import { sessionAiFingerprint, contentFingerprint } from "../lib/aiIncremental";
import type { MonthlyReport, Session, Student } from "../db/types";

function makeReport(overrides: Partial<MonthlyReport> = {}): MonthlyReport {
  return {
    id: "report-1",
    studentId: "student-1",
    month: "2026-09",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    sessionIds: ["s1"],
    templateKey: { themeId: "classic", layoutId: "cards" },
    summaryText: "",
    totalHours: 1,
    totalCost: 100_000,
    createdAt: "2026-09-30T00:00:00.000Z",
    ...overrides,
  };
}

function makeStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: "student-1", name: "Murid", level: "SMA", subjects: ["Matematika"],
    parentContact: { name: "Orang Tua", phone: "08123456789" }, hourlyRate: 100_000,
    active: true, enrolledAt: "2026-01-01",
    ...overrides,
  };
}

function availability(overrides: Partial<Parameters<typeof reportAvailabilityOf>[0]> = {}) {
  return reportAvailabilityOf({
    studentId: "student-1",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    mode: "bulan",
    rangeStart: "2026-09-01",
    rangeEnd: "2026-09-30",
    invalidReportLink: false,
    dataReady: true,
    scopeHasProtectedInvoice: false,
    reportSessionsCount: 3,
    reportTargetCount: 3,
    reportSessionIds: ["s1", "s2", "s3"],
    blockingConfirmedReports: [],
    sessionWindowIds: new Set(["s1", "s2", "s3"]),
    ...overrides,
  });
}

describe("Langkah laporan (G3-05 butir 1)", () => {
  it("menyusun lima langkah berurutan", () => {
    expect(REPORT_STEPS.map((step) => step.id))
      .toEqual(["murid", "periode", "laporan", "narasi", "ekspor"]);
  });

  it("menunjuk langkah pertama yang belum selesai", () => {
    const base: ReportStepState = {
      hasStudent: false, hasPeriod: false, hasReport: false, allNarrativesReady: false,
    };
    expect(reportStepIndex(base)).toBe(0);
    expect(reportStepIndex({ ...base, hasStudent: true })).toBe(1);
    expect(reportStepIndex({ ...base, hasStudent: true, hasPeriod: true })).toBe(2);
    expect(reportStepIndex({ ...base, hasStudent: true, hasPeriod: true, hasReport: true })).toBe(3);
    expect(reportStepIndex({
      hasStudent: true, hasPeriod: true, hasReport: true, allNarrativesReady: true,
    })).toBe(4);
  });
});

describe("Kesiapan laporan (G3-05 butir 7)", () => {
  it("dihitung dari seluruh sesi laporan, bukan sesi yang sedang tersaring", () => {
    const items = buildReportReadiness({
      totalSessions: 12,
      sessionsWithNarrative: 12,
      hasSummary: true,
      hasTeacherNote: false,
      hasPlan: false,
    });
    expect(items).toEqual([
      { label: "Narasi sesi", complete: true },
      { label: "Ringkasan", complete: true },
      { label: "Catatan guru", complete: false },
      { label: "Rencana depan", complete: false },
    ]);
  });

  it("narasi belum lengkap selama masih ada sesi tanpa narasi", () => {
    const items = buildReportReadiness({
      totalSessions: 5,
      sessionsWithNarrative: 4,
      hasSummary: false,
      hasTeacherNote: false,
      hasPlan: false,
    });
    expect(items[0].complete).toBe(false);
  });

  it("laporan tanpa sesi tidak dianggap siap", () => {
    const items = buildReportReadiness({
      totalSessions: 0, sessionsWithNarrative: 0,
      hasSummary: true, hasTeacherNote: true, hasPlan: true,
    });
    expect(items[0].complete).toBe(false);
  });

  it("chip cakupan hanya muncul saat penyaring benar-benar menyaring", () => {
    expect(scopeChipLabel(12, 12, false)).toBeUndefined();
    expect(scopeChipLabel(12, 12, true)).toBeUndefined();
    expect(scopeChipLabel(3, 12, true)).toBe("Menampilkan 3 dari 12 sesi");
  });
});

describe("Penanda isian dibuat AI (G3-05 butir 8)", () => {
  it("menandai isian yang ditulis AI dan tetap tampil selama isinya tidak berubah", () => {
    const marked = makeReport({
      aiFieldHashes: markAiFields(undefined, { summaryText: "Ringkasan dari AI" }),
      summaryText: "Ringkasan dari AI",
    });
    expect(isAiWritten(marked, "summaryText")).toBe(true);
    expect(isAiWritten(marked, "teacherNote")).toBe(false);
  });

  it("penandanya hilang sendiri setelah isian disunting manual", () => {
    const withMark = makeReport({
      aiFieldHashes: markAiFields(undefined, { summaryText: "Ringkasan dari AI" }),
      summaryText: "Ringkasan dari AI",
    });
    const edited = { ...withMark, summaryText: "Ringkasan dari AI, disunting tutor" };
    expect(isAiWritten(edited, "summaryText")).toBe(false);
  });

  it("menandai tiap isian secara terpisah", () => {
    const marked = makeReport({
      summaryText: "Ringkasan",
      teacherNote: "Catatan",
      aiFieldHashes: markAiFields(undefined, { summaryText: "Ringkasan" }),
    });
    expect(isAiWritten(marked, "summaryText")).toBe(true);
    expect(isAiWritten(marked, "teacherNote")).toBe(false);
  });

  it("rencana dinilai dari isinya saja — updatedAt tidak menghapus penandanya", () => {    const plan = { priorities: [{ id: "p1", subject: "Matematika", target: "Selesai 10 soal" }] };
    const marked = makeReport({
      nextMonthPlan: { ...plan, updatedAt: "2026-09-30T00:00:00.000Z" },
      aiFieldHashes: markAiFields(undefined, { nextMonthPlan: planContent(plan) }),
    });
    expect(isAiWritten(marked, "nextMonthPlan")).toBe(true);

    const resaved = { ...marked, nextMonthPlan: { ...marked.nextMonthPlan!, updatedAt: "2026-10-01T10:00:00.000Z" } };
    expect(isAiWritten(resaved, "nextMonthPlan")).toBe(true);

    const editedPlan = {
      ...marked,
      nextMonthPlan: { priorities: [{ id: "p1", subject: "Matematika", target: "Target diubah tutor" }] },
    };
    expect(isAiWritten(editedPlan, "nextMonthPlan")).toBe(false);
  });

  it("narasi sesi memakai aturan yang sama: penanda hilang setelah disunting tutor", () => {
    const session: Session = {
      id: "s1", studentId: "student-1", date: "2026-09-10", durationHours: 1,
      subjects: ["Matematika"], shortNote: "Latihan aljabar", narrative: "Narasi dari AI",
      status: "DONE", rateSnapshot: 100_000, cost: 100_000,
      createdAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T00:00:00.000Z",
    };
    // Seperti yang ditulis applyAiNarrativeBatch: hash masukan AI + hash teks narasi.
    const fromAi: Session = {
      ...session,
      aiNarrativeHash: sessionAiFingerprint(session),
      aiNarrativeTextHash: contentFingerprint("narrative", "Narasi dari AI"),
    };
    expect(narrativeIsAiWritten(fromAi)).toBe(true);

    // Tutor menyunting narasinya → penandanya hilang tanpa dibersihkan manual.
    const editedByTutor: Session = { ...fromAi, narrative: "Narasi yang saya rapikan sendiri" };
    expect(narrativeIsAiWritten(editedByTutor)).toBe(false);

    // Narasi lama dari tutor (tanpa penanda AI) tidak pernah ditandai AI.
    expect(narrativeIsAiWritten(session)).toBe(false);
  });
});

describe("Aturan ketersediaan periode (G3-05 butir 4)", () => {
  it("menahan diri selama murid/periode belum dipilih", () => {
    expect(availability({ studentId: "" })).toEqual({ ok: false, reason: "" });
  });

  it("tautan laporan yang hilang menyebut jalan keluarnya", () => {
    const result = availability({ invalidReportLink: true });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Laporan tersimpan");
  });

  it("data yang belum selesai dimuat menyebut langkah berikutnya", () => {
    const result = availability({ dataReady: false });
    expect(result.reason).toContain("masih dimuat");
    expect(result.reason).toContain("coba lagi");
  });

  it("rentang tanggal terbalik ditolak", () => {
    const result = availability({
      mode: "range", rangeStart: "2026-09-30", rangeEnd: "2026-09-01",
    });
    expect(result.reason).toBe("Tanggal awal harus lebih dulu dari tanggal akhir.");
  });

  it("rentang laporan yang tagihannya terkunci tidak bisa digeser", () => {
    const result = availability({
      report: makeReport({ status: "confirmed" }),
      scopeHasProtectedInvoice: true,
      periodStart: "2026-09-02",
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("terkunci");
  });

  it("paket yang belum genap menyebut jumlah yang tersedia", () => {
    const result = availability({
      mode: "jumlah",
      student: makeStudent({ billingPolicy: "session_count", billingSessionCount: 8 }),
      reportSessionsCount: 5,
      reportTargetCount: 8,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Paket harus berisi tepat 8 pertemuan. Saat ini tersedia 5/8.");
  });

  it("sesi yang sudah masuk laporan final lain memblokir, beserta tautannya", () => {
    const blocking = makeReport({ id: "report-old", sessionIds: ["s2"] });
    const result = availability({ blockingConfirmedReports: [blocking] });
    expect(result.ok).toBe(false);
    expect(result.blockingReportId).toBe("report-old");
    expect(result.reason).toContain("sudah pernah direkap");
  });

  it("benturan tanggal tanpa sesi yang sama tidak memblokir", () => {
    const other = makeReport({ id: "report-old", sessionIds: ["s9"] });
    const result = availability({
      blockingConfirmedReports: [other],
      sessionWindowIds: new Set(["s1", "s2", "s3"]),
    });
    expect(result).toEqual({ ok: true, reason: "" });
  });

  it("periode bersih boleh dibuatkan laporan", () => {
    expect(availability()).toEqual({ ok: true, reason: "" });
  });
});

describe("Label waktu simpan narasi (G3-05 butir 9)", () => {
  it("kosong selama belum pernah tersimpan", () => {
    expect(narrativeSavedLabel(null)).toBeUndefined();
  });

  it("menampilkan jamnya, bukan tanggal ISO", () => {
    const label = narrativeSavedLabel("2026-09-30T07:05:00.000Z");
    expect(label).toMatch(/^Tersimpan \d{2}[.:]\d{2}$/);
  });
});
