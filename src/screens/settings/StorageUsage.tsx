import { useEffect, useState } from "react";
import { storageUsageState } from "../../lib/settingsPresentation";
import { storageStatus } from "../../lib/settingsStatus";

/**
 * Baris "Penyimpanan Lokal" di Pengaturan.
 *
 * Diekstrak dari `screens/Settings.tsx` (G3-09). Dua hal yang dijaga:
 *
 * 1. **Dirender di SATU tempat saja** (G3-09 butir 8). Sebelumnya blok ini hidup
 *    di dalam layar dan dipanggil dari bagian Aplikasi; sekarang ia satu komponen
 *    yang dipakai baris ringkasan status **dan** bagian Aplikasi, tetapi hanya
 *    **satu** yang merender bilah penuhnya (`compact` untuk yang ringkas).
 * 2. **Gagal mengukur tidak menghilangkan barisnya diam-diam** (audit S-10/S-08):
 *    bila `navigator.storage.estimate()` tidak ada atau menolak, barisnya tetap
 *    muncul dengan kalimat "tidak tersedia" — bukan `null`.
 */
export default function StorageUsage({ compact = false }: { compact?: boolean }) {
  const [info, setInfo] = useState<{ used: number; quota: number } | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!navigator.storage?.estimate) { setUnavailable(true); return; }
    navigator.storage.estimate()
      .then((e) => {
        if (cancelled) return;
        if (storageUsageState(e) === "ready") setInfo({ used: e.usage ?? 0, quota: e.quota ?? 0 });
        else setUnavailable(true);
      })
      .catch(() => { if (!cancelled) setUnavailable(true); });
    return () => { cancelled = true; };
  }, []);

  const state = storageStatus({ used: info?.used, quota: info?.quota });
  const mb = (b: number) => (b / 1024 / 1024).toFixed(1) + " MB";

  // Mode ringkas dipakai baris status tiga baris di bawah judul: hanya persentase.
  if (compact) {
    return (
      <span className={state.tone === "warn" ? "text-[var(--ink-warn)] font-medium" : "text-[var(--ink-muted)]"}>
        {state.text}
      </span>
    );
  }

  return (
    <div className="bg-[var(--surface)] rounded-xl p-3 space-y-1">
      <p className="text-xs font-semibold text-[var(--ink-muted)]">Penyimpanan Lokal</p>
      {info ? (
        <>
          <div className="w-full bg-[var(--bg-subtle)] rounded-full h-2">
            <div className="bg-[var(--brand-solid)] h-2 rounded-full transition-all" style={{ width: `${Math.min(state.pct ?? 0, 100)}%` }} />
          </div>
          <p className="text-xs text-[var(--ink-muted)]">{mb(info.used)} digunakan dari {mb(info.quota)} ({state.pct}%)</p>
        </>
      ) : unavailable ? (
        <p className="text-xs text-[var(--ink-muted)]">Perkiraan penyimpanan tidak tersedia di browser ini</p>
      ) : (
        <p className="text-xs text-[var(--ink-muted)]">Menghitung pemakaian penyimpanan...</p>
      )}
      {/* G3-07: foto murid sudah dikecilkan saat diunggah, jadi ia tidak punya
          perawatan otomatis seperti foto sesi — tetapi ia IKUT berkas backup,
          dan itu perlu dikatakan di layar tempat tutor mengurus penyimpanan. */}
      <p className="text-xs leading-relaxed text-[var(--ink-muted)]">
        Foto murid (maksimal 640 piksel) dan foto sesi ikut terhitung di sini dan ikut masuk berkas
        backup. Foto murid tidak masuk laporan PDF.
      </p>
    </div>
  );
}
