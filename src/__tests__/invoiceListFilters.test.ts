import { describe, expect, it } from "vitest";
import {
  emptyIssuedMessage,
  emptyReadyReportsMessage,
  emptySessionCountMessage,
  filterSessionCountProgress,
  matchesStudentName,
} from "../screens/payments/invoiceListFilters";

/**
 * G3-02 fitur #4 (K-05) + #7 (K-07).
 *
 * Yang dijaga di sini adalah **klaim pesan kosong**, bukan tata letaknya:
 * "semua sudah diterbitkan" adalah pernyataan tentang data, dan pernyataan itu
 * salah kalau daftarnya kosong hanya karena pencarian. Kasus itu dulu tidak bisa
 * dibedakan karena daftar tidak dirender sama sekali saat kosong.
 */
describe("matchesStudentName", () => {
  it("teks kosong atau spasi saja meloloskan semua baris", () => {
    expect(matchesStudentName("Budi Santoso", "")).toBe(true);
    expect(matchesStudentName("Budi Santoso", "   ")).toBe(true);
  });

  it("tidak membedakan huruf besar/kecil dan mengabaikan spasi tepi", () => {
    expect(matchesStudentName("Budi Santoso", "budi")).toBe(true);
    expect(matchesStudentName("Budi Santoso", "  BUDI  ")).toBe(true);
    expect(matchesStudentName("Budi Santoso", "santoso")).toBe(true);
  });

  it("mencocokkan sebagian di tengah nama", () => {
    expect(matchesStudentName("Maria Kristina Wibowo", "kristina")).toBe(true);
  });

  it("murid yang sudah dihapus (nama undefined) tidak lolos pencarian", () => {
    expect(matchesStudentName(undefined, "budi")).toBe(false);
    expect(matchesStudentName(undefined, "")).toBe(true);
  });

  it("nama yang tidak memuat kata kunci ditolak", () => {
    expect(matchesStudentName("Budi Santoso", "andi")).toBe(false);
  });
});

describe("filterSessionCountProgress", () => {
  const rows = [
    { studentName: "Budi Santoso", studentId: "s1" },
    { studentName: "Andi Wijaya", studentId: "s2" },
    { studentName: "Budi Hartono", studentId: "s3" },
  ];

  it("tanpa kata kunci mengembalikan semua baris", () => {
    expect(filterSessionCountProgress(rows, "")).toHaveLength(3);
  });

  it("menyaring antrean paket memakai nama murid", () => {
    expect(filterSessionCountProgress(rows, "budi").map((r) => r.studentId)).toEqual(["s1", "s3"]);
  });

  it("tidak mengubah urutan asli baris yang lolos", () => {
    expect(filterSessionCountProgress(rows, "a").map((r) => r.studentId)).toEqual(["s1", "s2", "s3"]);
  });

  it("hasil kosong bila tidak ada yang cocok (bukan semua baris)", () => {
    expect(filterSessionCountProgress(rows, "zzz")).toEqual([]);
  });
});

describe("emptyIssuedMessage — satu pesan per keadaan filter", () => {
  it("tahap 'Siap ditagih' tanpa antrean: klaim tentang data", () => {
    expect(emptyIssuedMessage({
      invoiceStatusFilter: "ready", searchText: "", hasRows: false, hasMatchingRows: false,
      hasReadyData: false, hasAgingFilter: false,
    })).toBe("Semua laporan final sudah diterbitkan.");
  });

  it("tahap 'Siap ditagih' padahal ada antrean: bukan klaim 'semua sudah diterbitkan'", () => {
    const message = emptyIssuedMessage({
      invoiceStatusFilter: "ready", searchText: "", hasRows: false, hasMatchingRows: false,
      hasReadyData: true, hasAgingFilter: false,
    });
    expect(message).not.toContain("Semua laporan final sudah diterbitkan");
    expect(message).toContain("antrean");
  });

  it("pencarian tanpa hasil menyebut kata kuncinya, bukan 'semua sudah diterbitkan'", () => {
    const message = emptyIssuedMessage({
      invoiceStatusFilter: "unpaid", searchText: "zzz", hasRows: true, hasMatchingRows: false,
      hasReadyData: false, hasAgingFilter: false,
    });
    expect(message).toContain("zzz");
    expect(message).not.toContain("Semua laporan final sudah diterbitkan");
  });

  it("belum ada tagihan sama sekali dibedakan dari tidak cocok filter", () => {
    expect(emptyIssuedMessage({
      invoiceStatusFilter: "unpaid", searchText: "", hasRows: false, hasMatchingRows: false,
      hasReadyData: false, hasAgingFilter: false,
    })).toBe("Belum ada tagihan yang diterbitkan.");
  });

  it("saringan chip umur piutang punya pesannya sendiri", () => {
    expect(emptyIssuedMessage({
      invoiceStatusFilter: "unpaid", searchText: "", hasRows: true, hasMatchingRows: true,
      hasReadyData: false, hasAgingFilter: true,
    })).toContain("umur piutang");
  });

  it("kombinasi tahap dan asal yang tidak cocok tetap dijelaskan", () => {
    expect(emptyIssuedMessage({
      invoiceStatusFilter: "paid", searchText: "", hasRows: true, hasMatchingRows: true,
      hasReadyData: false, hasAgingFilter: false,
    })).toBe("Tidak ada tagihan yang cocok dengan langkah dan asal ini.");
  });

  it("tanpa chip umur piutang, pesan tidak menuduh saringan umur", () => {
    const message = emptyIssuedMessage({
      invoiceStatusFilter: "unpaid", searchText: "", hasRows: true, hasMatchingRows: false,
      hasReadyData: false, hasAgingFilter: false,
    });
    expect(message).not.toContain("umur piutang");
  });
});

describe("emptyReadyReportsMessage", () => {
  it("tanpa pencarian: belum ada laporan final", () => {
    expect(emptyReadyReportsMessage("", false)).toBe("Belum ada laporan final yang menunggu diterbitkan.");
  });

  it("pencarian aktif menyebut kata kuncinya", () => {
    expect(emptyReadyReportsMessage("andi", true)).toContain("andi");
  });

  it("pencarian aktif tetapi memang tidak ada data: bukan salah pencarian", () => {
    const message = emptyReadyReportsMessage("andi", false);
    expect(message).toBe("Belum ada laporan final yang menunggu diterbitkan.");
  });
});

describe("emptySessionCountMessage", () => {
  it("belum ada murid ber-paket dibedakan dari pencarian tanpa hasil", () => {
    expect(emptySessionCountMessage("", false)).toBe("Belum ada murid dengan aturan tagihan per pertemuan.");
    expect(emptySessionCountMessage("zzz", false)).toBe("Belum ada murid dengan aturan tagihan per pertemuan.");
  });

  it("pencarian tanpa hasil menyebut kata kuncinya", () => {
    const message = emptySessionCountMessage("zzz", true);
    expect(message).toContain("zzz");
    expect(message).toContain("per pertemuan");
  });
});
