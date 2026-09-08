// ---------------------------------------------------------------------------
// O2B — "what the borrower can SAFELY carry". Conservative on every input:
//   - EMI = min(safe ceiling, stressed safe ceiling)   (survives a −15% shock)
//   - rate = TOP of the fair band                       (price pessimistically)
//   - tenure = comfortable, not maximum
// Collateral is NEVER an input — it cannot raise this number
// (user instruction 2026-09-08).
// ---------------------------------------------------------------------------

import type { DerivedInputs } from "./deriveInputs";
import type { Affordability } from "./affordability";
import type { Range } from "../types/results";
import { RULES } from "../config/rules";
import { principalFromEmi } from "../calculations/emi";
import { toRange } from "../calculations/money";
import { comfortableTenure } from "./tenure";

export type SafeAmount = {
  emiForSizing: number;
  tenureMonths: number;
  ratePctUsed: number;
  principalPoint: number;
  range: Range;
};

/**
 * @param amountWidthPct   band half-width from confidence (e.g. 0.08 / 0.15 / 0.22)
 * @param extraMonthlyIncome  productive-income credit — pass a non-zero value
 *        ONLY for the O1 borrow/borrow-less gate, never for the displayed O2B.
 */
export function computeSafeAmount(
  d: DerivedInputs,
  affordability: Affordability,
  fairBandPct: Range,
  age: number,
  amountWidthPct: number,
  extraMonthlyIncome = 0,
): SafeAmount {
  const tenureMonths = comfortableTenure(d, age);
  const ratePctUsed = fairBandPct.high;

  let emiForSizing = Math.min(
    affordability.safeEmiCeiling,
    affordability.stressedSafeEmiCeiling,
  );

  // Productive income (O1 gate only): lift residual headroom, still capped by FOIR.
  if (extraMonthlyIncome > 0) {
    const liftedResidualCap =
      RULES.residual.maxNewEmiShareOfDisposable *
      (d.disposableIncomeSafe + extraMonthlyIncome);
    emiForSizing = Math.min(
      Math.max(emiForSizing, liftedResidualCap),
      affordability.foirCapEmi,
    );
  }

  emiForSizing = Math.max(0, emiForSizing);
  const principalPoint = principalFromEmi(emiForSizing, ratePctUsed, tenureMonths);
  const range =
    principalPoint <= 0
      ? { low: 0, high: 0 }
      : toRange(principalPoint, amountWidthPct, RULES.rounding.amountStep);

  return { emiForSizing, tenureMonths, ratePctUsed, principalPoint, range };
}
