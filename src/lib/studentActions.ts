// ── Perlu Tindakan: apa yang menunggu tutor untuk satu murid ────────────────
//
// Butir 2 G3-06: "kartu Perlu Tindakan di paling atas tab Ringkas, memuat jadwal
// berikutnya, pekerjaan rumah terakhir yang perlu perhatian, tagihan belum lunas,
// dan tindak lanjut."
//
// Modul ini murni (tanpa impor Dexie, tanpa efek samping) supaya aturannya bisa
// diuji tanpa DOM, dan supaya keputusan "apa yang perlu ditindaklanjuti" tidak
// tersembunyi di dalam JSX. Pola yang sama dipakai `financeRows` dan
// `reportAvailability`.
//
// SATU ATURAN YANG MENGIKAT: modul ini **tidak pernah memuat nominal uang**.
// Uang di layar Murid hanya boleh muncul lewat gerbang `useMoneyVisible`
// (keputusan `ATURAN-AI.md` §4.1 butir B1), dan kartu ini tidak punya gerbang itu.
// Karena itu tagihan dilaporkan sebagai JUMLAH, bukan besaran.

/** Jenis tindakan. Urutannya di bawah menentukan prioritas tampilannya. */
export type StudentActionType =
  | "jadwal"
  | "pr"
  | "tagihan"
  | "tindak-lanjut";

export interface StudentAction {
  type: StudentActionType;
  /** Kalimat utama — sudah siap dibaca, bukan potongan. */
  title: string;
  /** Kalimat kedua yang menjelaskan dasar atau berikutnya berisi apa. */
  detail: string;
  /** `danger` = terlambat/mendesak, `warn` = perlu perhatian, `info` = informasi. */
  tone: "danger" | "warn" | "info";
  /** Rute yang dibuka kartu ini saat ditekan. */
  href: string;
  /**
   * `true` bila `href` adalah rujukan DI DALAM halaman ini (diawali `#`).
   * Pemanggil yang memutuskan cara membukanya; modul ini tidak menyentuh DOM.
   */
  anchorOnly?: boolean;
}

export interface StudentActionsInput {
  /** Tanggal hari ini `YYYY-MM-DD` (WIB), disuntikkan supaya bisa diuji. */
  today: string;
  /** Semua sesi terjadwal (belum selesai) milik murid ini. */
  scheduled: readonly Pick<ScheduledLike, "id" | "date" | "time" | "durationHours" | "status">[];
  /** Sesi yang sudah selesai — sumber "PR terakhir yang perlu perhatian". */
  doneSessions: readonly Pick<DoneLike, "id" | "date" | "needsWork" | "shortNote">[];
  /** Tagihan milik murid ini (semua status; yang dihitung hanya UNPAID). */
  payments: readonly Pick<PaymentLike, "id" | "status">[];
  /** Tindak lanjut yang belum selesai. */
  followUps: readonly Pick<FollowUpLike, "id" | "text" | "type" | "createdAt">[];
  /** Berapa sesi lama yang belum ditagih (opsional; dari repo, bukan dihitung di sini). */
  unbilledCount?: number;
}

export interface ScheduledLike {
  id: string;
  date: string;
  time?: string;
  durationHours: number;
  status: string;
}

export interface DoneLike {
  id: string;
  date: string;
  needsWork?: string;
  shortNote?: string;
}

export interface PaymentLike {
  id: string;
  status: string;
}

export interface FollowUpLike {
  id: string;
  text: string;
  type: string;
  createdAt: string;
}

/** Tanggal `YYYY-MM-DD` → jumlah hari dari `today`. Negatif = sudah lewat. */
function daysFrom(today: string, date: string): number {
  const a = new Date(`${today}T00:00:00`).getTime();
  const b = new Date(`${date}T00:00:00`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.NaN;
  return Math.round((b - a) / 86_400_000);
}

/** "Hari ini", "Besok", "3 hari lagi", atau "4 hari terlambat". */
export function relativeDayLabel(today: string, date: string): string {
  const d = daysFrom(today, date);
  if (!Number.isFinite(d)) return date;
  if (d === 0) return "Hari ini";
  if (d === 1) return "Besok";
  if (d === 2) return "Lusa";
  if (d > 0) return `${d} hari lagi`;
  return `${Math.abs(d)} hari terlambat`;
}

function relativeTone(today: string, date: string): StudentAction["tone"] {
  const d = daysFrom(today, date);
  if (!Number.isFinite(d)) return "info";
  if (d < 0) return "danger";
  if (d <= 2) return "warn";
  return "info";
}

/**
 * Menyusun daftar tindakan, sudah terurut menurut kepentingan.
 *
 * Urutannya disengaja: **jadwal yang sudah lewat** paling atas (itu yang paling
 * merugikan kalau dibiarkan), lalu jadwal terdekat, lalu PR, lalu tagihan, lalu
 * tindak lanjut. Fungsi ini mengembalikan SEMUA yang perlu ditindaklanjuti —
 * pemotongan jumlah untuk tampilan dilakukan pemanggil, bukan di sini.
 */
export function studentActions(input: StudentActionsInput): StudentAction[] {
  const { today, scheduled, doneSessions, payments, followUps } = input;
  const actions: StudentAction[] = [];

  // ── 1. Jadwal: yang paling mendesak lebih dulu ──
  const upcoming = scheduled
    .filter((s) => s.status === "SCHEDULED")
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));

  const overdue = upcoming.filter((s) => daysFrom(today, s.date) < 0);
  const next = upcoming.find((s) => daysFrom(today, s.date) >= 0);

  if (overdue.length > 0) {
    const oldest = overdue[0];
    actions.push({
      type: "jadwal",
      tone: "danger",
      title:
        overdue.length === 1
          ? "Ada jadwal yang sudah lewat"
          : `Ada ${overdue.length} jadwal yang sudah lewat`,
      detail:
        `Jadwal ${oldest.date}${oldest.time ? ` ${oldest.time}` : ""} (${relativeDayLabel(today, oldest.date)}) belum dicatat, ` +
        `dibatalkan, atau ditandai tidak hadir.`,
      href: "#jadwal-mendatang",
      anchorOnly: true,
    });
  }

  if (next) {
    const sameDay = next.date === today;
    actions.push({
      type: "jadwal",
      tone: relativeTone(today, next.date),
      title: sameDay ? "Sesi hari ini" : "Jadwal berikutnya",
      detail:
        `${relativeDayLabel(today, next.date)}${next.time ? ` · ${next.time}` : ""} · ${next.durationHours} jam` +
        (sameDay ? " — siapkan materinya." : "."),
      href: "/capture",
    });
  }

  // ── 2. PR / hal yang perlu diulang dari sesi terakhir ──
  // Diambil dari sesi SELESAI terbaru yang benar-benar mencatat `needsWork`,
  // bukan dari sesi terbaru apa pun: sesi terakhir sering belum diisi.
  const latestWithWork = doneSessions
    .filter((s) => (s.needsWork ?? "").trim().length > 0)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  if (latestWithWork) {
    const total = doneSessions.filter((s) => (s.needsWork ?? "").trim().length > 0).length;
    actions.push({
      type: "pr",
      tone: "warn",
      title: "Perlu diulang di sesi berikutnya",
      detail:
        `"${(latestWithWork.needsWork ?? "").trim()}" — dari sesi ${latestWithWork.date}. ` +
        `${total} dari ${doneSessions.length} sesi mencatat hal yang perlu diulang.`,
      href: "#riwayat-sesi",
      anchorOnly: true,
    });
  }

  // ── 3. Tagihan belum lunas — JUMLAH saja, tanpa nominal ──
  const unpaid = payments.filter((p) => p.status === "UNPAID");
  if (unpaid.length > 0) {
    actions.push({
      type: "tagihan",
      tone: "warn",
      title: `${unpaid.length} tagihan belum lunas`,
      detail: "Tindaklanjuti lewat layar Keuangan.",
      href: "/payments?tab=tagihan",
    });
  }

  // ── 4. Sesi lama yang belum ditagih ──
  const unbilled = input.unbilledCount ?? 0;
  if (unbilled > 0) {
    actions.push({
      type: "tagihan",
      tone: "info",
      title: `${unbilled} sesi belum masuk tagihan`,
      detail: "Sesi ini belum diambil ke tagihan mana pun.",
      href: "/payments?tab=tagihan",
    });
  }

  // ── 5. Tindak lanjut ──
  if (followUps.length > 0) {
    const oldest = followUps.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    actions.push({
      type: "tindak-lanjut",
      tone: "warn",
      title: followUps.length === 1 ? "1 tindak lanjut menunggu" : `${followUps.length} tindak lanjut menunggu`,
      detail: `Paling lama: "${oldest.text}".`,
      href: "#tindak-lanjut",
    });
  }

  return actions;
}

/** Berapa tindakan yang disebut "perlu perhatian" — dipakai untuk ringkasan singkat. */
export function attentionCount(actions: readonly StudentAction[]): number {
  return actions.filter((a) => a.tone === "danger" || a.tone === "warn").length;
}
