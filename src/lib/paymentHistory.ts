/**
 * Pengelompokan riwayat pembayaran per bulan — fungsi murni, tanpa React.
 *
 * Keputusan pemilik 2026-10-07: invoice yang sudah lunas bukan tagihan melainkan
 * **riwayat transaksi**, dan riwayat itu tempatnya di halaman murid, bukan
 * menumpuk di layar Keuangan.
 *
 * **Bulan mana yang jadi kunci pengelompokan.** Bulan **uang masuk** (`paidAt`),
 * bukan bulan anchor invoice (`month`). Kalau tutor membuka mutasi bank dan
 * bertanya "bulan ini uang dari siapa saja", jawabannya harus ada di satu
 * kelompok — dan basis kas di seluruh aplikasi memang memakai `paidAt`
 * (`RingkasanTab`, `paymentRepo.getCashSummary`). Transaksi lunas lama yang
 * tidak punya `paidAt` jatuh ke `month`, jadi tidak ada yang hilang dari daftar.
 */
import type { Payment } from "../db/types";

/** Bulan tempat transaksi ini dihitung: bulan uang masuk, cadangan bulan invoice. */
export function bulanTransaksi(payment: Pick<Payment, "paidAt" | "month">): string {
  return payment.paidAt?.slice(0, 7) ?? payment.month;
}

export interface KelompokPembayaranBulan {
  bulan: string;
  lunas: Payment[];
  totalLunas: number;
  belumLunas: Payment[];
  totalBelumLunas: number;
}

/**
 * Kelompokkan per bulan, terbaru di atas. Di dalam satu bulan, yang lunas
 * diurutkan menurut tanggal bayar terbaru, dan yang belum lunas menurut bulan
 * tagihan terlama — itu yang paling lama menunggu.
 */
export function kelompokkanPerBulan(payments: readonly Payment[]): KelompokPembayaranBulan[] {
  const peta = new Map<string, KelompokPembayaranBulan>();

  for (const payment of payments) {
    const bulan = bulanTransaksi(payment);
    let kelompok = peta.get(bulan);
    if (!kelompok) {
      kelompok = { bulan, lunas: [], totalLunas: 0, belumLunas: [], totalBelumLunas: 0 };
      peta.set(bulan, kelompok);
    }
    if (payment.status === "PAID") {
      kelompok.lunas.push(payment);
      kelompok.totalLunas += payment.totalCost;
    } else {
      kelompok.belumLunas.push(payment);
      kelompok.totalBelumLunas += payment.totalCost;
    }
  }

  return Array.from(peta.values())
    .map((kelompok) => ({
      ...kelompok,
      lunas: [...kelompok.lunas].sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? "")),
      belumLunas: [...kelompok.belumLunas].sort((a, b) => a.month.localeCompare(b.month)),
    }))
    .sort((a, b) => b.bulan.localeCompare(a.bulan));
}

/** Total uang yang benar-benar masuk dan total yang masih menunggu. */
export function totalPembayaran(payments: readonly Payment[]): {
  lunas: number;
  belumLunas: number;
  jumlahBelumLunas: number;
} {
  let lunas = 0;
  let belumLunas = 0;
  let jumlahBelumLunas = 0;
  for (const payment of payments) {
    if (payment.status === "PAID") lunas += payment.totalCost;
    else {
      belumLunas += payment.totalCost;
      jumlahBelumLunas += 1;
    }
  }
  return { lunas, belumLunas, jumlahBelumLunas };
}
