export type SessionType =
  | "regular"
  | "exam_prep"
  | "project"
  | "brainstorm"
  | "trial"
  | "catch_up";

export const SESSION_TYPE_OPTIONS: { value: SessionType; label: string; icon: string; desc: string }[] = [
  { value: "regular",    label: "Sesi Reguler",      icon: "📚", desc: "Bahas materi & latihan soal" },
  { value: "exam_prep",  label: "Persiapan Ujian",   icon: "📋", desc: "Latihan soal past paper & review" },
  { value: "project",    label: "Proyek / IA",       icon: "🛠️", desc: "Kerja proyek, IA, atau EE" },
  { value: "brainstorm", label: "Brainstorm",        icon: "💡", desc: "Diskusi ide, analisis topik" },
  { value: "catch_up",   label: "Remedial",          icon: "🔄", desc: "Ulang materi yang belum dipahami" },
  { value: "trial",      label: "Sesi Percobaan",    icon: "🌟", desc: "Pertemuan pertama / percobaan" },
];

export interface EngagementNarrativeInput {
  prepared?: boolean;
  focused?: boolean;
  activeAsking?: boolean;
  quickLearner?: boolean;
  drowsy?: boolean;
  playingPhone?: boolean;
  needsRepetition?: boolean;
  hwMissed?: boolean;
  late?: boolean;
  bathroomBreaks?: boolean;
  score?: number;
}

export function generateEngagementNarrative(e: EngagementNarrativeInput, name?: string): string {
  const subject = name ?? "Murid";
  const positives: string[] = [];
  const negatives: string[] = [];

  if (e.prepared) positives.push("datang siap dengan materi");
  if (e.focused) positives.push("fokus sepanjang sesi");
  if (e.activeAsking) positives.push("aktif bertanya");
  if (e.quickLearner) positives.push("cepat memahami konsep baru");

  if (e.hwMissed) negatives.push("tidak mengerjakan PR");
  if (e.needsRepetition) negatives.push("perlu penjelasan berulang");
  if (e.drowsy) negatives.push("tampak mengantuk");
  if (e.playingPhone) negatives.push("sempat main HP");
  if (e.late) negatives.push("datang terlambat");
  if (e.bathroomBreaks) negatives.push("sering ke toilet");

  const score = e.score ?? 5;

  if (positives.length === 0 && negatives.length === 0) {
    if (score >= 7) return `${subject} menjalani sesi dengan baik hari ini.`;
    if (score <= 4) return `${subject} kurang optimal hari ini. Perlu perhatian lebih.`;
    return `${subject} menjalani sesi seperti biasa.`;
  }

  const parts: string[] = [];
  if (positives.length > 0) {
    parts.push(`${subject} ${positives.join(", ")}`);
  }
  if (negatives.length > 0) {
    const neg = negatives.join(", ");
    if (positives.length > 0) parts.push(`namun ${neg}`);
    else parts.push(`${subject} ${neg}`);
  }

  let narrative = parts.join(", ") + ".";
  narrative = narrative.charAt(0).toUpperCase() + narrative.slice(1);

  if (score >= 9) narrative += " Performa sangat baik!";
  else if (score <= 3) narrative += " Perlu intervensi dan motivasi ekstra.";

  return narrative;
}

export function generateNote(
  type: SessionType,
  subject?: string,
  topic?: string,
): string {
  const s = subject ? ` ${subject}` : "";
  const t = topic ? ` — ${topic}` : "";
  switch (type) {
    case "regular":
      return `Bahas materi${s}${t}.`;
    case "exam_prep":
      return `Persiapan ujian${s}${t}. Latihan soal past paper dan review konsep penting.`;
    case "project":
      return `Kerja proyek / IA${s}${t}. Review progress dan perencanaan langkah berikutnya.`;
    case "brainstorm":
      return `Sesi brainstorm${s}${t}. Diskusi ide dan analisis mendalam.`;
    case "catch_up":
      return `Remedial${s}${t}. Review konsep yang masih belum dipahami.`;
    case "trial":
      return `Sesi percobaan. Perkenalan dan penilaian kemampuan awal${s}.`;
    default:
      return "";
  }
}

export interface RichNoteInput {
  studentName?: string;
  sessionType?: SessionType;
  subjects?: string[];
  topic?: string;
  mood?: string;
  needsWork?: string;
  behaviorLabels?: string[];
  responseLabel?: string;
  previousNote?: string;
  followUps?: string[];
  engagement?: EngagementNarrativeInput;
}

/**
 * Rangkai semua data wizard menjadi catatan singkat 2–4 kalimat TANPA memanggil AI.
 * Dipakai tombol "⚡ Rangkum Cepat" di Step Catatan — gratis dan tetap spesifik.
 */
export function generateRichNote(input: RichNoteInput): string {
  const subjects = (input.subjects ?? []).map((s) => s.trim()).filter(Boolean);
  const subjectLabel = subjects.join(" & ") || "materi";
  const parts: string[] = [];

  if (input.sessionType) {
    parts.push(generateNote(input.sessionType, subjects[0], input.topic || undefined));
  } else {
    parts.push(`Bahas ${subjectLabel}${input.topic ? ` — ${input.topic}` : ""}.`);
  }

  const eng = input.engagement;
  const hasEngagement = eng && (
    eng.prepared || eng.focused || eng.activeAsking || eng.quickLearner ||
    eng.drowsy || eng.playingPhone || eng.needsRepetition || eng.hwMissed ||
    eng.late || eng.bathroomBreaks
  );
  if (hasEngagement) {
    parts.push(generateEngagementNarrative(eng, input.studentName));
  }

  if (input.mood?.trim()) parts.push(`Suasana sesi: ${input.mood.trim()}.`);
  if (input.responseLabel?.trim()) parts.push(`Respons akademik: ${input.responseLabel.trim()}.`);
  if (input.behaviorLabels && input.behaviorLabels.length > 0) {
    parts.push(`Kondisi belajar: ${input.behaviorLabels.join(", ")}.`);
  }
  if (input.needsWork?.trim()) parts.push(`Perlu perhatian: ${input.needsWork.trim()}.`);
  if (input.previousNote?.trim()) parts.push(`Melanjutkan sesi lalu: ${input.previousNote.trim()}.`);
  if (input.followUps && input.followUps.length > 0) {
    parts.push(`Fokus berikutnya: ${input.followUps.join("; ")}.`);
  }

  const note = parts.join(" ").replace(/\s{2,}/g, " ").trim();
  return note.length > 300 ? note.slice(0, 297).trimEnd() + "…" : note;
}

export interface AutoStudyNoteSession {
  date: string;
  subjects: string[];
  topic?: string;
  needsWork?: string;
  shortNote?: string;
  mood?: string;
}

/**
 * Rakit catatan belajar berkelanjutan dari sesi terakhir secara otomatis (gratis).
 * Output memakai markdown ringan yang dirender SimpleMarkdown.
 */
export function buildAutoStudyNote(sessions: AutoStudyNoteSession[]): string {
  const recent = [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  if (recent.length === 0) return "";

  const subjects = [...new Set(recent.flatMap((s) => s.subjects.map((x) => x.trim()).filter(Boolean)))];
  const topics = [...new Set(recent.map((s) => s.topic?.trim()).filter(Boolean) as string[])];
  const needs = [...new Set(recent.map((s) => s.needsWork?.trim()).filter(Boolean) as string[])];
  const latest = recent[0];

  const lines: string[] = [];
  lines.push(`📚 **Topik:** ${topics.length > 0 ? topics.slice(0, 4).join(", ") : subjects.join(", ") || "materi terakhir"}.`);
  if (latest.shortNote?.trim()) lines.push(`📝 **Catatan terakhir:** ${latest.shortNote.trim()}.`);
  if (needs.length > 0) lines.push(`⚠️ **Perlu Perhatian:** ${needs.slice(0, 3).join("; ")}.`);
  lines.push(`🎯 **Rencana:** lanjutkan pembahasan ${topics[0] ?? subjects[0] ?? "materi terakhir"} dan perkuat area yang masih perlu perhatian.`);

  return lines.join("\n");
}
