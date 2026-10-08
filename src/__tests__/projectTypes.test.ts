import { describe, it, expect } from "vitest";
import {
  PROJECT_TYPES, PROJECT_TYPE_CODES, projectTypeMeta, presetMilestones,
  projectProgress, deadlineInfo, deadlineClass,
} from "../lib/projectTypes";
import type { IaEeMilestone } from "../db/types";

function ms(status: IaEeMilestone["status"], title = "m"): IaEeMilestone {
  return { id: title, title, status };
}

describe("peta jenis proyek", () => {
  it("mengenali keempat jenis, termasuk jenis bebas", () => {
    expect(PROJECT_TYPE_CODES).toEqual(["IA", "EE", "PP", "OTHER"]);
    for (const code of PROJECT_TYPE_CODES) {
      const meta = projectTypeMeta(code);
      expect(meta.code).toBe(code);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.badgeLabel.length).toBeGreaterThan(0);
      expect(meta.hint.length).toBeGreaterThan(0);
      expect(meta.badgeClass).toContain("var(--");
    }
  });

  it("hanya IA dan EE yang mewajibkan mapel", () => {
    const wajib = PROJECT_TYPES.filter((t) => t.subjectRequired).map((t) => t.code);
    expect(wajib).toEqual(["IA", "EE"]);
  });

  it("menampilkan jenis tak dikenal apa adanya, tanpa melempar galat", () => {
    // Jenis asing bisa datang dari backup lama atau entri masa depan. Validator
    // memperlakukannya sebagai peringatan, jadi antarmuka pun harus tahan.
    const meta = projectTypeMeta("SOMETHING_NEW");
    expect(meta.code).toBe("SOMETHING_NEW");
    expect(meta.badgeLabel).toBe("SOMETHING_NEW");
    expect(meta.subjectRequired).toBe(false);
    expect(meta.preset).toEqual([]);
  });

  it("menangani kode kosong tanpa label kosong", () => {
    const meta = projectTypeMeta("");
    expect(meta.badgeLabel).toBe("?");
    expect(meta.label).toBe("Jenis tidak dikenal");
  });
});

describe("preset milestone", () => {
  it("memberi preset untuk tiga jenis IB dan tidak untuk jenis bebas", () => {
    for (const code of ["IA", "EE", "PP"]) {
      expect(presetMilestones(code).length).toBeGreaterThan(0);
    }
    expect(presetMilestones("OTHER")).toEqual([]);
  });

  it("menghasilkan milestone berstatus pending dengan ID unik", () => {
    const a = presetMilestones("IA");
    const b = presetMilestones("IA");
    expect(a.every((m) => m.status === "pending")).toBe(true);
    expect(a.every((m) => m.title.length > 0)).toBe(true);
    // Dua proyek IA berbeda tidak boleh berbagi ID milestone.
    const ids = new Set([...a, ...b].map((m) => m.id));
    expect(ids.size).toBe(a.length + b.length);
  });
});

describe("keadaan proyek diturunkan dari milestone (K2)", () => {
  it("proyek tanpa milestone disebut apa adanya, bukan disimpulkan", () => {
    const p = projectProgress({ milestones: [] });
    expect(p.state).toBe("kosong");
    expect(p.percent).toBe(0);
    expect(p.label).toBe("Belum ada milestone");
  });

  it("menghitung kemajuan sebagian", () => {
    const p = projectProgress({ milestones: [ms("done"), ms("pending"), ms("in_progress"), ms("done")] });
    expect(p.state).toBe("jalan");
    expect(p.done).toBe(2);
    expect(p.total).toBe(4);
    expect(p.percent).toBe(50);
    expect(p.label).toBe("2/4 milestone");
  });

  it("menandai selesai hanya bila semua milestone selesai", () => {
    const p = projectProgress({ milestones: [ms("done"), ms("done")] });
    expect(p.state).toBe("selesai");
    expect(p.percent).toBe(100);
    expect(p.label).toBe("2/2 milestone · selesai");
  });

  it("membulatkan persen ke bilangan bulat", () => {
    expect(projectProgress({ milestones: [ms("done"), ms("pending"), ms("pending")] }).percent).toBe(33);
    expect(projectProgress({ milestones: [ms("done"), ms("done"), ms("pending")] }).percent).toBe(67);
  });
});

describe("tenggat", () => {
  it("mengembalikan null bila tidak ada tenggat", () => {
    expect(deadlineInfo(undefined, "2026-10-09")).toBeNull();
  });

  it("menghitung sisa hari, hari ini, dan keterlambatan", () => {
    // Dua hari lagi masih masuk "dekat" (ambangnya empat belas hari di bawah).
    const info = deadlineInfo("2026-10-11", "2026-10-09");
    expect(info).toMatchObject({ state: "dekat", days: 2, label: "2h lagi" });

    expect(deadlineInfo("2026-10-09", "2026-10-09")).toMatchObject({ state: "dekat", days: 0, label: "Tenggat hari ini" });

    const lewat = deadlineInfo("2026-10-06", "2026-10-09");
    expect(lewat).toMatchObject({ state: "terlambat", days: -3, label: "3h terlambat" });
  });

  it("menyebut dekat pada empat belas hari ke bawah", () => {
    expect(deadlineInfo("2026-10-22", "2026-10-09")?.state).toBe("dekat");
    expect(deadlineInfo("2026-10-23", "2026-10-09")?.state).toBe("aman");
  });

  it("memilih kelas token sesuai keadaan", () => {
    expect(deadlineClass("terlambat")).toBe("text-[var(--ink-danger)]");
    expect(deadlineClass("dekat")).toBe("text-[var(--ink-attention)]");
    expect(deadlineClass("aman")).toBe("text-[var(--ink-muted)]");
  });
});
