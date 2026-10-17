// Deklarasi tipe untuk `api/kurs-usd-idr.js`.
// Berkas .d.ts diabaikan Vercel saat mendaftar fungsi, jadi aman ada di sini.

export interface KursPayload {
  schemaVersion: 1;
  usdIdr: number;
  source: string;
  sourceUrl: string;
  rateDate: string;
  fetchedAt: string;
  verifiedAt: string;
  provenance: "kurs-live";
  warnings: string[];
}

export default function handler(req: unknown, res: unknown): Promise<void>;
