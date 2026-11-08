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

/**
 * Pilihan tutor saat pemilik sesi berganti.
 *
 * `tarif-baru` melepas nominal manual secara eksplisit lalu menghitung ulang
 * memakai tarif murid baru. `manual` mempertahankan nominal yang pernah
 * ditetapkan tutor. Pilihan ini hanya berlaku saat `studentId` benar-benar
 * berubah; mengganti jam/tanggal tidak boleh melepas nominal manual.
 */
export type NominalMovePolicy = "tarif-baru" | "manual";

/** Bentuk patch yang dikirim ke `updateSeriesSessions` untuk jalur ubah jadwal. */
export type PatchUbahJadwal =
  Partial<Pick<Session, "time" | "durationHours" | "studentId" | "date">>
  & { costOverride?: null };

/** Kolom isian yang ikut menentukan patch ubah jadwal. */
export interface FormUbahJadwal {
  muridId: string;
  tanggal: string;
  jam: string;
  durasi: number;
  cakupan: EditMode;
  kebijakanNominal: NominalMovePolicy;
}

/**
 * Patch untuk aksi `simpan-perubahan`.
 *
 * **Aturan yang dipegang (perbaikan 2026-10-05).** `durationHours` hanya dikirim
 * bila durasinya **benar-benar berubah**. Sebabnya ada di repo: `updateSession()`
 * menghitung ulang `cost` **dan melepas `costOverride`** setiap kali
 * `durationHours` ADA di dalam patch — syaratnya `patch.durationHours !== undefined`,
 * bukan "nilainya berbeda". Modal lama (`EditSessionModal`) selalu mengirim durasi,
 * jadi menekan "Simpan perubahan" sekadar untuk mengubah jam atau **murid**
 * menghapus nominal manual tutor tanpa sebab. Dijaga dua lapis: aturan ini (murni,
 * cepat) dan tes repo yang membuktikan `costOverride` bertahan saat durasi tidak
 * ikut dikirim.
 */
export function patchUbahJadwal(
  session: Session,
  form: FormUbahJadwal,
  tanggalAsal: string,
): PatchUbahJadwal {
  const studentId = form.muridId || session.studentId;
  const patch: PatchUbahJadwal = {
    studentId,
    time: form.jam,
  };
  // Hanya perpindahan pemilik yang boleh menyentuh kebijakan nominal. Mengubah
  // jam/tanggal dengan murid yang sama tidak boleh melepas nominal manual.
  if (studentId !== session.studentId && form.kebijakanNominal === "tarif-baru") {
    patch.costOverride = null;
  }
  if (form.durasi !== session.durationHours) patch.durationHours = form.durasi;
  if (form.cakupan === "this" && form.tanggal !== tanggalAsal) patch.date = form.tanggal;
  return patch;
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

/**
 * Daftar murid untuk `<select>` — **semua** murid, urutan apa adanya.
 *
 * **Diperbaiki 2026-10-05 (laporan pemilik: "tidak bisa ganti ke murid lain").**
 * Sebelumnya fungsi ini menyaring `s.active || s.id === session.studentId` dengan
 * maksud "murid aktif + murid sesi ini". Maksud itu **tidak pernah tercapai**:
 * `Home.tsx` memuat daftarnya lewat `listStudents(true)` (aktif saja), jadi murid
 * nonaktif tidak ada di daftar masuk dan filter tidak bisa memasukkannya kembali —
 * pemilihnya bahkan bisa kosong sama sekali.
 *
 * Sekarang seluruh daftar diteruskan, dan yang nonaktif **ditandai** di layar
 * ("(nonaktif)") alih-alih disembunyikan. Pekerjaan pemilih ini adalah "sesi ini
 * milik siapa", bukan "siapa yang boleh dijadwalkan baru" — murid yang berhenti les
 * tetap mungkin perlu memikul sesi lama yang salah tempel.
 */
export function pilihanMurid(students: readonly Student[]): Student[] {
  return [...students];
}

/**
 * Aksi mana yang wajib dikonfirmasi lebih dulu, dan dengan kalimat apa.
 *
 * Aturan yang dipegang: **aksi yang menghapus/membatalkan tidak boleh berjalan
 * tanpa satu langkah konfirmasi.** Dua modal lama sudah begitu untuk penghapusan
 * lewat jalur lain di aplikasi ini (`ConfirmSheet`), dan L4 tidak boleh
 * melonggarkannya hanya karena panelnya berubah bentuk. Yang **tidak** dikonfirmasi:
 * `tidak-hadir` (bisa dikoreksi dari riwayat sesi) dan `catat` (membuka wizard,
 * belum menyimpan apa pun).
 *
 * **Pengecualian yang ditambahkan 2026-10-05:** `simpan-perubahan` dikonfirmasi
 * **hanya bila muridnya berganti** — memindahkan sesi ke murid lain memindahkan
 * tagihannya. Sejak keputusan pemilik di hari yang sama, nominalnya **dihitung ulang
 * memakai tarif murid baru** (kecuali tutor pernah mengisi nominal manual), jadi
 * kalimat konfirmasinya menyebut aturan itu apa adanya. Mengubah jam/tanggal/durasi
 * tanpa ganti murid tetap tidak dikonfirmasi, persis seperti sebelumnya.
 */
export interface KonfirmasiAksi {
  title: string;
  message: string;
  confirmLabel: string;
}

/** Konteks pesan konfirmasi. Nama murid baru/lama hanya dipakai jalur ubah jadwal. */
export interface KonteksKonfirmasi {
  studentName: string;
  berseri: boolean;
  /** Nama murid yang sekarang memiliki sesi — dipakai pada teks konfirmasi. */
  muridLama?: string;
  /** Nama murid yang dipilih di kolom "Murid". */
  muridBaru?: string;
  /** ID dipakai untuk mendeteksi pergantian ketika nama murid tidak unik. */
  muridLamaId?: string;
  muridBaruId?: string;
  /** Sesi ini benar-benar punya nominal manual positif. */
  adaNominalManual?: boolean;
  /**
   * Pilihan tutor saat pemilik berganti. Bawaan `manual` hanya untuk kompatibilitas
   * pemanggil lama; sheet selalu mengirim pilihan yang terlihat oleh tutor.
   */
  kebijakanNominal?: NominalMovePolicy;
}

function pemilikBerubah(ctx: {
  muridLama?: string;
  muridBaru?: string;
  muridLamaId?: string;
  muridBaruId?: string;
}): boolean {
  if (ctx.muridLamaId !== undefined && ctx.muridBaruId !== undefined) {
    return ctx.muridLamaId !== ctx.muridBaruId;
  }
  return ctx.muridLama !== undefined
    && ctx.muridBaru !== undefined
    && ctx.muridLama !== ctx.muridBaru;
}

function sebutanMuridBaru(ctx: {
  muridLama?: string;
  muridBaru?: string;
  muridLamaId?: string;
  muridBaruId?: string;
}): string {
  return ctx.muridLama !== undefined
    && ctx.muridLama === ctx.muridBaru
    && pemilikBerubah(ctx)
    ? `murid lain bernama ${ctx.muridBaru}`
    : ctx.muridBaru ?? "";
}

export function konfirmasiUntuk(
  aksi: SesiAksi,
  ctx: KonteksKonfirmasi,
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
    case "jadwalkan-ulang":
      /**
       * **Keputusan pemilik 2026-10-15 (B1, pilihan (b)):** nominal manual
       * **tidak** diteruskan ke jadwal pengganti, tetapi tutor **diberi tahu
       * lebih dulu**. Dilarang mengubah angka yang ditagih tanpa pemberitahuan.
       *
       * Konfirmasi ini muncul **hanya bila sesinya memang punya nominal manual**.
       * Alasannya: kalau tidak ada nominal manual, tidak ada yang dilepas —
       * konfirmasi yang selalu muncul untuk hal yang tidak terjadi akan berhenti
       * dibaca, dan itu melemahkan konfirmasi lain di sheet yang sama.
       *
       * Kalimatnya menyebut akibatnya lebih dulu, baru jalan keluarnya, sama
       * seperti cabang lain: yang berubah adalah **jumlah yang ditagih**, dan
       * sesi asal tetap tercatat apa adanya (tidak ada data yang hilang).
       */
      if (!ctx.adaNominalManual) return null;
      return {
        title: "Nominal manual dilepas, lanjut jadwalkan ulang?",
        message: `${ctx.studentName} — nominal manual sesi ini dilepas pada jadwal penggantinya, dan sesi pengganti dihitung dari tarif murid. Sesi asal tetap tercatat dengan nominal manualnya, tetapi yang ditagihkan adalah sesi pengganti.`,
        confirmLabel: "Ya, jadwalkan ulang",
      };
    case "simpan-perubahan": {
      // Tidak ada pergantian murid → tidak ada yang perlu dikonfirmasi (perilaku lama).
      if (!ctx.muridLama || !ctx.muridBaru || !pemilikBerubah(ctx)) return null;
      const sebutanBaru = sebutanMuridBaru(ctx);
      const kebijakan = ctx.kebijakanNominal ?? (ctx.adaNominalManual ? "manual" : "tarif-baru");
      const cakupan = ctx.berseri ? " Seluruh sesi dalam cakupan yang dipilih ikut aturan ini." : "";
      if (ctx.adaNominalManual && kebijakan === "manual") {
        return {
          title: "Ganti murid sesi ini?",
          message: `${sebutanBaru} akan menjadi pemilik sesi ini. Nominal manual sesi ini tidak diubah, dan tagihannya berpindah ke ${ctx.muridBaru}.${cakupan}`,
          confirmLabel: "Ya, ganti murid",
        };
      }
      if (ctx.adaNominalManual) {
        return {
          title: "Ganti murid dan lepas nominal manual?",
          message: `${sebutanBaru} akan menjadi pemilik sesi ini. Nominal manual dilepas dan nominal dihitung ulang memakai tarif ${ctx.muridBaru} — tarif ${ctx.muridLama} tidak lagi dipakai.${cakupan}`,
          confirmLabel: "Ya, pakai tarif baru",
        };
      }
      return {
        title: "Ganti murid sesi ini?",
        message: `${sebutanBaru} akan menjadi pemilik sesi ini. Nominal sesi dihitung ulang memakai tarif ${ctx.muridBaru} — tarif ${ctx.muridLama} tidak lagi dipakai — dan tagihannya berpindah ke ${ctx.muridBaru}.${cakupan}`,
        confirmLabel: "Ya, ganti murid",
      };
    }
    default:
      return null;
  }
}

/** Konteks peringatan pergantian murid di dalam sheet. */
export interface KonteksGantiMurid {
  muridLama: string;
  muridBaru: string;
  /** ID dipakai untuk mendeteksi pergantian ketika nama murid tidak unik. */
  muridLamaId?: string;
  muridBaruId?: string;
  berseri: boolean;
  cakupan: EditMode;
  /** Sesi punya nominal manual positif (lihat `KonteksKonfirmasi`). */
  adaNominalManual: boolean;
  /** Pilihan terlihat tutor; `undefined` mempertahankan perilaku lama. */
  kebijakanNominal?: NominalMovePolicy;
}

/**
 * Peringatan yang tampil **di dalam sheet** begitu kolom "Murid" diubah — lapisan
 * pertama sebelum konfirmasi di `konfirmasiUntuk()`.
 *
 * Sengaja **tanpa angka rupiah**: Beranda dilarang menampilkan uang sama sekali
 * (K3/B1 `ATURAN-AI`), jadi peringatan ini menyebut akibatnya, bukan nominalnya.
 * `null` saat muridnya tidak berubah — peringatan yang selalu tampil akan berhenti
 * dibaca.
 */
export function peringatanGantiMurid({
  muridLama, muridBaru, muridLamaId, muridBaruId, berseri, cakupan,
  adaNominalManual, kebijakanNominal,
}: KonteksGantiMurid): string | null {
  const ctx = { muridLama, muridBaru, muridLamaId, muridBaruId };
  if (!pemilikBerubah(ctx)) return null;
  const sebutanBaru = sebutanMuridBaru(ctx);
  const kebijakan = kebijakanNominal ?? (adaNominalManual ? "manual" : "tarif-baru");
  const akibat = adaNominalManual && kebijakan === "manual"
    ? `Nominal manual sesi ini tidak diubah, dan sesi ini akan ikut tagihan ${muridBaru}.`
    : adaNominalManual
      ? `Nominal manual dilepas; nominal dihitung ulang memakai tarif ${muridBaru}, dan sesi ini akan ikut tagihan ${muridBaru}.`
      : `Nominal sesi ini dihitung ulang memakai tarif ${muridBaru}, dan sesi ini akan ikut tagihan ${muridBaru}.`;
  if (berseri && cakupan !== "this") {
    return `Murid diganti dari ${muridLama} ke ${sebutanBaru} — berlaku juga untuk sesi berikutnya dalam seri ini. ${akibat}`;
  }
  return `Murid diganti dari ${muridLama} ke ${sebutanBaru}. ${akibat}`;
}
