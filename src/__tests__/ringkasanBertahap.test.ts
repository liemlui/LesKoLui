import { describe, expect, it } from "vitest";
import { AI_BATCH_MAX_SESSIONS, ringkasanBertahap } from "../lib/aiClient";
import { isiBagian, LABEL_BAGIAN } from "../screens/monthlyReport/useReportGeneration";

/**
 * **Kenapa berkas ini ada.** Pemilik melaporkan bahwa "perkuat dengan AI" sering
 * gagal karena konteks terlalu panjang, dan tombol "Coba lagi" tidak menolong
 * karena ia mengirim muatan yang **sama persis** (keputusan pemilik 2026-10-14).
 *
 * Dua invarian yang dijaga di sini, dan keduanya bisa gagal:
 *
 * 1. **Laporan kecil tidak berubah sama sekali.** Selama seluruh sesi muat dalam
 *    satu batch, jalur bertahap mengembalikan `null` — pemanggil memakai
 *    panggilan tunggal yang sudah ada. Kalau invarian ini rusak, laporan satu
 *    bulan yang normal tiba-tiba memakai beberapa panggilan AI tanpa alasan.
 * 2. **Ringkasan bertahap tidak pernah mengirim catatan sesi ke panggilan
 *    terakhir.** Yang dikirim hanya ringkasan tiap bagian, dan itu sebabnya
 *    konteks panggilan terakhir tidak tumbuh mengikuti jumlah sesi.
 */

function sesi(jumlah: number) {
  return Array.from({ length: jumlah }, (_, index) => ({
    id: `s-${index + 1}`,
    // Catatan sepanjang ini memaksa pemecahan batch tanpa bergantung pada angka ajaib.
    shortNote: "c".repeat(300),
  }));
}

describe("ringkasanBertahap — aturan pemecahan batch", () => {
  it("laporan kecil (satu batch) TIDAK memakai jalur bertahap", async () => {
    const hasil = await ringkasanBertahap(sesi(3), {
      ringkasBatch: async () => { throw new Error("tidak boleh dipanggil"); },
      susunAkhir: async () => { throw new Error("tidak boleh dipanggil"); },
    });
    expect(hasil).toBeNull();
  });

  it("daftar sesi kosong juga tidak memakai jalur bertahap", async () => {
    const hasil = await ringkasanBertahap([], {
      ringkasBatch: async () => { throw new Error("tidak boleh dipanggil"); },
      susunAkhir: async () => { throw new Error("tidak boleh dipanggil"); },
    });
    expect(hasil).toBeNull();
  });

  it("laporan panjang: satu ringkasan per batch, lalu satu kesimpulan akhir", async () => {
    const jumlahBatch: number[] = [];
    const dikirimKeAkhir: string[][] = [];
    const hasil = await ringkasanBertahap(sesi(17), {
      ringkasBatch: async (bagan) => {
        jumlahBatch.push(bagan.length);
        return `ringkasan ${bagan.length} sesi`;
      },
      susunAkhir: async (digests) => {
        dikirimKeAkhir.push([...digests]);
        return "kesimpulan akhir";
      },
    });

    expect(hasil).not.toBeNull();
    expect(hasil!.summary).toBe("kesimpulan akhir");
    expect(hasil!.batchCount).toBe(jumlahBatch.length);
    // Tidak ada batch yang melewati batas sesi per panggilan.
    for (const jumlah of jumlahBatch) expect(jumlah).toBeLessThanOrEqual(AI_BATCH_MAX_SESSIONS);
    // Panggilan terakhir menerima ringkasan bagian — satu per batch, urut.
    expect(dikirimKeAkhir).toHaveLength(1);
    expect(dikirimKeAkhir[0]).toHaveLength(jumlahBatch.length);
    expect(dikirimKeAkhir[0][0]).toBe(`ringkasan ${jumlahBatch[0]} sesi`);
  });

  it("kegagalan di satu batch tidak menghasilkan kesimpulan setengah jadi", async () => {
    await expect(ringkasanBertahap(sesi(17), {
      ringkasBatch: async (bagan) => {
        if (bagan.length === AI_BATCH_MAX_SESSIONS) throw new Error("AI timeout");
        return "ringkasan";
      },
      susunAkhir: async () => "kesimpulan akhir",
    })).rejects.toThrow("AI timeout");
  });
});

describe("isiBagian — hanya bagian yang diminta yang ditulis", () => {
  it("setiap bagian mengambil isiannya sendiri", () => {
    const out = { summary: "Kesimpulan baru", teacherNote: "Catatan baru", quote: "Kutipan baru" };
    expect(isiBagian("summaryText", out)).toBe("Kesimpulan baru");
    expect(isiBagian("teacherNote", out)).toBe("Catatan baru");
    expect(isiBagian("quote", out)).toBe("Kutipan baru");
  });

  it("isian yang tidak diminta selalu undefined — bukan string kosong", () => {
    // `""` akan MENGOSONGKAN tulisan tutor yang sudah ada di laporan; `undefined`
    // membuat `upsertReport` mempertahankan isi lama. Perbedaan ini yang menjaga
    // perkuat satu bagian tidak menghapus bagian lain.
    expect(isiBagian("teacherNote", { summary: "Hanya kesimpulan" })).toBeUndefined();
    expect(isiBagian("quote", { summary: "Hanya kesimpulan" })).toBeUndefined();
    expect(isiBagian("summaryText", { summary: "   " })).toBeUndefined();
  });

  it("setiap bagian punya nama Indonesia untuk pesan ke tutor", () => {
    for (const label of Object.values(LABEL_BAGIAN)) expect(label.trim()).not.toBe("");
    expect(LABEL_BAGIAN.summaryText).toBe("Kesimpulan");
    expect(LABEL_BAGIAN.nextMonthPlan).toBe("Rencana");
  });
});
