import { describe, it, expect } from "vitest";
import { studentConclusion } from "../lib/studentConclusion";
import type { ConclusionLog } from "../lib/studentConclusion";

function log(partial: Partial<ConclusionLog> = {}): ConclusionLog {
  return { score: 7, observed: true, ...partial };
}

/** Input dasar yang sehat — tiap tes hanya menimpa bagian yang diuji. */
function base(over: Partial<Parameters<typeof studentConclusion>[0]> = {}) {
  return {
    firstName: "Bella",
    avgScore: 8,
    counted: 12,
    total: 12,
    trend: null as string | null,
    recentCount: 15,
    log: [log(), log(), log()],
    hasTopicNotes: true,
    ...over,
  };
}

describe("kesimpulan murid — belum ada data", () => {
  it("mengatakan apa adanya bila belum ada sesi sama sekali", () => {
    const c = studentConclusion(base({ avgScore: null, counted: 0, total: 0, log: [] }));
    expect(c.behaviour).toBe("belum-ada-data");
    expect(c.headline).toContain("Belum ada data pengamatan");
    expect(c.details).toEqual([]);
    expect(c.caveat).toContain("Belum ada sesi");
  });

  it("membedakan 'belum ada sesi' dari 'ada sesi tanpa pengamatan'", () => {
    const c = studentConclusion(base({ avgScore: null, counted: 0, total: 5, log: [] }));
    expect(c.behaviour).toBe("belum-ada-data");
    expect(c.caveat).toContain("Ada 5 sesi");
    expect(c.caveat).toContain("tidak satu pun mencatat pengamatan");
  });
});

describe("kesimpulan murid — kesimpulan tentang muridnya", () => {
  it("menyebut murid fokus untuk rata-rata tinggi", () => {
    const c = studentConclusion(base());
    expect(c.behaviour).toBe("baik");
    expect(c.headline).toContain("Bella");
    expect(c.headline).toContain("murid yang fokus saat les");
  });

  it("menyebut fokus naik-turun untuk rata-rata menengah", () => {
    expect(studentConclusion(base({ avgScore: 6 })).behaviour).toBe("cukup");
    expect(studentConclusion(base({ avgScore: 6 })).headline).toContain("naik-turun");
  });

  it("menyebut perlu perhatian untuk rata-rata rendah", () => {
    const c = studentConclusion(base({ avgScore: 3 }));
    expect(c.behaviour).toBe("perhatian");
    expect(c.headline).toContain("perlu perhatian ekstra");
  });

  it("memakai ambang yang sama dengan label skor bersama", () => {
    expect(studentConclusion(base({ avgScore: 7 })).behaviour).toBe("baik");
    expect(studentConclusion(base({ avgScore: 4 })).behaviour).toBe("perhatian");
    expect(studentConclusion(base({ avgScore: 5 })).behaviour).toBe("cukup");
  });
});

describe("kesimpulan murid — penyebutnya benar (inti K6)", () => {
  it("menyebut penyebut rata-rata terpisah dari penyebut tren", () => {
    // Rata-rata dihitung dari SELURUH sesi berdata (12); tren hanya dari sesi
    // terbaru (15 punya skor). Versi lama menempelkan keduanya pada satu angka.
    const c = studentConclusion(base({ avgScore: 8, counted: 12, recentCount: 15, trend: "up" }));
    expect(c.headline).toContain("dari 12 sesi berdata");
    expect(c.headline).toContain("15 sesi terakhir");
    expect(c.headline).toContain("sedang membaik");
  });

  it("menyebut tren stabil tanpa embel-embel 'sesi terakhir'", () => {
    const c = studentConclusion(base({ trend: "stable" }));
    expect(c.headline).toContain("trennya stabil");
    expect(c.headline).not.toContain("sesi terakhir");
  });

  it("menyebut penurunan bila trennya menurun", () => {
    expect(studentConclusion(base({ trend: "down" })).headline).toContain("cenderung menurun");
  });

  it("setiap angka dalam daftar pendukung punya penyebut", () => {
    const c = studentConclusion(base({
      log: [log({ playingPhone: true }), log({ playingPhone: true }), log({ prepared: true }), log()],
      counted: 4,
      topResponse: { label: "Miskonsepsi", count: 2 },
      responseAnswered: 6,
    }));
    // Hanya butir yang MENYEBUT ANGKA yang wajib punya penyebut. Kalimat seperti
    // "Tiap sesi punya catatan topik" menyatakan fakta, bukan besaran — jadi ia
    // sengaja tidak diwajibkan memuat penyebut.
    const numeric = c.details.filter((d) => /\d/.test(d));
    expect(numeric.length).toBeGreaterThan(0);
    for (const d of numeric) {
      expect(d).toMatch(/dari \d+/);
    }
  });
});

describe("kesimpulan murid — pola perilaku", () => {
  it("menyebut sinyal yang paling sering menonjol", () => {
    const c = studentConclusion(base({
      counted: 4,
      log: [log({ playingPhone: true }), log({ playingPhone: true }), log({ playingPhone: true }), log()],
    }));
    expect(c.details.join(" ")).toContain("main HP");
    expect(c.details.join(" ")).toContain("3 dari 4 sesi berdata (75%)");
  });

  it("tidak menyebut pola yang tidak pernah muncul", () => {
    const c = studentConclusion(base({ log: [log({ prepared: true })], counted: 1 }));
    const all = c.details.join(" ");
    expect(all).not.toContain("main HP");
    expect(all).not.toContain("mengantuk");
  });

  it("menyebut sisi positif bila itu yang menonjol", () => {
    const c = studentConclusion(base({
      counted: 3,
      log: [log({ prepared: true }), log({ prepared: true }), log()],
    }));
    expect(c.details.join(" ")).toContain("datang sudah siap");
  });

  it("bekerja tanpa sinyal sama sekali", () => {
    const c = studentConclusion(base({ log: [log(), log(), log()] }));
    expect(c.behaviour).toBe("baik");
    expect(c.details.some((d) => d.includes("Yang paling sering muncul"))).toBe(false);
  });
});

describe("kesimpulan murid — batas kejujuran", () => {
  it("menyebut data tipis bila kurang dari tiga sesi", () => {
    const c = studentConclusion(base({ counted: 2, total: 2, log: [log(), log()] }));
    expect(c.caveat).toContain("masih tipis");
  });

  it("tidak menyebut data tipis bila sudah cukup", () => {
    const c = studentConclusion(base({ counted: 12, total: 12 }));
    expect(c.caveat).toBeUndefined();
  });

  it("menyebut sesi tanpa pengamatan yang tidak ikut dihitung", () => {
    const c = studentConclusion(base({ counted: 8, total: 20 }));
    expect(c.caveat).toContain("12 dari 20 sesi tercatat tanpa pengamatan kondisi");
  });

  it("mengakui belum ada catatan topik per sesi", () => {
    const c = studentConclusion(base({ hasTopicNotes: false }));
    expect(c.caveat).toContain("Belum ada catatan topik per sesi");
  });
});
