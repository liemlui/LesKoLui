/**
 * Presentasi Riwayat Aktivitas (audit trail) di layar Pengaturan.
 *
 * Dipisah dari komponennya supaya urutan pengelompokan hari dan label aksi bisa
 * dites tanpa DOM — repo ini tidak memasang jsdom, jadi apa pun yang mau dijaga
 * harus berbentuk fungsi murni.
 *
 * Dua hal yang mudah salah dan dijaga di sini:
 * 1. **Kunci hari memakai tanggal LOKAL, bukan UTC.** `new Date(iso).toISOString()`
 *    menggeser aktivitas pukul 06.00 WIB ke hari sebelumnya, sehingga entri
 *    "Hari ini" bisa muncul di bawah kepala "Kemarin".
 * 2. **Grup harus bersambung.** Daftar audit datang terurut menurun; satu entri
 *    dengan tanggal lebih tua yang menyelip di antara dua entri hari yang sama
 *    harus tetap memecah grup, bukan digabung ke grup sebelumnya.
 */

import type { AuditAction } from "../db/types";

/** Kunci tanggal lokal "YYYY-MM-DD", bukan UTC. */
export function auditDayKey(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Header grup: "Hari ini"/"Kemarin" lalu tanggal absolut agar konsisten. */
export function auditDayLabel(ts: string, now: Date = new Date()): string {
  const d = new Date(ts);
  if (d.toDateString() === now.toDateString()) return "Hari ini";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Kemarin";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/** Label manusia untuk setiap jenis aksi audit (L-1). */
export const AUDIT_LABEL: Record<AuditAction, string> = {
  "session.delete": "Hapus sesi",
  "session.cancel": "Batalkan sesi",
  "session.no_show": "Tandai tidak hadir",
  "session.reschedule": "Jadwalkan ulang sesi",
  "session.reprice": "Ubah tarif sesi lama (retroaktif)",
  "report.unlock": "Buka kunci laporan final",
  "student.delete": "Hapus murid",
  "payment.paid": "Tagihan ditandai lunas",
  "payment.unpaid": "Batal lunas",
  "payment.amount": "Ubah nominal tagihan",
  "payment.due": "Ubah jatuh tempo tagihan",
  "payment.cancel": "Batalkan tagihan",
  "payment.restore": "Pulihkan tagihan yang dibatalkan",
  "payment.discard": "Hapus salinan pemulihan tagihan",
  "expense.create": "Catat pengeluaran",
  "expense.update": "Ubah pengeluaran",
  "expense.delete": "Hapus pengeluaran",
  "month.close": "Tutup bulan",
  "data.reset": "Reset semua data",
  "data.restore": "Restore data",
  "photos.prune": "Hapus foto lama",
  "photos.shrink": "Perkecil foto lama",
  "ai.call": "Panggilan AI berbiaya",
};

/** Baris minimal yang dibutuhkan pengelompokan; `AuditLog` penuh memenuhinya. */
export interface AuditEntryLike {
  id: string | number;
  action: AuditAction;
  timestamp: string;
}

export interface AuditDayGroup<T extends AuditEntryLike> {
  key: string;
  label: string;
  items: T[];
}

/**
 * Kelompokkan catatan audit per hari, mempertahankan urutan masuknya.
 *
 * Grup hanya digabung bila entri terakhir **berada di hari yang sama**; entri tua
 * yang muncul kembali setelah hari yang lebih baru membuka grup baru (V-14).
 */
export function groupAuditByDay<T extends AuditEntryLike>(
  entries: readonly T[],
  now: Date = new Date(),
): AuditDayGroup<T>[] {
  const groups: AuditDayGroup<T>[] = [];
  for (const e of entries) {
    const key = auditDayKey(e.timestamp);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(e);
    else groups.push({ key, label: auditDayLabel(e.timestamp, now), items: [e] });
  }
  return groups;
}

/** Jam lokal "HH.MM" untuk kolom kanan daftar aktivitas. */
export function auditTimeLabel(ts: string): string {
  return new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Nama aksi untuk ditampilkan. Aksi baru yang belum punya label diteruskan apa
 * adanya supaya catatan lama tidak pernah hilang dari layar hanya karena
 * terjemahannya belum ditambahkan.
 */
export function auditActionLabel(action: AuditAction): string {
  return AUDIT_LABEL[action] ?? action;
}

/**
 * Rincian satu entri audit yang hanya dimiliki panggilan AI (G3-04).
 *
 * Syarat selesai tugas itu berbunyi "riwayat panggilan AI menampilkan **waktu,
 * fitur, dan biaya**". Waktunya sudah ditampilkan setiap baris (`auditTimeLabel`);
 * yang belum ada adalah fitur dan biayanya — padahal keduanya sudah tersimpan di
 * entri `ai.call` (`aiFeature`, `costIdr`) sejak G3-04 dan **tidak dibaca satu
 * layar pun**. Fungsi ini yang membacanya.
 *
 * Sengaja mengembalikan `null` untuk entri yang bukan panggilan AI: biaya hanya
 * bermakna untuk `ai.call`, dan menampilkan biaya di baris lain akan
 * menyesatkan. Biaya yang tidak tercatat (entri lama sebelum kolomnya ada)
 * disebutkan apa adanya sebagai "biaya tidak tercatat", bukan dikira-kira.
 */
export function auditAiDetail(entry: {
  action: AuditAction;
  aiFeature?: string;
  costIdr?: number;
  estimatedIdr?: number;
}): string | null {
  if (entry.action !== "ai.call") return null;

  const bagian: string[] = [];
  if (entry.aiFeature?.trim()) bagian.push(entry.aiFeature.trim());
  bagian.push(
    typeof entry.costIdr === "number"
      ? `±Rp ${Math.max(1, Math.ceil(entry.costIdr)).toLocaleString("id-ID")}`
      : "biaya tidak tercatat",
  );
  // Selisih perkiraan vs hasil hanya ditampilkan bila memang berbeda — angka yang
  // sama dua kali di satu baris hanya menambah kebisingan.
  if (
    typeof entry.estimatedIdr === "number" &&
    typeof entry.costIdr === "number" &&
    Math.abs(entry.estimatedIdr - entry.costIdr) >= 1
  ) {
    bagian.push(`perkiraan ±Rp ${Math.max(1, Math.ceil(entry.estimatedIdr)).toLocaleString("id-ID")}`);
  }
  return bagian.join(" · ");
}
