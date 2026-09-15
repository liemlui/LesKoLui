import { describe, it, expect } from "vitest";
import {
  buildWaMessage, topicLevelHint, draftStamp,
  mergeTopics, splitTopics, mergeTopicUnits, recentTopics,
  appendSituasi, hasSituasi,
} from "../screens/captureSession/helpers";
import {
  DURATIONS, STEP_META, isValidStep, ENGAGEMENT_FLAG_META, SITUASI_CHIPS,
} from "../screens/captureSession/constants";
import { PRIMARY_ENGAGEMENT_FLAGS, SECONDARY_ENGAGEMENT_FLAGS } from "../screens/captureSession/useEngagement";

/**
 * Test untuk logika murni yang diekstrak dari `screens/CaptureSession.tsx`
 * (audit utang teknis #3). Sebelum ekstraksi, aturan-aturan ini hanya bisa diuji
 * dengan merender seluruh layar 2.500 baris — atau tidak diuji sama sekali.
 */
describe("buildWaMessage", () => {
  const student = { name: "Andi" };
  const base = {
    date: "2026-06-18", subjects: ["Mathematics AA"], durationHours: 2,
    shortNote: "Latihan integral", topic: "Integral tertentu",
  };

  it("memuat identitas sesi dan salam tutor", () => {
    const msg = buildWaMessage(student, base, [], "Ko Lui");
    expect(msg).toContain("Sesi les *Andi*");
    expect(msg).toContain("*Mapel:* Mathematics AA");
    expect(msg).toContain("*Durasi:* 2 jam");
    expect(msg).toContain("*Catatan:* Latihan integral");
    expect(msg).toContain("*Topik:* Integral tertentu");
    expect(msg).toContain("Ko Lui");
  });

  it("memakai nama pengganti bila nama tutor kosong", () => {
    expect(buildWaMessage(student, base, [], "")).toContain("Ko Lui");
  });

  it("menambahkan daftar fokus sesi berikutnya", () => {
    const msg = buildWaMessage(student, base, ["Ulangi aturan rantai", "Latihan soal"], "Ko Lui");
    expect(msg).toContain("🎯 *Fokus sesi berikutnya:*");
    expect(msg).toContain("• Ulangi aturan rantai");
    expect(msg).toContain("• Latihan soal");
  });

  it("membuang baris kosong saat tidak ada mapel/catatan/topik", () => {
    const msg = buildWaMessage(student, { ...base, subjects: [], shortNote: "", topic: undefined }, [], "Ko Lui");
    expect(msg).not.toContain("*Mapel:*");
    expect(msg).not.toContain("*Catatan:*");
    expect(msg).not.toContain("*Topik:*");
    // Tidak ada baris kosong ganda akibat filter
    expect(msg).not.toMatch(/\n\n\n/);
  });

  it("TIDAK memuat situasi pribadi (privasi ke orang tua)", () => {
    // `situasiNote` sengaja tidak ada di ringkasan WA — ini informasi kekeluargaan.
    const msg = buildWaMessage(
      student,
      { ...base, ...({ situasiNote: "habis sakit" } as Record<string, unknown>) },
      [],
      "Ko Lui",
    );
    expect(msg).not.toContain("habis sakit");
  });
});

describe("topicLevelHint", () => {
  it("memakai label grade untuk IB MYP", () => {
    expect(topicLevelHint("IB MYP", "Grade 8", "MYP 3-4")).toBe("MYP 3-4 / Grade 8-9");
  });

  it("memakai 'Kelas N' untuk kurikulum Nasional", () => {
    expect(topicLevelHint("National", "XII", "SMA 12")).toBe("Kelas XII");
  });

  it("memakai level target untuk kurikulum lain", () => {
    expect(topicLevelHint("Cambridge IGCSE", "Grade 10", "IGCSE")).toBe("IGCSE");
  });

  it("mengembalikan null bila level target tidak diketahui", () => {
    expect(topicLevelHint("Custom", undefined, null)).toBeNull();
  });
});

describe("draftStamp", () => {
  it("memformat waktu tersimpan", () => {
    expect(draftStamp("2026-09-12T20:14:00")).toMatch(/12/);
    expect(draftStamp("2026-09-12T20:14:00")).toMatch(/20[.:]14/);
  });

  it("mengembalikan string kosong untuk tanggal rusak", () => {
    // `toLocaleString` TIDAK melempar untuk tanggal rusak — ia mengembalikan
    // "Invalid Date" (bug yang ditemukan test ini).
    expect(draftStamp("bukan-tanggal")).toBe("");
    expect(draftStamp("")).toBe("");
    expect(draftStamp(undefined as unknown as string)).toBe("");
  });
});

describe("mergeTopics / splitTopics", () => {
  it("menggabungkan topik terpilih + ketikan yang belum di-commit tanpa duplikat", () => {
    expect(mergeTopics(["Integral"], "Turunan; Integral")).toBe("Integral; Turunan");
  });

  it("mengabaikan bagian kosong dan spasi berlebih", () => {
    expect(mergeTopics([], "  A ;; B  ")).toBe("A; B");
    expect(mergeTopics([], "")).toBe("");
  });

  it("bolak-balik tetap konsisten", () => {
    const merged = mergeTopics(["A", "B"], "C; A");
    expect(splitTopics(merged)).toEqual(["A", "B", "C"]);
  });

  it("splitTopics aman untuk nilai kosong", () => {
    expect(splitTopics(undefined)).toEqual([]);
    expect(splitTopics("")).toEqual([]);
  });
});

describe("mergeTopicUnits", () => {
  it("menggabungkan bab unik sesuai urutan topik", () => {
    expect(mergeTopicUnits(["A", "B", "C"], { A: "Bab 1", B: "Bab 1", C: "Bab 2" })).toBe("Bab 1; Bab 2");
  });

  it("mengabaikan topik bebas yang tidak punya bab", () => {
    expect(mergeTopicUnits(["Bebas", "A"], { A: "Bab 5" })).toBe("Bab 5");
    expect(mergeTopicUnits(["Bebas"], {})).toBe("");
  });
});

describe("recentTopics", () => {
  const sessions = [
    { topic: "Integral; Turunan" },
    { topic: "Turunan; Limit" },
    { topic: undefined },
    { topic: "Limit" },
  ];

  it("mengambil topik unik dari sesi terbaru lebih dulu", () => {
    expect(recentTopics(sessions)).toEqual(["Integral", "Turunan", "Limit"]);
  });

  it("menghormati batas jumlah", () => {
    expect(recentTopics(sessions, 2)).toEqual(["Integral", "Turunan"]);
  });

  it("mengembalikan array kosong bila tidak ada topik", () => {
    expect(recentTopics([{}, { topic: "" }])).toEqual([]);
  });
});

describe("appendSituasi / hasSituasi", () => {
  it("menambahkan frasa dengan pemisah koma", () => {
    expect(appendSituasi("", "Habis sakit")).toBe("Habis sakit");
    expect(appendSituasi("Kurang tidur", "Habis sakit")).toBe("Kurang tidur, Habis sakit");
  });

  it("tidak menambahkan frasa yang sudah ada", () => {
    expect(appendSituasi("Habis sakit", "Habis sakit")).toBe("Habis sakit");
    expect(appendSituasi("Habis sakit, Kurang tidur", "Habis sakit")).toBe("Habis sakit, Kurang tidur");
  });

  it("hasSituasi mengenali frasa di posisi mana pun", () => {
    expect(hasSituasi("A, Habis sakit, B", "Habis sakit")).toBe(true);
    expect(hasSituasi("A, B", "Habis sakit")).toBe(false);
    expect(hasSituasi("", "Habis sakit")).toBe(false);
  });

  it("tahan spasi berlebih", () => {
    expect(hasSituasi("  Habis sakit  ,  Kurang tidur ", "Kurang tidur")).toBe(true);
  });
});

describe("konstanta wizard", () => {
  it("memuat 6 langkah berurutan dengan id 1..6", () => {
    expect(STEP_META.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(STEP_META.every((s) => s.label && s.desc && s.icon)).toBe(true);
  });

  it("isValidStep menolak nilai di luar rentang dan bukan bilangan bulat", () => {
    expect(isValidStep(1)).toBe(true);
    expect(isValidStep(6)).toBe(true);
    expect(isValidStep(0)).toBe(false);
    expect(isValidStep(7)).toBe(false);
    expect(isValidStep(2.5)).toBe(false);
    expect(isValidStep("3")).toBe(false);
    expect(isValidStep(undefined)).toBe(false);
  });

  it("durasi menaik dan mencakup nilai minimum aplikasi", () => {
    expect([...DURATIONS]).toEqual([...DURATIONS].sort((a, b) => a - b));
    expect(DURATIONS[0]).toBe(1);
  });

  it("setiap indikator punya ikon, label, dan bobot — tanpa ikon kembar di dalamnya", () => {
    const entries = Object.entries(ENGAGEMENT_FLAG_META);
    expect(entries).toHaveLength(12);
    for (const [key, meta] of entries) {
      expect(meta.icon, `${key} tanpa ikon`).toBeTruthy();
      expect(meta.label, `${key} tanpa label`).toBeTruthy();
      expect(meta.delta).toMatch(/^[+−]\d$/);
    }
  });

  it("ikon indikator tidak bertabrakan dengan ikon mood (audit P2 #15)", () => {
    // Sebelumnya 🌟 dipakai mood "Semangat" DAN tag "Antusias"; 😴 dipakai mood
    // "Lelah" DAN indikator "Mengantuk".
    const moodIcons = new Set(["🔥", "📌", "🌤️", "🌙", "🧩"]);
    const collisions = Object.entries(ENGAGEMENT_FLAG_META)
      .filter(([, meta]) => moodIcons.has(meta.icon))
      .map(([key]) => key);
    expect(collisions).toEqual([]);
  });

  it("chip situasi punya label unik", () => {
    const labels = SITUASI_CHIPS.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("pembagian indikator terdepan vs sisanya", () => {
  it("enam terdepan + sisanya menutup ke-12 indikator tanpa tumpang tindih", () => {
    expect(PRIMARY_ENGAGEMENT_FLAGS).toHaveLength(6);
    expect(SECONDARY_ENGAGEMENT_FLAGS).toHaveLength(6);
    const all = [...PRIMARY_ENGAGEMENT_FLAGS, ...SECONDARY_ENGAGEMENT_FLAGS];
    expect(new Set(all).size).toBe(12);
    for (const key of all) expect(ENGAGEMENT_FLAG_META[key]).toBeDefined();
  });
});
