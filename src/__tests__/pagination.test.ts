import { describe, it, expect } from "vitest";
import { getPageCount, clampPage, paginateItems } from "../lib/pagination";

describe("getPageCount", () => {
  it("returns 1 for empty list", () => {
    expect(getPageCount(0)).toBe(1);
  });

  it("returns 1 when total <= pageSize", () => {
    expect(getPageCount(3)).toBe(1);
    expect(getPageCount(5)).toBe(1);
  });

  it("returns correct page count", () => {
    expect(getPageCount(6)).toBe(2);
    expect(getPageCount(10)).toBe(2);
    expect(getPageCount(11)).toBe(3);
  });

  it("respects custom pageSize", () => {
    expect(getPageCount(20, 10)).toBe(2);
    expect(getPageCount(21, 10)).toBe(3);
  });
});

describe("clampPage", () => {
  it("returns 1 when page < 1", () => {
    expect(clampPage(0, 20)).toBe(1);
    expect(clampPage(-5, 20)).toBe(1);
  });

  it("returns last page when page > max", () => {
    expect(clampPage(10, 20)).toBe(4); // 20/5=4 pages
    expect(clampPage(99, 5)).toBe(1);
  });

  it("returns the page unchanged when in range", () => {
    expect(clampPage(2, 20)).toBe(2);
  });
});

describe("paginateItems", () => {
  const items = ["a", "b", "c", "d", "e", "f", "g"]; // 7 items, pageSize=5

  it("returns first page", () => {
    expect(paginateItems(items, 1)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("returns second page with remainders", () => {
    expect(paginateItems(items, 2)).toEqual(["f", "g"]);
  });

  it("clamps to last page for page beyond range", () => {
    // clampPage(99, 7) = 2 (last page), so paginateItems returns page-2 items
    expect(paginateItems(items, 99)).toEqual(["f", "g"]);
  });

  it("handles empty input", () => {
    expect(paginateItems([], 1)).toEqual([]);
  });
});
