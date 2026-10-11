/**
 * Ringkasan status tiga baris + badge keadaan per bagian (G3-09 butir 3 dan 11).
 *
 * Sebelum G3-09, keadaan "kapan backup terakhir", "AI hidup atau mati", dan
 * "penyimpanan terpakai berapa" hanya bisa diketahui dengan membuka tiga akordeon
 * berbeda satu per satu — dan tidak ada satu pun tempat yang memberi tahu bahwa
 * sesuatu **belum pernah** dilakukan. Tiga baris di bawah judul Pengaturan
 * menjawabnya sekaligus, masing-masing dengan pintasan ke bagiannya.
 *
 * Modul ini murni: tanpa React, tanpa IndexedDB, tanpa DOM. Yang diuji karena itu
 * adalah **teks dan nadanya**, bukan tampilannya.
 */

/** Nada menentukan warna teks; dipetakan ke token `--ink-*` oleh komponen. */
export type StatusTone = "ok" | "warn" | "info";

/** Id bagian akordeon — dipakai pintasan "Buka" agar tidak ada teks judul yang disalin. */
export type SettingsSectionId =
  | "backup"
  | "ai"
  | "profil"
  | "pin"
  | "rekening"
  | "aplikasi"
  | "riwayat"
  | "bahaya";

export interface SettingsStatusRow {
  id: "backup" | "ai" | "penyimpanan";
  label: string;
  value: string;
  tone: StatusTone;
  /** Id bagian yang dibuka pintasan ini. */
  section: SettingsSectionId;
  /** Teks tombol pintasan; pendek supaya muat satu baris di lebar 390 px. */
  action: string;
}

/** Masukan untuk baris "Backup terakhir". */
export interface BackupStatusInput {
  lastBackupAt?: string | null;
  driveBackupAt?: string | null;
}

/** Hasil penilaian umur backup; dipakai baris status DAN badge bagian Backup. */
export interface BackupAge {
  days: number | null;
  /** Kunci nada: `never` = belum pernah, `fresh` ≤7 hari, `stale` ≤30, `old` >30. */
  bucket: "never" | "fresh" | "stale" | "old";
  /** Kalimat pendek siap tampil, mis. "12 hari lalu". */
  text: string;
  tone: StatusTone;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Umur backup terakhir.
 *
 * Waktu yang dipakai adalah yang **terbaru** di antara backup berkas
 * (`lastBackupAt`) dan backup Drive (`driveBackup.driveBackupAt`): tutor yang
 * baru mengunggah ke Drive tidak boleh diberi tahu "belum backup" hanya karena
 * jalur berkasnya lama.
 *
 * Tanggal rusak atau di masa depan diperlakukan sebagai **belum pernah**, bukan
 * "0 hari lalu": memberi tahu tutor bahwa backup-nya baru saja dibuat padahal
 * stempel waktunya rusak adalah kebohongan yang berbahaya di layar ini.
 */
export function backupAge(input: BackupStatusInput, now: Date = new Date()): BackupAge {
  const raw = [input.lastBackupAt, input.driveBackupAt]
    .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    .map((v) => new Date(v))
    .filter((d) => !Number.isNaN(d.getTime()));

  if (raw.length === 0) {
    return { days: null, bucket: "never", text: "Belum pernah backup", tone: "warn" };
  }
  const newest = raw.reduce((a, b) => (a.getTime() >= b.getTime() ? a : b));
  const days = Math.floor((now.getTime() - newest.getTime()) / DAY_MS);

  if (days < 0) {
    return { days: null, bucket: "never", text: "Belum pernah backup", tone: "warn" };
  }
  if (days === 0) return { days, bucket: "fresh", text: "Hari ini", tone: "ok" };
  if (days === 1) return { days, bucket: "fresh", text: "Kemarin", tone: "ok" };
  if (days <= 7) return { days, bucket: "fresh", text: `${days} hari lalu`, tone: "ok" };
  if (days <= 30) return { days, bucket: "stale", text: `${days} hari lalu`, tone: "warn" };
  return { days, bucket: "old", text: `${days} hari lalu`, tone: "warn" };
}

/** Masukan untuk baris "AI". */
export interface AiStatusInput {
  enabled: boolean;
  hasApiKey: boolean;
  /** Pemakaian bulan berjalan; `undefined` = masih dihitung / tidak dihitung. */
  usage?: { terpakaiIdr: number; batasIdr?: number; terlampaui: boolean; jumlahPanggilan: number } | null;
}

/** Keadaan AI dalam satu kata, plus alasannya kalau tidak siap dipakai. */
export interface AiStatus {
  tone: StatusTone;
  text: string;
  /** Alasan terlihat saat AI mati atau tidak lengkap; `undefined` saat AI siap. */
  reason?: string;
}

/**
 * Keadaan AI. Urutan pemeriksaannya penting: "mati" diperiksa sebelum "tanpa
 * kunci", karena AI yang dimatikan tutor bukan cacat pengaturan.
 */
export function aiStatus(input: AiStatusInput): AiStatus {
  if (!input.enabled) {
    return { tone: "info", text: "Mati", reason: "AI tidak diaktifkan — tidak ada data yang dikirim ke DeepSeek." };
  }
  if (!input.hasApiKey) {
    return { tone: "warn", text: "Belum siap", reason: "Belum ada API Key DeepSeek, jadi fitur AI belum bisa dipakai." };
  }
  if (input.usage?.terlampaui) {
    return { tone: "warn", text: "Batas terlampaui", reason: "Batas belanja bulan ini sudah lewat — tombol AI nonaktif sampai batas dinaikkan atau bulan berganti." };
  }
  return { tone: "ok", text: "Aktif" };
}

/** Masukan untuk baris "Penyimpanan". */
export interface StorageStatusInput {
  used?: number | null;
  quota?: number | null;
}

export interface StorageStatus {
  tone: StatusTone;
  text: string;
  /** Persentase terpakai 0–100; `null` saat tidak bisa dihitung. */
  pct: number | null;
  available: boolean;
}

/**
 * Penyimpanan terpakai. `quota` nol atau tidak ada berarti pembagiannya tidak
 * bisa dihitung — hasilnya "tidak tersedia", **bukan** NaN% atau 0% yang membuat
 * tutor mengira penyimpanannya kosong.
 */
export function storageStatus(input: StorageStatusInput): StorageStatus {
  const { used, quota } = input;
  if (used == null || quota == null || quota <= 0) {
    return { tone: "info", text: "Perkiraan tidak tersedia", pct: null, available: false };
  }
  const pct = Math.min(100, Math.round((used / quota) * 100));
  const tone: StatusTone = pct >= 90 ? "warn" : "ok";
  return { tone, text: `${pct}% terpakai`, pct, available: true };
}

/**
 * Tiga baris ringkasan status di bawah judul Pengaturan (G3-09 butir 3).
 *
 * Urutannya tetap: backup, AI, penyimpanan — sama dengan urutan bagian baru, dan
 * urutan itu sendiri adalah bagian dari fiturnya (tutor memindai dari atas).
 */
export function settingsStatusRows(input: {
  backup: BackupStatusInput;
  ai: AiStatusInput;
  storage: StorageStatusInput;
  now?: Date;
}): SettingsStatusRow[] {
  const umur = backupAge(input.backup, input.now);
  const ai = aiStatus(input.ai);
  const storage = storageStatus(input.storage);
  return [
    {
      id: "backup",
      label: "Backup terakhir",
      value: umur.text,
      tone: umur.tone,
      section: "backup",
      action: "Backup",
    },
    {
      id: "ai",
      label: "AI",
      value: ai.text,
      tone: ai.tone,
      section: "ai",
      action: "Atur",
    },
    {
      id: "penyimpanan",
      label: "Penyimpanan",
      value: storage.text,
      tone: storage.tone,
      section: "aplikasi",
      action: "Lihat",
    },
  ];
}

/** Nada untuk badge di kepala tiap bagian akordeon (G3-09 butir 11). */
export interface SectionBadge {
  text: string;
  tone: StatusTone;
}

/** Badge bagian Backup: menyebut umur backup, bukan tanggal ISO mentah. */
export function backupSectionBadge(input: BackupStatusInput, now: Date = new Date()): SectionBadge {
  const umur = backupAge(input, now);
  return { text: umur.text, tone: umur.tone };
}

/**
 * Badge bagian Profil: "Lengkap" atau "N dari 4".
 *
 * Nama dan nomor WA yang wajib; email dan alamat opsional tetapi tetap dihitung
 * supaya tutor tahu ada yang bisa dilengkapi — dengan kata "opsional" di
 * keterangannya, bukan sebagai kesalahan.
 */
export function profileSectionBadge(profile: {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}): SectionBadge {
  const terisi = [profile.name, profile.phone, profile.email, profile.address]
    .filter((v) => typeof v === "string" && v.trim() !== "").length;
  if (terisi === 4) return { text: "Profil lengkap", tone: "ok" };
  return { text: `Profil ${terisi} dari 4`, tone: terisi === 0 ? "warn" : "info" };
}

/** Badge bagian PIN: aman untuk dikatakan terbuka — yang tampil hanya "Aktif"/"Belum". */
export function pinSectionBadge(hasPin: boolean): SectionBadge {
  return hasPin ? { text: "Aktif", tone: "ok" } : { text: "Belum diisi", tone: "warn" };
}

/** Badge bagian Rekening: jumlah rekening terisi, dan pengingat bila kosong. */
export function bankSectionBadge(bank: {
  bca?: string; cimb?: string; bri?: string; mandiri?: string; bsi?: string; ewallet?: string;
} | undefined): SectionBadge {
  const terisi = bank
    ? [bank.bca, bank.cimb, bank.bri, bank.mandiri, bank.bsi, bank.ewallet]
        .filter((v) => typeof v === "string" && v.trim() !== "").length
    : 0;
  if (terisi === 0) return { text: "Belum diisi", tone: "warn" };
  return { text: `${terisi} rekening`, tone: "ok" };
}
