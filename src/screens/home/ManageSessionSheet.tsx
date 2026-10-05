import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Session, Student } from "../../db/types";
import {
  cancelSeriesSessions,
  deleteSession,
  markSessionNoShow,
  rescheduleSession,
  updateSeriesSessions,
} from "../../db/repos";
import type { EditMode } from "../../db/repos";
import { dayLabel, todayWIB } from "../../lib/format";
import { DURATIONS } from "../../lib/calendar";
import Sheet from "../../components/ui/Sheet";
import ConfirmSheet from "../../components/ConfirmSheet";
import ClockTimePicker from "../../components/ClockTimePicker";
import {
  aksiLainnya,
  aksiTerbuka,
  aksiUtama,
  type AksiSesiId,
  type SesiAksi,
  type SesiKontek,
} from "./manageSession";
import {
  defaultDate,
  konfirmasiUntuk,
  modeEfektif,
  pilihanMurid,
  sesiFormAwal,
  tampilkanPemilihMurid,
  validasiReschedule,
} from "./manageSessionForm";

interface ManageSessionSheetProps {
  session: Session;
  studentName: string;
  kontek: SesiKontek;
  /** Daftar murid untuk pemilih di jalur "ubah jadwal" â€” `Home.tsx` sudah memuatnya. */
  students: Student[];
  onClose: () => void;
  onResult: (message: string) => void;
}

const TOMBOL_UTAMA =
  "w-full min-h-[52px] rounded-[var(--radius-card)] px-4 text-body font-bold transition-colors disabled:opacity-50";
const TOMBOL_BAHAYA =
  "w-full min-h-[44px] rounded-[var(--radius-card)] border border-[var(--border-danger)] bg-[var(--bg-danger)] px-4 text-sm font-semibold text-[var(--ink-danger)] transition-colors";
const TOMBOL_NETRAL =
  "w-full min-h-[44px] rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm font-semibold text-[var(--ink-strong)] transition-colors";

/**
 * Satu sheet untuk semua pengelolaan sesi dari Beranda (G3-01 L4).
 *
 * Menggantikan **dua modal lama**: satu untuk mengubah jadwal, satu untuk
 * mengelola sesi terlewat. Yang membuatnya satu adalah aturan di
 * `manageSession.ts` (aksi mana yang muncul di konteks mana) â€” komponen ini
 * hanya menyusun tampilannya, tidak memutuskan apa yang boleh dilakukan.
 *
 * Prinsip yang dipegang:
 * - **Repo tidak ditambah.** Semua aksi memakai fungsi yang sudah ada
 *   (`cancelSeriesSessions` Â· `updateSeriesSessions` Â· `markSessionNoShow` Â·
 *   `rescheduleSession` Â· `deleteSession`). Angka tagihan tidak dihitung di sini.
 * - **Panel HP = sheet dari bawah** (`components/ui/Sheet`, pola D kontrak K4),
 *   bukan modal tengah.
 * - **Aksi merusak selalu lewat `ConfirmSheet`** (`konfirmasiUntuk()`), jadi tidak
 *   ada pembatalan/penghapusan yang berjalan hanya karena satu ketukan nyasar.
 */
export default function ManageSessionSheet({
  session,
  studentName,
  kontek,
  students,
  onClose,
  onResult,
}: ManageSessionSheetProps) {
  const navigate = useNavigate();
  const berseri = Boolean(session.seriesId);

  const [aksiId, setAksiId] = useState<AksiSesiId>(null);
  const [menuTerbuka, setMenuTerbuka] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState<SesiAksi | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(() => {
    const awal = sesiFormAwal(session);
    return {
      muridId: awal.studentId,
      tanggal: defaultDate(null, session),
      jam: awal.time,
      durasi: awal.durationHours,
      cakupan: awal.mode,
      alasan: awal.reason,
      billable: false,
    };
  });
  // Tanggal sesi asal dipakai untuk memutuskan apakah perubahan tanggal perlu
  // dikirim. `mode` "future"/"all" tidak boleh mengubah tanggal (`updateSession`
  // hanya bisa menggeser satu sesi), jadi pilihan itu memulihkan tanggal asal â€”
  // perilaku yang sama dengan modal lama.
  const tanggalAsal = useRef(session.date);

  const aksiUtamaList = aksiUtama({ kontek });
  const aksiLainList = aksiLainnya({ kontek, berseri });
  const aksiTerpilih = aksiTerbuka({ kontek, berseri }, aksiId);

  const buka = (aksi: SesiAksi) => {
    const awal = sesiFormAwal(session);
    setForm({
      muridId: awal.studentId,
      tanggal: defaultDate(aksi, session),
      jam: awal.time,
      durasi: awal.durationHours,
      cakupan: awal.mode,
      alasan: awal.reason,
      billable: false,
    });
    setMenuTerbuka(false);
    setAksiId(aksi);
  };

  const pilihCakupan = (mode: EditMode) => {
    setForm((f) => ({ ...f, cakupan: mode, tanggal: mode === "this" ? f.tanggal : tanggalAsal.current }));
  };

  const laporkanGagal = (kegiatan: string, e: unknown) => {
    onResult(`Gagal ${kegiatan}: ${(e as Error).message}`);
  };

  /** Jalankan aksi yang **tidak** butuh kolom isian (dan tidak merusak). */
  const jalankanAksi = (aksi: SesiAksi) => {
    if (aksi === "catat") {
      navigate(`/capture?scheduleId=${session.id}`);
      onClose();
      return;
    }
    buka(aksi);
  };

  const simpan = async () => {
    const aksi = aksiId;
    if (!aksi) return;

    // Aksi merusak: minta konfirmasi dulu, jangan sentuh DB.
    if (konfirmasiUntuk(aksi, { studentName, berseri })) {
      setKonfirmasi(aksi);
      return;
    }

    // Dijaga sebelum DB: `rescheduleSession` menolak tanggal lampau dengan galat
    // teknis, sedangkan tutor perlu tahu apa yang harus diubah.
    const validasi = aksi === "jadwalkan-ulang"
      ? validasiReschedule({ date: form.tanggal, time: form.jam, durationHours: form.durasi })
      : { ok: true, pesan: "" };
    if (!validasi.ok) {
      onResult(validasi.pesan);
      return;
    }

    setBusy(true);
    try {
      if (aksi === "simpan-perubahan") {
        const patch: Parameters<typeof updateSeriesSessions>[1] = {
          studentId: form.muridId || session.studentId,
          time: form.jam,
          durationHours: form.durasi,
        };
        if (form.cakupan === "this" && form.tanggal !== tanggalAsal.current) {
          patch.date = form.tanggal;
        }
        await updateSeriesSessions(
          { id: session.id, seriesId: session.seriesId, date: tanggalAsal.current },
          patch,
          modeEfektif(berseri, form.cakupan),
        );
        onResult("Jadwal diperbarui âœ“");
      } else if (aksi === "jadwalkan-ulang") {
        await rescheduleSession(session.id, {
          date: form.tanggal,
          time: form.jam,
          durationHours: form.durasi,
          reason: form.alasan,
        });
        onResult("Sesi dijadwalkan ulang âœ“");
      } else if (aksi === "tidak-hadir") {
        await markSessionNoShow(session.id, { reason: form.alasan, billable: form.billable });
        onResult(form.billable ? "Tidak hadir ditandai â€” tetap ditagihkan." : "Tidak hadir ditandai â€” tidak ditagihkan.");
      }
      onClose();
    } catch (e) {
      laporkanGagal(aksi === "tidak-hadir" ? "menandai tidak hadir" : "menyimpan", e);
    } finally {
      setBusy(false);
    }
  };

  /** Aksi merusak: dipanggil `ConfirmSheet` sesudah tutor benar-benar setuju. */
  const jalankanKonfirmasi = async () => {
    const aksi = konfirmasi;
    if (!aksi) return;
    setBusy(true);
    try {
      if (aksi === "hapus") {
        await deleteSession(session.id);
        onResult("Sesi dihapus.");
      } else {
        await cancelSeriesSessions(
          { id: session.id, seriesId: session.seriesId, date: tanggalAsal.current },
          modeEfektif(berseri, form.cakupan),
          form.alasan,
        );
        onResult(aksi === "batal-les" ? "Sesi dibatalkan â€” tidak ditagihkan." : "Jadwal dibatalkan.");
      }
      setKonfirmasi(null);
      onClose();
    } catch (e) {
      laporkanGagal(aksi === "hapus" ? "menghapus sesi" : "membatalkan sesi", e);
    } finally {
      setBusy(false);
    }
  };

  const judul = kontek === "terlewat" ? "Kelola sesi terlewat" : "Kelola sesi";

  const infoKonfirmasi = konfirmasi ? konfirmasiUntuk(konfirmasi, { studentName, berseri }) : null;

  /** Satu baris pilihan aksi (aksi utama yang belum dipilih). */
  const barisAksi = (aksi: SesiAksi, aktif: boolean) => {
    const info = [...aksiUtamaList, ...aksiLainList].find((a) => a.id === aksi);
    if (!info) return null;
    const kelas = info.merusak ? TOMBOL_BAHAYA : TOMBOL_NETRAL;
    return (
      <button
        key={info.id}
        type="button"
        aria-pressed={aktif}
        onClick={() => jalankanAksi(info.id)}
        className={`${kelas} ${aktif ? "ring-2 ring-[var(--border-brand)]" : ""}`}
      >
        {info.label}
      </button>
    );
  };

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title={judul}
        description={`${studentName} Â· ${dayLabel(session.date)}${session.seriesId ? " Â· Sesi berulang" : ""}`}
        ariaLabel={judul}
        footer={
          aksiTerpilih && aksiTerpilih.butuhIsian ? (
            <button type="button" onClick={simpan} disabled={busy} className={`${TOMBOL_UTAMA} text-[var(--on-strong)]`} style={{ background: "var(--brand-solid)" }}>
              {busy ? "Menyimpan..." : aksiTerpilih.label}
            </button>
          ) : undefined
        }
      >
        <div className="space-y-[var(--space-4)]">
          {kontek === "terlewat" && (
            <p className="text-xs text-[var(--text-muted)] m-0">
              Pilih hasil sesi ini. Riwayat jadwal asal tetap tersimpan.
            </p>
          )}

          {/* Daftar aksi utama â€” selalu terlihat supaya kemampuan tidak tersembunyi. */}
          <div className="space-y-[var(--space-2)]">
            {aksiUtamaList.map((a) => barisAksi(a.id, aksiId === a.id))}
          </div>

          {/* `â‹¯` â€” tempat kemampuan yang tidak lagi berebut perhatian. */}
          <div className="border-t border-[var(--border)] pt-[var(--space-3)]">
            <button
              type="button"
              onClick={() => setMenuTerbuka((v) => !v)}
              aria-expanded={menuTerbuka}
              className="w-full min-h-[44px] rounded-[var(--radius-card)] px-3 text-left text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
            >
              â‹¯ Aksi lain ({aksiLainList.length})
            </button>
            {menuTerbuka && (
              <div className="mt-[var(--space-2)] space-y-[var(--space-2)]">
                {aksiLainList.map((a) => barisAksi(a.id, aksiId === a.id))}
              </div>
            )}
          </div>

          {/* Kolom isian aksi yang sedang dipilih. */}
          {aksiTerpilih && aksiTerpilih.butuhIsian && (
            <div className="space-y-[var(--space-4)] rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-soft)] p-[var(--space-3)]">
              {tampilkanPemilihMurid(aksiTerpilih.id) && (
                <div>
                  <label htmlFor="msm-murid" className="label">Murid</label>
                  <select
                    id="msm-murid"
                    className="input"
                    value={form.muridId}
                    onChange={(e) => setForm((f) => ({ ...f, muridId: e.target.value }))}
                  >
                    {pilihanMurid(students, session).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {aksiTerpilih.id !== "tidak-hadir" && (
                <div>
                  <label htmlFor="msm-tanggal" className="label">
                    {aksiTerpilih.id === "jadwalkan-ulang" ? "Tanggal pengganti" : "Tanggal"}
                    {berseri && aksiTerpilih.butuhCakupanSeri && form.cakupan !== "this" && (
                      <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
                        (tanggal hanya bisa diubah untuk sesi ini saja)
                      </span>
                    )}
                  </label>
                  <input
                    id="msm-tanggal"
                    className="input"
                    type="date"
                    value={form.tanggal}
                    min={aksiTerpilih.id === "jadwalkan-ulang" ? todayWIB() : undefined}
                    disabled={berseri && aksiTerpilih.butuhCakupanSeri && form.cakupan !== "this"}
                    onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
                  />
                </div>
              )}

              {aksiTerpilih.id !== "tidak-hadir" && (
                <>
                  <div>
                    <label className="label">Jam mulai</label>
                    <ClockTimePicker value={form.jam} onChange={(jam) => setForm((f) => ({ ...f, jam }))} />
                  </div>
                  <div>
                    <label className="label">Durasi</label>
                    <div className="flex flex-wrap gap-[var(--space-2)]">
                      {DURATIONS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          aria-pressed={form.durasi === d}
                          onClick={() => setForm((f) => ({ ...f, durasi: d }))}
                          className={`min-h-[44px] rounded-lg border px-3 text-sm font-medium transition-colors ${
                            form.durasi === d
                              ? "border-[var(--border-brand)] bg-[var(--brand-solid)] text-[var(--on-strong)]"
                              : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-muted)]"
                          }`}
                        >
                          {d}j
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {aksiTerpilih.butuhCakupanSeri && (
                <div>
                  <label className="label">Berlaku untuk</label>
                  <div className="grid grid-cols-3 gap-[var(--space-2)]">
                    {(["this", "future", "all"] as EditMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={form.cakupan === m}
                        onClick={() => pilihCakupan(m)}
                        className={`min-h-[44px] rounded-xl border px-2 text-xs font-semibold transition-colors ${
                          form.cakupan === m
                            ? "border-[var(--border-brand)] bg-[var(--brand-solid)] text-[var(--on-strong)]"
                            : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-muted)]"
                        }`}
                      >
                        {m === "this" ? "Sesi ini" : m === "future" ? "Ini & berikutnya" : "Semua seri"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {aksiTerpilih.id === "tidak-hadir" && (
                <div className="rounded-[var(--radius-card)] border border-[var(--border-attention)] bg-[var(--bg-attention)] p-[var(--space-3)]">
                  <p className="text-sm font-semibold text-[var(--ink-attention)] m-0">Kebijakan tagihan</p>
                  <div className="mt-[var(--space-2)] grid grid-cols-2 gap-[var(--space-2)]">
                    <button
                      type="button"
                      aria-pressed={!form.billable}
                      onClick={() => setForm((f) => ({ ...f, billable: false }))}
                      className={`min-h-[44px] rounded-lg border px-2 text-xs font-semibold ${
                        !form.billable
                          ? "border-[var(--border-attention)] bg-[var(--surface-strong)] text-[var(--ink-attention)]"
                          : "border-[var(--border-attention)] text-[var(--ink-attention)]"
                      }`}
                    >
                      Gratis / tidak tagih
                    </button>
                    <button
                      type="button"
                      aria-pressed={form.billable}
                      onClick={() => setForm((f) => ({ ...f, billable: true }))}
                      className={`min-h-[44px] rounded-lg border px-2 text-xs font-semibold ${
                        form.billable
                          ? "border-[var(--border-attention)] bg-[var(--bg-attention-strong)] text-[var(--on-strong)]"
                          : "border-[var(--border-attention)] text-[var(--ink-attention)]"
                      }`}
                    >
                      Tetap tagihkan
                    </button>
                  </div>
                  <p className="mt-[var(--space-2)] text-xs text-[var(--ink-attention)] m-0">
                    {form.billable
                      ? "Biaya sesi ini akan masuk ke tagihan bulan berjalan."
                      : "Biaya sesi ini tidak akan masuk ke tagihan."}
                  </p>
                </div>
              )}

              {aksiTerpilih.id !== "hapus" && (
                <div>
                  <label htmlFor="msm-alasan" className="label">
                    Alasan <span className="font-normal text-[var(--text-muted)]">(opsional)</span>
                  </label>
                  <textarea
                    id="msm-alasan"
                    className="input min-h-20 resize-y"
                    value={form.alasan}
                    onChange={(e) => setForm((f) => ({ ...f, alasan: e.target.value }))}
                    placeholder={
                      aksiTerpilih.id === "tidak-hadir"
                        ? "Contoh: murid sakit / tidak ada kabar"
                        : aksiTerpilih.id === "jadwalkan-ulang"
                          ? "Contoh: permintaan orang tua"
                          : "Contoh: libur sekolah"
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* `hapus` tidak punya kolom isian â€” jelaskan akibatnya sebelum konfirmasi. */}
          {aksiTerpilih?.id === "hapus" && (
            <p className="text-xs text-[var(--text-muted)] m-0">
              Sesi ini akan dihapus dari jadwal dan riwayat. Kamu akan diminta memastikan dulu.
            </p>
          )}
        </div>
      </Sheet>

      {infoKonfirmasi && (
        <ConfirmSheet
          open
          title={infoKonfirmasi.title}
          message={infoKonfirmasi.message}
          confirmLabel={infoKonfirmasi.confirmLabel}
          danger
          busy={busy}
          onCancel={() => setKonfirmasi(null)}
          onConfirm={jalankanKonfirmasi}
        />
      )}
    </>
  );
}
