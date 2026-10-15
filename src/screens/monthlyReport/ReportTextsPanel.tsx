/**
 * Panel "Teks Laporan": ringkasan, catatan guru, kutipan (G3-05 butir 6 & 8).
 *
 * Butir 6 — kolom teks memberi tanda bahwa isinya bisa disunting lewat tombol
 * sungguhan (`EditableText`), sehingga peran tombol, urutan fokus, serta
 * Enter/Spasi bekerja. Sebelumnya ini `<p onClick>` yang hanya bisa diklik.
 * Butir 8 — setiap isian punya penanda "dibuat AI" sendiri, dan penandanya
 * hilang begitu isinya disunting manual.
 */

import { useEffect, useState } from "react";
import { BoltIcon, PencilIcon, SparkleIcon } from "../../components/icons";
import { isAiWritten } from "./aiFieldMarks";
import EditableText from "./EditableText";
import type { AiReportFieldKey } from "../../lib/aiClient";
import type { MonthlyReport } from "../../db/types";

type ReportTextField = "summaryText" | "teacherNote" | "quote";

interface ReportTextsPanelProps {
  open: boolean;
  onToggle: () => void;
  report: MonthlyReport;
  /** Berubah → draf penyuntingan di dalam panel direset (cakupan laporan berganti). */
  scopeKey: string;
  onSaveField: (field: ReportTextField, value: string) => Promise<void>;
  onGenerateFree: () => void;
  /**
   * Perkuat **satu** bagian dengan AI (keputusan pemilik 2026-10-14): tombolnya
   * ada di bagian masing-masing, bukan satu tombol besar untuk semuanya. Yang
   * diminta hanya isian itu, sehingga keluarannya pendek dan kegagalannya tidak
   * menjatuhkan isian lain.
   */
  onPerkuat: (field: AiReportFieldKey) => void;
  /** Perkiraan biaya per isian, mis. `{ summaryText: "±Rp 3" }` — ditampilkan di tombol. */
  perkuatLabel: Partial<Record<AiReportFieldKey, string>>;
  /** true selama satu panggilan AI berjalan (tombolnya dimatikan). */
  aiBusy: boolean;
  /** Alasan tombol AI mati (mis. batas belanja bulan ini), ditulis apa adanya. */
  aiDisabledReason?: string;
}

export default function ReportTextsPanel({
  open, onToggle, report, scopeKey, onSaveField, onGenerateFree,
  onPerkuat, perkuatLabel, aiBusy, aiDisabledReason,
}: ReportTextsPanelProps) {
  const [editing, setEditing] = useState<ReportTextField | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setEditing(null); setDraft(""); setBusy(false); }, [scopeKey]);

  const beginEdit = (field: ReportTextField, value?: string) => {
    setDraft(value ?? "");
    setEditing(field);
  };

  const save = async (field: ReportTextField) => {
    setBusy(true);
    try {
      await onSaveField(field, draft);
      setEditing(null);
    } finally {
      setBusy(false);
    }
  };

  const anyAiWritten = (["summaryText", "teacherNote", "quote"] as const)
    .some((field) => isAiWritten(report, field));

  /**
   * Tombol perkuat untuk satu isian.
   *
   * Bentuknya sengaja seragam: label biayanya selalu tampil (dihitung pemanggil
   * dengan estimator yang sama seperti modal biaya), dan tombolnya mati saat ada
   * panggilan berjalan atau saat AI memang tidak boleh dipakai.
   */
  const tombolPerkuat = (field: AiReportFieldKey) => (
    <button
      type="button"
      onClick={() => onPerkuat(field)}
      disabled={aiBusy || Boolean(aiDisabledReason)}
      title={aiDisabledReason || "Minta AI menulis ulang bagian ini saja"}
      className="mt-1 inline-flex min-h-[32px] items-center rounded-lg border border-[var(--border-accent)] bg-[var(--accent-tint)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-accent)] transition-colors disabled:opacity-50"
    >
      <SparkleIcon size={12} className="mr-1 inline align-[-2px]" />
      Perkuat AI{perkuatLabel[field] ? ` · ${perkuatLabel[field]}` : ""}
    </button>
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-sm">
      <button
        className="flex w-full items-center justify-between p-4 text-left"
        aria-expanded={open}
        onClick={onToggle}
      >
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[var(--ink-strong)]">
              <PencilIcon size={13} className="mr-1 inline align-[-2px]" /> Teks Laporan
            </p>
            {anyAiWritten && (
              <span className="rounded-full bg-[var(--accent-tint)] px-1.5 py-0.5 text-xs font-bold text-[var(--ink-accent)]">
                <SparkleIcon size={13} className="mr-1 inline align-[-2px]" /> AI
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">Ringkasan · Catatan guru · Kutipan</p>
        </div>
        <span className="text-sm text-[var(--ink-muted)]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-[var(--border)] px-4 pb-4">
          <div className="flex gap-2 pt-3">
            <button className="btn btn-secondary text-xs" onClick={onGenerateFree}>
              <BoltIcon size={13} className="mr-1 inline align-[-2px]" /> Generate Teks Gratis
            </button>
            <span className="self-center text-xs text-[var(--ink-muted)]">
              Isi ringkasan, catatan guru & kutipan dari data sesi tanpa AI.
            </span>
          </div>

          <div className="pt-1">
            <EditableText
              fieldId="mr-ringkasan"
              label="Ringkasan"
              value={report.summaryText}
              placeholder="Ketuk untuk tambah ringkasan..."
              editing={editing === "summaryText"}
              draft={draft}
              onDraftChange={setDraft}
              onStartEdit={() => beginEdit("summaryText", report.summaryText)}
              onSave={() => void save("summaryText")}
              onCancel={() => setEditing(null)}
              aiMarked={isAiWritten(report, "summaryText")}
              hint={busy && editing === "summaryText" ? <span className="text-xs text-[var(--ink-muted)]">Menyimpan…</span> : undefined}
            />
            {tombolPerkuat("summaryText")}
          </div>

          <div>
            <EditableText
              fieldId="mr-catatan-guru"
              label="Catatan Guru"
              value={report.teacherNote}
              placeholder="Ketuk untuk menambahkan kemajuan dan fokus prioritas..."
              editing={editing === "teacherNote"}
              draft={draft}
              onDraftChange={setDraft}
              onStartEdit={() => beginEdit("teacherNote", report.teacherNote)}
              onSave={() => void save("teacherNote")}
              onCancel={() => setEditing(null)}
              aiMarked={isAiWritten(report, "teacherNote")}
            />
            {tombolPerkuat("teacherNote")}
          </div>

          <div>
            <EditableText
              fieldId="mr-kutipan"
              label="Kutipan"
              value={report.quote ? `"${report.quote}"` : undefined}
              placeholder="Ketuk untuk tambah kutipan..."
              editing={editing === "quote"}
              draft={draft}
              onDraftChange={setDraft}
              onStartEdit={() => beginEdit("quote", report.quote)}
              onSave={() => void save("quote")}
              onCancel={() => setEditing(null)}
              aiMarked={isAiWritten(report, "quote")}
              italic
              singleLine
            />
            {/* Tombol perkuat Kutipan sengaja TIDAK dipasang: keputusan pemilik
                2026-10-15 (D11) membatasi tulisan AI ke Ringkasan · Catatan Guru ·
                Rencana depan saja. Kutipan tetap bisa disunting tutor sendiri. */}
          </div>
        </div>
      )}
    </section>
  );
}
