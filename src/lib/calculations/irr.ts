// APR / all-in cost via the IRR of the real cash flows.
// RBI KFS mandates an all-charges-inclusive APR (regulatory requirement);
// this bisection solver is our approximation of it (my judgement). RULES.md §1.

import { emi } from "./emi";
import { GST_ON_FEE } from "../config/products";

/** NPV of a monthly cash-flow series at monthly rate `i`. cfs[0] is at t=0. */
function npv(i: number, cfs: number[]): number {
  return cfs.reduce((sum, cf, t) => sum + cf / Math.pow(1 + i, t), 0);
}

/**
 * Monthly IRR for cfs = [ +netDisbursed, −EMI, −EMI, … ].
 * NPV is monotonically increasing in `i` for this sign pattern (one inflow then
 * outflows), so a bisection on [~0, 3] is safe and converges fast.
 */
export function solveMonthlyIrr(cfs: number[]): number {
  let lo = 1e-9;
  let hi = 3.0; // 300%/month — far beyond any real loan
  if (npv(lo, cfs) >= 0) return lo; // borrower pays back <= received: APR ~ 0
  if (npv(hi, cfs) <= 0) return hi; // pathological; clamp
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    const v = npv(mid, cfs);
    if (Math.abs(v) < 1e-6) return mid;
    if (v < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * All-in APR (%) for a loan.
 * netDisbursed = principal − processingFee − GST(processingFee); EMIs use the
 * nominal contract rate. Returns the annualised IRR of that series × 100.
 */
export function aprFromLoan(args: {
  principal: number;
  annualRatePct: number;
  months: number;
  processingFeePct: number;
}): number {
  const { principal, annualRatePct, months, processingFeePct } = args;
  const feeTotal = principal * (processingFeePct / 100) * (1 + GST_ON_FEE);
  const netDisbursed = principal - feeTotal;
  const emiAmount = emi(principal, annualRatePct, months);
  const cfs = [netDisbursed, ...Array<number>(months).fill(-emiAmount)];
  return solveMonthlyIrr(cfs) * 12 * 100;
}
