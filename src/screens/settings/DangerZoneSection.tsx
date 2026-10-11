import { useState } from "react";
import { db } from "../../db/db";
import { logAudit } from "../../db/repos";
import Modal from "../../components/Modal";
import { Section } from "./Section";
import { TrashIcon } from "../../components/icons";
import { RESET_CONFIRM_WORD, confirmButtonEnabled } from "../../lib/recoveryPresentation";
import type { AuditAction } from "../../db/types";

/**
 * Bagian "Hapus Semua Data" di zona berbahaya Pengaturan.
 *
 * **G3-09 butir 7.** Sebelum ini jalur reset memakai DUA dialog bawaan peramban
 * sekaligus — `confirm("Yakin hapus SEMUA data?")` lalu
 * `prompt('Ketik "RESET" untuk konfirmasi:')`. Keduanya diganti dialog internal
 * dengan tiga lapis konfirmasi:
 *
 * 1. ringkasan apa yang akan hilang, dengan tombol lanjutkan;
 * 2. mengetik kalimat {@link RESET_CONFIRM_WORD} untuk mengaktifkan tombol;
 * 3. PIN Keuangan.
 *
 * Daftar tabel yang dibersihkan **eksplisit dan lengkap** (G3-10 butir 1 meminta
 * daftar yang sama disebutkan di antarmuka). Kalau kelak ada tabel baru di
 * `db.ts`, tabel itu harus ditambahkan di sini DAN di teks yang dibaca tutor —
 * itulah gunanya daftar ini hidup di satu tempat.
 */
export const RESET_TABLES = [
  { tabel: "murid", ambil: () => db.students },
  { tabel: "sesi", ambil: () => db.sessions },
  { tabel: "laporan", ambil: () => db.reports },
  { tabel: "tagihan", ambil: () => db.payments },
  { tabel: "tindak lanjut", ambil: () => db.followUps },
  { tabel: "nilai rapor", ambil: () => db.raporGrades },
  { tabel: "pengeluaran", ambil: () => db.expenses },
  { tabel: "proyek tugas panjang", ambil: () => db.iaeeProjects },
  { tabel: "catatan belajar", ambil: () => db.studyNotes },
  { tabel: "draf pencatatan sesi", ambil: () => db.captureDrafts },
  { tabel: "pengaturan (PIN, kunci AI, logo, rekening, profil)", ambil: () => db.settings },
  { tabel: "catatan audit", ambil: () => db.auditLog },
] as const;

type Lapis = "ringkasan" | "ketik";

export interface DangerZoneSectionProps {
  /** Membuka konfirmasi PIN; jalur reset diselesaikan induk setelah PIN benar. */
  onRequirePin: () => void;
}

export default function DangerZoneSection({ onRequirePin }: DangerZoneSectionProps) {
  const [lapis, setLapis] = useState<Lapis | null>(null);
  const [kata, setKata] = useState("");

  const tutup = () => { setLapis(null); setKata(""); };

  return (
    <Section id="bahaya" title="Hapus Semua Data" icon={<TrashIcon size={18} />}>
      <div className="pt-3 space-y-3">
        <p className="text-xs text-[var(--ink-danger)] font-semibold">
          Menghapus semua data murid, sesi, tagihan, laporan, dan pengeluaran.
        </p>
        <p className="text-xs text-[var(--ink-muted)]">
          Ikut terhapus juga: PIN Keuangan, pertanyaan keamanan, kunci API AI, logo, profil tutor,
          dan rekening bank — beserta catatan audit (kecuali satu jejak reset), draf Catat Sesi
          yang belum tersimpan, dan pengingat backup terakhir.
        </p>
        <p className="text-xs text-[var(--ink-muted)]">
          Yang tetap ada: berkas backup yang sudah Anda unduh (termasuk yang di Google Drive) dan
          kata sandi enkripsi backup yang mungkin tersimpan di browser ini.
        </p>

        <button
          type="button"
          onClick={() => { setKata(""); setLapis("ringkasan"); }}
          className="w-full min-h-[44px] py-3 rounded-xl bg-[var(--bg-danger-strong)] text-[var(--on-strong)] text-sm font-bold hover:bg-[var(--bg-danger-strong)] transition-colors">
          <TrashIcon size={13} className="mr-1 inline align-[-2px]" /> Hapus Semua Data
        </button>
      </div>

      {/* Lapis 1: ringkasan apa yang akan hilang. */}
      {lapis === "ringkasan" && (
        <Modal onClose={tutup} ariaLabel="Ringkasan penghapusan semua data">
          <h3 className="font-bold text-lg text-[var(--ink-strong)]">Hapus semua data?</h3>
          <p className="text-sm text-[var(--ink-muted)]">
            Tindakan ini permanen dan tidak bisa dibatalkan. Yang akan hilang:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-[var(--ink-strong)]">
            {RESET_TABLES.map((t) => (
              <li key={t.tabel}>{t.tabel}</li>
            ))}
          </ul>
          <p className="text-sm text-[var(--ink-muted)]">
            Catatan audit ikut dibersihkan, lalu satu jejak "Reset semua data" ditulis setelahnya
            supaya peristiwanya tetap tercatat.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={tutup}
              className="flex-1 min-h-[44px] py-3 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-muted)] font-semibold text-sm">
              Batal
            </button>
            <button type="button" onClick={() => setLapis("ketik")}
              className="flex-1 min-h-[44px] py-3 rounded-xl bg-[var(--bg-danger-strong)] text-[var(--on-strong)] font-semibold text-sm">
              Lanjutkan
            </button>
          </div>
        </Modal>
      )}

      {/* Lapis 2: mengetik kalimat konfirmasi. */}
      {lapis === "ketik" && (
        <Modal onClose={tutup} ariaLabel={`Ketik ${RESET_CONFIRM_WORD} untuk konfirmasi`}>
          <h3 className="font-bold text-lg text-[var(--ink-strong)]">Konfirmasi terakhir</h3>
          <p className="text-sm text-[var(--ink-muted)]">
            Ketik <b className="font-mono">{RESET_CONFIRM_WORD}</b> untuk mengaktifkan tombol. Setelah itu
            PIN Keuangan masih diminta sekali lagi.
          </p>
          <div>
            <label htmlFor="set-konfirmasi-hapus" className="label">Ketik di sini</label>
            <input id="set-konfirmasi-hapus" className="input font-mono" type="text" autoFocus autoComplete="off"
              placeholder={RESET_CONFIRM_WORD} value={kata} onChange={(e) => setKata(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={tutup}
              className="flex-1 min-h-[44px] py-3 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-muted)] font-semibold text-sm">
              Batal
            </button>
            <button type="button"
              disabled={!confirmButtonEnabled(kata, RESET_CONFIRM_WORD)}
              onClick={() => { tutup(); onRequirePin(); }}
              className="flex-1 min-h-[44px] py-3 rounded-xl bg-[var(--bg-danger-strong)] text-[var(--on-strong)] font-semibold text-sm disabled:opacity-40">
              Hapus data
            </button>
          </div>
        </Modal>
      )}
    </Section>
  );
}

/**
 * Jalankan penghapusan. Dipisah dari komponennya supaya urutannya bisa dibaca:
 * **bersihkan tabel dulu, catat audit SESUDAH** — `logAudit` menulis ke
 * `db.auditLog` yang ikut dibersihkan, jadi urutan sebaliknya akan menghapus
 * jejaknya sendiri.
 */
export async function jalankanResetSemuaData(): Promise<void> {
  const tabel = RESET_TABLES.map((t) => t.ambil());
  await db.transaction("rw", tabel, async () => {
    for (const t of tabel) await t.clear();
  });
  await logAudit("data.reset" as AuditAction, "data");
  // Pengingat backup terakhir ikut dibuang supaya pengingat muncul lagi setelah reset.
  try { localStorage.removeItem("leskolui_last_auto_backup_prompt"); } catch { /* penyimpanan tidak tersedia */ }
}
