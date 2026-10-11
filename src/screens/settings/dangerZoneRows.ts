import type { Table } from "dexie";
import { db } from "../../db/db";

/**
 * Daftar tabel yang dibersihkan oleh "Hapus Semua Data".
 *
 * Hidup di berkas sendiri (bukan di dalam komponen) karena dua sebab:
 *
 * 1. **Aturan `react-refresh/only-export-components`** — berkas komponen hanya
 *    boleh mengekspor komponen; kalau tidak, HMR-nya mati. Jebakan yang sama
 *    pernah memakan waktu di G3-06 (`PerbandinganNilai.tsx`).
 * 2. **Daftarnya harus bisa dibaca tes tanpa DOM** — repo ini tidak memasang
 *    jsdom, sehingga daftar seperti ini hanya bisa dijaga kalau ia fungsi murni
 *    atau data biasa.
 *
 * G3-10 butir 1: daftarnya **eksplisit dan lengkap**, dan nama tabelnya dipakai
 * apa adanya sebagai teks di dialog konfirmasi, sehingga tutor melihat persis
 * apa yang akan hilang. Kalau kelak ada tabel baru di `db.ts`, ia harus
 * ditambahkan di sini — dan teks yang dibaca tutor ikut berubah dengan sendirinya.
 *
 * Catatan urutan: `logAudit` menulis ke `db.auditLog` yang ikut dibersihkan, jadi
 * jejak reset **wajib ditulis SESUDAH** pembersihan. Urutan itu dijaga di
 * `jalankanResetSemuaData()`.
 */
export interface ResetTableDef {
  /** Nama yang dibaca tutor di dialog konfirmasi. */
  tabel: string;
  /** Nama tabel Dexie; dipakai tes untuk memastikan daftarnya lengkap. */
  nama: string;
  /**
   * Tabel Dexie-nya. Tipe `Table<unknown, unknown>` sengaja dipakai (bukan
   * `Table<Student, string>` dan seterusnya) supaya daftar ini bisa memuat tabel
   * dengan kunci dan bentuk berbeda tanpa `any` — dan tetap diterima
   * `db.transaction("rw", …)`.
   */
  ambil: () => Table<unknown, unknown>;
}

export const RESET_TABLES: readonly ResetTableDef[] = [
  { tabel: "murid", nama: "students", ambil: () => db.students as Table<unknown, unknown> },
  { tabel: "sesi", nama: "sessions", ambil: () => db.sessions as Table<unknown, unknown> },
  { tabel: "laporan", nama: "reports", ambil: () => db.reports as Table<unknown, unknown> },
  { tabel: "tagihan", nama: "payments", ambil: () => db.payments as Table<unknown, unknown> },
  { tabel: "tindak lanjut", nama: "followUps", ambil: () => db.followUps as Table<unknown, unknown> },
  { tabel: "nilai rapor", nama: "raporGrades", ambil: () => db.raporGrades as Table<unknown, unknown> },
  { tabel: "pengeluaran", nama: "expenses", ambil: () => db.expenses as Table<unknown, unknown> },
  { tabel: "proyek tugas panjang", nama: "iaeeProjects", ambil: () => db.iaeeProjects as Table<unknown, unknown> },
  { tabel: "catatan belajar", nama: "studyNotes", ambil: () => db.studyNotes as Table<unknown, unknown> },
  { tabel: "draf pencatatan sesi", nama: "captureDrafts", ambil: () => db.captureDrafts as Table<unknown, unknown> },
  { tabel: "pengaturan (PIN, kunci AI, logo, rekening, profil)", nama: "settings", ambil: () => db.settings as Table<unknown, unknown> },
  { tabel: "catatan audit", nama: "auditLog", ambil: () => db.auditLog as Table<unknown, unknown> },
];
