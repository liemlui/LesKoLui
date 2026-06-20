import { getSettings } from "../db/repos";

export interface AiInput {
  student: { name: string; level: string };
  month: string;
  sessions: Array<{
    id: string; date: string; subject: string; shortNote: string;
    mood?: string; topic?: string; needsWork?: string; predictedGrade?: string;
  }>;
}

export interface AiOutput {
  entries: Array<{ id: string; narrative: string }>;
  summary: string;
  teacherNote?: string;
  quote?: string;
}

const SYSTEM_PROMPT = `You are writing monthly progress notes for parents on behalf of a private IB tutor in Indonesia.
Write in Bahasa Indonesia. Voice: warm but honest, specific, and formative — describe what the
student actually did, how their understanding is progressing, and clearly what needs improvement.
Mix in IB terminology naturally (Paper 1/2/3, HL/SL, case study, IA, EE) when relevant.
Keep each "narrative" to about 45–75 words, parent-appropriate, never harsh but never vague.
Expand the tutor's short note and chips into a full sentence-level narrative; do not invent facts
not implied by the note. The "summary" is one short paragraph summarizing the month across subjects.
The "teacherNote" is 2–3 sentences on overall progress and next focus. The "quote" is one short
encouraging line for the student. Return STRICT JSON only, matching the requested schema, no markdown.`;

export async function generateNarratives(input: AiInput): Promise<AiOutput> {
  const s = await getSettings();
  if (!s.ai.enabled) throw new Error("AI belum diaktifkan di Pengaturan.");

  // Priority: API key langsung > Worker URL
  const apiKey = s.ai.apiKey;
  const workerUrl = s.ai.workerUrl;

  let url: string;
  let headers: Record<string, string>;
  let body: any;

  if (apiKey) {
    // Panggil DeepSeek langsung dari browser
    url = "https://api.deepseek.com/chat/completions";
    headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    };
    body = {
      model: s.ai.model || "deepseek-chat",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(input) },
      ],
    };
  } else if (workerUrl) {
    // Lewat Cloudflare Worker proxy
    url = workerUrl;
    headers = { "Content-Type": "application/json" };
    body = {
      model: s.ai.model || "deepseek-chat",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(input) },
      ],
    };
  } else {
    throw new Error("Isi API Key atau Worker URL di Pengaturan.");
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AI error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(text) as AiOutput;
  } catch {
    throw new Error("Respons AI tidak valid. Coba lagi.");
  }
}
