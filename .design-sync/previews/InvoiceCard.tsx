import { InvoiceCard } from "les-ko-lui";

const unpaid = {
  id: "pay-1",
  studentId: "s-1",
  month: "2025-06",
  totalCost: 800_000,
  status: "UNPAID" as const,
};

const paid = {
  id: "pay-2",
  studentId: "s-2",
  month: "2025-05",
  totalCost: 1_200_000,
  status: "PAID" as const,
  paidAt: "2025-05-30",
  method: "Transfer BCA",
};

export function Belum_Lunas() {
  return (
    <div style={{ padding: 16, maxWidth: 340 }}>
      <InvoiceCard payment={unpaid} studentName="Budi Santoso" onMarkPaid={() => {}} />
    </div>
  );
}

export function Sudah_Lunas() {
  return (
    <div style={{ padding: 16, maxWidth: 340 }}>
      <InvoiceCard payment={paid} studentName="Ani Wijaya" />
    </div>
  );
}
