// ---------------------------------------------------------------------------
// One stress scenario for O4 (product brief):
//   - floating-rate product & non-informal income -> rate +200bps
//   - otherwise (fixed rate, or informal income)  -> income −15%
// "Fail" = post-shock total FOIR > 60%  OR  post-shock residual < 0.
// ---------------------------------------------------------------------------

import type { DerivedInputs } from "./deriveInputs";
import type { StressResult } from "../types/results";
import { RULES } from "../config/rules";
import { emi } from "../calculations/emi";
import { inr, pct0 } from "../calculations/money";

/** "₹6,000 left after essentials" or "you ₹1,550 short of covering essentials". */
const residualPhrase = (residual: number): string =>
  residual >= 0
    ? `leaving ${inr(residual)} after essentials`
    : `leaving you ${inr(-residual)} short of covering essentials`;

export function computeStress(
  d: DerivedInputs,
  proposed: { principal: number; ratePct: number; months: number },
): StressResult {
  const proposedEmi = emi(proposed.principal, proposed.ratePct, proposed.months);
  const useRateShock = d.product.config.rateType === "floating" && d.incomeType !== "informal";

  if (useRateShock) {
    const shockedEmi = emi(
      proposed.principal,
      proposed.ratePct + RULES.stress.rateRisePp,
      proposed.months,
    );
    const totalEmi = d.existingEmiTotal + shockedEmi;
    const foir = totalEmi / d.stableIncomeSafe;
    const residual = d.stableIncomeSafe - d.essentialExpenses - totalEmi;
    const pass = foir <= RULES.stress.failTotalFoirPct && residual >= 0;
    return {
      scenario: "rate_rise",
      label: `Interest rate rises ${RULES.stress.rateRisePp} percentage points`,
      newTotalFoirPct: foir * 100,
      newResidual: residual,
      pass,
      sentence: `If your rate rose ${RULES.stress.rateRisePp}pp, your EMI would climb to ${inr(
        shockedEmi,
      )} and total repayments would take ${pct0(foir)} of income, ${residualPhrase(
        residual,
      )}. ${pass ? "Still within your safe ceiling." : "That is above your safe ceiling — size the loan to the safe amount, not the lender amount."}`,
    };
  }

  const shockedIncome = d.stableIncomeSafe * (1 - RULES.stress.incomeDropPct);
  const totalEmi = d.existingEmiTotal + proposedEmi;
  const foir = totalEmi / shockedIncome;
  const residual = shockedIncome - d.essentialExpenses - totalEmi;
  const pass = foir <= RULES.stress.failTotalFoirPct && residual >= 0;
  return {
    scenario: "income_drop",
    label: `Income falls ${Math.round(RULES.stress.incomeDropPct * 100)}%`,
    newTotalFoirPct: foir * 100,
    newResidual: residual,
    pass,
    sentence: `If your income dropped ${Math.round(
      RULES.stress.incomeDropPct * 100,
    )}%, your total repayments would be ${pct0(foir)} of income, ${residualPhrase(
      residual,
    )}. ${pass ? "Your safe amount already absorbs this." : "That breaches your safe ceiling — the lender amount would not survive this."}`,
  };
}
