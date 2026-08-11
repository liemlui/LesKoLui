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
