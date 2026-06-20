import { useEffect, useState } from "react";
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from "react-router-dom";
import { initSettings } from "./db/repos";
import BottomNav from "./components/BottomNav";
import Home from "./screens/Home";
import Students from "./screens/Students";
import StudentDetail from "./screens/StudentDetail";
import CaptureSession from "./screens/CaptureSession";
import MonthlyReport from "./screens/MonthlyReport";
import Settings from "./screens/Settings";

function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
    };
    const installedHandler = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    deferred.prompt();
    const result = await deferred.userChoice;
    setDeferred(null);
    if (result.outcome === "accepted") setInstalled(true);
  };

  if (installed || !deferred) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-blue-600 text-white rounded-xl p-4 shadow-lg flex items-center justify-between">
      <p className="text-sm">Install Les Ko Lui di layar utama</p>
      <button onClick={handleInstall} className="bg-white text-blue-600 font-semibold px-4 py-1 rounded-lg text-sm whitespace-nowrap">Install</button>
    </div>
  );
}

function Layout() {
  useEffect(() => {
    initSettings();
    if (navigator.storage?.persist) navigator.storage.persist();
  }, []);

  return (
    <div className="max-w-md mx-auto min-h-screen pb-16">
      <Outlet />
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/students", element: <Students /> },
      { path: "/students/:id", element: <StudentDetail /> },
      { path: "/capture", element: <CaptureSession /> },
      { path: "/report", element: <MonthlyReport /> },
      { path: "/settings", element: <Settings /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
