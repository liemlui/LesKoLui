/**
 * Tabel Prediksi vs Nilai Akhir (G3-06 butir 4).
 *
 * Dua hal yang diperiksa:
 * 1. `barisPerbandingan` — aturan penyaringan dan penyusunan baris (tanpa DOM).
 * 2. `PerbandinganNilai` — markup-nya, termasuk keadaan kosong.
 *
 * Yang TIDAK diklaim di sini: interaksi (paginasi) dan tampilan sesungguhnya.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PerbandinganNilai, { barisPerbandingan } from "../screens/studentDetail/PerbandinganNilai";
import { gradeDelta } from "../template/layouts";
import type { Session } from "../db/types";

function sess(over: Partial<Session> & { id: string }): Session {
  return {
    studentId: "s1",
    date: "2026-06-01",
    durationHours: 2,
    status: "DONE",
    subjects: ["Mathematics"],
    cost: 600_000,
    rateSnapshot: 300_000,
    createdAt: "2026-06-01T00:00:00.000Z",
    ...over,
  } as unknown as Session;
}

describe("barisPerbandingan — aturan penyaringan", () => {
  it("hanya memuat sesi selesai", () => {
    const rows = barisPerbandingan([
      sess({ id: "a", predictedGrade: "6", actualGrade: "7" }),
      sess({ id: "b", status: "SCHEDULED", predictedGrade: "6", actualGrade: "7" }),
      sess({ id: "c", status: "CANCELLED", predictedGrade: "6", actualGrade: "7" }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(["a"]);
  });

  it("memuat sesi yang hanya punya prediksi ATAU hanya nilai akhir", () => {
    const rows = barisPerbandingan([
      sess({ id: "a", date: "2026-06-03", predictedGrade: "6" }),
      sess({ id: "b", date: "2026-06-02", actualGrade: "7" }),
    ]);
    expect(rows).toHaveLength(2);
    // Tanpa keduanya, tidak bisa dibandingkan.
    expect(rows.every((r) => r.arah === undefined)).toBe(true);
  });

  it("membuang sesi tanpa prediksi maupun nilai akhir", () => {
    expect(barisPerbandingan([sess({ id: "a", topic: "Vektor" })])).toEqual([]);
  });

  it("membuang nilai yang hanya berisi spasi", () => {
    expect(barisPerbandingan([sess({ id: "a", predictedGrade: "   ", actualGrade: "" })])).toEqual([]);
  });

  it("mengurutkan dari yang terbaru", () => {
    const rows = barisPerbandingan([
      sess({ id: "lama", date: "2026-05-01", predictedGrade: "5", actualGrade: "5" }),
      sess({ id: "baru", date: "2026-06-20", predictedGrade: "6", actualGrade: "7" }),
      sess({ id: "tengah", date: "2026-06-01", predictedGrade: "6", actualGrade: "6" }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(["baru", "tengah", "lama"]);
  });
});

describe("barisPerbandingan — TIDAK boleh berbeda angka dengan laporan bulanan", () => {
  it("memakai gradeDelta yang sama persis untuk selisih numerik", () => {
    const rows = barisPerbandingan([
      sess({ id: "naik", predictedGrade: "6", actualGrade: "7" }),
      sess({ id: "turun", predictedGrade: "7", actualGrade: "5" }),
      sess({ id: "sama", predictedGrade: "6", actualGrade: "6" }),
    ]);
    for (const row of rows) {
      // Kalau suatu saat gradeDelta berubah, tes ini gagal — dan itu memang
      // tujuannya: layar murid dan laporan bulanan memakai satu rumus.
      expect(row.delta).toBe(gradeDelta(row.predicted, row.actual));
    }
    expect(rows.find((r) => r.id === "naik")!.delta).toBe("+1");
    expect(rows.find((r) => r.id === "turun")!.delta).toBe("-2");
    expect(rows.find((r) => r.id === "sama")!.delta).toBe("sama");
  });

  it("menandai arah naik, turun, dan sama", () => {
    const rows = barisPerbandingan([
      sess({ id: "naik", predictedGrade: "6", actualGrade: "7" }),
      sess({ id: "turun", predictedGrade: "7", actualGrade: "5" }),
      sess({ id: "sama", predictedGrade: "6", actualGrade: "6" }),
    ]);
    expect(rows.find((r) => r.id === "naik")!.arah).toBe("naik");
    expect(rows.find((r) => r.id === "turun")!.arah).toBe("turun");
    expect(rows.find((r) => r.id === "sama")!.arah).toBe("sama");
  });

  it("menangani skala huruf lewat isGradeLower, bukan diam saja", () => {
    // gradeDelta mengembalikan undefined untuk huruf; isGradeLower yang menangkapnya.
    expect(gradeDelta("B", "A")).toBeUndefined();
    const rows = barisPerbandingan([
      sess({ id: "huruf-turun", predictedGrade: "A", actualGrade: "B" }),
      sess({ id: "huruf-naik", predictedGrade: "B", actualGrade: "A" }),
    ]);
    expect(rows.find((r) => r.id === "huruf-turun")!.turun).toBe(true);
    expect(rows.find((r) => r.id === "huruf-turun")!.arah).toBe("turun");
    expect(rows.find((r) => r.id === "huruf-naik")!.turun).toBe(false);
    // Tanpa selisih angka, karena skalanya tidak numerik.
    expect(rows.find((r) => r.id === "huruf-turun")!.delta).toBeUndefined();
  });

  it("tidak menyimpulkan arah apa pun bila skala campur", () => {
    const rows = barisPerbandingan([sess({ id: "campur", predictedGrade: "80", actualGrade: "B" })]);
    expect(rows[0].turun).toBe(false);
    expect(rows[0].arah).toBeUndefined();
  });
});

describe("barisPerbandingan — konteks", () => {
  it("memakai topik bila ada, kalau tidak mapelnya", () => {
    const rows = barisPerbandingan([
      sess({ id: "a", date: "2026-06-02", topic: "Vektor", predictedGrade: "6", actualGrade: "6" }),
      sess({ id: "b", date: "2026-06-01", predictedGrade: "6", actualGrade: "6", subjects: ["Physics"] }),
    ]);
    expect(rows.find((r) => r.id === "a")!.konteks).toBe("Vektor");
    expect(rows.find((r) => r.id === "b")!.konteks).toBe("Physics");
  });

  it("memakai 'Sesi umum' bila tidak ada topik maupun mapel", () => {
    const rows = barisPerbandingan([sess({ id: "a", subjects: [], predictedGrade: "6", actualGrade: "6" })]);
    expect(rows[0].konteks).toBe("Sesi umum");
  });
});

describe("PerbandinganNilai — markup", () => {
  const markup = (sessions: Session[]) =>
    renderToStaticMarkup(<PerbandinganNilai sessions={sessions} />);

  it("menyatakan apa adanya bila belum ada sesi bernilai", () => {
    const html = markup([sess({ id: "a", topic: "Vektor" })]);
    expect(html).toContain("Belum ada sesi dengan prediksi atau nilai akhir");
    expect(html).toContain("diisi saat mencatat sesi");
  });

  it("menampilkan prediksi dan nilai akhir berdampingan", () => {
    const html = markup([sess({ id: "a", predictedGrade: "6", actualGrade: "7" })]);
    expect(html).toContain("Prediksi");
    expect(html).toContain("Akhir");
    expect(html).toContain(">6<");
    expect(html).toContain(">7<");
    expect(html).toContain("↑ +1");
  });

  it("menandai nilai yang turun beserta alasannya", () => {
    const html = markup([sess({ id: "a", predictedGrade: "7", actualGrade: "5" })]);
    expect(html).toContain("↓ -2");
    expect(html).toContain("di bawah prediksi");
    expect(html).toContain("refleksi wajib diisi");
  });

  it("menghitung berapa sesi yang di bawah prediksi dan menyebut penyebutnya", () => {
    const html = markup([
      sess({ id: "a", date: "2026-06-02", predictedGrade: "7", actualGrade: "5" }),
      sess({ id: "b", date: "2026-06-01", predictedGrade: "6", actualGrade: "6" }),
    ]);
    expect(html).toContain("1 dari 2 sesi nilainya di bawah prediksi");
  });

  it("mengatakan tidak ada yang di bawah prediksi bila memang begitu", () => {
    const html = markup([sess({ id: "a", predictedGrade: "6", actualGrade: "7" })]);
    expect(html).toContain("Tidak ada sesi yang nilainya di bawah prediksi");
  });

  it("menyebut 'sama' untuk nilai yang setara", () => {
    const html = markup([sess({ id: "a", predictedGrade: "6", actualGrade: "6" })]);
    expect(html).toContain("= sama");
  });

  it("mengatakan terus terang bila tidak bisa dibandingkan", () => {
    const html = markup([sess({ id: "a", predictedGrade: "6", actualGrade: "B" })]);
    expect(html).toContain("tidak bisa dibandingkan");
  });

  it("menyebut jumlah sesi bernilai di kepala tabel", () => {
    const html = markup([
      sess({ id: "a", date: "2026-06-02", predictedGrade: "6", actualGrade: "6" }),
      sess({ id: "b", date: "2026-06-01", predictedGrade: "6", actualGrade: "6" }),
    ]);
    expect(html).toContain("2 sesi bernilai");
  });
});
