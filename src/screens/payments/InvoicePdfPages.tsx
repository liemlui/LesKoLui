import type { Payment, Student } from "../../db/types";
import { formatRupiah } from "../../lib/format";
import { groupPdfPages, ITEMS_PER_PDF_PAGE } from "../../lib/invoicePresentation";

interface InvoicePdfPagesProps {
  payments: Payment[];
  studentsById: Map<string, Student>;
}

export default function InvoicePdfPages({ payments, studentsById }: InvoicePdfPagesProps) {
  const pageGroups = groupPdfPages(payments, ITEMS_PER_PDF_PAGE);

  return (
    <div style={{ position: "absolute", left: -9999, top: 0, pointerEvents: "none" }}>
      {pageGroups.map((group, pageIdx) => (
        <div key={pageIdx} data-pdf-page style={{ width: 400, background: "#fff", padding: "24px 20px", fontFamily: "sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "2px solid #e5e7eb", paddingBottom: 10 }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 18, margin: 0, color: "#1e40af" }}>Rekap Tagihan</p>
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Semua Tagihan</p>
            </div>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Hal {pageIdx + 1}/{pageGroups.length}</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {group.map((payment) => {
              const studentName = studentsById.get(payment.studentId)?.name ?? "(dihapus)";
              return (
                <div key={payment.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", background: payment.status === "PAID" ? "#f0fdf4" : "#fffbeb" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: "#111827" }}>{studentName}</p>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>{payment.month}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: "#1e40af" }}>{formatRupiah(payment.totalCost)}</p>
                      <span style={{ fontSize: 11, fontWeight: 600, color: payment.status === "PAID" ? "#16a34a" : "#d97706", background: payment.status === "PAID" ? "#dcfce7" : "#fef3c7", padding: "2px 8px", borderRadius: 999, display: "inline-block", marginTop: 3 }}>
                        {payment.status === "PAID" ? "Lunas" : "Belum dibayar"}
                      </span>
                    </div>
                  </div>
                  {payment.status === "PAID" && payment.paidAt && <p style={{ fontSize: 11, color: "#6b7280", margin: "6px 0 0" }}>Bayar {payment.paidAt} via {payment.method ?? "-"}</p>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
