import { useEffect, lazy, Suspense, useState, useCallback } from "react";
import { createBrowserRouter, RouterProvider, Outlet, Navigate, useNavigate } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import { PwaPrompts } from "./components/PwaPrompts";
import ChangelogModal from "./components/ChangelogModal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Skeleton from "./components/Skeleton";
import { ToastProvider, useToastCtx } from "./components/ToastProvider";
import ToastContainer from "./components/Toast";
import { isQuotaError, isStorageNearFull } from "./lib/storageGuard";
import { Z } from "./lib/zIndex";

// Lazy-load startup data after mount so the first paint only carries the app shell.
type AppDataModule = typeof import("./lib/appData");
let _appData: AppDataModule | undefined;
function appData(): Promise<AppDataModule> {
  return _appData ? Promise.resolve(_appData) : import("./lib/appData").then((m) => (_appData = m));
}

// Lazy-load route screens to keep shared data and feature code out of the entry chunk.
const Home = lazy(() => import("./screens/home/Home"));
const Students = lazy(() => import("./screens/Students"));
const StudentDetail = lazy(() => import("./screens/StudentDetail"));
const CaptureSession = lazy(() => import("./screens/CaptureSession"));
const MonthlyReport = lazy(() => import("./screens/MonthlyReport"));
const Payments = lazy(() => import("./screens/Payments"));
const Tugas = lazy(() => import("./screens/CatatanBelajar"));
const Settings = lazy(() => import("./screens/Settings"));

const AUTO_BACKUP_KEY = "leskolui_last_auto_backup_prompt";
const AUTO_BACKUP_INTERVAL_DAYS = 7;
const STALE_BACKUP_DAYS = 14; // ambang peringatan keras "backup menua"
const DRIVE_AUTO_KEY = "leskolui_drive_auto";
const DRIVE_PASS_KEY = "leskolui_drive_pass";
const driveAutoOn = () => localStorage.getItem(DRIVE_AUTO_KEY) === "1" && !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

function Layout() {
  const navigate = useNavigate();
  const [offline, setOffline] = useState(!navigator.onLine);
  const [backupPrompt, setBackupPrompt] = useState(false);
  const [driveBusy, setDriveBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [storageWarn, setStorageWarn] = useState(false);
  const [staleBackup, setStaleBackup] = useState<{ days: number | null } | null>(null);

  // Offline indicator
  useEffect(() => {
    const on  = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Backup otomatis mingguan — tanya user
  const checkAutoBackup = useCallback(() => {
    const last = localStorage.getItem(AUTO_BACKUP_KEY);
    if (!last) { setBackupPrompt(true); return; }
    const daysSince = (Date.now() - Number(last)) / 86400000;
    if (daysSince >= AUTO_BACKUP_INTERVAL_DAYS) setBackupPrompt(true);
  }, []);

  // Backup 1-tap ke Drive dari prompt mingguan (passphrase tersimpan di perangkat)
  const doReminderDriveBackup = useCallback(async () => {
    const pass = localStorage.getItem(DRIVE_PASS_KEY) || "";
    if (pass.length < 8) { setBackupPrompt(false); navigate("/settings"); return; }
    setDriveBusy(true);
    try {
      const mod = await import("./lib/driveBackup");
      await mod.performDriveBackup(pass);
      localStorage.setItem(AUTO_BACKUP_KEY, String(Date.now()));
      setBackupPrompt(false);
      setFlash("Backup ke Drive berhasil ✓");
    } catch (e) {
      setFlash("Backup Drive gagal: " + ((e as Error).message || "coba lagi di Pengaturan"));
    } finally {
      setDriveBusy(false);
    }
  }, [navigate]);

  // Prefetch modul Drive + GIS saat prompt muncul agar tap-nya responsif
  useEffect(() => {
    if (backupPrompt && driveAutoOn()) {
      import("./lib/driveBackup").then((m) => m.preloadDrive()).catch((e: unknown) => { console.warn("driveBackup preload failed:", e); });
    }
  }, [backupPrompt]);

  // Auto-dismiss flash
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(""), 3000);
    return () => clearTimeout(t);
  }, [flash]);

  // Peringatan kuota penyimpanan: cegah kehilangan data senyap di app offline-first.
  useEffect(() => {
    const onReject = (ev: PromiseRejectionEvent) => {
      if (isQuotaError(ev.reason)) { ev.preventDefault(); setStorageWarn(true); }
    };
    window.addEventListener("unhandledrejection", onReject);
    return () => window.removeEventListener("unhandledrejection", onReject);
  }, []);

  useEffect(() => {
    appData().then((r) => r.initSettings()).catch((e: unknown) => { console.warn("initSettings failed:", e); });
    // Minta penyimpanan persisten (anti-eviction). persist() sering false sampai PWA
    // di-install — itu normal, jadi JANGAN warn di situ; cukup peringatkan kalau
    // penyimpanan sudah mendekati penuh.
    navigator.storage?.persist?.();
    isStorageNearFull().then((full) => { if (full) setStorageWarn(true); });

    // Check auto backup
    checkAutoBackup();

    // Backup senyap (relay) saat due — atau fallback peringatan "backup menua".
    void (async () => {
      const r = await appData();
      const students = await r.listStudents(true);
      if (students.length === 0) return; // app baru / kosong → jangan nag
      const s = await r.getSettings();
      const lastMs = s.lastBackupAt ? new Date(s.lastBackupAt).getTime() : 0;
      const due = !s.lastBackupAt || Date.now() - lastMs >= AUTO_BACKUP_INTERVAL_DAYS * 86400000;

      const mod = await import("./lib/driveBackup");
      if (mod.isRelayConfigured() && navigator.onLine) {
        const pass = localStorage.getItem(DRIVE_PASS_KEY) || "";
        if (!due) return;                       // relay aktif & masih segar → aman
        if (pass.length >= 8) {
          try {
            await mod.performDriveBackup(pass);  // SENYAP, tanpa popup
            localStorage.setItem(AUTO_BACKUP_KEY, String(Date.now()));
            setBackupPrompt(false);
            setFlash("Backup otomatis ke Drive ✓");
            return;
          } catch { /* gagal → jatuh ke peringatan menua */ }
        }
      }

      // Fallback: peringatan keras kalau backup sudah lama / belum pernah.
      if (!s.lastBackupAt) { setStaleBackup({ days: null }); return; }
      const days = Math.floor((Date.now() - lastMs) / 86400000);
      if (days >= STALE_BACKUP_DAYS) setStaleBackup({ days });
    })().catch((e: unknown) => { console.warn("auto-backup/silent relay failed:", e); });
  }, [checkAutoBackup]);

  return (
    <ErrorBoundary>
    <ToastProvider>
    <ToastOverlay />
    {/* pb ekstra saat banner backup tampil — agar konten terbawah tetap bisa
        di-scroll keluar dari balik banner (banner+nav ≈ 150px) */}
    <div className={`max-w-md mx-auto min-h-screen ${backupPrompt ? "pb-40" : "pb-16"}`}>
      {/* Offline banner */}
      {offline && (
        <div className={`fixed top-0 inset-x-0 ${Z.toast} px-4 pt-2`}>
          <div className="max-w-md mx-auto bg-gray-800 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg">
            <span>📵</span> Offline — data tetap aman, perubahan disimpan lokal
          </div>
        </div>
      )}

      {/* Peringatan penyimpanan penuh — risiko kehilangan data (persistent, bisa ditutup) */}
      {storageWarn && (
        <div className={`fixed top-0 inset-x-0 ${Z.bannerTop} px-4 pt-2`}>
          <div className="max-w-md mx-auto bg-red-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg">
            <span>⚠️</span>
            <span className="flex-1">Penyimpanan hampir penuh — ekspor backup lalu hapus data/foto lama agar data baru tak gagal tersimpan.</span>
            <button onClick={() => setStorageWarn(false)} className="font-bold px-1" aria-label="Tutup peringatan"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
        </div>
      )}

      {/* Peringatan backup menua — risiko kehilangan data bila HP hilang/rusak */}
      {staleBackup && !storageWarn && (
        <div className={`fixed top-0 inset-x-0 ${Z.banner} px-4 pt-2`}>
          <div className="max-w-md mx-auto bg-red-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg">
            <span>🛟</span>
            <span className="flex-1">
              {staleBackup.days === null
                ? "Datamu belum pernah di-backup. Lindungi dari kehilangan HP/kerusakan."
                : `Backup terakhir ${staleBackup.days} hari lalu. Segera backup agar datamu aman.`}
            </span>
            <button onClick={() => { setStaleBackup(null); navigate("/settings"); }} className="bg-white/20 px-2 py-1 rounded-lg font-bold">Backup</button>
            <button onClick={() => setStaleBackup(null)} className="font-bold px-1" aria-label="Tutup peringatan"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
        </div>
      )}

      {/* Flash hasil aksi (mis. backup Drive) */}
      {flash && (
        <div className={`fixed bottom-20 inset-x-0 ${Z.flash} px-4`}>
          <div className="max-w-md mx-auto bg-gray-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg text-center" role="status" aria-live="polite">{flash}</div>
        </div>
      )}

      {/* Auto backup prompt — di BAWAH (atas bottom-nav) agar tidak menutupi
          header/form halaman (di /report sempat menutup selector murid+bulan).
          z-[55]: di atas nav (z-50) tapi DI BAWAH semua modal (Modal z-60,
          Changelog z-90) — nag tidak boleh menghalangi tombol modal. */}
      {backupPrompt && (
        <div className={`fixed bottom-20 inset-x-0 ${Z.nag} px-4`}>
          <div className="max-w-md mx-auto bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 shadow-xl flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-800">💾 Saatnya backup mingguan</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {driveAutoOn() ? "Backup terenkripsi langsung ke Google Drive" : "Lindungi datamu dengan file backup terenkripsi"}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  const remindTomorrow = Date.now() - (AUTO_BACKUP_INTERVAL_DAYS - 1) * 86400000;
                  localStorage.setItem(AUTO_BACKUP_KEY, String(remindTomorrow));
                  setBackupPrompt(false);
                }}
                className="text-xs text-amber-500 px-2 py-1.5">Nanti</button>
              {driveAutoOn() ? (
                <button
                  disabled={driveBusy}
                  onClick={doReminderDriveBackup}
                  className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl disabled:opacity-60">
                  {driveBusy ? "..." : "☁️ Backup ke Drive"}
                </button>
              ) : (
                <button
                  onClick={() => { localStorage.setItem(AUTO_BACKUP_KEY, String(Date.now())); setBackupPrompt(false); navigate("/settings"); }}
                  className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl">Backup</button>
              )}
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={<div className="p-4 space-y-4"><Skeleton variant="card" /><Skeleton variant="text" lines={4} /></div>}>
        <Outlet />
      </Suspense>
      <BottomNav />
      <PwaPrompts />
      <ChangelogModal />
    </div>
    </ToastProvider>
    </ErrorBoundary>
  );
}

/** Reads toast state from context and renders the container. */
function ToastOverlay() {
  const { toasts, dismiss } = useToastCtx();
  return <ToastContainer toasts={toasts} onDismiss={dismiss} />;
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/students", element: <Students /> },
      { path: "/students/:id", element: <StudentDetail /> },
      { path: "/capture", element: <CaptureSession /> },
      { path: "/catatan", element: <Tugas /> },
      { path: "/report", element: <MonthlyReport /> },
      { path: "/payments", element: <Payments /> },
      { path: "/settings", element: <Settings /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
