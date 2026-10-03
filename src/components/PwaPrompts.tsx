import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  SNOOZE_DAYS_AFTER_DISMISS,
  SNOOZE_DAYS_AFTER_PROMPT,
  STANDALONE_MEDIA_QUERIES,
  isStandaloneLaunch,
  readInstallSnooze,
  safeLocalStorage,
  shouldShowInstallPrompt,
  writeInstallSnooze,
} from "../lib/pwaInstall";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 menit

/** Aplikasi sedang dibuka dari ikon (bukan tab browser)? iOS memakai `navigator.standalone`. */
function detectStandaloneNow(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
  const matches = STANDALONE_MEDIA_QUERIES.map((query) => window.matchMedia(query).matches);
  return isStandaloneLaunch(matches, iosStandalone);
}

export function PwaPrompts() {
  // ── SW auto-update: cek berkala (reload otomatis ditangani registerType autoUpdate) ──
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [chunkError, setChunkError] = useState(false);
  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() { setUpdateReady(true); },
    onRegisteredSW(_swUrl, r) {
      if (!r) return;

      intervalRef.current = setInterval(async () => {
        if (!r.installing && navigator.onLine) {
          try { await r.update(); } catch { /* network error, try again next tick */ }
        }
      }, CHECK_INTERVAL_MS);

      const onVisible = () => {
        if (document.visibilityState === "visible" && !r.installing && navigator.onLine) {
          r.update().catch((e: unknown) => { console.warn("SW update check failed:", e); });
        }
      };
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        document.removeEventListener("visibilitychange", onVisible);
      };
    },
  });

  // Cleanup interval saat unmount
  useEffect(() => {
    const onPreloadError = (event: Event) => {
      event.preventDefault();
      setChunkError(true);
    };
    window.addEventListener("vite:preloadError", onPreloadError);
    return () => window.removeEventListener("vite:preloadError", onPreloadError);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Install prompt ──────────────────────────────────────────────────
  // `snoozed` disimpan di localStorage: di perangkat tanpa Google Play Services (Huawei/EMUI)
  // `appinstalled` tidak pernah menyala, jadi tanpa ini banner kembali setiap reload.
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [snoozed, setSnoozed] = useState(() => readInstallSnooze(safeLocalStorage()));
  const [standalone, setStandalone] = useState(() => detectStandaloneNow());

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); };
    const onInstalled = () => {
      writeInstallSnooze(safeLocalStorage(), Date.now(), SNOOZE_DAYS_AFTER_PROMPT);
      setSnoozed(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Ikuti perubahan mode tampilan (mis. dibuka dari ikon, atau dipindah ke jendela aplikasi).
  useEffect(() => {
    const queries = STANDALONE_MEDIA_QUERIES.map((query) => window.matchMedia(query));
    const sync = () => {
      const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
      setStandalone(isStandaloneLaunch(queries.map((query) => query.matches), iosStandalone));
    };
    sync();
    queries.forEach((query) => query.addEventListener("change", sync));
    return () => queries.forEach((query) => query.removeEventListener("change", sync));
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    deferred.prompt();
    let outcome: "accepted" | "dismissed" = "dismissed";
    try {
      ({ outcome } = await deferred.userChoice);
    } catch {
      /* browser menutup prompt: perlakukan seperti dibatalkan */
    }
    setDeferred(null);
    // Prompt sudah dijalankan — jangan tawarkan lagi, walau `appinstalled` tidak menyala
    // (perangkat tanpa Play Services hanya mendapat pintasan, bukan aplikasi terpasang).
    writeInstallSnooze(
      safeLocalStorage(),
      Date.now(),
      outcome === "accepted" ? SNOOZE_DAYS_AFTER_PROMPT : SNOOZE_DAYS_AFTER_DISMISS,
    );
    setSnoozed(true);
  };

  const dismissInstall = () => {
    writeInstallSnooze(safeLocalStorage(), Date.now(), SNOOZE_DAYS_AFTER_DISMISS);
    setSnoozed(true);
  };

  const showInstall = shouldShowInstallPrompt({ hasPrompt: !!deferred, standalone, snoozed });

  const applyUpdate = async () => {
    const detail: { flushes: Array<() => Promise<void>> } = { flushes: [] };
    window.dispatchEvent(new CustomEvent("leskolui:before-pwa-update", { detail }));
    try {
      await Promise.all(detail.flushes.map((flush) => flush()));
      await updateServiceWorker(true);
    } catch (error) {
      console.warn("PWA update postponed because draft could not be flushed", error);
    }
  };

  const recoverChunk = () => {
    if (sessionStorage.getItem("leskolui_chunk_reload")) return;
    sessionStorage.setItem("leskolui_chunk_reload", "1");
    window.location.reload();
  };

  return (
    <>
      {(updateReady || chunkError) && (
        <div className="fixed top-3 inset-x-3 z-50 mx-auto max-w-md rounded-xl bg-[var(--surface-inverse)] p-3 text-[var(--on-strong)] shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">{chunkError ? "Versi aplikasi perlu dimuat ulang." : "Pembaruan aplikasi siap dipasang."}</p>
            <button type="button" onClick={chunkError ? recoverChunk : () => void applyUpdate()} className="rounded-lg bg-[var(--surface-strong)] px-3 py-2 text-sm font-semibold text-[var(--ink-strong)]">{chunkError ? "Muat ulang" : "Perbarui"}</button>
          </div>
        </div>
      )}
      {/* Install prompt */}
      {showInstall && (
        <div className="fixed inset-x-0 z-50 px-4" style={{ bottom: "calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 0.75rem)" }}>
          <div className="max-w-md mx-auto bg-[var(--brand-solid)] text-[var(--on-strong)] rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Pasang di layar utama</p>
              <p className="text-xs text-[var(--brand-tint-strong)] mt-0.5">Akses lebih cepat tanpa buka browser</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={dismissInstall}
                className="text-[var(--brand-tint-strong)] text-sm px-2 py-2"
              >
                Nanti
              </button>
              <button
                onClick={handleInstall}
                className="bg-[var(--surface-strong)] text-[var(--ink-brand)] font-semibold px-4 py-2 rounded-xl text-sm"
              >
                Pasang
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
