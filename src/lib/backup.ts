import { db } from "../db/db";
import { encryptJson, decryptJson } from "./crypto";

async function blobToB64(b: Blob): Promise<string> {
  const buf = new Uint8Array(await b.arrayBuffer());
  let s = "";
  for (const byte of buf) s += String.fromCharCode(byte);
  return `data:${b.type};base64,${btoa(s)}`;
}

async function b64ToBlob(s: string): Promise<Blob> {
  const res = await fetch(s);
  return res.blob();
}

async function encodeRow(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k in row) {
    out[k] = row[k] instanceof Blob ? { __blob: await blobToB64(row[k] as Blob) } : row[k];
  }
  return out;
}

async function decodeRow(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k in row) {
    out[k] = (row[k] as any)?.__blob ? await b64ToBlob((row[k] as any).__blob) : row[k];
  }
  return out;
}

const TABLES = ["students", "sessions", "reports", "payments", "settings"] as const;

export async function exportBackup(passphrase: string): Promise<Blob> {
  const dump: any = { version: 1, exportedAt: new Date().toISOString(), data: {} };
  for (const t of TABLES) {
    dump.data[t] = await Promise.all(
      ((await (db as any)[t].toArray()) as Record<string, unknown>[]).map(encodeRow)
    );
  }
  return encryptJson(dump, passphrase);
}

export async function importBackup(file: Blob, passphrase: string): Promise<void> {
  const dump: any = await decryptJson(file, passphrase);
  if (!dump?.data) throw new Error("Invalid backup file");
  await db.transaction("rw", db.students, db.sessions, db.reports, db.payments, db.settings, async () => {
    for (const t of TABLES) {
      await (db as any)[t].clear();
      const rows = await Promise.all((dump.data[t] ?? []).map(decodeRow));
      if (rows.length > 0) await (db as any)[t].bulkAdd(rows);
    }
  });
}
