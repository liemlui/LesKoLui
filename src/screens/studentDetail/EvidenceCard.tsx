import type { Session } from "../../db/types";

interface EvidenceCardProps {
  engSessions: Session[];
}

/**
 * Penunjuk bukti keaktifan.
 *
 * Dulu kartu ini menampilkan rata-rata fokus dan tafsirannya SENDIRI, sehingga
 * rata-rata yang sama muncul di dua kartu di dua tab sekaligus. Keputusan pemilik
 * 2026-10-09 (K6): dua kartu itu DIGABUNG, dan yang diutamakan adalah kesimpulan
 * tentang murid — yang sekarang hidup di tab Progres (`Kesimpulan`).
 *
 * Karena itu kartu ini tinggal menyatakan berbasis apa kesimpulan itu dibuat dan
 * mengarahkan ke tempat membacanya. Ia sengaja TIDAK menghitung apa pun, supaya
 * tidak ada dua sumber angka untuk hal yang sama.
 */
export default function EvidenceCard({ engSessions }: EvidenceCardProps) {
  if (engSessions.length === 0) return null;

  return (
    <div className="bg-[var(--surface-strong)] rounded-2xl p-4 border border-[var(--border)]">
      <h2 className="text-base font-semibold text-[var(--ink-strong)]">Bukti Keaktifan</h2>
      <p className="text-xs text-[var(--ink-muted)] mt-1 leading-relaxed">
        Kesimpulan tentang murid ini dihitung dari <span className="font-semibold">{engSessions.length} sesi</span> yang
        mencatat pengamatan kondisi. Rincian angkanya ada di tab <span className="font-semibold">Progres</span>.
      </p>
    </div>
  );
}
