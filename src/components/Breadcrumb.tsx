import { useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { listStudents } from "../db/repos";

interface CrumbItem {
  label: string;
  path?: string; // undefined = current page (not a link)
}

interface Props {
  /** Override auto-generated crumbs, or supplement with extra segments */
  crumbs?: CrumbItem[];
  /** Map route param values to display names via live queries */
  resolveNames?: Record<string, (id: string) => string | undefined>;
}

const ROUTE_LABELS: Record<string, string> = {
  "": "Home",
  "students": "Murid",
  "tugas": "Tugas",
  "catatan": "Catatan",
  "capture": "Catat Sesi",
  "report": "Laporan Bulanan",
  "payments": "Keuangan",
  "analytics": "Analitik",
  "settings": "Pengaturan",
};

/** Auto-generated breadcrumb from route path. Shows on deep screens. */
export default function Breadcrumb({ crumbs, resolveNames }: Props) {
  const location = useLocation();
  const students = useLiveQuery(() => listStudents(true), []);

  const autoCrumbs = useMemo(() => {
    if (crumbs) return crumbs;

    const segments = location.pathname.split("/").filter(Boolean);
    const result: CrumbItem[] = [{ label: "Home", path: "/" }];

    let built = "";
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      built += `/${seg}`;

      // Resolve dynamic params (:id)
      let label = ROUTE_LABELS[seg];
      if (!label) {
        // It's likely an ID — try to resolve from students
        const student = students?.find((s) => s.id === seg);
        label = student?.name ?? (resolveNames?.[seg]?.(seg) ?? seg);
      }

      const isLast = i === segments.length - 1;
      result.push({ label, path: isLast ? undefined : built });
    }

    return result;
  }, [location.pathname, crumbs, students, resolveNames]);

  if (autoCrumbs.length <= 1) return null; // Don't show on home

  return (
    <nav aria-label="Breadcrumb" className="px-4 pt-3 pb-1">
      <ol className="flex items-center gap-1 text-[11px] font-medium flex-wrap">
        {autoCrumbs.map((crumb, i) => {
          const isLast = i === autoCrumbs.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-slate-300 select-none">›</span>}
              {crumb.path && !isLast ? (
                <Link
                  to={crumb.path}
                  className="text-slate-400 hover:text-blue-600 transition-colors truncate max-w-[120px]">
                  {crumb.label}
                </Link>
              ) : (
                <span className={`truncate max-w-[140px] ${isLast ? "text-slate-700 font-bold" : "text-slate-400"}`}>
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
