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
  patchUbahJadwal,
  peringatanGantiMurid,
  pilihanMurid,
  sesiFormAwal,
  tampilkanPemilihMurid,
  validasiReschedule,
} from "./manageSessionForm";

interface ManageSessionSheetProps {
  session: Session;
  studentName: string;
  kontek: SesiKontek;
  /** Daftar murid untuk pemilih di jalur "ubah jadwal" — `Home.tsx` sudah memuatnya. */
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
 * `manageSession.ts` (aksi mana yang muncul di konteks mana) — komponen ini
 * hanya menyusun tampilannya, tidak memutuskan apa yang boleh dilakukan.
 *
 * Prinsip yang dipegang:
 * - **Repo tidak ditambah.** Semua aksi memakai fungsi yang sudah ada
 *   (`cancelSeriesSessions` · `updateSeriesSessions` · `markSessionNoShow` ·
 *   `rescheduleSession` · `deleteSession`). Angka tagihan tidak dihitung di sini.
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

  /**
   * Aksi terpilih. Untuk sesi **terjadwal**, `Simpan perubahan` sudah terpilih sejak
   * awal sehingga kolom isiannya (Murid/Tanggal/Jam/Durasi) langsung terlihat — persis
   * seperti modal lama (`EditSessionModal`). Sebelumnya sheet terbuka tanpa aksi
   * terpilih, jadi tutor melihat tombol "Simpan perubahan" tanpa satu pun kolom yang
   * bisa diubah (laporan pemilik 2026-10-05). Sesi **terlewat** tetap mulai tanpa
   * pilihan: di sana yang utama adalah memilih hasil sesinya, bukan menyunting jadwal.
   */
  const [aksiId, setAksiId] = useState<AksiSesiId>(kontek === "terjadwal" ? "simpan-perubahan" : null);
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
  // hanya bisa menggeser satu sesi), jadi pilihan itu memulihkan tanggal asal —
  // perilaku yang sama dengan modal lama.
  const tanggalAsal = useRef(session.date);

  const aksiUtamaList = aksiUtama({ kontek });
  const aksiLainList = aksiLainnya({ kontek, berseri });
  const aksiTerpilih = aksiTerbuka({ kontek, berseri }, aksiId);

  // ── Ganti murid (2026-10-05): peringatan di sheet + konfirmasi sebelum simpan ──
  // `studentName` dari Beranda = pemilik sesi **sekarang**; `muridBaru` = pilihan di
  // kolom "Murid". Nama (bukan id) yang dipakai karena pesannya dibaca tutor.
  const muridBaru = students.find((s) => s.id === form.muridId)?.name ?? studentName;
  const peringatanMurid = peringatanGantiMurid({
    muridLama: studentName, muridBaru, berseri, cakupan: form.cakupan,
  });
  /** Satu konteks untuk gerbang konfirmasi **dan** pesan yang tampil, supaya keduanya tidak bisa berbeda. */
  const konteksKonfirmasi = {
    studentName, berseri, muridLama: studentName, muridBaru,
  };

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

  /** Isi penyimpanan sesungguhnya — dipakai `simpan()` dan sesudah `ConfirmSheet`. */
  const jalankanSimpan = async (aksi: SesiAksi) => {
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
        // Aturan patch ada di `manageSessionForm.ts` (`patchUbahJadwal`): durasi
        // hanya ikut dikirim bila benar-benar berubah, supaya nominal manual tutor
        // tidak terhapus saat yang diubah hanya jam atau muridnya.
        const patch = patchUbahJadwal(session, form, tanggalAsal.current);
        await updateSeriesSessions(
          { id: session.id, seriesId: session.seriesId, date: tanggalAsal.current },
          patch,
          modeEfektif(berseri, form.cakupan),
        );
        onResult("Jadwal diperbarui ✓");
      } else if (aksi === "jadwalkan-ulang") {
        await rescheduleSession(session.id, {
          date: form.tanggal,
          time: form.jam,
          durationHours: form.durasi,
          reason: form.alasan,
        });
        onResult("Sesi dijadwalkan ulang ✓");
      } else if (aksi === "tidak-hadir") {
        await markSessionNoShow(session.id, { reason: form.alasan, billable: form.billable });
        onResult(form.billable ? "Tidak hadir ditandai — tetap ditagihkan." : "Tidak hadir ditandai — tidak ditagihkan.");
      }
      onClose();
    } catch (e) {
      laporkanGagal(aksi === "tidak-hadir" ? "menandai tidak hadir" : "menyimpan", e);
    } finally {
      setBusy(false);
    }
  };

  /**
   * Tombol utama. Konfirmasi lebih dulu bila aksinya merusak **atau** bila muridnya
   * diganti (2026-10-05) — pergantian murid memindahkan tagihan, jadi ia tidak boleh
   * berjalan hanya karena satu ketukan.
   */
  const simpan = async () => {
    const aksi = aksiId;
    if (!aksi) return;
    if (konfirmasiUntuk(aksi, konteksKonfirmasi)) {
      setKonfirmasi(aksi);
      return;
    }
    await jalankanSimpan(aksi);
  };

  /** Aksi merusak: dipanggil `ConfirmSheet` sesudah tutor benar-benar setuju. */
  const jalankanKonfirmasi = async () => {
    const aksi = konfirmasi;
    if (!aksi) return;
    // Ganti murid bukan aksi merusak: sesudah tutor setuju, jalurnya sama dengan
    // `simpan()` — logika penyimpanan tidak digandakan.
    if (aksi === "simpan-perubahan") {
      setKonfirmasi(null);
      await jalankanSimpan(aksi);
      return;
    }
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
        onResult(aksi === "batal-les" ? "Sesi dibatalkan — tidak ditagihkan." : "Jadwal dibatalkan.");
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

  const infoKonfirmasi = konfirmasi ? konfirmasiUntuk(konfirmasi, konteksKonfirmasi) : null;

  /** Satu baris pilihan aksi (aksi utama yang belum dipilih). */
  const barisAksi = (aksi: SesiAksi, aktif: boolean) => {
    const info = [...aksiUtamaList, ...aksiLainList].find((a) => a.id === aksi);
    if (!info) return null;
    const kelas = info.merusak ? TOMBOL_BAHAYA : TOMBOL_NETRAL;
    return (
      // Keterangan akibat aksi diletakkan DI LUAR tombol: kalau di dalam, teksnya
      // ikut ter-center dan tinggi target sentuh tombolnya berubah.
      <div key={info.id}>
        <button
          type="button"
          aria-pressed={aktif}
          onClick={() => jalankanAksi(info.id)}
          className={`${kelas} ${aktif ? "ring-2 ring-[var(--border-brand)]" : ""}`}
        >
          {info.label}
        </button>
        {info.keterangan && (
          <p className="mt-[var(--space-1)] px-1 text-xs text-[var(--text-muted)] m-0">{info.keterangan}</p>
        )}
      </div>
    );
  };

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title={judul}
        description={`${studentName} · ${dayLabel(session.date)}${session.seriesId ? " · Sesi berulang" : ""}`}
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

          {/* Daftar aksi utama — selalu terlihat supaya kemampuan tidak tersembunyi. */}
          <div className="space-y-[var(--space-2)]">
            {aksiUtamaList.map((a) => barisAksi(a.id, aksiId === a.id))}
          </div>

          {/* `⋯` — tempat kemampuan yang tidak lagi berebut perhatian. */}
          <div className="border-t border-[var(--border)] pt-[var(--space-3)]">
            <button
              type="button"
              onClick={() => setMenuTerbuka((v) => !v)}
              aria-expanded={menuTerbuka}
              className="w-full min-h-[44px] rounded-[var(--radius-card)] px-3 text-left text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
            >
              ⋯ Aksi lain ({aksiLainList.length})
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
                    {pilihanMurid(students).map((s) => (
                      <option key={s.id} value={s.id}>
                        {/* Satu ekspresi, bukan dua bersebelahan: `renderToStaticMarkup`
                            menyisipkan pemisah komentar di antara dua text node, dan
                            tesnya jadi tidak bisa mencari "Budi (nonaktif)". */}
                        {s.active ? s.name : `${s.name} (nonaktif)`}
                      </option>
                    ))}
                  </select>
                  {/* Peringatan (bukan konfirmasi): akibatnya disebut tanpa angka rupiah
                      karena Beranda dilarang menampilkan uang (K3/B1). */}
                  {peringatanMurid && (
                    <p className="mt-[var(--space-2)] rounded-[var(--radius-card)] border border-[var(--border-attention)] bg-[var(--bg-attention)] p-[var(--space-2)] text-xs text-[var(--ink-attention)] m-0">
                      {peringatanMurid}
                    </p>
                  )}
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

          {/* `hapus` tidak punya kolom isian — jelaskan akibatnya sebelum konfirmasi. */}
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
