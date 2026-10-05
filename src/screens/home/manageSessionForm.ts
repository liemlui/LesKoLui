/**
 * Aturan bentuk untuk sheet "Kelola sesi" (G3-01 L4 bagian 2).
 *
 * Dipisah dari komponennya dengan alasan yang sama seperti `manageSession.ts`:
 * toolchain ini belum punya React Testing Library, jadi apa pun yang bisa
 * dinyatakan sebagai data **harus** keluar dari JSX supaya bisa diuji.
 *
 * Yang tinggal di sini bukan "aturan bisnis baru", melainkan **potret nilai awal
 * dari dua modal lama** — diambil dari perilakunya yang sudah berjalan supaya
 * penggabungan tidak diam-diam mengubah hasil simpan.
 */
import type { Session, Student } from "../../db/types";
import { todayWIB } from "../../lib/format";
import type { EditMode } from "../../db/repos";
import type { SesiAksi } from "./manageSession";

/** Nilai awal kolom isian. Semua bertipe string/angka datar supaya mudah diuji. */
export interface SesiFormAwal {
  studentId: string;
  date: string;
  time: string;
  durationHours: number;
  mode: EditMode;
  reason: string;
}

/**
 * Nilai awal kolom isian, disalin dari perilaku dua modal lama:
 *
 * | Kolom | Modal "ubah jadwal" | Modal "sesi terlewat" | Di sini |
 * |---|---|---|---|
 * | murid | `session.studentId` | — (tidak ada pemilih murid) | `session.studentId` |
 * | tanggal | `session.date` | **hari ini WIB** | per aksi: `simpan-perubahan` pakai `session.date`, `jadwalkan-ulang` pakai `todayWIB()` |
 * | jam | `session.time ?? "08:00"` | sama | `session.time ?? "08:00"` |
 * | durasi | `session.durationHours` | sama | `session.durationHours` |
 * | cakupan seri | `"this"` | — | `"this"` |
 *
 * `todayWIB()` dipakai (bukan `new Date()`) karena tanggal pengganti tidak boleh
 * sudah lewat menurut WIB — `rescheduleSession` menolaknya dengan galat.
 * Karena `date` bergantung pada aksi yang dipilih, ia diisi saat aksi dibuka
 * (`defaultDate()`), bukan sekali di sini.
 */
export function sesiFormAwal(session: Session): SesiFormAwal {
  return {
    studentId: session.studentId,
    date: session.date,
    time: session.time ?? "08:00",
    durationHours: session.durationHours,
    mode: "this",
    reason: "",
  };
}

/**
 * Tanggal awal untuk sebuah aksi.
 *
 * `jadwalkan-ulang` membuat **jadwal pengganti** dari sesi yang sudah lewat, jadi
 * titik awalnya hari ini — bukan tanggal sesi asal yang sudah lampau (kalau
 * memakai tanggal asal, `rescheduleSession` langsung menolak dan tutor melihat
 * galat sebelum sempat berbuat apa pun).
 */
export function defaultDate(aksi: SesiAksi | null, session: Session): string {
  return aksi === "jadwalkan-ulang" ? todayWIB() : session.date;
}

/**
 * Apakah kolom "Murid" perlu ditampilkan?
 *
 * Hanya jalur yang benar-benar menyimpan murid baru. Modal "sesi terlewat" tidak
 * pernah menawarkan pemilih murid: memindahkan sesi terlewat ke murid lain akan
 * memindahkan tagihan yang sudah tertaut ke sesi itu — perubahan arti data, bukan
 * perubahan jadwal.
 */
export function tampilkanPemilihMurid(aksi: SesiAksi | null): boolean {
  return aksi === "simpan-perubahan";
}

/**
 * Cakupan seri yang benar-benar dikirim ke repo.
 *
 * `cancelSeriesSessions`/`updateSeriesSessions` jatuh ke mode "this" bila sesi
 * tidak punya `seriesId`, dan pilihan cakupan memang tidak ditampilkan untuk sesi
 * tunggal (lihat `aksiLainnya()` di `manageSession.ts`). Jadi nilainya ditegaskan
 * di sini, bukan diserahkan ke tebakan repo.
 */
export function modeEfektif(berseri: boolean, mode: EditMode): EditMode {
  return berseri ? mode : "this";
}

/** Jawaban tombol utama pada percobaan simpan. */
export interface HasilSimpan {
  ok: boolean;
  pesan: string;
}

/**
 * Validasi jalur `jadwalkan-ulang` **sebelum** menyentuh DB.
 *
 * `rescheduleSession` sendiri sudah menolak tanggal lampau dan durasi tidak sah,
 * tetapi pesan aslinya berbahasa Inggris dan teknis (`"Tanggal pengganti tidak
 * boleh sudah lewat"` sudah Indonesia, `"Duration must be multiple of 0.5 hours"`
 * belum). Pesan di sini muncul sebagai toast, jadi ia harus bisa dibaca tutor —
 * dan tetap **tidak** menggantikan penjagaan repo: repo tetap dipanggil dan
 * galatnya tetap ditampilkan apa adanya.
 */
export function validasiReschedule(
  input: { date: string; time: string; durationHours: number },
  today = todayWIB(),
): HasilSimpan {
  if (!input.date) return { ok: false, pesan: "Pilih tanggal pengganti dulu." };
  if (input.date < today) return { ok: false, pesan: "Tanggal pengganti tidak boleh sudah lewat." };
  if (!(input.durationHours > 0)) return { ok: false, pesan: "Durasi sesi harus lebih dari 0 jam." };
  return { ok: true, pesan: "" };
}

/** Daftar murid untuk `<select>`, dengan murid sesi ini selalu ada di dalamnya. */
export function pilihanMurid(students: readonly Student[], session: Session): Student[] {
  return students.filter((s) => s.active || s.id === session.studentId);
}

/**
 * Aksi mana yang wajib dikonfirmasi lebih dulu, dan dengan kalimat apa.
 *
 * Aturan yang dipegang: **aksi yang menghapus/membatalkan tidak boleh berjalan
 * tanpa satu langkah konfirmasi.** Dua modal lama sudah begitu untuk penghapusan
 * lewat jalur lain di aplikasi ini (`ConfirmSheet`), dan L4 tidak boleh
 * melonggarkannya hanya karena panelnya berubah bentuk. Yang **tidak** dikonfirmasi:
 * `simpan-perubahan` dan `tidak-hadir` (bisa dikoreksi dari riwayat sesi) serta
 * `catat` (membuka wizard, belum menyimpan apa pun).
 */
export interface KonfirmasiAksi {
  title: string;
  message: string;
  confirmLabel: string;
}

export function konfirmasiUntuk(
  aksi: SesiAksi,
  ctx: { studentName: string; berseri: boolean },
): KonfirmasiAksi | null {
  switch (aksi) {
    case "batal-les":
    case "batalkan-sesi":
      return {
        title: "Batalkan sesi ini?",
        message: ctx.berseri
          ? `${ctx.studentName} — sesi dibatalkan dengan cakupan yang dipilih ("Sesi ini saja" bila tidak diubah). Sesi yang batal tidak ditagihkan.`
          : `${ctx.studentName} — sesi ini tidak dijadwalkan ulang dan tidak ditagihkan.`,
        confirmLabel: "Ya, batalkan",
      };
    case "hapus":
      return {
        title: "Hapus sesi ini?",
        message: "Sesi dihapus dari jadwal dan riwayat.",
        confirmLabel: "Ya, hapus",
      };
    default:
      return null;
  }
}
