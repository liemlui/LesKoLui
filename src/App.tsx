import { useEffect, lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from "react-router-dom";
import { initSettings } from "./db/repos";
import BottomNav from "./components/BottomNav";
import { PwaPrompts } from "./components/PwaPrompts";
import Home from "./screens/Home";
import Students from "./screens/Students";
import StudentDetail from "./screens/StudentDetail";
import CaptureSession from "./screens/CaptureSession";

// Lazy-load less-frequently visited screens to reduce initial bundle
const MonthlyReport = lazy(() => import("./screens/MonthlyReport"));
const Payments = lazy(() => import("./screens/Payments"));
const Tugas = lazy(() => import("./screens/Tugas"));
const Settings = lazy(() => import("./screens/Settings"));

function Layout() {
  useEffect(() => {
    initSettings();
    if (navigator.storage?.persist) navigator.storage.persist();
  }, []);

  return (
    <div className="max-w-md mx-auto min-h-screen pb-16">
      <Suspense fallback={<div className="p-4 text-gray-400 text-sm">Memuat...</div>}>
        <Outlet />
      </Suspense>
      <BottomNav />
      <PwaPrompts />
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
