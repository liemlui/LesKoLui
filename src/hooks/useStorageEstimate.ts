import { useEffect, useState } from "react";

/**
 * Pemakaian penyimpanan perangkat dari `navigator.storage.estimate()`.
 *
 * Berupa hook karena nilainya dipakai **dua** tempat di layar Pengaturan —
 * `StorageUsage.tsx` (bilah penuh) dan ringkasan status tiga baris (G3-09 butir
 * 3). Sebelumnya hanya `StorageUsage` yang membacanya, dan ringkasannya harus
 * menebak.
 *
 * `tersedia: false` berarti peramban tidak bisa memberi perkiraan (API-nya tidak
 * ada atau menolak). Itu **bukan** 0%: menampilkan 0% akan membuat tutor mengira
 * penyimpanannya kosong, jadi keadaan ini punya kalimatnya sendiri.
 */
export interface StorageReading {
  used: number | null;
  quota: number | null;
  /** Perkiraan sudah dibaca (berhasil atau gagal). */
  selesai: boolean;
  /** Peramban bisa memberi perkiraan. */
  tersedia: boolean;
}

export function useStorageEstimate(): StorageReading {
  const [reading, setReading] = useState<StorageReading>({ used: null, quota: null, selesai: false, tersedia: false });

  useEffect(() => {
    let hidup = true;
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
      setReading({ used: null, quota: null, selesai: true, tersedia: false });
      return;
    }
    navigator.storage.estimate()
      .then((e) => {
        if (!hidup) return;
        const used = e.usage ?? null;
        const quota = e.quota ?? null;
        setReading({ used, quota, selesai: true, tersedia: used !== null && quota !== null });
      })
      .catch(() => {
        if (hidup) setReading({ used: null, quota: null, selesai: true, tersedia: false });
      });
    return () => { hidup = false; };
  }, []);

  return reading;
}
