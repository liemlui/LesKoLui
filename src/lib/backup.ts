import { db } from "../db/db";
import { encryptJson, decryptJson } from "./crypto";
import { downloadBlob } from "./download";
import { invoiceDueAt } from "./finance";
import { validateBackupData } from "./backupValidation";
import type { Table } from "dexie";
import type { ValidationWarning } from "./backupValidation";

/**
 * Semua tabel data domain yang ikut berpindah antar-perangkat.
 * auditLog sengaja tidak masuk: ia adalah riwayat lokal per perangkat.
 */
export const BACKUP_TABLES = [
  "students", "sessions", "reports", "payments", "settings",
  "raporGrades", "followUps", "expenses", "iaeeProjects",
  "studyNotes",
] as const;

/** Format payload JSON di dalam file terenkripsi. Versi 1 tetap didukung saat restore. */
export const BACKUP_VERSION = 2;

export type BackupTable = typeof BACKUP_TABLES[number];
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
  /** v1 belum menyimpan versi skema; semua payload v1 diperlakukan sebagai pra-v11. */
  databaseVersion?: number;
  data: BackupData;
};

export type BackupSummary = {
  version: 1 | typeof BACKUP_VERSION;
  exportedAt: string;
  tableCounts: Record<BackupTable, number>;
  warnings: ValidationWarning[];
};

export type ImportBackupOptions = {
  /**
   * Dipanggil setelah cadangan data saat ini berhasil dibuat, tetapi sebelum
   * database diganti. Callback dapat menunggu mekanisme penyimpanan lain.
   */
  onPreRestoreBackup?: (backup: { blob: Blob; filename: string; summary: BackupSummary }) => Promise<void> | void;
  /**
   * Dipanggil ketika backup memiliki peringatan validasi yang perlu
   * diakui pengguna sebelum restore dilanjutkan. Kembalikan false untuk
   * membatalkan restore; true untuk melanjutkan.
   */
  onValidationWarnings?: (warnings: ValidationWarning[]) => Promise<boolean> | boolean;
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

/**
 * Nama kolom primary key per tabel backup. Hampir semua tabel memakai `id`;
 * studyNotes memakai `studentId` sebagai primary key (lihat db.ts:68).
 */
const TABLE_ID_FIELD: Record<BackupTable, string> = {
  students: "id", sessions: "id", reports: "id", payments: "id", settings: "id",
  raporGrades: "id", followUps: "id", expenses: "id", iaeeProjects: "id",
  studyNotes: "studentId",
};

function assertRows(table: BackupTable, value: unknown): BackupRow[] {
  if (!Array.isArray(value)) {
    throw new Error(`File backup tidak valid: data tabel ${table} harus berupa daftar.`);
  }

  const idField = TABLE_ID_FIELD[table];
  const ids = new Set<string>();
  for (const row of value) {
    if (!isRecord(row) || typeof row[idField] !== "string" || !row[idField]) {
      throw new Error(`File backup tidak valid: baris pada tabel ${table} tidak memiliki ${idField}.`);
    }
    if (ids.has(row[idField])) {
      throw new Error(`File backup tidak valid: id ganda pada tabel ${table}.`);
    }
    ids.add(row[idField]);
  }
  return value as BackupRow[];
}

function backupRowKey(studentId: unknown, month: unknown): string | undefined {
  if (typeof studentId !== "string" || !studentId || typeof month !== "string" || !month) {
    return undefined;
  }
  return JSON.stringify([studentId, month]);
}

function fullMonthPeriod(month: unknown): { periodStart: string; periodEnd: string } | undefined {
  if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) return undefined;
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  if (monthNumber < 1 || monthNumber > 12) return undefined;
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return {
    periodStart: `${month}-01`,
    periodEnd: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

/**
 * Restore memasukkan baris langsung ke DB yang sudah v11, sehingga callback
 * upgrade Dexie v11 tidak pernah berjalan. Terapkan backfill yang sama pada
 * payload pra-v11 dan hubungkan pasangan laporan/tagihan bulanan yang tidak
 * ambigu. Nilai bisnis tagihan (nominal, status, sumber, tanggal bayar) tidak
 * disentuh.
 */
function migrateLegacyReportBilling(data: BackupData): void {
  const reportsById = new Map<string, BackupRow>();
  const reportsByStudentMonth = new Map<string, BackupRow[]>();

  for (const report of data.reports) {
    if (typeof report.periodStart !== "string" || typeof report.periodEnd !== "string") {
      const period = fullMonthPeriod(report.month);
      if (period) Object.assign(report, period);
    }

    reportsById.set(report.id as string, report);
    const key = backupRowKey(report.studentId, report.month);
    if (key) reportsByStudentMonth.set(key, [...(reportsByStudentMonth.get(key) ?? []), report]);
  }

  // Payment yang sudah memiliki reportId tetap perlu memperoleh periode bila
  // backup dibuat ketika kolom periode belum tersedia.
  const linkedReportIds = new Set<string>();
  for (const payment of data.payments) {
    if (typeof payment.reportId !== "string" || !payment.reportId) continue;
    const report = reportsById.get(payment.reportId);
    if (!report) continue;
    linkedReportIds.add(payment.reportId);
    if (typeof payment.periodStart !== "string" && typeof report.periodStart === "string") {
      payment.periodStart = report.periodStart;
    }
    if (typeof payment.periodEnd !== "string" && typeof report.periodEnd === "string") {
      payment.periodEnd = report.periodEnd;
    }
  }

  const unlinkedPaymentsByStudentMonth = new Map<string, BackupRow[]>();
  for (const payment of data.payments) {
    if (typeof payment.reportId === "string" && payment.reportId) continue;
    const key = backupRowKey(payment.studentId, payment.month);
    if (key) {
      unlinkedPaymentsByStudentMonth.set(key, [
        ...(unlinkedPaymentsByStudentMonth.get(key) ?? []),
        payment,
      ]);
    }
  }

  // Skema lama lazimnya memiliki tepat satu laporan dan satu tagihan per
  // murid-bulan. Jika ada duplikat, jangan menebak dan berisiko menautkan
  // tagihan ke laporan yang salah.
  for (const [key, payments] of unlinkedPaymentsByStudentMonth) {
    const reports = (reportsByStudentMonth.get(key) ?? [])
      .filter((report) => !linkedReportIds.has(report.id as string));
    if (payments.length !== 1 || reports.length !== 1) continue;

    const payment = payments[0];
    const report = reports[0];
    payment.reportId = report.id;
    if (typeof payment.periodStart !== "string" && typeof report.periodStart === "string") {
      payment.periodStart = report.periodStart;
    }
    if (typeof payment.periodEnd !== "string" && typeof report.periodEnd === "string") {
      payment.periodEnd = report.periodEnd;
    }
    linkedReportIds.add(report.id as string);
  }

  // A missing status is a useful legacy signal: without a paid or manually
  // priced invoice, its old session snapshot may safely be refreshed after a
  // restore. Preserve explicit statuses, and only materialize confirmation
  // when the restored payment is already an accounting snapshot.
  const protectedReportIds = new Set(
    data.payments
      .filter((payment) =>
        typeof payment.reportId === "string"
        && Boolean(payment.reportId)
        && (payment.status === "PAID" || payment.source === "manual")
      )
      .map((payment) => payment.reportId as string),
  );
  for (const report of data.reports) {
    if (
      (!hasOwn(report, "status") || report.status === undefined)
      && protectedReportIds.has(report.id as string)
    ) {
      report.status = "confirmed";
    }
  }
}

/**
 * Restore melakukan bulkAdd langsung ke schema terbaru, sehingga callback
 * upgrade Dexie tidak dijalankan. Isi dueAt untuk backup lama dengan fallback
 * historis yang sama seperti migration DB: periodEnd lalu akhir bulan anchor.
 */
function migrateLegacyPaymentDueDates(data: BackupData): void {
  for (const payment of data.payments) {
    const dueAt = invoiceDueAt(payment);
    if (dueAt && payment.dueAt !== dueAt) payment.dueAt = dueAt;
  }
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
    // Legacy: file backup lama menyertakan snapshot Tutup Bulan yang sudah
    // dihapus dari skema — datanya diabaikan, jangan tolak file-nya.
    if (key === "monthClosings") continue;
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

  let databaseVersion: number | undefined;
  if (version === BACKUP_VERSION) {
    if (!isRecord(value.schema)
      || typeof value.schema.databaseVersion !== "number"
      || !Number.isInteger(value.schema.databaseVersion)) {
      throw new Error("File backup tidak valid: metadata skema tidak ditemukan.");
    }
    databaseVersion = value.schema.databaseVersion;
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

  return { version, exportedAt, databaseVersion, data };
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
  return { version: parsed.version, exportedAt: parsed.exportedAt, tableCounts, warnings: [] };
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
    summary: { version: BACKUP_VERSION, exportedAt, tableCounts, warnings: [] },
  };
}

async function prepareBackupImport(file: Blob, passphrase: string): Promise<{ parsed: ParsedBackup; decoded: BackupData; warnings: ValidationWarning[] }> {
  const parsed = parseBackupDump(await decryptJson(file, passphrase));
  const decoded = {} as BackupData;
  for (const table of BACKUP_TABLES) decoded[table] = await decodeRows(parsed.data[table]);

  if (parsed.version === 1 || (parsed.databaseVersion ?? 0) < 11) {
    migrateLegacyReportBilling(decoded);
  }
  migrateLegacyPaymentDueDates(decoded);

  // Metadata operasional tidak boleh kembali menjadi lebih baru/lebih lama secara
  // tidak konsisten: setelah restore, waktu backup menunjukkan file sumbernya.
  if (decoded.settings.length === 1) decoded.settings[0].lastBackupAt = parsed.exportedAt;

  // Validasi data dan relasi setelah migrasi dan decode.
  const validation = validateBackupData(decoded, parsed.databaseVersion);
  if (!validation.valid) {
    const messages = validation.errors.map((e) => e.message).join("; ");
    throw new Error(`Backup tidak valid: ${messages}`);
  }

  return { parsed, decoded, warnings: validation.warnings };
}

/** Memeriksa dekripsi dan struktur backup tanpa menyentuh database lokal. */
export async function inspectBackup(file: Blob, passphrase: string): Promise<BackupSummary> {
  const { parsed, warnings } = await prepareBackupImport(file, passphrase);
  return { ...summaryOf(parsed), warnings };
}

export async function exportBackup(passphrase: string): Promise<Blob> {
  return (await buildBackup(passphrase)).blob;
}

export async function importBackup(
  file: Blob,
  passphrase: string,
  options: ImportBackupOptions = {},
): Promise<ImportBackupResult> {
  // Dekripsi, validasi bentuk, decode media, dan validasi data selesai sebelum
  // data saat ini disentuh. File corrupt, versi tak didukung, atau data tidak
  // valid tidak bisa menghapus data.
  const { parsed, decoded, warnings } = await prepareBackupImport(file, passphrase);

  // Tanyakan pengguna untuk peringatan validasi sebelum melanjutkan.
  if (warnings.length > 0 && options.onValidationWarnings) {
    const acknowledged = await options.onValidationWarnings(warnings);
    if (!acknowledged) {
      throw new Error("Restore dibatalkan oleh pengguna karena peringatan validasi.");
    }
  }

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
  const tables = [...BACKUP_TABLES.map((table) => backupDb[table]), db.captureDrafts];
  await db.transaction("rw", tables, async () => {
    for (const table of BACKUP_TABLES) {
      await backupDb[table].clear();
      const rows = decoded[table];
      if (rows.length > 0) await backupDb[table].bulkAdd(rows);
    }
    await db.captureDrafts.clear();
  });

  const restored = summaryOf(parsed);
  return { restored: { ...restored, warnings }, preRestore: { ...preRestore.summary, warnings: [] } };
}
