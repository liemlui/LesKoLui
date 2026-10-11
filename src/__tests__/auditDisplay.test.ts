import { describe, expect, it } from "vitest";
import {
  AUDIT_LABEL,
  auditActionLabel,
  auditDayKey,
  auditDayLabel,
  auditTimeLabel,
  groupAuditByDay,
  type AuditEntryLike,
} from "../lib/auditDisplay";
import type { AuditAction } from "../db/types";

/** Waktu lokal supaya `auditDayKey` (yang memang lokal) tidak bergeser oleh zona mesin. */
function lokal(y: number, m: number, d: number, h = 12, min = 0): string {
  return new Date(y, m - 1, d, h, min).toISOString();
}

describe("auditDayKey — kunci hari LOKAL, bukan UTC", () => {
  it("memakai tanggal lokal sehingga entri pagi tidak jatuh ke hari sebelumnya", () => {
    // 06.00 lokal: di zona WIB (UTC+7) ini 23.00 UTC hari sebelumnya. Kalau
    // kuncinya memakai toISOString, entri ini akan masuk grup "Kemarin".
    const ts = lokal(2026, 10, 11, 6, 0);
    const d = new Date(ts);
    expect(auditDayKey(ts)).toBe(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-11`);
  });

  it("memberi kunci yang sama untuk dua waktu di hari lokal yang sama", () => {
    expect(auditDayKey(lokal(2026, 10, 11, 0, 30))).toBe(auditDayKey(lokal(2026, 10, 11, 23, 45)));
  });

  it("memberi kunci berbeda untuk hari yang bersebelahan", () => {
    expect(auditDayKey(lokal(2026, 10, 11))).not.toBe(auditDayKey(lokal(2026, 10, 12)));
  });
});

describe("auditDayLabel", () => {
  const now = new Date(2026, 9, 11, 15, 0); // 11 Oktober 2026, 15.00 lokal

  it("menyebut Hari ini dan Kemarin dengan kata", () => {
    expect(auditDayLabel(lokal(2026, 10, 11, 8, 0), now)).toBe("Hari ini");
    expect(auditDayLabel(lokal(2026, 10, 10, 8, 0), now)).toBe("Kemarin");
  });

  it("hari yang lebih tua ditulis sebagai tanggal lengkap berbahasa Indonesia", () => {
    const label = auditDayLabel(lokal(2026, 10, 9, 8, 0), now);
    expect(label).toContain("2026");
    expect(label).toMatch(/Oktober/i);
    expect(label).not.toBe("Hari ini");
    expect(label).not.toBe("Kemarin");
  });

  it("memakai tanggal absolut, bukan 'N hari lalu' yang bisa basi", () => {
    expect(auditDayLabel(lokal(2026, 8, 1, 8, 0), now)).not.toMatch(/lalu|hari/);
  });
});

describe("groupAuditByDay — pengelompokan V-14", () => {
  const e = (id: string, timestamp: string, action: AuditAction = "session.delete"): AuditEntryLike => ({ id, action, timestamp });

  it("daftar kosong menghasilkan tanpa grup", () => {
    expect(groupAuditByDay([], new Date(2026, 9, 11))).toEqual([]);
  });

  it("menggabungkan entri yang berurutan pada hari yang sama", () => {
    const hari = lokal(2026, 10, 11);
    const groups = groupAuditByDay([e("1", lokal(2026, 10, 11, 9)), e("2", lokal(2026, 10, 11, 10)), e("3", lokal(2026, 10, 11, 11))], new Date(hari));
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((i) => i.id)).toEqual(["1", "2", "3"]);
    expect(groups[0].label).toBe("Hari ini");
  });

  it("memecah grup saat harinya berganti", () => {
    const groups = groupAuditByDay([
      e("1", lokal(2026, 10, 11, 9)),
      e("2", lokal(2026, 10, 10, 9)),
      e("3", lokal(2026, 10, 9, 9)),
    ], new Date(2026, 9, 11));
    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.label)).toEqual(["Hari ini", "Kemarin", groups[2].label]);
  });

  it("entri hari lama yang menyelip TIDAK digabung ke grup hari baru di atasnya", () => {
    // Inilah kesalahan yang mudah terjadi kalau pengelompokan memakai Map:
    // hari yang sama akan digabung walau urutannya sudah terputus.
    const groups = groupAuditByDay([
      e("1", lokal(2026, 10, 11, 9)),
      e("2", lokal(2026, 10, 9, 9)),
      e("3", lokal(2026, 10, 11, 8)),
    ], new Date(2026, 9, 11));
    expect(groups).toHaveLength(3);
    expect(groups[0].items.map((i) => i.id)).toEqual(["1"]);
    expect(groups[2].items.map((i) => i.id)).toEqual(["3"]);
  });

  it("mempertahankan urutan masuk apa adanya (daftar sudah terurut menurun dari repo)", () => {
    const groups = groupAuditByDay([e("a", lokal(2026, 10, 12)), e("b", lokal(2026, 10, 11))], new Date(2026, 9, 12));
    expect(groups.map((g) => g.key)).toEqual(["2026-10-12", "2026-10-11"]);
  });
});

describe("auditActionLabel", () => {
  it("menerjemahkan setiap aksi yang punya label", () => {
    expect(auditActionLabel("data.reset")).toBe("Reset semua data");
    expect(auditActionLabel("ai.call")).toBe("Panggilan AI berbiaya");
  });

  it("label bahasa Indonesia untuk seluruh kunci AUDIT_LABEL (tidak ada yang kosong)", () => {
    for (const [kunci, label] of Object.entries(AUDIT_LABEL)) {
      expect(label.trim(), `label kosong untuk ${kunci}`).not.toBe("");
    }
  });

  it("aksi yang belum punya label diteruskan apa adanya, bukan disembunyikan", () => {
    expect(auditActionLabel("aksi.baru" as AuditAction)).toBe("aksi.baru");
  });
});

describe("auditTimeLabel", () => {
  it("menuliskan jam dan menit dua digit", () => {
    expect(auditTimeLabel(lokal(2026, 10, 11, 9, 5))).toMatch(/^09[.:]05$/);
  });
});
