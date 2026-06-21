import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaPrompts() {
  // SW update
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  // Install prompt
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

  return (
    <>
      {/* Update available */}
      {needRefresh && (
        <div className="fixed bottom-20 left-4 right-4 z-50 bg-gray-900 text-white rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Versi baru tersedia</p>
            <p className="text-xs text-gray-400 mt-0.5">Tap perbarui untuk menggunakan fitur terbaru</p>
          </div>
          <button
            onClick={() => updateServiceWorker(true)}
            className="bg-blue-500 hover:bg-blue-400 text-white font-semibold px-4 py-2 rounded-xl text-sm whitespace-nowrap flex-shrink-0"
          >
            Perbarui
          </button>
        </div>
      )}

      {/* Install banner — hanya tampil kalau tidak ada update prompt */}
      {!needRefresh && showInstall && (
        <div className="fixed bottom-20 left-4 right-4 z-50 bg-blue-600 text-white rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3">
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
      )}
    </>
  );
}
