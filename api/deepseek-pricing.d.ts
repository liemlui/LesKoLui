// Deklarasi tipe untuk fungsi serverless `api/deepseek-pricing.js`.
//
// Berkas ini ada supaya tes di `src/` bisa mengimpor parser (yang ditulis JS
// biasa agar ringan di runtime Vercel) tanpa memaksa `allowJs` di tsconfig.
// Vercel mengabaikan berkas .d.ts saat deploy.

export interface ParsedRate {
  offPeak: number;
  peak: number;
}

export interface ParsedModelPricing {
  model: string;
  inputCacheHit: ParsedRate;
  inputCacheMiss: ParsedRate;
  output: ParsedRate;
}

export interface ParsedPricing {
  schemaVersion: 1;
  sourceUrl: string;
  fetchedAt: string;
  verifiedAt: string;
  provenance: "docs-live";
  models: Record<string, ParsedModelPricing>;
  peak: {
    weekdayUtc: number[];
    windowsUtc: { startHour: number; endHour: number }[];
    excludedDatesUtc: string[];
    note: string;
  };
  warnings: string[];
}

export declare function htmlToText(html: string): string;

export declare function parsePricing(html: string): ParsedPricing | { error: string };

export default function handler(req: unknown, res: unknown): Promise<void>;
