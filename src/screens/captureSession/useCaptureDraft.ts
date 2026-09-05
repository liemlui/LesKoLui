import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteCaptureDraft,
  getCaptureDraftByScope,
  saveCaptureDraft,
  CaptureDraftConflictError,
} from "../../db/repos/captureDraftRepo";
import type { CaptureDraft, CaptureDraftForm } from "../../db/types";

export type CaptureDraftStatus = "loading" | "saved" | "unsaved" | "conflict";

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
  const { scopeKey, phase, savedSessionId, form, onRestore } = options;
  const [status, setStatus] = useState<CaptureDraftStatus>("loading");
  const [pending, setPending] = useState<CaptureDraft | null>(null);
  const draftIdRef = useRef<string>(crypto.randomUUID());
  const revisionRef = useRef(0);
  const hydratedScopeRef = useRef<string | null>(null);
  const writeChainRef = useRef(Promise.resolve());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writeEpochRef = useRef(0);
  const latestRef = useRef(options);
  latestRef.current = options;

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
        setStatus("saved");
      }
    })().catch(() => {
      if (!cancelled) setStatus("unsaved");
    });
    return () => { cancelled = true; };
  }, [scopeKey]);

  const write = useCallback(() => {
    if (hydratedScopeRef.current !== scopeKey) return Promise.resolve();
    const snapshot = latestRef.current;
    const writeEpoch = writeEpochRef.current;
    setStatus("unsaved");
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
        setStatus("saved");
      } catch (error) {
        setStatus(error instanceof CaptureDraftConflictError ? "conflict" : "unsaved");
      }
    });
    writeChainRef.current = operation.catch(() => undefined);
    return operation;
  }, [scopeKey]);

  useEffect(() => {
    if (hydratedScopeRef.current !== scopeKey) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void write(); }, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [form, phase, savedSessionId, scopeKey, write]);

  const resume = useCallback(() => {
    if (!pending) return;
    draftIdRef.current = pending.draftId;
    revisionRef.current = pending.revision;
    hydratedScopeRef.current = pending.scopeKey;
    onRestore(pending);
    setPending(null);
    setStatus("saved");
  }, [onRestore, pending]);

  const discard = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    writeEpochRef.current += 1;
    await writeChainRef.current;
    await deleteCaptureDraft(pending?.draftId ?? draftIdRef.current);
    setPending(null);
    hydratedScopeRef.current = scopeKey;
    setStatus("saved");
  }, [pending, scopeKey]);

  const remove = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    writeEpochRef.current += 1;
    await writeChainRef.current;
    await deleteCaptureDraft(draftIdRef.current);
    hydratedScopeRef.current = null;
    setPending(null);
    setStatus("saved");
  }, []);

  const flush = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await write();
  }, [write]);

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
      if (status === "unsaved" || status === "loading") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [status]);

  return { status, pending, resume, discard, remove, flush, getSnapshot };
}
