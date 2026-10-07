import { describe, expect, it } from "vitest";
import { bulanTransaksi, kelompokkanPerBulan, totalPembayaran } from "../lib/paymentHistory";
import type { Payment } from "../db/types";

function makePayment(id: string, overrides: Partial<Payment> = {}): Payment {
  return {
    id,
    studentId: "s1",
    month: "2026-09",
    totalCost: 400_000,
    status: "UNPAID",
    ...overrides,
  };
}

describe("bulanTransaksi", () => {
  it("memakai bulan uang masuk bila tanggal bayar tercatat", () => {
    // Invoice ber-anchor September, tetapi uangnya masuk 3 Oktober → masuk
    // kelompok Oktober. Inilah inti keputusan 2026-10-07.
    expect(bulanTransaksi(makePayment("p1", { month: "2026-09", paidAt: "2026-10-03" }))).toBe("2026-10");
  });

  it("jatuh ke bulan invoice bila tanggal bayar tidak ada", () => {
    expect(bulanTransaksi(makePayment("p1", { month: "2026-09" }))).toBe("2026-09");
  });

  it("memakai bulan invoice untuk transaksi lama yang belum lunas", () => {
    expect(bulanTransaksi(makePayment("p1", { month: "2026-07", status: "UNPAID" }))).toBe("2026-07");
  });
});

describe("kelompokkanPerBulan", () => {
  it("memisahkan yang lunas dari yang belum, per bulan", () => {
    const kelompok = kelompokkanPerBulan([
      makePayment("p-lunas", { status: "PAID", paidAt: "2026-10-03", totalCost: 500_000 }),
      makePayment("p-tunggak", { status: "UNPAID", month: "2026-10", totalCost: 300_000 }),
    ]);

    expect(kelompok).toHaveLength(1);
    expect(kelompok[0].bulan).toBe("2026-10");
    expect(kelompok[0].lunas.map((p) => p.id)).toEqual(["p-lunas"]);
    expect(kelompok[0].totalLunas).toBe(500_000);
    expect(kelompok[0].belumLunas.map((p) => p.id)).toEqual(["p-tunggak"]);
    expect(kelompok[0].totalBelumLunas).toBe(300_000);
  });

  it("mengurutkan bulan terbaru lebih dulu", () => {
    const kelompok = kelompokkanPerBulan([
      makePayment("p-juli", { status: "PAID", paidAt: "2026-07-05", month: "2026-07" }),
      makePayment("p-oktober", { status: "PAID", paidAt: "2026-10-05", month: "2026-10" }),
      makePayment("p-agustus", { status: "PAID", paidAt: "2026-08-05", month: "2026-08" }),
    ]);

    expect(kelompok.map((k) => k.bulan)).toEqual(["2026-10", "2026-08", "2026-07"]);
  });

  it("mengelompokkan invoice satu bulan menurut bulan uang masuknya, bukan bulan anchor", () => {
    // Dua invoice ber-anchor September, dibayar di dua bulan berbeda → dua kelompok.
    const kelompok = kelompokkanPerBulan([
      makePayment("p1", { status: "PAID", month: "2026-09", paidAt: "2026-10-03" }),
      makePayment("p2", { status: "PAID", month: "2026-09", paidAt: "2026-11-04" }),
    ]);

    expect(kelompok.map((k) => k.bulan)).toEqual(["2026-11", "2026-10"]);
    expect(kelompok[0].lunas.map((p) => p.id)).toEqual(["p2"]);
    expect(kelompok[1].lunas.map((p) => p.id)).toEqual(["p1"]);
  });

  it("mengurutkan transaksi lunas dalam satu bulan menurut tanggal bayar terbaru", () => {
    const kelompok = kelompokkanPerBulan([
      makePayment("p-awal", { status: "PAID", paidAt: "2026-10-02" }),
      makePayment("p-akhir", { status: "PAID", paidAt: "2026-10-28" }),
    ]);

    expect(kelompok[0].lunas.map((p) => p.id)).toEqual(["p-akhir", "p-awal"]);
  });

  it("mengembalikan daftar kosong bila tidak ada pembayaran", () => {
    expect(kelompokkanPerBulan([])).toEqual([]);
  });

  it("tidak menghilangkan transaksi lama yang belum punya tanggal bayar", () => {
    const kelompok = kelompokkanPerBulan([
      makePayment("p-lama", { status: "PAID", month: "2026-05" }),
      makePayment("p-baru", { status: "PAID", month: "2026-05", paidAt: "2026-06-02" }),
    ]);

    const semuaId = kelompok.flatMap((k) => k.lunas.map((p) => p.id)).sort();
    expect(semuaId).toEqual(["p-baru", "p-lama"]);
  });
});

describe("totalPembayaran", () => {
  it("memisahkan uang yang sudah masuk dari yang masih menunggu", () => {
    const total = totalPembayaran([
      makePayment("p1", { status: "PAID", totalCost: 500_000 }),
      makePayment("p2", { status: "PAID", totalCost: 250_000 }),
      makePayment("p3", { status: "UNPAID", totalCost: 400_000 }),
    ]);

    expect(total.lunas).toBe(750_000);
    expect(total.belumLunas).toBe(400_000);
    expect(total.jumlahBelumLunas).toBe(1);
  });

  it("mengembalikan nol untuk murid tanpa pembayaran", () => {
    expect(totalPembayaran([])).toEqual({ lunas: 0, belumLunas: 0, jumlahBelumLunas: 0 });
  });
});
