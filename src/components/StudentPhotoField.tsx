import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { compressPhoto } from "../lib/foto";
import { PHOTO_MAX_PX } from "../db/types";
import StudentAvatar from "./StudentAvatar";

interface Props {
  /** Foto yang sedang dipilih/dipertahankan. `undefined` = tidak ada foto. */
  photo?: Blob;
  /** Dipanggil dengan Blob hasil pengecilan, atau `undefined` saat dihapus. */
  onChange: (photo?: Blob) => void;
  /** Nama murid untuk teks alternatif pratinjau. */
  name?: string;
  /**
   * Id murid, dipakai sebagai kunci warna avatar. Sengaja `undefined` saat
   * menambah murid baru: warna avatar diturunkan dari id yang belum ada, dan
   * menebak warnanya dari nama akan menghasilkan pratinjau yang berbeda dari
   * warna yang benar-benar muncul sesudah murid disimpan.
   */
  id?: string;
}

/** Batas berkas mentah yang diterima. Sama dengan jalur foto sesi. */
const RAW_MAX_MB = 50;

/**
 * Kolom pemilih foto murid di formulir murid (G3-07).
 *
 * Aturan yang dipegang di sini:
 *  - Berkas apa pun yang bukan gambar ditolak SEBELUM dibaca, dengan alasan
 *    yang terlihat. Batas 50 MB mengikuti jalur foto sesi yang sudah ada.
 *  - Foto dikecilkan lewat `compressPhoto()` yang sudah dipakai foto sesi dan
 *    logo, jadi batas 640 px dan sasaran 150 KB hanya punya satu definisi di
 *    seluruh aplikasi.
 *  - Menghapus foto TIDAK langsung menyentuh penyimpanan: pratinjau menjadi
 *    kosong dan foto baru benar-benar hilang saat Simpan ditekan. Keputusan
 *    pemilik 2026-10-11 — supaya tombol Batal pada formulir tetap berarti
 *    "tidak ada yang berubah", sama seperti kolom lain.
 *  - Konfirmasi hapus memakai tombol internal di dalam formulir, bukan
 *    `confirm()` bawaan peramban (`ATURAN-AI.md` §4.1).
 */
export default function StudentPhotoField({ photo, onChange, name, id }: Props) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Input dikosongkan lebih dulu supaya memilih berkas yang sama dua kali
    // tetap memicu `change`.
    e.target.value = "";
    if (!file.type.startsWith("image/")) {
      setError("Berkas harus berupa gambar (JPG, PNG, atau WebP).");
      return;
    }
    if (file.size > RAW_MAX_MB * 1024 * 1024) {
      setError(`Foto terlalu besar (maksimal ${RAW_MAX_MB} MB sebelum dikecilkan).`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const compressed = await compressPhoto(file);
      onChange(compressed);
      setConfirmDelete(false);
    } catch {
      setError("Foto tidak dapat diproses. Coba pilih berkas lain.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[var(--surface)] rounded-xl p-3 space-y-3">
      <p className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wide">Foto Murid</p>

      <div className="flex items-center gap-3">
        <StudentAvatar name={name ?? "Murid"} seed={id ?? ""} photo={photo} size={64} />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              {busy ? "Memproses…" : photo ? "Ganti foto" : "Pilih foto"}
            </button>

            {photo && !confirmDelete && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
                className="text-sm font-semibold text-[var(--ink-danger)] px-3 min-h-[44px] rounded-lg hover:bg-[var(--bg-danger)] disabled:opacity-50"
              >
                Hapus foto
              </button>
            )}
          </div>

          {confirmDelete && (
            <div className="rounded-lg border border-[var(--border-danger)] bg-[var(--bg-danger)] p-2 space-y-2">
              <p className="text-xs text-[var(--ink-danger)]">
                Hapus foto murid ini? Foto baru benar-benar hilang setelah tombol Simpan ditekan.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { onChange(undefined); setConfirmDelete(false); setError(""); }}
                  className="text-xs font-semibold rounded-lg px-3 py-2 bg-[var(--surface-strong)] text-[var(--ink-danger)] border border-[var(--border-danger)]"
                >
                  Ya, hapus foto
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs font-semibold rounded-lg px-3 py-2 text-[var(--ink-muted)]"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Input berkas memang harus ada di DOM untuk membuka pemilih berkas,
              tetapi ia TIDAK boleh ikut urutan fokus papan ketik: tombol "Pilih
              foto" di atas sudah menjadi satu-satunya jalan masuknya. `sr-only`
              saja membuat kontrol tak terlihat ini tetap bisa difokus. */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={handlePick}
          />

          <p className="text-xs leading-relaxed text-[var(--ink-muted)]">
            Opsional. Foto dikecilkan otomatis ke paling besar {PHOTO_MAX_PX} piksel pada sisi
            terpanjang — hasil ukurannya biasanya di bawah 150 KB, dan foto dari kamera 12 MP
            terukur turun ke sekitar 100 KB. Foto disimpan di perangkat ini dan{" "}
            <strong>ikut masuk berkas backup</strong>. Foto murid tidak dipakai di laporan PDF —
            laporan hanya memuat foto sesi.
          </p>

          {error && (
            <p role="alert" className="text-xs font-medium text-[var(--ink-danger)]">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
