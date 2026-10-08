/**
 * Penyimpanan narasi otomatis setelah tutor berhenti mengetik (G3-05 butir 9).
 *
 * Kenapa otomatis: sebelum ini narasi hanya tersimpan bila tombol "Simpan"
 * ditekan, sehingga menutup panel atau berpindah murid bisa membuang tulisan.
 * Yang tersimpan otomatis **hanya** narasi sesi — total laporan yang sudah
 * difinalkan tidak ikut berubah karena penyimpanan ini (syarat selesai G3-05).
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type NarrativeSaveState = "idle" | "pending" | "saving" | "saved" | "error";

export interface NarrativeDraft {
  id: string;
  text: string;
}

/** Label waktu simpan untuk status "Tersimpan 14:03". */
export function narrativeSavedLabel(savedAt: string | null): string | undefined {
  if (!savedAt) return undefined;
  const time = new Date(savedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return `Tersimpan ${time}`;
}

export function useNarrativeAutosave(opts: {
  /** Narasi yang sedang disunting; null = tidak ada yang disunting. */
  draft: NarrativeDraft | null;
  /** Nilai yang tersimpan di basis data untuk sesi itu. */
  storedText: string | undefined;
  onSave: (id: string, text: string) => Promise<void>;
  delayMs?: number;
}) {
  const { draft, storedText, onSave, delayMs = 900 } = opts;
  const [state, setState] = useState<NarrativeSaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const saveRef = useRef(onSave);
  const draftRef = useRef(draft);
  const storedRef = useRef(storedText);
  useEffect(() => { saveRef.current = onSave; }, [onSave]);
  useEffect(() => { draftRef.current = draft; }, [draft]);
  useEffect(() => { storedRef.current = storedText; }, [storedText]);

  const changed = Boolean(draft && draft.text !== (storedText ?? ""));

  const persist = useCallback(async (current: NarrativeDraft) => {
    setState("saving");
    try {
      await saveRef.current(current.id, current.text);
      setState("saved");
      setSavedAt(new Date().toISOString());
    } catch {
      setState("error");
    }
  }, []);

  // Berhenti mengetik → simpan. Timer dibatalkan setiap ketukan berikutnya.
  useEffect(() => {
    if (!draft || !changed) return;
    setState("pending");
    const handle = window.setTimeout(() => { void persist(draft); }, delayMs);
    return () => window.clearTimeout(handle);
  }, [draft, changed, delayMs, persist]);

  /** Simpan sekarang juga — dipakai sebelum panel ditutup atau cakupan berpindah. */
  const flush = useCallback(async () => {
    const current = draftRef.current;
    if (!current || current.text === (storedRef.current ?? "")) return;
    await persist(current);
  }, [persist]);

  return {
    state,
    savedAt,
    /** Ada perubahan yang belum tersimpan di basis data (termasuk yang sedang disimpan). */
    unsaved: changed || state === "saving",
    flush,
  };
}
