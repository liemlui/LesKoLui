export const PAGE_SIZE = 5;

export function getPageCount(total: number, pageSize = PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function clampPage(page: number, total: number, pageSize = PAGE_SIZE) {
  return Math.min(Math.max(page, 1), getPageCount(total, pageSize));
}

export function paginateItems<T>(items: readonly T[], page: number, pageSize = PAGE_SIZE) {
  const safePage = clampPage(page, items.length, pageSize);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
