const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: string | number | undefined | null): string {
  const text = String(value ?? "");
  const safe = CSV_FORMULA_PREFIX.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
