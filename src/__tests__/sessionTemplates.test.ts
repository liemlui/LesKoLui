import { describe, expect, it } from "vitest";
import { generateRichNote } from "../lib/sessionTemplates";

describe("generateRichNote", () => {
  it("merangkai mapel, topik, mood, follow-up, dan engagement menjadi satu catatan", () => {
    const note = generateRichNote({
      studentName: "Alya",
      sessionType: "regular",
      subjects: ["Matematika"],
      topic: "Fungsi Kuadrat",
      mood: "Semangat",
      needsWork: "operasi tanda negatif",
      engagement: { focused: true, activeAsking: true, score: 8 },
      followUps: ["Latihan soal cerita"],
    });
    expect(note).toContain("Matematika");
    expect(note).toContain("Fungsi Kuadrat");
    expect(note).toContain("Suasana sesi: Semangat");
    expect(note).toContain("Perlu perhatian: operasi tanda negatif");
    expect(note).toContain("fokus sepanjang sesi");
    expect(note).toContain("Fokus berikutnya: Latihan soal cerita");
  });

  it("tidak menyertakan engagement generik bila tidak ada sinyal", () => {
    const note = generateRichNote({
      subjects: ["Fisika"],
      topic: "Kinematika",
    });
    expect(note).toContain("Kinematika");
    expect(note).not.toContain("menjalani sesi");
  });

  it("membatasi panjang catatan maksimal 300 karakter", () => {
    const note = generateRichNote({
      subjects: ["Matematika"],
      previousNote: "x".repeat(400),
    });
    expect(note.length).toBeLessThanOrEqual(300);
  });
});
