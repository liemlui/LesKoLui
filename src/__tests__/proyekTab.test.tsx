/**
 * Pelacak Proyek tab Proyek (G3-06 butir 6, 7, dan 8).
 *
 * Butir 6 meminta pelacak ini **tampil untuk semua kurikulum**, bukan hanya IB.
 * Sebelum Fase A komponennya memuat `if (!isIb) return null` di baris 38-39,
 * sehingga tab Proyek kosong total bagi murid non-IB — dan karena IaEeTracker
 * tidak punya satu pun tes saat itu, tidak ada yang menangkapnya.
 *
 * Tes ini menutup celah itu: yang diperiksa adalah hal yang bisa dibuktikan dari
 * markup statis — apakah ia merender sama sekali, apa yang tampil, dan bagaimana
 * keadaan proyek dibaca. Perilaku klik tidak diklaim di sini.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import IaEeTracker from "../screens/studentDetail/IaEeTracker";
import type { IaEeProject, Student } from "../db/types";

const noop = () => {};

function student(over: Partial<Student> = {}): Student {
  return {
    id: "s1",
    name: "Bella Sari",
    level: "IBDP",
    curriculum: "IB DP",
    subjects: ["Mathematics"],
    parentContact: { name: "Ibu Sari", phone: "0812" },
    hourlyRate: 300_000,
    active: true,
    enrolledAt: "2025-01-01",
    ...over,
  };
}

function project(over: Partial<IaEeProject> & { id: string }): IaEeProject {
  return {
    studentId: "s1",
    type: "IA",
    subject: "Physics",
    title: "Eksperimen bandul",
    milestones: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

const render = (s: Student, projects: IaEeProject[] = []) =>
  renderToStaticMarkup(<IaEeTracker student={s} projects={projects} notify={noop} />);

describe("butir 6 — tab Proyek tampil untuk semua kurikulum", () => {
  it("merender untuk murid IB DP", () => {
    expect(render(student())).toContain("Proyek");
  });

  it("merender untuk murid IB MYP", () => {
    expect(render(student({ level: "MYP", curriculum: "IB MYP" }))).toContain("Proyek");
  });

  it("merender untuk murid NON-IB — gerbang `isIb` sudah tidak ada", () => {
    // Ini regresi yang dulu terjadi: `if (!isIb) return null` membuat tab Proyek
    // kosong untuk sembilan murid non-IB.
    for (const curriculum of ["Cambridge IGCSE", "Cambridge A Level", "AP", "National", "Custom"] as const) {
      const html = render(student({ level: "IGCSE", curriculum }));
      expect(html, `kurikulum ${curriculum} tidak merender pelacak`).toContain("Proyek");
      expect(html, `kurikulum ${curriculum} merender kosong`).not.toBe("");
    }
  });

  it("menjelaskan kegunaannya, bukan hanya berjudul", () => {
    const html = render(student({ curriculum: "National", level: "SMA" }));
    expect(html).toContain("Tugas jangka panjang");
    expect(html).toContain("eksperimen");
    expect(html).toContain("tugas internal");
  });

  it("memberi contoh yang berguna saat belum ada proyek, bukan tab kosong", () => {
    const html = render(student({ curriculum: "National", level: "SMA" }), []);
    expect(html).toContain("Belum ada proyek untuk murid ini");
    expect(html).toContain("Contoh yang bisa dilacak");
    expect(html).toContain("+ Proyek");
  });
});

describe("butir 8 — keadaan proyek dibaca dari milestone", () => {
  it("menyebut proyek tanpa milestone apa adanya, bukan menebak keadaannya", () => {
    const html = render(student(), [project({ id: "p1" })]);
    expect(html).toContain("Belum ada milestone");
    expect(html).toContain("0%");
  });

  it("menghitung kemajuan sebagian beserta penyebutnya", () => {
    const html = render(student(), [
      project({
        id: "p1",
        milestones: [
          { id: "m1", title: "Proposal", status: "done" },
          { id: "m2", title: "Analisis", status: "pending" },
        ],
      }),
    ]);
    expect(html).toContain("1/2 milestone");
    expect(html).toContain("50%");
  });

  it("menyebut selesai hanya bila semua milestone selesai", () => {
    const html = render(student(), [
      project({
        id: "p1",
        milestones: [
          { id: "m1", title: "Proposal", status: "done" },
          { id: "m2", title: "Submit", status: "done" },
        ],
      }),
    ]);
    expect(html).toContain("2/2 milestone · selesai");
    expect(html).toContain("100%");
  });
});

describe("butir 7 — jenis proyek", () => {
  it("menampilkan jenis yang dikenal dengan label pendeknya", () => {
    const html = render(student(), [
      project({ id: "p1", type: "IA" }),
      project({ id: "p2", type: "EE", subject: "English A", title: "Esai riset" }),
      project({ id: "p3", type: "PP", subject: "Personal Project", title: "Proyek pribadi" }),
    ]);
    expect(html).toContain(">IA<");
    expect(html).toContain(">EE<");
    expect(html).toContain(">PP<");
  });

  it("menampilkan jenis bebas dengan label 'Proyek', bukan kosong", () => {
    const html = render(student({ curriculum: "National", level: "SMA" }), [
      project({ id: "p1", type: "OTHER", subject: "Eksperimen", title: "Percobaan enzim" }),
    ]);
    expect(html).toContain(">Proyek<");
    expect(html).toContain("Percobaan enzim");
  });

  it("menampilkan jenis asing apa adanya, tanpa melempar galat", () => {
    // Data dari backup lama atau bentuk baru di masa depan tidak boleh membuat
    // seluruh tab gagal dirender.
    const html = render(student(), [
      project({ id: "p1", type: "SOMETHING_NEW" as IaEeProject["type"], title: "Proyek masa depan" }),
    ]);
    expect(html).toContain("SOMETHING_NEW");
    expect(html).toContain("Proyek masa depan");
  });
});

describe("tenggat proyek", () => {
  it("menyebut tenggat beserta keadaannya", () => {
    const html = render(student(), [project({ id: "p1", deadline: "2026-06-20" })]);
    // Tanpa `hariIni` yang disuntikkan, komponen memakai tanggal mesin — jadi yang
    // diperiksa hanya bahwa polanya muncul, bukan angkanya.
    expect(html).toMatch(/\d+h (lagi|terlambat)/);
  });

  it("tidak menyebut tenggat bila proyeknya tidak punya", () => {
    expect(render(student(), [project({ id: "p1" })])).not.toMatch(/\d+h lagi/);
  });
});
