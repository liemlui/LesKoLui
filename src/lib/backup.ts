import { db } from "../db/db";
import { encryptJson, decryptJson } from "./crypto";
import type { Table } from "dexie";

const TABLES = ["students", "sessions", "reports", "payments", "settings", "raporGrades", "homeworks", "followUps", "expenses", "iaeeProjects"] as const;

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

  // Auto-export pre-restore backup so data is never lost (C-6)
  try {
    const preRestoreBlob = await exportBackup(passphrase);
    const ts = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const url = URL.createObjectURL(preRestoreBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leskolui-pre-restore-${ts}.jles`;
    a.click();
    // Revoke after two animation frames so browser can start the download
    requestAnimationFrame(() => requestAnimationFrame(() => URL.revokeObjectURL(url)));
  } catch {
    // Pre-backup failure should not block the restore
  }

  await db.transaction("rw", TABLES.map((t) => backupDb[t]), async () => {
    for (const t of TABLES) {
      const table = backupDb[t] as Table<BackupRow, string>;
      await table.clear();
      const rows = await Promise.all((dump.data[t] ?? []).map(decodeRow));
      if (rows.length > 0) await table.bulkAdd(rows);
    }
  });
}
