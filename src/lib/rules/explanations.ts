// ---------------------------------------------------------------------------
// One-sentence "why" + factor list for each output. Built from the EXACT
// numbers the rules used, so copy can't drift from the maths (CLAUDE.md §20).
// Plain language: no bare "FOIR" / "DTI" — spell it out (CLAUDE.md §19).
// ---------------------------------------------------------------------------

import type { DerivedInputs } from "./deriveInputs";
import type { Affordability } from "./affordability";
import type { Explanation, Range } from "../types/results";
import { inr, inrOrNil, lakhRange, lakhRangeOrNil, pct0, pctRange } from "../calculations/money";

function incomeFactor(d: DerivedInputs): { label: string; value: string } {
  if (d.incomeType === "self_employed" && d.documentedIncome != null) {
    return { label: "Income we can count (from your ITR)", value: inr(d.documentedIncome) + "/mo" };
  }
  return { label: "Income we plan around", value: inr(d.stableIncomeSafe) + "/mo" };
}

const limitPhrase = (a: Affordability): string =>
  a.bindingConstraint === "foir"
    ? `the ${pct0(a.safeFoir)} cap on total loan payments`
    : "the money left after your essential costs";

export function amountExplanation(
  d: DerivedInputs,
  a: Affordability,
  safe: Range,
  lender: Range,
  reRouted: boolean,
): Explanation {
  const sentence = reRouted
    ? `We size the safe amount (${lakhRangeOrNil(safe)}) from what your income can repay, not from your collateral. A lender might sanction ${lakhRange(
        lender,
      )} against your property — that is what you can get, not what you should take.`
    : `Your safe amount (${lakhRangeOrNil(
        safe,
      )}) is what your income comfortably repays. A lender might stretch to ${lakhRange(
        lender,
      )}, but you should go by the safe number.`;
  return {
    sentence,
    factors: [
      incomeFactor(d),
      { label: "Essential monthly costs", value: inr(d.essentialExpenses) + "/mo" },
      { label: "Loan payments you already have", value: inr(d.existingEmiTotal) + "/mo" },
      {
        label: "Most you should pay on a new loan",
        value: `${inr(a.safeEmiCeiling)}/mo — set by ${limitPhrase(a)}`,
      },
    ],
  };
}

export function rateExplanation(
  d: DerivedInputs,
  band: Range,
  drivers: string[],
): Explanation {
  const n = drivers.length;
  return {
    sentence: `A fair rate for your profile is ${pctRange(
      band,
    )} — the ${d.product.config.label.toLowerCase()} starting band, ${
      n ? `adjusted for ${n} factor${n === 1 ? "" : "s"} listed below` : "with no adjustments"
    }. This is a market reference, not a lender's offer.`,
    factors: [
      { label: "Product", value: d.product.config.label },
      {
        label: "Credit score",
        value: d.creditTier === "unknown" ? "not known — band widened, not penalised" : d.creditTier,
      },
      { label: "Income type", value: d.incomeType.replace("_", "-") },
      ...drivers.slice(0, 3).map((x) => ({ label: "Adjustment", value: x })),
    ],
  };
}

export function emiExplanation(
  d: DerivedInputs,
  a: Affordability,
  ceiling: number,
): Explanation {
  const c = inrOrNil(ceiling);
  const sentence =
    a.bindingConstraint === "foir"
      ? `Your EMI ceiling is ${c} because we keep all your loan payments together under ${pct0(
          a.safeFoir,
        )} of your ${inr(d.stableIncomeSafe)} monthly income, and you already pay ${inr(
          d.existingEmiTotal,
        )}.`
      : `Your EMI ceiling is ${c} because after ${inr(d.essentialExpenses)} of essential costs and ${inr(
          d.existingEmiTotal,
        )} of existing loan payments, we keep a new payment under ${pct0(
          0.6,
        )} of what's left.`;
  return {
    sentence,
    factors: [
      incomeFactor(d),
      { label: "Cap from the loan-payment rule", value: inr(a.foirCapEmi) + "/mo" },
      { label: "Cap from money left after essentials", value: inr(a.residualCapEmi) + "/mo" },
      {
        label: "Which one applies",
        value:
          a.bindingConstraint === "foir"
            ? "the loan-payment rule (it's lower)"
            : "money left after essentials (it's lower)",
      },
    ],
  };
}
