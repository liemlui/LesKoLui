/**
 * Penjaga awal untuk panel "pilih dari daftar bab" (G3-01, 2026-10-04).
 *
 * **Kenapa tes ini ada.** Permintaan pemilik: "perkuat list topik dan search-nya".
 * Salah satu kelemahan yang terukur: panel daftar bab **tertutup sejak awal**,
 * sehingga jalur "baca pilihan" (katalog mapel itu, sampai 8 bab) satu ketukan
 * lebih jauh daripada jalur "ingat kata kunci" — padahal tutor justru sering
 * tidak ingat kata kuncinya. Nilai awalnya sekarang `true`.
 *
 * **Cara uji.** `showBrowse` adalah state **internal** hook, jadi tidak ada
 * markup layar yang bisa membuktikannya tanpa merender seluruh `CaptureSession`
 * (butuh `useLiveQuery`, `useSettingsQuery`, dan `MemoryRouter` — jauh lebih
 * rapuh daripada nilainya). Karena itu dipakai probe minimal: satu komponen
 * yang memanggil hook dan menuliskan keadaan awalnya ke markup. Yang diuji
 * memang **keadaan awal**, bukan perilaku klik — toggle-nya sendiri tetap
 * dijaga E2E saat langkah 2 dibuka manusia.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import useTopicSelection from "../screens/captureSession/useTopicSelection";

function Probe() {
  const t = useTopicSelection({
    subjects: ["Matematika"],
    studentSubjects: ["Matematika"],
    student: undefined,
    recentSessions: [],
  });
  return (
    <p>
      <span data-probe="showBrowse">{String(t.showBrowse)}</span>
      <span data-probe="openUnit">{String(t.openUnit)}</span>
      <span data-probe="recentCount">{t.recentTopicChips.length}</span>
    </p>
  );
}

function probe(attr: string): string {
  const markup = renderToStaticMarkup(<Probe />);
  const match = markup.match(new RegExp(`data-probe="${attr}">([^<]*)<`));
  if (!match) throw new Error(`probe ${attr} tidak ditemukan di markup: ${markup}`);
  return match[1];
}

describe("useTopicSelection — keadaan awal (jalur 'baca daftar bab')", () => {
  it("panel daftar bab terbuka sejak awal", () => {
    expect(probe("showBrowse")).toBe("true");
  });

  it("tidak ada bab yang terbuka sendiri (daftar tetap ringkas)", () => {
    expect(probe("openUnit")).toBe("null");
  });
});
