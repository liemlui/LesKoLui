import { colorForStudent } from "../lib/studentColor";
import { studentInitial } from "../lib/studentPhoto";
import { useBlobUrl } from "../hooks/useBlobUrl";

interface Props {
  /** Dipakai untuk warna cadangan dan teks alternatif gambar. */
  name: string;
  /** Kunci warna stabil per murid; biasanya id murid. */
  seed: string;
  /** Foto murid yang tersimpan sebagai Blob. Kosong = tampilkan inisial. */
  photo?: Blob;
  /** Sisi kotak avatar dalam piksel. Daftar murid memakai 44, detail 64. */
  size?: number;
  className?: string;
}

/**
 * Avatar bulat seorang murid: foto kalau ada, inisial berwarna kalau tidak.
 *
 * Dipakai bersama oleh daftar murid dan kepala halaman detail supaya kedua
 * layar tidak pernah menampilkan bentuk atau ukuran huruf yang berbeda untuk
 * data yang sama.
 *
 * Pemotongan bulat dilakukan lewat CSS (`object-cover` + `overflow-hidden`),
 * BUKAN dengan memotong data. Keputusan pemilik 2026-10-11: isi foto yang
 * tersimpan tetap utuh supaya berkas backup tidak kehilangan bagian gambar dan
 * supaya bentuk tampilan bisa diubah nanti tanpa menyentuh data.
 *
 * URL blob dibuat dan dilepas di `useBlobUrl` — gambar tidak boleh menahan
 * memori sesudah komponen ini dibongkar.
 */
export default function StudentAvatar({ name, seed, photo, size = 44, className = "" }: Props) {
  const url = useBlobUrl(photo);
  const initial = studentInitial(name);

  return (
    <div
      className={`rounded-full flex items-center justify-center overflow-hidden text-[var(--on-strong)] font-bold flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: colorForStudent(seed),
        fontSize: Math.round(size * 0.41),
      }}
    >
      {url ? (
        // `alt` sengaja nama murid: pembaca layar menyebut siapa yang fotonya ini,
        // bukan "gambar".
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
    </div>
  );
}
