import { useEffect, useState } from "react";

/**
 * URL sementara untuk sebuah Blob, dilepas kembali saat Blob berganti atau
 * komponen dibongkar.
 *
 * Kenapa dipisah menjadi hook: sejak G3-07 (foto murid) ada lebih dari satu
 * tempat yang menampilkan Blob tersimpan — avatar di daftar murid, avatar di
 * kepala halaman detail, dan pratinjau di formulir murid. Pola
 * `createObjectURL` yang ditulis ulang di tiga tempat adalah cara paling mudah
 * melupakan `revokeObjectURL`, dan URL yang tidak dilepas menahan Blob di
 * memori selama halaman hidup.
 *
 * Kontrak: hook ini HANYA mengembalikan URL yang masih hidup. Kalau `blob`
 * kosong/undefined, hasilnya `undefined`; kalau `createObjectURL` tidak
 * tersedia (lingkungan uji tanpa DOM), hasilnya juga `undefined` supaya
 * pemanggil jatuh ke tampilan cadangan, bukan melempar galat.
 */
export function useBlobUrl(blob?: Blob): string | undefined {
  const [url, setUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);

  return url;
}
