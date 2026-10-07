import { describe, expect, it } from "vitest";
import {
  buildFinanceOverview,
  rupiahRingkas,
  AMBANG_PIUTANG_LEWAT_HARI,
  type BuildFinanceOverviewInput,
} from "../lib/financeOverview";
import type { BarisTagihan } from "../lib/financeRows";
import type { MonthCashSummary } from "../db/repos/paymentRepo";

const BULAN = "2026-09";

function makeRow(overrides: Partial<BarisTagihan> = {}): BarisTagihan {
  const keadaan = overrides.keadaan ?? "terkirim";
  return {
    key: overrides.key ?? `row-${Math.random()}`,
    studentId: "s1",
    studentName: "Murid s1",
    amount: 100_000,
    asal: "terbit",
    keadaan,
    tindakan: keadaan === "lunas" ? "riwayat" : "tagih",
    mode: "",
    cakupan: "",
    refs: {},
    aksi: [],
    ...overrides,
  };
}

function makeCash(month: string, overrides: Partial<MonthCashSummary> = {}): MonthCashSummary {
  return {
    month,
    sesi: 0,
    jam: 0,
    pendapatan: 0,
    realisasi: 0,
    piutang: 0,
    pengeluaran: 0,
    laba: 0,
    ...overrides,
  };
}

function build(overrides: Partial<BuildFinanceOverviewInput> = {}) {
  return buildFinanceOverview({
    month: BULAN,
    rows: [],
    cash: [makeCash(BULAN)],
    reports: [],
    ...overrides,
  });
}

describe("buildFinanceOverview — angka", () => {
  it("menghitung sisa sebagai uang masuk dikurangi pengeluaran (basis kas)", () => {
    const hasil = build({
      cash: [makeCash(BULAN, { realisasi: 7_200_000, pengeluaran: 1_100_000, laba: -400_000 })],
    });

    expect(hasil.masuk).toBe(7_200_000);
    expect(hasil.keluar).toBe(1_100_000);
    expect(hasil.sisa).toBe(6_100_000);
    // Laba akrual dibiarkan apa adanya: sisa kas dan laba memang dua angka berbeda.
    expect(hasil.laba).toBe(-400_000);
  });

  it("memakai angka pendapatan akrual untuk potensi, bukan kas", () => {
    const hasil = build({
      cash: [makeCash(BULAN, { realisasi: 1_000_000, pendapatan: 4_500_000 })],
    });

    expect(hasil.potensi).toBe(4_500_000);
    expect(hasil.masuk).toBe(1_000_000);
  });

  it("mengembalikan nol bila bulan itu belum ada di ringkasan kas", () => {
    const hasil = build({ cash: [makeCash("2026-08", { realisasi: 999 })] });

    expect(hasil.masuk).toBe(0);
    expect(hasil.keluar).toBe(0);
    expect(hasil.sisa).toBe(0);
  });

  it("menjumlahkan seluruh piutang terbuka lintas bulan, mengabaikan yang lunas", () => {
    const hasil = build({
      rows: [
        makeRow({ key: "a", amount: 500_000, keadaan: "terkirim" }),
        makeRow({ key: "b", amount: 300_000, keadaan: "lewat", umurHari: 10 }),
        makeRow({ key: "c", amount: 900_000, keadaan: "siap-ditagih", asal: "laporan" }),
        makeRow({ key: "d", amount: 2_000_000, keadaan: "lunas", asal: "terbit" }),
      ],
    });

    expect(hasil.piutang).toBe(1_700_000);
  });

  it("hanya menghitung piutang lewat lebih dari 60 hari", () => {
    const hasil = build({
      rows: [
        makeRow({ key: "a", amount: 100_000, keadaan: "lewat", umurHari: AMBANG_PIUTANG_LEWAT_HARI }),
        makeRow({ key: "b", amount: 200_000, keadaan: "lewat", umurHari: AMBANG_PIUTANG_LEWAT_HARI + 1 }),
        makeRow({ key: "c", amount: 400_000, keadaan: "lewat", umurHari: 120 }),
        makeRow({ key: "d", amount: 800_000, keadaan: "terkirim" }),
      ],
    });

    // Tepat 60 hari belum "lewat 60"; batasnya eksklusif.
    expect(hasil.piutangLewat60).toBe(600_000);
  });

  it("menghitung baris siap-ditagih dan laporan final yang belum dibagikan", () => {
    const hasil = build({
      rows: [
        makeRow({ key: "a", keadaan: "siap-ditagih" }),
        makeRow({ key: "b", keadaan: "siap-ditagih" }),
        makeRow({ key: "c", keadaan: "terkirim" }),
      ],
      reports: [
        { id: "r1", studentId: "s1", status: "confirmed" },
        { id: "r2", studentId: "s1", status: "confirmed", pdfGeneratedAt: "2026-09-30" },
        { id: "r3", studentId: "s1", status: "draft" },
      ],
    });

    expect(hasil.jumlahBelumDitagih).toBe(2);
    expect(hasil.laporanBelumDibagikan).toBe(1);
  });
});

describe("buildFinanceOverview — sorotan", () => {
  it("memunculkan sorotan piutang lewat 60 hari beserta umur tertua", () => {
    const hasil = build({
      rows: [makeRow({ amount: 750_000, keadaan: "lewat", umurHari: 74 })],
    });

    const kode = hasil.sorotan.filter((s) => s.kode === "piutang-lewat-60");
    expect(kode).toHaveLength(2);
    expect(kode[0].teks).toContain("60 hari");
    expect(kode[0].jumlah).toBe(750_000);
    expect(kode[1].teks).toContain("74 hari");
  });

  it("tidak memunculkan sorotan piutang bila semuanya belum lewat", () => {
    const hasil = build({ rows: [makeRow({ keadaan: "terkirim" })] });

    expect(hasil.sorotan.some((s) => s.kode === "piutang-lewat-60")).toBe(false);
  });

  it("memunculkan sorotan tagihan siap ditagih", () => {
    const hasil = build({
      rows: [
        makeRow({ key: "a", keadaan: "siap-ditagih", amount: 1_000_000 }),
        makeRow({ key: "b", keadaan: "siap-ditagih", amount: 400_000 }),
      ],
    });

    const sorotan = hasil.sorotan.find((s) => s.kode === "siap-ditagih");
    expect(sorotan?.jumlah).toBe(2);
    expect(sorotan?.teks).toContain("2 tagihan");
  });

  it("memunculkan sorotan laporan final yang belum dibagikan", () => {
    const hasil = build({
      reports: [{ id: "r1", studentId: "s1", status: "confirmed" }],
    });

    const sorotan = hasil.sorotan.find((s) => s.kode === "laporan-belum-dibagikan");
    expect(sorotan?.jumlah).toBe(1);
    expect(sorotan?.teks).toContain("belum dibagikan");
  });

  it("memunculkan sorotan pengeluaran naik lebih dari 30 persen", () => {
    const hasil = build({
      cash: [
        makeCash("2026-06", { pengeluaran: 1_000_000 }),
        makeCash("2026-07", { pengeluaran: 1_000_000 }),
        makeCash("2026-08", { pengeluaran: 1_000_000 }),
        makeCash(BULAN, { pengeluaran: 2_000_000, realisasi: 5_000_000 }),
      ],
    });

    const sorotan = hasil.sorotan.find((s) => s.kode === "pengeluaran-naik");
    expect(sorotan?.teks).toContain("100%");
  });

  it("tidak menyorot kenaikan 30 persen pas (ambang eksklusif)", () => {
    const hasil = build({
      cash: [
        makeCash("2026-08", { pengeluaran: 1_000_000 }),
        makeCash(BULAN, { pengeluaran: 1_300_000 }),
      ],
    });

    expect(hasil.sorotan.some((s) => s.kode === "pengeluaran-naik")).toBe(false);
  });

  it("tidak menyorot pengeluaran bila tidak ada bulan pembanding", () => {
    const hasil = build({ cash: [makeCash(BULAN, { pengeluaran: 9_000_000 })] });

    expect(hasil.sorotan.some((s) => s.kode === "pengeluaran-naik")).toBe(false);
  });

  it("tidak menyorot apa pun pada bulan yang bersih", () => {
    const hasil = build({
      cash: [makeCash(BULAN, { realisasi: 3_000_000, pengeluaran: 500_000 })],
      rows: [],
      reports: [],
    });

    expect(hasil.sorotan).toEqual([]);
  });
});

describe("buildFinanceOverview — ringkasLokal", () => {
  it("menyusun kalimat lokal tanpa AI dan memuat angka utama", () => {
    const hasil = build({
      cash: [makeCash(BULAN, { realisasi: 7_200_000, pengeluaran: 1_100_000 })],
    });

    expect(hasil.ringkasLokal).toContain("Rp 7,2 jt uang masuk bulan ini");
    expect(hasil.ringkasLokal).toContain("Rp 1,1 jt");
    expect(hasil.ringkasLokal).toContain("Sisa kas");
    expect(hasil.ringkasLokal.endsWith(".")).toBe(true);
  });

  it("menyebut tagihan yang lewat pada kalimat lokal", () => {
    const hasil = build({
      rows: [
        makeRow({ key: "a", amount: 1_400_000, keadaan: "lewat", umurHari: 40 }),
        makeRow({ key: "b", amount: 100_000, keadaan: "lewat", umurHari: 12 }),
      ],
    });

    expect(hasil.ringkasLokal).toContain("2 tagihan");
    expect(hasil.ringkasLokal).toContain("lewat jatuh tempo");
  });
});

describe("rupiahRingkas", () => {
  it("meringkas jutaan, ribuan, dan nilai kecil", () => {
    expect(rupiahRingkas(7_200_000)).toBe("Rp 7,2 jt");
    expect(rupiahRingkas(850_000)).toBe("Rp 850 rb");
    expect(rupiahRingkas(1_050_000_000)).toBe("Rp 1,1 M");
    expect(rupiahRingkas(900)).toBe("Rp 900");
  });

  it("menjaga tanda negatif di depan", () => {
    expect(rupiahRingkas(-2_500_000)).toBe("-Rp 2,5 jt");
  });
});
