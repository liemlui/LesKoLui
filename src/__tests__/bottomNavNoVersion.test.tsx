import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import BottomNav from "../components/BottomNav";
import { APP_VERSION } from "../lib/version";

describe("BottomNav", () => {
  it("does not render the app version in the nav strip", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(html).not.toContain(APP_VERSION);
  });

  // G3-02 #11: nav jadi tiga pintu + satu aksi (kontrak K1.1). Label lama
  // ("Home", "Keuangan", "Catat", "Laporan") tidak boleh muncul lagi, karena
  // rujukan ke situ sudah ikut berubah di test tampilan.
  it("memuat tiga pintu dan satu aksi, bukan lima pintu", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(html).toContain("Hari Ini");
    expect(html).toContain("Murid");
    expect(html).toContain("Uang");
    expect(html).toContain("Catat sesi");
    expect(html).not.toContain(">Home<");
    expect(html).not.toContain(">Keuangan<");
    expect(html).not.toContain(">Laporan<");
  });
});
