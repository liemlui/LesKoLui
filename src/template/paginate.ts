import type { ReportData } from "./types";

export function paginate(data: ReportData, maxPerPage: number): ReportData[] {
  if (data.entries.length === 0) return [data];
  const pages: ReportData[] = [];
  for (let i = 0; i < data.entries.length; i += maxPerPage) {
    pages.push({ ...data, entries: data.entries.slice(i, i + maxPerPage) });
  }
  return pages;
}
