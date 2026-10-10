import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { studentInitial } from "../lib/studentPhoto";
import { useBlobUrl } from "../hooks/useBlobUrl";
import fieldSrc from "../components/StudentPhotoField.tsx?raw";
import avatarSrc from "../components/StudentAvatar.tsx?raw";
import formSrc from "../components/StudentForm.tsx?raw";
import studentsSrc from "../screens/Students.tsx?raw";
import detailSrc from "../screens/StudentDetail.tsx?raw";
import { nativeDialogLines } from "./nativeDialogs.test";

/**
 * Penjaga G3-07 (foto murid).
 *
 * Dua cara, dan pembagiannya disengaja:
 *
 * 1. **Runtime** untuk perilaku hook pelepasan URL. Repo ini tidak memasang
 *    jsdom, jadi komponen tidak bisa dirender ke DOM — tetapi `useBlobUrl`
 *    hanya memakai `useState` dan `useEffect`, dan itu ada di React sisi server,
 *    sehingga invarian "aman saat peramban tidak menyediakan createObjectURL"
 *    bisa dijalankan sungguhan.
 *
 *    Versi pertama penjaga ini menelusuri berkas sumber baris demi baris untuk
 *    mencocokkan `createObjectURL` dengan `revokeObjectURL`, dan **salah
 *    menuduh kode yang benar**: pemasangan lewat fungsi bernama (`release()`) dan
 *    pelepasan di baris cleanup yang jauh membuat penelusuran per-baris melapor
 *    kebocoran padahal tidak ada. Pendekatan itu dibuang, bukan dilonggarkan.
 *    Yang mengawal pelepasan URL pada render nyata (termasuk saat komponen
 *    dibongkar) adalah `e2e:uiux`, yang memang menyalakan peramban sungguhan.
 *
 * 2. **Berkas sumber** untuk hal yang memang tidak punya bentuk runtime di suite
 *    ini: foto diedarkan lewat jalur pengecil yang sudah ada, ditolak sebelum
 *    dibaca kalau bukan gambar, dan tidak ada dialog bawaan peramban.
 */

/** Berapa kali `createObjectURL` dan `revokeObjectURL` dipanggil saat `buat()` berjalan. */
function hitungObjectUrl(buat: () => void): { dibuat: number; dilepas: number } {
  let dibuat = 0;
  let dilepas = 0;
  const asli = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  // Lingkungan uji Node tidak punya `createObjectURL`; yang diuji di sini adalah
  // pemasangan/pelepasannya, bukan kemampuan Node membuat URL.
  URL.createObjectURL = (() => { dibuat++; return "blob:uji"; }) as typeof URL.createObjectURL;
  URL.revokeObjectURL = (() => { dilepas++; }) as typeof URL.revokeObjectURL;
  try {
    buat();
  } finally {
    URL.createObjectURL = asli.create;
    URL.revokeObjectURL = asli.revoke;
  }
  return { dibuat, dilepas };
}

describe("avatar murid: foto kalau ada, inisial kalau tidak", () => {
  it("inisial dihitung terpusat, dengan cadangan '?'", () => {
    expect(studentInitial("Andi")).toBe("A");
    expect(studentInitial("  bella")).toBe("B");
    expect(studentInitial("")).toBe("?");
    expect(studentInitial("   ")).toBe("?");
    expect(studentInitial(undefined)).toBe("?");
  });

  it("StudentAvatar memakai hook pelepasan URL, bukan createObjectURL sendiri", () => {
    expect(avatarSrc).toContain("useBlobUrl(");
    expect(avatarSrc).not.toContain("URL.createObjectURL");
  });

  it("StudentAvatar hanya memotong lewat CSS, bukan menyentuh blob", () => {
    // Keputusan pemilik 2026-10-11: data foto tidak dipotong.
    expect(avatarSrc).toContain("object-cover");
    expect(avatarSrc, "avatar tidak boleh memakai canvas untuk memotong").not.toMatch(/canvas/i);
  });
});

describe("useBlobUrl", () => {
  /** Komponen uji tanpa DOM: hanya memakai hook-nya. */
  function Uji({ blob }: { blob?: Blob }) {
    useBlobUrl(blob);
    return null;
  }

  it("aman saat peramban tidak menyediakan createObjectURL", () => {
    const asli = URL.createObjectURL;
    // `undefined` meniru lingkungan tanpa API itu (seperti Node).
    (URL as unknown as { createObjectURL?: unknown }).createObjectURL = undefined;
    const hitung = hitungObjectUrl(() => {
      const html = renderToStaticMarkup(
        <Uji blob={new Blob(["foto"], { type: "image/jpeg" })} />,
      );
      // Tanpa cadangan di hook, baris di atas akan melempar "not a function".
      expect(html).toBe("");
    });
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = asli;
    expect(hitung.dibuat).toBe(0);
  });

  it("tidak membuat URL saat blob kosong", () => {
    const hasil = hitungObjectUrl(() => {
      renderToStaticMarkup(<Uji />);
    });
    expect(hasil.dibuat).toBe(0);
  });

  it("penghitung ini benar-benar bisa gagal", () => {
    const bocor = hitungObjectUrl(() => { URL.createObjectURL(new Blob(["x"])); });
    expect(bocor).toEqual({ dibuat: 1, dilepas: 0 });
    const rapi = hitungObjectUrl(() => {
      URL.createObjectURL(new Blob(["x"]));
      URL.revokeObjectURL("blob:uji");
    });
    expect(rapi).toEqual({ dibuat: 1, dilepas: 1 });
  });
});

describe("kolom foto murid di formulir", () => {
  it("mengecilkan lewat jalur yang sudah ada, bukan logika sendiri", () => {
    expect(fieldSrc).toContain('from "../lib/foto"');
    expect(fieldSrc).toContain("compressPhoto(file)");
    expect(fieldSrc).toContain("PHOTO_MAX_PX");
    // Pelepasan URL dititipkan ke hook bersama, bukan dikerjakan sendiri.
    expect(fieldSrc).not.toContain("URL.createObjectURL");
  });

  it("menolak berkas bukan gambar dan berkas kelewat besar sebelum dibaca", () => {
    expect(fieldSrc).toContain('file.type.startsWith("image/")');
    expect(fieldSrc).toContain("RAW_MAX_MB");
  });

  it("menghapus foto lewat keadaan internal, bukan dialog bawaan peramban", () => {
    expect(fieldSrc).toContain("onChange(undefined)");
    expect(fieldSrc, "kolom foto tidak boleh menyentuh basis data sendiri").not.toMatch(/db\.students/);
    expect(nativeDialogLines(fieldSrc)).toEqual([]);
  });

  it("menyebut bahwa foto ikut masuk berkas backup", () => {
    // Syarat selesai G3-07 butir 4 — pernyataan ini harus ada di antarmuka.
    expect(fieldSrc.toLowerCase()).toContain("backup");
  });

  it("formulir mengalirkan foto ke data simpan, dan undefined berarti hapus", () => {
    expect(formSrc).toContain("useState<Blob | undefined>(initial?.photo)");
    expect(formSrc).toContain("<StudentPhotoField");
    // Dua invarian sekaligus: fotonya ikut dikirim ke DB (baris `photo,`), dan
    // `undefined` bukan diubah kembali menjadi foto lama (yang akan membuat
    // tombol Hapus foto tidak pernah berpengaruh).
    expect(formSrc).toMatch(/^\s*photo,\s*$/m);
    expect(formSrc).not.toContain("photo: initial?.photo");
  });
});

describe("foto tampil di daftar dan di kepala halaman detail", () => {
  it("daftar murid memakai StudentAvatar dan tidak lagi menggambar inisial sendiri", () => {
    expect(studentsSrc).toContain("StudentAvatar");
    expect(studentsSrc).toContain("photo={s.photo}");
    expect(studentsSrc).not.toContain("colorForStudent");
    expect(studentsSrc).not.toContain("s.name.charAt(0)");
  });

  it("halaman detail memakai StudentAvatar yang sama", () => {
    expect(detailSrc).toContain("StudentAvatar");
    expect(detailSrc).toContain("photo={student.photo}");
  });
});
