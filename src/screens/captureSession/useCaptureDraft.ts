import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteCaptureDraft,
  getCaptureDraft,
  getCaptureDraftByScope,
  saveCaptureDraft,
  CaptureDraftConflictError,
} from "../../db/repos/captureDraftRepo";
import type { CaptureDraft, CaptureDraftForm } from "../../db/types";
import { captureDraftPersistKey, captureDraftPersistKeyOf, shouldPersistDraft } from "../../lib/captureDraftDigest";

/**
 * `saving` = penulisan sedang berjalan (transien, BUKAN galat) — jangan dipakai
 * untuk menampilkan peringatan; hanya `unsaved`/`conflict` yang berarti gagal.
 */
export type CaptureDraftStatus = "loading" | "saving" | "saved" | "unsaved" | "conflict";

interface UseCaptureDraftOptions {
  scopeKey: string;
  studentId?: string;
  scheduleId?: string;
  phase: CaptureDraft["phase"];
  savedSessionId?: string;
  form: CaptureDraftForm;
  onRestore: (draft: CaptureDraft) => void;
}

export default function useCaptureDraft(options: UseCaptureDraftOptions) {
  const { scopeKey, phase, savedSessionId, form } = options;
  const [status, setStatus] = useState<CaptureDraftStatus>("loading");
  const [pending, setPending] = useState<CaptureDraft | null>(null);
  const draftIdRef = useRef<string>(crypto.randomUUID());
  const revisionRef = useRef(0);
  const hydratedScopeRef = useRef<string | null>(null);
  const writeChainRef = useRef(Promise.resolve());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writeEpochRef = useRef(0);
  /** Kunci isi yang sudah ada di penyimpanan — penjaga anti-tulis-berulang (C-17). */
  const persistedKeyRef = useRef<string | null>(null);
  const pendingRef = useRef<CaptureDraft | null>(null);
  const latestRef = useRef(options);
  latestRef.current = options;
  pendingRef.current = pending;

  // Kunci persistensi dihitung dari ISI, bukan identitas objek form.
  const persistKey = captureDraftPersistKey(form, phase, savedSessionId);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setPending(null);
    hydratedScopeRef.current = null;
    (async () => {
      const existing = await getCaptureDraftByScope(scopeKey);
      if (cancelled) return;
      if (existing) {
        draftIdRef.current = existing.draftId;
        revisionRef.current = existing.revision;
        setPending(existing);
      } else {
        draftIdRef.current = crypto.randomUUID();
        revisionRef.current = 0;
        hydratedScopeRef.current = scopeKey;
        // Anggap isi awal (form kosong) sudah "tersimpan" supaya membuka
        // halaman lalu pergi tidak membuat baris draf kosong.
        persistedKeyRef.current = captureDraftPersistKey(
          latestRef.current.form,
          latestRef.current.phase,
          latestRef.current.savedSessionId,
        );
        setStatus("saved");
      }
    })().catch(() => {
      if (!cancelled) setStatus("unsaved");
    });
    return () => { cancelled = true; };
  }, [scopeKey]);

  /**
   * Tulis draf bila isinya berubah. Aman dipanggil berkali-kali: penulisan
   * dilewati saat isi sama dengan yang sudah tersimpan, dan penulisan
   * berurutan diserialkan lewat `writeChainRef`.
   */
  const write = useCallback(() => {
    const snapshot = latestRef.current;
    if (hydratedScopeRef.current !== snapshot.scopeKey) return Promise.resolve();
    const key = captureDraftPersistKey(snapshot.form, snapshot.phase, snapshot.savedSessionId);
    if (!shouldPersistDraft(true, persistedKeyRef.current, key)) return Promise.resolve();
    const writeEpoch = writeEpochRef.current;
    setStatus("saving");
    const operation = writeChainRef.current.then(async () => {
      try {
        if (writeEpoch !== writeEpochRef.current) return;
        const saved = await saveCaptureDraft({
          draftId: draftIdRef.current,
          formatVersion: 1,
          scopeKey: snapshot.scopeKey,
          studentId: snapshot.studentId,
          scheduleId: snapshot.scheduleId,
          phase: snapshot.phase,
          savedSessionId: snapshot.savedSessionId,
          form: snapshot.form,
        }, revisionRef.current);
        revisionRef.current = saved.revision;
        persistedKeyRef.current = key;
        setStatus("saved");
      } catch (error) {
        setStatus(error instanceof CaptureDraftConflictError ? "conflict" : "unsaved");
      }
    });
    writeChainRef.current = operation.catch(() => undefined);
    return operation;
  }, []);

  useEffect(() => {
    if (hydratedScopeRef.current !== scopeKey) return;
    if (!shouldPersistDraft(true, persistedKeyRef.current, persistKey)) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void write(); }, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [persistKey, scopeKey, write]);

  const resume = useCallback(() => {
    const draft = pendingRef.current;
    if (!draft) return;
    draftIdRef.current = draft.draftId;
    revisionRef.current = draft.revision;
    hydratedScopeRef.current = draft.scopeKey;
    persistedKeyRef.current = captureDraftPersistKeyOf(draft);
    latestRef.current.onRestore(draft);
    setPending(null);
    setStatus("saved");
  }, []);

  const discard = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    writeEpochRef.current += 1;
    await writeChainRef.current;
    await deleteCaptureDraft(pendingRef.current?.draftId ?? draftIdRef.current);
    const snapshot = latestRef.current;
    // Draf lama sudah dihapus → identitas & revisi HARUS direset. Tanpa ini,
    // penulisan berikutnya memakai revisi draf yang sudah tidak ada sehingga
    // selalu CaptureDraftConflictError (ditemukan saat verifikasi alur
    // "Buang draf & mulai baru" → isi form → Simpan).
    draftIdRef.current = crypto.randomUUID();
    revisionRef.current = 0;
    setPending(null);
    hydratedScopeRef.current = snapshot.scopeKey;
    // Isi yang ada di layar dianggap sudah "tersimpan" agar tidak langsung
    // ditulis ulang; draf baru muncul lagi setelah pengguna mengubah data.
    persistedKeyRef.current = captureDraftPersistKey(snapshot.form, snapshot.phase, snapshot.savedSessionId);
    setStatus("saved");
  }, []);

  const remove = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    writeEpochRef.current += 1;
    await writeChainRef.current;
    await deleteCaptureDraft(draftIdRef.current);
    hydratedScopeRef.current = null;
    persistedKeyRef.current = null;
    setPending(null);
    setStatus("saved");
  }, []);

  const flush = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await write();
  }, [write]);

  /**
   * Selaraskan revisi & isi dengan yang ada di penyimpanan.
   *
   * Dipakai setelah repositori menulis draf lewat jalur lain (mis.
   * `createSessionWithCloseoutDraft` menyimpan fase `closeout`). Tanpa ini,
   * penulisan berikutnya dari hook memakai revisi lama → CaptureDraftConflictError
   * palsu, padahal tidak ada tab lain yang mengubah apa pun.
   */
  const syncFromStore = useCallback(async () => {
    const stored = await getCaptureDraft(draftIdRef.current);
    if (!stored) return;
    revisionRef.current = stored.revision;
    persistedKeyRef.current = captureDraftPersistKeyOf(stored);
    draftIdRef.current = stored.draftId;
  }, []);

  /** Ulangi penulisan setelah kegagalan (aksi tombol pada pesan "belum tersimpan"). */
  const retry = useCallback(async () => {
    persistedKeyRef.current = null;
    setStatus("saved");
    await flush();
  }, [flush]);

  /** Konflik: muat versi terbaru dari penyimpanan dan pakai itu. */
  const reload = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    writeEpochRef.current += 1;
    await writeChainRef.current;
    const scopeKeyNow = latestRef.current.scopeKey;
    const existing = await getCaptureDraftByScope(scopeKeyNow);
    hydratedScopeRef.current = scopeKeyNow;
    if (existing) {
      draftIdRef.current = existing.draftId;
      revisionRef.current = existing.revision;
      persistedKeyRef.current = captureDraftPersistKeyOf(existing);
      latestRef.current.onRestore(existing);
    } else {
      revisionRef.current = 0;
      persistedKeyRef.current = null;
    }
    setPending(null);
    setStatus("saved");
  }, []);

  /** Konflik: pertahankan versi di layar, buang versi tersimpan, tulis ulang. */
  const overwrite = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    writeEpochRef.current += 1;
    await writeChainRef.current;
    await deleteCaptureDraft(draftIdRef.current);
    revisionRef.current = 0;
    persistedKeyRef.current = null;
    hydratedScopeRef.current = latestRef.current.scopeKey;
    setStatus("saved");
    await flush();
  }, [flush]);

  const getSnapshot = useCallback((): CaptureDraft => ({
    draftId: draftIdRef.current,
    formatVersion: 1,
    revision: revisionRef.current,
    updatedAt: new Date().toISOString(),
    scopeKey: latestRef.current.scopeKey,
    studentId: latestRef.current.studentId,
    scheduleId: latestRef.current.scheduleId,
    phase: latestRef.current.phase,
    savedSessionId: latestRef.current.savedSessionId,
    form: latestRef.current.form,
  }), []);

  useEffect(() => {
    const onBeforeUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ flushes: Array<() => Promise<void>> }>).detail;
      detail.flushes.push(flush);
    };
    window.addEventListener("leskolui:before-pwa-update", onBeforeUpdate);
    return () => window.removeEventListener("leskolui:before-pwa-update", onBeforeUpdate);
  }, [flush]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      // "saving" juga dilindungi: penulisan yang sedang berjalan belum tentu selesai.
      if (status === "unsaved" || status === "loading" || status === "saving") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [status]);

  return { status, pending, resume, discard, remove, flush, retry, reload, overwrite, syncFromStore, getSnapshot };
}
