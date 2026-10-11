import { db } from "../../db/db";
import { logAudit } from "../../db/repos";
import { RESET_TABLES } from "./dangerZoneRows";

/**
 * Jalankan "Hapus Semua Data".
 *
 * Dipisah dari komponennya karena dua sebab:
 * 1. **`react-refresh/only-export-components`** — berkas komponen tidak boleh
 *    mengekspor fungsi biasa, kalau tidak HMR-nya mati.
 * 2. Urutannya perlu bisa dibaca dan dites sendiri. Urutan yang **mengikat**:
 *    bersihkan tabel dulu → tulis SATU catatan audit → pemanggil memuat ulang.
 *    `logAudit` menulis ke `db.auditLog` yang ikut dibersihkan, jadi urutan
 *    sebaliknya akan menghapus jejaknya sendiri dan tidak ada bukti bahwa reset
 *    pernah terjadi.
 *
 * G3-10 butir 4 meminta jejak audit itu tetap ada — itulah alasan urutan ini
 * ditulis di sini, bukan diserahkan pada urutan pemanggilan di komponen.
 */
export async function jalankanResetSemuaData(): Promise<void> {
  const tabel = RESET_TABLES.map((t) => t.ambil());
  await db.transaction("rw", tabel, async () => {
    for (const t of tabel) await t.clear();
  });
  await logAudit("data.reset", "data");
  // Pengingat backup terakhir ikut dibuang supaya pengingat muncul lagi setelah
  // reset — itulah yang dijanjikan teks di layar kepada tutor.
  try { localStorage.removeItem("leskolui_last_auto_backup_prompt"); } catch { /* penyimpanan tidak tersedia */ }
}
