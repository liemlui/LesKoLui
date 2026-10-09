import { describe, it, expect } from "vitest";
import { studentActions, attentionCount, relativeDayLabel } from "../lib/studentActions";
import type { StudentActionsInput } from "../lib/studentActions";

const TODAY = "2026-06-15";

function base(over: Partial<StudentActionsInput> = {}): StudentActionsInput {
  return {
    today: TODAY,
    scheduled: [],
    doneSessions: [],
    payments: [],
    followUps: [],
    ...over,
  };
}

const sched = (date: string, time = "16:00", status = "SCHEDULED") =>
  ({ id: `s-${date}-${time}`, date, time, durationHours: 2, status });

const done = (date: string, needsWork?: string) =>
  ({ id: `d-${date}`, date, needsWork });

describe("relativeDayLabel", () => {
  it("menyebut hari ini, besok, lusa, dan jarak hari", () => {
    expect(relativeDayLabel(TODAY, "2026-06-15")).toBe("Hari ini");
    expect(relativeDayLabel(TODAY, "2026-06-16")).toBe("Besok");
    expect(relativeDayLabel(TODAY, "2026-06-17")).toBe("Lusa");
    expect(relativeDayLabel(TODAY, "2026-06-20")).toBe("5 hari lagi");
  });

  it("menyebut keterlambatan dengan arah yang benar", () => {
    expect(relativeDayLabel(TODAY, "2026-06-12")).toBe("3 hari terlambat");
    expect(relativeDayLabel(TODAY, "2026-06-14")).toBe("1 hari terlambat");
  });

  it("mengembalikan tanggalnya apa adanya bila tidak bisa diurai", () => {
    expect(relativeDayLabel(TODAY, "bukan-tanggal")).toBe("bukan-tanggal");
  });
});

describe("Perlu Tindakan — murid tanpa apa-apa", () => {
  it("mengembalikan daftar kosong, bukan kartu berisi kekosongan", () => {
    expect(studentActions(base())).toEqual([]);
    expect(attentionCount([])).toBe(0);
  });
});

describe("Perlu Tindakan — jadwal", () => {
  it("menyebut sesi hari ini sebagai sesi hari ini", () => {
    const a = studentActions(base({ scheduled: [sched("2026-06-15")] }));
    expect(a).toHaveLength(1);
    expect(a[0].title).toBe("Sesi hari ini");
    expect(a[0].detail).toContain("16:00");
    expect(a[0].tone).toBe("warn");
  });

  it("mengambil jadwal terdekat, bukan yang pertama di daftar", () => {
    const a = studentActions(base({
      scheduled: [sched("2026-06-20"), sched("2026-06-16"), sched("2026-06-25")],
    }));
    expect(a[0].detail).toContain("Besok");
    expect(a[0].detail).toContain("16:00");
    expect(a[0].detail).not.toContain("20");
  });

  it("menandai jadwal terlewat sebagai bahaya dan mendahulukannya", () => {
    const a = studentActions(base({
      scheduled: [sched("2026-06-16"), sched("2026-06-12")],
    }));
    expect(a[0].tone).toBe("danger");
    expect(a[0].title).toContain("sudah lewat");
    expect(a[0].detail).toContain("3 hari terlambat");
    // Jadwal berikutnya tetap disebut setelahnya.
    expect(a[1].title).toBe("Jadwal berikutnya");
  });

  it("menghitung semua jadwal terlewat, bukan hanya yang tertua", () => {
    const a = studentActions(base({
      scheduled: [sched("2026-06-10"), sched("2026-06-12"), sched("2026-06-14")],
    }));
    expect(a[0].title).toBe("Ada 3 jadwal yang sudah lewat");
  });

  it("mengabaikan sesi yang bukan SCHEDULED", () => {
    const a = studentActions(base({ scheduled: [sched("2026-06-16", "16:00", "DONE")] }));
    expect(a).toEqual([]);
  });
});

describe("Perlu Tindakan — pekerjaan rumah / hal yang perlu diulang", () => {
  it("mengambil needsWork dari sesi terbaru yang benar-benar mengisinya", () => {
    const a = studentActions(base({
      doneSessions: [
        done("2026-06-14"),                        // terbaru, tapi kosong
        done("2026-06-10", "Latihan vektor"),
        done("2026-06-01", "Trigonometri"),
      ],
    }));
    const pr = a.find((x) => x.type === "pr");
    expect(pr).toBeDefined();
    expect(pr!.detail).toContain("Latihan vektor");
    expect(pr!.detail).toContain("2026-06-10");
  });

  it("menyebut penyebutnya: berapa dari berapa sesi mencatat hal yang perlu diulang", () => {
    const a = studentActions(base({
      doneSessions: [done("2026-06-10", "Vektor"), done("2026-06-01", "Aljabar"), done("2026-05-20")],
    }));
    const pr = a.find((x) => x.type === "pr")!;
    expect(pr.detail).toContain("2 dari 3 sesi");
  });

  it("tidak memunculkan PR bila tidak ada satu pun sesi mengisinya", () => {
    const a = studentActions(base({ doneSessions: [done("2026-06-10"), done("2026-06-01")] }));
    expect(a.find((x) => x.type === "pr")).toBeUndefined();
  });
});

describe("Perlu Tindakan — tagihan", () => {
  it("menyebut jumlah tagihan belum lunas", () => {
    const a = studentActions(base({
      payments: [{ id: "p1", status: "UNPAID" }, { id: "p2", status: "UNPAID" }, { id: "p3", status: "PAID" }],
    }));
    const t = a.find((x) => x.type === "tagihan")!;
    expect(t.title).toBe("2 tagihan belum lunas");
  });

  it("tidak menyebut tagihan yang sudah lunas", () => {
    const a = studentActions(base({ payments: [{ id: "p1", status: "PAID" }] }));
    expect(a.find((x) => x.type === "tagihan")).toBeUndefined();
  });

  it("TIDAK pernah memuat nominal uang — gerbang uang tidak lewat sini", () => {
    const a = studentActions(base({
      payments: [{ id: "p1", status: "UNPAID" }],
      unbilledCount: 3,
    }));
    for (const act of a) {
      expect(`${act.title} ${act.detail}`).not.toMatch(/Rp|\d{1,3}\.\d{3}/);
    }
  });

  it("menyebut sesi yang belum masuk tagihan secara terpisah", () => {
    const a = studentActions(base({ unbilledCount: 4 }));
    expect(a[0].title).toBe("4 sesi belum masuk tagihan");
    expect(a[0].tone).toBe("info");
  });
});

describe("Perlu Tindakan — tindak lanjut", () => {
  it("menyebut jumlah dan yang paling lama", () => {
    const a = studentActions(base({
      followUps: [
        { id: "f1", text: "Kirim latihan", type: "send-resource", createdAt: "2026-06-02T00:00:00Z" },
        { id: "f2", text: "Ulang mekanika", type: "continue-topic", createdAt: "2026-06-01T00:00:00Z" },
      ],
    }));
    const f = a.find((x) => x.type === "tindak-lanjut")!;
    expect(f.title).toBe("2 tindak lanjut menunggu");
    expect(f.detail).toContain("Ulang mekanika");
  });

  it("memakai bentuk tunggal untuk satu tindak lanjut", () => {
    const a = studentActions(base({
      followUps: [{ id: "f1", text: "Kirim latihan", type: "send-resource", createdAt: "2026-06-02T00:00:00Z" }],
    }));
    expect(a.find((x) => x.type === "tindak-lanjut")!.title).toBe("1 tindak lanjut menunggu");
  });
});

describe("Perlu Tindakan — urutan dan hitungan perhatian", () => {
  it("mendahulukan jadwal terlewat di atas semuanya", () => {
    const a = studentActions(base({
      scheduled: [sched("2026-06-16"), sched("2026-06-12")],
      doneSessions: [done("2026-06-10", "Vektor")],
      payments: [{ id: "p1", status: "UNPAID" }],
      followUps: [{ id: "f1", text: "Kirim", type: "other", createdAt: "2026-06-02T00:00:00Z" }],
      unbilledCount: 1,
    }));
    expect(a[0].title).toContain("sudah lewat");
    expect(a.map((x) => x.type)).toEqual([
      "jadwal", "jadwal", "pr", "tagihan", "tagihan", "tindak-lanjut",
    ]);
  });

  it("menghitung hanya yang bahaya dan perlu perhatian", () => {
    const a = studentActions(base({
      scheduled: [sched("2026-06-12")],
      payments: [{ id: "p1", status: "UNPAID" }],
      unbilledCount: 2,
    }));
    // 1 danger (terlewat) + 1 warn (tagihan) = 2; yang info tidak dihitung.
    expect(attentionCount(a)).toBe(2);
  });
});
