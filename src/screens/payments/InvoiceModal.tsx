import { useLiveQuery } from "dexie-react-hooks";
import type { RefObject } from "react";
import { listInvoiceSessions } from "../../db/repos";
import type { Payment, Student, Settings, Session } from "../../db/types";
import { formatRupiah, periodLabel } from "../../lib/format";
import { Z } from "../../lib/zIndex";

interface InvoiceModalProps {
  payment: Payment;
  student: Student;
  settings: Settings;
  invoiceRef: RefObject<HTMLDivElement | null>;
  exporting: boolean;
  onExport: () => void;
  onClose: () => void;
}

export default function InvoiceModal({
  payment, student, settings, invoiceRef, exporting, onExport, onClose,
}: InvoiceModalProps) {
  const sessions = useLiveQuery(
    () => listInvoiceSessions(payment),
    [payment.studentId, payment.month, payment.reportId, payment.periodStart, payment.periodEnd]
  );
  const sessionsLoading = sessions === undefined;

  const bank = settings.bankAccounts;
  const tutor = settings.tutorProfile;
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  const periodLbl = payment.periodStart && payment.periodEnd ? periodLabel(payment.periodStart, payment.periodEnd) : "";
  const [y, mo] = payment.month.split("-").map(Number);
  const monthStr = periodLbl || `${MONTH_NAMES[mo - 1]} ${y}`;

  return (
    <div role="dialog" aria-modal="true" aria-label="Invoice Profesional" className={`fixed inset-0 bg-black/60 ${Z.invoice} flex items-end justify-center px-0`}>
      <div className="w-full max-w-md bg-white rounded-t-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-bold text-base">Invoice Profesional</h3>
          <div className="flex gap-2">
            <button onClick={onExport} disabled={exporting || sessionsLoading}
              className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">
              {sessionsLoading ? "Memuat..." : exporting ? "Ekspor..." : "📥 PDF"}
            </button>
            <button aria-label="Tutup" onClick={onClose} className="text-gray-500 hover:text-gray-600 text-lg w-10 h-10 flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[75vh] p-4">
          {sessionsLoading ? (
            <p role="status" className="py-12 text-center text-sm text-gray-500">Memuat sesi invoice...</p>
          ) : (
            <>
              <div style={{ position: "absolute", left: -9999, top: 0, pointerEvents: "none" }}>
                <InvoiceContent
                  refProp={invoiceRef}
                  payment={payment} student={student} sessions={sessions}
                  tutor={tutor} bank={bank} monthStr={monthStr} />
              </div>
              <InvoiceContent
                payment={payment} student={student} sessions={sessions}
                tutor={tutor} bank={bank} monthStr={monthStr} responsive />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InvoiceContent({
  payment, student, sessions, tutor, bank, monthStr, refProp, responsive = false,
}: {
  payment: Payment;
  student: Student;
  sessions: Session[];
  tutor: Settings["tutorProfile"];
  bank: Settings["bankAccounts"];
  monthStr: string;
  refProp?: RefObject<HTMLDivElement | null>;
  responsive?: boolean;
}) {
  const totalHours = sessions.reduce((s, x) => s + x.durationHours, 0);

  return (
    <div ref={refProp} style={{ width: responsive ? "100%" : 360, maxWidth: 360, boxSizing: "border-box", margin: responsive ? "0 auto" : undefined, background: "#fff", padding: "24px 20px", fontFamily: "sans-serif", fontSize: 12, color: "#111827" }}>
      <div style={{ borderBottom: "2px solid #1e40af", paddingBottom: 12, marginBottom: 14 }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: "#1e40af", margin: 0 }}>LES KO LUI</p>
        <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>{monthStr}</p>
        {tutor.name && <p style={{ fontSize: 12, fontWeight: 700, margin: "6px 0 0" }}>{tutor.name}</p>}
        {tutor.phone && <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{tutor.phone}</p>}
        {tutor.email && <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{tutor.email}</p>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, letterSpacing: 1, margin: "0 0 4px" }}>NAMA MURID</p>
        <p style={{ fontWeight: 700, margin: 0 }}>{student.name}</p>
        {student.school && <p style={{ color: "#6b7280", margin: "2px 0 0" }}>{student.school}</p>}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
        <thead>
          <tr style={{ background: "#eff6ff" }}>
            {["Tanggal","Mapel","Jam","Rincian"].map((h, i) => (
              <th key={h} style={{ padding: "6px 8px", textAlign: i > 1 ? "right" : "left", fontSize: 10, color: "#1e40af", fontWeight: 700 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sessions.length === 0 ? (
            payment.reportId ? (
              <tr><td colSpan={4} style={{ padding: "10px 8px", color: "#9ca3af", textAlign: "center", fontSize: 11 }}>Sesi laporan tidak tersedia</td></tr>
            ) : (
              <tr>
                <td style={{ padding: "8px", color: "#6b7280" }}>—</td>
                <td colSpan={2} style={{ padding: "8px", color: "#374151", fontWeight: 600 }}>Tagihan manual (di luar laporan sesi)</td>
                <td style={{ padding: "8px", textAlign: "right", fontWeight: 700 }}>{formatRupiah(payment.totalCost)}</td>
              </tr>
            )
          ) : (
            sessions.map((s, i) => (
              <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "5px 8px" }}>{s.date.slice(5).replace("-", "/")}</td>
                <td style={{ padding: "5px 8px" }}>{s.status === "NO_SHOW" ? "Tidak hadir" : s.subjects.slice(0, 2).join(", ") || "—"}</td>
                <td style={{ padding: "5px 8px", textAlign: "right" }}>{s.durationHours}j</td>
                <td style={{ padding: "5px 8px", textAlign: "right" }}>{formatRupiah(s.cost)}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "2px solid #e5e7eb" }}>
            <td colSpan={2} style={{ padding: "8px 8px", fontWeight: 700 }}>Total</td>
            <td style={{ padding: "8px 8px", textAlign: "right", fontWeight: 700 }}>{totalHours}j</td>
            <td style={{ padding: "8px 8px", textAlign: "right", fontWeight: 800, color: "#1e40af", fontSize: 13 }}>{formatRupiah(payment.totalCost)}</td>
          </tr>
        </tfoot>
      </table>

      <div style={{ background: payment.status === "PAID" ? "#f0fdf4" : "#fffbeb", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
        <p style={{ fontWeight: 700, color: payment.status === "PAID" ? "#16a34a" : "#d97706", margin: 0 }}>
          Status: {payment.status === "PAID" ? "✓ Lunas" : "Menunggu Pembayaran"}
        </p>
        {payment.status === "PAID" && payment.paidAt && (
          <p style={{ color: "#6b7280", margin: "3px 0 0", fontSize: 11 }}>Dibayar {payment.paidAt} via {payment.method ?? "—"}</p>
        )}
      </div>

      {bank && (bank.bca || bank.cimb || bank.bri || bank.mandiri || bank.bsi || bank.ewallet) && (
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
          {bank.bca     && <p style={{ margin: "2px 0", fontSize: 11 }}>BCA {bank.bca}</p>}
          {bank.cimb    && <p style={{ margin: "2px 0", fontSize: 11 }}>CIMB {bank.cimb}</p>}
          {bank.bri     && <p style={{ margin: "2px 0", fontSize: 11 }}>BRI {bank.bri}</p>}
          {bank.mandiri && <p style={{ margin: "2px 0", fontSize: 11 }}>Mandiri {bank.mandiri}</p>}
          {bank.bsi     && <p style={{ margin: "2px 0", fontSize: 11 }}>BSI {bank.bsi}</p>}
          {bank.ewallet && <p style={{ margin: "2px 0", fontSize: 11 }}>E-wallet {bank.ewallet}</p>}
          {bank.accountName && <p style={{ margin: "2px 0", fontSize: 11, color: "#9ca3af" }}>a.n. {bank.accountName}</p>}
        </div>
      )}

      <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 10, marginTop: 16 }}>Thank you 😇</p>
    </div>
  );
}
