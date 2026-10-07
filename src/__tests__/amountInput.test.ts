import { describe, expect, it } from "vitest";
import {
  beriPemisah,
  formatNominalSaatKetik,
  pesanNominal,
  tampilkanNominal,
} from "../lib/amountInput";
import { MAX_PAYMENT_AMOUNT } from "../lib/money";

describe("beriPemisah", () => {
  it("memberi titik tiap tiga digit dari kanan", () => {
    expect(beriPemisah("1")).toBe("1");
    expect(beriPemisah("12")).toBe("12");
    expect(beriPemisah("123")).toBe("123");
    expect(beriPemisah("1234")).toBe("1.234");
    expect(beriPemisah("75000")).toBe("75.000");
    expect(beriPemisah("7500000")).toBe("7.500.000");
  });

  it("mengembalikan teks kosong apa adanya", () => {
    expect(beriPemisah("")).toBe("");
  });
});

describe("tampilkanNominal", () => {
  it("memformat nilai tersimpan untuk kolom isian", () => {
    expect(tampilkanNominal(75000)).toBe("75.000");
    expect(tampilkanNominal(0)).toBe("");
  });

  it("mengembalikan teks kosong untuk nilai tidak sah", () => {
    expect(tampilkanNominal(Number.NaN)).toBe("");
    expect(tampilkanNominal(-5)).toBe("");
  });
});

describe("formatNominalSaatKetik", () => {
  it("mengetik dari nol menambah digit dengan pemisah", () => {
    expect(formatNominalSaatKetik("7", 1).teks).toBe("7");
    expect(formatNominalSaatKetik("75", 2).teks).toBe("75");
    expect(formatNominalSaatKetik("750", 3).teks).toBe("750");
    expect(formatNominalSaatKetik("7500", 4).teks).toBe("7.500");
    expect(formatNominalSaatKetik("75000", 5).teks).toBe("75.000");
  });

  it("membuang apa pun selain angka", () => {
    expect(formatNominalSaatKetik("75.000", 6).teks).toBe("75.000");
    expect(formatNominalSaatKetik("Rp 75.000", 9).teks).toBe("75.000");
    expect(formatNominalSaatKetik("abc", 3).teks).toBe("");
    expect(formatNominalSaatKetik("7a5b0", 5).teks).toBe("750");
  });

  it("mengembalikan nilai rupiah yang benar", () => {
    expect(formatNominalSaatKetik("75.000", 6).nilai).toBe(75000);
    expect(formatNominalSaatKetik("", 0).nilai).toBe(0);
  });

  it("mempertahankan posisi kursor saat mengetik di tengah angka", () => {
    // Tutor mengetik "9" setelah "7" pada "75.000" → "795.000", dan kursor harus
    // tetap tepat sesudah angka 9, bukan melompat ke ujung.
    const hasil = formatNominalSaatKetik("795.000", 2);
    expect(hasil.teks).toBe("795.000");
    expect(hasil.posisiKursor).toBe(2);
  });

  it("menjaga kursor tetap di jumlah digit yang sama di sebelah kiri", () => {
    // "7500" dengan kursor di indeks 1 → satu digit di sebelah kiri ("7"), jadi
    // pada "7.500" kursor berada di indeks 1, tepat sesudah angka 7.
    const hasil = formatNominalSaatKetik("7500", 1);
    expect(hasil.teks).toBe("7.500");
    expect(hasil.posisiKursor).toBe(1);
    expect(hasil.teks.slice(0, hasil.posisiKursor).replace(/\D/g, "")).toHaveLength(1);
  });
  it("mempertahankan jumlah digit kiri pada beberapa titik sisip yang berbeda", () => {
    // Invariannya: berapa pun posisi kursor, jumlah digit di sebelah kiri tetap.
    const teks = "7500000";
    for (let posisi = 0; posisi <= teks.length; posisi += 1) {
      const digitKiri = teks.slice(0, posisi).replace(/\D/g, "").length;
      const hasil = formatNominalSaatKetik(teks, posisi);
      const digitKiriBaru = hasil.teks.slice(0, hasil.posisiKursor).replace(/\D/g, "").length;
      expect(digitKiriBaru, `posisi ${posisi}`).toBe(digitKiri);
    }
  });

  it("menempatkan kursor di ujung saat mengetik di akhir", () => {
    const hasil = formatNominalSaatKetik("75000", 5);
    expect(hasil.posisiKursor).toBe(hasil.teks.length);
  });

  it("memotong nilai di atas batas dan melaporkannya", () => {
    const diAtasBatas = String(MAX_PAYMENT_AMOUNT + 5);
    const hasil = formatNominalSaatKetik(diAtasBatas, diAtasBatas.length);
    expect(hasil.dipotong).toBe(true);
    expect(hasil.nilai).toBe(MAX_PAYMENT_AMOUNT);
  });

  it("tidak menandai pemotongan untuk nilai yang masih di bawah batas", () => {
    expect(formatNominalSaatKetik("75000", 5).dipotong).toBe(false);
  });

  it("menangani posisi kursor yang melebihi panjang teks", () => {
    const hasil = formatNominalSaatKetik("750", 99);
    expect(hasil.teks).toBe("750");
    expect(hasil.posisiKursor).toBe(3);
  });

  it("mengembalikan kursor 0 untuk kolom kosong", () => {
    const hasil = formatNominalSaatKetik("", 0);
    expect(hasil).toEqual({ teks: "", posisiKursor: 0, nilai: 0, dipotong: false });
  });
});

describe("pesanNominal", () => {
  it("diam saat kolom kosong", () => {
    expect(pesanNominal(0).jenis).toBe("kosong");
    expect(pesanNominal(0).pesan).toBe("");
  });

  it("memberi tanda tersimpan bila diminta dan nilainya sah", () => {
    const hasil = pesanNominal(75000, { tersimpan: true });
    expect(hasil.jenis).toBe("sah");
    expect(hasil.pesan).toContain("Tersimpan");
  });

  it("tidak memberi tanda tersimpan bila belum diminta", () => {
    expect(pesanNominal(75000).pesan).toBe("");
  });

  it("memberi pesan saat nilainya melampaui batas", () => {
    const hasil = pesanNominal(MAX_PAYMENT_AMOUNT + 1);
    expect(hasil.jenis).toBe("tidak-sah");
    expect(hasil.pesan).toContain("paling besar");
  });

  it("memberi pesan tersendiri saat nilai dipotong", () => {
    const hasil = pesanNominal(MAX_PAYMENT_AMOUNT, { dipotong: true });
    expect(hasil.jenis).toBe("dipotong");
    expect(hasil.pesan).toContain("Dipotong");
  });

  it("memprioritaskan pesan tidak sah di atas tanda tersimpan", () => {
    const hasil = pesanNominal(MAX_PAYMENT_AMOUNT + 1, { tersimpan: true });
    expect(hasil.jenis).toBe("tidak-sah");
  });
});
