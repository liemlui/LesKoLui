import { describe, expect, it } from "vitest";
import { scheduleCaptureMismatch } from "../lib/scheduleCapture";

const lock = { studentId: "student-a", date: "2026-07-02" };

describe("scheduleCaptureMismatch (penjaga C-02)", () => {
  it("meloloskan sesi yang menunjuk murid & tanggal jadwal yang sama", () => {
    expect(scheduleCaptureMismatch(lock, "student-a", "2026-07-02")).toBeNull();
  });

  it("menolak ketika murid berbeda dari jadwal", () => {
    // Kasus nyata yang ditemukan audit: laporan menampilkan murid B, tetapi
    // baris sesi milik murid A yang diperbarui.
    expect(scheduleCaptureMismatch(lock, "student-b", "2026-07-02")).toMatch(/Murid tidak cocok/);
  });

  it("menolak ketika tanggal berbeda dari jadwal", () => {
    expect(scheduleCaptureMismatch(lock, "student-a", "2026-07-03")).toMatch(/Tanggal tidak cocok/);
  });

  it("tidak membatasi sesi baru tanpa jadwal", () => {
    expect(scheduleCaptureMismatch(null, "student-b", "2026-01-01")).toBeNull();
  });
});
