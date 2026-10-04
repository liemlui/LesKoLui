/**
 * Penjaga C-03: **satu grup pilihan respons, satu penulis `responseTag`.**
 *
 * **Kenapa tes ini ada.** Langkah 4 punya dua tempat yang menulis `responseTag`:
 * deret tombol cepat "⚡ Isi cepat (respons)" dan daftar penuh "🎓 Kualitas
 * Respons Akademik" (10 tag). Sebelum C-03 keduanya menulis dengan caranya
 * sendiri — deret cepat menetapkan langsung, daftar penuh menyalakan/mematikan —
 * sehingga "menyorot pilihan yang sama" hanya kebetulan, bukan jaminan. C-03
 * memutuskan: keduanya memakai satu penulis, dan **keduanya** `role="radiogroup"`
 * karena memilih respons adalah memilih satu.
 *
 * **Cara kerja (tanpa DOM).** Repo ini tidak memasang `jsdom` /
 * `@testing-library/*` (dependensi baru dilarang tanpa Q-series), jadi tes memakai
 * `renderToStaticMarkup` — pola yang sama dengan `subjectPickerInline.test.tsx`,
 * `tabsAccessibility.test.tsx`, dan `modalAccessibility.test.tsx` — lalu memeriksa
 * markup. Yang TIDAK bisa dibuktikan di sini: perilaku fokus keyboard dan
 * penyorotan warna di layar nyata (itu wilayah `npm run e2e:uiux`).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ResponseStep from "../screens/captureSession/ResponseStep";

type Props = Parameters<typeof ResponseStep>[0];

function markup(overrides: Partial<Props> = {}) {
  const props: Props = {
    responseTag: undefined,
    setResponseTag: () => {},
    needsWork: "",
    setNeedsWork: () => {},
    engScore: 7,
    engScoreInfo: { text: "Baik", color: "#111827", bg: "#f3f4f6" },
    engBasis: "partial",
    ...overrides,
  };
  return renderToStaticMarkup(<ResponseStep {...props} />);
}

/** Pisahkan markup jadi dua bagian supaya bisa diperiksa per grup. */
function groups(html: string) {
  const cut = html.indexOf('role="radiogroup" aria-labelledby="cs-kualitas-respons"');
  expect(cut, "grup daftar penuh (Kualitas Respons Akademik) tidak ditemukan").toBeGreaterThan(-1);
  return { quick: html.slice(0, cut), full: html.slice(cut) };
}

const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

describe("ResponseStep — C-03 (satu pemilih, dua jalan pintas)", () => {
  it("memakai role=radiogroup di KEDUA grup, dengan label yang menunjuk elemen ada", () => {
    const html = markup();
    expect(count(html, 'role="radiogroup"')).toBe(2);
    // Setiap radiogroup diberi nama oleh label yang benar-benar ada di markup.
    expect(html).toContain('aria-labelledby="cs-isi-cepat"');
    expect(html).toContain('aria-labelledby="cs-kualitas-respons"');
    expect(html).toContain('id="cs-isi-cepat"');
    expect(html).toContain('id="cs-kualitas-respons"');
  });

  it("setiap pilihan adalah role=radio yang membawa aria-checked", () => {
    const html = markup();
    // 3 tombol cepat + 10 tag daftar penuh.
    expect(count(html, 'role="radio"')).toBe(13);
    expect(count(html, 'aria-checked="')).toBe(13);
  });

  it("menyorot pilihan yang sama di kedua grup (3 tombol cepat punya pasangannya)", () => {
    const { quick, full } = groups(markup({ responseTag: "misconception" }));
    // Tiap grup punya tepat satu pilihan aktif...
    expect(count(quick, 'aria-checked="true"')).toBe(1);
    expect(count(full, 'aria-checked="true"')).toBe(1);
    // ...dan yang aktif itu memang pilihan yang SAMA ("Miskonsepsi").
    // Tombol cepat: teksnya langsung. Chip daftar penuh: `<span>{ikon}</span> {label}`.
    expect(quick).toMatch(/aria-checked="true"[^>]*>\s*Miskonsepsi/);
    expect(full).toMatch(/aria-checked="true"[^>]*>\s*<span>[^<]*<\/span>\s*Miskonsepsi/);
  });

  it("tag yang hanya ada di daftar penuh tidak menyalakan tombol cepat", () => {
    const { quick, full } = groups(markup({ responseTag: "metacognitive" }));
    expect(count(quick, 'aria-checked="true"')).toBe(0);
    expect(count(full, 'aria-checked="true"')).toBe(1);
  });

  it("tanpa pilihan, tidak ada radio yang menyala", () => {
    const html = markup({ responseTag: undefined });
    expect(count(html, 'aria-checked="true"')).toBe(0);
  });

  it("\"Kosongkan\" berada DI LUAR grup pilihan (ia bukan salah satu pilihan)", () => {
    const { quick } = groups(markup({ responseTag: "correct-independent" }));
    const start = quick.indexOf('role="radiogroup"');
    // Tombol di dalam radiogroup ditutup `</button>`, jadi `</div>` pertama
    // sesudahnya adalah penutup grup itu sendiri.
    const end = quick.indexOf("</div>", start);
    const quickGroup = quick.slice(start, end);

    expect(quickGroup).toContain("Lancar");
    expect(quickGroup).toContain("Miskonsepsi");
    expect(quickGroup, "\"Kosongkan\" tidak boleh jadi salah satu pilihan radio").not.toContain("Kosongkan");
    expect(quick.slice(end)).toContain("Kosongkan");
  });
});
