/**
 * Fungsi murni layar "Catat Sesi".
 *
 * Dipisah dari `screens/CaptureSession.tsx` supaya bisa diuji tanpa merender
 * layar (audit: toolchain ini belum punya React Testing Library, jadi logika
 * yang bisa diuji HARUS berada di luar komponen).
 */
import type { Student } from "../../db/types";
import { dayLabel } from "../../lib/format";
import { getStudentGradeLabel } from "../../lib/ibTopics";

/** Bagian sesi yang dipakai untuk menyusun pesan WhatsApp ke orang tua. */
export interface WaSessionSummary {
  date: string;
  subjects: string[];
  durationHours: number;
  shortNote: string;
  topic?: string;
}

/**
 * Susun pesan WhatsApp ke orang tua.
 *
 * Sengaja TIDAK memuat `situasiNote` (konteks pribadi/kekeluargaan) maupun
 * `needsWork` — pesan ke orang tua adalah ringkasan sesi, bukan catatan guru.
 */
export function buildWaMessage(
  student: Pick<Student, "name">,
  session: WaSessionSummary,
  followUps: string[],
  tutorName: string,
): string {
  const lines: string[] = [
    `Sesi les *${student.name}* (${dayLabel(session.date)}) sudah selesai. 📚`,
    ``,
    session.subjects.length > 0 ? `*Mapel:* ${session.subjects.join(", ")}` : "",
    `*Durasi:* ${session.durationHours} jam`,
    session.shortNote ? `*Catatan:* ${session.shortNote}` : "",
    session.topic ? `*Topik:* ${session.topic}` : "",
  ].filter((l) => l !== "");

  if (followUps.length > 0) {
    lines.push(``, `🎯 *Fokus sesi berikutnya:*`);
    followUps.forEach((f) => lines.push(`• ${f}`));
  }

  lines.push(``, `Terima kasih, salam 🙏`, tutorName || "Ko Lui");
  return lines.join("\n");
}

/**
 * Label jenjang yang sedang diprioritaskan pada pencarian topik (audit P0).
 * Dipakai agar tutor tahu MENGAPA daftar topiknya terbatas — sebelumnya
 * pembatasan ini tidak terlihat sama sekali.
 */
export function topicLevelHint(
  curriculum: string | undefined,
  grade: string | undefined,
  targetLevel: string | null,
): string | null {
  if (!targetLevel) return null;
  if (curriculum === "IB MYP") return getStudentGradeLabel(grade) ?? targetLevel;
  if (curriculum === "National") return grade ? `Kelas ${grade}` : targetLevel;
  return targetLevel;
}

/**
 * "12 Sep 20.14" — penanda waktu draf terakhir disimpan.
 *
 * Mengembalikan string KOSONG bila tanggalnya tidak bisa dibaca. Penting: versi
 * lama hanya memasang `try/catch`, padahal `toLocaleString` TIDAK melempar untuk
 * tanggal rusak — ia mengembalikan "Invalid Date", sehingga spanduk draf bisa
 * berbunyi "Draf ini tersimpan di perangkat pada Invalid Date". Ditemukan oleh
 * test `captureSessionHelpers.test.ts`.
 */
export function draftStamp(iso: string): string {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return "";
  return new Date(time).toLocaleString("id-ID", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

/**
 * Gabungkan topik terpilih (chip) + teks pencarian yang belum di-commit, lalu
 * buang duplikat. Topik disimpan sebagai satu string dipisah `"; "` — inilah
 * satu-satunya tempat aturan itu ditentukan, supaya pemulihan draf dan
 * penyimpanan sesi tidak pernah berbeda tafsir.
 */
export function mergeTopics(selected: readonly string[], pendingInput: string): string {
  const out = [...selected];
  for (const part of pendingInput.split(";").map((p) => p.trim()).filter(Boolean)) {
    if (!out.includes(part)) out.push(part);
  }
  return out.join("; ");
}

/** Kebalikan `mergeTopics` — dipakai saat memulihkan draf. */
export function splitTopics(topic: string | undefined): string[] {
  return (topic ?? "").split(";").map((t) => t.trim()).filter(Boolean);
}

/**
 * Bab untuk sebuah sesi: gabungan bab topik terpilih, tanpa duplikat, urut
 * kemunculan. Topik yang diketik bebas tidak punya bab → tidak menyumbang apa pun.
 */
export function mergeTopicUnits(topics: readonly string[], unitsByTopic: Record<string, string>): string {
  const units: string[] = [];
  for (const t of topics) {
    const u = unitsByTopic[t];
    if (u && !units.includes(u)) units.push(u);
  }
  return units.join("; ");
}

/**
 * Topik unik dari beberapa sesi terakhir, untuk chip "Topik sesi lalu"
 * (audit P1 #8). Sesi dianggap terurut dari yang terbaru.
 */
export function recentTopics(
  sessions: ReadonlyArray<{ topic?: string }>,
  limit = 6,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of sessions) {
    for (const t of splitTopics(s.topic)) {
      if (seen.has(t)) continue;
      seen.add(t);
      out.push(t);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/**
 * Tambahkan frasa chip situasi ke kolom bebas tanpa menduplikasi.
 * Dipisah koma karena kolom itu memang dibaca sebagai daftar frasa.
 */
export function appendSituasi(current: string, label: string): string {
  const parts = current.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.includes(label)) return current;
  return [...parts, label].join(", ");
}

/** Apakah sebuah chip situasi sudah aktif di kolom bebas? */
export function hasSituasi(current: string, label: string): boolean {
  return current.split(",").map((s) => s.trim()).includes(label);
}
