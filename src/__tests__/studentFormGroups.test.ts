import { describe, expect, it } from "vitest";
import studentFormSrc from "../components/StudentForm.tsx?raw";

/**
 * Butir 14 G3-06 — urutan kelompok formulir murid dan lipatan Siklus Tagihan.
 *
 * Kenapa penjaga ini ada (ATURAN-AI §1 butir 4, yang melarang penjaga tanpa
 * alasan): bukan demi kerapian, melainkan karena satu jebakan yang **memblokir
 * penyimpanan**. Kolom "Jumlah pertemuan per tagihan" memasang `required`. Kalau
 * suatu saat ia ikut ter-render sementara bagian Siklus Tagihan sedang terlipat,
 * peramban menolak submit dengan "An invalid form control … is not focusable":
 * tombol Simpan tampak mati tanpa alasan yang terlihat, dan itu terjadi di HP
 * pemilik, bukan di mesin ini.
 *
 * Berkas uji ini membaca BERKAS SUMBER (pola yang sama dengan `nativeDialogs.test.ts`
 * dan `moneyGate.test.ts`), karena repo ini tidak memasang `jsdom` dan tidak bisa
 * menguji klik sungguhan. Yang dibuktikan: bentuk pemisahan bagiannya, bukan
 * perilaku render.
 */

/** Urutan kemunculan penanda, atau `null` bila ada penanda yang hilang. */
function urutanPenanda(src: string, penanda: readonly string[]): number[] | null {
  const posisi = penanda.map((p) => src.indexOf(p));
  if (posisi.some((i) => i < 0)) return null;
  return posisi;
}

function naikUrut(posisi: readonly number[]): boolean {
  return posisi.every((p, i) => i === 0 || p > posisi[i - 1]);
}

/**
 * Benarkah kolom `required` milik siklus tagihan berada DI DALAM wilayah yang
 * dijaga `(!initial || billingCycleOpen)`? Kalau tidak, jebakan di atas terbuka.
 */
function kolomWajibDiDalamLipatan(src: string): boolean {
  const gerbang = src.indexOf("{(!initial || billingCycleOpen) && (");
  if (gerbang < 0) return false;
  const akhir = src.indexOf("</fieldset>", gerbang);
  if (akhir < 0) return false;
  const kolom = src.indexOf('id="billingSessionCount"', gerbang);
  if (kolom < 0 || kolom > akhir) return false;
  const elemen = src.slice(kolom, src.indexOf("/>", kolom));
  return /\brequired\b/.test(elemen);
}

const PENANDA_BAGIAN = [
  ">Identitas</p>",
  ">Kontak Orang Tua</p>",
  ">Kontak Murid</p>",
  "{/* Tarif les per jam */}",
  ">Siklus Tagihan</span>",
] as const;

describe("urutan kelompok formulir murid (butir 14)", () => {
  it("empat kelompok muncul berurutan: Identitas → Kontak → Tarif → Siklus Tagihan", () => {
    const posisi = urutanPenanda(studentFormSrc, PENANDA_BAGIAN);
    expect(posisi, "ada penanda bagian yang hilang dari StudentForm.tsx").not.toBeNull();
    expect(naikUrut(posisi!), `urutan bagian salah: ${JSON.stringify(posisi)}`).toBe(true);
  });

  it("mata pelajaran ikut kelompok Identitas, bukan terselip antara Kontak dan Tarif", () => {
    const mapel = studentFormSrc.indexOf("Mata Pelajaran <span");
    const kontakMurid = studentFormSrc.indexOf(">Kontak Murid</p>");
    const tarif = studentFormSrc.indexOf("{/* Tarif les per jam */}");
    expect(mapel).toBeGreaterThan(studentFormSrc.indexOf(">Identitas</p>"));
    expect(mapel).toBeLessThan(kontakMurid);
    expect(kontakMurid).toBeLessThan(tarif);
  });
});

describe("lipatan Siklus Tagihan (butir 14)", () => {
  it("kolom wajib 'jumlah pertemuan' hanya mungkin ter-render saat bagiannya terbuka", () => {
    expect(kolomWajibDiDalamLipatan(studentFormSrc)).toBe(true);
  });

  it("terbuka saat menyunting murid yang sudah ada, terlipat saat menambah murid baru", () => {
    expect(studentFormSrc).toMatch(/useState\(Boolean\(initial\)\)/);
    expect(studentFormSrc).toMatch(/aria-expanded=\{billingCycleOpen\}/);
  });
});

describe("penjaga ini benar-benar bisa gagal", () => {
  it("menangkap urutan bagian yang terbalik", () => {
    const terbalik = [...PENANDA_BAGIAN].reverse().join("\n");
    expect(naikUrut(urutanPenanda(terbalik, PENANDA_BAGIAN)!)).toBe(false);
  });

  it("menangkap penanda yang hilang", () => {
    expect(urutanPenanda("hanya teks biasa", PENANDA_BAGIAN)).toBeNull();
  });

  it("menangkap kolom wajib yang ter-render di luar lipatan", () => {
    const bocor = [
      '{(!initial || billingCycleOpen) && (',
      '<fieldset id="siklus-tagihan">',
      "</fieldset>",
      '<input id="billingSessionCount" required />',
    ].join("\n");
    expect(kolomWajibDiDalamLipatan(bocor)).toBe(false);
  });
});
