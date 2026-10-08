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
}

export default function ReportTextsPanel({
  open, onToggle, report, scopeKey, onSaveField, onGenerateFree,
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
          </div>

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
        </div>
      )}
    </section>
  );
}
