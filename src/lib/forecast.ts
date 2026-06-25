/**
 * Lightweight income forecasting for fluctuating monthly tutoring revenue.
 * Pure functions — no DB access — so they're easy to reason about & test.
 */

/**
 * Weighted moving average — most recent value carries the most weight.
 * `values` is oldest→newest. Extra/short weights are handled gracefully:
 * only the last `weights.length` values are used, and weights are renormalised
 * over the values actually present.
 */
export function weightedMovingAverage(
  values: number[],
  weights: number[] = [0.5, 0.33, 0.17],
): number {
  if (values.length === 0) return 0;
  const recent = values.slice(-weights.length);          // newest tail
  const used = weights.slice(0, recent.length);           // align lengths
  // recent is oldest→newest; weights are newest→oldest → reverse weights
  const w = [...used].reverse();
  const wSum = w.reduce((s, x) => s + x, 0) || 1;
  const acc = recent.reduce((s, v, i) => s + v * w[i], 0);
  return acc / wSum;
}

export interface HybridForecast {
  /** Revenue already locked in from scheduled sessions next month. */
  scheduled: number;
  /** Statistical estimate (WMA of recent realised income). */
  trend: number;
  /** Headline number shown to the user: the larger, more optimistic-but-grounded of the two. */
  estimate: number;
}

/**
 * Hybrid next-month forecast: combine concrete booked sessions with the
 * statistical trend. We take the larger of (booked schedule, WMA) because the
 * schedule fills up over time — early in the cycle WMA dominates, later the
 * booked total takes over.
 */
export function forecastNextMonth(args: {
  scheduledNext: number;
  history: number[]; // realised income, oldest→newest
  weights?: number[];
}): HybridForecast {
  const trend = weightedMovingAverage(args.history, args.weights);
  const scheduled = args.scheduledNext;
  return { scheduled, trend, estimate: Math.max(scheduled, trend) };
}
