/**
 * Penjaga regresi bentuk **inline** pemilih mapel (G3-01, Q-2 opsi A).
 *
 * **Kenapa tes ini ada.** Permintaan pemilik 2026-10-04: langkah 2 wizard Catat
 * Sesi harus lebih cepat, salah satunya dengan "pemilih mapel tanpa panel
 * bersarang". Sebelumnya satu mapel butuh **3 ketukan** (buka `+ Tambah Mapel` →
 * ketuk mapel → `Selesai`) dan dua mapel **5 ketukan**. Sekarang chip mapel
 * dirender langsung di layar. Kalau seseorang mengembalikan pembungkus modal,
 * jumlah ketukan naik diam-diam — dan itulah yang dijaga berkas ini.
 *
 * **Cara kerja (tanpa DOM).** Repo ini tidak memasang `jsdom` /
 * `@testing-library/*`, dan menambah dependensi dilarang tanpa Q-series
 * (`ATURAN-AI` §2.2). Jadi tes memakai `renderToStaticMarkup` — pola yang sama
 * dengan `tabsAccessibility.test.tsx` dan `modalAccessibility.test.tsx` — lalu
 * memeriksa markup. Yang TIDAK bisa dibuktikan di sini: ukuran target sentuh dan
 * perilaku gulir di layar nyata; itu wilayah `npm run e2e:uiux` (§6.2).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SubjectPickerSheet from "../screens/captureSession/SubjectPickerSheet";
import { IB_MYP_SUBJECTS, getSubjectGroups } from "../lib/ibSubjects";
import type { Student } from "../db/types";

function student(overrides: Partial<Student> = {}): Student {
  return {
    id: "s-1",
    name: "Sari",
    level: "SMA",
    subjects: [],
    parentContact: { name: "Ibu Sari", phone: "08123456789" },
    hourlyRate: 150000,
    active: true,
    enrolledAt: "2026-01-01",
    ...overrides,
  };
}

/** Props wajib; setter di-stub karena markup statis tidak menjalankan interaksi. */
function props(overrides: Partial<Parameters<typeof SubjectPickerSheet>[0]> = {}) {
  return {
    subjects: [] as string[],
    setSubjects: () => {},
    onClose: () => {},
    ibTab: "MYP" as const,
    setIbTab: () => {},
    ibCustom: "",
    setIbCustom: () => {},
    onToggleSubject: () => {},
    ...overrides,
  };
}

describe("SubjectPickerSheet — bentuk inline (Q-2 opsi A)", () => {
  it("merender chip mapel langsung tanpa wadah dialog", () => {
    const markup = renderToStaticMarkup(
      <SubjectPickerSheet variant="inline" student={student({ curriculum: "IB DP" })} {...props()} />,
    );
    expect(markup).not.toContain('role="dialog"');
    expect(markup).not.toContain("Pilih Mata Pelajaran");
    // Chip mapel dari katalog kurikulum murid benar-benar ada di markup.
    const firstSubject = getSubjectGroups("IB DP")[0].subjects[0];
    expect(markup).toContain(firstSubject);
  });

  it("tidak lagi menawarkan tombol pembuka panel `+ Tambah Mapel`", () => {
    const markup = renderToStaticMarkup(
      <SubjectPickerSheet variant="inline" student={student({ curriculum: "IB MYP" })} {...props()} />,
    );
    expect(markup).not.toContain("Tambah Mapel");
  });

  it("murid tanpa kurikulum tetap melihat katalog MYP dan tab MYP/DP", () => {
    const markup = renderToStaticMarkup(
      <SubjectPickerSheet variant="inline" student={student()} {...props()} />,
    );
    expect(markup).toContain("MYP (Middle Years)");
    expect(markup).toContain("DP (Diploma)");
    // Markup statis meng-escape `&` (mis. "Language &amp; Literature"), jadi
    // perbandingan dilakukan pada bentuk yang sudah di-escape.
    const escaped = IB_MYP_SUBJECTS[0].replace(/&/g, "&amp;");
    expect(markup).toContain(escaped);
  });

  it("kolom mapel bebas tetap tersedia (jalan masuk mapel di luar katalog)", () => {
    const markup = renderToStaticMarkup(
      <SubjectPickerSheet variant="inline" student={student({ curriculum: "National" })} {...props()} />,
    );
    expect(markup).toContain('aria-label="Ketik mapel lain"');
    expect(markup).toContain("Custom");
  });

  it("umpan balik pilihan: ringkasan `Dipilih (n)` muncul begitu ada mapel terpilih", () => {
    const markup = renderToStaticMarkup(
      <SubjectPickerSheet
        variant="inline"
        student={student({ curriculum: "National" })}
        {...props({ subjects: ["Matematika", "Fisika"] })}
      />,
    );
    expect(markup).toContain("Dipilih (2):");
    expect(markup).toContain('aria-label="Hapus Matematika"');
    // Mapel terpilih ditandai ✓ pada chip katalognya, bukan ditambah chip kembar.
    const mathChips = markup.split("Matematika").length - 1;
    expect(mathChips).toBeLessThanOrEqual(3);
  });

  it("bentuk modal tetap utuh untuk panel dari bawah (dipakai di layar sempit)", () => {
    const markup = renderToStaticMarkup(
      <SubjectPickerSheet student={student({ curriculum: "IB MYP" })} {...props()} />,
    );
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain("Pilih Mata Pelajaran");
    expect(markup).toContain("Selesai");
  });
});
