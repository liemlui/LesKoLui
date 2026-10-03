/**
 * Penjaga regresi permanen untuk pola tab (G1-10) — keputusan pemilik #4 / Q21.
 *
 * CATATAN LINGKUNGAN (penting, dibaca sebelum mengubah berkas ini):
 * repo ini **tidak** memasang `jsdom`, `@testing-library/react`, atau
 * `@testing-library/dom`, dan menambah dependensi baru dilarang tanpa
 * Q-series (`ATURAN_AI` §2.2). Karena itu tes ini bekerja dengan dua cara yang
 * tidak butuh DOM:
 *
 * 1. **Struktur ARIA** — `renderToStaticMarkup` (pola yang sudah dipakai
 *    `bottomNavNoVersion.test.tsx` & `modalAccessibility.test.tsx`) lalu
 *    memeriksa markup: `role`, `aria-selected`, `tabIndex`, `aria-controls`, id.
 * 2. **Navigasi keyboard** — `useRef` di `Tabs.tsx` satu-satunya hook di
 *    komponen itu, jadi ia dinetralkan di sini supaya komponen dapat dipanggil
 *    langsung dan **handler `onKeyDown` yang asli** bisa dipanggil dengan event
 *    buatan. Yang diperiksa: tab tujuan (`onChange`), `preventDefault`, dan
 *    perpindahan fokus. Yang TIDAK bisa diperiksa tanpa DOM: perilaku fokus
 *    bawaan browser — itu dibuktikan di runtime Playwright saat G1-10 dan
 *    tetap dijaga lewat `npm run e2e:uiux` untuk kontrak `aria-controls`↔panel.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  ref: { current: [] as Array<{ focus: () => void } | null> },
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useRef: () => h.ref };
});

import Tabs, { type Tab } from "../components/Tabs";

const PREFIX = "tabs-guard";

const TABS: Tab[] = [
  { key: "ringkas", label: "Ringkas" },
  { key: "sesi", label: "Sesi & Jadwal" },
  { key: "progres", label: "Progres" },
  { key: "proyek", label: "Proyek" },
];

interface ElementLike {
  props: {
    children?: unknown;
    id?: string;
    onKeyDown?: (e: { key: string; preventDefault: () => void }) => void;
    onClick?: () => void;
    [key: string]: unknown;
  };
}

/** Panggil komponen langsung → dapat elemen tab beserta handler aslinya. */
function tabButtons(tabs: Tab[], active: string) {
  const onChange = vi.fn();
  const tree = Tabs({ tabs, active, onChange, idPrefix: PREFIX }) as unknown as ElementLike;
  const container = tree.props.children as ElementLike[];
  const tablist = container[0];
  const buttons = tablist.props.children as ElementLike[];
  return { onChange, buttons, tablist };
}

/** Tekan satu tombol pada tab ke-`index`; kembalikan spy `preventDefault`. */
function pressKey(button: ElementLike, key: string) {
  const preventDefault = vi.fn();
  button.props.onKeyDown?.({ key, preventDefault });
  return preventDefault;
}

function markup(tabs: Tab[], active: string) {
  return renderToStaticMarkup(
    <Tabs tabs={tabs} active={active} onChange={() => {}} idPrefix={PREFIX} />,
  );
}

const count = (html: string, needle: string) => html.split(needle).length - 1;

/** Label dengan `&` (mis. "Sesi & Jadwal") muncul ter-escape di markup. */
const attr = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

describe("Tabs — struktur ARIA (L-06)", () => {
  const html = markup(TABS, "progres");

  it("memberi setiap tab role=tab di dalam satu tablist", () => {
    expect(count(html, 'role="tablist"')).toBe(1);
    expect(count(html, 'role="tab"')).toBe(TABS.length);
  });

  it("memberi id dan aria-controls yang mengikuti kontrak <prefix>-tab-<key> / <prefix>-panel-<key>", () => {
    for (const tab of TABS) {
      expect(html).toContain(`id="${PREFIX}-tab-${tab.key}"`);
      expect(html).toContain(`aria-controls="${PREFIX}-panel-${tab.key}"`);
    }
  });

  it("menandai tepat satu tab sebagai terpilih (aria-selected)", () => {
    expect(count(html, 'aria-selected="true"')).toBe(1);
    expect(count(html, 'aria-selected="false"')).toBe(TABS.length - 1);
  });

  it("hanya tab aktif yang bisa dijangkau tombol Tab (tabIndex 0, sisanya -1)", () => {
    expect(count(html, 'tabindex="0"')).toBe(1);
    expect(count(html, 'tabindex="-1"')).toBe(TABS.length - 1);
  });

  it("memberi tab nama yang bisa dibacakan", () => {
    for (const tab of TABS) {
      expect(html).toContain(`aria-label="${attr(tab.label)}"`);
      expect(html).toContain(`title="${attr(tab.label)}"`);
    }
  });
});

describe("Tabs — navigasi keyboard (pola APG)", () => {
  it("ArrowRight membuka & memfokuskan tab berikutnya", () => {
    h.ref.current = TABS.map(() => ({ focus: vi.fn() }));
    const { onChange, buttons } = tabButtons(TABS, "ringkas");
    const preventDefault = pressKey(buttons[0], "ArrowRight");
    expect(onChange).toHaveBeenCalledWith("sesi");
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(h.ref.current[1]?.focus).toHaveBeenCalledTimes(1);
  });

  it("ArrowRight dari tab terakhir kembali ke tab pertama (melingkar)", () => {
    const { onChange, buttons } = tabButtons(TABS, "proyek");
    pressKey(buttons[TABS.length - 1], "ArrowRight");
    expect(onChange).toHaveBeenCalledWith("ringkas");
  });

  it("ArrowLeft membuka & memfokuskan tab sebelumnya", () => {
    h.ref.current = TABS.map(() => ({ focus: vi.fn() }));
    const { onChange, buttons } = tabButtons(TABS, "sesi");
    const preventDefault = pressKey(buttons[1], "ArrowLeft");
    expect(onChange).toHaveBeenCalledWith("ringkas");
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(h.ref.current[0]?.focus).toHaveBeenCalledTimes(1);
  });

  it("ArrowLeft dari tab pertama melingkar ke tab terakhir", () => {
    const { onChange, buttons } = tabButtons(TABS, "ringkas");
    pressKey(buttons[0], "ArrowLeft");
    expect(onChange).toHaveBeenCalledWith("proyek");
  });

  it("Home menuju tab pertama dan End menuju tab terakhir", () => {
    const home = tabButtons(TABS, "progres");
    pressKey(home.buttons[2], "Home");
    expect(home.onChange).toHaveBeenCalledWith("ringkas");

    const end = tabButtons(TABS, "ringkas");
    pressKey(end.buttons[0], "End");
    expect(end.onChange).toHaveBeenCalledWith("proyek");
  });

  it("tombol lain bukan urusan tablist — tidak mencegah default dan tidak mengganti tab", () => {
    const { onChange, buttons } = tabButtons(TABS, "ringkas");
    for (const key of ["Enter", " ", "Tab", "ArrowUp", "a"]) {
      const preventDefault = pressKey(buttons[0], key);
      expect(preventDefault).not.toHaveBeenCalled();
    }
    expect(onChange).not.toHaveBeenCalled();
  });

  it("satu tab saja tidak membuat panah keluar batas", () => {
    const { onChange, buttons } = tabButtons([{ key: "satu", label: "Satu" }], "satu");
    pressKey(buttons[0], "ArrowRight");
    pressKey(buttons[0], "ArrowLeft");
    expect(onChange).toHaveBeenNthCalledWith(1, "satu");
    expect(onChange).toHaveBeenNthCalledWith(2, "satu");
  });

  it("klik tetap membuka tab yang diketuk", () => {
    const { onChange, buttons } = tabButtons(TABS, "ringkas");
    buttons[3].props.onClick?.();
    expect(onChange).toHaveBeenCalledWith("proyek");
  });
});
