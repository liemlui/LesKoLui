import { db } from "../db/db";
import { encryptJson, decryptJson } from "./crypto";
import { downloadBlob } from "./download";
import type { Table } from "dexie";

/**
 * Semua tabel data domain yang ikut berpindah antar-perangkat.
 * auditLog sengaja tidak masuk: ia adalah riwayat lokal per perangkat.
 */
export const BACKUP_TABLES = [
  "students", "sessions", "reports", "payments", "settings",
  "raporGrades", "followUps", "expenses", "iaeeProjects",
  "monthClosings", "studyNotes",
] as const;

/** Format payload JSON di dalam file terenkripsi. Versi 1 tetap didukung saat restore. */
export const BACKUP_VERSION = 2;

type BackupTable = typeof BACKUP_TABLES[number];
type BackupRow = Record<string, unknown>;
type BackupData = Record<BackupTable, BackupRow[]>;
type BackupDb = typeof db & Record<BackupTable, Table<BackupRow, string>>;

type BackupDumpV2 = {
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  schema: {
    databaseVersion: number;
    tableCounts: Record<BackupTable, number>;
  };
  data: BackupData;
};

type ParsedBackup = {
  version: 1 | typeof BACKUP_VERSION;
  exportedAt: string;
  data: BackupData;
};

export type BackupSummary = {
  version: 1 | typeof BACKUP_VERSION;
  exportedAt: string;
  tableCounts: Record<BackupTable, number>;
};

export type ImportBackupOptions = {
  /**
   * Dipanggil setelah cadangan data saat ini berhasil dibuat, tetapi sebelum
   * database diganti. Callback dapat menunggu mekanisme penyimpanan lain.
   */
  onPreRestoreBackup?: (backup: { blob: Blob; filename: string; summary: BackupSummary }) => Promise<void> | void;
};

export type ImportBackupResult = {
  restored: BackupSummary;
  preRestore: BackupSummary;
};

const backupDb = db as BackupDb;

// v1 lama tidak merekam daftar tabel. Lima tabel inti ini selalu ada sejak
// format backup pertama, sedangkan tabel tambahan boleh belum ada di file lama.
const LEGACY_REQUIRED_TABLES: readonly BackupTable[] = [
  "students", "sessions", "reports", "payments", "settings",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(object: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isBackupTable(value: string): value is BackupTable {
  return (BACKUP_TABLES as readonly string[]).includes(value);
}

function assertValidExportedAt(value: unknown): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error("File backup tidak valid: waktu ekspor tidak ditemukan.");
  }
  return value;
}

function assertRows(table: BackupTable, value: unknown): BackupRow[] {
  if (!Array.isArray(value)) {
    throw new Error(`File backup tidak valid: data tabel ${table} harus berupa daftar.`);
  }

  const ids = new Set<string>();
  for (const row of value) {
    if (!isRecord(row) || typeof row.id !== "string" || !row.id) {
      throw new Error(`File backup tidak valid: baris pada tabel ${table} tidak memiliki id.`);
    }
    if (ids.has(row.id)) {
      throw new Error(`File backup tidak valid: id ganda pada tabel ${table}.`);
    }
    ids.add(row.id);
  }
  return value as BackupRow[];
}

/** Parse dan validasi struktur payload sebelum satu tabel pun diubah. */
function parseBackupDump(value: unknown): ParsedBackup {
  if (!isRecord(value)) throw new Error("File backup tidak valid: format utama salah.");

  const version = value.version;
  if (version !== 1 && version !== BACKUP_VERSION) {
    throw new Error("Versi backup tidak didukung. Perbarui aplikasi sebelum melakukan restore.");
  }

  const exportedAt = assertValidExportedAt(value.exportedAt);
  if (!isRecord(value.data)) throw new Error("File backup tidak valid: data tidak ditemukan.");

  const rawData = value.data;
  for (const key of Object.keys(rawData)) {
    if (!isBackupTable(key)) {
      throw new Error(`Backup berisi tabel tidak dikenal (${key}). Perbarui aplikasi sebelum restore.`);
    }
  }

  const requiredTables = version === BACKUP_VERSION ? BACKUP_TABLES : LEGACY_REQUIRED_TABLES;
  for (const table of requiredTables) {
    if (!hasOwn(rawData, table)) {
      throw new Error(`File backup tidak lengkap: tabel ${table} tidak ditemukan.`);
    }
  }

  const data = {} as BackupData;
  for (const table of BACKUP_TABLES) {
    // File v1 dari aplikasi lama belum mengenal tabel baru. Mengosongkannya
    // berarti mengembalikan keadaan aplikasi pada saat backup tersebut dibuat.
    data[table] = hasOwn(rawData, table) ? assertRows(table, rawData[table]) : [];
  }

  if (version === BACKUP_VERSION) {
    if (!isRecord(value.schema) || !Number.isInteger(value.schema.databaseVersion)) {
      throw new Error("File backup tidak valid: metadata skema tidak ditemukan.");
    }
    if (!isRecord(value.schema.tableCounts)) {
      throw new Error("File backup tidak valid: jumlah data tabel tidak ditemukan.");
    }
    for (const table of BACKUP_TABLES) {
      const count = value.schema.tableCounts[table];
      if (!Number.isInteger(count) || typeof count !== "number" || count < 0 || count !== data[table].length) {
        throw new Error(`File backup tidak valid: jumlah data tabel ${table} tidak cocok.`);
      }
    }
  }

  return { version, exportedAt, data };
}

async function blobToB64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  // Hindari Array.from untuk foto besar: proses per blok agar tidak membuat array
  // per-byte tambahan di memori saat backup banyak foto.
  const CHUNK_SIZE = 0x8000;
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + CHUNK_SIZE)));
  }
  return `data:${blob.type};base64,${btoa(chunks.join(""))}`;
}

async function b64ToBlob(value: string): Promise<Blob> {
  const match = /^data:([^;,]*);base64,([A-Za-z0-9+/]*={0,2})$/s.exec(value);
  if (!match) throw new Error("Format blob backup tidak valid.");
  const [, mime, b64] = match;
  let binary: string;
  try {
    binary = atob(b64);
  } catch {
    throw new Error("Format blob backup tidak valid.");
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime || "application/octet-stream" });
}

function isBlobMarker(value: unknown): value is { __blob: string } {
  return isRecord(value)
    && Object.keys(value).length === 1
    && typeof value.__blob === "string";
}

async function encodeRow(row: BackupRow): Promise<BackupRow> {
  const out: BackupRow = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = value instanceof Blob ? { __blob: await blobToB64(value) } : value;
  }
  return out;
}

async function decodeRow(row: BackupRow): Promise<BackupRow> {
  const out: BackupRow = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = isBlobMarker(value) ? await b64ToBlob(value.__blob) : value;
  }
  return out;
}

async function encodeRows(rows: BackupRow[]): Promise<BackupRow[]> {
  const encoded: BackupRow[] = [];
  for (const row of rows) encoded.push(await encodeRow(row));
  return encoded;
}

async function decodeRows(rows: BackupRow[]): Promise<BackupRow[]> {
  const decoded: BackupRow[] = [];
  for (const row of rows) decoded.push(await decodeRow(row));
  return decoded;
}

/** Baca semua tabel dalam satu snapshot IndexedDB sebelum serialisasi media dimulai. */
async function readSnapshot(): Promise<BackupData> {
  const tables = BACKUP_TABLES.map((table) => backupDb[table]);
  return db.transaction("r", tables, async () => {
    const entries = await Promise.all(
      BACKUP_TABLES.map(async (table) => [table, await backupDb[table].toArray()] as const),
    );
    const snapshot = {} as BackupData;
    for (const [table, rows] of entries) snapshot[table] = rows as unknown as BackupRow[];
    return snapshot;
  });
}

function summaryOf(parsed: ParsedBackup): BackupSummary {
  const tableCounts = {} as Record<BackupTable, number>;
  for (const table of BACKUP_TABLES) tableCounts[table] = parsed.data[table].length;
  return { version: parsed.version, exportedAt: parsed.exportedAt, tableCounts };
}

async function buildBackup(passphrase: string): Promise<{ blob: Blob; summary: BackupSummary }> {
  const snapshot = await readSnapshot();
  const data = {} as BackupData;
  for (const table of BACKUP_TABLES) data[table] = await encodeRows(snapshot[table]);

  const exportedAt = new Date().toISOString();
  const tableCounts = {} as Record<BackupTable, number>;
  for (const table of BACKUP_TABLES) tableCounts[table] = data[table].length;
  const dump: BackupDumpV2 = {
    version: BACKUP_VERSION,
    exportedAt,
    schema: { databaseVersion: db.verno, tableCounts },
    data,
  };
  return {
    blob: await encryptJson(dump, passphrase),
    summary: { version: BACKUP_VERSION, exportedAt, tableCounts },
  };
}

async function prepareBackupImport(file: Blob, passphrase: string): Promise<{ parsed: ParsedBackup; decoded: BackupData }> {
  const parsed = parseBackupDump(await decryptJson(file, passphrase));
  const decoded = {} as BackupData;
  for (const table of BACKUP_TABLES) decoded[table] = await decodeRows(parsed.data[table]);

  // Metadata operasional tidak boleh kembali menjadi lebih baru/lebih lama secara
  // tidak konsisten: setelah restore, waktu backup menunjukkan file sumbernya.
  if (decoded.settings.length === 1) decoded.settings[0].lastBackupAt = parsed.exportedAt;

  return { parsed, decoded };
}

/** Memeriksa dekripsi dan struktur backup tanpa menyentuh database lokal. */
export async function inspectBackup(file: Blob, passphrase: string): Promise<BackupSummary> {
  const { parsed } = await prepareBackupImport(file, passphrase);
  return summaryOf(parsed);
}

export async function exportBackup(passphrase: string): Promise<Blob> {
  return (await buildBackup(passphrase)).blob;
}

export async function importBackup(
  file: Blob,
  passphrase: string,
  options: ImportBackupOptions = {},
): Promise<ImportBackupResult> {
  // Dekripsi, validasi bentuk, dan decode media selesai sebelum data saat ini
  // disentuh. File corrupt atau versi tak didukung tidak bisa menghapus data.
  const { parsed, decoded } = await prepareBackupImport(file, passphrase);

  // Buat cadangan tambahan dari kondisi sekarang sebelum restore. Callback
  // memungkinkan UI memakai penyimpanan yang lebih eksplisit bila tersedia.
  let preRestore: { blob: Blob; summary: BackupSummary };
  try {
    preRestore = await buildBackup(passphrase);
    const filename = `leskolui-pre-restore-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.jles`;
    if (options.onPreRestoreBackup) await options.onPreRestoreBackup({ ...preRestore, filename });
    else downloadBlob(preRestore.blob, filename);
  } catch (error) {
    throw new Error(`Backup sebelum restore gagal: ${(error as Error).message}`, { cause: error });
  }

  // clear + bulkAdd berada dalam satu transaksi. Bila salah satu operasi gagal,
  // IndexedDB membatalkan seluruh perubahan dan data lama tetap ada.
  const tables = BACKUP_TABLES.map((table) => backupDb[table]);
  await db.transaction("rw", tables, async () => {
    for (const table of BACKUP_TABLES) {
      await backupDb[table].clear();
      const rows = decoded[table];
      if (rows.length > 0) await backupDb[table].bulkAdd(rows);
    }
  });

  return { restored: summaryOf(parsed), preRestore: preRestore.summary };
}
