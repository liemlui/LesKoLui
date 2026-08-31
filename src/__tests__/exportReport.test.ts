import { describe, expect, it } from "vitest";
import { detectOverflow } from "../lib/exportReport";
import { COVER_PAGE_ID } from "../template/rebalance";

/** Elemen palsu minimal untuk menguji deteksi overflow tanpa DOM browser. */
function fakeNode(id: string, scrollHeight: number, clientHeight: number, grow = false) {
  return {
    id,
    classList: {
      contains: (className: string) => grow && className === "report-page-grow",
    },
    scrollHeight,
    clientHeight,
  };
}

function fakeRoot(elements: ReturnType<typeof fakeNode>[]) {
  return { querySelectorAll: () => elements } as unknown as ParentNode;
}

describe("detectOverflow", () => {
  it("melaporkan halaman yang meluap melebihi toleransi 4px", () => {
    const root = fakeRoot([
      fakeNode("report-page-1", 500, 480), // +20 → dilaporkan
      fakeNode("report-page-2", 300, 300), // muat pas
      fakeNode(COVER_PAGE_ID, 600, 500),   // cover → dikecualikan
      fakeNode("report-page-3", 700, 500, true), // .report-page-grow → dikecualikan
      fakeNode("report-page-4", 300, 297), // +3 <= 4 → aman
    ]);

    const issues = detectOverflow(root);
    expect(issues).toEqual([{ pageId: "report-page-1", overflowPx: 20 }]);
  });

  it("mengembalikan array kosong ketika semua halaman muat", () => {
    const root = fakeRoot([
      fakeNode("report-page-1", 400, 400),
      fakeNode("report-page-2", 400, 398),
    ]);
    expect(detectOverflow(root)).toEqual([]);
  });

  it("aman ketika tidak ada node halaman", () => {
    const emptyRoot = { querySelectorAll: () => [] } as unknown as ParentNode;
    expect(detectOverflow(emptyRoot)).toEqual([]);
  });
});