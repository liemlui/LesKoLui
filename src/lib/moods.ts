/**
 * Pilihan suasana hati sesi.
 *
 * Sejak audit P2 #15 mood adalah KONTEKS, bukan penilaian: nilainya tidak
 * menambah/mengurangi skor engagement (sebelumnya "Semangat" +1 dan "Kesulitan"
 * −1, sehingga satu pengamatan bisa terhitung dua kali bersama tag perilaku).
 *
 * Diletakkan di `lib/` — bukan di `screens/CaptureSession.tsx` — supaya berkas
 * layar itu hanya mengekspor komponen (aturan `react-refresh/only-export-components`).
 */
export interface MoodOption {
  v: string;
  icon: string;
}

/** Ikon sengaja unik per kontrol: sebelumnya mood "Semangat" memakai 🌟 yang
 *  sama dengan tag perilaku "Antusias", dan mood "Lelah" memakai 😴 yang sama
 *  dengan indikator "Mengantuk" — dua kontrol berbeda, satu ikon. */
export const MOODS: readonly MoodOption[] = [
  { v: "Semangat",  icon: "🔥" },
  { v: "Fokus",     icon: "📌" },
  { v: "Biasa",     icon: "🌤️" },
  { v: "Lelah",     icon: "🌙" },
  { v: "Kesulitan", icon: "🧩" },
];
