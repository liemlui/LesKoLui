/**
 * Isian nilai rapor (G3-06 butir 5).
 *
 * Tiga lapisan yang diperiksa, semuanya tanpa DOM (repo ini tidak memasang
 * `jsdom` maupun `@testing-library/*`):
 * 1. aturan murni di `raporForm.ts`,
 * 2. markup formulir presentasional `NilaiRaporForm.tsx`,
 * 3. markup wadah `NilaiRaporIsian.tsx` dalam keadaan tertutup.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NilaiRaporForm from "../screens/studentDetail/NilaiRaporForm";
import NilaiRaporIsian from "../screens/studentDetail/NilaiRaporIsian";
import { subjectsFor, gradesFromDraft, draftFromSaved, filledGradeCount } from "../screens/studentDetail/raporForm";
import { currentSemester, semesterLabel, semesterOptions } from "../lib/engagement";
import type { RaporGrade, Student } from "../db/types";

const noop = () => {};

const STUDENT: Student = {
  id: "s1",
  name: "Bella Sari",
  level: "IBDP",
  subjects: ["Mathematics", "Physics"],
  parentContact: { name: "Ibu Sari", phone: "0812" },
  hourlyRate: 300_000,
  active: true,
  enrolledAt: "2025-01-01",
};

const GRADE: RaporGrade = {
  id: "g1",
  studentId: "s1",
  semester: "2025/2026-S1",
  grades: [
    { subject: "Mathematics", grade: "6" },
    { subject: "Physics", grade: "5" },
  ],
  notes: "dari sekolah",
  createdAt: "2026-01-05T00:00:00.000Z",
};

describe("raporForm — mapel yang diisikan", () => {
  it("memakai urutan profil lebih dulu", () => {
    expect(subjectsFor(["Mathematics", "Physics"], undefined)).toEqual(["Mathematics", "Physics"]);
  });

  it("mempertahankan mapel tersimpan yang sudah tidak ada di profil", () => {
    // Nilai lama tidak boleh menghilang hanya karena profilnya berubah.
    const existing = { grades: [{ subject: "Chemistry", grade: "4" }] };
    expect(subjectsFor(["Mathematics"], existing)).toEqual(["Mathematics", "Chemistry"]);
  });

  it("tidak menggandakan mapel yang ada di profil dan tersimpan", () => {
    const existing = { grades: [{ subject: "Mathematics", grade: "6" }] };
    expect(subjectsFor(["Mathematics", "Physics"], existing)).toEqual(["Mathematics", "Physics"]);
  });

  it("membuang mapel kosong dan spasi berlebih", () => {
    expect(subjectsFor(["  Mathematics  ", "", "   "], undefined)).toEqual(["Mathematics"]);
  });

  it("mengembalikan daftar kosong bila tidak ada sumber apa pun", () => {
    expect(subjectsFor([], undefined)).toEqual([]);
  });
});

describe("raporForm — nilai yang disimpan", () => {
  it("membuang baris tanpa nilai, tidak menyimpannya kosong", () => {
    // Kalau baris kosong ikut disimpan, hitungan "N nilai tercatat" di layar
    // akan menghitung mapel yang sebenarnya belum dinilai.
    const grades = gradesFromDraft(["Mathematics", "Physics", "Chemistry"], {
      Mathematics: "6",
      Physics: "",
      Chemistry: "   ",
    });
    expect(grades).toEqual([{ subject: "Mathematics", grade: "6" }]);
  });

  it("memangkas spasi pada nilai", () => {
    expect(gradesFromDraft(["Mathematics"], { Mathematics: "  6  " }))
      .toEqual([{ subject: "Mathematics", grade: "6" }]);
  });

  it("menerima nilai huruf apa adanya", () => {
    expect(gradesFromDraft(["English A"], { "English A": "B+" }))
      .toEqual([{ subject: "English A", grade: "B+" }]);
  });

  it("mengembalikan daftar kosong bila tidak ada yang diisi", () => {
    expect(gradesFromDraft(["Mathematics"], {})).toEqual([]);
  });

  it("draf awal dimuat dari nilai tersimpan supaya menyunting, bukan mengosongkan", () => {
    expect(draftFromSaved(GRADE)).toEqual({ Mathematics: "6", Physics: "5" });
  });

  it("menghitung hanya nilai yang benar-benar terisi", () => {
    expect(filledGradeCount({ grades: [{ subject: "a", grade: "6" }, { subject: "b", grade: " " }] })).toBe(1);
    expect(filledGradeCount(undefined)).toBe(0);
  });
});

describe("raporForm — semester", () => {
  it("menyebut semester berjalan dalam bentuk yang bisa dibaca", () => {
    expect(semesterLabel(currentSemester())).toMatch(/^Semester [12] \d{4}\/\d{4}$/);
  });

  it("menawarkan beberapa semester ke belakang, tanpa duplikat", () => {
    const opts = semesterOptions(8);
    expect(opts).toHaveLength(8);
    expect(new Set(opts.map((o) => o.value)).size).toBe(8);
    // Semester berjalan harus ada di daftarnya.
    expect(opts.map((o) => o.value)).toContain(currentSemester());
  });
});

function formMarkup(over: Partial<Parameters<typeof NilaiRaporForm>[0]> = {}) {
  return renderToStaticMarkup(
    <NilaiRaporForm
      semester="2025/2026-S1"
      semesterOptions={[
        { value: "2025/2026-S1", label: "Semester 1 — 2025/2026" },
        { value: "2025/2026-S2", label: "Semester 2 — 2025/2026" },
      ]}
      subjects={["Mathematics", "Physics"]}
      draft={{}}
      notes=""
      saving={false}
      error=""
      hasExisting={false}
      existingCount={0}
      onChangeSemester={noop}
      onChangeGrade={noop}
      onChangeNotes={noop}
      onSave={noop}
      onCancel={noop}
      {...over}
    />,
  );
}

describe("NilaiRaporForm — markup", () => {
  it("menyediakan isian nilai untuk setiap mapel, dengan label yang menunjuk isiannya", () => {
    const html = formMarkup();
    expect(html).toContain('id="rapor-Mathematics"');
    expect(html).toContain('for="rapor-Mathematics"');
    expect(html).toContain('id="rapor-Physics"');
    expect(html).toContain('for="rapor-Physics"');
  });

  it("menyediakan pemilih semester", () => {
    const html = formMarkup();
    expect(html).toContain('id="rapor-semester"');
    expect(html).toContain("Semester 1 — 2025/2026");
    expect(html).toContain("Semester 2 — 2025/2026");
  });

  it("memakai label tombol yang membedakan menyimpan baru dan memperbarui", () => {
    expect(formMarkup({ hasExisting: false })).toContain("Simpan nilai");
    expect(formMarkup({ hasExisting: true, existingCount: 2 })).toContain("Perbarui nilai");
  });

  it("memberi tahu bahwa menyimpan akan memperbarui, bukan menambah baris", () => {
    const html = formMarkup({ hasExisting: true, existingCount: 2 });
    expect(html).toContain("sudah punya 2 nilai");
    expect(html).toContain("memperbaruinya");
  });

  it("mematikan tombol simpan saat sedang menyimpan", () => {
    expect(formMarkup({ saving: true })).toContain("disabled");
    expect(formMarkup({ saving: true })).toContain("Menyimpan...");
  });

  it("menjelaskan apa yang harus dilakukan bila murid belum punya mapel", () => {
    const html = formMarkup({ subjects: [] });
    expect(html).toContain("belum punya mata pelajaran");
    // Tanpa mapel, tidak ada isian nilai yang dirender.
    expect(html).not.toContain('id="rapor-Mathematics"');
    // Dan tombol simpan tetap mati supaya tidak menyimpan daftar kosong.
    expect(html).toContain("disabled");
  });

  it("menandai pesan galat sebagai alert hanya saat ada isinya", () => {
    expect(formMarkup()).not.toContain('role="alert"');
    const html = formMarkup({ error: "Isi minimal satu nilai sebelum menyimpan." });
    expect(html).toContain('role="alert"');
    expect(html).toContain("Isi minimal satu nilai");
  });
});

describe("NilaiRaporIsian — keadaan tertutup", () => {
  const markup = (raporGrades: RaporGrade[]) =>
    renderToStaticMarkup(<NilaiRaporIsian student={STUDENT} raporGrades={raporGrades} notify={noop} />);

  it("menyatakan belum ada nilai bila memang kosong", () => {
    const html = markup([]);
    expect(html).toContain("Belum ada nilai rapor yang disimpan");
    expect(html).toContain("+ Isi nilai");
  });

  it("menjelaskan bedanya dengan tabel per sesi", () => {
    expect(markup([])).toContain("berbeda dari tabel per sesi di atas");
  });

  it("mendaftar semester yang sudah punya nilai beserta isinya", () => {
    const html = markup([GRADE]);
    expect(html).toContain("Semester 1 2025/2026");
    expect(html).toContain("2 nilai tercatat");
    expect(html).toContain("Mathematics 6");
    expect(html).toContain("Physics 5");
    expect(html).toContain("dari sekolah");
  });

  it("menyatakan semester mana yang dibuka tombolnya, bukan sekadar 'isi nilai'", () => {
    // Tombol itu bekerja atas SEMESTER TERPILIH (semester berjalan), bukan atas
    // baris yang terdaftar di bawahnya. Tanpa nama semester, tutor tidak bisa tahu
    // nilai mana yang sedang ia isi.
    const html = markup([GRADE]);
    expect(html).toContain("+ Isi nilai");
    expect(html).toContain(semesterLabel(currentSemester()));
  });

  it("menawarkan Ubah dan Hapus per semester yang terdaftar", () => {
    const html = markup([GRADE]);
    expect(html).toContain(">Ubah<");
    expect(html).toContain(">Hapus<");
  });

  it("mengurutkan semester dari yang terbaru", () => {
    const older: RaporGrade = { ...GRADE, id: "g0", semester: "2025/2026-S2" };
    const html = markup([GRADE, older]);
    expect(html.indexOf("Semester 2 2025/2026")).toBeLessThan(html.indexOf("Semester 1 2025/2026"));
  });

  it("tidak menyimpan dialog konfirmasi bawaan peramban", () => {
    // Konfirmasi hapus memakai ConfirmSheet; ia tidak dirender saat tertutup,
    // yang penting tidak ada `confirm(` di sumbernya (dijaga nativeDialogs juga).
    const html = markup([GRADE]);
    expect(html).not.toContain("confirm(");
  });
});
