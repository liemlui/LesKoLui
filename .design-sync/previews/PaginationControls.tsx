import { PaginationControls } from "les-ko-lui";

export function Halaman_Pertama() {
  return (
    <div style={{ padding: 16, maxWidth: 400 }}>
      <PaginationControls page={1} total={45} onPageChange={() => {}} label="sesi" />
    </div>
  );
}

export function Halaman_Tengah() {
  return (
    <div style={{ padding: 16, maxWidth: 400 }}>
      <PaginationControls page={3} total={75} onPageChange={() => {}} label="transaksi" />
    </div>
  );
}
