import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 menit

export function PwaPrompts() {
  // ── SW auto-update: cek berkala + onNeedRefresh ─────────────────────
  const [showUpdate, setShowUpdate] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onNeedRefresh() {
      setNeedRefresh(true);
      setShowUpdate(true);
    },
    onRegisteredSW(_swUrl, r) {
      if (!r) return;

      // Cek update tiap 5 menit (lebih cepat dari 1 jam sebelumnya)
      intervalRef.current = setInterval(async () => {
        if (!r.installing && navigator.onLine) {
          try { await r.update(); } catch { /* network error, try again next tick */ }
        }
      }, CHECK_INTERVAL_MS);

      // Cek update saat tab dapat fokus kembali (user balik ke app)
      const onVisible = () => {
        if (document.visibilityState === "visible" && !r.installing && navigator.onLine) {
          r.update().catch(() => {});
        }
      };
      document.addEventListener("visibilitychange", onVisible);
      // cleanup di return bawah
      const origCleanup = () => document.removeEventListener("visibilitychange", onVisible);
      const origInterval = intervalRef.current;
      // Override cleanup untuk tambahan listener
      return () => {
        if (origInterval) clearInterval(origInterval);
        origCleanup();
      };
    },
  });

  // Cleanup interval saat unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleReload = async () => {
    await updateServiceWorker(true); // skipWaiting + reload
  };

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
  const shouldShowUpdate = showUpdate || needRefresh;

  return (
    <>
      {/* Update toast */}
      {shouldShowUpdate && (
        <div className="fixed bottom-20 inset-x-0 z-50 px-4">
          <div className="max-w-md mx-auto bg-green-600 text-white rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3 animate-bounce">
            <div>
              <p className="text-sm font-semibold">🆕 Versi baru tersedia!</p>
              <p className="text-xs text-green-200 mt-0.5">Muat ulang untuk dapat fitur terbaru</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => { setShowUpdate(false); setNeedRefresh(false); }}
                className="text-green-200 text-sm px-2 py-2"
              >
                Nanti
              </button>
              <button
                onClick={handleReload}
                className="bg-white text-green-700 font-semibold px-4 py-2 rounded-xl text-sm"
              >
                Muat Ulang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Install prompt */}
      {showInstall && (
        <div className="fixed bottom-20 inset-x-0 z-50 px-4">
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
