// ---------------------------------------------------------------------------
// Safe EMI ceiling = the LOWER of two independent limits (product brief):
//   A. FOIR cap        — total debt service ≤ safeFOIR × stable income
//   B. residual cap    — new EMI ≤ 60% of income left after essentials + EMIs
// Collateral is deliberately NOT an input here — a pledged asset does not make
// a monthly payment affordable (user instruction 2026-09-08).
// ---------------------------------------------------------------------------

import type { DerivedInputs } from "./deriveInputs";
import { RULES } from "../config/rules";
import { clamp } from "../calculations/money";

export type Affordability = {
  safeFoir: number;
  foirCapEmi: number;
  residualCapEmi: number;
  /** min(A, B), floored at 0 — the number O4 reports and O2B is sized from. */
  safeEmiCeiling: number;
  bindingConstraint: "foir" | "residual";
  /** Same calc after a −15% income shock — used to size the SAFE amount. */
  stressedSafeEmiCeiling: number;
};

function safeFoirFor(d: DerivedInputs, opts: { savingsMonths?: number }): number {
  const s = RULES.safeFoir;
  let foir = s.byIncomeType[d.incomeType];
  const m = opts.savingsMonths;
  if (m != null && m < s.lowSavingsMonths) foir += s.adj.lowEmergencySavingsPp;
  if (m != null && m >= s.highSavingsMonths) foir += s.adj.highEmergencySavingsPp;
  if (d.hasRecentBounce) foir += s.adj.recentBouncePp;
  return Math.max(s.floor, foir);
}

/** One evaluation of both ceilings at a given income level. */
function ceilingAt(
  d: DerivedInputs,
  safeFoir: number,
  stableIncome: number,
): { foirCapEmi: number; residualCapEmi: number; ceiling: number; binding: "foir" | "residual" } {
  const foirCapEmi = safeFoir * stableIncome - d.existingEmiTotal;
  const disposable =
    stableIncome - d.essentialExpenses - d.existingEmiTotal - d.amortisedUpcomingExpense;
  const residualCapEmi = RULES.residual.maxNewEmiShareOfDisposable * disposable;
  const ceiling = Math.max(0, Math.min(foirCapEmi, residualCapEmi));
  return {
    foirCapEmi,
    residualCapEmi,
    ceiling,
    binding: foirCapEmi <= residualCapEmi ? "foir" : "residual",
  };
}

export function computeAffordability(d: DerivedInputs): Affordability {
  const safeFoir = safeFoirFor(d, { savingsMonths: d.emergencySavingsMonths });

  const now = ceilingAt(d, safeFoir, d.stableIncomeSafe);

  const stressedIncome = d.stableIncomeSafe * (1 - RULES.stress.incomeDropPct);
  const stressed = ceilingAt(d, safeFoir, stressedIncome);

  return {
    safeFoir,
    foirCapEmi: Math.max(0, now.foirCapEmi),
    residualCapEmi: Math.max(0, now.residualCapEmi),
    safeEmiCeiling: clamp(now.ceiling, 0, Number.MAX_SAFE_INTEGER),
    bindingConstraint: now.binding,
    stressedSafeEmiCeiling: Math.max(0, stressed.ceiling),
  };
}
