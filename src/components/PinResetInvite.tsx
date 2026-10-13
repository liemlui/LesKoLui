import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettingsQuery } from "../hooks/useSettingsQuery";
import { CloseIcon, KeyIcon } from "./icons";
import {
  BACKUP_SETTINGS_PATH,
  PANDUAN_BACKUP_PATH,
  PIN_RESET_SETTINGS_PATH,
  lupakanPinBelumDibuat,
  pinBelumDibuat,
  tampilkanAjakanPin,
} from "../lib/pinReset";

/**
 * Ajakan "pasang PIN Keuangan lagi" sesudah reset total — **G3-10 butir 3**.
 *
 * **Kenapa banner ini ada.** "Hapus Semua Data" membersihkan tabel `settings`, dan PIN
 * Keuangan hidup di tabel itu. Sesudah aplikasi dimuat ulang, yang tersisa adalah Beranda
 * kosong tanpa penjelasan apa pun: tutor melihat data hilang (itu memang yang ia minta)
 * tetapi tidak diberi tahu bahwa **PIN-nya juga hilang** dan harus dipasang lagi. Syarat
 * selesai G3-10 menuntut sebaliknya: *"muncul ajakan memasang PIN baru, bukan layar kosong
 * tanpa penjelasan, beserta tautan ke panduan backup"*.
 *
 * **Kenapa penandanya di `localStorage`, bukan di tabel.** Kalau penanda itu ikut dibersihkan
 * bersama tabelnya, ajakan ini tidak akan pernah muncul. Lihat `lib/pinReset.ts`.
 *
 * **Kenapa ia hilang sendiri.** Dua syarat di `tampilkanAjakanPin()`: penandanya ada **dan**
 * PIN-nya belum terpasang. Membaca `settings` lewat `useLiveQuery` (`useSettingsQuery`) berarti
 * begitu PIN disimpan, banner ini hilang tanpa perlu satu baris kode tambahan — dan tidak ada
 * cara banner itu tertinggal di layar sambil berbohong.
 *
 * **Ditaruh di `Layout`, bukan di Beranda.** Reset bisa berakhir di rute mana pun (yang terakhir
 * dibuka), dan tulisan "bukan layar kosong tanpa penjelasan" harus berlaku di semua rute itu.
 * Sekaligus ia menjadi alasan tiap rute punya jalan menuju Panduan backup.
 *
 * **Isi ajakannya sengaja TIDAK menyebut "data Anda hilang".** Yang menghapus data adalah tutor
 * sendiri, beberapa detik sebelumnya, lewat tiga lapis konfirmasi. Yang perlu diberitahukan
 * adalah hal yang **tidak** ia lihat akibatkan: PIN-nya ikut terhapus.
 */
export default function PinResetInvite() {
  const navigate = useNavigate();
  const { settings } = useSettingsQuery();
  /** Penanda dibaca sekali per pemasangan; sesudah ditutup, bannernya hilang tanpa reload. */
  const [penandaAda, setPenandaAda] = useState(() => pinBelumDibuat());

  /**
   * `settings` undefined = belum terbaca. Dalam keadaan itu banner **tidak** ditampilkan:
   * menampilkannya berarti menebak bahwa PIN-nya tidak ada, dan menebak salah di sini akan
   * memberi tutor ajakan yang keliru.
   */
  if (!penandaAda || settings === undefined) return null;
  if (!tampilkanAjakanPin(penandaAda, Boolean(settings.financialPin))) return null;

  const bukaPin = () => {
    // Penanda sengaja TIDAK dibuang di sini: kalau tutor menutup Pengaturan tanpa menyimpan PIN,
    // ajakannya harus muncul lagi. Yang membuangnya adalah penyimpanan PIN yang berhasil.
    navigate(PIN_RESET_SETTINGS_PATH);
  };
  const bukaBackup = () => navigate(BACKUP_SETTINGS_PATH);
  const tutup = () => {
    lupakanPinBelumDibuat();
    setPenandaAda(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-3 mt-3 flex items-start gap-2.5 rounded-2xl border border-[var(--border-warn)] bg-[var(--bg-warn)] px-3.5 py-3"
    >
      <span className="mt-0.5 shrink-0 text-[var(--ink-warn)]" aria-hidden="true">
        <KeyIcon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--ink-warn)]">Pasang PIN Keuangan lagi</p>
        <p className="mt-1 text-xs text-[var(--ink-warn)]">
          Semua data sudah dihapus, dan itu termasuk PIN Keuangan Anda. Aplikasi tetap bisa
          dipakai tanpa PIN, tetapi data keuangan tidak akan terkunci sampai PIN dipasang lagi.
        </p>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          Kalau Anda punya berkas backup, pulihkan lebih dulu — PIN tidak ikut di dalam berkas
          backup, jadi pemulihan tidak mengembalikannya. Langkahnya ada di{" "}
          <span className="font-medium">{PANDUAN_BACKUP_PATH}</span>.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={bukaPin}
            className="min-h-[44px] rounded-xl bg-[var(--bg-warn-strong)] px-3.5 text-sm font-bold text-[var(--on-strong)]"
          >
            Buat PIN sekarang
          </button>
          <button
            type="button"
            onClick={bukaBackup}
            className="min-h-[44px] rounded-xl bg-[var(--bg-subtle)] px-3.5 text-sm font-semibold text-[var(--ink-muted)]"
          >
            Buka backup
          </button>
        </div>
      </div>
      {/* Tutup = "sudah saya baca". Ditolak sekali, tidak ditawarkan lagi — sama polanya
          dengan pengingat backup, tetapi di sini tanpa masa tenggang: yang ditolak adalah
          pemberitahuan, bukan pengingat berkala. */}
      <button
        type="button"
        onClick={tutup}
        aria-label="Tutup ajakan pasang PIN"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--ink-warn)] transition-colors hover:bg-[var(--bg-warn-strong)]"
      >
        <CloseIcon size={16} />
      </button>
    </div>
  );
}
