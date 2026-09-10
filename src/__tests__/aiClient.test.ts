import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  analyzeStudent, draftShortNote, draftStudyNote, generateFinancialInsights,
  generateNarratives, generateReportSummary, polishWhatsApp,
  type AiInput, type FinancialInsightInput,
} from "../lib/aiClient";

const getSettingsMock = vi.hoisted(() => vi.fn());
vi.mock("../db/repos", () => ({ getSettings: getSettingsMock }));

const fetchMock = vi.fn<typeof fetch>();
const reportInput: AiInput = {
  student: { name: "Murid Contoh", level: "IB DP" },
  month: "Paket 6 pertemuan, Agustus–September 2026",
  prevAvgEngagement: 6.5,
  sessions: [{
    id: "session-1", date: "2026-09-11", subject: "Mathematics",
    shortNote: "Latihan fungsi kuadrat; soal nomor 4 masih salah tanda.",
    mood: "Fokus", topic: "Fungsi kuadrat", needsWork: "Tanda negatif",
    predictedGrade: "6", actualGrade: "7", gradeReflection: "Lebih teliti saat ujian.",
    engagementScore: 8, behaviorLabels: ["Aktif bertanya"], responseLabel: "Mandiri",
  }],
};
const reportPayload = {
  period: reportInput.month,
  student: reportInput.student,
  prevAvgEngagement: reportInput.prevAvgEngagement,
  sessions: reportInput.sessions,
};
const shortNoteInput = {
  student: reportInput.student, subjects: ["Mathematics"], topic: "Fungsi kuadrat",
  mood: "Fokus", sessionType: "regular", grade: "DP1", needsWork: "Tanda negatif",
  predictedGrade: "6", situasiNote: "Kurang tidur", engagementScore: 8,
  engagementLabels: ["Aktif"], behaviorLabels: ["Bertanya"], responseLabel: "Mandiri",
  previousNote: "Latihan diskriminan.", draftText: "Grafik masih perlu latihan.",
  style: "perluas" as const, followUps: ["Latihan membaca grafik"], durationHours: 1.5,
};
const whatsAppInput = {
  original: "Hari ini latihan grafik. PR nomor 4.", studentName: "Murid Contoh", tutorName: "Tutor Contoh",
};
const analysisInput = {
  student: reportInput.student,
  sessions: [{
    date: "2026-09-11", subjects: ["Mathematics"], shortNote: "Masih salah tanda.",
    needsWork: "Tanda negatif", mood: "Fokus", predictedGrade: "6",
  }],
};
const studyNoteInput = {
  studentName: "Murid Contoh", subjects: ["Mathematics"],
  sessions: [{ date: "2026-09-11", shortNote: "Latihan grafik.", topic: "Fungsi kuadrat", mood: "Fokus" }],
  existingNote: "Lanjutkan latihan tanda negatif.",
};
const financialInput: FinancialInsightInput = {
  month: "2026-09", monthLabel: "September 2026",
  current: {
    potensi: 500, tagihan: 400, terbayar: 300, piutang: 100, realisasi: 300,
    pengeluaran: 50, laba: 250, jam: 6, sesi: 4, muridAktif: 2,
  },
  piutangDetail: [{ nama: "Murid Contoh", nominal: 100, umurHari: 65 }],
  murid: [{ nama: "Murid Contoh", revenue: 300, sesi: 4, level: "IB DP", tarif: 75, engagementRata: 8 }],
  pengeluaranKategori: [{ kategori: "Transportasi", nominal: 50 }],
  previousAvg: { potensi: 400, realisasi: 250, laba: 200, jam: 5, sesi: 3 },
  proyeksiBulanDepan: 550, collectionRate: 75, unsharedFinalReports: 2,
  agedPiutang: 100, avgDaysToPayProxy: 12, topDebtorName: "Murid Contoh", topDebtorAmount: 100,
};
const summaryOutput = { summary: "Pemahaman fungsi kuadrat berkembang.", quote: "Terus berlatih!" };
const narrativeOutput = {
  entries: [{ id: "session-1", narrative: "Latihan fungsi kuadrat dan ketelitian tanda negatif." }],
  ...summaryOutput,
};

function respond(content: unknown, finishReason = "stop") {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({
    choices: [{ message: { role: "assistant", content }, finish_reason: finishReason }],
  }), { status: 200, headers: { "Content-Type": "application/json" } }));
}

function requestBody() {
  const init = fetchMock.mock.calls[0]?.[1];
  expect(init?.body).toBeTypeOf("string");
  return JSON.parse(init!.body as string) as {
    model: string;
    messages: Array<{ role: string; content: string }>;
  };
}

function userPayload() {
  const content = requestBody().messages[1].content;
  const start = "---USER DATA START---\n";
  const end = "\n---USER DATA END---";
  expect(content.startsWith(start)).toBe(true);
  expect(content.endsWith(end)).toBe(true);
  return JSON.parse(content.slice(start.length, -end.length));
}

beforeEach(() => {
  getSettingsMock.mockReset();
  getSettingsMock.mockResolvedValue({
    ai: { enabled: true, apiKey: "  test-only-api-key  ", model: "deepseek-chat" },
  });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe("DeepSeek request contract", () => {
  const cases = [
    { name: "narratives", run: () => generateNarratives(reportInput), output: narrativeOutput, payload: reportPayload, maxTokens: 810 },
    { name: "report summary", run: () => generateReportSummary(reportInput), output: summaryOutput, payload: reportPayload, maxTokens: 700 },
    { name: "short note", run: () => draftShortNote(shortNoteInput), output: { note: "Catatan sesi yang rapi." }, payload: shortNoteInput, maxTokens: 200 },
    { name: "WhatsApp polish", run: () => polishWhatsApp(whatsAppInput), output: { message: "Hari ini latihan grafik. PR nomor 4." }, payload: whatsAppInput, maxTokens: 200 },
    {
      name: "student analysis", run: () => analyzeStudent(analysisInput),
      output: { patterns: ["Perlu teliti dengan tanda negatif."], nextFocus: "Latihan grafik kuadrat.", encouragement: "Pemahaman berkembang." },
      payload: analysisInput, maxTokens: 400,
    },
    { name: "study note", run: () => draftStudyNote(studyNoteInput), output: { content: "**Topik:** Fungsi kuadrat." }, payload: studyNoteInput, maxTokens: 500 },
    {
      name: "financial insights", run: () => generateFinancialInsights(financialInput),
      output: { anomali: [{ level: "warning", text: "Ada piutang menua." }], rekomendasi: ["Tinjau tagihan yang tertunda."] },
      payload: {
        bulan: financialInput.monthLabel, ringkasan: financialInput.current, piutang: financialInput.piutangDetail,
        murid: financialInput.murid, pengeluaran: financialInput.pengeluaranKategori,
        rataRata3Bulan: financialInput.previousAvg, proyeksiBulanDepan: 550, kolektibilitas: "75%",
        laporanBelumDibagikan: 2, piutangMenua: 100, rataHariBayar: "12 hari",
        debiturTerbesar: "Murid Contoh", nominalDebiturTerbesar: 100,
      },
      maxTokens: 500,
    },
  ];

  it.each(cases)("sends $name using the current model and its disclosed data", async ({ run, output, payload, maxTokens }) => {
    respond(JSON.stringify(output));
    await expect(run()).resolves.toEqual(output);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://api.deepseek.com/chat/completions", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test-only-api-key" },
      signal: expect.any(AbortSignal),
    }));
    expect(requestBody()).toEqual({
      model: "deepseek-flash", thinking: { type: "disabled" }, stream: false,
      temperature: 0.7, max_tokens: maxTokens, response_format: { type: "json_object" },
      messages: [
        { role: "system", content: expect.stringContaining("JSON") },
        { role: "user", content: expect.any(String) },
      ],
    });
    expect(userPayload()).toEqual(payload);
    expect(JSON.stringify(requestBody())).not.toContain("test-only-api-key");
  });

  it.each([
    { name: "narratives", run: generateNarratives, output: narrativeOutput },
    { name: "summary", run: generateReportSummary, output: summaryOutput },
  ])("limits $name to disclosed fields even when runtime input has extra data", async ({ run, output }) => {
    const input = {
      ...reportInput,
      internalMemo: "Do not send this internal field",
      student: { ...reportInput.student, parentPhone: "private-phone", address: "private-address" },
      sessions: reportInput.sessions.map((session) => ({ ...session, billingAmount: 900, internalMemo: "private-memo" })),
    };
    respond(JSON.stringify(output));
    await run(input);
    expect(userPayload()).toEqual(reportPayload);
  });

  it.each(["deepseek-reasoner", "deepseek-v4-flash", "deepseek-v4-pro", "custom-model"])("overrides stored model %s", async (model) => {
    getSettingsMock.mockResolvedValue({ ai: { enabled: true, apiKey: "test-only-api-key", model } });
    respond(JSON.stringify(summaryOutput));
    await generateReportSummary(reportInput);
    expect(requestBody().model).toBe("deepseek-flash");
  });

  it.each([
    { enabled: false, apiKey: "test-only-api-key", error: /belum diaktifkan/ },
    { enabled: true, apiKey: undefined, error: /API Key/ },
    { enabled: true, apiKey: "", error: /API Key/ },
    { enabled: true, apiKey: " \n\t ", error: /API Key/ },
  ])("does not send a request with unavailable credentials: %j", async ({ enabled, apiKey, error }) => {
    getSettingsMock.mockResolvedValue({ ai: { enabled, apiKey, model: "deepseek-chat" } });
    await expect(generateReportSummary(reportInput)).rejects.toThrow(error);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("DeepSeek response failures", () => {
  it.each([
    ["length", /terpotong/],
    ["content_filter", /tidak dapat memproses/],
    ["insufficient_system_resource", /belum selesai/],
    ["aborted", /belum selesai/],
  ])("rejects %s even when the returned JSON is otherwise valid", async (reason, error) => {
    respond(JSON.stringify(summaryOutput), reason as string);
    await expect(generateReportSummary(reportInput)).rejects.toThrow(error);
  });

  it.each([undefined, null, "", " \n ", 42, { summary: "Object instead of text" }])("rejects absent or non-text content: %j", async (content) => {
    respond(content);
    await expect(generateReportSummary(reportInput)).rejects.toThrow(/kosong atau tidak lengkap/);
  });

  it.each(["not JSON", "```json\n{}\n```", "{", "null", "[]", "{}", '{"summary":42}'])("rejects malformed JSON or an invalid response schema: %s", async (content) => {
    respond(content);
    await expect(generateReportSummary(reportInput)).rejects.toThrow(/tidak valid/);
  });

  it("rejects a missing completion choice", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ choices: [] }), { status: 200 }));
    await expect(generateReportSummary(reportInput)).rejects.toThrow(/kosong atau tidak lengkap/);
  });

  it("rejects an HTTP error without accepting its body as generated output", async () => {
    fetchMock.mockResolvedValue(new Response("Rate limit exceeded", { status: 429 }));
    await expect(generateReportSummary(reportInput)).rejects.toThrow(/429.*Rate limit exceeded/);
  });

  it("rejects narratives for a different session", async () => {
    respond(JSON.stringify({ ...narrativeOutput, entries: [{ id: "unrequested-session", narrative: "Wrong session." }] }));
    await expect(generateNarratives(reportInput)).rejects.toThrow(/tidak valid/);
  });
});
