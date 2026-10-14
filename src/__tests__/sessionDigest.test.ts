import { describe, expect, it } from "vitest";
import type { Session } from "../db/types";
import {
  DIGEST_TEXT_MAX,
  buildReportAiInput,
  buildSessionDigest,
  compactSessionText,
} from "../lib/reportSessionScope";

/**
 * Ringkasan sesi untuk panggilan AI laporan (permintaan pemilik 2026-10-15).
 *
 * **Dua masalah yang ditutup berkas ini:**
 *
 * 1. **Muatan panggilan AI tumbuh mengikuti isi catatan.** Sebelumnya
 *    `buildReportAiInput` mengirim seluruh kolom setiap sesi (catatan lengkap,
 *    mood, topik, area perhatian, prediksi & nilai akhir, refleksi nilai, skor,
 *    label perilaku, label respons). Terukur **±620–1.230 karakter per sesi**,
 *    sehingga laporan dengan banyak sesi melewati batas konteks dan panggilan AI
 *    gagal — persis keluhan *"perkuat ai sebagian bisa terlalu penuh konteks"*.
 * 2. **Narasi sesi tidak pernah ikut ke laporan.** Yang dikirim hanya `shortNote`,
 *    padahal narasi ditulis lebih dulu di alur Catat Sesi dan justru lebih rapi.
 *    Jadi pekerjaan tutor menulis narasi setiap hari tidak terpakai laporan.
 *
 * Invarian yang dijaga: **tidak ada informasi yang dikirim dua kali.** Isi inti
 * sesi hanya satu (narasi bila ada, kalau tidak catatan), dan angka yang sudah
 * menjadi kolom data tidak diulang ke dalam kalimat.
 */

function sesi(overrides: Partial<Session> = {}): Session {
  return {
    id: "s-1",
    studentId: "student-1",
    date: "2026-09-10",
    durationHours: 1.5,
    subjects: ["Matematika"],
    shortNote: "Latihan soal fungsi kuadrat, nomor 4 dan 5 masih salah tanda.",
    status: "DONE",
    rateSnapshot: 100_000,
    cost: 150_000,
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("compactSessionText — memadatkan tanpa merusak kalimat", () => {
  it("merapikan spasi berlebih dan baris baru", () => {
    expect(compactSessionText("  Latihan   aljabar\n\nnomor 4  ")).toBe("Latihan aljabar nomor 4");
  });

  it("teks pendek dibiarkan utuh tanpa tanda potong", () => {
    expect(compactSessionText("Latihan aljabar")).toBe("Latihan aljabar");
  });

  it("teks panjang dipotong di BATAS KATA, bukan di tengah kata", () => {
    const hasil = compactSessionText("kata ".repeat(100), 50);
    expect(hasil.endsWith("…")).toBe(true);
    // Tidak ada kata yang terbelah: sebelum "…" selalu ada kata utuh.
    expect(hasil.slice(0, -1).trimEnd().endsWith("kata")).toBe(true);
    expect(hasil.length).toBeLessThanOrEqual(51);
  });

  it("teks tanpa spasi tetap dipotong dan diberi tanda, bukan dipalsukan utuh", () => {
    const hasil = compactSessionText("a".repeat(400), 50);
    expect(hasil.length).toBe(51);
    expect(hasil.endsWith("…")).toBe(true);
  });

  it("teks kosong atau undefined tidak pernah melempar", () => {
    expect(compactSessionText(undefined)).toBe("");
    expect(compactSessionText("   ")).toBe("");
  });
});

describe("buildSessionDigest — satu inti, bukan dua", () => {
  it("memakai NARASI bila ada, dan TIDAK ikut mengirim catatan aslinya", () => {
    const digest = buildSessionDigest(sesi({ narrative: "Narasi sesi yang rapi", shortNote: "catatan mentah" }));
    expect(digest.inti).toBe("Narasi sesi yang rapi");
    // Catatan mentahnya tidak muncul di mana pun — inilah pengulangan yang dihindari.
    expect(JSON.stringify(digest)).not.toContain("catatan mentah");
  });

  it("jatuh ke catatan bila narasinya belum ada", () => {
    const digest = buildSessionDigest(sesi({ narrative: undefined }));
    expect(digest.inti).toContain("fungsi kuadrat");
  });

  it("narasi yang hanya berisi spasi dianggap belum ada", () => {
    const digest = buildSessionDigest(sesi({ narrative: "   " }));
    expect(digest.inti).toContain("fungsi kuadrat");
  });

  it("panjang inti selalu dibatasi", () => {
    const digest = buildSessionDigest(sesi({ narrative: "x".repeat(5_000) }));
    expect((digest.inti ?? "").length).toBeLessThanOrEqual(DIGEST_TEXT_MAX + 1);
  });

  it("kolom kosong tidak dikirim sebagai kunci tanpa isi", () => {
    const digest = buildSessionDigest(sesi({ narrative: "Inti", topic: "   " }));
    expect(digest.topic).toBeUndefined();
    expect("topic" in digest).toBe(true);
    expect(digest.topic).not.toBe("");
  });
});

describe("buildReportAiInput — muatan yang dikirim ke AI", () => {
  function muatan(jumlah: number, panjangCatatan: number) {
    const sessions = Array.from({ length: jumlah }, (_, index) => sesi({
      id: `s-${index + 1}`,
      shortNote: "c".repeat(panjangCatatan),
      narrative: undefined,
      mood: "Semangat",
      topic: "Fungsi kuadrat",
      needsWork: "Ketelitian tanda negatif",
      predictedGrade: "6",
      actualGrade: "7",
      gradeReflection: "Lebih teliti dari sebelumnya",
      engagement: { score: 8 },
    }));
    return { sessions, input: buildReportAiInput({ name: "Murid", level: "SMA" }, "September 2026", sessions) };
  }

  it("hanya mengirim kolom ringkas, bukan seluruh kolom sesi", () => {
    const { input } = muatan(3, 400);
    const baris = input.sessions[0] as unknown as Record<string, unknown>;
    for (const kolomBerat of ["mood", "needsWork", "predictedGrade", "actualGrade", "gradeReflection", "behaviorLabels", "responseLabel"]) {
      expect(baris[kolomBerat]).toBeUndefined();
    }
    // Yang tetap ada: identitas, mapel, topik, inti, dan skor fokus sebagai angka.
    expect(baris.id).toBe("s-1");
    expect(baris.subject).toBe("Matematika");
    expect(baris.topic).toBe("Fungsi kuadrat");
    expect(baris.engagementScore).toBe(8);
  });

  it("muatannya jauh lebih kecil daripada kolom mentah — dan tidak tumbuh melewati batas", () => {
    const jumlahSesi = 40;
    const { sessions, input } = muatan(jumlahSesi, 800);
    const muatanBaru = JSON.stringify(input).length;
    // Patokan muatan LAMA: seluruh kolom setiap sesi (yang terukur 48.661 char).
    const muatanLama = JSON.stringify({
      period: "September 2026",
      student: { name: "Murid", level: "SMA" },
      sessions: sessions.map((s) => ({
        id: s.id, date: s.date, subject: s.subjects.join(", "), shortNote: s.shortNote,
        mood: s.mood, topic: s.topic, needsWork: s.needsWork, predictedGrade: s.predictedGrade,
        actualGrade: s.actualGrade, gradeReflection: s.gradeReflection,
        engagementScore: s.engagement?.score,
      })),
    }).length;

    expect(muatanLama).toBeGreaterThan(40_000);
    // Inti tiap sesi dipotong ke DIGEST_TEXT_MAX, jadi muatannya terikat.
    expect(muatanBaru).toBeLessThan(muatanLama / 2);
    expect(muatanBaru / jumlahSesi).toBeLessThan(400);

    console.log(`\nmuatan 40 sesi × catatan 800 char: lama ${muatanLama} char → sekarang ${muatanBaru} char `
      + `(${Math.round((1 - muatanBaru / muatanLama) * 100)}% lebih kecil, ${Math.round(muatanBaru / jumlahSesi)} char/sesi)\n`);
  });

  it("narasi yang sudah ada ikut terkirim sebagai inti sesi", () => {
    const sessions = [sesi({ narrative: "Narasi hasil kerja tutor", shortNote: "catatan mentah" })];
    const input = buildReportAiInput({ name: "Murid", level: "SMA" }, "September 2026", sessions);
    expect(input.sessions[0].shortNote).toBe("Narasi hasil kerja tutor");
    expect(JSON.stringify(input)).not.toContain("catatan mentah");
  });
});
