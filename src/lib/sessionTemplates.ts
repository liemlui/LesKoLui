export type SessionType =
  | "regular"
  | "homework"
  | "exam_prep"
  | "project"
  | "brainstorm"
  | "trial"
  | "catch_up";

export const SESSION_TYPE_OPTIONS: { value: SessionType; label: string; icon: string; desc: string }[] = [
  { value: "regular",    label: "Sesi Reguler",      icon: "📚", desc: "Bahas materi & latihan soal" },
  { value: "homework",   label: "PR / Latihan",      icon: "📝", desc: "Fokus mengerjakan tugas" },
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
    case "homework":
      return `Kerjakan PR${s}${t}. Tidak ada materi baru hari ini.`;
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
