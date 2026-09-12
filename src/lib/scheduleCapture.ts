/**
 * Penjaga alur "menyelesaikan jadwal" (`/capture?scheduleId=…`).
 *
 * `markSessionDone` di repositori memperbarui baris sesi berdasarkan id jadwal
 * dan **tidak** menerima `studentId`/`date` — jadi bila wizard membiarkan tutor
 * mengubah murid atau tanggal, perubahannya hilang tanpa peringatan dan catatan
 * sesi tertulis pada murid yang berbeda dari yang tampil di layar (audit C-02).
 *
 * Karena itu: (1) wizard mengunci kedua kontrol itu, dan (2) `handleSave` tetap
 * memverifikasi ulang lewat fungsi murni di bawah sebagai jaring pengaman —
 * kalau suatu saat kontrolnya dibuka lagi, penyimpanan akan menolak, bukan
 * diam-diam menulis ke murid yang salah.
 */
export interface ScheduleCaptureLock {
  studentId: string;
  date: string;
}

export function scheduleCaptureMismatch(
  lock: ScheduleCaptureLock | null,
  formStudentId: string,
  formDate: string,
): string | null {
  if (!lock) return null;
  if (lock.studentId !== formStudentId) {
    return "Murid tidak cocok dengan jadwal yang sedang diselesaikan. Muat ulang halaman Catat Sesi dan coba lagi.";
  }
  if (lock.date !== formDate) {
    return "Tanggal tidak cocok dengan jadwal yang sedang diselesaikan. Muat ulang halaman Catat Sesi dan coba lagi.";
  }
  return null;
}
