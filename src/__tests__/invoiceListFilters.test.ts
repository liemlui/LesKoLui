import { describe, expect, it } from "vitest";
import {
  activeFilterChipAriaLabel,
  activeFilterChipLabel,
  activeInvoiceFilters,
  emptyIssuedMessage,
  emptyReadyReportsMessage,
  emptySessionCountMessage,
  filterSessionCountProgress,
  matchesStudentName,
  originFilterLabel,
  ORIGIN_FILTERS,
} from "../screens/payments/invoiceListFilters";
import { AGE_BUCKET_LABEL } from "../lib/finance";

/**
 * G3-02 fitur #4 (K-05) + #7 (K-07) + #6 (K-06).
 *
 * Yang dijaga di sini adalah **klaim pesan kosong**, bukan tata letaknya:
 * "semua sudah diterbitkan" adalah pernyataan tentang data, dan pernyataan itu
 * salah kalau daftarnya kosong hanya karena pencarian. Kasus itu dulu tidak bisa
 * dibedakan karena daftar tidak dirender sama sekali saat kosong.
 *
 * Sejak K-06 berkas ini juga menjaga **hitungan filter aktif**: chip "N filter
 * aktif · Hapus" adalah satu-satunya penanda bahwa daftar sedang disaring oleh
 * kontrol yang tersembunyi di balik panel "Filter lanjutan", jadi angka dan
 * namanya tidak boleh meleset.
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

describe("ORIGIN_FILTERS — satu sumber label asal invoice", () => {
  it("entri pertama wajib nilai netral 'semua'", () => {
    // Kalau nilai lain ada di depan, `activeInvoiceFilters()` akan menghitung
    // filter palsu pada keadaan awal — chip muncul padahal tidak ada saringan.
    expect(ORIGIN_FILTERS[0][0]).toBe("semua");
    expect(ORIGIN_FILTERS[0][1]).toBe("Semua");
  });

  it("label tiap nilai bisa dicari kembali dari nilainya", () => {
    for (const [key, label] of ORIGIN_FILTERS) {
      expect(originFilterLabel(key)).toBe(label);
    }
  });

  it("nilai tak dikenal dikembalikan apa adanya, bukan 'undefined'", () => {
    expect(originFilterLabel("tidak-dikenal")).toBe("tidak-dikenal");
  });

  it("label unik supaya chip tidak tampak kembar", () => {
    const labels = ORIGIN_FILTERS.map(([, label]) => label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("activeInvoiceFilters — saringan yang tersembunyi saat panel tertutup (K-06)", () => {
  it("tanpa saringan: tidak ada filter aktif", () => {
    expect(activeInvoiceFilters({ searchText: "", agingFilter: "all", originFilter: "semua" })).toEqual([]);
  });

  it("pencarian berisi spasi saja bukan filter", () => {
    expect(activeInvoiceFilters({ searchText: "   ", agingFilter: "all", originFilter: "semua" })).toEqual([]);
  });

  it("pencarian aktif menyebut kata kuncinya (spasi tepi dipangkas)", () => {
    const filters = activeInvoiceFilters({ searchText: "  Budi ", agingFilter: "all", originFilter: "semua" });
    expect(filters).toHaveLength(1);
    expect(filters[0].key).toBe("search");
    expect(filters[0].label).toContain("Budi");
    expect(filters[0].label).not.toContain("  ");
  });

  it("umur piutang memakai label bucket dari lib/finance, bukan label karangan", () => {
    const filters = activeInvoiceFilters({ searchText: "", agingFilter: "31-60", originFilter: "semua" });
    expect(filters).toHaveLength(1);
    expect(filters[0].key).toBe("aging");
    expect(filters[0].label).toContain(AGE_BUCKET_LABEL["31-60"]);
  });

  it("asal invoice memakai label yang sama dengan chip di layar", () => {
    const filters = activeInvoiceFilters({ searchText: "", agingFilter: "all", originFilter: "report" });
    expect(filters).toHaveLength(1);
    expect(filters[0].key).toBe("origin");
    expect(filters[0].label).toBe(`asal ${originFilterLabel("report").toLowerCase()}`);
  });

  it("kombinasi penuh berhenti di tiga filter dengan urutan tetap", () => {
    const filters = activeInvoiceFilters({ searchText: "budi", agingFilter: ">60", originFilter: "manual" });
    expect(filters.map((filter) => filter.key)).toEqual(["search", "aging", "origin"]);
  });

  it("setiap saringan yang aktif menambah tepat satu filter", () => {
    const dasar = { searchText: "", agingFilter: "all", originFilter: "semua" } as const;
    expect(activeInvoiceFilters({ ...dasar, searchText: "a" })).toHaveLength(1);
    expect(activeInvoiceFilters({ ...dasar, agingFilter: "0-30" })).toHaveLength(1);
    expect(activeInvoiceFilters({ ...dasar, originFilter: "package" })).toHaveLength(1);
  });
});

describe("activeFilterChipLabel — teks chip yang terlihat", () => {
  it("nol mengembalikan null supaya chip tidak dirender sama sekali", () => {
    // Chip "0 filter aktif" akan menuntut tutor menekan tombol Hapus yang tidak
    // menghapus apa pun.
    expect(activeFilterChipLabel(0)).toBeNull();
  });

  it("memakai kata 'filter aktif' seperti yang diminta spek", () => {
    expect(activeFilterChipLabel(1)).toBe("1 filter aktif");
    expect(activeFilterChipLabel(3)).toBe("3 filter aktif");
  });

  it("angka negatif diperlakukan seperti nol", () => {
    expect(activeFilterChipLabel(-1)).toBeNull();
  });
});

describe("activeFilterChipAriaLabel — nama filter, bukan hanya jumlahnya", () => {
  const filters = activeInvoiceFilters({ searchText: "budi", agingFilter: ">60", originFilter: "manual" });

  it("menyebut jumlah dan nama tiap filter", () => {
    const label = activeFilterChipAriaLabel(filters);
    expect(label).toContain("3 filter aktif");
    expect(label).toContain("budi");
    expect(label).toContain(AGE_BUCKET_LABEL[">60"]);
    expect(label).toContain("manual");
  });

  it("menyebut aksi yang akan terjadi saat chip ditekan", () => {
    expect(activeFilterChipAriaLabel(filters)).toContain("Hapus semua filter");
  });

  it("teks yang terlihat tetap pendek walau kata kuncinya panjang", () => {
    const panjang = activeInvoiceFilters({
      searchText: "a".repeat(60), agingFilter: "all", originFilter: "semua",
    });
    const terlihat = activeFilterChipLabel(panjang.length);
    expect(terlihat).toBe("1 filter aktif");
    expect(terlihat).not.toContain("aaaa");
    expect(activeFilterChipAriaLabel(panjang).length).toBeGreaterThan(60);
  });
});
