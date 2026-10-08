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
import { useCallback, useRef, useState } from "react";
import { AiCostModal } from "../components/AiCostModal";
import { catatPanggilanAi, type AiFeature } from "./aiUsage";

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
}

export function useAiAction(): UseAiActionResult {
  const [permintaan, setPermintaan] = useState<AiActionRequest | null>(null);
  const [sibuk, setSibuk] = useState(false);
  // Ref, bukan state: nilainya dibaca di dalam callback tanpa memicu render dan
  // tanpa efek samping di dalam pembaruan state.
  const sedangJalan = useRef(false);

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
      extraContent={permintaan.extraContent}
      onConfirm={() => void konfirmasi()}
      onCancel={batal}
    />
  ) : null;

  return { jalankan, sibuk, modal };
}
