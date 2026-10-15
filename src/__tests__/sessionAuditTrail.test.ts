/**
 * Jejak audit untuk **perubahan** sesi — butir C5, keputusan pemilik 2026-10-15.
 *
 * **Kenapa tes ini ada.** Sampai 2026-10-15 pembatalan (`session.cancel`),
 * ketidakhadiran (`session.no_show`), penjadwalan ulang (`session.reschedule`),
 * penghapusan (`session.delete`), dan pembatalan seri semuanya menulis jejak —
 * sedangkan **mengubah** sesi (tanggal, jam, durasi, murid, mapel, nominal) tidak
 * menulis apa pun. Padahal perubahan itu ikut menentukan apa yang ditagih.
 * Keluhan itu sudah lama tercatat di `PEKERJAAN.md` §4 sebagai backlog.
 *
 * **Yang diuji.** Dua tingkat, dan keduanya perlu: (a) `ringkasanPerubahanSesi`
 * sebagai fungsi murni — kolom mana yang masuk ringkasan dan kapan ia `undefined`;
 * (b) `updateSession` benar-benar menulis entri `session.update` ke `auditLog`
 * lewat `fake-indexeddb`, sebab modul yang benar tetapi tidak dipanggil siapa pun
 * adalah cacat yang sudah pernah lolos di repo ini (lihat G3-10 butir 3).
 *
 * **Batas kejujuran.** Tidak ada yang memeriksa tampilan Riwayat Aktivitas di
 * sini — repo ini tidak memasang jsdom. Yang membacanya di layar ada di
 * `auditDisplay` beserta tesnya.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import { createSession, listAuditLog, ringkasanPerubahanSesi, updateSession } from "../db/repos";
import type { Session, Student } from "../db/types";

const MURID: Student = {
  id: "murid-jejak",
  name: "Murid Jejak",
  level: "SMA",
  subjects: ["Matematika"],
  parentContact: { name: "Ortu", phone: "0812" },
  hourlyRate: 200_000,
  active: true,
  enrolledAt: "2026-01-01",
};

/** Sesi terjadwal tiruan — tanggalnya di masa depan supaya tidak dianggap lewat. */
function sesiBaru(): Omit<Session, "id" | "rateSnapshot" | "cost" | "createdAt" | "updatedAt"> {
  return {
    studentId: MURID.id,
    date: "2026-12-01",
    time: "15:00",
    durationHours: 1.5,
    subjects: ["Matematika"],
    shortNote: "",
    status: "SCHEDULED",
    topic: "Aljabar",
  };
}

beforeEach(async () => {
  await db.sessions.clear();
  await db.students.clear();
  await db.auditLog.clear();
  await db.students.add(MURID);
});

describe("ringkasanPerubahanSesi — hanya kolom yang benar-benar berubah", () => {
  const lama: Partial<Session> = {
    date: "2026-12-01", time: "15:00", durationHours: 1.5, studentId: "murid-jejak",
    subjects: ["Matematika"], status: "SCHEDULED", cost: 300_000,
  };

  it("menyebut kolom dan nilai sebelum → sesudah", () => {
    const hasil = ringkasanPerubahanSesi(lama, { date: "2026-12-03" });
    expect(hasil).toBe("date: 2026-12-01 → 2026-12-03");
  });

  it("menggabungkan beberapa kolom dengan pemisah yang sama seperti jejak lain", () => {
    const hasil = ringkasanPerubahanSesi(lama, { date: "2026-12-03", time: "16:30" });
    expect(hasil).toContain("date: 2026-12-01 → 2026-12-03");
    expect(hasil).toContain("time: 15:00 → 16:30");
    expect(hasil).toContain(" · ");
  });

  it("mengabaikan kolom yang tidak berubah dan kolom di luar daftar jejak", () => {
    // `shortNote` dan `updatedAt` bukan bagian dari daftar kolom jejak.
    expect(ringkasanPerubahanSesi(lama, { date: "2026-12-01" })).toBeUndefined();
    expect(ringkasanPerubahanSesi(lama, { shortNote: "catatan baru" })).toBeUndefined();
  });

  it("nilai kosong ditulis '—' dan teks panjang dipotong", () => {
    expect(ringkasanPerubahanSesi(lama, { date: undefined })).toBe("date: 2026-12-01 → —");
    const panjang = ringkasanPerubahanSesi(lama, { topic: "x".repeat(200) });
    expect(panjang).toContain("…");
    expect((panjang ?? "").length).toBeLessThan(80);
  });

  it("mapel (array) diringkas menjadi teks yang terbaca", () => {
    const hasil = ringkasanPerubahanSesi(lama, { subjects: ["Matematika", "Fisika"] });
    expect(hasil).toBe("subjects: Matematika → Matematika, Fisika");
  });
});

describe("updateSession menulis jejak session.update", () => {
  it("mengubah tanggal meninggalkan satu entri dengan perubahan yang terbaca", async () => {
    const id = await createSession(sesiBaru());

    await updateSession(id, { date: "2026-12-05" });

    const log = await listAuditLog(10);
    const entri = log.filter((item) => item.action === "session.update" && item.entityId === id);
    expect(entri).toHaveLength(1);
    expect(entri[0].details).toBe("date: 2026-12-01 → 2026-12-05");
  });

  it("penyimpanan yang tidak mengubah apa pun tidak menulis jejak kosong", async () => {
    const id = await createSession(sesiBaru());
    await db.auditLog.clear();

    await updateSession(id, { date: "2026-12-01" });

    expect(await listAuditLog(10)).toHaveLength(0);
  });

  it("mengubah nominal manual tercatat sebagai perubahan uang, bukan dihitung ulang", async () => {
    const id = await createSession(sesiBaru());
    await db.auditLog.clear();

    await updateSession(id, { costOverride: 175_000 });

    const log = await listAuditLog(10);
    const entri = log.find((item) => item.action === "session.update");
    expect(entri?.details).toContain("costOverride: — → 175000");
    expect(entri?.details).toContain("cost: 300000 → 175000");
    // Nominal manual tetap yang dipakai — bukan tarif murid.
    expect((await db.sessions.get(id))?.cost).toBe(175_000);
  });

  it("jejak tidak menyalin seluruh catatan sesi (panjangnya dibatasi)", async () => {
    const id = await createSession(sesiBaru());
    await db.auditLog.clear();

    await updateSession(id, { date: "2026-12-09", time: "17:00", durationHours: 3 });

    const entri = (await listAuditLog(10)).find((item) => item.action === "session.update");
    expect(entri?.details).toBeTruthy();
    expect((entri?.details ?? "").length).toBeLessThan(200);
  });
});
