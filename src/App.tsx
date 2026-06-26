import { useEffect, lazy, Suspense, useState, useCallback } from "react";
import { createBrowserRouter, RouterProvider, Outlet, Navigate, useNavigate } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import { PwaPrompts } from "./components/PwaPrompts";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider, useToastCtx } from "./components/ToastProvider";
import ToastContainer from "./components/Toast";
import { todayWIB } from "./lib/format";

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
const Tugas = lazy(() => import("./screens/Tugas"));
const Settings = lazy(() => import("./screens/Settings"));

const AUTO_BACKUP_KEY = "leskolui_last_auto_backup_prompt";
const AUTO_BACKUP_INTERVAL_DAYS = 7;

function Layout() {
  const navigate = useNavigate();
  const [offline, setOffline] = useState(!navigator.onLine);
  const [backupPrompt, setBackupPrompt] = useState(false);

  // Offline indicator
  useEffect(() => {
    const on  = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Notifikasi PR jatuh tempo (Web Notifications)
  const scheduleHwNotifications = useCallback(async () => {
    if (Notification.permission !== "granted") return;
    const r = await appData();
    const today = todayWIB();

    // PR deadline hari ini
    const homeworks = await r.listAllPendingHomework();
    const dueToday = homeworks.filter((h) => h.status === "assigned" && h.dueAt === today);
    if (dueToday.length > 0) {
      new Notification("Les Ko Lui — PR Hari Ini", {
        body: `${dueToday.length} PR deadline hari ini: ${dueToday.map(h => h.title).slice(0, 2).join(", ")}${dueToday.length > 2 ? "..." : ""}`,
        icon: "/icon-192.png",
      });
    }

    // Sesi besok (H-1 reminder)
    const [y, m, d] = today.split("-").map(Number);
    const tomorrowDt = new Date(y, m - 1, d + 1);
    const tomorrow = `${tomorrowDt.getFullYear()}-${String(tomorrowDt.getMonth() + 1).padStart(2, "0")}-${String(tomorrowDt.getDate()).padStart(2, "0")}`;
    const upcoming = await r.listAllUpcomingScheduled(tomorrow);
    const sessTomorrow = upcoming.filter((s) => s.date === tomorrow);
    if (sessTomorrow.length > 0) {
      const studentList = await r.listStudents(true);
      const studentMap  = new Map(studentList.map((s) => [s.id, s.name]));
      const names = sessTomorrow.map((s) => studentMap.get(s.studentId) ?? "—").slice(0, 3);
      new Notification("Les Ko Lui — Sesi Besok", {
        body: `${sessTomorrow.length} sesi besok: ${names.join(", ")}${sessTomorrow.length > 3 ? "..." : ""}`,
        icon: "/icon-192.png",
      });
    }
  }, []);

  // Backup otomatis mingguan — tanya user
  const checkAutoBackup = useCallback(() => {
    const last = localStorage.getItem(AUTO_BACKUP_KEY);
    if (!last) { setBackupPrompt(true); return; }
    const daysSince = (Date.now() - Number(last)) / 86400000;
    if (daysSince >= AUTO_BACKUP_INTERVAL_DAYS) setBackupPrompt(true);
  }, []);

  useEffect(() => {
    appData().then((r) => r.initSettings());
    if (navigator.storage?.persist) navigator.storage.persist();

    // Request notification permission then schedule hw notifications
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((p) => {
        if (p === "granted") scheduleHwNotifications();
      });
    } else {
      scheduleHwNotifications();
    }

    // Check auto backup
    checkAutoBackup();
  }, [scheduleHwNotifications, checkAutoBackup]);

  return (
    <ErrorBoundary>
    <ToastProvider>
    <ToastOverlay />
    <div className="max-w-md mx-auto min-h-screen pb-16">
      {/* Offline banner */}
      {offline && (
        <div className="fixed top-0 inset-x-0 z-[200] px-4 pt-2">
          <div className="max-w-md mx-auto bg-gray-800 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg">
            <span>📵</span> Offline — data tetap aman, perubahan disimpan lokal
          </div>
        </div>
      )}

      {/* Auto backup prompt */}
      {backupPrompt && (
        <div className="fixed top-4 inset-x-0 z-[150] px-4">
          <div className="max-w-md mx-auto bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 shadow-xl flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-800">💾 Saatnya backup mingguan</p>
              <p className="text-xs text-amber-600 mt-0.5">Lindungi datamu dengan file backup terenkripsi</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  const remindTomorrow = Date.now() - (AUTO_BACKUP_INTERVAL_DAYS - 1) * 86400000;
                  localStorage.setItem(AUTO_BACKUP_KEY, String(remindTomorrow));
                  setBackupPrompt(false);
                }}
                className="text-xs text-amber-500 px-2 py-1.5">Nanti</button>
              <button
                onClick={() => { localStorage.setItem(AUTO_BACKUP_KEY, String(Date.now())); setBackupPrompt(false); navigate("/settings"); }}
                className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl">Backup</button>
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={<div className="p-4 text-gray-400 text-sm">Memuat...</div>}>
        <Outlet />
      </Suspense>
      <BottomNav />
      <PwaPrompts />
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
      { path: "/tugas", element: <Tugas /> },
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
