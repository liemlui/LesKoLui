import { ReportRenderer } from "les-ko-lui";

const theme = {
  id: "sky",
  name: "Sky Blue",
  bg: "#dbeafe",
  ink: "#1e3a5f",
  muted: "#93c5fd",
  accent: "#2563eb",
  palette: ["#2563eb", "#7c3aed", "#db2777"],
  fontDisplay: "'Fredoka', sans-serif",
  fontBody: "'Nunito', sans-serif",
  header: "bubble" as const,
  label: "pill" as const,
  photo: "round" as const,
  deco: "star" as const,
  headerText: "Laporan Les Privat",
};

const data = {
  studentName: "Budi Santoso",
  period: "Juni 2025",
  tutorName: "Ko Kevin",
  entries: [
    { date: "3 Jun", subject: "Matematika", narrative: "Belajar persamaan kuadrat dan berhasil mengerjakan 8 dari 10 soal dengan benar. Pemahaman konsep sudah baik." },
    { date: "10 Jun", subject: "Fisika", narrative: "Memahami hukum Newton dengan cepat. Latihan soal dinamika dengan hasil memuaskan." },
    { date: "17 Jun", subject: "Kimia", narrative: "Materi ikatan kimia dibahas mendalam. Budi aktif bertanya dan mencatat." },
  ],
  summary: "Budi menunjukkan kemajuan yang sangat baik di bulan Juni. Semangat belajarnya tinggi dan konsistensi dalam mengerjakan PR patut diapresiasi.",
  teacherNote: "Pertahankan semangat belajarnya! Fokus pada latihan soal ujian.",
  quote: "Sukses adalah hasil dari kerja keras yang konsisten dan terus-menerus.",
};

export function Layout_Cards() {
  return (
    <div style={{ padding: 12, maxWidth: 420 }}>
      <ReportRenderer data={data} theme={theme} layoutId="cards" />
    </div>
  );
}

export function Layout_Timeline() {
  return (
    <div style={{ padding: 12, maxWidth: 420 }}>
      <ReportRenderer data={data} theme={theme} layoutId="timeline" />
    </div>
  );
}
