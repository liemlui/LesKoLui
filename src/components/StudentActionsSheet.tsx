import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Modal from "./Modal";
import StudentForm from "./StudentForm";
import { usePinGate } from "../hooks/usePinGate";
import { useStudentEditor } from "../hooks/useStudentEditor";
import { useSettingsQuery } from "../hooks/useSettingsQuery";
import { useToastCtx } from "./ToastProvider";
import {
  deleteStudent, updateStudent, studentDeleteSummary,
  listAllUpcomingScheduled,
} from "../db/repos";
import { todayWIB } from "../lib/format";
import { PencilIcon, TrashIcon, BanIcon, RefreshIcon } from "./icons";
import type { Student } from "../db/types";

export type StudentActionKind = "edit" | "deactivate" | "activate" | "delete";

interface StudentActionsSheetProps {
  student: Student;
  actions: StudentActionKind[];
  onClose: () => void;
  /** Dipanggil sesudah murid benar-benar dihapus — pemanggil memutuskan ke mana pergi. */
  onDeleted?: () => void;
  /** Dipanggil sesudah profil disimpan (termasuk saat murid baru dibuat). */
  onSaved?: (studentId: string) => void;
}

/**
 * Menu aksi satu murid: sunting · nonaktifkan/aktifkan · hapus.
 *
 * Dipakai bersama oleh layar Daftar Murid dan layar Detail Murid (butir 11
 * G3-06). Alasannya bukan kerapian: **tombol hapus tidak boleh punya dua jalur
 * yang berbeda perilaku.** Sebelum berkas ini ada, hanya Daftar Murid yang punya
 * alur hapus — dengan gerbang PIN dan ringkasan "yang akan ikut terhapus". Kalau
 * layar detail membuat alurnya sendiri, cepat atau lambat keduanya berbeda.
 *
 * Tiga aturan yang mengikat, semuanya sudah berlaku di aplikasi ini:
 *
 * 1. **Setiap aksi merusak melewati PIN Keuangan** (`usePinGate`), kecuali
 *    sunting saat PIN belum diatur sama sekali — di situ sunting dibuka langsung
 *    supaya tutor tidak terkunci dari fitur dasar.
 * 2. **Ringkasan hapus menyebut jumlah, bukan nominal.** Nominal akan menuntut
 *    gerbang uang, dan konfirmasi hapus bukan tempat untuk itu.
 * 3. **Menonaktifkan murid yang masih punya jadwal mendatang memberi peringatan**,
 *    bukan larangan: jadwal itu tidak otomatis batal.
 */
export default function StudentActionsSheet({
  student, actions, onClose, onDeleted, onSaved,
}: StudentActionsSheetProps) {
  const settingsQuery = useSettingsQuery();
  const settings = settingsQuery.settings;
  const toast = useToastCtx();
  const pin = usePinGate();
  const { saveStudent } = useStudentEditor();

  const [pending, setPending] = useState<StudentActionKind | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const today = todayWIB();

  /** Jadwal mendatang murid ini, untuk peringatan saat menonaktifkan. */
  const upcomingCount = useLiveQuery(async () => {
    const all = await listAllUpcomingScheduled(today);
    return all.filter((s) => s.studentId === student.id).length;
  }, [student.id, today]);

  /** Ringkasan apa yang akan ikut terhapus — dibaca hanya saat aksi hapus dipilih. */
  const deleteSummary = useLiveQuery(
    async () => (pending === "delete" ? studentDeleteSummary(student.id) : null),
    [pending, student.id],
  );

  const hasPin = Boolean(settings?.financialPin);

  const startAction = (kind: StudentActionKind) => {
    if (kind === "edit" && !hasPin) {
      // Tanpa PIN, sunting tidak dikunci: menyunting profil bukan aksi merusak.
      setShowForm(true);
      return;
    }
    if (!hasPin) {
      toast.error("Set PIN Keuangan di Pengaturan sebelum melakukan aksi ini.");
      return;
    }
    setPending(kind);
    pin.resetPin();
  };

  const execute = async () => {
    if (!pending || busy) return;
    const ok = await pin.attemptPin(settings?.financialPin ?? "");
    if (!ok) return;

    setBusy(true);
    try {
      if (pending === "delete") {
        await deleteStudent(student.id);
        toast.success(`Murid "${student.name}" dihapus ✓`);
        onDeleted?.();
        onClose();
      } else if (pending === "deactivate") {
        await updateStudent(student.id, { active: false });
        toast.info(`"${student.name}" dipindah ke historis`);
        onClose();
      } else if (pending === "activate") {
        await updateStudent(student.id, { active: true });
        toast.success(`"${student.name}" diaktifkan kembali ✓`);
        onClose();
      } else {
        setShowForm(true);
        setPending(null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aksi tidak dapat diselesaikan.");
    } finally {
      setBusy(false);
      pin.resetPin();
    }
  };

  // ── Formulir sunting ──
  if (showForm) {
    return (
      <Modal onClose={onClose} ariaLabel="Edit Murid">
        <h2 className="text-lg font-semibold">Edit Murid</h2>
        <StudentForm
          initial={student}
          onSave={async (data, options) => {
            const id = await saveStudent(data, options, student);
            onSaved?.(id);
            onClose();
          }}
          onCancel={onClose}
        />
      </Modal>
    );
  }

  // ── Konfirmasi PIN ──
  if (pending) {
    const title =
      pending === "delete" ? "Hapus Murid" :
      pending === "deactivate" ? "Nonaktifkan Murid" :
      pending === "activate" ? "Aktifkan Murid" : "Edit Murid";

    return (
      <Modal
        onClose={() => { setPending(null); pin.resetPin(); }}
        ariaLabel="Konfirmasi PIN"
        panelClassName="relative bg-[var(--surface-strong)] w-full max-w-xs rounded-2xl p-5 space-y-4 shadow-xl mx-4"
      >
        <div>
          <p className="font-bold text-base text-[var(--ink-strong)]">{title}</p>
          <p className="text-sm text-[var(--ink-muted)] mt-1">
            {pending === "delete"
              ? `Data "${student.name}" akan dihapus permanen.`
              : pending === "deactivate"
                ? `"${student.name}" dipindah ke historis.`
                : `"${student.name}" diaktifkan kembali.`}
          </p>

          {pending === "deactivate" && (upcomingCount ?? 0) > 0 && (
            <p className="mt-2 rounded-lg bg-[var(--bg-warn)] border border-[var(--border-warn)] p-2 text-xs text-[var(--ink-warn)]">
              ⚠️ Masih ada {upcomingCount} jadwal mendatang yang belum selesai.
              Pertimbangkan untuk membatalkan atau mengatur ulang jadwal tersebut.
            </p>
          )}

          {pending === "delete" && deleteSummary && (
            <div className="mt-2 rounded-lg bg-[var(--bg-danger)] border border-[var(--border-danger)] p-2 text-xs text-[var(--ink-danger)]">
              <p className="font-semibold mb-1">Yang akan ikut terhapus:</p>
              <ul className="space-y-0.5">
                {deleteSummary.sessions > 0 && <li>• {deleteSummary.sessions} sesi</li>}
                {deleteSummary.reports > 0 && <li>• {deleteSummary.reports} laporan</li>}
                {deleteSummary.payments > 0 && <li>• {deleteSummary.payments} tagihan</li>}
                {deleteSummary.followUps > 0 && <li>• {deleteSummary.followUps} follow-up aktif</li>}
                {deleteSummary.raporGrades > 0 && <li>• {deleteSummary.raporGrades} nilai rapor</li>}
                {deleteSummary.iaee > 0 && <li>• {deleteSummary.iaee} proyek</li>}
                {deleteSummary.studyNote > 0 && <li>• catatan belajar</li>}
                {deleteSummary.sessions === 0 && deleteSummary.reports === 0 &&
                 deleteSummary.payments === 0 && deleteSummary.followUps === 0 &&
                 deleteSummary.raporGrades === 0 && deleteSummary.iaee === 0 &&
                 deleteSummary.studyNote === 0 && (
                  <li>• Tidak ada riwayat — hanya profil</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs text-[var(--ink-muted)] mb-1">Masukkan PIN untuk konfirmasi</p>
          <input
            type="password" inputMode="numeric" maxLength={6} placeholder="PIN"
            aria-label="PIN Keuangan"
            value={pin.pinInput}
            onChange={(e) => { pin.setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6)); pin.setPinError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") void execute(); }}
            className="input text-center tracking-widest text-lg w-full"
            autoFocus
          />
          {pin.pinError && <p className="text-xs text-[var(--ink-danger)] mt-1" role="alert">{pin.pinError}</p>}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setPending(null); pin.resetPin(); }}
            className="flex-1 py-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-muted)] font-semibold text-sm"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void execute()}
            className={`flex-1 py-2.5 rounded-xl text-[var(--on-strong)] font-semibold text-sm disabled:opacity-50 ${
              pending === "delete" ? "bg-[var(--bg-danger-strong)]" :
              pending === "deactivate" ? "bg-[var(--bg-attention-strong)]" :
              "bg-[var(--bg-success-strong)]"
            }`}
          >
            {pending === "delete" ? "Hapus" : pending === "deactivate" ? "Nonaktifkan" : "Aktifkan"}
          </button>
        </div>

        {pending === "delete" && (
          <button
            type="button"
            onClick={() => { setPending("deactivate"); pin.resetPin(); }}
            className="inline-flex min-h-[44px] w-full items-center justify-center text-center text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink-strong)] py-1"
          >
            Alih-alih hapus, nonaktifkan saja →
          </button>
        )}
      </Modal>
    );
  }

  // ── Menu aksi ──
  return (
    <Modal
      onClose={onClose}
      ariaLabel={`Aksi untuk ${student.name}`}
      panelClassName="relative bg-[var(--surface-strong)] w-full max-w-xs rounded-2xl p-5 space-y-2 shadow-xl mx-4"
    >
      <p className="font-bold text-base text-[var(--ink-strong)] mb-1">{student.name}</p>

      {actions.includes("edit") && (
        <button
          type="button"
          onClick={() => startAction("edit")}
          className="w-full text-left px-4 py-3 rounded-xl bg-[var(--surface)] text-sm font-medium text-[var(--ink-strong)] border border-[var(--border)]"
        >
          <PencilIcon size={13} className="mr-1.5 inline align-[-2px]" /> Sunting profil
        </button>
      )}

      {student.active && actions.includes("deactivate") && (
        <button
          type="button"
          onClick={() => startAction("deactivate")}
          className="w-full text-left px-4 py-3 rounded-xl bg-[var(--bg-attention)] text-sm font-medium text-[var(--ink-attention)] border border-[var(--border-attention)]"
        >
          <BanIcon size={13} className="mr-1.5 inline align-[-2px]" /> Nonaktifkan murid
        </button>
      )}

      {!student.active && actions.includes("activate") && (
        <button
          type="button"
          onClick={() => startAction("activate")}
          className="w-full text-left px-4 py-3 rounded-xl bg-[var(--bg-success)] text-sm font-medium text-[var(--ink-success)] border border-[var(--border-success)]"
        >
          <RefreshIcon size={13} className="mr-1.5 inline align-[-2px]" /> Aktifkan kembali
        </button>
      )}

      {actions.includes("delete") && (
        <button
          type="button"
          onClick={() => startAction("delete")}
          className="w-full text-left px-4 py-3 rounded-xl bg-[var(--bg-danger)] text-sm font-medium text-[var(--ink-danger)] border border-[var(--border-danger)]"
        >
          <TrashIcon size={13} className="mr-1.5 inline align-[-2px]" /> Hapus permanen
        </button>
      )}

      <button
        type="button"
        onClick={onClose}
        className="w-full text-center text-[var(--ink-muted)] text-sm py-2"
      >
        Tutup
      </button>
    </Modal>
  );
}
