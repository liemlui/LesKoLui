import { useCallback, useRef, useState } from "react";
import type { ImportProgressStep } from "../../lib/backup";
import { recoveryBusyState, type RecoveryAction, type RecoveryBusyState } from "../../lib/recoveryPresentation";

/**
 * Kondisi jalur backup & pemulihan di layar Pengaturan — G3-09 butir 5 dan 7.
 *
 * Dua hal yang diperbaiki modul ini terhadap keadaan sebelum G3-09:
 *
 * 1. **Satu keadaan sibuk untuk semua jalur.** Sebelumnya tiap tombol punya
 *    `busy`-nya sendiri, sehingga tutor bisa menekan tombol kedua sementara yang
 *    pertama masih menulis ke tabel yang sama. Sekarang satu jalur berjalan
 *    berarti tombol lain nonaktif, dan tahapnya terlihat di layar.
 * 2. **Tidak ada lagi dialog bawaan peramban di jalur ini.** Dua pemakaian
 *    `confirm()` untuk peringatan validasi impor diganti permintaan yang
 *    dikembalikan sebagai keadaan: komponen menampilkannya sebagai dialog
 *    internal, lalu memanggil {@link JembatanDialog.jawab} dengan keputusan
 *    tutor. Karena `onValidationWarnings` milik `importBackup` menunggu nilai
 *    balik, impor **benar-benar tertahan** sampai tutor memutuskan — bukan
 *    lanjut dengan asumsi.
 */
export interface JembatanDialog {
  /** `true` = tutor memilih melanjutkan. */
  jawab: (lanjut: boolean) => void;
}

export interface JalurPemulihan {
  /** Keadaan sibuk bersama; dipakai semua tombol lewat `recoveryButtonEnabled`. */
  busy: RecoveryBusyState;
  mulai: (jalur: RecoveryAction) => void;
  tahap: (tahap: ImportProgressStep) => void;
  selesai: () => void;
  /** Verifikasi berkas Drive punya keadaan sibuknya sendiri (tidak menulis). */
  verifying: boolean;
  setVerifying: (v: boolean) => void;
  /** Peringatan validasi yang menunggu keputusan tutor; `null` = tidak ada. */
  peringatan: string[] | null;
  jembatanPeringatan: JembatanDialog;
  /** Handler untuk `importBackup({ onValidationWarnings })`. */
  tanyaPeringatan: (warnings: Array<{ table: string; rowId: string | number; field: string; message: string }>) => Promise<boolean>;
}

export function useJalurPemulihan(): JalurPemulihan {
  const [running, setRunning] = useState<RecoveryAction | null>(null);
  const [tahapKini, setTahapKini] = useState<ImportProgressStep | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [peringatan, setPeringatan] = useState<string[] | null>(null);
  const penunggu = useRef<((lanjut: boolean) => void) | null>(null);

  const mulai = useCallback((jalur: RecoveryAction) => { setRunning(jalur); setTahapKini(null); }, []);
  const tahap = useCallback((t: ImportProgressStep) => setTahapKini(t), []);
  const selesai = useCallback(() => { setRunning(null); setTahapKini(null); }, []);

  const tanyaPeringatan = useCallback((warnings: Array<{ table: string; rowId: string | number; field: string; message: string }>) => {
    setPeringatan(warnings.map((w) => `${w.table}.${w.rowId}.${w.field}: ${w.message}`));
    return new Promise<boolean>((resolve) => { penunggu.current = resolve; });
  }, []);

  const jawab = useCallback((lanjut: boolean) => {
    setPeringatan(null);
    const r = penunggu.current;
    penunggu.current = null;
    r?.(lanjut);
  }, []);

  return {
    busy: recoveryBusyState(running, tahapKini),
    mulai, tahap, selesai,
    verifying, setVerifying,
    peringatan,
    jembatanPeringatan: { jawab },
    tanyaPeringatan,
  };
}
