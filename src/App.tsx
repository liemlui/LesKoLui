import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import Home from "./screens/Home";
import Students from "./screens/Students";
import StudentDetail from "./screens/StudentDetail";
import CaptureSession from "./screens/CaptureSession";
import MonthlyReport from "./screens/MonthlyReport";
import Payments from "./screens/Payments";
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
      <button onClick={handleInstall} className="bg-white text-blue-600 font-semibold px-4 py-1 rounded-lg text-sm">Install</button>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    if (navigator.storage?.persist) navigator.storage.persist();
  }, []);

  return (
    <BrowserRouter>
      <div className="max-w-md mx-auto min-h-dvh pb-16">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/students" element={<Students />} />
          <Route path="/students/:id" element={<StudentDetail />} />
          <Route path="/capture" element={<CaptureSession />} />
          <Route path="/report" element={<MonthlyReport />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomNav />
      <InstallPrompt />
    </BrowserRouter>
  );
}
