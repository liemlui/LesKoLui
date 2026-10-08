import { describe, expect, it } from "vitest";
import {
  biayaEntri,
  bulanBerjalan,
  bulanDari,
  hitungPemakaian,
} from "../lib/aiUsage";
import type { AuditEntry } from "../db/types";

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: overrides.id ?? `e-${Math.random()}`,
    action: "ai.call",
    entityType: "ai",
    timestamp: "2026-10-07T03:00:00.000Z",
    ...overrides,
  };
}

/** Bulan berjalan menurut WIB, supaya tes tidak bergantung jam mesin. */
const BULAN = bulanBerjalan();
const DI_BULAN_INI = `${BULAN}-15T03:00:00.000Z`;
const BULAN_LALU = "2020-01-15T03:00:00.000Z";

describe("bulanDari", () => {
  it("mengambil bagian bulan dari timestamp", () => {
    expect(bulanDari("2026-10-07T03:00:00.000Z")).toBe("2026-10");
    expect(bulanDari("2026-10-07")).toBe("2026-10");
  });
});

describe("biayaEntri", () => {
  it("memakai biaya nyata bila ada", () => {
    expect(biayaEntri({ costIdr: 120, estimatedIdr: 100 })).toBe(120);
  });

  it("jatuh ke perkiraan bila biaya nyata belum ada", () => {
    expect(biayaEntri({ estimatedIdr: 100 })).toBe(100);
  });

  it("mengembalikan nol bila keduanya kosong", () => {
    expect(biayaEntri({})).toBe(0);
  });

  it("tidak menjumlahkan biaya nyata dan perkiraan (tidak dihitung dua kali)", () => {
    // Kalau keduanya dijumlahkan, pemakaian akan tampak dua kali lipat dan
    // batas belanja terpicu jauh lebih awal dari seharusnya.
    expect(biayaEntri({ costIdr: 120, estimatedIdr: 100 })).not.toBe(220);
  });
});

describe("hitungPemakaian", () => {
  it("hanya menghitung panggilan AI pada bulan yang diminta", () => {
    const hasil = hitungPemakaian([
      makeEntry({ costIdr: 100, timestamp: DI_BULAN_INI }),
      makeEntry({ costIdr: 999, timestamp: BULAN_LALU }),
    ], undefined, BULAN);

    expect(hasil.terpakaiIdr).toBe(100);
    expect(hasil.jumlahPanggilan).toBe(1);
  });

  it("mengabaikan entri audit yang bukan panggilan AI", () => {
    const hasil = hitungPemakaian([
      makeEntry({ costIdr: 100, timestamp: DI_BULAN_INI }),
      makeEntry({ action: "payment.paid", costIdr: 500, timestamp: DI_BULAN_INI }),
    ], undefined, BULAN);

    expect(hasil.terpakaiIdr).toBe(100);
    expect(hasil.jumlahPanggilan).toBe(1);
  });

  it("tanpa batas berarti tidak pernah terlampaui dan tanpa sisa", () => {
    const hasil = hitungPemakaian([makeEntry({ costIdr: 999_999, timestamp: DI_BULAN_INI })], undefined, BULAN);

    expect(hasil.batasIdr).toBeUndefined();
    expect(hasil.sisaIdr).toBeUndefined();
    expect(hasil.terlampaui).toBe(false);
  });

  it("batas nol atau negatif diperlakukan sebagai tanpa batas", () => {
    // Keputusan pemilik B4: batas TIDAK dipasang secara default. Kolom kosong
    // berarti tanpa batas, dan itu tidak boleh berubah jadi blokir permanen.
    for (const batas of [0, -1]) {
      const hasil = hitungPemakaian([makeEntry({ costIdr: 5000, timestamp: DI_BULAN_INI })], batas, BULAN);
      expect(hasil.batasIdr, `batas ${batas}`).toBeUndefined();
      expect(hasil.terlampaui, `batas ${batas}`).toBe(false);
    }
  });

  it("menghitung sisa selama batas belum terlampaui", () => {
    const hasil = hitungPemakaian([makeEntry({ costIdr: 400, timestamp: DI_BULAN_INI })], 1000, BULAN);

    expect(hasil.batasIdr).toBe(1000);
    expect(hasil.sisaIdr).toBe(600);
    expect(hasil.terlampaui).toBe(false);
  });

  it("menandai terlampaui tepat saat pemakaian menyentuh batas", () => {
    const hasil = hitungPemakaian([makeEntry({ costIdr: 1000, timestamp: DI_BULAN_INI })], 1000, BULAN);

    expect(hasil.terlampaui).toBe(true);
    expect(hasil.sisaIdr).toBe(0);
  });

  it("menandai terlampaui saat pemakaian melewati batas, dan sisa tidak negatif", () => {
    const hasil = hitungPemakaian([makeEntry({ costIdr: 1500, timestamp: DI_BULAN_INI })], 1000, BULAN);

    expect(hasil.terlampaui).toBe(true);
    expect(hasil.sisaIdr).toBe(0);
  });

  it("menjumlahkan beberapa panggilan dalam satu bulan", () => {
    const hasil = hitungPemakaian([
      makeEntry({ costIdr: 60, timestamp: DI_BULAN_INI }),
      makeEntry({ costIdr: 40, timestamp: DI_BULAN_INI }),
      makeEntry({ estimatedIdr: 25, timestamp: DI_BULAN_INI }),
    ], 500, BULAN);

    expect(hasil.terpakaiIdr).toBe(125);
    expect(hasil.jumlahPanggilan).toBe(3);
    expect(hasil.sisaIdr).toBe(375);
  });

  it("mengembalikan nol untuk bulan yang belum ada panggilan", () => {
    const hasil = hitungPemakaian([makeEntry({ costIdr: 100, timestamp: BULAN_LALU })], 1000, BULAN);

    expect(hasil.terpakaiIdr).toBe(0);
    expect(hasil.jumlahPanggilan).toBe(0);
    expect(hasil.terlampaui).toBe(false);
    expect(hasil.sisaIdr).toBe(1000);
  });

  it("mengembalikan daftar kosong dengan aman", () => {
    const hasil = hitungPemakaian([], 1000, BULAN);
    expect(hasil.terpakaiIdr).toBe(0);
    expect(hasil.terlampaui).toBe(false);
    expect(hasil.sisaIdr).toBe(1000);
  });
});
