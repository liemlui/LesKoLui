import { db } from "../db/db";
import { encryptJson, decryptJson } from "./crypto";
import { downloadBlob } from "./download";
import type { Table } from "dexie";

const TABLES = [
  "students", "sessions", "reports", "payments", "settings",
  "raporGrades", "homeworks", "followUps", "expenses", "iaeeProjects",
  "monthClosings",
] as const;

type BackupTable = typeof TABLES[number];
type BackupRow = Record<string, unknown>;
type BackupDump = {
  version: number;
  exportedAt: string;
  data: Partial<Record<BackupTable, BackupRow[]>>;
};
type BackupDb = typeof db & Record<BackupTable, Table<BackupRow, string>>;

const backupDb = db as BackupDb;

async function blobToB64(b: Blob): Promise<string> {
  const buf = new Uint8Array(await b.arrayBuffer());
  // Convert bytes to binary string via Array.from + charCode — handles all byte values safely
  const s = Array.from(buf, (byte) => String.fromCharCode(byte)).join("");
  return `data:${b.type};base64,${btoa(s)}`;
}

async function b64ToBlob(s: string): Promise<Blob> {
  const match = /^data:([^;,]*);base64,(.*)$/s.exec(s);
  if (!match) throw new Error("Format blob backup tidak valid.");
  const [, mime, b64] = match;
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime || "application/octet-stream" });
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
    out[k] = isBlobMarker(row[k]) ? await b64ToBlob(row[k].__blob) : row[k];
  }
  return out;
}

function isBlobMarker(value: unknown): value is { __blob: string } {
  return typeof value === "object" && value !== null && "__blob" in value && typeof value.__blob === "string";
}

export async function exportBackup(passphrase: string): Promise<Blob> {
  const dump: BackupDump = { version: 1, exportedAt: new Date().toISOString(), data: {} };
  for (const t of TABLES) {
    const table = backupDb[t] as Table<BackupRow, string>;
    const rows = await table.toArray();
    dump.data[t] = await Promise.all(rows.map(encodeRow));
  }
  return encryptJson(dump, passphrase);
}

export async function importBackup(file: Blob, passphrase: string): Promise<void> {
  // Verify the file can be decrypted BEFORE touching the database
  const dump = await decryptJson(file, passphrase) as BackupDump;
  if (!dump?.data) throw new Error("Invalid backup file");

  // Pre-validate: decode all rows BEFORE clearing any table.
  // If any row fails to decode (e.g. corrupt blob), we throw before data loss.
  const decoded: Partial<Record<BackupTable, BackupRow[]>> = {};
  for (const t of TABLES) {
    const rawRows = dump.data[t] ?? [];
    decoded[t] = await Promise.all(rawRows.map(decodeRow));
  }

  // Auto-export pre-restore backup so data is never lost (C-6)
  try {
    const preRestoreBlob = await exportBackup(passphrase);
    const ts = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    downloadBlob(preRestoreBlob, `leskolui-pre-restore-${ts}.jles`);
  } catch (e) {
    throw new Error(`Backup sebelum restore gagal: ${(e as Error).message}`, { cause: e });
  }

  await db.transaction("rw", TABLES.map((t) => backupDb[t]), async () => {
    for (const t of TABLES) {
      const table = backupDb[t] as Table<BackupRow, string>;
      await table.clear();
      const rows = decoded[t] ?? [];
      if (rows.length > 0) await table.bulkAdd(rows);
    }
  });
}
