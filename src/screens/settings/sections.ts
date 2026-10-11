import type { SettingsSectionId } from "../../lib/settingsStatus";

/**
 * Daftar urutan bagian Pengaturan — **satu-satunya** tempat daftar ini hidup.
 *
 * G3-09 butir 4 menetapkan urutan yang mengikat:
 * Backup dan Restore · AI · Profil Tutor · PIN Keuangan · Rekening Bank ·
 * Aplikasi · Riwayat Aktivitas · Hapus Semua Data (paling bawah, di balik
 * pemisah zona bahaya).
 *
 * Dipisah dari komponen `Section.tsx` karena aturan `react-refresh/only-export-components`:
 * berkas komponen hanya boleh mengekspor komponen, kalau tidak HMR-nya mati.
 * Jebakan yang sama pernah memakan waktu di G3-06 (`PerbandinganNilai.tsx`).
 */
export interface SettingsSectionDef {
  id: SettingsSectionId;
  title: string;
  /** Satu-satunya bagian di zona berbahaya. */
  danger?: boolean;
}

export const SETTINGS_SECTIONS: readonly SettingsSectionDef[] = [
  { id: "backup", title: "Backup dan Restore" },
  { id: "ai", title: "AI — DeepSeek" },
  { id: "profil", title: "Profil Tutor" },
  { id: "pin", title: "PIN Keuangan" },
  { id: "rekening", title: "Rekening Bank" },
  { id: "aplikasi", title: "Aplikasi" },
  { id: "riwayat", title: "Riwayat Aktivitas" },
  { id: "bahaya", title: "Hapus Semua Data", danger: true },
];

/**
 * Judul bagian menurut id-nya.
 *
 * Dipakai badge dan pintasan baris ringkasan status, sehingga tidak ada judul
 * bagian yang disalin sebagai teks lepas di dua tempat — dua salinan pasti
 * berbeda begitu salah satunya diubah.
 */
export const SECTION_TITLE: Record<string, string> = Object.fromEntries(
  SETTINGS_SECTIONS.map((s) => [s.id, s.title]),
);
