/**
 * Penjaga panel desain laporan dan glosarium antarmuka (G3-08).
 *
 * **Kenapa penjaga ini ada, padahal `ATURAN-AI.md` §1 butir 4 melarang menambah
 * penjaga tanpa alasan.** Alasannya bukan kerapian, melainkan dua syarat selesai
 * yang tidak bisa dibuktikan tipe maupun suite yang sudah ada:
 *
 * 1. **Jumlah susunan dan tema tidak boleh berkurang** (butir G3-08 menyebut
 *    angka 26 susunan dan 34 tema). Angka itu bisa berkurang karena satu baris
 *    yang terhapus tanpa ada satu pun tes yang gagal — dan kekurangan pilihan
 *    baru ketahuan setelah tutor kehilangan susunan favoritnya.
 * 2. **Tidak ada istilah Inggris tersisa di panel desain**, dan glosarium
 *    antarmuka tetap satu istilah untuk satu konsep. Regresi ini sudah terjadi
 *    berkali-kali: `invoice`/`tagihan` dan `piutang`/`belum dibayar` pernah
 *    dipakai bergantian di layar yang sama (lihat `RIWAYAT-RILIS`).
 *
 * Cara kerjanya sama dengan `nativeDialogs.test.ts` dan `studentTabLabels.test.ts`:
 * membaca **berkas sumber** sebagai teks, bukan DOM — repo ini tidak memasang
 * jsdom. Yang diperiksa karena itu hanya hal yang bisa dibuktikan dari teks:
 * jumlah susunan/tema dari sumbernya, pengelompokan, dan istilah yang terlarang.
 */

import { describe, expect, it } from "vitest";
import { LAYOUTS } from "../template/layouts";
import { THEMES } from "../template/themes";
import {
  kelompokkanSusunan,
  jumlahSusunanTerkelompok,
  type KelompokSusunan,
} from "../screens/monthlyReport/susunanLaporan";
import { formatRupiahRingkas, jarakKiriGrafik } from "../components/charts/grafikAngka";
import builderSrc from "../screens/monthlyReport/CustomThemeBuilder.tsx?raw";
import toolbarSrc from "../screens/monthlyReport/DesignToolbar.tsx?raw";
import ringkasanSrc from "../screens/payments/RingkasanTab.tsx?raw";

/** Jumlah yang diminta butir G3-08. Bukan target baru: ini lantai, bukan langit-langit. */
const MIN_SUSUNAN = 26;
const MIN_TEMA = 34;

function cariKelompok(groups: readonly KelompokSusunan[], key: string): KelompokSusunan {
  const found = groups.find((g) => g.key === key);
  if (!found) throw new Error(`kelompok ${key} tidak ditemukan`);
  return found;
}

describe("jumlah susunan dan tema tidak berkurang (G3-08)", () => {
  it("susunan laporan paling sedikit dua puluh enam", () => {
    expect(LAYOUTS.length).toBeGreaterThanOrEqual(MIN_SUSUNAN);
  });

  it("tema bawaan paling sedikit tiga puluh empat", () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(MIN_TEMA);
  });

  it("setiap susunan muncul tepat satu kali di seluruh kelompok", () => {
    const groups = kelompokkanSusunan(LAYOUTS);
    expect(jumlahSusunanTerkelompok(groups)).toBe(LAYOUTS.length);

    const ids = groups.flatMap((g) => g.susunan.map((l) => l.id));
    expect(new Set(ids).size).toBe(LAYOUTS.length);
  });

  it("pengelompokan tidak pernah kosong dan tidak mengubah daftar pilihan", () => {
    const groups = kelompokkanSusunan(LAYOUTS);
    for (const group of groups) {
      expect(group.judul.length, group.key).toBeGreaterThan(0);
      expect(group.keterangan.length, group.key).toBeGreaterThan(0);
    }
    // Setiap susunan yang ditawarkan harus tetap bisa ditemukan lewat salah satu kelompok.
    const semuaId = new Set(groups.flatMap((g) => g.susunan.map((l) => l.id)));
    for (const layout of LAYOUTS) {
      expect(semuaId.has(layout.id), layout.id).toBe(true);
    }
  });

  it("kelompok narasi panjang hanya memuat susunan yang memang mendukung narasi panjang", () => {
    const panjang = cariKelompok(kelompokkanSusunan(LAYOUTS), "narasi-panjang");
    for (const layout of panjang.susunan) {
      expect(layout.supportsLongNarrative, layout.id).toBe(true);
    }
  });
});

describe("istilah di panel desain sudah Indonesia (G3-08 langkah 1)", () => {
  /** Istilah Inggris yang dilarang muncul sebagai TEKS ANTARMUKA di panel desain. */
  const TERLARANG = [
    "Custom Theme Builder", "Header Style", "Label Style", "Photo Style", "Decoration",
    "Display Font", "Body Font", "Header Text", "Background", "Nama Tema", "Palette (4 warna)",
    "Preview ·", "Cover", "Undo", "Layout",
  ];

  it("tidak ada istilah Inggris yang tersisa sebagai teks yang dibaca tutor", () => {
    for (const istilah of TERLARANG) {
      expect(builderSrc, `CustomThemeBuilder masih memuat "${istilah}"`).not.toContain(istilah);
    }
  });

  it("label pilihan bentuk memakai kata Indonesia dan tetap menyebut kunci aslinya", () => {
    // Kunci penyimpanan tidak boleh diubah: tema kustom lama harus tetap terbaca.
    for (const kunci of ["\"bubble\"", "\"script\"", "\"polaroid\"", "\"duotone\"", "\"ribbon-label\"", "\"watercolor\""]) {
      expect(builderSrc, `kunci ${kunci} hilang dari perancang tema`).toContain(kunci);
    }
    // Tulisan Indonesianya harus ada.
    for (const kata of ["Balon", "Tulisan sambung", "Polaroid", "Warna ganda", "Pita", "Cat air"]) {
      expect(builderSrc, `label "${kata}" hilang`).toContain(kata);
    }
  });

  it("setiap opsi bentuk punya contoh warna, bukan hanya nama", () => {
    // Satu opsi bentuk = satu baris berurutan `id: "…", nama: "…", singkat: "…", warna: "#…"`.
    // Daftar font sengaja tidak memakai bentuk ini karena warna huruf bukan pilihan tutor.
    const polaOpsi = /\{ id: "[^"]+",\s*nama: "[^"]+",\s*singkat: "[^"]+",\s*warna: "#[0-9a-f]{6}" \}/g;
    const jumlahOpsi = (builderSrc.match(polaOpsi) ?? []).length;
    expect(jumlahOpsi).toBeGreaterThanOrEqual(30); // 7 judul + 6 label + 7 foto + 13 hiasan
  });
});

describe("chip Tema dan chip Susunan dipisah (G3-08 langkah 2)", () => {
  it("tiap chip menyebut namanya sendiri dan punya panelnya sendiri", () => {
    expect(toolbarSrc).toContain("Tema");
    expect(toolbarSrc).toContain("Susunan");
    expect(toolbarSrc).toContain("panel-tema-laporan");
    expect(toolbarSrc).toContain("panel-susunan-laporan");
  });

  it("ikon kedua chip berbeda", () => {
    expect(toolbarSrc).toContain("SparkleIcon");
    expect(toolbarSrc).toContain("ChecklistIcon");
  });

  it("hanya ada SATU tombol pratinjau susunan, bukan satu per susunan", () => {
    // Dua puluh enam tombol pratinjau kecil diganti satu tombol untuk susunan terpilih.
    // Frasa "Pratinjau susunan" juga muncul di ariaLabel modal — yang dihitung adalah
    // teks tombolnya, dan tombol itu harus tepat satu.
    const jumlahTombol = (toolbarSrc.match(/>\s*Pratinjau susunan/g) ?? []).length;
    expect(jumlahTombol).toBe(1);
    expect(toolbarSrc).not.toContain("onPreviewLayout");
  });
});

describe("angka grafik ringkas tetapi nilai penuh tetap ada (G3-08 langkah 4)", () => {
  it("ratusan ribu dan jutaan dipendekkan, nilainya tidak hilang", () => {
    expect(formatRupiahRingkas(150_000)).toBe("Rp 150 rb");
    expect(formatRupiahRingkas(1_200_000)).toBe("Rp 1,2 jt");
    expect(formatRupiahRingkas(2_000_000)).toBe("Rp 2 jt");
    expect(formatRupiahRingkas(950)).toContain("950");
    // Ribuan dibulatkan ke ribuan penuh supaya label sumbu tetap pendek; nilai
    // penuhnya ada di keterangan (`formatIdrNumber`).
    expect(formatRupiahRingkas(889_700)).toBe("Rp 890 rb");
  });

  it("nilai yang bukan angka tidak pernah mencetak NaN di sumbu", () => {
    expect(formatRupiahRingkas(Number.NaN)).toBe("—");
    expect(formatRupiahRingkas(Number.POSITIVE_INFINITY)).toBe("—");
  });

  it("jarak kiri mengikuti label terpanjang, bukan angka tetap", () => {
    const pendek = jarakKiriGrafik(["0", "9"]);
    const panjang = jarakKiriGrafik(["Rp 1,2 jt", "Rp 900 rb"]);
    expect(panjang).toBeGreaterThan(pendek);
    expect(pendek).toBeGreaterThanOrEqual(28);
  });

  it("layar Keuangan memakai angka ringkas di sumbu dan nilai penuh di keterangan", () => {
    expect(ringkasanSrc).toContain("formatValue={formatRupiahRingkas}");
    expect(ringkasanSrc).toContain("formatTooltip={formatIdrNumber}");
    expect(ringkasanSrc).toContain("formatY={formatRupiahRingkas}");
  });

  it("legenda grafik donat diaktifkan di layar Keuangan", () => {
    expect(ringkasanSrc).toContain("showLegend");
    expect(ringkasanSrc).not.toContain("showLegend={false}");
  });
});
