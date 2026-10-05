import { describe, expect, it } from "vitest";
import {
  formatInvoiceDueLabel,
  hasNoDueDateLabel,
  labelDaysAhead,
  labelDaysLate,
  labelDueAt,
} from "../lib/invoiceDueLabel";

/**
 * G3-02 fitur #5 (K-03). Semua kasus memakai `groundedAt` eksplisit supaya
 * hasilnya tidak bergantung jam dinding — pola yang sama dipakai
 * `finance.test.ts` untuk `invoiceAgeDays()`.
 */
const HARI_INI = "2026-06-20";

describe("formatInvoiceDueLabel — sisi yang sudah lewat", () => {
  it("menghitung hari terlambat dari jatuh tempo", () => {
    expect(formatInvoiceDueLabel("2026-05-09", false, HARI_INI)).toBe("Terlambat 42 hari");
  });

  it("jatuh tempo kemarin = Terlambat 1 hari (batas 0/1)", () => {
    expect(formatInvoiceDueLabel("2026-06-19", false, HARI_INI)).toBe("Terlambat 1 hari");
  });

  it("jatuh tempo tepat hari ini tidak menampilkan umur", () => {
    expect(formatInvoiceDueLabel(HARI_INI, false, HARI_INI)).toBe("");
  });

  it("lintas bulan dan lintas tahun tetap dihitung hari kalender", () => {
    expect(formatInvoiceDueLabel("2025-12-31", false, "2026-01-01")).toBe("Terlambat 1 hari");
    expect(formatInvoiceDueLabel("2025-12-31", false, "2026-03-01")).toBe("Terlambat 60 hari");
  });
});

describe("formatInvoiceDueLabel — sisi yang belum jatuh tempo", () => {
  it("menyebut sisa hari, bukan umur piutang", () => {
    expect(formatInvoiceDueLabel("2026-06-23", false, HARI_INI)).toBe("Jatuh tempo 3 hari lagi");
  });

  it("besok = Jatuh tempo 1 hari lagi", () => {
    expect(formatInvoiceDueLabel("2026-06-21", false, HARI_INI)).toBe("Jatuh tempo 1 hari lagi");
  });
});

describe("formatInvoiceDueLabel — keadaan yang tidak menampilkan umur", () => {
  it("tagihan lunas tidak menampilkan umur meski sudah lewat", () => {
    expect(formatInvoiceDueLabel("2026-05-09", true, HARI_INI)).toBe("");
  });

  it("tanpa jatuh tempo (invoice lama) tidak menampilkan umur", () => {
    expect(formatInvoiceDueLabel(undefined, false, HARI_INI)).toBe("");
  });
});

describe("label tanggal jatuh tempo", () => {
  it("memakai dayLabel, bukan string ISO", () => {
    const label = labelDueAt("2026-06-23");
    expect(label).toContain("23");
    expect(label).toContain("2026");
    expect(label).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("tanggal sama menghasilkan label sama dengan dayLabel (satu sumber)", () => {
    expect(labelDueAt("2026-01-15")).toBe(labelDueAt("2026-01-15"));
    expect(labelDueAt("2026-01-15")).not.toBe(labelDueAt("2026-01-16"));
  });
});

describe("potongan label tunggal", () => {
  it("bentuk teksnya persis seperti yang diminta spek", () => {
    expect(labelDaysLate(42)).toBe("Terlambat 42 hari");
    expect(labelDaysAhead(3)).toBe("Jatuh tempo 3 hari lagi");
    expect(hasNoDueDateLabel()).toBe("Jatuh tempo belum diset");
  });
});
