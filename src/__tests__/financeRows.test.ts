import { describe, expect, it } from "vitest";
import {
  buildTagihanRows,
  sortTagihanRows,
  barisBelumLunas,
  hitungBarisButuhAksi,
  type BarisTagihan,
} from "../lib/financeRows";
import type { Payment, Session, Student } from "../db/types";
import type { SessionCountBillingProgress } from "../db/repos/paymentRepo";

const HARI_INI = "2026-10-07";

function makeStudent(id: string, overrides: Partial<Student> = {}): Student {
  return {
    id,
    name: `Murid ${id}`,
    level: "IBDP",
    subjects: [],
    parentContact: { phone: "08123456789" },
    hourlyRate: 200_000,
    active: true,
    enrolledAt: "2026-01-01",
    ...overrides,
  };
}

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

function makeSession(id: string, date: string, studentId = "s1"): Session {
  return {
    id,
    studentId,
    date,
    durationHours: 1.5,
    subjects: ["Matematika"],
    shortNote: "",
    status: "DONE",
    rateSnapshot: 200_000,
    cost: 300_000,
    createdAt: date,
    updatedAt: date,
  };
}

function makeProgress(
  overrides: Partial<SessionCountBillingProgress> = {},
): SessionCountBillingProgress {
  return {
    studentId: "s1",
    studentName: "Murid s1",
    targetCount: 8,
    unbilledCount: 8,
    readyBatchCount: 1,
    nextBatchSessions: [makeSession("ses-1", "2026-08-03"), makeSession("ses-2", "2026-08-10")],
    nextBatchTotal: 2_400_000,
    nextBatchHours: 3,
    ...overrides,
  };
}

const LAPORAN_FINAL = {
  id: "r1",
  studentId: "s1",
  month: "2026-09",
  totalCost: 1_200_000,
  status: "confirmed" as const,
  billingMode: "monthly" as const,
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
};

describe("buildTagihanRows", () => {
  // T1
  it("membuat baris siap-ditagih dari laporan final yang belum punya invoice", () => {
    const rows = buildTagihanRows({
      payments: [],
      students: [makeStudent("s1")],
      reports: [LAPORAN_FINAL],
      packages: [],
      hariIni: HARI_INI,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].asal).toBe("laporan");
    expect(rows[0].keadaan).toBe("siap-ditagih");
    expect(rows[0].amount).toBe(1_200_000);
    expect(rows[0].mode).toContain("Laporan");
    expect(rows[0].mode).toContain("September 2026");
    expect(rows[0].refs.reportId).toBe("r1");
    // Belum diterbitkan → belum punya jatuh tempo dan belum punya umur.
    expect(rows[0].dueAt).toBeUndefined();
    expect(rows[0].umurHari).toBeUndefined();
  });

  // T2
  it("tidak menampilkan laporan draft sebagai siap-ditagih", () => {
    const rows = buildTagihanRows({
      payments: [],
      students: [makeStudent("s1")],
      reports: [{ ...LAPORAN_FINAL, status: "draft" }],
      packages: [],
      hariIni: HARI_INI,
    });

    expect(rows).toHaveLength(0);
  });

  it("mengabaikan laporan final bernominal nol atau ber-mode session_count", () => {
    const rows = buildTagihanRows({
      payments: [],
      students: [makeStudent("s1")],
      reports: [
        { ...LAPORAN_FINAL, id: "r-nol", totalCost: 0 },
        { ...LAPORAN_FINAL, id: "r-paket", billingMode: "session_count" },
      ],
      packages: [],
      hariIni: HARI_INI,
    });

    expect(rows).toHaveLength(0);
  });

  // T3
  it("tidak menggandakan baris laporan yang invoice-nya sudah ada", () => {
    const rows = buildTagihanRows({
      payments: [makePayment("p1", { reportId: "r1", month: "2026-09" })],
      students: [makeStudent("s1")],
      reports: [LAPORAN_FINAL],
      packages: [],
      hariIni: HARI_INI,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].asal).toBe("terbit");
    expect(rows[0].refs.paymentId).toBe("p1");
  });

  it("menghitung ulang badge 'siap ditagih' persis seperti Payments.tsx versi tab", () => {
    // Dua laporan final tanpa invoice + satu laporan final yang invoice-nya ada
    // + satu paket siap → badge = 3 (dua laporan + satu paket). Invoice yang
    // sudah terbit dan belum jatuh tempo TIDAK ikut dihitung "butuh aksi".
    const rows = buildTagihanRows({
      payments: [makePayment("p1", { reportId: "r-sudah", dueAt: "2026-11-01", month: "2026-10" })],
      students: [makeStudent("s1")],
      reports: [
        { ...LAPORAN_FINAL, id: "r-a" },
        { ...LAPORAN_FINAL, id: "r-b" },
        { ...LAPORAN_FINAL, id: "r-sudah" },
      ],
      packages: [makeProgress()],
      hariIni: HARI_INI,
    });

    expect(hitungBarisButuhAksi(rows)).toBe(3);
    expect(rows.filter((row) => row.keadaan === "siap-ditagih")).toHaveLength(3);
  });

  it("tidak menghitung tagihan yang sudah terbit sebagai 'perlu diterbitkan'", () => {
    const rows = buildTagihanRows({
      payments: [makePayment("p-lewat", { dueAt: "2026-08-26", month: "2026-08" })],
      students: [makeStudent("s1")],
      reports: [LAPORAN_FINAL],
      packages: [],
      hariIni: HARI_INI,
    });

    // Dua baris belum lunas, tetapi hanya satu yang menunggu diterbitkan.
    expect(barisBelumLunas(rows)).toHaveLength(2);
    expect(hitungBarisButuhAksi(rows)).toBe(1);
  });

  // T4
  it("menandai invoice yang sudah lewat jatuh tempo beserta umurnya", () => {
    const rows = buildTagihanRows({
      payments: [makePayment("p1", { dueAt: "2026-08-26" })], // 42 hari sebelum 2026-10-07
      students: [makeStudent("s1")],
      reports: [],
      packages: [],
      hariIni: HARI_INI,
    });

    expect(rows[0].keadaan).toBe("lewat");
    expect(rows[0].umurHari).toBe(42);
    expect(rows[0].dueAt).toBe("2026-08-26");
  });

  it("memakai periodEnd sebagai jatuh tempo cadangan saat dueAt kosong", () => {
    const rows = buildTagihanRows({
      payments: [makePayment("p1", { periodEnd: "2026-09-30" })],
      students: [makeStudent("s1")],
      reports: [],
      packages: [],
      hariIni: HARI_INI,
    });

    expect(rows[0].dueAt).toBe("2026-09-30");
    expect(rows[0].keadaan).toBe("lewat");
    expect(rows[0].umurHari).toBe(7);
  });

  // T5
  it("tetap 'terkirim' bila jatuh tempo belum lewat", () => {
    const rows = buildTagihanRows({
      payments: [makePayment("p1", { dueAt: "2026-10-10" })],
      students: [makeStudent("s1")],
      reports: [],
      packages: [],
      hariIni: HARI_INI,
    });

    expect(rows[0].keadaan).toBe("terkirim");
    expect(rows[0].umurHari).toBeUndefined();
  });

  it("menghitung tepat di hari jatuh tempo sebagai belum lewat", () => {
    const rows = buildTagihanRows({
      payments: [makePayment("p1", { dueAt: HARI_INI })],
      students: [makeStudent("s1")],
      reports: [],
      packages: [],
      hariIni: HARI_INI,
    });

    expect(rows[0].keadaan).toBe("terkirim");
  });

  // T6
  it("menandai invoice lunas dan mempersempit aksinya", () => {
    const rows = buildTagihanRows({
      payments: [makePayment("p1", { status: "PAID", paidAt: "2026-09-20", dueAt: "2026-09-15" })],
      students: [makeStudent("s1")],
      reports: [],
      packages: [],
      hariIni: HARI_INI,
    });

    expect(rows[0].keadaan).toBe("lunas");
    // Dibayar terlambat pun tidak dihitung "lewat": yang lunas bukan piutang.
    expect(rows[0].umurHari).toBeUndefined();
    expect(rows[0].aksi).toEqual(["rincian"]);
  });

  it("membedakan tagihan manual dari tagihan yang diterbitkan sistem", () => {
    const rows = buildTagihanRows({
      payments: [
        makePayment("p-manual", { source: "manual", dueAt: "2026-10-01" }),
        makePayment("p-auto", { source: "auto", dueAt: "2026-10-01" }),
      ],
      students: [makeStudent("s1")],
      reports: [],
      packages: [],
      hariIni: HARI_INI,
    });

    expect(rows.find((r) => r.refs.paymentId === "p-manual")?.asal).toBe("manual");
    expect(rows.find((r) => r.refs.paymentId === "p-manual")?.mode).toBe("Tagihan manual");
    expect(rows.find((r) => r.refs.paymentId === "p-auto")?.asal).toBe("terbit");
    // Nominal manual tidak pernah dihitung ulang mesin — apa adanya dari DB.
    expect(rows.find((r) => r.refs.paymentId === "p-manual")?.amount).toBe(400_000);
  });

  // T7
  it("membuat satu baris paket per murid saat batch paketnya siap", () => {
    const rows = buildTagihanRows({
      payments: [],
      students: [makeStudent("s1")],
      reports: [],
      packages: [makeProgress()],
      hariIni: HARI_INI,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].asal).toBe("paket");
    expect(rows[0].keadaan).toBe("siap-ditagih");
    expect(rows[0].amount).toBe(2_400_000);
    expect(rows[0].mode).toContain("Paket");
    expect(rows[0].mode).toContain("8");
    expect(rows[0].refs.sessionIds).toEqual(["ses-1", "ses-2"]);
  });

  it("tidak menampilkan paket yang batch-nya belum lengkap", () => {
    const rows = buildTagihanRows({
      payments: [],
      students: [makeStudent("s1")],
      reports: [],
      packages: [makeProgress({ readyBatchCount: 0, unbilledCount: 3, nextBatchTotal: 0 })],
      hariIni: HARI_INI,
    });

    expect(rows).toHaveLength(0);
  });

  it("menampilkan paket penutup saat kebijakan tagihan sedang beralih", () => {
    const rows = buildTagihanRows({
      payments: [],
      students: [makeStudent("s1")],
      reports: [],
      packages: [makeProgress({
        readyBatchCount: 0,
        unbilledCount: 3,
        pendingBillingPolicy: "monthly",
        targetCount: 8,
        nextBatchSessions: [makeSession("ses-1", "2026-08-03")],
        nextBatchTotal: 900_000,
      })],
      hariIni: HARI_INI,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].asal).toBe("paket");
    expect(rows[0].keadaan).toBe("siap-ditagih");
    // Nominal batch penutup = jumlah biaya sesi yang benar-benar ditagih,
    // bukan tarif dikali target paket.
    expect(rows[0].amount).toBe(900_000);
    expect(rows[0].mode).toContain("Paket 8");
    expect(rows[0].cakupan).toContain("3 Agustus 2026");
  });

  // T8
  it("tetap menampilkan murid nonaktif dengan nama historisnya", () => {
    const rows = buildTagihanRows({
      payments: [
        makePayment("p1", { studentId: "s-lama", dueAt: "2026-08-01" }),
        makePayment("p2", { studentId: "s-hilang", dueAt: "2026-08-01" }),
      ],
      students: [makeStudent("s-lama", { name: "Budi Santoso", active: false })],
      reports: [],
      packages: [],
      hariIni: HARI_INI,
    });

    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.studentId === "s-lama")?.studentName).toBe("Budi Santoso");
    // Murid yang benar-benar tidak ada di tabel tetap tampil sebagai baris,
    // bukan hilang — uang yang belum masuk tidak boleh menghilang dari daftar.
    expect(rows.find((r) => r.studentId === "s-hilang")?.studentName).toBe("(dihapus)");
  });

  // T9
  it("mengurutkan lewat → siap-ditagih → terkirim → lunas", () => {
    const rows = buildTagihanRows({
      payments: [
        makePayment("p-lunas", { status: "PAID", paidAt: "2026-09-10", dueAt: "2026-09-01" }),
        makePayment("p-terkirim-jauh", { dueAt: "2026-10-20", month: "2026-10" }),
        makePayment("p-terkirim-dekat", { dueAt: "2026-10-09", month: "2026-10" }),
        makePayment("p-lewat-muda", { dueAt: "2026-10-01", month: "2026-10" }),
        makePayment("p-lewat-tua", { dueAt: "2026-07-01", month: "2026-07" }),
      ],
      students: [makeStudent("s1")],
      reports: [
        { ...LAPORAN_FINAL, id: "r-kecil", totalCost: 100_000 },
        { ...LAPORAN_FINAL, id: "r-besar", totalCost: 5_000_000 },
      ],
      packages: [],
      hariIni: HARI_INI,
    });

    expect(rows.map((r) => r.refs.paymentId ?? r.refs.reportId)).toEqual([
      "p-lewat-tua",       // lewat, umur terbesar
      "p-lewat-muda",
      "r-besar",           // siap-ditagih, nominal terbesar dulu
      "r-kecil",
      "p-terkirim-dekat",  // terkirim, jatuh tempo terdekat dulu
      "p-terkirim-jauh",
      "p-lunas",
    ]);
  });

  it("sortTagihanRows tidak mengubah daftar aslinya", () => {
    const rows: BarisTagihan[] = [
      {
        key: "a", studentId: "s1", studentName: "A", amount: 1, asal: "terbit", keadaan: "terkirim",
        mode: "", cakupan: "", refs: {}, aksi: [],
      },
      {
        key: "b", studentId: "s1", studentName: "B", amount: 1, asal: "terbit", keadaan: "lewat",
        mode: "", cakupan: "", umurHari: 1, refs: {}, aksi: [],
      },
    ];

    const sorted = sortTagihanRows(rows);
    expect(sorted.map((r) => r.key)).toEqual(["b", "a"]);
    expect(rows.map((r) => r.key)).toEqual(["a", "b"]);
  });
});

describe("barisBelumLunas", () => {
  it("membuang baris lunas dan menyisakan yang masih menunggu", () => {
    const rows = buildTagihanRows({
      payments: [
        makePayment("p-lunas", { status: "PAID", paidAt: "2026-09-10" }),
        makePayment("p-terbuka", { dueAt: "2026-11-01", month: "2026-11" }),
      ],
      students: [makeStudent("s1")],
      reports: [LAPORAN_FINAL],
      packages: [],
      hariIni: HARI_INI,
    });

    const terbuka = barisBelumLunas(rows);
    expect(terbuka).toHaveLength(2);
    expect(terbuka.every((row) => row.keadaan !== "lunas")).toBe(true);
  });
});
