/**
 * Ringkasan keuangan lokal — padanan tanpa-AI untuk blok "Ringkasan AI".
 *
 * Blok 1 layar Uang boleh menampilkan hasil AI, tetapi aplikasi ini harus utuh
 * tanpa API key. Karena itu seluruh angka dan kalimat di berkas ini dihitung
 * ATURAN, bukan AI; AI hanya boleh memoles kalimatnya. Tidak ada impor Dexie,
 * tidak ada jaringan, tidak ada `new Date()` — bulan acuan datang dari pemanggil.
 */
import type { BarisTagihan } from "./financeRows";
import type { MonthCashSummary } from "../db/repos/paymentRepo";
import { formatRupiah, monthLabel } from "./format";

/** Ambang piutang yang disebut "lewat" pada sorotan. Diekspor agar UI menyebut angka yang sama. */
export const AMBANG_PIUTANG_LEWAT_HARI = 60;
/** Ambang kenaikan pengeluaran yang layak diperhatikan (30% di atas rata-rata 3 bulan). */
export const AMBANG_KENAIKAN_PENGELUARAN = 0.3;

export type SorotanKode =
  | "piutang-lewat-60"
  | "siap-ditagih"
  | "laporan-belum-dibagikan"
  | "pengeluaran-naik";

export interface Sorotan {
  kode: SorotanKode;
  teks: string;
  jumlah?: number;
}

export interface FinanceOverview {
  month: string;                 // "2026-09"
  /** Uang benar-benar masuk (basis kas, `realisasi`). */
  masuk: number;
  /** Pengeluaran bulan itu. */
  keluar: number;
  /** `masuk - keluar` — sisa kas, BUKAN laba akrual. Lihat catatan di bawah. */
  sisa: number;
  /** Pendapatan diakui (akrual) — basis `pendapatan`, bukan kas. */
  potensi: number;
  /** Laba akrual dari `getCashSummary()` (`pendapatan - pengeluaran`), dipertahankan apa adanya. */
  laba: number;
  /** Seluruh tagihan belum lunas, lintas bulan. */
  piutang: number;
  /** Piutang yang sudah lewat `AMBANG_PIUTANG_LEWAT_HARI` hari. */
  piutangLewat60: number;
  /** Jumlah baris yang masih menunggu diterbitkan. */
  jumlahBelumDitagih: number;
  /** Laporan sudah final tetapi belum pernah dibuatkan PDF-nya. */
  laporanBelumDibagikan: number;
  /** Kalimat siap-tampil dari ATURAN — bukan AI. AI hanya boleh memoles. */
  ringkasLokal: string;
  /** Hal-hal yang layak diperhatikan; dipakai blok "diperhatikan" & jadi bahan prompt AI. */
  sorotan: Sorotan[];
}

export interface FinanceOverviewReport {
  id: string;
  studentId: string;
  status?: string;
  pdfGeneratedAt?: string;
}

export interface BuildFinanceOverviewInput {
  month: string;
  rows: readonly BarisTagihan[];
  /** Hasil `getCashSummary()` — bulan terpilih plus bulan-bulan pembanding. */
  cash: readonly MonthCashSummary[];
  reports: readonly FinanceOverviewReport[];
}

/** Ringkas rupiah untuk kalimat: "Rp 7,2 jt", "Rp 850 rb", "Rp 12,4 M". */
export function rupiahRingkas(nominal: number): string {
  const nilai = Math.abs(nominal);
  const tanda = nominal < 0 ? "-" : "";
  if (nilai >= 1_000_000_000) return `${tanda}Rp ${(nilai / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (nilai >= 1_000_000) return `${tanda}Rp ${(nilai / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  if (nilai >= 1_000) return `${tanda}Rp ${Math.round(nilai / 1_000)} rb`;
  return formatRupiah(nominal);
}

function ringkasDaftar(kalimat: string[]): string {
  return kalimat.map((teks) => (/[.!?]$/.test(teks) ? teks : `${teks}.`)).join(" ");
}

/**
 * Susun ringkasan bulan terpilih.
 *
 * Dua basis angka sengaja dibedakan dan tidak boleh dicampur:
 * - `masuk`/`keluar`/`sisa` → basis KAS (uang benar-benar berpindah).
 * - `potensi`/`laba`         → basis AKRUAL (pendapatan diakui saat les terjadi).
 * Piutang adalah jembatan antara keduanya, jadi selisihnya tidak pernah "salah".
 */
export function buildFinanceOverview({
  month,
  rows,
  cash,
  reports,
}: BuildFinanceOverviewInput): FinanceOverview {
  const bulanIni = cash.find((row) => row.month === month);
  const masuk = bulanIni?.realisasi ?? 0;
  const keluar = bulanIni?.pengeluaran ?? 0;
  const sisa = masuk - keluar;
  const potensi = bulanIni?.pendapatan ?? 0;
  const laba = bulanIni?.laba ?? 0;

  const terbuka = rows.filter((row) => row.keadaan !== "lunas");
  const piutang = terbuka.reduce((sum, row) => sum + row.amount, 0);
  const lewat = terbuka.filter((row) => row.keadaan === "lewat");
  const piutangLewat60 = lewat
    .filter((row) => (row.umurHari ?? 0) > AMBANG_PIUTANG_LEWAT_HARI)
    .reduce((sum, row) => sum + row.amount, 0);

  const siapDitagih = rows.filter((row) => row.keadaan === "siap-ditagih");
  const jumlahBelumDitagih = siapDitagih.length;
  const laporanBelumDibagikan = reports.filter(
    (report) => report.status === "confirmed" && !report.pdfGeneratedAt,
  ).length;

  // ── Sorotan ──
  const sorotan: Sorotan[] = [];

  if (piutangLewat60 > 0) {
    const tertua = Math.max(...lewat.map((row) => row.umurHari ?? 0));
    sorotan.push({
      kode: "piutang-lewat-60",
      teks: `${formatRupiah(piutangLewat60)} piutang sudah lewat ${AMBANG_PIUTANG_LEWAT_HARI} hari`,
      jumlah: Math.round(piutangLewat60),
    });
    if (tertua > AMBANG_PIUTANG_LEWAT_HARI) {
      sorotan.push({
        kode: "piutang-lewat-60",
        teks: `Tagihan tertua menunggak ${tertua} hari`,
        jumlah: tertua,
      });
    }
  }

  if (jumlahBelumDitagih > 0) {
    const nominalSiap = siapDitagih.reduce((sum, row) => sum + row.amount, 0);
    sorotan.push({
      kode: "siap-ditagih",
      teks: jumlahBelumDitagih === 1
        ? `1 tagihan ${formatRupiah(nominalSiap)} siap diterbitkan`
        : `${jumlahBelumDitagih} tagihan ${formatRupiah(nominalSiap)} siap diterbitkan`,
      jumlah: jumlahBelumDitagih,
    });
  }

  if (laporanBelumDibagikan > 0) {
    sorotan.push({
      kode: "laporan-belum-dibagikan",
      teks: laporanBelumDibagikan === 1
        ? "1 laporan final belum dibagikan ke orang tua"
        : `${laporanBelumDibagikan} laporan final belum dibagikan ke orang tua`,
      jumlah: laporanBelumDibagikan,
    });
  }

  // Pengeluaran naik >30% di atas rata-rata tiga bulan sebelumnya. Bulan-bulan
  // pembanding diambil dari `cash` apa adanya (pemanggil yang menyiapkannya),
  // supaya berkas ini tetap murni dan bisa dites tanpa jam sistem.
  const pembanding = cash
    .filter((row) => row.month < month)
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 3)
    .map((row) => row.pengeluaran);
  if (pembanding.length > 0) {
    const rataRata = pembanding.reduce((sum, nilai) => sum + nilai, 0) / pembanding.length;
    if (rataRata > 0 && keluar > rataRata * (1 + AMBANG_KENAIKAN_PENGELUARAN)) {
      const persen = Math.round(((keluar - rataRata) / rataRata) * 100);
      sorotan.push({
        kode: "pengeluaran-naik",
        teks: `Pengeluaran naik ${persen}% dari rata-rata ${pembanding.length} bulan sebelumnya`,
        jumlah: Math.round(keluar),
      });
    }
  }

  // ── Kalimat lokal ──
  const kalimat: string[] = [`${rupiahRingkas(masuk)} uang masuk bulan ini`];
  const nominalSiapDitagih = siapDitagih.reduce((sum, row) => sum + row.amount, 0);

  if (lewat.length > 0) {
    kalimat.push(
      `${lewat.length} tagihan ${rupiahRingkas(lewat.reduce((sum, row) => sum + row.amount, 0))} lewat jatuh tempo`,
    );
  }
  if (jumlahBelumDitagih > 0) {
    kalimat.push(`${jumlahBelumDitagih} tagihan ${rupiahRingkas(nominalSiapDitagih)} siap diterbitkan`);
  }
  kalimat.push(`Pengeluaran ${rupiahRingkas(keluar)}`);
  kalimat.push(`Sisa kas ${rupiahRingkas(sisa)}`);

  const ringkasLokal = lewat.length === 0 && jumlahBelumDitagih === 0
    ? ringkasDaftar([
      `${rupiahRingkas(masuk)} uang masuk bulan ini`,
      `Pengeluaran ${rupiahRingkas(keluar)}`,
      `Sisa kas ${rupiahRingkas(sisa)}`,
      `Tidak ada tagihan yang menunggu di ${monthLabel(month)}`,
    ])
    : ringkasDaftar(kalimat);

  return {
    month,
    masuk,
    keluar,
    sisa,
    potensi,
    laba,
    piutang,
    piutangLewat60,
    jumlahBelumDitagih,
    laporanBelumDibagikan,
    ringkasLokal,
    sorotan,
  };
}
