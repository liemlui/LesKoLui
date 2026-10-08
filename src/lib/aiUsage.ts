/**
 * Pembukuan AI — berapa yang sudah dibelanjakan bulan ini, dan apakah batasnya
 * sudah terlampaui.
 *
 * **Kenapa lewat catatan audit dan bukan tabel baru.** `auditLog` sudah mencatat
 * setiap peristiwa penting, sudah tahan gagal (best-effort), dan sudah punya
 * halaman untuk membacanya kembali. Menambah tabel akan menuntut kenaikan versi
 * skema Dexie demi dua kolom opsional — perubahan yang menyentuh data pengguna
 * nyata tanpa manfaat sebanding.
 *
 * **Bulan memakai WIB, bukan UTC.** Panggilan tanggal 1 pukul 06:00 WIB masih
 * tanggal 31 bulan sebelumnya di UTC; kalau pemakaian dihitung UTC, panggilan
 * itu akan dicatat ke bulan yang salah dan pemakaian bulan ini tampak lebih
 * kecil dari kenyataannya.
 */
import { db } from "../db/db";
import type { AuditEntry } from "../db/types";
import { todayWIB } from "./format";

/** Fitur AI yang boleh memanggil, dipakai sebagai label di modal dan di audit. */
export type AiFeature =
  | "Draft catatan"
  | "Poles pesan WA"
  | "Narasi sesi"
  | "Ringkasan laporan"
  | "Rencana bulan depan"
  | "Analisis murid"
  | "Ringkasan keuangan"
  | "Catatan belajar";

export interface PemakaianAiBulan {
  /** Bulan yang dihitung, "YYYY-MM" menurut WIB. */
  bulan: string;
  /** Total biaya tercatat bulan itu, rupiah. */
  terpakaiIdr: number;
  /** Berapa kali AI dipanggil bulan itu. */
  jumlahPanggilan: number;
  /** Batas bulanan bila diisi. `undefined` = tanpa batas (bawaan). */
  batasIdr?: number;
  /** Sisa jatah; `undefined` bila tanpa batas. Tidak pernah negatif. */
  sisaIdr?: number;
  /** true hanya bila batas diisi **dan** sudah terlampaui. */
  terlampaui: boolean;
}

/** Bulan WIB dari sebuah tanggal YYYY-MM-DD atau ISO. */
export function bulanDari(tanggal: string): string {
  return tanggal.slice(0, 7);
}

/** Bulan berjalan menurut WIB. */
export function bulanBerjalan(): string {
  return bulanDari(todayWIB());
}

/** Biaya satu entri audit: pakai biaya nyata bila ada, jika tidak perkiraannya. */
export function biayaEntri(entry: Pick<AuditEntry, "costIdr" | "estimatedIdr">): number {
  return entry.costIdr ?? entry.estimatedIdr ?? 0;
}

/**
 * Hitung pemakaian bulan berjalan dari daftar entri audit.
 *
 * Fungsi murni supaya bisa diuji tanpa basis data; `pemakaianAiBulanIni()`
 * di bawah ini hanya membungkusnya dengan pembacaan db.
 */
export function hitungPemakaian(
  entries: readonly AuditEntry[],
  batasIdr: number | undefined,
  bulan = bulanBerjalan(),
): PemakaianAiBulan {
  const bulanIni = entries.filter((entry) => entry.action === "ai.call" && bulanDari(entry.timestamp) === bulan);
  const terpakaiIdr = bulanIni.reduce((jumlah, entry) => jumlah + biayaEntri(entry), 0);

  // Batas kosong, nol, atau negatif berarti tanpa batas. Keputusan pemilik B4:
  // batas tidak dipasang secara default, dan tanpa batas AI tidak pernah diblokir.
  const adaBatas = typeof batasIdr === "number" && Number.isFinite(batasIdr) && batasIdr > 0;

  return {
    bulan,
    terpakaiIdr,
    jumlahPanggilan: bulanIni.length,
    batasIdr: adaBatas ? batasIdr : undefined,
    sisaIdr: adaBatas ? Math.max(0, batasIdr - terpakaiIdr) : undefined,
    terlampaui: adaBatas ? terpakaiIdr >= batasIdr : false,
  };
}

/** Pemakaian AI bulan berjalan, dibaca dari catatan audit. */
export async function pemakaianAiBulanIni(batasIdr?: number): Promise<PemakaianAiBulan> {
  const bulan = bulanBerjalan();
  const entries = await db.auditLog.where("action").equals("ai.call").toArray();
  return hitungPemakaian(entries, batasIdr, bulan);
}

/** Semua panggilan AI, terbaru dulu — bahan daftar riwayat di Pengaturan. */
export async function riwayatPanggilanAi(limit = 50): Promise<AuditEntry[]> {
  const entries = await db.auditLog.where("action").equals("ai.call").toArray();
  return entries
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

/**
 * Catat satu panggilan AI.
 *
 * Dipanggil **sesudah** panggilan berhasil, bukan sebelum: kalau dicatat lebih
 * dulu, pemakaian akan naik padahal panggilannya gagal dan tutor membayar
 * ketidaktahuan.
 */
export async function catatPanggilanAi(input: {
  fitur: AiFeature;
  biayaIdr: number;
  perkiraanIdr: number;
  keterangan?: string;
}): Promise<void> {
  try {
    await db.auditLog.add({
      id: crypto.randomUUID(),
      action: "ai.call",
      entityType: "ai",
      entityId: input.fitur,
      timestamp: new Date().toISOString(),
      details: input.keterangan ?? input.fitur,
      costIdr: input.biayaIdr,
      aiFeature: input.fitur,
      estimatedIdr: input.perkiraanIdr,
    });
  } catch (e: unknown) {
    // Best-effort, sama seperti `logAudit`: kegagalan mencatat biaya tidak boleh
    // membatalkan hasil AI yang sudah didapat dan sudah dibayar.
    console.warn("pencatatan biaya AI gagal (non-kritis):", e);
  }
}
