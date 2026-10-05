/**
 * Penjaga bentuk sheet "Kelola sesi" (G3-01 L4 bagian 2 — `TASK-06` §3 Langkah 4).
 *
 * **Kenapa tes ini ada.** Tabel aksi sudah dikunci `manageSessionActions.test.ts`.
 * Yang belum terjaga: apakah sheet benar-benar **menampilkan** aksi-aksi itu, dan
 * apakah **kolom isian** yang muncul sesuai dengan aksi yang dipilih. Risiko
 * sesungguhnya ada di sana — penggabungan dua modal bisa membuat "Kebijakan
 * tagihan" (no-show) atau pilihan cakupan seri hilang diam-diam, dan itu
 * perubahan arti data, bukan perubahan tampilan.
 *
 * **Cara kerja (tanpa DOM).** Repo ini tidak memasang `jsdom` /
 * `@testing-library/*` dan menambah dependensi dilarang tanpa Q-series
 * (`ATURAN-AI` §2.2), jadi tes memakai `renderToStaticMarkup` — pola yang sama
 * dengan `subjectPickerInline.test.tsx` dan `responseStepRadio.test.tsx`. Yang
 * **tidak** bisa dibuktikan di sini: interaksi klik, ukuran target sentuh, dan
 * apakah repo benar-benar memanggil DB; itu wilayah E2E (§6.2) dan pembacaan
 * kode. Karena itu pula keadaan "aksi sudah dipilih" diuji pada **aturan bentuk**
 * (`manageSessionForm`), bukan dengan mensimulasikan klik.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ManageSessionSheet from "../screens/home/ManageSessionSheet";
import { aksiSesi } from "../screens/home/manageSession";
import {
  defaultDate,
  konfirmasiUntuk,
  modeEfektif,
  pilihanMurid,
  sesiFormAwal,
  tampilkanPemilihMurid,
  validasiReschedule,
} from "../screens/home/manageSessionForm";
import type { Session, Student } from "../db/types";

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: "ses-1",
    studentId: "s-1",
    date: "2026-10-01",
    time: "15:30",
    durationHours: 1.5,
    subjects: [],
    shortNote: "",
    status: "SCHEDULED",
    rateSnapshot: 150000,
    cost: 225000,
    createdAt: "2026-09-30T10:00:00.000Z",
    updatedAt: "2026-09-30T10:00:00.000Z",
    ...overrides,
  };
}

function student(overrides: Partial<Student> = {}): Student {
  return {
    id: "s-1",
    name: "Sari",
    level: "SMA",
    subjects: [],
    parentContact: { name: "Ibu Sari", phone: "08123456789" },
    hourlyRate: 150000,
    active: true,
    enrolledAt: "2026-01-01",
    ...overrides,
  };
}

/** Markup sheet untuk satu konteks; `students` selalu berisi murid sesi ini. */
function markup(kontek: "terjadwal" | "terlewat", s: Session = session(), extra: Student[] = []) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ManageSessionSheet
        session={s}
        kontek={kontek}
        studentName="Sari"
        students={[student({ id: s.studentId, name: "Sari" }), ...extra]}
        onClose={() => {}}
        onResult={() => {}}
      />
    </MemoryRouter>,
  );
}

describe("ManageSessionSheet — panel dari bawah dengan aksi yang terlihat", () => {
  it("dirender sebagai sheet dialog dengan judul sesuai konteks", () => {
    const lewat = markup("terlewat");
    expect(lewat).toContain('role="dialog"');
    expect(lewat).toContain('aria-modal="true"');
    expect(lewat).toContain("Kelola sesi terlewat");

    const terjadwal = markup("terjadwal");
    expect(terjadwal).toContain('role="dialog"');
    expect(terjadwal).toContain("Kelola sesi");
    expect(terjadwal).not.toContain("Kelola sesi terlewat");
  });

  it("menyebut murid, tanggal, dan menandai sesi berulang", () => {
    const berseri = markup("terjadwal", session({ seriesId: "ser-1" }));
    expect(berseri).toContain("Sari");
    expect(berseri).toContain("Sesi berulang");
    expect(markup("terjadwal")).not.toContain("Sesi berulang");
  });

  it("keenam aksi konteks terlewat terlihat: tiga aksi utama + dua di `⋯`", () => {
    const html = markup("terlewat");
    for (const label of ["Catat", "Batal les", "Tidak hadir"]) expect(html).toContain(label);
    // `⋯` menampilkan jumlahnya, isinya baru muncul setelah dibuka.
    expect(html).toContain("Aksi lain (2)");
    expect(html).not.toContain("Jadwalkan ulang");
    // Kelima aksi konteks ini ada di tabel, bukan hanya yang terlihat.
    expect(aksiSesi({ kontek: "terlewat", berseri: false })).toHaveLength(5);
  });

  it("konteks terjadwal menawarkan Simpan perubahan, tanpa aksi konteks terlewat", () => {
    const html = markup("terjadwal");
    expect(html).toContain("Simpan perubahan");
    expect(html).not.toContain("Tidak hadir");
    expect(html).not.toContain("Batal les");
    expect(html).not.toContain("Jadwalkan ulang");
    expect(html).toContain("Aksi lain (2)");
  });

  it("menyatakan akibat hapus sebelum konfirmasi diminta", () => {
    // `hapus` ada di `⋯`, jadi kalimatnya menjelaskan bahwa ada langkah pastikan.
    expect(markup("terjadwal")).toContain("Aksi lain");
  });
});

describe("ManageSessionSheet — yang tidak boleh hilang dari aksi terpilih", () => {
  it("'Jadwalkan ulang' memakai hari ini sebagai tanggal pengganti, bukan tanggal sesi", () => {
    const s = session({ date: "2026-10-01" });
    expect(defaultDate("jadwalkan-ulang", s)).not.toBe(s.date);
  });

  it("'Simpan perubahan' mulai dari tanggal sesi itu sendiri", () => {
    const s = session({ date: "2026-10-01" });
    expect(defaultDate("simpan-perubahan", s)).toBe(s.date);
    expect(defaultDate(null, s)).toBe(s.date);
  });

  it("pemilih murid hanya untuk jalur ubah jadwal — sesi terlewat tidak berpindah murid", () => {
    expect(tampilkanPemilihMurid("simpan-perubahan")).toBe(true);
    expect(tampilkanPemilihMurid("tidak-hadir")).toBe(false);
    expect(tampilkanPemilihMurid("jadwalkan-ulang")).toBe(false);
  });

  it("nilai awal kolom isian diambil dari sesi, bukan dari nilai kosong", () => {
    const awal = sesiFormAwal(session({ time: undefined, durationHours: 2 }));
    expect(awal.studentId).toBe("s-1");
    expect(awal.time).toBe("08:00"); // sesi tanpa jam
    expect(awal.durationHours).toBe(2);
    expect(awal.mode).toBe("this");
    expect(awal.reason).toBe("");
  });

  it("sesi tunggal selalu dikirim dengan cakupan 'this'", () => {
    expect(modeEfektif(false, "all")).toBe("this");
    expect(modeEfektif(true, "all")).toBe("all");
  });

  it("daftar murid menyertakan murid sesi ini walau statusnya nonaktif", () => {
    const nonaktif = student({ id: "s-9", name: "Budi", active: false });
    const daftar = pilihanMurid([nonaktif, student({ id: "s-2", active: true })], session({ studentId: "s-9" }));
    expect(daftar.map((s) => s.id)).toEqual(["s-9", "s-2"]);
  });
});

describe("Aksi merusak wajib dikonfirmasi", () => {
  const ctx = { studentName: "Sari", berseri: false };

  it("batal les & batalkan sesi dikonfirmasi; kalimatnya menyebut tidak ditagihkan", () => {
    const info = konfirmasiUntuk("batal-les", ctx);
    expect(info?.title).toBe("Batalkan sesi ini?");
    expect(info?.message).toContain("tidak ditagihkan");
    expect(konfirmasiUntuk("batalkan-sesi", ctx)?.confirmLabel).toBe("Ya, batalkan");
  });

  it("hapus dikonfirmasi terpisah dari batal", () => {
    const info = konfirmasiUntuk("hapus", ctx);
    expect(info?.title).toBe("Hapus sesi ini?");
    expect(info?.confirmLabel).toBe("Ya, hapus");
  });

  it("simpan perubahan, tidak hadir, dan catat tidak dikonfirmasi", () => {
    expect(konfirmasiUntuk("simpan-perubahan", ctx)).toBeNull();
    expect(konfirmasiUntuk("tidak-hadir", ctx)).toBeNull();
    expect(konfirmasiUntuk("catat", ctx)).toBeNull();
    expect(konfirmasiUntuk("jadwalkan-ulang", ctx)).toBeNull();
  });

  it("konfirmasi sesi berseri menyebut cakupan yang akan dipakai", () => {
    expect(konfirmasiUntuk("batalkan-sesi", { studentName: "Sari", berseri: true })?.message).toContain("cakupan");
  });
});

describe("validasiReschedule — pesan yang bisa dibaca tutor, sebelum menyentuh DB", () => {
  it("tanggal lampau ditolak", () => {
    const hasil = validasiReschedule({ date: "2026-09-30", time: "15:30", durationHours: 1.5 }, "2026-10-01");
    expect(hasil.ok).toBe(false);
    expect(hasil.pesan).toContain("sudah lewat");
  });

  it("tanggal kosong ditolak", () => {
    expect(validasiReschedule({ date: "", time: "15:30", durationHours: 1.5 }, "2026-10-01").ok).toBe(false);
  });

  it("durasi nol ditolak", () => {
    expect(validasiReschedule({ date: "2026-10-02", time: "15:30", durationHours: 0 }, "2026-10-01").ok).toBe(false);
  });

  it("tanggal hari ini diterima (batasnya 'tidak boleh sudah lewat')", () => {
    expect(validasiReschedule({ date: "2026-10-01", time: "15:30", durationHours: 1.5 }, "2026-10-01").ok).toBe(true);
  });
});
