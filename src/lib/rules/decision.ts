// ---------------------------------------------------------------------------
// O1 — BORROW / BORROW LESS / DON'T BORROW. Ordered rule list: the first hard
// stop wins; otherwise compare the safe amount to what was asked for. Every
// verdict carries reasons tied to the binding numbers (product brief). RULES.md §11.
// ---------------------------------------------------------------------------

import type { BorrowerProfile } from "../types/borrower";
import type { DerivedInputs } from "./deriveInputs";
import type { Affordability } from "./affordability";
import type { SafeAmount } from "./safeAmount";
import type { DecisionResult, Range, StressResult } from "../types/results";
import { RULES } from "../config/rules";
import { emi } from "../calculations/emi";
import { inr, lakhRange, pct0 } from "../calculations/money";
import { comfortableTenure } from "./tenure";

const CONSUMPTION_HEADLINE = "Borrow — but only what you need";

export function computeDecision(args: {
  profile: BorrowerProfile;
  d: DerivedInputs;
  affordability: Affordability;
  safeDisplay: SafeAmount; // productive credit NOT applied
  safeForGate: SafeAmount; // productive credit applied (O1 only)
  lenderRange: Range;
  fairBandPct: Range;
  stress: StressResult;
}): DecisionResult {
  const { profile: p, d, affordability, safeDisplay, safeForGate, stress } = args;
  const dec = RULES.decision;

  // EMI the borrower would take on if they got exactly what they asked for.
  const wantedEmi = emi(
    p.amountWanted,
    args.fairBandPct.high,
    comfortableTenure(d, p.age),
  );
  const postLoanFoir =
    d.stableIncomeSafe > 0 ? (d.existingEmiTotal + wantedEmi) / d.stableIncomeSafe : 1;
  const bufferNow = d.stableIncomeSafe - d.essentialExpenses - d.existingEmiTotal;
  const isConsumption = !d.isProductivePurpose;

  const advisory: string[] = [];
  if (d.hasExpensiveExistingDebt) {
    advisory.push(
      "You have debt at 24%+ interest. Clearing or refinancing that will save you more each month than this new loan is likely to earn or provide.",
    );
  }

  const dont = (headline: string, reasons: string[]): DecisionResult => ({
    verdict: "dont_borrow",
    headline,
    reasons: [...reasons, ...advisory].slice(0, 4),
  });

  // --- hard stops, in order ------------------------------------------------

  // 1. Already over-leveraged (no room even before this loan).
  const foirBefore = d.stableIncomeSafe > 0 ? d.existingEmiTotal / d.stableIncomeSafe : 0;
  const lenderCeiling =
    d.incomeType === "salaried" ? RULES.lenderFoir.salariedMid
    : d.incomeType === "self_employed" ? RULES.lenderFoir.selfEmployed
    : RULES.lenderFoir.informal;
  if (foirBefore >= lenderCeiling) {
    return dont("Don't borrow right now", [
      `Your existing loan payments already take ${pct0(foirBefore)} of your income — a lender is unlikely to add more, and you shouldn't either.`,
    ]);
  }

  // 2. Nothing left after essentials.
  if (bufferNow <= dec_minBuffer(d)) {
    return dont("Don't borrow right now", [
      `After ${inr(d.essentialExpenses)} of essential costs and ${inr(
        d.existingEmiTotal,
      )} of existing loan payments, only ${inr(
        bufferNow,
      )} of your income is spare — less than the 10% cushion we treat as the safe minimum.`,
    ]);
  }

  // 3. Repayment distress + fresh debt.
  if (
    d.hasRecentBounce &&
    (d.incomeType === "informal" || d.stability === "uncertain") &&
    postLoanFoir > dec.distressPostLoanFoirPct
  ) {
    return dont("Don't borrow right now", [
      `A payment bounced in the last ${RULES.decision.distressBounceWithinMonths} months and your income is ${
        d.incomeType === "informal" ? "informal" : "uncertain"
      }.`,
      `Adding this loan would push repayments to ${pct0(
        postLoanFoir,
      )} of income — well past a safe level for a variable earner.`,
    ]);
  }

  // 4. Expensive debt should be cleared first (consumption borrowing).
  const monthlyIncome = d.stableIncomeSafe;
  const bigExpensiveDebt = (p.existingLoans ?? []).some(
    (l) =>
      (l.aprPct ?? 0) >= dec.expensiveDebtAprPct &&
      (l.outstanding ?? 0) >= dec.expensiveDebtOutstandingIncomeMultiple * monthlyIncome,
  );
  if (bigExpensiveDebt && isConsumption) {
    return dont("Don't borrow for this yet", [
      "You are carrying a large balance at 24%+ interest. Paying that down first frees more monthly income than this loan would give you.",
    ]);
  }

  // 5. Fails the stress test badly.
  if (!stress.pass) {
    return dont("Don't borrow the full amount", [
      stress.sentence,
    ]);
  }

  // 6. Weak consumption case — discretionary spend AND affordability is weak
  //    (not merely "the ask is high" — that is BORROW LESS, below).
  const weakAffordability =
    affordability.safeEmiCeiling < dec.weakAffordabilityCeilingShareOfIncome * d.stableIncomeSafe ||
    bufferNow < dec.weakAffordabilityCeilingShareOfIncome * d.stableIncomeSafe;
  if (
    isConsumption &&
    weakAffordability &&
    p.amountWanted > 0 &&
    safeDisplay.range.high < dec.weakConsumptionSafeVsWantedRatio * p.amountWanted
  ) {
    return dont("Don't borrow this much", [
      `What you can safely repay (${lakhRange(
        safeDisplay.range,
      )}) is far below the ${inr(p.amountWanted)} you want, your spare income is thin, and this is a discretionary spend.`,
    ]);
  }

  // --- soft outcomes -----------------------------------------------------

  const gateHigh = Math.max(safeForGate.range.high, safeDisplay.range.high);
  if (p.amountWanted > 0 && gateHigh < dec.borrowLessSafeVsWantedRatio * p.amountWanted) {
    const reasons = [
      `You can safely carry ${lakhRange(safeDisplay.range)} — less than the ${inr(
        p.amountWanted,
      )} you asked for.`,
      affordability.bindingConstraint === "foir"
        ? `Your limit is the ${pct0(affordability.safeFoir)} cap on total loan payments, after your existing ${inr(
            d.existingEmiTotal,
          )} EMI.`
        : `Your limit is the income left after ${inr(
            d.essentialExpenses,
          )} of essential costs — not the loan-payment cap.`,
    ];
    if (d.productiveMonthlyCredit > 0) {
      reasons.push(
        "We gave partial credit for the extra income you expect, but it still doesn't cover the full amount.",
      );
    }
    return {
      verdict: "borrow_less",
      headline: "Borrow — but less than you planned",
      reasons: [...reasons, ...advisory].slice(0, 4),
    };
  }

  const okReasons = [
    `You can safely carry ${lakhRange(safeDisplay.range)}, which covers your ${inr(
      p.amountWanted,
    )} request.`,
    affordability.bindingConstraint === "foir"
      ? `Your ceiling comes from keeping all loan payments together under ${pct0(
          affordability.safeFoir,
        )} of income, after your existing ${inr(d.existingEmiTotal)} EMI.`
      : `Your ceiling comes from the income left after ${inr(d.essentialExpenses)} of essential costs.`,
  ];
  if (isConsumption) {
    okReasons.push("This is a discretionary spend — take only what you actually need.");
  }
  return {
    verdict: "borrow",
    headline: isConsumption ? CONSUMPTION_HEADLINE : "Borrow — it fits your budget",
    reasons: [...okReasons, ...advisory].slice(0, 4),
  };
}

function dec_minBuffer(d: DerivedInputs): number {
  return RULES.residual.minBufferShareOfIncome * d.stableIncomeSafe;
}
