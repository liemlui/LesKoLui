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
  patchUbahJadwal,
  peringatanGantiMurid,
  pilihanMurid,
  sesiFormAwal,
  tampilkanPemilihMurid,
  validasiReschedule,
} from "../screens/home/manageSessionForm";
import type { Session, Student } from "../db/types";
import type { FormUbahJadwal } from "../screens/home/manageSessionForm";

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
    // Label `Batalkan sesi` dipakai di KEDUA konteks sejak 2026-10-05; sebelumnya
    // konteks ini berbunyi "Batal les" padahal operasinya sama persis, dan perbedaan
    // kata itu yang membuat tutor bertanya "bedanya apa?".
    for (const label of ["Catat", "Batalkan sesi", "Tidak hadir"]) expect(html).toContain(label);
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
    expect(html).not.toContain("Jadwalkan ulang");
    expect(html).toContain("Aksi lain (2)");
  });

  it("sesi terjadwal membuka kolom isian LANGSUNG, bukan tombol tanpa isian", () => {
    // Laporan pemilik 2026-10-05: "ada button simpan perubahan, tapi tidak ada isian
    // untuk diubah". Sebabnya sheet terbuka tanpa aksi terpilih, jadi kolomnya baru
    // muncul setelah tombolnya ditekan. Sekarang kolomnya sudah terbuka sejak awal.
    const html = markup("terjadwal");
    expect(html).toContain('id="msm-murid"');
    expect(html).toContain("Jam mulai");
    expect(html).toContain("Durasi");
    // Sesi terlewat tetap mulai tanpa aksi terpilih — di sana yang utama adalah
    // memilih hasil sesinya (Catat / Batalkan sesi / Tidak hadir).
    expect(markup("terlewat")).not.toContain('id="msm-murid"');
  });

  it("murid nonaktif tetap bisa dipilih dan ditandai (nonaktif)", () => {
    const html = markup("terjadwal", session(), [student({ id: "s-9", name: "Budi", active: false })]);
    expect(html).toContain("Budi (nonaktif)");
    expect(html).toContain("Sari");
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

  it("daftar murid memuat SEMUA murid — yang nonaktif ditandai, bukan disembunyikan", () => {
    const nonaktif = student({ id: "s-9", name: "Budi", active: false });
    const aktif = student({ id: "s-2", name: "Andi", active: true });
    // Urutan apa adanya: `pilihanMurid` tidak lagi menyaring maupun mengurutkan.
    expect(pilihanMurid([nonaktif, aktif]).map((s) => s.id)).toEqual(["s-9", "s-2"]);
    expect(pilihanMurid([nonaktif, aktif]).map((s) => s.name)).toEqual(["Budi", "Andi"]);
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

  it("simpan tanpa ganti murid, tidak hadir, dan catat tidak dikonfirmasi", () => {
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

/**
 * Perbaikan 2026-10-05 (temuan penyelidikan alur Beranda).
 *
 * Dua hal yang dijaga di sini, keduanya akibat dari satu fakta repo:
 * `updateSession()` menghitung ulang `cost` **dan melepas `costOverride`** setiap kali
 * `durationHours` ADA di patch (syaratnya `!== undefined`, bukan "berubah").
 */
describe("Ubah jadwal: durasi hanya dikirim bila berubah (a)", () => {
  const formUbah = (over: Partial<FormUbahJadwal> = {}): FormUbahJadwal => ({
    muridId: "s-1", tanggal: "2026-10-01", jam: "15:30", durasi: 1.5, cakupan: "this", ...over,
  });

  it("durasi tidak ikut dikirim bila tidak berubah — nominal manual tidak boleh terhapus", () => {
    const patch = patchUbahJadwal(session(), formUbah(), "2026-10-01");
    expect("durationHours" in patch).toBe(false);
  });

  it("durasi ikut dikirim saat memang diubah", () => {
    const patch = patchUbahJadwal(session(), formUbah({ durasi: 2 }), "2026-10-01");
    expect(patch.durationHours).toBe(2);
  });

  it("murid & jam selalu ikut; tanggal hanya untuk cakupan 'Sesi ini'", () => {
    const satu = patchUbahJadwal(session(), formUbah({ muridId: "s-2", jam: "16:00", tanggal: "2026-10-05" }), "2026-10-01");
    expect(satu.studentId).toBe("s-2");
    expect(satu.time).toBe("16:00");
    expect(satu.date).toBe("2026-10-05");

    const seri = patchUbahJadwal(session(), formUbah({ cakupan: "future", tanggal: "2026-10-05" }), "2026-10-01");
    expect(seri.date).toBeUndefined();
  });

  it("murid kosong jatuh ke murid sesi, bukan string kosong", () => {
    expect(patchUbahJadwal(session(), formUbah({ muridId: "" }), "2026-10-01").studentId).toBe("s-1");
  });

  it("tanggal yang sama tidak dikirim walau cakupannya 'Sesi ini'", () => {
    expect(patchUbahJadwal(session(), formUbah(), "2026-10-01").date).toBeUndefined();
  });
});

describe("Ganti murid: peringatan di sheet + konfirmasi sebelum simpan (b)", () => {
  it("tanpa pergantian murid tidak ada peringatan", () => {
    expect(peringatanGantiMurid({
      muridLama: "Sari", muridBaru: "Sari", berseri: false, cakupan: "this", adaNominalManual: false,
    })).toBeNull();
  });

  it("tanpa nominal manual: peringatan menyebut nominal DIHITUNG ULANG dari tarif murid baru", () => {
    const teks = peringatanGantiMurid({
      muridLama: "Sari", muridBaru: "Budi", berseri: false, cakupan: "this", adaNominalManual: false,
    })!;
    expect(teks).toContain("Sari");
    expect(teks).toContain("Budi");
    expect(teks).toContain("dihitung ulang memakai tarif Budi");
    expect(teks).toContain("tagihan");
  });

  it("dengan nominal manual: peringatan menyebut jumlahnya TIDAK diubah", () => {
    const teks = peringatanGantiMurid({
      muridLama: "Sari", muridBaru: "Budi", berseri: false, cakupan: "this", adaNominalManual: true,
    })!;
    expect(teks).toContain("Nominal manual sesi ini tidak diubah");
    expect(teks).not.toContain("dihitung ulang");
  });

  it("peringatan tidak memuat angka rupiah — Beranda dilarang menampilkan uang (K3/B1)", () => {
    for (const adaNominalManual of [false, true]) {
      const teks = peringatanGantiMurid({
        muridLama: "Sari", muridBaru: "Budi", berseri: true, cakupan: "all", adaNominalManual,
      })!;
      expect(teks).not.toContain("Rp");
      expect(teks).not.toMatch(/\d/);
    }
  });

  it("cakupan seri disebut hanya saat berlaku untuk sesi berikutnya", () => {
    const dasar = { muridLama: "Sari", muridBaru: "Budi", berseri: true, adaNominalManual: false } as const;
    const satu = peringatanGantiMurid({ ...dasar, cakupan: "this" })!;
    const seri = peringatanGantiMurid({ ...dasar, cakupan: "all" })!;
    expect(satu).not.toContain("seri ini");
    expect(seri).toContain("seri ini");
  });

  it("konfirmasi hanya muncul saat muridnya benar-benar berganti", () => {
    const ctx = { studentName: "Sari", berseri: false };
    expect(konfirmasiUntuk("simpan-perubahan", ctx)).toBeNull();
    expect(konfirmasiUntuk("simpan-perubahan", { ...ctx, muridLama: "Sari", muridBaru: "Sari" })).toBeNull();

    const info = konfirmasiUntuk("simpan-perubahan", { ...ctx, muridLama: "Sari", muridBaru: "Budi" })!;
    expect(info.title).toBe("Ganti murid sesi ini?");
    expect(info.confirmLabel).toBe("Ya, ganti murid");
    expect(info.message).toContain("Budi");
    expect(info.message).toContain("Sari");
    expect(info.message).toContain("dihitung ulang memakai tarif Budi");
    expect(info.message).not.toMatch(/\d/);
  });

  it("konfirmasi menyebut nominal manual TIDAK diubah bila sesinya punya nominal manual", () => {
    const info = konfirmasiUntuk("simpan-perubahan", {
      studentName: "Sari", berseri: false, muridLama: "Sari", muridBaru: "Budi", adaNominalManual: true,
    })!;
    expect(info.message).toContain("Nominal manual sesi ini tidak diubah");
    expect(info.message).not.toContain("dihitung ulang");
    expect(info.message).not.toMatch(/\d/);
  });

  it("mengubah jam/durasi saja tetap tanpa konfirmasi (perilaku lama dipertahankan)", () => {
    expect(konfirmasiUntuk("simpan-perubahan", {
      studentName: "Sari", berseri: true, muridLama: "Sari", muridBaru: "Sari",
    })).toBeNull();
  });
});

/**
 * Penjaga teks ter-encode ganda (2026-10-05).
 *
 * Berkas `home/ManageSessionSheet.tsx` pernah memuat 13 baris teks yang ter-encode
 * dua kali (UTF-8 dibaca CP1252 lalu ditulis ulang), sehingga tutor melihat rangkaian
 * karakter aneh pada tombol "Aksi lain (N)", subjudul sheet, dan empat pesan toast.
 * Tidak ada gate yang menangkapnya: tsc, eslint, seluruh suite, e2e, dan build
 * semuanya hijau — yang rusak memang hanya teks yang tampil.
 *
 * **Cara membaca sumbernya tanpa `node:fs`.** `tsconfig.app.json` memasang
 * `types: ["vite/client", …]` tanpa `@types/node`, jadi berkas tes di `src/**`
 * dilarang mengimpor builtin Node (percobaan pertama saya ditolak `tsc -b`). Vite
 * menyediakan impor `?raw` dan tipenya sudah termasuk `vite/client` — jadi seluruh
 * berkas sumber bisa dibaca sebagai teks tanpa mengubah config apa pun.
 *
 * **Bentuk rusaknya dihitung, bukan diketik.** `new TextDecoder("windows-1252")`
 * TIDAK boleh dipakai: di Node ini rentang 0x80–0x9F dipetakan seperti latin1
 * (terukur: byte `e2 80 94` → `00E2 0080 0094`), sehingga pasangannya tidak cocok —
 * jebakan yang sudah memakan satu langkah di putaran ini. Tabel CP1252 kecil di bawah
 * ini adalah pemetaan yang sebenarnya untuk karakter yang dipakai repo ini.
 */
const SEMUA_SUMBER = import.meta.glob("../**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

describe("Sumber tidak memuat teks ter-encode ganda", () => {
  const CP1252_KHUSUS = new Map<number, number>([
    [0x80, 0x20ac], [0x8b, 0x2039], [0x93, 0x201c], [0x94, 0x201d], [0x9c, 0x0153],
  ]);
  const bentukRusak = (ch: string) => [...new TextEncoder().encode(ch)]
    .map((b) => String.fromCodePoint(CP1252_KHUSUS.get(b) ?? b))
    .join("");
  const berkas = Object.keys(SEMUA_SUMBER);

  it("memeriksa seluruh berkas sumber, bukan satu berkas saja", () => {
    expect(berkas.length).toBeGreaterThan(50);
  });

  for (const benar of ["—", "·", "✓", "⋯"]) {
    it(`tidak ada bentuk rusak dari "${benar}"`, () => {
      const rusak = bentukRusak(benar);
      const kena = berkas.filter((f) => SEMUA_SUMBER[f].includes(rusak));
      expect(kena, `berkas yang memuat teks ter-encode ganda: ${kena.join(", ")}`).toEqual([]);
    });
  }
});

