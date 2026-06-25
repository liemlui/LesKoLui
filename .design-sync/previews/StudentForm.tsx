import { StudentForm } from "les-ko-lui";

export function Tambah_Murid_Baru() {
  return (
    <div style={{ padding: 16, maxWidth: 420, background: "#fff" }}>
      <StudentForm onSave={() => {}} onCancel={() => {}} />
    </div>
  );
}
