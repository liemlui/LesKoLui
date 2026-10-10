import { describe, expect, it } from "vitest";
import type { Student } from "../db/types";
import {
  STUDENT_SORT_DEFAULT,
  STUDENT_SORT_OPTIONS,
  aktifSejakLabel,
  countAttention,
  filterStudents,
  kartuIdentitasBaris,
  listAttentionCount,
  matchesQuery,
  ringkasSesiBulanIni,
  sortStudents,
  studentSortLabel,
  type StudentListSignals,
} from "../lib/studentList";

/**
 * Butir 12 dan 13 G3-06 diuji di sini **tanpa DOM**: modul `studentList` sengaja
 * murni supaya aturan urutan, penyaringan, dan teks kartu bisa dibuktikan tanpa
 * merender layar.
 *
 * Data di bawah adalah **data contoh buatan tes**, bukan data murid sungguhan.
 */

function murid(partial: Partial<Student> & { id: string; name: string }): Student {
  return {
    level: "SMA",
    subjects: [],
    parentContact: { phone: "081200000000" },
    hourlyRate: 150_000,
    active: true,
    enrolledAt: "2026-01-05",
    ...partial,
  };
}

const ANDI = murid({ id: "s1", name: "Andi Pratama", curriculum: "Cambridge IGCSE", grade: "Grade 10", school: "SMA Tunas", enrolledAt: "2026-08-14" });
const BUDI = murid({ id: "s2", name: "Budi Santoso", curriculum: "IB DP", enrolledAt: "2025-03-02" });
const CITRA = murid({ id: "s3", name: "Citra Dewi", curriculum: "National", grade: "Kelas 8", enrolledAt: "2026-10-01" });
const DEDI = murid({ id: "s4", name: "Dedi Kurniawan", enrolledAt: "2024-11-20" });

const SEMUA = [ANDI, BUDI, CITRA, DEDI];

/** Sinyal contoh: jadwal dan perhatian dibuat eksplisit per tes. */
function sinyal(
  jadwal: Record<string, string | undefined> = {},
  perhatian: Record<string, number> = {},
): StudentListSignals {
  return {
    nextSessionDate: (id) => jadwal[id],
    attentionCount: (id) => perhatian[id] ?? 0,
  };
}

const nama = (list: readonly Student[]) => list.map((s) => s.name);

describe("urutan daftar murid (butir 12)", () => {
  it("Jadwal terdekat: yang punya jadwal lebih dulu, yang tidak punya di bawah urut nama", () => {
    const hasil = sortStudents(
      SEMUA,
      "jadwal",
      sinyal({ s3: "2026-10-12", s1: "2026-10-20" }),
    );
    expect(nama(hasil)).toEqual([
      "Citra Dewi",       // 2026-10-12
      "Andi Pratama",     // 2026-10-20
      "Budi Santoso",     // tanpa jadwal → urut nama
      "Dedi Kurniawan",
    ]);
  });

  it("Dua murid tanpa jadwal tidak bertukar posisi saat masukannya dibalik (deterministik)", () => {
    const a = sortStudents([BUDI, DEDI], "jadwal", sinyal());
    const b = sortStudents([DEDI, BUDI], "jadwal", sinyal());
    expect(nama(a)).toEqual(["Budi Santoso", "Dedi Kurniawan"]);
    expect(nama(b)).toEqual(nama(a));
  });

  it("Paling butuh perhatian: jumlahnya menurun, seri diputus jadwal terdekat lalu nama", () => {
    const hasil = sortStudents(
      SEMUA,
      "perhatian",
      sinyal({ s4: "2026-10-11" }, { s2: 3, s4: 3, s1: 1 }),
    );
    expect(nama(hasil)).toEqual([
      "Dedi Kurniawan",   // 3, jadwal 2026-10-11
      "Budi Santoso",     // 3, tanpa jadwal
      "Andi Pratama",     // 1
      "Citra Dewi",       // 0, tanpa jadwal → di bawah Andi karena 0 < 1
    ]);
  });

  it("Nama (A–Z)", () => {
    expect(nama(sortStudents(SEMUA, "nama", sinyal()))).toEqual([
      "Andi Pratama", "Budi Santoso", "Citra Dewi", "Dedi Kurniawan",
    ]);
  });

  it("Terbaru bergabung: enrolledAt terbaru lebih dulu", () => {
    expect(nama(sortStudents(SEMUA, "terbaru", sinyal()))).toEqual([
      "Citra Dewi",       // 2026-10-01
      "Andi Pratama",     // 2026-08-14
      "Budi Santoso",     // 2025-03-02
      "Dedi Kurniawan",   // 2024-11-20
    ]);
  });

  it("tidak mengubah larik masukan", () => {
    const masukan = [...SEMUA];
    sortStudents(masukan, "nama", sinyal());
    expect(nama(masukan)).toEqual(["Andi Pratama", "Budi Santoso", "Citra Dewi", "Dedi Kurniawan"]);
  });

  it("label urutan selalu ada, termasuk untuk kunci yang tidak dikenal", () => {
    expect(studentSortLabel(STUDENT_SORT_DEFAULT)).toBe("Jadwal terdekat");
    expect(studentSortLabel("perhatian")).toBe("Paling butuh perhatian");
    expect(studentSortLabel("tidak-ada" as never)).toBe(STUDENT_SORT_OPTIONS[0].label);
  });

  it("menawarkan empat urutan dan yang pertama adalah bawaan", () => {
    expect(STUDENT_SORT_OPTIONS).toHaveLength(4);
    expect(STUDENT_SORT_OPTIONS[0].key).toBe(STUDENT_SORT_DEFAULT);
  });
});

describe("penyaringan daftar murid (butir 12)", () => {
  it("pencarian nama tidak peka huruf besar-kecil dan spasi tepi", () => {
    expect(matchesQuery(ANDI, "  andi ")).toBe(true);
    expect(matchesQuery(ANDI, "ANDI")).toBe(true);
    expect(matchesQuery(ANDI, "")).toBe(true);
    expect(matchesQuery(ANDI, "Budi")).toBe(false);
  });

  it("filter 'butuh perhatian' hanya menyisakan murid yang punya sinyal", () => {
    const hasil = filterStudents(SEMUA, { onlyAttention: true }, sinyal({}, { s2: 1, s4: 2 }));
    expect(nama(hasil)).toEqual(["Budi Santoso", "Dedi Kurniawan"]);
  });

  it("pencarian dan filter bisa dipakai bersamaan", () => {
    const hasil = filterStudents(
      SEMUA,
      { query: "i", onlyAttention: true },
      sinyal({}, { s1: 1, s2: 1, s3: 1 }),
    );
    // "i" cocok untuk Andi/Citra/Budi (Dedi tidak), lalu disaring perhatian.
    expect(nama(hasil)).toEqual(["Andi Pratama", "Budi Santoso", "Citra Dewi"]);
  });

  it("hitungan perhatian dihitung dari daftar yang diberikan, bukan dari seluruh murid", () => {
    const sinyalUji = sinyal({}, { s1: 2, s3: 1 });
    expect(countAttention(SEMUA, sinyalUji)).toBe(2);
    expect(countAttention([ANDI], sinyalUji)).toBe(1);
    expect(countAttention([BUDI], sinyalUji)).toBe(0);
  });

  it("sinyal perhatian = tindak lanjut + tagihan belum lunas, dan tidak pernah negatif", () => {
    expect(listAttentionCount(2, 3)).toBe(5);
    expect(listAttentionCount(0, 0)).toBe(0);
    expect(listAttentionCount(-1, -1)).toBe(0);
  });
});

describe("teks kartu murid (butir 13)", () => {
  it("baris identitas memakai label PENDEK kurikulum, bukan label panjang", () => {
    expect(kartuIdentitasBaris(ANDI)).toBe("IGCSE · Grade 10 · SMA Tunas");
    expect(kartuIdentitasBaris(BUDI)).toBe("DP");
  });

  it("murid tanpa kurikulum, kelas, dan sekolah tidak mencetak 'undefined'", () => {
    expect(kartuIdentitasBaris(DEDI)).toBe("");
    expect(kartuIdentitasBaris({ ...DEDI, curriculum: "National" })).toBe("Nasional");
  });

  it("keterangan keanggotaan memakai bulan dan tahun", () => {
    expect(aktifSejakLabel("2026-08-14")).toBe("aktif sejak Agustus 2026");
    expect(aktifSejakLabel("2024-11-20")).toBe("aktif sejak November 2024");
  });

  it("tanggal kosong atau rusak tidak menghasilkan keterangan palsu", () => {
    expect(aktifSejakLabel("")).toBeUndefined();
    expect(aktifSejakLabel("14-08-2026")).toBeUndefined();
    expect(aktifSejakLabel(undefined as unknown as string)).toBeUndefined();
  });

  it("ringkasan sesi bulan ini menyebut jumlah sesi dan jam, tanpa nominal uang", () => {
    expect(ringkasSesiBulanIni({ count: 4, hours: 6 })).toBe("Bulan ini 4 sesi · 6j");
    expect(ringkasSesiBulanIni({ count: 0, hours: 0 })).toBe("Belum ada sesi bulan ini");
    expect(ringkasSesiBulanIni(undefined)).toBe("Belum ada sesi bulan ini");
    expect(ringkasSesiBulanIni({ count: 4, hours: 6 })).not.toMatch(/\bRp\b/);
  });
});
