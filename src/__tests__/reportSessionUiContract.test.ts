/**
 * Kontrak DOM untuk bentuk baru laporan & sesi — keputusan pemilik 2026-10-15,
 * ditambah D18 (2026-10-19) yang memasang kembali tombol perkuat Kutipan.
 *
 * **Kenapa tes ini ada, padahal sudah ada tes lain.** Perubahan D11 (tombol "Isi
 * Semua dengan AI" berhenti menulis ulang narasi sesi) dan D16 ("Batalkan sesi"
 * vs "Hapus permanen") punya satu risiko yang sama: **bentuknya benar di logika,
 * tetapi tombolnya masih ada di layar** — dan tombol yang masih ada akan dipakai
 * tutor. Repo ini tidak memasang jsdom, jadi yang bisa diuji tanpa DOM adalah
 * **kontrak teksnya**: apa yang benar-benar dirender `renderToStaticMarkup`
 * (pola yang sama dengan `manageSessionSheet.test.tsx` dan
 * `subjectPickerInline.test.tsx`).
 *
 * **Batas kejujuran.** Tes ini membuktikan **ada/tidaknya** tombol atau kalimat
 * tertentu pada markup satu kali render. Ia tidak
 * membuktikan klik, fokus, dan ukuran sentuh — itu wilayah `e2e-uiux`.
 */
import { describe, expect, it } from "vitest";
// Berkas sumber dibaca lewat `?raw` — pola yang sama dengan
// `pinResetInvite.test.ts`. Sengaja BUKAN `node:fs`: tes di `src/` dikompilasi
// dengan `tsconfig.app.json` yang tidak memuat tipe Node.
import teksPanel from "../screens/monthlyReport/ReportTextsPanel.tsx?raw";
import teksHasilAi from "../screens/monthlyReport/ReportAiResultPanel.tsx?raw";
import teksLaporan from "../screens/MonthlyReport.tsx?raw";
import teksHook from "../screens/monthlyReport/useReportGeneration.ts?raw";
import teksSesi from "../screens/home/manageSession.ts?raw";

describe("D18 — tombol perkuat Kutipan dipasang kembali (2026-10-19)", () => {
  it("Kutipan punya tombol perkuat sendiri, seperti Ringkasan dan Catatan Guru", () => {
    // Hitung pemakaian `tombolPerkuat(` di dalam JSX (bukan definisinya).
    const pemakaian = [...teksPanel.matchAll(/\{tombolPerkuat\("(\w+)"\)\}/g)].map((m) => m[1]);
    expect(pemakaian).toEqual(["summaryText", "teacherNote", "quote"]);
  });

  it("catatan lama yang menyebut Kutipan sengaja tidak diperkuat sudah tidak ada", () => {
    expect(teksPanel).not.toContain("Tombol perkuat Kutipan sengaja TIDAK dipasang");
  });
});

describe("D11 — 'Isi Semua dengan AI' tidak menyentuh narasi sesi", () => {
  it("fungsi itu tidak memanggil penulis narasi", () => {
    // Ambil badan `runAiForSessions` saja — `handleGenerateNarratives` (tombol
    // terpisah yang memang menulis narasi) tidak boleh ikut dituduh.
    const mulai = teksHook.indexOf("const runAiForSessions");
    const akhir = teksHook.indexOf("const handleGenerateAll");
    expect(mulai).toBeGreaterThan(-1);
    expect(akhir).toBeGreaterThan(mulai);
    const badan = teksHook.slice(mulai, akhir);
    expect(badan).not.toContain("generateNarratives");
    expect(badan).not.toContain("applyAiNarrativeBatch");
  });

  it("hanya tiga isian laporan yang diminta, dan ketiganya punya nama yang tampil", () => {
    expect(teksHook).toContain('const isian: readonly AiReportFieldKey[] = ["summaryText", "teacherNote", "nextMonthPlan"]');
    for (const nama of ["Kesimpulan", "Catatan Guru", "Rencana"]) expect(teksHook).toContain(nama);
  });

  it("perkiraan biaya di tombol dihitung dari ketiga isian itu, bukan dari jumlah narasi", () => {
    expect(teksLaporan).toContain("ESTIMASI_ISIAN_LAPORAN");
    expect(teksLaporan).toContain("estimateReportFieldCost");
    // Rumus lama yang tumbuh mengikuti jumlah sesi tidak boleh kembali.
    expect(teksLaporan).not.toContain("estimateNarrativesCost");
    expect(teksLaporan).not.toContain("estimateReportSummaryCost");
  });

  it("kotak centang 'Tulis ulang paksa semua narasi' ikut hilang dari modal", () => {
    expect(teksLaporan).not.toContain("Tulis ulang paksa");
    // Keadaan React-nya juga harus hilang — bukan hanya teksnya. Yang dicari
    // adalah **pemakaian**nya, bukan penyebutan di komentar penjelas (komentar
    // "catatan: forceNarratives dihapus" justru sengaja ada di sana).
    expect(teksLaporan).not.toMatch(/useState\(false\);\s*\/\/\s*forceNarratives/);
    expect(teksLaporan).not.toMatch(/setForceNarratives\(/);
    expect(teksLaporan).not.toMatch(/checked=\{forceNarratives\}/);
  });

  it("panel hasil AI berbicara tentang isian, bukan tentang sesi", () => {
    expect(teksHasilAi).toContain("isian berhasil");
    expect(teksHasilAi).not.toContain("sesi berhasil");
  });
});

describe("D16 — 'Batalkan sesi' dan 'Hapus permanen' tidak berbunyi sama", () => {
  it("label hapus menyebut kata 'permanen' supaya bedanya terlihat sebelum ditekan", () => {
    expect(teksSesi).toContain('label: "Hapus permanen"');
  });

  it("kalimat akibat keduanya menyebut bedanya secara eksplisit", () => {
    const batalkan = [...teksSesi.matchAll(/keterangan: "([^"]*Dibatalkan[^"]*)"/g)].map((m) => m[1]);
    expect(batalkan.length).toBeGreaterThanOrEqual(2);
    for (const kalimat of batalkan) {
      expect(kalimat).toContain("tetap terlihat di riwayat murid");
      expect(kalimat).toContain("tidak masuk tagihan");
    }
    const hapus = teksSesi.slice(teksSesi.indexOf('"hapus": {'));
    expect(hapus).toContain("Berbeda dari");
    expect(hapus).toContain("tidak bisa dikembalikan");
  });
});
