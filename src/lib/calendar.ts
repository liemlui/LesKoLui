/**
 * Pure calendar helpers shared by the Home views.
 * Date strings are "YYYY-MM-DD"; month strings are "YYYY-MM".
 * All Date math uses local fields to avoid UTC day-shift (see lib/format.ts).
 */
import type { Session } from "../db/types";

export type CalView = "month" | "week" | "day";

export const DOW_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
export const DURATIONS  = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];

export function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`;
}

export function nextMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
}

export function calendarCells(month: string): (string | null)[] {
  const [y, m] = month.split("-").map(Number);
  const firstDow = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  return cells;
}

export function weekDates(anchor: string): string[] {
  const [y, m, d] = anchor.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  const sun = new Date(base); sun.setDate(base.getDate() - base.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sun); day.setDate(sun.getDate() + i);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  });
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function getDatesForWeekdays(startDate: string, weekdays: number[], weeksAhead = 53): string[] {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const weekSun = new Date(start); weekSun.setDate(start.getDate() - start.getDay());
  const results: string[] = [];
  for (let w = 0; w < weeksAhead; w++) {
    for (const dow of weekdays) {
      const target = new Date(weekSun);
      target.setDate(weekSun.getDate() + w * 7 + dow);
      const str = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
      if (str >= startDate) results.push(str);
    }
  }
  return [...new Set(results)].sort();
}

export function byDay(sessions: Session[] | undefined): Map<string, Session[]> {
  const map = new Map<string, Session[]>();
  (sessions ?? []).forEach((s) => {
    const arr = map.get(s.date) ?? [];
    arr.push(s);
    map.set(s.date, arr);
  });
  return map;
}
