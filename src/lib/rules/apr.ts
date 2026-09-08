// ---------------------------------------------------------------------------
// O3 all-in cost. Turns "rate X%" into "rate X% + Y% fee + GST = APR Z%" so the
// borrower can compare a lender's quote honestly (RBI KFS intent). RULES.md §1, §11.
// ---------------------------------------------------------------------------

import type { BorrowerProfile } from "../types/borrower";
import type { DerivedInputs } from "./deriveInputs";
import type { Range } from "../types/results";
import { isKnown } from "../types/borrower";
import { RULES } from "../config/rules";
import { aprFromLoan } from "../calculations/irr";
import { roundTo } from "../calculations/money";

export type AprResult = {
  aprBandPct: Range;
  processingFeePct: number;
};

/**
 * APR at each end of the fair-rate band, for an illustrative principal and the
 * product's comfortable tenure. Fee = borrower-supplied override if given,
 * else the product assumption (RULES.md §3).
 */
export function computeApr(
  p: BorrowerProfile,
  d: DerivedInputs,
  fairBandPct: Range,
  illustrativePrincipal: number,
  months: number,
): AprResult {
  const processingFeePct = isKnown(p.processingFeePctOverride)
    ? p.processingFeePctOverride.value
    : isKnown(p.existingOffer) && p.existingOffer.value.processingFeePct != null
      ? p.existingOffer.value.processingFeePct
      : d.product.config.processingFeePct;

  const principal = Math.max(illustrativePrincipal, 1);

  const aprLow = aprFromLoan({
    principal,
    annualRatePct: fairBandPct.low,
    months,
    processingFeePct,
  });
  const aprHigh = aprFromLoan({
    principal,
    annualRatePct: fairBandPct.high,
    months,
    processingFeePct,
  });

  return {
    aprBandPct: {
      low: roundTo(aprLow, RULES.rounding.aprPctStep),
      high: roundTo(aprHigh, RULES.rounding.aprPctStep),
    },
    processingFeePct,
  };
}
