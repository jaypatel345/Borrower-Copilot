// Pure numeric + formatting helpers. No UI imports — explanations.ts uses these
// to build "why" sentences, so they must stay framework-free.

import type { Range } from "../types/results";

export const clamp = (n: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, n));

/** Round to the nearest `step` (e.g. roundTo(11.83, 0.25) -> 11.75). */
export const roundTo = (n: number, step: number): number =>
  Math.round(n / step) * step;

/** Round DOWN to a multiple of `step` — used for the EMI ceiling (never round a ceiling up). */
export const roundDownTo = (n: number, step: number): number =>
  Math.floor(n / step) * step;

/** Widen a point estimate into a range by ±pct, then snap low down / high up to `step`.
 *  Snapping outward keeps the band honest (never artificially tight). */
export const toRange = (point: number, pct: number, step: number): Range => {
  const low = Math.max(0, point * (1 - pct));
  const high = point * (1 + pct);
  return {
    low: Math.floor(low / step) * step,
    high: Math.ceil(high / step) * step,
  };
};

export const midpoint = (r: Range): number => (r.low + r.high) / 2;

// ---- formatting (Indian) --------------------------------------------------

const inrFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** "₹22,000" */
export const inr = (n: number): string => `₹${inrFmt.format(Math.round(n))}`;

/** "₹8.0L" (lakh). Below ₹1L falls back to plain rupees. */
export const lakh = (n: number): string =>
  n < 100_000 ? inr(n) : `₹${(n / 100_000).toFixed(1)}L`;

/** "₹7.0L–₹8.5L" */
export const lakhRange = (r: Range): string => `${lakh(r.low)}–${lakh(r.high)}`;

/** "12.0%" */
export const pct = (n: number): string => `${n.toFixed(1)}%`;

/** "10.5%–12.5%" */
export const pctRange = (r: Range): string => `${r.low.toFixed(1)}%–${r.high.toFixed(1)}%`;

/** "48%" — for FOIR / ratios given as 0..1 */
export const pct0 = (frac: number): string => `${Math.round(frac * 100)}%`;

/** "36 months" / "3 years" */
export const tenureLabel = (months: number): string => {
  if (months <= 0) return "—";
  if (months % 12 === 0) return `${months / 12} year${months === 12 ? "" : "s"}`;
  return `${months} months`;
};

/** "3–4 years" / "18–36 months" / "—" */
export const tenureRangeLabel = (low: number, high: number): string => {
  if (low <= 0 && high <= 0) return "—";
  if (low === high) return tenureLabel(low);
  if (low % 12 === 0 && high % 12 === 0) return `${low / 12}–${high / 12} years`;
  return `${low}–${high} months`;
};

/** Below this monthly figure a safe EMI / amount is presented as "Effectively nil". */
export const NIL_THRESHOLD = 1_000;

/** "Effectively nil" when the safe figure rounds to ~nothing; else formatted rupees. */
export const inrOrNil = (n: number): string => (n < NIL_THRESHOLD ? "Effectively nil" : inr(n));

/** "Effectively nil" when a safe amount range tops out at ~nothing; else the lakh range. */
export const lakhRangeOrNil = (r: Range): string =>
  r.high < NIL_THRESHOLD ? "Effectively nil" : lakhRange(r);
