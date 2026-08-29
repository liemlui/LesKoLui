export interface FinancialHistoryMonth {
  potensi: number;
  realisasi: number;
  laba: number;
  sessions: readonly { durationHours: number }[];
}

export interface FinancialHistoryAverage {
  potensi: number;
  realisasi: number;
  laba: number;
  jam: number;
  sesi: number;
}

const roundOne = (value: number): number => Math.round(value * 10) / 10;

/** Average every requested month, including months with no billable sessions. */
export function calculateFinancialHistoryAverage(
  months: readonly FinancialHistoryMonth[],
): FinancialHistoryAverage | undefined {
  if (months.length === 0) return undefined;

  const totals = months.reduce(
    (sum, month) => ({
      potensi: sum.potensi + month.potensi,
      realisasi: sum.realisasi + month.realisasi,
      laba: sum.laba + month.laba,
      jam: sum.jam + month.sessions.reduce((hours, session) => hours + session.durationHours, 0),
      sesi: sum.sesi + month.sessions.length,
    }),
    { potensi: 0, realisasi: 0, laba: 0, jam: 0, sesi: 0 },
  );

  return {
    potensi: Math.round(totals.potensi / months.length),
    realisasi: Math.round(totals.realisasi / months.length),
    laba: Math.round(totals.laba / months.length),
    jam: roundOne(totals.jam / months.length),
    sesi: roundOne(totals.sesi / months.length),
  };
}

/**
 * Susun konteks tambahan untuk AI insight — dihitung dari data existing
 * tanpa migrasi schema. Field turunan yang memberitahu AI tentang kolektibilitas,
 * laporan yang belum dibagikan, dan piutang menua.
 */
export interface InsightContext {
  collectionRate?: number;
  unsharedFinalReports: number;
  agedPiutang: number;       // piutang >60 hari
  avgDaysToPayProxy?: number;
  topDebtorName?: string;
  topDebtorAmount?: number;
}

export function buildInsightContext(args: {
  payments: readonly { studentId: string; totalCost: number; status: string; month: string; periodEnd?: string; paidAt?: string }[];
  reports: readonly { studentId: string; status?: string; pdfGeneratedAt?: string }[];
  students: readonly { id: string; name: string }[];
  month: string;
}): InsightContext {
  const { payments, reports, students, month } = args;
  const monthPayments = payments.filter((p) => p.month === month);
  const totalBilled = monthPayments.reduce((s, p) => s + p.totalCost, 0);
  const invoicePaid = monthPayments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.totalCost, 0);
  const collectionRate = totalBilled > 0 ? Math.round((invoicePaid / totalBilled) * 100) : undefined;

  const unsharedFinalReports = reports.filter(
    (r) => r.status !== "draft" && !r.pdfGeneratedAt,
  ).length;

  // Aged piutang — hitung dari periodEnd atau fallback akhir bulan
  const agedPiutang = payments
    .filter((p) => p.status === "UNPAID")
    .reduce((sum, p) => {
      const ref = p.periodEnd ?? `${p.month}-${new Date(+p.month.slice(0, 4), +p.month.slice(5, 7), 0).getDate()}`;
      const days = Math.floor((Date.now() - Date.parse(ref)) / 86400000);
      return days > 60 ? sum + p.totalCost : sum;
    }, 0);

  // Days-to-pay proxy: lama dari periodEnd (atau bulan tagihan) ke paidAt
  const paidPayments = payments.filter((p) => p.status === "PAID" && p.paidAt);
  let avgDaysToPayProxy: number | undefined;
  if (paidPayments.length > 0) {
    avgDaysToPayProxy = Math.round(
      paidPayments.reduce((sum, p) => {
        const ref = p.periodEnd ?? `${p.month}-${new Date(+p.month.slice(0, 4), +p.month.slice(5, 7), 0).getDate()}`;
        const delta = Date.parse(p.paidAt!) - Date.parse(ref);
        return sum + (delta > 0 ? Math.floor(delta / 86400000) : 0);
      }, 0) / paidPayments.length
    );
  }

  // Top debtor
  const unpaidByStudent = new Map<string, number>();
  for (const p of payments) {
    if (p.status !== "UNPAID") continue;
    unpaidByStudent.set(p.studentId, (unpaidByStudent.get(p.studentId) ?? 0) + p.totalCost);
  }
  const studentMap = new Map(students.map((s) => [s.id, s]));
  let topDebtorName: string | undefined;
  let topDebtorAmount: number | undefined;
  for (const [id, amount] of unpaidByStudent) {
    if (!topDebtorAmount || amount > topDebtorAmount) {
      topDebtorAmount = amount;
      topDebtorName = studentMap.get(id)?.name;
    }
  }

  return {
    collectionRate,
    unsharedFinalReports,
    agedPiutang,
    avgDaysToPayProxy,
    topDebtorName: topDebtorName,
    topDebtorAmount,
  };
}
