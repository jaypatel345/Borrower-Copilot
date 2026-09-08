// ---------------------------------------------------------------------------
// O2A — "what a lender will LIKELY sanction". An ESTIMATE, deliberately looser
// than the safe amount. Collateral MAY raise it (secured products) but income
// capacity is still the primary driver. This is not a prediction of any one
// lender (product brief).
// ---------------------------------------------------------------------------

import type { DerivedInputs } from "./deriveInputs";
import type { Range } from "../types/results";
import { RULES } from "../config/rules";
import { principalFromEmi } from "../calculations/emi";
import { midpoint, toRange } from "../calculations/money";
import { maxTenure } from "./tenure";

export type LenderSanction = {
  emiCapacity: number;
  principalByIncome: number;
  principalByCollateral?: number;
  range: Range;
};

function lenderFoirFor(d: DerivedInputs): number {
  const f = RULES.lenderFoir;
  if (d.incomeType === "salaried") {
    if (d.stableIncomeLender > f.salariedHighIncomeCutoff) return f.salariedHigh;
    if (d.stableIncomeLender >= f.salariedLowIncomeCutoff) return f.salariedMid;
    return f.salariedLow;
  }
  if (d.incomeType === "self_employed") return f.selfEmployed;
  return f.informal;
}

export function computeLenderSanction(
  d: DerivedInputs,
  age: number,
  fairBandPct: Range,
  amountWidthPct: number,
): LenderSanction {
  const lenderFoir = lenderFoirFor(d);
  const emiCapacity = Math.max(0, lenderFoir * d.stableIncomeLender - d.existingEmiTotal);

  const tenure = maxTenure(d, age);
  const lenderRate = midpoint(fairBandPct);
  const tierMult = RULES.lenderCapacityMultiplierByTier[d.creditTier];
  const principalByIncome = principalFromEmi(emiCapacity, lenderRate, tenure) * tierMult;

  let principal = principalByIncome;
  let principalByCollateral: number | undefined;
  if (d.product.config.secured && d.collateralValue != null && d.product.config.ltv != null) {
    principalByCollateral = d.collateralValue * d.product.config.ltv;
    principal = Math.min(principalByIncome, principalByCollateral);
  }

  // Lender estimate is inherently fuzzy — floor the width at 10%.
  const width = Math.max(amountWidthPct, 0.1);
  const range =
    principal <= 0
      ? { low: 0, high: 0 }
      : toRange(principal, width, RULES.rounding.amountStep);

  return { emiCapacity, principalByIncome, principalByCollateral, range };
}
