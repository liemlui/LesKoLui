import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MonthlyReport, Session, Student } from "../db/types";

const generateNarrativesMock = vi.hoisted(() => vi.fn());
const generateReportSummaryMock = vi.hoisted(() => vi.fn());
const generateReportFieldMock = vi.hoisted(() => vi.fn());
const generateStagedSummaryMock = vi.hoisted(() => vi.fn());
const applyAiNarrativeBatchMock = vi.hoisted(() => vi.fn());
const upsertReportMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/aiClient", async (importOriginal) => {
  // Chunker asli dipakai agar test menguji pemecahan batch yang sebenarnya.
  const actual = await importOriginal<typeof import("../lib/aiClient")>();
  return {
    ...actual,
    generateNarratives: generateNarrativesMock,
    generateReportSummary: generateReportSummaryMock,
    generateReportField: generateReportFieldMock,
    generateStagedSummary: generateStagedSummaryMock,
  };
});
vi.mock("../db/repos", () => ({
  getSettings: vi.fn(),
  applyAiNarrativeBatch: applyAiNarrativeBatchMock,
  upsertReport: upsertReportMock,
  updateSession: vi.fn(),
}));

import { useReportGeneration, type ReportGenerationDeps } from "../screens/monthlyReport/useReportGeneration";

type Hook = ReturnType<typeof useReportGeneration>;
/** Bentuk input yang diterima generateNarratives (dipakai untuk inspeksi mock). */
type NarrativesInput = { sessions: Array<{ id: string; shortNote: string }> };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const student: Student = {
  id: "student-1", name: "Murid", level: "SMA", subjects: ["Matematika"],
  parentContact: { name: "Orang Tua", phone: "08123456789" }, hourlyRate: 100_000,
  active: true, enrolledAt: "2026-01-01",
};

function makeSession(): Session {
  return {
    id: "session-1", studentId: student.id, date: "2026-09-10", durationHours: 1,
    subjects: ["Matematika"], shortNote: "Latihan aljabar", narrative: "Narasi lama",
    aiNarrativeHash: 123, status: "DONE", rateSnapshot: 100_000, cost: 100_000,
    createdAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T00:00:00.000Z",
  };
}

function makeReport(): MonthlyReport {
  return {
    id: "report-1", studentId: student.id, month: "2026-09",
    periodStart: "2026-09-01", periodEnd: "2026-09-30", sessionIds: ["session-1"],
    templateKey: { themeId: "classic", layoutId: "standard" }, summaryText: "Ringkasan lama",
    teacherNote: "Catatan lama", quote: "Kutipan lama", totalHours: 1, totalCost: 100_000,
    createdAt: "2026-09-10T00:00:00.000Z",
  };
}

/** Sesi tanpa narasi → semuanya dirty (belum pernah dibuat AI). */
function makeDirtySessions(count: number): Session[] {
  return Array.from({ length: count }, (_, index) => ({
    ...makeSession(),
    id: `session-${index + 1}`,
    date: `2026-09-${String((index % 28) + 1).padStart(2, "0")}`,
    shortNote: `Latihan sesi ${index + 1}`,
    narrative: undefined,
    aiNarrativeHash: undefined,
  }));
}

function makeDepsFor(sessions: Session[], report: MonthlyReport, messages: string[]): ReportGenerationDeps {
  return {
    ...makeDeps(sessions[0], report, messages),
    report,
    reportSessions: sessions,
  };
}

function renderHook(deps: ReportGenerationDeps): Hook {
  let hook: Hook | undefined;
  function Probe() {
    hook = useReportGeneration(deps);
    return null;
  }
  renderToStaticMarkup(createElement(Probe));
  if (!hook) throw new Error("Hook tidak ter-render");
  return hook;
}

function makeDeps(session: Session, report: MonthlyReport, messages: string[]): ReportGenerationDeps {
  return {
    student, report, reportSessions: [session], periodStart: report.periodStart,
    periodEnd: report.periodEnd, month: report.month, totalHours: 1, avgEngagement: 8,
    ensureReport: vi.fn().mockResolvedValue(report), setMessage: (message) => messages.push(message),
    setOpenNarasi: vi.fn(), setOpenTeks: vi.fn(), setOpenPlan: vi.fn(),
  };
}

describe("useReportGeneration resilience", () => {
  beforeEach(() => {
    generateNarrativesMock.mockReset();
    generateReportSummaryMock.mockReset();
    applyAiNarrativeBatchMock.mockReset();
    upsertReportMock.mockReset();
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("respons gagal tidak mengubah narasi atau fingerprint lama; retry sukses baru menulis", async () => {
    const session = makeSession();
    const report = makeReport();
    const messages: string[] = [];
    const hook = renderHook(makeDeps(session, report, messages));

    generateNarrativesMock.mockRejectedValueOnce(new Error("AI timeout"));
    await hook.handleGenerateNarratives(true);

    expect(applyAiNarrativeBatchMock).not.toHaveBeenCalled();
    expect(session).toMatchObject({ narrative: "Narasi lama", aiNarrativeHash: 123 });
    expect(report).toMatchObject({ summaryText: "Ringkasan lama", teacherNote: "Catatan lama", quote: "Kutipan lama" });
    expect(messages.at(-1)).toBe("Gagal: AI timeout");

    generateNarrativesMock.mockResolvedValueOnce({
      entries: [{ id: session.id, narrative: "Narasi baru dari AI" }],
      summary: "Ringkasan baru", teacherNote: "Catatan baru", quote: "Kutipan baru",
    });
    applyAiNarrativeBatchMock.mockImplementation(async (_draft, updates, reportPatch) => {
      Object.assign(session, updates[0]);
      Object.assign(report, reportPatch);
    });
    await hook.handleGenerateNarratives(true);

    expect(session.narrative).toBe("Narasi baru dari AI");
    expect(session.aiNarrativeHash).not.toBe(123);
    expect(report).toMatchObject({ summaryText: "Ringkasan baru", teacherNote: "Catatan baru", quote: "Kutipan baru" });
  });

  it("mengabaikan respons terlambat setelah request diinvalidasi karena scope berubah", async () => {
    const session = makeSession();
    const report = makeReport();
    const pending = deferred<{ entries: Array<{ id: string; narrative: string }>; summary: string }>();
    generateNarrativesMock.mockReturnValueOnce(pending.promise);
    const hook = renderHook(makeDeps(session, report, []));

    const request = hook.handleGenerateNarratives(true);
    hook.invalidateAiRequests();
    pending.resolve({ entries: [{ id: session.id, narrative: "Respons lama" }], summary: "Ringkasan lama yang terlambat" });
    await request;

    expect(applyAiNarrativeBatchMock).not.toHaveBeenCalled();
    expect(session).toMatchObject({ narrative: "Narasi lama", aiNarrativeHash: 123 });
    expect(report.summaryText).toBe("Ringkasan lama");
  });
});

/**
 * Keputusan pemilik 2026-10-15 (D11) — bentuk "Isi Semua dengan AI" yang berlaku.
 *
 * Yang dijaga di sini bukan sekadar "isian terisi", melainkan **apa yang TIDAK
 * boleh dilakukan tombol itu**: menulis ulang narasi/catatan sesi. Sebelum D11,
 * tombol ini mengirim narasi per batch sesi lebih dulu — biayanya tumbuh
 * mengikuti jumlah sesi, dan catatan yang sudah ditulis tutor ikut ditimpa.
 */
describe("handleGenerateAll (satu tombol AI) — D11: tiga isian saja", () => {
  beforeEach(() => {
    generateNarrativesMock.mockReset();
    generateReportSummaryMock.mockReset();
    generateReportFieldMock.mockReset();
    generateStagedSummaryMock.mockReset();
    applyAiNarrativeBatchMock.mockReset();
    upsertReportMock.mockReset();
    applyAiNarrativeBatchMock.mockResolvedValue(undefined);
    upsertReportMock.mockResolvedValue("report-1");
    // Jawaban mock mengikuti isian yang diminta — validator asli di `aiClient`
    // memang menuntut kunci yang berbeda per isian.
    generateReportFieldMock.mockImplementation(async (field: string) => {
      if (field === "summaryText") return { summary: "Kesimpulan baru" };
      if (field === "teacherNote") return { teacherNote: "Catatan guru baru" };
      if (field === "nextMonthPlan") {
        return { nextMonthPlan: { priorities: [{ target: "Latihan soal cerita", subject: "Matematika" }], parentSupport: "Dampingi 15 menit/hari" } };
      }
      return {};
    });
    generateStagedSummaryMock.mockResolvedValue({ summary: "Kesimpulan dari ringkasan bagian" });
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("TIDAK menulis ulang narasi sesi, dan hanya memanggil tiga isian", async () => {
    const sessions = makeDirtySessions(19);
    const report = { ...makeReport(), sessionIds: sessions.map((s) => s.id) };
    const messages: string[] = [];
    const hook = renderHook(makeDepsFor(sessions, report, messages));

    await hook.handleGenerateAll();

    // Inilah inti D11: narasi sesi tidak disentuh sama sekali.
    expect(generateNarrativesMock).not.toHaveBeenCalled();
    expect(applyAiNarrativeBatchMock).not.toHaveBeenCalled();
    for (const session of sessions) {
      expect(session.narrative).toBeUndefined();
      expect(session.aiNarrativeHash).toBeUndefined();
    }
    // Kutipan juga tidak ditulis AI lagi — bukan bagian dari tiga isian itu.
    expect((upsertReportMock.mock.calls[0][0] as MonthlyReport).quote).toBe("Kutipan lama");
    const written = upsertReportMock.mock.calls[0][0] as MonthlyReport;
    // 19 sesi → kesimpulan datang dari ringkasan bertahap, bukan panggilan tunggal.
    expect(written.summaryText).toBe("Kesimpulan dari ringkasan bagian");
    expect(written.teacherNote).toBe("Catatan guru baru");
    expect(written.nextMonthPlan?.priorities[0]?.target).toBe("Latihan soal cerita");
    expect(messages.at(-1)).toBe("Isi AI selesai ✓ Ringkasan, Catatan Guru & Rencana depan terisi");
  });

  it("19 sesi tetap memakai ringkasan bertahap, dan panggilan isian tidak tumbuh mengikuti jumlah sesi", async () => {
    const sessions = makeDirtySessions(19);
    const report = { ...makeReport(), sessionIds: sessions.map((s) => s.id) };
    const messages: string[] = [];
    const hook = renderHook(makeDepsFor(sessions, report, messages));

    await hook.handleGenerateAll();

    expect(generateStagedSummaryMock).toHaveBeenCalledTimes(1);
    const muatan = generateStagedSummaryMock.mock.calls[0][0] as { digests: string[]; sessionCount: number; sessions?: unknown };
    expect(muatan.sessionCount).toBe(19);
    expect(muatan.digests.length).toBeGreaterThan(1);
    // Muatan terakhir hanya ringkasan bagian — bukan catatan sesi mentah.
    expect(muatan.sessions).toBeUndefined();
    // Dua isian lain dipanggil SEKALI masing-masing, berapa pun jumlah sesinya.
    const perIsian = generateReportFieldMock.mock.calls.filter((call) => call[0] !== "summaryText");
    expect(perIsian.map((call) => call[0])).toEqual(["teacherNote", "nextMonthPlan"]);
  });

  it("laporan kecil: satu panggilan kesimpulan, tanpa ringkasan bertahap", async () => {
    const session = makeSession();
    const report = makeReport();
    const messages: string[] = [];
    const hook = renderHook(makeDepsFor([session], report, messages));

    await hook.handleGenerateAll();

    expect(generateStagedSummaryMock).not.toHaveBeenCalled();
    expect(generateReportFieldMock.mock.calls.map((call) => call[0]))
      .toEqual(["summaryText", "teacherNote", "nextMonthPlan"]);
  });

  it("satu isian gagal tidak menjatuhkan isian lain — yang gagal disebut namanya", async () => {
    const session = makeSession();
    const report = makeReport();
    const messages: string[] = [];
    const hook = renderHook(makeDepsFor([session], report, messages));
    generateReportFieldMock.mockImplementation(async (field: string) => {
      if (field === "teacherNote") throw new Error("konteks terlalu panjang");
      if (field === "summaryText") return { summary: "Kesimpulan baru" };
      return { nextMonthPlan: { priorities: [{ target: "Latihan", subject: "Matematika" }] } };
    });

    await hook.handleGenerateAll();

    const written = upsertReportMock.mock.calls[0][0] as MonthlyReport;
    expect(written.summaryText).toBe("Kesimpulan baru");
    expect(written.teacherNote).toBe("Catatan lama"); // tidak dikosongkan
    expect(written.nextMonthPlan?.priorities[0]?.target).toBe("Latihan");
    // `hook` memegang hasil render PERTAMA (renderToStaticMarkup tidak
    // me-render ulang), jadi keadaan `aiResult` dibaca lewat pesan yang
    // dihasilkan putaran itu — bukan lewat objek hook.
    expect(messages.at(-1)).toContain("Isi AI sebagian");
    expect(messages.at(-1)).toContain("Catatan Guru");
    expect(messages.at(-1)).toContain("gagal");
  });

  it("semua isian gagal: tidak ada penulisan, dan tutor diberi tahu sebabnya", async () => {
    const session = makeSession();
    const report = makeReport();
    const messages: string[] = [];
    const hook = renderHook(makeDepsFor([session], report, messages));
    generateReportFieldMock.mockRejectedValue(new Error("AI timeout"));

    await hook.handleGenerateAll();

    expect(upsertReportMock).not.toHaveBeenCalled();
    expect(messages.at(-1)).toContain("Gagal");
    expect(messages.at(-1)).toContain("AI timeout");
  });

  it("retryFailedAi menjalankan ulang ketiga isian, bukan hanya yang gagal", async () => {
    const session = makeSession();
    const report = makeReport();
    const messages: string[] = [];
    const hook = renderHook(makeDepsFor([session], report, messages));
    generateReportFieldMock.mockRejectedValueOnce(new Error("AI timeout"));

    await hook.handleGenerateAll();
    generateReportFieldMock.mockClear();
    generateReportFieldMock.mockImplementation(async (field: string) =>
      field === "teacherNote" ? { teacherNote: "Catatan guru baru" } : { summary: "Kesimpulan baru" });

    await hook.retryFailedAi();

    expect(generateReportFieldMock.mock.calls.map((call) => call[0]))
      .toEqual(["summaryText", "teacherNote", "nextMonthPlan"]);
  });
});

/**
 * Keputusan pemilik 2026-10-14: tombol perkuat **per bagian**.
 *
 * Invarian yang dijaga: memperkuat satu bagian **tidak boleh menyentuh bagian
 * lain** — dan yang paling berbahaya adalah mengosongkannya (`""`), sebab itu
 * menghapus tulisan tutor tanpa pemberitahuan. Inilah yang membuat perkuat
 * kesimpulan tidak pernah menghapus kutipan atau catatan guru.
 */
describe("handlePerkuatBagian — satu bagian saja", () => {
  beforeEach(() => {
    generateReportFieldMock.mockReset();
    generateStagedSummaryMock.mockReset();
    upsertReportMock.mockReset();
    upsertReportMock.mockResolvedValue("report-1");
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("hanya menulis bagian yang diminta, bagian lain dikirim apa adanya", async () => {
    const session = makeSession();
    const report = makeReport();
    const messages: string[] = [];
    const hook = renderHook(makeDepsFor([session], report, messages));
    generateReportFieldMock.mockResolvedValue({ quote: "Kutipan baru dari AI" });

    await hook.handlePerkuatBagian("quote");

    expect(generateReportFieldMock).toHaveBeenCalledTimes(1);
    expect(generateReportFieldMock.mock.calls[0][0]).toBe("quote");
    const written = upsertReportMock.mock.calls[0][0] as MonthlyReport;
    expect(written.quote).toBe("Kutipan baru dari AI");
    // Bagian lain TIDAK dikosongkan — nilainya sama seperti sebelumnya.
    expect(written.summaryText).toBe(report.summaryText);
    expect(written.teacherNote).toBe(report.teacherNote);
    expect(messages.at(-1)).toContain("Kutipan diperkuat dengan AI");
  });

  it("keluaran kosong tidak mengosongkan isian yang sudah ada", async () => {
    const session = makeSession();
    const report = makeReport();
    const messages: string[] = [];
    const hook = renderHook(makeDepsFor([session], report, messages));
    generateReportFieldMock.mockResolvedValue({});

    await hook.handlePerkuatBagian("summaryText");

    // Tidak ada penulisan sama sekali, dan tutor diberi tahu apa yang terjadi.
    expect(upsertReportMock).not.toHaveBeenCalled();
    expect(messages.at(-1)).toContain("Gagal");
  });

  it("laporan kecil memakai satu panggilan, bukan ringkasan bertahap", async () => {
    const session = makeSession();
    const report = makeReport();
    const messages: string[] = [];
    const hook = renderHook(makeDepsFor([session], report, messages));
    generateReportFieldMock.mockResolvedValue({ summary: "Kesimpulan baru" });

    await hook.handlePerkuatBagian("summaryText");

    expect(generateStagedSummaryMock).not.toHaveBeenCalled();
    expect((upsertReportMock.mock.calls[0][0] as MonthlyReport).summaryText).toBe("Kesimpulan baru");
  });

  it("laporan panjang: kesimpulan lewat ringkasan bertahap, muatan terakhir tanpa catatan sesi", async () => {
    const sessions = makeDirtySessions(17).map((s) => ({ ...s, shortNote: "c".repeat(300) }));
    const report = { ...makeReport(), sessionIds: sessions.map((s) => s.id) };
    const messages: string[] = [];
    const hook = renderHook(makeDepsFor(sessions, report, messages));
    generateReportFieldMock.mockImplementation(async (_field: string, input: NarrativesInput) => ({
      summary: `ringkasan ${input.sessions.length} sesi`,
    }));
    generateStagedSummaryMock.mockResolvedValue({ summary: "Kesimpulan bertahap" });

    await hook.handlePerkuatBagian("summaryText");

    expect(generateStagedSummaryMock).toHaveBeenCalledTimes(1);
    const muatan = generateStagedSummaryMock.mock.calls[0][0] as {
      digests: string[]; sessionCount: number; sessions?: unknown;
    };
    expect(muatan.sessionCount).toBe(17);
    expect(muatan.digests.length).toBeGreaterThan(1);
    // Muatan terakhir hanya berisi ringkasan bagian — bukan catatan sesi mentah.
    expect(muatan.sessions).toBeUndefined();
    expect((upsertReportMock.mock.calls[0][0] as MonthlyReport).summaryText).toBe("Kesimpulan bertahap");
  });
});
