/**
 * BarisTagihan — satu model untuk lima mekanisme tagih.
 *
 * Enam UI berbeda (antrean laporan final, antrean paket per pertemuan, daftar
 * invoice terbit, tagihan manual, rekap tahunan, papan pipeline) selama ini
 * masing-masing menyusun daftarnya sendiri, sehingga satu tagihan bisa tampil
 * dengan dua cakupan yang berbeda. Berkas ini menyatukannya menjadi SATU daftar
 * baris yang bisa dipakai blok "Perlu ditagih" tanpa logika di komponen.
 *
 * Fungsi murni. Tanpa Dexie, tanpa React, tanpa `new Date()`. Tanggal acuan
 * diambil dari `todayWIB()` supaya batas hari mengikuti zona waktu tutor.
 */
import type { Payment, Session, Student } from "../db/types";
import { reportStatus } from "../db/types";
import type { SessionCountBillingProgress } from "../db/repos/paymentRepo";
import { monthLabel, todayWIB } from "./format";
import { invoiceDueAt } from "./finance";

/** Asal-usul baris — inilah yang menyatukan lima mekanisme tagih. */
export type BarisTagihanAsal =
  | "laporan"   // MonthlyReport final siap ditagih → mekanisme "laporan perkembangan"/bulanan
  | "paket"     // SessionCountBillingProgress       → mekanisme "per pertemuan"
  | "terbit"    // Payment sudah terbit & belum lunas
  | "manual";   // Payment yang dibuat tutor sendiri

/** Keadaan baris, dari sudut pandang tutor (bukan status DB mentah). */
export type BarisTagihanKeadaan =
  | "siap-ditagih"  // belum ada invoice, boleh diterbitkan sekarang
  | "terkirim"      // invoice terbit, belum jatuh tempo
  | "lewat"         // invoice terbit, sudah lewat dueAt
  | "lunas";

/**
 * Jenis pekerjaan yang diminta baris ini. Dipakai layar Uang untuk memisahkan
 * "yang butuh tindakan" dari "yang sudah selesai" — keputusan pemilik 2026-10-07:
 * **invoice yang sudah lunas bukan tagihan**, melainkan riwayat transaksi, jadi
 * ia tidak boleh dihitung sebagai pekerjaan yang menunggu.
 */
export type BarisTagihanTindakan =
  | "terbitkan"   // laporan final / paket siap → buat invoice-nya
  | "finalkan"    // laporan masih draf → sahkan dulu sebelum bisa ditagih
  | "tagih"       // invoice sudah terbit, uangnya belum masuk
  | "riwayat";    // sudah lunas → bukan pekerjaan, hanya catatan

export type BarisTagihanAksi =
  | "terbitkan"
  | "kirim-wa"
  | "tandai-lunas"
  | "ubah-jumlah"
  | "batalkan"
  | "rincian";

export interface BarisTagihan {
  /** Kunci unik untuk React; stabil antar render. */
  key: string;
  studentId: string;
  studentName: string;
  /** Rupiah — DIHITUNG ATURAN, bukan AI. */
  amount: number;
  asal: BarisTagihanAsal;
  keadaan: BarisTagihanKeadaan;
  /** Pekerjaan yang diminta baris ini. `riwayat` = sudah selesai, bukan tagihan. */
  tindakan: BarisTagihanTindakan;
  /** Label manusia untuk mekanisme, mis. "Laporan Agustus 2026" / "Paket 8 · siklus 3 Agu 2026". */
  mode: string;
  /** Rentang yang dicakup, mis. "1–31 Agustus 2026". */
  cakupan: string;
  /** Umur tagihan dalam hari setelah jatuh tempo. Diisi hanya untuk keadaan "lewat". */
  umurHari?: number;
  dueAt?: string;
  /** Sumber yang bisa diklik: id Payment / MonthlyReport / murid. */
  refs: { paymentId?: string; reportId?: string; sessionIds?: string[] };
  /** Aksi yang tersedia untuk baris ini — dipakai UI langsung, tanpa logika di komponen. */
  aksi: BarisTagihanAksi[];
}

/**
 * Hasil `listAllReports()` yang sudah cukup untuk membangun baris. Sengaja
 * dilonggarkan (bukan `MonthlyReport` penuh) supaya data dari laporan ringkas
 * dan dari tes bisa memakai bentuk yang sama.
 */
export interface FinanceRowReport {
  id: string;
  studentId: string;
  month: string;
  totalCost: number;
  status?: "draft" | "confirmed";
  billingMode?: "monthly" | "session_count" | "manual" | "range";
  periodStart?: string;
  periodEnd?: string;
  pdfGeneratedAt?: string;
}

export interface BuildTagihanRowsInput {
  payments: readonly Payment[];
  students: readonly Student[];
  reports: readonly FinanceRowReport[];
  packages: readonly SessionCountBillingProgress[];
  /** Tanggal acuan YYYY-MM-DD. Kosong = `todayWIB()`. Dipakai tes & pratinjau. */
  hariIni?: string;
}

const AKSI_SIAP_DITAGIH: BarisTagihanAksi[] = ["terbitkan", "rincian"];
const AKSI_LAPORAN: BarisTagihanAksi[] = ["terbitkan", "kirim-wa", "rincian"];
const AKSI_TERBIT: BarisTagihanAksi[] = ["kirim-wa", "tandai-lunas", "ubah-jumlah", "batalkan", "rincian"];
const AKSI_LUNAS: BarisTagihanAksi[] = ["rincian"];

/**
 * Urutan prioritas blok. Angka makin kecil makin mendesak; dipakai sebagai
 * satu-satunya sumber urutan supaya chip tahap dan daftar tidak pernah beda.
 */
export const URUTAN_KEADAAN: Record<BarisTagihanKeadaan, number> = {
  lewat: 0,
  "siap-ditagih": 1,
  terkirim: 2,
  lunas: 3,
};

/** Jumlah hari kalender dari `dari` ke `sampai` (YYYY-MM-DD). Boleh negatif. */
function selisihHari(dari: string, sampai: string): number {
  const awal = Date.parse(`${dari}T00:00:00.000Z`);
  const akhir = Date.parse(`${sampai}T00:00:00.000Z`);
  if (Number.isNaN(awal) || Number.isNaN(akhir)) return 0;
  return Math.round((akhir - awal) / 86400000);
}

/** Tanggal sesi paling awal dari sekumpulan sesi (YYYY-MM-DD), bila ada. */
function tanggalTerawal(sessions: readonly Session[]): string | undefined {
  let terawal: string | undefined;
  for (const session of sessions) {
    const tanggal = session.date?.slice(0, 10);
    if (!tanggal) continue;
    if (!terawal || tanggal < terawal) terawal = tanggal;
  }
  return terawal;
}

/** Label manusia untuk rentang periode laporan/tagihan. */
function labelCakupan(awal?: string, akhir?: string, month?: string): string {
  if (awal && akhir) {
    if (awal.slice(0, 7) === akhir.slice(0, 7)) return monthLabel(awal.slice(0, 7));
    return `${awal} – ${akhir}`;
  }
  if (month) return monthLabel(month);
  return "Periode tidak tercatat";
}

/** "3 Agustus 2026" dari YYYY-MM-DD, untuk label siklus paket. */
function labelTanggalSingkat(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const bulan = new Date(y, m - 1, d).toLocaleDateString("id-ID", { month: "long" });
  return `${d} ${bulan} ${y}`;
}

function namaMurid(studentsById: ReadonlyMap<string, Student>, studentId: string): string {
  // Murid nonaktif tetap muncul dengan namanya: tagihan lama harus tetap
  // menyebut nama historisnya, bukan "(dihapus)".
  return studentsById.get(studentId)?.name ?? "(dihapus)";
}

/**
 * Susun seluruh baris tagihan dari data yang sudah dimuat layar.
 *
 * `mode` adalah pengganti lima UI mekanisme tagih: mekanisme hidup sebagai teks,
 * bukan sebagai cabang tampilan. Laporan final untuk murid yang sama tidak
 * dibuat dua kali — `invoiceReportIds` menyaringnya, persis seperti
 * `Payments.tsx` versi tab lama.
 */
export function buildTagihanRows({
  payments,
  students,
  reports,
  packages,
  hariIni = todayWIB(),
}: BuildTagihanRowsInput): BarisTagihan[] {
  const studentsById = new Map(students.map((student) => [student.id, student] as const));
  const rows: BarisTagihan[] = [];

  // ── 1. Payment yang sudah terbit (mekanisme "terbit" & "manual") ──
  for (const payment of payments) {
    const dueAt = invoiceDueAt(payment);
    const nama = namaMurid(studentsById, payment.studentId);
    const waktuTerbit = payment.createdAt
      ?? payment.periodEnd
      ?? `${payment.month}-01`;
    // Invoice lama yang belum jatuh tempo: ditagih pada waktu terbitnya, bukan
    // pada akhir bulan anchor (yang bisa membuat umur tampak negatif).
    const jatuhTempoEfektif = dueAt ?? waktuTerbit.slice(0, 10);
    const selisih = selisihHari(jatuhTempoEfektif, hariIni);
    const lewat = selisih > 0;

    let keadaan: BarisTagihanKeadaan;
    if (payment.status === "PAID") keadaan = "lunas";
    else if (lewat) keadaan = "lewat";
    else keadaan = "terkirim";

    rows.push({
      key: `payment:${payment.id}`,
      studentId: payment.studentId,
      studentName: nama,
      amount: payment.totalCost,
      asal: payment.source === "manual" ? "manual" : "terbit",
      keadaan,
      tindakan: keadaan === "lunas" ? "riwayat" : "tagih",
      mode: payment.source === "manual" ? "Tagihan manual" : "Tagihan terbit",
      cakupan: labelCakupan(payment.periodStart, payment.periodEnd, payment.month),
      umurHari: keadaan === "lewat" ? selisih : undefined,
      dueAt,
      refs: { paymentId: payment.id, reportId: payment.reportId },
      aksi: keadaan === "lunas" ? [...AKSI_LUNAS] : [...AKSI_TERBIT],
    });
  }

  // ── 2. Laporan yang belum bisa ditagih ──
  // 2a. Sudah final tetapi belum punya invoice → siap diterbitkan.
  // 2b. Masih draf → pekerjaan tersendiri: disahkan dulu, baru bisa ditagih.
  //     Keputusan pemilik 2026-10-07 memasukkan "sudah terbit tapi laporannya
  //     belum" sebagai pekerjaan yang harus terlihat di layar Uang, bukan
  //     tersembunyi di sub-layar.
  const invoiceReportIds = new Set(
    payments.flatMap((payment) => (payment.reportId ? [payment.reportId] : [])),
  );
  for (const report of reports) {
    if (report.totalCost <= 0) continue;
    if (report.billingMode === "session_count") continue;
    if (invoiceReportIds.has(report.id)) continue;

    const final = reportStatus(report) === "confirmed";
    rows.push({
      key: `report:${report.id}`,
      studentId: report.studentId,
      studentName: namaMurid(studentsById, report.studentId),
      amount: report.totalCost,
      asal: "laporan",
      // Draf belum boleh diterbitkan, tetapi ia tetap "menunggu tindakan" dan
      // bukan "terkirim" — status terkirim hanya untuk invoice yang benar ada.
      keadaan: final ? "siap-ditagih" : "terkirim",
      tindakan: final ? "terbitkan" : "finalkan",
      mode: final ? `Laporan ${monthLabel(report.month)}` : `Draf laporan ${monthLabel(report.month)}`,
      cakupan: labelCakupan(report.periodStart, report.periodEnd, report.month),
      refs: { reportId: report.id },
      aksi: final ? [...AKSI_LAPORAN] : ["rincian"],
    });
  }

  // ── 3. Antrean paket per pertemuan (mekanisme "paket") ──
  for (const paket of packages) {
    const siap = paket.readyBatchCount > 0
      || Boolean(
        paket.pendingBillingPolicy
        && paket.unbilledCount > 0
        && paket.unbilledCount < paket.targetCount,
      );
    if (!siap) continue;

    const tanggalBatch = tanggalTerawal(paket.nextBatchSessions);
    const jumlahBatch = paket.nextBatchSessions.length;
    rows.push({
      key: `package:${paket.studentId}`,
      studentId: paket.studentId,
      studentName: paket.studentName,
      amount: paket.nextBatchTotal,
      asal: "paket",
      keadaan: "siap-ditagih",
      tindakan: "terbitkan",
      mode: `Paket ${paket.targetCount} pertemuan`,
      cakupan: tanggalBatch
        ? `Siklus mulai ${labelTanggalSingkat(tanggalBatch)}`
        : jumlahBatch > 0
          ? `${jumlahBatch} sesi terkumpul`
          : `${paket.unbilledCount} dari ${paket.targetCount} sesi terkumpul`,
      refs: { sessionIds: paket.nextBatchSessions.map((session) => session.id) },
      aksi: [...AKSI_SIAP_DITAGIH],
    });
  }

  return sortTagihanRows(rows);
}

/**
 * Urutkan: paling mendesak dulu. Aturan tetap, bukan selera AI.
 *
 * 1. `lewat` menurun berdasarkan `umurHari` (paling lama menunggak di atas)
 * 2. `siap-ditagih` (nominal terbesar lebih dulu — itu yang paling menahan kas)
 * 3. `terkirim` menaik berdasarkan `dueAt` (yang paling dekat jatuh tempo dulu)
 * 4. `lunas` selalu di bawah
 *
 * Draf laporan berkeadaan `terkirim` tidak punya `dueAt`, jadi ia jatuh di ujung
 * kelompok itu. Sengaja dibiarkan: yang paling mendesak pada kelompok `terkirim`
 * adalah invoice yang hampir jatuh tempo, bukan draf yang tidak punya tenggat.
 */
export function sortTagihanRows(rows: readonly BarisTagihan[]): BarisTagihan[] {
  return [...rows].sort((a, b) => {
    const urutan = URUTAN_KEADAAN[a.keadaan] - URUTAN_KEADAAN[b.keadaan];
    if (urutan !== 0) return urutan;

    if (a.keadaan === "lewat") {
      const umur = (b.umurHari ?? 0) - (a.umurHari ?? 0);
      if (umur !== 0) return umur;
    }
    if (a.keadaan === "siap-ditagih") {
      const nominal = b.amount - a.amount;
      if (nominal !== 0) return nominal;
    }
    if (a.keadaan === "terkirim") {
      // Draf laporan (tanpa dueAt) selalu setelah invoice yang benar-benar terbit.
      if (a.tindakan !== b.tindakan) return a.tindakan === "finalkan" ? 1 : -1;
      const tempo = (a.dueAt ?? "").localeCompare(b.dueAt ?? "");
      if (tempo !== 0) return tempo;
    }
    return a.studentName.localeCompare(b.studentName) || a.key.localeCompare(b.key);
  });
}

/**
 * Baris yang masih menunggu pekerjaan — bahan blok "Perlu ditagih".
 *
 * **Invoice yang sudah lunas TIDAK termasuk.** Keputusan pemilik 2026-10-07:
 * yang sudah dibayar bukan tagihan melainkan riwayat transaksi, jadi ia tidak
 * boleh ikut dihitung sebagai pekerjaan yang menunggu.
 */
export function barisMenungguTindakan(rows: readonly BarisTagihan[]): BarisTagihan[] {
  return rows.filter((row) => row.tindakan !== "riwayat");
}

/** Riwayat transaksi: baris yang sudah selesai dibayar. Bukan tagihan. */
export function barisRiwayat(rows: readonly BarisTagihan[]): BarisTagihan[] {
  return rows.filter((row) => row.tindakan === "riwayat");
}

/**
 * Berapa baris yang benar-benar menunggu DITERBITKAN. Ini hitungan yang sama
 * dengan badge pemilih tagihan versi tab lama (`readyReportInvoiceCount` +
 * antrean paket siap), sehingga angka di layar Uang tidak berubah.
 *
 * Draf laporan tidak ikut: pekerjaannya "sahkan", bukan "terbitkan". Perhatikan
 * bahwa sebelum 2026-10-07 draf tidak pernah muncul sebagai baris sama sekali,
 * jadi angka ini tetap sama dengan versi lama walau ada jenis baris baru.
 */
export function hitungBarisButuhAksi(rows: readonly BarisTagihan[]): number {
  return rows.filter((row) => row.tindakan === "terbitkan").length;
}

/**
 * Ringkasan blok "Perlu ditindaklanjuti": berapa banyak pekerjaan per jenis.
 * Dipakai layar Uang supaya kalimatnya menyebut jenis pekerjaan yang nyata
 * ("2 laporan perlu disahkan"), bukan sekadar "N tagihan menunggu".
 */
export function ringkasTindakan(rows: readonly BarisTagihan[]): {
  terbitkan: number;
  finalkan: number;
  tagih: number;
  total: number;
} {
  const menunggu = barisMenungguTindakan(rows);
  const hitung = (jenis: BarisTagihanTindakan) => menunggu.filter((row) => row.tindakan === jenis).length;
  return {
    terbitkan: hitung("terbitkan"),
    finalkan: hitung("finalkan"),
    tagih: hitung("tagih"),
    total: menunggu.length,
  };
}
