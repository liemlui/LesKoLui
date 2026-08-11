export interface ClosingPreviewBill {
  studentId: string;
  cost: number;
}

export interface ClosingPreviewPayment {
  id: string;
  studentId: string;
  totalCost: number;
  reportId?: string;
}

export interface ClosingProjectionRow<TBill extends ClosingPreviewBill> {
  bill: TBill;
  /** Existing unlinked invoice that closeMonth will attach to the new report. */
  adoptedPayment?: ClosingPreviewPayment;
}

/**
 * Project the financial effect of closing a month without counting an invoice
 * twice when closeMonth will adopt an existing unlinked/manual payment.
 */
export function buildMonthClosingProjection<TBill extends ClosingPreviewBill>(
  bills: readonly TBill[],
  existingPayments: readonly ClosingPreviewPayment[],
): { rows: ClosingProjectionRow<TBill>[]; additionalTotal: number } {
  const unlinkedByStudent = new Map<string, ClosingPreviewPayment>();
  const studentsWithReportInvoices = new Set<string>();
  for (const payment of existingPayments) {
    if (payment.reportId) studentsWithReportInvoices.add(payment.studentId);
    if (!payment.reportId && !unlinkedByStudent.has(payment.studentId)) {
      unlinkedByStudent.set(payment.studentId, payment);
    }
  }

  const rows = bills.map((bill) => ({
    bill,
    // Once a report invoice exists, closeMonth expands that invoice or creates
    // a supplemental one. A separate manual invoice must not be advertised as
    // adopted, because it deliberately remains standalone.
    adoptedPayment: studentsWithReportInvoices.has(bill.studentId)
      ? undefined
      : unlinkedByStudent.get(bill.studentId),
  }));
  const additionalTotal = rows.reduce(
    (sum, row) => sum + (row.adoptedPayment ? 0 : row.bill.cost),
    0,
  );

  return { rows, additionalTotal };
}
