import { useEffect, useState } from "react";
import { APP_VERSION, CHANGELOG, type ChangelogEntry } from "../lib/version";

const STORAGE_KEY = "leskolui-last-seen-version";

function getLastSeen(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function setLastSeen(version: string) {
  try {
    localStorage.setItem(STORAGE_KEY, version);
  } catch {
    // Silently ignore — best effort
  }
}

export default function ChangelogModal() {
  const [entry, setEntry] = useState<ChangelogEntry | null>(null);

  useEffect(() => {
    const lastSeen = getLastSeen();
    if (lastSeen === APP_VERSION) return;

    const current = CHANGELOG.find((c) => c.version === APP_VERSION);
    if (current) {
      setEntry(current);
    } else {
      // No changelog for this version — still mark as seen
      setLastSeen(APP_VERSION);
    }
  }, []);

  const handleClose = () => {
    setLastSeen(APP_VERSION);
    setEntry(null);
  };

  if (!entry) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Catatan perubahan" className="fixed inset-0 z-[90] bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 px-5 pt-6 pb-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">✨</span>
            <p className="text-xs font-semibold tracking-wide opacity-80">{entry.date}</p>
          </div>
          <p className="font-bold text-xl leading-tight">{entry.title}</p>
          <p className="text-sm opacity-80 mt-1">Versi {entry.version}</p>
        </div>

        {/* Items */}
        <div className="px-5 py-4 max-h-[50vh] overflow-y-auto">
          <ul className="space-y-3">
            {entry.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="text-blue-500 text-sm mt-0.5 flex-shrink-0">✦</span>
                <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2">
          <button
            onClick={handleClose}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
          >
            Mengerti, Terima Kasih ✨
          </button>
        </div>
      </div>
    </div>
  );
}
