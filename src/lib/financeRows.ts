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
import { formatRupiah, monthLabel, todayWIB } from "./format";
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
      mode: payment.source === "manual" ? "Tagihan manual" : "Tagihan terbit",
      cakupan: labelCakupan(payment.periodStart, payment.periodEnd, payment.month),
      umurHari: keadaan === "lewat" ? selisih : undefined,
      dueAt,
      refs: { paymentId: payment.id, reportId: payment.reportId },
      aksi: keadaan === "lunas" ? [...AKSI_LUNAS] : [...AKSI_TERBIT],
    });
  }

  // ── 2. Laporan final yang belum punya invoice (mekanisme "laporan") ──
  const invoiceReportIds = new Set(
    payments.flatMap((payment) => (payment.reportId ? [payment.reportId] : [])),
  );
  for (const report of reports) {
    if (reportStatus(report) !== "confirmed") continue;
    if (report.totalCost <= 0) continue;
    if (report.billingMode === "session_count") continue;
    if (invoiceReportIds.has(report.id)) continue;

    rows.push({
      key: `report:${report.id}`,
      studentId: report.studentId,
      studentName: namaMurid(studentsById, report.studentId),
      amount: report.totalCost,
      asal: "laporan",
      keadaan: "siap-ditagih",
      mode: `Laporan ${monthLabel(report.month)}`,
      cakupan: labelCakupan(report.periodStart, report.periodEnd, report.month),
      refs: { reportId: report.id },
      aksi: [...AKSI_LAPORAN],
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
      const tempo = (a.dueAt ?? "").localeCompare(b.dueAt ?? "");
      if (tempo !== 0) return tempo;
    }
    return a.studentName.localeCompare(b.studentName) || a.key.localeCompare(b.key);
  });
}

/** Baris yang belum lunas — bahan blok "Perlu ditagih". */
export function barisBelumLunas(rows: readonly BarisTagihan[]): BarisTagihan[] {
  return rows.filter((row) => row.keadaan !== "lunas");
}

/** Ringkas nominal beberapa baris untuk satu kalimat ("Rp 1,4 jt"). */
export function ringkasNominal(total: number): string {
  return formatRupiah(total);
}

/**
 * Berapa baris yang benar-benar menunggu DITERBITKAN. Ini hitungan yang sama
 * dengan badge pemilih tagihan versi tab lama (`readyReportInvoiceCount` +
 * antrean paket siap), sehingga angka di layar Uang tidak berubah.
 *
 * Tagihan yang sudah terbit — termasuk yang lewat jatuh tempo — sengaja tidak
 * ikut: baris itu sudah ada di daftar dan aksinya "tagih", bukan "terbitkan".
 */
export function hitungBarisButuhAksi(rows: readonly BarisTagihan[]): number {
  return rows.filter((row) => row.keadaan === "siap-ditagih").length;
}
