/**
 * Satu jalur untuk setiap panggilan AI berbiaya (G3-04 langkah 2).
 *
 * **Kenapa harus satu jalur.** Sebelum ini setiap layar mengurus sendiri tiga
 * hal yang sama: menghitung perkiraan biaya, membuka modal konfirmasi, lalu
 * memanggil klien AI. Tiga tempat berarti tiga peluang untuk lupa salah satunya
 * — dan yang paling mahal kalau terlupa adalah modalnya: panggilan berbayar yang
 * berjalan tanpa tutor melihat harganya.
 *
 * Kontrak yang dipegang hook ini:
 *
 * 1. **Panggilan tidak pernah berjalan tanpa melewati modal.** `jalankan()` hanya
 *    membuka modal; yang benar-benar memanggil API adalah `konfirmasi()`.
 * 2. **Batal berarti nol panggilan.** Modal ditutup = tidak ada permintaan yang
 *    dikirim, bukan "dikirim lalu dibatalkan".
 * 3. **Angka di modal sama dengan angka yang dicatat.** Perkiraan dihitung
 *    **sekali** saat modal dibuka dan dipakai lagi saat mencatat, jadi keduanya
 *    tidak bisa berbeda.
 * 4. **Tidak bisa jalan dua kali bersamaan.** Selama satu panggilan berjalan,
 *    `jalankan()` menolak dan `sibuk` bernilai true — tombol di layar bisa
 *    memakainya untuk menonaktifkan diri.
 *
 * **Batas belanja bukan urusan hook ini.** Gerbang batas dipasang di layar, di
 * tempat tombol AI berada, karena keputusan pemilik B4 menuntut tombolnya
 * **nonaktif dengan alasan yang terlihat** — dan tombol itu milik layar, bukan
 * milik hook. Hook ini hanya mencatat biaya yang benar-benar terjadi.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AiCostModal } from "../components/AiCostModal";
import { catatPanggilanAi, pemakaianAiBulanIni, type AiFeature, type PemakaianAiBulan } from "./aiUsage";
import { getSettings } from "../db/repos";

export interface AiActionRequest {
  /** Judul modal, mis. "Draft Catatan dengan AI". */
  title: string;
  /** Fitur ini untuk pembukuan; juga dipakai sebagai label di riwayat audit. */
  fitur: AiFeature;
  /** Perkiraan biaya dalam rupiah. Dihitung pemanggil dengan estimator yang ada. */
  estimatedIDR: number;
  description?: string;
  /** Ringkasan data yang dikirim ke DeepSeek — ditampilkan di modal. */
  dataSent?: string;
  /** Rincian token & biaya USD, bila estimatornya menyediakannya. */
  tokenNote?: string;
  /** Isi tambahan di modal, mis. pemilih gaya penulisan. */
  extraContent?: React.ReactNode;
  /** Pekerjaan yang dijalankan setelah tutor menyetujui biayanya. */
  aksi: () => Promise<void>;
}

export interface UseAiActionResult {
  /** Buka modal biaya. Tidak memanggil API. */
  jalankan: (permintaan: AiActionRequest) => void;
  /** true selama satu panggilan sedang berjalan. */
  sibuk: boolean;
  /** Modal biaya siap dipasang di layar. `null` = tidak ada yang menunggu. */
  modal: React.ReactNode;
  /** Pemakaian bulan berjalan, atau null selagi dibaca. */
  pemakaian: PemakaianAiBulan | null;
  /**
   * Alasan tombol AI harus nonaktif, atau "" bila boleh dipakai.
   *
   * Keputusan pemilik B4: batas tidak dipasang secara default, tetapi kalau
   * diisi dan terlampaui, tombol AI nonaktif **dengan alasan yang terlihat**.
   * Karena itu alasannya dikembalikan sebagai teks, bukan sekadar boolean.
   */
  alasanNonaktif: string;
}

export function useAiAction(): UseAiActionResult {
  const [permintaan, setPermintaan] = useState<AiActionRequest | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [pemakaian, setPemakaian] = useState<PemakaianAiBulan | null>(null);
  const [batasIdr, setBatasIdr] = useState<number | undefined>(undefined);
  // Ref, bukan state: nilainya dibaca di dalam callback tanpa memicu render dan
  // tanpa efek samping di dalam pembaruan state.
  const sedangJalan = useRef(false);

  // Batas dibaca dari pengaturan; dibaca ulang saat halaman dibuka.
  useEffect(() => {
    let hidup = true;
    void getSettings().then((settings) => {
      if (hidup) setBatasIdr(settings?.ai?.monthlyBudgetIdr);
    });
    return () => { hidup = false; };
  }, []);

  // Pemakaian dihitung berkala: satu panggilan AI menambah biaya, dan gerbangnya
  // harus ikut naik tanpa menunggu halaman dimuat ulang.
  useEffect(() => {
    let hidup = true;
    const muat = () => {
      void pemakaianAiBulanIni(batasIdr).then((hasil) => { if (hidup) setPemakaian(hasil); });
    };
    muat();
    const id = window.setInterval(muat, 5000);
    return () => { hidup = false; window.clearInterval(id); };
  }, [batasIdr, sibuk]);

  const alasanNonaktif = pemakaian?.terlampaui
    ? `Batas belanja AI bulan ini (Rp ${pemakaian.batasIdr?.toLocaleString("id-ID")}) sudah terlampaui. `
      + "Naikkan atau kosongkan batasnya di Pengaturan → AI, atau tunggu bulan berikutnya."
    : "";

  const jalankan = useCallback((berikutnya: AiActionRequest) => {
    // Tolak selama masih ada yang berjalan: dua modal dalam satu layar membuat
    // tombolnya tidak bisa ditekan, dan dua panggilan bersamaan menggandakan
    // biaya untuk pekerjaan yang sama.
    if (sedangJalan.current) return;
    setPermintaan(berikutnya);
  }, []);

  const batal = useCallback(() => {
    // Batal = nol panggilan. Tidak ada permintaan yang dikirim ke klien AI.
    setPermintaan(null);
  }, []);

  const konfirmasi = useCallback(async () => {
    if (sedangJalan.current) return;
    const sedang = permintaan;
    if (!sedang) return;
    setPermintaan(null);
    sedangJalan.current = true;
    setSibuk(true);
    try {
      await sedang.aksi();
      // Dicatat SESUDAH berhasil: kalau dicatat lebih dulu, pemakaian naik
      // padahal panggilannya gagal.
      await catatPanggilanAi({
        fitur: sedang.fitur,
        biayaIdr: sedang.estimatedIDR,
        perkiraanIdr: sedang.estimatedIDR,
        keterangan: sedang.title,
      });
    } finally {
      sedangJalan.current = false;
      setSibuk(false);
    }
  }, [permintaan]);

  const modal = permintaan ? (
    <AiCostModal
      open
      title={permintaan.title}
      estimatedIDR={permintaan.estimatedIDR}
      description={permintaan.description}
      dataSent={permintaan.dataSent}
      tokenNote={permintaan.tokenNote}
      extraContent={permintaan.extraContent}
      busy={sibuk}
      onConfirm={() => void konfirmasi()}
      onCancel={batal}
    />
  ) : null;

  return { jalankan, sibuk, modal, pemakaian, alasanNonaktif };
}
