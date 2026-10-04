/**
 * Penjaga "Urungkan" untuk hapus topik & tindak lanjut (G3-01 fitur #7 — C-13).
 *
 * **Kenapa tes ini ada.** Konfirmasi (C-05) hanya mencegah penghapusan yang tak
 * sengaja; ia tidak memberi jalan kembali setelah tutor menekan "Hapus". Yang
 * diuji di sini adalah **aturan pemulihannya**, bukan tampilannya: item harus
 * kembali ke **posisi asal**, bukan ditambahkan di ujung daftar — urutan topik
 * ikut tersimpan ke sesi dan muncul di pesan WhatsApp ke orang tua, jadi
 * menyisipkan di ujung akan mengubah susunan yang sudah dibuat tutor.
 *
 * **Cara uji.** Fungsi murni di `undoDeletion.ts`; markup & toast-nya sendiri
 * dijaga E2E saat langkah 2 dibuka manusia (`topicBrowseDefault.test.tsx`
 * memakai alasan yang sama: merender `CaptureSession` butuh `useLiveQuery`,
 * `useSettingsQuery`, dan `MemoryRouter`).
 */
import { describe, expect, it } from "vitest";
import { withFollowUpRestored, withTopicRestored } from "../screens/captureSession/undoDeletion";

describe("withTopicRestored — undo hapus topik", () => {
  it("mengembalikan topik ke posisi asalnya, bukan ke ujung", () => {
    const result = withTopicRestored(["Aljabar", "Trigonometri", "Limit"], {}, "Trigonometri", undefined, 1);
    expect(result.topics).toEqual(["Aljabar", "Trigonometri", "Limit"]);
  });

  it("mengembalikan bab katalog yang ikut terhapus", () => {
    const result = withTopicRestored(["Aljabar"], { Aljabar: "Bab 3 — Persamaan" }, "Aljabar", "Bab 3 — Persamaan", 0);
    expect(result.topics).toEqual(["Aljabar"]);
    expect(result.topicUnits).toEqual({ Aljabar: "Bab 3 — Persamaan" });
  });

  it("topik yang diketik bebas tidak mendapat bab palsu", () => {
    const result = withTopicRestored([], {}, "Essay structure", undefined, 0);
    expect(result.topics).toEqual(["Essay structure"]);
    expect(result.topicUnits).toEqual({});
  });

  it("tidak menggandakan bila topik sudah dipilih ulang sebelum Urungkan ditekan", () => {
    const result = withTopicRestored(["Aljabar"], { Aljabar: "Bab 3 — Persamaan" }, "Aljabar", "Bab 3 — Persamaan", 0);
    expect(result.topics).toEqual(["Aljabar"]);
    expect(result.topicUnits).toEqual({ Aljabar: "Bab 3 — Persamaan" });
  });

  it("posisi rusak tidak membuang topik — ditaruh di ujung", () => {
    const result = withTopicRestored(["Aljabar", "Limit"], {}, "Trigonometri", undefined, 99);
    expect(result.topics).toEqual(["Aljabar", "Limit", "Trigonometri"]);
  });
});

describe("withFollowUpRestored — undo hapus tindak lanjut", () => {
  const a = { id: "f1", text: "Ulang latihan limit" };
  const b = { id: "f2", text: "Kirim kisi-kisi" };
  const c = { id: "f3", text: "Cek PR bab 4" };

  it("mengembalikan item ke posisi asalnya", () => {
    const result = withFollowUpRestored([a, c], b, 1);
    expect(result.map((f) => f.id)).toEqual(["f1", "f2", "f3"]);
  });

  it("tidak menggandakan item yang sama", () => {
    const result = withFollowUpRestored([a, b, c], b, 1);
    expect(result.map((f) => f.id)).toEqual(["f1", "f2", "f3"]);
  });

  it("teks item dipulihkan apa adanya", () => {
    const result = withFollowUpRestored([], b, 0);
    expect(result[0]).toEqual(b);
  });
});
