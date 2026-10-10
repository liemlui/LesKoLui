/**
 * Penjaga "satu jalur hapus & satu jalur simpan murid" (G3-06 butir 11).
 *
 * Kenapa penjaga ini ada, padahal `ATURAN-AI.md` §1 butir 4 melarang menambah
 * penjaga tanpa alasan: sebelum butir 11, **hanya layar Daftar Murid** yang punya
 * alur hapus lengkap (gerbang PIN + ringkasan "yang akan ikut terhapus"). Layar
 * Detail Murid tidak punya, dan tombol "Hapus" di kartu daftar memanggil jalurnya
 * sendiri. Begitu layar detail diberi menu aksi, dua jalur hapus adalah hasil yang
 * paling mungkin — dan dua jalur hapus berarti dua perilaku yang bisa berbeda.
 *
 * Penjaga ini membaca BERKAS SUMBER (pola `moneyGate.test.ts`): yang dibuktikan
 * hanya "tidak ada cabang kedua" — bukan perilaku klik, yang dijaga Playwright.
 */

import { describe, expect, it } from "vitest";
import studentsSrc from "../screens/Students.tsx?raw";
import studentDetailSrc from "../screens/StudentDetail.tsx?raw";
import sheetSrc from "../components/StudentActionsSheet.tsx?raw";
import editorSrc from "../hooks/useStudentEditor.ts?raw";

/** Membuang komentar supaya dokumentasi yang menyebut nama fungsi tidak dihitung. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** Baris yang MEMANGGIL sebuah nama fungsi (bukan sekadar mengimpornya). */
function callLines(src: string, fn: string): string[] {
  const cleaned = stripComments(src);
  const pattern = new RegExp(`(^|[^A-Za-z0-9_.$])${fn}\\s*\\(`);
  return cleaned
    .split("\n")
    .map((line, i) => ({ line: line.trim(), n: i + 1 }))
    .filter(({ line }) => pattern.test(line) && !/^\s*(export\s+)?(async\s+)?function\s/.test(line))
    .map(({ line, n }) => `${n}: ${line}`);
}

describe("hanya ada satu jalur hapus murid", () => {
  it("layar Daftar Murid tidak memanggil deleteStudent sendiri", () => {
    expect(callLines(studentsSrc, "deleteStudent")).toEqual([]);
  });

  it("layar Detail Murid tidak memanggil deleteStudent sendiri", () => {
    expect(callLines(studentDetailSrc, "deleteStudent")).toEqual([]);
  });

  it("deleteStudent hanya dipanggil dari menu bersama", () => {
    expect(callLines(sheetSrc, "deleteStudent").length).toBe(1);
  });

  it("kedua layar memakai menu yang sama", () => {
    for (const [nama, src] of [["Daftar Murid", studentsSrc], ["Detail Murid", studentDetailSrc]] as const) {
      expect(src, `${nama} tidak memakai StudentActionsSheet`).toContain("StudentActionsSheet");
      expect(stripComments(src), `${nama} tidak merender StudentActionsSheet`).toMatch(/<StudentActionsSheet/);
    }
  });
});

describe("hanya ada satu jalur simpan murid", () => {
  it("layar Daftar Murid tidak memanggil createStudent/updateStudent sendiri", () => {
    expect(callLines(studentsSrc, "createStudent")).toEqual([]);
    expect(callLines(studentsSrc, "updateStudent")).toEqual([]);
  });

  it("jalur tulisnya hidup di useStudentEditor", () => {
    expect(callLines(editorSrc, "createStudent").length).toBe(1);
    expect(callLines(editorSrc, "updateStudent").length).toBe(1);
  });

  it("layar Daftar Murid memakai hook itu, bukan menyalinnya", () => {
    expect(studentsSrc).toContain("useStudentEditor");
    expect(stripComments(studentsSrc)).toContain("saveStudent(");
  });
});

describe("penjaga ini benar-benar bisa gagal", () => {
  it("mendeteksi panggilan pada sumber buatan", () => {
    expect(callLines('await deleteStudent(id);', "deleteStudent")).toHaveLength(1);
    expect(callLines('const ok = await updateStudent(id, data);', "updateStudent")).toHaveLength(1);
  });

  it("tidak salah menuduh impor, komentar, dan nama lain", () => {
    expect(callLines('import { deleteStudent } from "../db/repos";', "deleteStudent")).toEqual([]);
    expect(callLines("// dulu memanggil deleteStudent di sini", "deleteStudent")).toEqual([]);
    expect(callLines('/* deleteStudent(id) */', "deleteStudent")).toEqual([]);
    expect(callLines("await softDeleteStudentRow(id);", "deleteStudent")).toEqual([]);
  });
});
