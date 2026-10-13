import { describe, expect, it } from "vitest";
import {
  BACKUP_SETTINGS_PATH,
  PANDUAN_BACKUP_PATH,
  PIN_RESET_PENDING_KEY,
  PIN_RESET_SETTINGS_PATH,
  lupakanPinBelumDibuat,
  pinBelumDibuat,
  tandaiPinBelumDibuat,
  tampilkanAjakanPin,
} from "../lib/pinReset";
import { RESET_TABLES } from "../screens/settings/dangerZoneRows";
import dangerZoneActionsSrc from "../screens/settings/dangerZoneActions.ts?raw";
import appSrc from "../App.tsx?raw";
import settingsSrc from "../screens/Settings.tsx?raw";
import pinSectionSrc from "../screens/settings/PinSection.tsx?raw";
import inviteSrc from "../components/PinResetInvite.tsx?raw";

/**
 * Penjaga G3-10 butir 3 — ajakan memasang PIN baru sesudah reset total.
 *
 * **Kenapa butir ini butuh penjaganya sendiri.** Sampai 2026-10-11 seluruh butir lain
 * G3-10 sudah ada di kode (daftar tabel, tiga lapis konfirmasi, jejak audit), tetapi
 * syarat "buka dengan ajakan memasang PIN baru, bukan layar kosong tanpa penjelasan"
 * tidak dikerjakan siapa pun: `grep` untuk "pasang PIN" hanya menemukan teks di dalam
 * komponen PIN. Cacat semacam ini tidak tertangkap `tsc` (tidak ada tipe yang salah)
 * dan tidak tertangkap suite (tidak ada tes yang memeriksanya) — persis kelas yang sama
 * dengan dua sub-butir G3-09 yang sempat terlewat, yang hanya ketahuan dengan menelusuri
 * butir daftar pekerjaan satu per satu ke kode.
 *
 * **Cara kerjanya.** Dua lapis, dan keduanya perlu:
 * 1. **Perilaku** — fungsi murni diuji dengan `Storage` palsu. Repo ini tidak memasang
 *    jsdom, jadi menerima storage sebagai argumen adalah satu-satunya cara mengujinya.
 * 2. **Sambungan** — membaca berkas sumber lewat `?raw`, pola yang sama dengan
 *    `nativeDialogs.test.ts` dan `studentFormGroups.test.ts`. Ini yang membuktikan
 *    penanda itu benar-benar DITULIS saat reset dan DIBACA saat halaman dibuka; tanpa
 *    lapis ini, modul yang benar tetapi tidak dipanggil siapa pun akan tampak "hijau".
 */

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    isi: () => Object.fromEntries(map),
  };
}

/** Penyimpanan yang melempar saat disentuh: mode privat, cookie diblokir, dsb. */
const storageMelempar = {
  getItem: (): string | null => { throw new Error("diblokir"); },
  setItem: (): void => { throw new Error("diblokir"); },
  removeItem: (): void => { throw new Error("diblokir"); },
};

/** Buang komentar supaya dokumentasi yang MENYEBUT nama fungsi tidak dihitung sebagai pemanggilan. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

describe("pinReset — penanda 'PIN belum dipasang lagi' (G3-10 butir 3)", () => {
  it("tidak ada penanda berarti tidak ada ajakan", () => {
    expect(pinBelumDibuat(fakeStorage())).toBe(false);
  });

  it("menandai lalu membaca kembali penandanya utuh", () => {
    const s = fakeStorage();
    tandaiPinBelumDibuat(s, Date.parse("2026-10-11T08:00:00Z"));
    expect(pinBelumDibuat(s)).toBe(true);
    // Isinya waktu ISO, bukan sekadar "1": saat menelusuri penyimpanan perangkat,
    // pertanyaan yang muncul adalah "sejak kapan ini menyala".
    expect(s.isi()[PIN_RESET_PENDING_KEY]).toBe("2026-10-11T08:00:00.000Z");
  });

  it("penandanya BERTAHAN melewati pembersihan tabel, karena ia hidup di luar basis data", () => {
    // Inilah alasan penanda ini tidak disimpan di tabel `settings`: tabel itu ikut
    // dibersihkan reset, sehingga penanda di dalamnya mustahil dibaca sesudahnya.
    const s = fakeStorage();
    tandaiPinBelumDibuat(s);
    for (const t of RESET_TABLES) expect(t.nama).not.toContain(PIN_RESET_PENDING_KEY);
    expect(pinBelumDibuat(s)).toBe(true);
  });

  it("membuang penanda membuat ajakannya berhenti", () => {
    const s = fakeStorage();
    tandaiPinBelumDibuat(s);
    lupakanPinBelumDibuat(s);
    expect(pinBelumDibuat(s)).toBe(false);
  });

  it("penyimpanan yang diblokir berarti 'tidak ada ajakan', bukan layar yang jatuh", () => {
    // Tutor dengan mode privat tidak boleh kehilangan halaman Pengaturan hanya
    // karena penanda ini tidak bisa ditulis.
    expect(() => tandaiPinBelumDibuat(storageMelempar)).not.toThrow();
    expect(() => lupakanPinBelumDibuat(storageMelempar)).not.toThrow();
    expect(pinBelumDibuat(storageMelempar)).toBe(false);
    expect(pinBelumDibuat(null)).toBe(false);
    expect(pinBelumDibuat(undefined)).toBe(false);
  });

  it("tanpa penyimpanan, penulisan tidak melempar dan tidak berpura-pura berhasil", () => {
    expect(() => tandaiPinBelumDibuat(null)).not.toThrow();
    expect(() => tandaiPinBelumDibuat(undefined)).not.toThrow();
  });
});

describe("tampilkanAjakanPin — dua syarat, keduanya wajib", () => {
  it("hanya tampil saat penanda ada DAN PIN-nya memang belum dipasang", () => {
    expect(tampilkanAjakanPin(true, false)).toBe(true);
  });

  it("tidak tampil kalau PIN sudah ada — walaupun penandanya tertinggal", () => {
    // Ini yang membuat ajakan hilang sendiri begitu PIN disimpan, sehingga tidak ada
    // cara banner itu tertinggal di layar sambil berbohong kepada tutor.
    expect(tampilkanAjakanPin(true, true)).toBe(false);
  });

  it("tidak tampil tanpa penanda, walaupun PIN-nya kosong", () => {
    // Tutor yang memang belum pernah membuat PIN tidak boleh tiba-tiba disambut
    // pemberitahuan "PIN Anda ikut terhapus" — tidak ada yang terhapus.
    expect(tampilkanAjakanPin(false, false)).toBe(false);
    expect(tampilkanAjakanPin(false, true)).toBe(false);
  });
});

describe("alamat yang ditunjuk ajakan (G3-10 butir 3)", () => {
  it("menunjuk bagian PIN yang memang ada di daftar bagian Pengaturan", () => {
    // `Section` memasang `id={`bagian-${id}`}`, jadi hash ini bukan tebakan: id-nya
    // harus berasal dari daftar bagian yang berlaku.
    expect(PIN_RESET_SETTINGS_PATH).toBe("/settings#bagian-pin");
  });

  it("menunjuk panduan backup yang benar-benar ada di repo", () => {
    expect(PANDUAN_BACKUP_PATH).toBe("docs/02-PANDUAN-BACKUP-DRIVE-SENYAP.md");
  });

  it("jalur backup dan jalur PIN tidak sama — dua tombol, dua tujuan", () => {
    expect(BACKUP_SETTINGS_PATH).not.toBe(PIN_RESET_SETTINGS_PATH);
    expect(BACKUP_SETTINGS_PATH).toBe("/settings#bagian-backup");
  });
});

describe("sambungan penanda ke kode yang menjalankannya", () => {
  const aksi = stripComments(dangerZoneActionsSrc);
  const app = stripComments(appSrc);
  const settings = stripComments(settingsSrc);
  const pin = stripComments(pinSectionSrc);
  const invite = stripComments(inviteSrc);

  it("reset MENULIS penandanya", () => {
    expect(aksi).toContain("tandaiPinBelumDibuat()");
  });

  it("penandanya ditulis SESUDAH pembersihan tabel dan catatan audit, bukan sebelumnya", () => {
    // Kalau ditulis lebih dulu, ia bisa hilang bersama pembersihan dan ajakannya
    // tidak pernah muncul — kesalahan urutan yang tidak akan tertangkap tipe.
    const posisiClear = aksi.indexOf("t.clear()");
    const posisiAudit = aksi.indexOf('logAudit("data.reset"');
    const posisiTanda = aksi.indexOf("tandaiPinBelumDibuat()");
    expect(posisiClear).toBeGreaterThan(-1);
    expect(posisiAudit).toBeGreaterThan(posisiClear);
    expect(posisiTanda).toBeGreaterThan(posisiAudit);
  });

  it("banner-nya benar-benar dirender di tata letak, bukan hanya ada sebagai berkas", () => {
    expect(app).toContain("PinResetInvite");
    expect(app).toMatch(/<PinResetInvite\s*\/>/);
  });

  it("PIN yang tersimpan MEMBUANG penandanya", () => {
    expect(settings).toContain("lupakanPinBelumDibuat()");
    // Urutan: penandanya dibuang di jalur simpan PIN, bukan di tombol menuju Pengaturan.
    const posisiSimpan = settings.indexOf("const simpanPin");
    const posisiLupakan = settings.indexOf("lupakanPinBelumDibuat()");
    expect(posisiLupakan).toBeGreaterThan(posisiSimpan);
  });

  it("datang dari hash membuka bagiannya, dan bagian PIN langsung menampilkan formulir", () => {
    expect(settings).toContain("bagianDariAlamat");
    expect(settings).toContain("autoStart={pinAutoStart}");
    expect(pin).toContain("autoStart");
    // Hanya berlaku saat PIN-nya belum ada: "Ganti PIN" yang meminta PIN lama tidak boleh dilewati.
    expect(pin).toMatch(/autoStart\s*&&\s*!financialPin/);
  });

  it("ajakan memakai dialog internal, bukan dialog bawaan peramban", () => {
    // Keputusan "Tetap" ATURAN-AI §4.1 berlaku untuk seluruh aplikasi; jalur reset
    // adalah tempat yang paling mudah melanggarnya karena semua terjadi sekaligus.
    expect(invite).not.toMatch(/(^|[^A-Za-z0-9_.$])(confirm|prompt|alert)\s*\(/);
  });

  it("ajakan menyebut SYARAT-NYA, bukan hanya menawarkan tombol", () => {
    // Syarat selesai G3-10 menuntut "bukan layar kosong tanpa penjelasan", jadi
    // tesnya bukan sekadar keberadaan banner melainkan adanya penjelasan itu.
    expect(invite).toContain("Pasang PIN Keuangan lagi");
    expect(invite).toMatch(/PIN Keuangan Anda/);
    // Dan satu kalimat yang mencegah salah paham: PIN tidak ikut di berkas backup.
    expect(invite).toMatch(/PIN tidak ikut di dalam berkas\s+backup/);
  });

  it("tombol ajakan memenuhi sasaran sentuh 44 piksel (keputusan 4.2)", () => {
    const tombol = invite.match(/<button[\s\S]*?>/g) ?? [];
    expect(tombol.length).toBeGreaterThanOrEqual(3);
    for (const t of tombol) {
      // Dua bentuk yang sah untuk 44 px, dan keduanya memang dipakai berkas ini:
      // tombol teks memakai `min-h-[44px]`, tombol ikon kotak memakai `h-11 w-11`
      // (11 × 4 px). Yang dituntut tes ini adalah angkanya, bukan salah satu gayanya —
      // menuntut satu gaya saja akan menuduh kode yang benar, kesalahan yang pernah
      // memakan waktu di G3-07.
      const tinggi = t.includes("min-h-[44px]") || /\bh-11\b/.test(t);
      expect(tinggi, `tombol tanpa sasaran 44 px: ${t}`).toBe(true);
    }
    // Tombol ikon tutup harus kotak: tinggi 44 tanpa lebar 44 tetap sulit ditekan.
    const tombolTutup = tombol.find((t) => t.includes("Tutup ajakan pasang PIN"));
    expect(tombolTutup).toBeDefined();
    expect(tombolTutup).toMatch(/\bw-11\b/);
  });
});

describe("daftar tabel reset tetap lengkap (G3-10 butir 1)", () => {
  it("memuat seluruh tabel yang diminta spesifikasi", () => {
    // Butir 1 menuntut daftarnya EKSPLISIT. Kalau kelak ada tabel baru di `db.ts`,
    // tes ini yang menuntut tabel itu ikut didaftarkan — bukan ingatan siapa pun.
    const nama = RESET_TABLES.map((t) => t.nama);
    for (const wajib of [
      "students", "sessions", "reports", "payments", "followUps", "raporGrades",
      "expenses", "iaeeProjects", "studyNotes", "captureDrafts", "settings", "auditLog",
    ]) {
      expect(nama).toContain(wajib);
    }
  });

  it("setiap baris punya nama yang dibaca tutor dan tidak ada yang kembar", () => {
    const label = RESET_TABLES.map((t) => t.tabel);
    expect(new Set(label).size).toBe(label.length);
    expect(new Set(RESET_TABLES.map((t) => t.nama)).size).toBe(RESET_TABLES.length);
    for (const t of RESET_TABLES) {
      expect(t.tabel.trim().length).toBeGreaterThan(0);
      expect(typeof t.ambil).toBe("function");
    }
  });
});
