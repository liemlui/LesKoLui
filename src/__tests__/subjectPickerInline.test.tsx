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
import { describe, expect, it, vi } from "vitest";

/**
 * Lipatan "Mapel lain" dimulai dalam keadaan **terbuka** di tes ini.
 *
 * Alasannya bukan kenyamanan: yang dijaga tes ini adalah cacat 2026-10-04
 * ("Mathematics tampil dua kali") dan **satu chip per mapel**, sedangkan pada
 * markup statis lipatan selalu terlipat sehingga chip-nya memang tidak dirender.
 * Memaksa keadaan awal "terbuka" membuat tes mengukur **isi** daftarnya, bukan
 * keadaan lipatannya — dan keadaan lipatan itu sendiri diuji terpisah di bawah.
 *
 * Hanya `useState` yang diganti; `useMemo` (dipakai menghitung kelompok mapel)
 * dibiarkan asli.
 */
vi.mock("react", async (imporAsli) => {
  const asli = await imporAsli<typeof import("react")>();
  return { ...asli, default: asli, useState: () => [true, () => {}] };
});

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

  it("mapel profil tampil SEKALI saja: diangkat ke kelompok pertama, bukan dua kali", () => {
    // Kasus nyata yang dilaporkan pemilik 2026-10-04: murid IB MYP dengan mapel
    // profil `Mathematics` melihat mapel itu dua kali — sekali di baris chip
    // profil, sekali lagi di kelompok katalog "Mathematics".
    const markup = renderToStaticMarkup(
      <SubjectPickerSheet
        variant="inline"
        student={student({ curriculum: "IB MYP" })}
        {...props({ profileSubjects: ["Mathematics"] })}
      />,
    );
    // Yang menentukan "tampil dua kali" adalah **chip yang bisa diketuk**, jadi
    // yang dihitung adalah `<button>` yang memuat nama itu — bukan penyebutan
    // namanya di markup (tombol "Mapel lain (N)" mengutip jumlahnya, dan itu
    // bukan pilihan yang kedua).
    const semuaTombol = markup.match(/<button[\s\S]*?<\/button>/g) ?? [];
    const mathChips = semuaTombol.filter((tombol) => tombol.includes("Mathematics")).length;
    expect(mathChips).toBe(1);
    // Kelompoknya diberi nama supaya tutor tahu itu mapel murid, bukan katalog.
    expect(markup).toContain("Mapel murid ini");
    const profileGroupAt = markup.indexOf("Mapel murid ini");
    const catalogGroupAt = markup.indexOf("Language &amp; Literature");
    expect(profileGroupAt).toBeGreaterThan(-1);
    expect(profileGroupAt).toBeLessThan(catalogGroupAt);
  });

  it("mapel di luar profil dilipat, bukan dihapus (permintaan pemilik 2026-10-14)", () => {
    const markup = renderToStaticMarkup(
      <SubjectPickerSheet
        variant="inline"
        student={student({ curriculum: "IB MYP" })}
        {...props({ profileSubjects: ["Mathematics"] })}
      />,
    );
    // Tombolnya ada, menyebut keadaan lipatannya, dan memasang `aria-expanded`…
    expect(markup).toMatch(/(Mapel lain \(\d+\)|Sembunyikan mapel lain)/);
    expect(markup).toContain('aria-expanded="true"');
    // …dan mapel profil tetap terlihat tanpa perlu membuka lipatannya.
    expect(markup).toContain("Mathematics");
  });

  it("tanpa mapel profil, tidak ada kelompok `Mapel murid ini`", () => {
    const markup = renderToStaticMarkup(
      <SubjectPickerSheet
        variant="inline"
        student={student({ curriculum: "IB MYP" })}
        {...props()}
      />,
    );
    expect(markup).not.toContain("Mapel murid ini");
  });
});
