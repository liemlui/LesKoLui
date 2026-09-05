import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 menit

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
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") setInstalled(true);
  };

  const showInstall = !installed && !dismissed && !!deferred;

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
        <div className="fixed top-3 inset-x-3 z-50 mx-auto max-w-md rounded-xl bg-gray-900 p-3 text-white shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">{chunkError ? "Versi aplikasi perlu dimuat ulang." : "Pembaruan aplikasi siap dipasang."}</p>
            <button type="button" onClick={chunkError ? recoverChunk : () => void applyUpdate()} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900">{chunkError ? "Muat ulang" : "Perbarui"}</button>
          </div>
        </div>
      )}
      {/* Install prompt */}
      {showInstall && (
        <div className="fixed inset-x-0 z-50 px-4" style={{ bottom: "calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 0.75rem)" }}>
          <div className="max-w-md mx-auto bg-blue-600 text-white rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Pasang di layar utama</p>
              <p className="text-xs text-blue-200 mt-0.5">Akses lebih cepat tanpa buka browser</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setDismissed(true)}
                className="text-blue-200 text-sm px-2 py-2"
              >
                Nanti
              </button>
              <button
                onClick={handleInstall}
                className="bg-white text-blue-600 font-semibold px-4 py-2 rounded-xl text-sm"
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
