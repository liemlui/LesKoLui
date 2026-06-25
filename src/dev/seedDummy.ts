/**
 * DEV-ONLY dummy data seeder.
 * Wired in main.tsx behind `import.meta.env.DEV`. Auto-runs once when the DB is
 * empty, and is also exposed as `window.seedDummy()` / `window.clearDummy()`.
 * Safe to delete this file (and its import in main.tsx) when no longer needed.
 */
import {
  createStudent, createSession, scheduleSession, closeMonth,
  markPaymentTransferred, createExpense, saveSettings, getSettings, listStudents,
} from "../db/repos";
import { hashPin } from "../lib/crypto";
import type { ExpenseCategory } from "../db/types";

type S = { date: string; dur: number; note: string };

async function addDone(studentId: string, subjects: string[], rows: S[], eng?: number) {
  for (const r of rows) {
    await createSession({
      studentId,
      date: r.date,
      durationHours: r.dur,
      subjects,
      shortNote: r.note,
      status: "DONE",
      ...(eng ? { engagement: { score: eng } } : {}),
    });
  }
}

export async function seedDummyData(force = false): Promise<void> {
  const existing = await listStudents();
  if (existing.length > 0 && !force) {
    console.warn("[seedDummy] Sudah ada data murid — seed dilewati. Jalankan seedDummy(true) untuk memaksa, atau clearDummy() untuk reset.");
    return;
  }

  // ── Settings: tutor + rekening + PIN keuangan (123456) ──
  const s = await getSettings();
  await saveSettings({
    tutorProfile: {
      name:  s.tutorProfile?.name  || "Ko Lui",
      phone: s.tutorProfile?.phone || "081100000000",
    },
    bankAccounts: {
      ...s.bankAccounts,
      bca: s.bankAccounts?.bca || "1234567890",
      accountName: s.bankAccounts?.accountName || "Liem Lui",
    },
    ...(s.financialPin ? {} : { financialPin: await hashPin("123456") }),
  });

  // ── Murid ──
  const andi = await createStudent({
    name: "Andi Pratama", level: "IBDP", curriculum: "IB DP", grade: "Grade 11",
    subjects: ["Mathematics AA", "Physics"],
    parentContact: { name: "Bpk. Pratama", phone: "081234567801" },
    hourlyRate: 250000, active: true, enrolledAt: "2026-01-10",
  });
  const bella = await createStudent({
    name: "Bella Sari", level: "IBDP", curriculum: "IB DP", grade: "Grade 12",
    subjects: ["Physics", "Chemistry"],
    parentContact: { name: "Ibu Sari", phone: "081234567802" },
    hourlyRate: 300000, active: true, enrolledAt: "2025-09-01",
  });
  const citra = await createStudent({
    name: "Citra Dewanti", level: "MYP", curriculum: "IB MYP", grade: "Grade 10",
    subjects: ["Economics"],
    parentContact: { name: "Bpk. Dewanti", phone: "081234567803" },
    hourlyRate: 200000, active: true, enrolledAt: "2026-02-15",
  });
  const dewi = await createStudent({
    name: "Dewi Anggraini", level: "IBDP", curriculum: "IB DP", grade: "Grade 11",
    subjects: ["Biology"],
    parentContact: { name: "Ibu Anggraini", phone: "081234567804" },
    hourlyRate: 275000, active: true, enrolledAt: "2025-11-20",
  });

  // ── Sesi DONE (pemasukan fluktuatif bulan ke bulan) ──
  // Maret — bulan ringan
  await addDone(andi, ["Mathematics AA"], [{ date: "2026-03-05", dur: 2, note: "Kalkulus dasar" }, { date: "2026-03-19", dur: 2, note: "Limit & turunan" }], 8);
  await addDone(bella, ["Physics"],       [{ date: "2026-03-12", dur: 1.5, note: "Kinematika" }], 7);
  await addDone(citra, ["Economics"],     [{ date: "2026-03-08", dur: 2, note: "Demand & supply" }, { date: "2026-03-22", dur: 2, note: "Elastisitas" }], 6);

  // April — bulan ramai
  await addDone(andi, ["Mathematics AA"], [{ date: "2026-04-02", dur: 2, note: "Integral" }, { date: "2026-04-09", dur: 2, note: "Integral lanjutan" }, { date: "2026-04-16", dur: 2, note: "Aplikasi integral" }, { date: "2026-04-23", dur: 2, note: "Latihan soal" }], 9);
  await addDone(bella, ["Chemistry"],     [{ date: "2026-04-05", dur: 1.5, note: "Stoikiometri" }, { date: "2026-04-19", dur: 1.5, note: "Termokimia" }], 8);
  await addDone(citra, ["Economics"],     [{ date: "2026-04-12", dur: 2, note: "Market structure" }, { date: "2026-04-26", dur: 2, note: "Monopoli" }], 7);
  await addDone(dewi,  ["Biology"],       [{ date: "2026-04-15", dur: 2, note: "Sel & organel" }, { date: "2026-04-29", dur: 2, note: "Genetika" }], 8);

  // Mei — sedang
  await addDone(andi, ["Physics"],        [{ date: "2026-05-07", dur: 2, note: "Hukum Newton" }, { date: "2026-05-21", dur: 2, note: "Momentum" }], 8);
  await addDone(bella, ["Physics"],       [{ date: "2026-05-10", dur: 2, note: "Gelombang" }, { date: "2026-05-24", dur: 1.5, note: "Optik" }], 7);
  await addDone(citra, ["Economics"],     [{ date: "2026-05-17", dur: 2, note: "Makroekonomi" }], 6);
  await addDone(dewi,  ["Biology"],       [{ date: "2026-05-13", dur: 2, note: "Fotosintesis" }, { date: "2026-05-27", dur: 2, note: "Respirasi sel" }], 9);

  // Juni — bulan berjalan (belum ditutup)
  await addDone(andi, ["Mathematics AA"], [{ date: "2026-06-04", dur: 2, note: "Statistik" }, { date: "2026-06-18", dur: 2, note: "Probabilitas" }], 8);
  await addDone(bella, ["Chemistry"],     [{ date: "2026-06-11", dur: 2, note: "Kesetimbangan kimia" }], 7);
  await addDone(citra, ["Economics"],     [{ date: "2026-06-09", dur: 2, note: "Perdagangan internasional" }, { date: "2026-06-23", dur: 2, note: "Nilai tukar" }], 7);
  await addDone(dewi,  ["Biology"],       [{ date: "2026-06-16", dur: 2, note: "Evolusi" }], 8);

  // ── Sesi terjadwal Juli (untuk prediksi) ──
  await scheduleSession({ studentId: andi, date: "2026-07-02", time: "10:00", durationHours: 2 });
  await scheduleSession({ studentId: andi, date: "2026-07-16", time: "10:00", durationHours: 2 });
  await scheduleSession({ studentId: bella, date: "2026-07-09", time: "15:00", durationHours: 1.5 });
  await scheduleSession({ studentId: dewi,  date: "2026-07-14", time: "13:00", durationHours: 2 });

  // ── Tutup bulan + status transfer (untuk Realisasi & Piutang) ──
  await closeMonth("2026-03");                       // semua lunas
  await markPaymentTransferred(andi,  "2026-03");
  await markPaymentTransferred(bella, "2026-03");
  await markPaymentTransferred(citra, "2026-03");

  await closeMonth("2026-04");                       // sebagian lunas → ada piutang
  await markPaymentTransferred(andi,  "2026-04");

  await closeMonth("2026-05");                       // baru 1 lunas → piutang lebih besar
  await markPaymentTransferred(citra, "2026-05");
  // Juni sengaja dibiarkan terbuka agar bisa dites manual.

  // ── Pengeluaran ──
  const exp = (date: string, category: ExpenseCategory, description: string, amount: number) =>
    createExpense({ date, category, description, amount });
  await exp("2026-03-10", "transport", "Isi bensin", 140000);
  await exp("2026-04-15", "transport", "Isi bensin", 150000);
  await exp("2026-04-20", "alat",      "Beli ATK (spidol, kertas)", 85000);
  await exp("2026-05-05", "platform",  "Langganan AI (Claude)", 300000);
  await exp("2026-05-18", "transport", "Service mobil rutin", 750000);
  await exp("2026-06-03", "platform",  "Langganan AI (Claude)", 300000);
  await exp("2026-06-12", "transport", "Isi bensin", 145000);

  console.info("%c[seedDummy] Data dummy berhasil dimasukkan ✓", "color:#10B981;font-weight:bold");
  console.info("[seedDummy] PIN Rekap Keuangan: 123456 · Buka /report → tab Rekap Keuangan.");
}

/** Wipe the IndexedDB and reload — handy for re-seeding. */
export function clearDummy(): void {
  indexedDB.deleteDatabase("jurnalles");
  console.info("[seedDummy] DB dihapus. Reload halaman untuk seed ulang.");
  setTimeout(() => location.reload(), 300);
}
