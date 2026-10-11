import { useState } from "react";
import { MIN_PASS, generatePassphrase, passStrength } from "../../lib/passphrase";
import { recoveryButtonEnabled, recoveryTargetSummary } from "../../lib/recoveryPresentation";
import { downloadBlob } from "../../lib/download";
import { todayWIB } from "../../lib/format";
import { isDriveConfigured } from "./backupHandlers";
import { Section } from "./Section";
import StorageUsage from "./StorageUsage";
import PhotoMaintenance from "./PhotoMaintenance";
import ConfirmActionModal, { type ConfirmDialogState } from "./ConfirmActionModal";
import Toggle from "../../components/Toggle";
import {
  BackupIcon, ChartIcon, CloudIcon, DownloadIcon, RefreshIcon, SearchIcon, UploadIcon,
} from "../../components/icons";
import type { JalurPemulihan } from "./useBackupSection";
import type { BackupHandlers } from "./backupHandlers";
import type { Settings } from "../../db/types";

/**
 * Bagian "Backup dan Restore" — blok terbesar di layar Pengaturan.
 *
 * **Dua hal yang diperbaiki saat blok ini dipindah ke sini** (G3-09):
 *
 * 1. **Cacat duplikasi.** Sebelumnya baris tahap pemulihan dan dua dialog
 *    konfirmasi tertulis **dua kali** di bagian ini, sehingga aplikasi merender
 *    dua dialog dengan nama aksesibilitas yang sama persis — pembaca layar
 *    mengumumkannya dua kali dan Playwright akan menemukan dua elemen untuk
 *    satu peran. Sekarang satu salinan saja.
 * 2. **Kata sandi enkripsi ikut terlihat keadaannya.** Tombol "Generate" memakai
 *    `generatePassphrase` dari `lib/passphrase.ts`, sehingga daftar kata dan
 *    aturan panjang minimum tidak lagi disalin di dua tempat.
 */
export interface BackupSectionProps {
  /** Bentuk `Settings` yang sedang terbuka (untuk `lastBackupAt`/`driveBackup`). */
  form: Settings;
  /** Jalur pemulihan: satu keadaan sibuk bersama + tahap + peringatan validasi. */
  jalur: JalurPemulihan;
  /** Pengubah jalur backup/restore (di luar komponen ini). */
  aksi: BackupHandlers;
  /** Ajukan aksi yang butuh PIN Keuangan. */
  mintaPin: (aksi: "exportBackup" | "exportCsv" | "restore" | "backupDrive" | "restoreDrive") => void;
  /** Notifikasi ringan. */
  toast: {
    info: (m: string) => void;
    success: (m: string) => void;
    error: (m: string) => void;
  };
}

export default function BackupSection({
  form, jalur, aksi, mintaPin, toast,
}: BackupSectionProps) {
  const [backupPass, setBackupPass] = useState("");
  const [showBackupPass, setShowBackupPass] = useState(false);
  const [driveAuto, setDriveAuto] = useState(() => {
    try { return localStorage.getItem("leskolui_drive_auto") === "1"; } catch { return false; }
  });
  const [relaySecret, setRelaySecret] = useState(() => {
    try { return localStorage.getItem("leskolui_relay_secret") || ""; } catch { return ""; }
  });
  /** Pratinjau berkas yang dipilih, supaya dialog bisa menyebut nama + ukurannya. */
  const [berkasTerpilih, setBerkasTerpilih] = useState<File | null>(null);

  /**
   * Dialog konfirmasi pemulihan dipegang bagian ini sendiri, bukan dititipkan ke
   * layar: dialognya hanya masuk akal bersama berkas yang dipilih di sini, dan
   * menitipkannya membuat layar harus menyimpan keadaan yang bukan urusannya.
   */
  const [konfirmasi, setKonfirmasi] = useState<{ state: ConfirmDialogState; aksi: () => void } | null>(null);
  const ajukan = (state: ConfirmDialogState, lanjut: () => void) => setKonfirmasi({ state, aksi: lanjut });

  const jalurSibuk = jalur.busy;
  const driveSiap = isDriveConfigured();
  /** Kata sandi sudah cukup panjang untuk dipakai backup. */
  const siapPakai = backupPass.length >= MIN_PASS;

  /**
   * Salin kata sandi ke papan klip (G3-09 butir 6).
   *
   * `navigator.clipboard` **tidak selalu ada**: di peramban tanpa konteks aman
   * (http biasa) atau saat izinnya ditolak, `writeText` menolak. Kegagalannya
   * diberitahukan apa adanya — tombol salin yang diam adalah keluhan yang sama
   * dengan tombol perbarui yang tidak bekerja.
   */
  const salinSandi = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("papan klip tidak tersedia di peramban ini");
      await navigator.clipboard.writeText(backupPass);
      toast.success("Kata sandi enkripsi disalin ✓ Tempel di tempat aman, lalu hapus dari papan klip.");
    } catch (e) {
      toast.error("Gagal menyalin: " + ((e as Error).message || "papan klip diblokir") + ". Tampilkan lalu salin manual.");
      setShowBackupPass(true);
    }
  };

  /**
   * Unduh berkas kunci (G3-09 butir 6).
   *
   * Isinya sengaja **bukan hanya kata sandinya**: ada tanggal, nama aplikasi, dan
   * satu kalimat yang menjelaskan untuk apa berkas ini dan apa risikonya. Berkas
   * kunci tanpa penjelasan akan ditemukan setahun kemudian tanpa konteks.
   */
  const unduhBerkasKunci = () => {
    const garis = [
      "LES KO LUI — BERKAS KUNCI BACKUP",
      "",
      `Dibuat: ${new Date().toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}`,
      `Kata sandi enkripsi: ${backupPass}`,
      "",
      "APA INI",
      "Kata sandi di atas dipakai untuk MEMBUKA berkas backup (.jles) aplikasi Les Ko Lui.",
      "Tanpa kata sandi ini, berkas backup TIDAK BISA dibuka — oleh siapa pun, termasuk aplikasi ini.",
      "",
      "YANG PERLU DILAKUKAN",
      "1. Simpan berkas ini di tempat yang aman, terpisah dari berkas backup-nya.",
      "2. Kalau backup disimpan di Google Drive, JANGAN simpan berkas ini di Drive yang sama.",
      "3. Jangan kirim berkas ini lewat WhatsApp atau email biasa.",
      "",
      "CATATAN",
      "Kata sandi ini tidak tersimpan di dalam aplikasi dan tidak bisa dipulihkan.",
      "Mengganti kata sandi berarti backup lama tetap memakai kata sandi yang lama.",
      "",
    ];
    const blob = new Blob([garis.join("\n")], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `leskolui-berkas-kunci-${todayWIB()}.txt`);
    toast.success("Berkas kunci diunduh ✓ Simpan terpisah dari berkas backup.");
  };

  /** Baris sasaran pemulihan dari satu sumber: `recoveryTargetSummary`. */
  const barisSasaran = (sasaran: { fileName?: string; sizeBytes?: number }): string[] =>
    recoveryTargetSummary({ students: 0, sessions: 0, ...sasaran })
      .filter((r) => r.label === "Berkas" || r.label === "Ukuran berkas")
      .map((r) => `• ${r.label}: ${r.value}`);

  return (
    <Section id="backup" title="Backup dan Restore" icon={<BackupIcon size={18} />}>
      <div className="pt-3 space-y-3">
        <StorageUsage />
        <PhotoMaintenance onToast={toast.info} />

        {/* Kata sandi bersama — dipakai semua backup & restore */}
        <div className="bg-[var(--surface)] rounded-xl p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="set-backup-pass" className="label m-0">Kata Sandi Enkripsi</label>
            {/* G3-09 butir 6: salin + unduh berkas kunci. Keduanya menonaktif
                selama katanya belum memenuhi batas minimum — tombol yang menyalin
                kata sandi terlalu pendek hanya menyebarkan sandi yang lemah. */}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!siapPakai}
                title={siapPakai ? undefined : `Isi kata sandi minimal ${MIN_PASS} karakter dulu.`}
                onClick={() => void salinSandi()}
                className="min-h-[44px] rounded-lg bg-[var(--bg-subtle)] px-3 py-2 text-xs font-medium text-[var(--ink-strong)] disabled:opacity-50"
              >
                Salin
              </button>
              <button
                type="button"
                disabled={!siapPakai}
                title={siapPakai ? undefined : `Isi kata sandi minimal ${MIN_PASS} karakter dulu.`}
                onClick={unduhBerkasKunci}
                className="min-h-[44px] rounded-lg bg-[var(--bg-subtle)] px-3 py-2 text-xs font-medium text-[var(--ink-strong)] disabled:opacity-50"
              >
                Unduh berkas kunci
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              id="set-backup-pass"
              className="input flex-1"
              type={showBackupPass ? "text" : "password"}
              value={backupPass}
              onChange={(e) => setBackupPass(e.target.value)}
              placeholder="Kata sandi backup & restore"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => {
                setBackupPass(generatePassphrase(crypto.getRandomValues(new Uint8Array(6))));
                setShowBackupPass(true);
              }}
              className="min-h-[44px] text-xs px-3 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-strong)] font-medium flex-shrink-0"
            >
              Generate
            </button>
            <button
              type="button"
              onClick={() => setShowBackupPass((visible) => !visible)}
              className="min-h-[44px] text-xs px-3 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-strong)] font-medium flex-shrink-0"
            >
              {showBackupPass ? "Sembunyikan" : "Tampilkan"}
            </button>
          </div>
          {backupPass && showBackupPass && (
            <p className="text-xs text-[var(--ink-muted)] font-mono break-all">{backupPass}</p>
          )}
          {backupPass && (() => {
            const st = passStrength(backupPass);
            return (
              <div className="space-y-1">
                <div className="w-full bg-[var(--bg-subtle)] rounded-full h-1.5">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${st.pct}%`, background: st.color }} />
                </div>
                <p className="text-xs font-medium" style={{ color: st.color }}>
                  Kekuatan: {st.label}
                  {backupPass.length < MIN_PASS && ` — minimal ${MIN_PASS} karakter (pakai "Generate" untuk kata sandi yang kuat)`}
                </p>
              </div>
            );
          })()}
          <p className="text-xs text-[var(--ink-muted)]">
            Dipakai untuk <b>backup &amp; restore</b> (File &amp; Drive). <b>Simpan baik-baik</b> — kata sandi ini tak tersimpan & wajib untuk membuka backup di HP lain.
          </p>
        </div>

        {/* Metode 1: File */}
        <div className="bg-[var(--brand-tint)] rounded-xl p-3 space-y-2.5">
          <p className="text-sm font-semibold text-[var(--ink-brand)]">File (.jles)</p>
          <button
            type="button"
            disabled={!recoveryButtonEnabled(jalurSibuk, "backupFile")}
            title={jalurSibuk.busy ? "Tunggu jalur lain selesai dulu." : undefined}
            className="w-full min-h-[44px] py-2.5 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] text-sm font-semibold transition-colors disabled:opacity-60"
            onClick={() => {
              if (!backupPass || backupPass.length < MIN_PASS) { toast.info(`Isi Kata Sandi Enkripsi (min ${MIN_PASS} karakter) dulu!`); return; }
              mintaPin("exportBackup");
            }}>
            <DownloadIcon size={13} className="mr-1 inline align-[-2px]" /> Backup ke File
          </button>
          <button
            type="button"
            className="w-full min-h-[44px] py-2 rounded-xl bg-[var(--brand-tint-strong)] text-[var(--ink-brand)] text-sm font-medium transition-colors"
            onClick={() => mintaPin("exportCsv")}>
            <ChartIcon size={13} className="mr-1 inline align-[-2px]" /> Ekspor data ke CSV (terbaca)
          </button>
          <p className="text-xs text-[var(--ink-brand)]">CSV terbaca tanpa app (cadangan tambahan). Backup .jles tetap utama (terenkripsi).</p>

          <div className="border-t border-[var(--brand-tint-strong)] pt-2.5 space-y-2">
            <label htmlFor="set-restore-file" className="label text-[var(--ink-brand)]">Restore dari file</label>
            <input
              id="set-restore-file"
              type="file"
              accept=".jles"
              className="text-sm text-[var(--ink-muted)] w-full"
              onChange={(e) => setBerkasTerpilih(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className="w-full min-h-[44px] py-2 rounded-xl bg-[var(--brand-tint-strong)] text-[var(--ink-brand)] text-sm font-medium transition-colors"
              onClick={() => {
                if (!berkasTerpilih) { toast.info("Pilih file .jles dulu!"); return; }
                if (!backupPass) { toast.info("Isi Kata Sandi Enkripsi dulu!"); return; }
                // Ringkasan sasaran ditulis sebelum data apa pun ditimpa (butir 7).
                ajukan({
                  judul: "Pulihkan dari berkas ini?",
                  pesan: [
                    ...barisSasaran({ fileName: berkasTerpilih.name, sizeBytes: berkasTerpilih.size }),
                    "• Semua murid, sesi, tagihan, dan laporan di perangkat ini akan DIGANTI.",
                    "• Aplikasi menyimpan cadangan data lama (pre-restore) sebelum menggantinya.",
                  ],
                  labelLanjut: "Ya, pulihkan",
                  danger: true,
                }, () => mintaPin("restore"));              }}>
              <RefreshIcon size={13} className="mr-1 inline align-[-2px]" /> Restore dari File
            </button>
            {/* Pratinjau berkas tanpa menyentuh data: menjawab "berkasnya atau
                kata sandinya yang salah?" sebelum tutor menekan Restore. */}
            <button
              type="button"
              disabled={jalurSibuk.busy}
              className="w-full min-h-[44px] py-2 rounded-xl bg-[var(--surface-strong)] text-[var(--ink-brand)] text-sm font-medium border border-[var(--brand-tint-strong)] transition-colors disabled:opacity-60"
              onClick={() => void aksi.cekBerkasBisaDibuka(berkasTerpilih ?? undefined)}>
              <SearchIcon size={13} className="mr-1 inline align-[-2px]" /> Cek file ini bisa dibuka
            </button>
            <p className="text-xs text-[var(--ink-brand)]">
              <b>Kata Sandi Enkripsi</b> (di kolom atas), bukan PIN Keuangan, yang membuka file ini.
            </p>
          </div>
        </div>

        {/* Metode 2: Google Drive */}
        {driveSiap ? (
          <div className="bg-[var(--bg-success)] rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--ink-success)]">Google Drive</p>
              {form.driveBackup?.backupAt && (
                <p className="text-xs text-[var(--ink-muted)]">
                  {new Date(form.driveBackup.backupAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={!recoveryButtonEnabled(jalurSibuk, "backupDrive")}
              title={jalurSibuk.busy ? "Tunggu jalur lain selesai dulu." : undefined}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-[var(--bg-success-strong)] text-[var(--on-strong)] text-sm font-semibold transition-colors disabled:opacity-60"
              onClick={() => {
                if (!backupPass || backupPass.length < MIN_PASS) { toast.info(`Isi Kata Sandi Enkripsi (min ${MIN_PASS} karakter) dulu!`); return; }
                mintaPin("backupDrive");
              }}>
              <CloudIcon size={13} className="mr-1 inline align-[-2px]" /><UploadIcon size={13} className="mr-1 inline align-[-2px]" /> Backup ke Drive
            </button>
            <button
              type="button"
              className="w-full min-h-[44px] py-2 rounded-xl bg-[var(--bg-success)] text-[var(--ink-success)] text-sm font-medium transition-colors"
              onClick={() => {
                if (!backupPass) { toast.info("Isi Kata Sandi Enkripsi dulu!"); return; }
                const dibuat = form.driveBackup?.backupAt
                  ? new Date(form.driveBackup.backupAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
                  : "tanggal tidak tercatat";
                ajukan({
                  judul: "Pulihkan dari Google Drive?",
                  pesan: [
                    `• Cadangan terakhir di Drive: ${dibuat}`,
                    "• Semua murid, sesi, tagihan, dan laporan di perangkat ini akan DIGANTI.",
                    "• Aplikasi menyimpan cadangan data lama (pre-restore) sebelum menggantinya.",
                  ],
                  labelLanjut: "Ya, pulihkan",
                  danger: true,
                }, () => mintaPin("restoreDrive"));
              }}>
              <CloudIcon size={13} className="mr-1 inline align-[-2px]" /><RefreshIcon size={13} className="mr-1 inline align-[-2px]" /> Restore dari Drive
            </button>
            <button
              type="button"
              disabled={jalur.verifying}
              className="w-full min-h-[44px] py-2 rounded-xl bg-[var(--surface-strong)] text-[var(--ink-success)] text-sm font-medium border border-[var(--border-success)] transition-colors disabled:opacity-60"
              onClick={() => void aksi.doVerifyDrive()}>
              {jalur.verifying ? "Memverifikasi..." : <><SearchIcon size={13} className="mr-1 inline align-[-2px]" /> Verifikasi backup Drive</>}
            </button>
            <p className="text-xs text-[var(--ink-success)]">1 berkas ditimpa tiap backup — Drive menyimpan riwayat versi.</p>

            <label className="flex items-center gap-2.5 pt-2 border-t border-[var(--border-success)] cursor-pointer">
              <Toggle
                checked={driveAuto}
                onChange={(v) => { setDriveAuto(v); aksi.toggleDriveAuto(v); }}
                label="Auto backup Drive mingguan"
              />
              <span className="text-xs font-medium text-[var(--ink-success)]">Auto backup mingguan (1-tap dari reminder)</span>
            </label>
            {/* Peringatan risiko WAJIB muncul saat fitur ini menyala: menyalakannya
                menyimpan kata sandi enkripsi di perangkat ini. */}
            {driveAuto && (
              <p className="text-xs text-[var(--ink-warn)] bg-[var(--bg-warn)] rounded-lg px-2 py-1.5">
                Kata sandi enkripsi disimpan di perangkat ini agar backup bisa 1-tap — pastikan layar HP terkunci (PIN/biometrik). Tetap simpan salinannya untuk restore di HP lain.
              </p>
            )}

            {/* Backup senyap (relay) — backup tanpa popup saat app dibuka & sudah due */}
            <div className="pt-2 border-t border-[var(--border-success)] space-y-1.5">
              <label htmlFor="set-relay-secret" className="label text-[var(--ink-success)]">Backup senyap (relay, lanjutan)</label>
              <input
                id="set-relay-secret"
                className="input font-mono text-xs"
                type="password"
                placeholder="Secret relay (BACKUP_API_SECRET)"
                value={relaySecret}
                onChange={(e) => { setRelaySecret(e.target.value); aksi.saveRelaySecret(e.target.value); }}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={jalur.relayBusy || !relaySecret}
                  onClick={() => void aksi.doTestRelay()}
                  className="inline-flex min-h-[44px] items-center text-xs px-3 py-1.5 rounded-xl bg-[var(--bg-success)] text-[var(--ink-success)] font-medium disabled:opacity-50">
                  {jalur.relayBusy ? "Menguji..." : "Tes relay"}
                </button>
                <span className="text-xs text-[var(--ink-muted)]">{relaySecret ? "Aktif — backup tanpa popup" : "Nonaktif (pakai 1-tap)"}</span>
              </div>
              <p className="text-xs text-[var(--ink-muted)]">Butuh setup server 1x. Lihat docs/02-PANDUAN-BACKUP-DRIVE-SENYAP.md.</p>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--surface)] rounded-xl p-3">
            <p className="text-xs text-[var(--ink-muted)]">Backup Google Drive belum aktif.</p>
          </div>
        )}

        <p className="text-xs text-[var(--ink-attention)]">Restore mengganti <b>semua</b> data saat ini. Sebelum mengganti, app otomatis mengunduh berkas <b>pre-restore</b> (cadangan data lama Anda).</p>

        <p className="text-xs text-[var(--ink-muted)] pt-2 border-t border-[var(--border)]">
          Backup terakhir:{" "}
          {form.lastBackupAt ? (
            <b className="text-[var(--ink-muted)]">{new Date(form.lastBackupAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</b>
          ) : (
            <span className="text-[var(--ink-muted)]">belum pernah backup</span>
          )}
        </p>

        {/* G3-09 butir 5: tahap pemulihan terlihat di SEMUA jalur, bukan hanya jalur
            berkas. Tanpa ini layar tampak "diam" selama puluhan detik dan tutor
            menutup halaman di tengah proses. SATU salinan saja — sebelumnya blok ini
            tertulis dua kali di bagian yang sama. */}
        {jalurSibuk.busy && jalurSibuk.stepLabel && (
          <p role="status" aria-live="polite" className="rounded-lg bg-[var(--brand-tint-strong)] px-2.5 py-2 text-xs font-medium text-[var(--ink-brand)]">
            {jalurSibuk.stepLabel} Jangan tutup halaman ini.
          </p>
        )}

        {/* Peringatan validasi impor: impor TERTAHAN sampai tutor memutuskan. */}
        <ConfirmActionModal
          open={jalur.peringatan !== null}
          state={jalur.peringatan ? {
            judul: `Backup memiliki ${jalur.peringatan.length} peringatan validasi`,
            pesan: [
              "Sebagian isian backup tidak lolos pemeriksaan. Impor belum berjalan.",
              ...jalur.peringatan.slice(0, 8).map((p) => `• ${p}`),
            ],
            labelLanjut: "Lanjutkan impor",
            danger: true,
          } : null}
          onCancel={() => jalur.jembatanPeringatan.jawab(false)}
          onConfirm={() => jalur.jembatanPeringatan.jawab(true)}
        />

        {/* Konfirmasi pemulihan: menyebut berkas + ukurannya sebelum data ditimpa. */}
        <ConfirmActionModal
          open={konfirmasi !== null}
          state={konfirmasi?.state ?? null}
          busy={jalurSibuk.busy}
          onCancel={() => setKonfirmasi(null)}
          onConfirm={() => {
            const lanjut = konfirmasi?.aksi;
            setKonfirmasi(null);
            lanjut?.();
          }}
        />
      </div>
    </Section>
  );
}
