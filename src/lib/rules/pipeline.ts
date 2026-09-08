// ---------------------------------------------------------------------------
// runAssessment(profile) -> ResultBundle. Pure orchestrator: no I/O, no Date,
// no UI. Deterministic, so the three fixtures snapshot cleanly.
// ---------------------------------------------------------------------------

import type { BorrowerProfile } from "../types/borrower";
import { isKnown } from "../types/borrower";
import type {
  EmiResult,
  NegotiationCard,
  RateResult,
  ResultBundle,
  TenureOption,
} from "../types/results";
import { RULES } from "../config/rules";
import { PRODUCTS } from "../config/products";
import { emi, totalInterest } from "../calculations/emi";
import {
  inrOrNil,
  lakhRangeOrNil,
  midpoint,
  pctRange,
  roundDownTo,
  tenureRangeLabel,
} from "../calculations/money";

import { deriveInputs } from "./deriveInputs";
import { computeConfidence } from "./confidence";
import { computeFairRate } from "./rate";
import { computeApr } from "./apr";
import { computeAffordability } from "./affordability";
import { computeSafeAmount } from "./safeAmount";
import { computeLenderSanction } from "./eligibility";
import { computeStress } from "./stress";
import { computeDecision } from "./decision";
import { availableTenures, comfortableTenure } from "./tenure";
import { amountExplanation, emiExplanation, rateExplanation } from "./explanations";

export function runAssessment(profile: BorrowerProfile): ResultBundle {
  const d = deriveInputs(profile);
  const confidence = computeConfidence(d);

  // O3 rate (needed to size both amounts).
  const fair = computeFairRate(profile, d, confidence.level);

  // Affordability + both amount views.
  const affordability = computeAffordability(d);
  const safeDisplay = computeSafeAmount(
    d,
    affordability,
    fair.bandPct,
    profile.age,
    confidence.amountWidthPct,
  );
  const safeForGate = computeSafeAmount(
    d,
    affordability,
    fair.bandPct,
    profile.age,
    confidence.amountWidthPct,
    d.productiveMonthlyCredit,
  );
  const lender = computeLenderSanction(
    d,
    profile.age,
    fair.bandPct,
    confidence.amountWidthPct,
  );

  // Illustrative principal for APR + EMI schedule = safe amount midpoint.
  // Every safe-amount-derived EMI figure (O4 total, tenure table, stress) is
  // computed at the TOP of the fair band — the same rate the safe amount was
  // sized against — so the numbers reconcile and stay conservative.
  const safeMid = midpoint(safeDisplay.range);
  const safeRatePct = fair.bandPct.high;
  const comfyTenure = comfortableTenure(d, profile.age);
  const apr = computeApr(profile, d, fair.bandPct, Math.max(safeMid, 1), comfyTenure);

  // Stress at the safe amount.
  const stress = computeStress(d, {
    principal: Math.max(safeMid, 0),
    ratePct: safeRatePct,
    months: comfyTenure,
  });

  // O1.
  const decision = computeDecision({
    profile,
    d,
    affordability,
    safeDisplay,
    safeForGate,
    lenderRange: lender.range,
    fairBandPct: fair.bandPct,
    stress,
  });

  // ---- O4 EMI result --------------------------------------------------
  const ceiling = roundDownTo(affordability.safeEmiCeiling, RULES.rounding.emiFloorStep);
  const proposedEmiAtSafe = emi(safeMid, safeRatePct, comfyTenure);
  const tenureOptions = buildTenureOptions(d, profile, safeMid, safeRatePct);
  const shortestAffordable =
    tenureOptions.find((t) => t.emi <= Math.max(ceiling, 1))?.months ?? comfyTenure;

  const emiResult: EmiResult = {
    ceiling,
    bindingConstraint: affordability.bindingConstraint,
    currentEmi: d.existingEmiTotal,
    totalAfterProposed: d.existingEmiTotal + proposedEmiAtSafe,
    residualAfter:
      d.stableIncomeSafe - d.essentialExpenses - d.existingEmiTotal - proposedEmiAtSafe,
    tenureOptions,
    stress,
    explanation: emiExplanation(d, affordability, ceiling),
  };

  // ---- O3 rate result -----------------------------------------------
  const rateResult: RateResult = {
    fairBandPct: fair.bandPct,
    aprBandPct: apr.aprBandPct,
    processingFeePct: apr.processingFeePct,
    drivers: fair.drivers,
    explanation: rateExplanation(d, fair.bandPct, fair.drivers),
    offerComparison: buildOfferComparison(profile, fair.bandPct),
  };

  // ---- O2 amount result -------------------------------------------
  const routeAlternative = d.product.reRouted
    ? `Unsecured, the same purpose sits at roughly ${pctRange(
        PRODUCTS[profile.loanType].fairBandPct,
      )} before risk premiums, on a smaller amount — the secured route is materially cheaper.`
    : undefined;
  const amountResult = {
    lenderSanction: lender.range,
    safeAmount: safeDisplay.range,
    recommended: "safe" as const,
    routedTo: d.product.reRouted ? d.product.loanType : undefined,
    routeReason: d.product.routeReason,
    routeAlternative,
    explanation: amountExplanation(
      d,
      affordability,
      safeDisplay.range,
      lender.range,
      d.product.reRouted,
    ),
  };

  // ---- Negotiation Card ----------------------------------------
  const isDont = decision.verdict === "dont_borrow";
  // A "don't borrow" card is not a negotiation ask — no tenure, no rate script.
  const tenureRange = isDont ? { low: 0, high: 0 } : { low: shortestAffordable, high: comfyTenure };
  const card: NegotiationCard = {
    verdict: decision.verdict,
    verdictLine: decision.headline,
    safeAmount: safeDisplay.range,
    lenderRange: lender.range,
    emiCeiling: ceiling,
    fairRatePct: fair.bandPct,
    aprPct: apr.aprBandPct,
    tenureMonths: tenureRange,
    why: decision.reasons.slice(0, 3),
    stressLine: stress.sentence,
    sayThis: isDont
      ? buildStandLine(d)
      : buildSayThis({
          safe: lakhRangeOrNil(safeDisplay.range),
          rate: pctRange(fair.bandPct),
          ceiling: inrOrNil(ceiling),
          tenure: tenureRangeLabel(tenureRange.low, tenureRange.high),
        }),
    confidenceLevel: confidence.level,
    missing: confidence.missing,
  };

  // ---- disclosures --------------------------------------------
  const disclosures = buildDisclosures(d, profile);

  return {
    decision,
    amount: amountResult,
    rate: rateResult,
    emi: emiResult,
    card,
    confidence,
    disclosures,
  };
}

// ---- helpers -----------------------------------------------------------

function buildTenureOptions(
  d: ReturnType<typeof deriveInputs>,
  profile: BorrowerProfile,
  principal: number,
  ratePct: number,
): TenureOption[] {
  const tenures = availableTenures(d, profile.age);
  return tenures.map((months, i) => {
    const e = emi(principal, ratePct, months);
    const ti = totalInterest(principal, ratePct, months);
    let note = "";
    if (i === 0) note = "Clears fastest, least total interest";
    else if (i === tenures.length - 1) note = "Lowest monthly, most total interest";
    else note = "Middle ground";
    return { months, emi: Math.round(e), totalInterest: Math.round(ti), note };
  });
}

function buildOfferComparison(
  profile: BorrowerProfile,
  fairBandPct: { low: number; high: number },
): RateResult["offerComparison"] {
  if (!isKnown(profile.existingOffer)) return undefined;
  const { ratePct } = profile.existingOffer.value;
  const verdict: "fair" | "high" | "very_high" =
    ratePct <= fairBandPct.high
      ? "fair"
      : ratePct <= fairBandPct.high + 2
        ? "high"
        : "very_high";
  return { lenderRatePct: ratePct, verdict };
}

function buildSayThis(a: {
  safe: string;
  rate: string;
  ceiling: string;
  tenure: string;
}): string {
  return `"Based on my profile I'm looking for about ${a.safe} at ${a.rate}, with an EMI no higher than ${a.ceiling}, over ${a.tenure}. Please share the Key Facts Statement with the all-in APR including fees."`;
}

/** The "where you stand" line for a DON'T BORROW card — first person, no ₹0 ask. */
function buildStandLine(d: ReturnType<typeof deriveInputs>): string {
  return d.hasExpensiveExistingDebt
    ? `"I've been through my finances. I'm not taking a new loan yet — I'm clearing my higher-interest debt first, then I'll reassess."`
    : `"I've been through my finances. Taking this on now wouldn't leave me a safe repayment buffer, so I'm holding off for now."`;
}

function buildDisclosures(
  d: ReturnType<typeof deriveInputs>,
  profile: BorrowerProfile,
): string[] {
  const out = [...d.notes];
  out.push(
    "Interest rates and fees are market reference ranges for Sep 2026, not any lender's live offer.",
  );
  out.push(
    "The lender-sanction figure is an estimate of what you might be offered — not a prediction or a guarantee.",
  );
  if (d.product.reRouted) {
    out.push(
      "We assumed you are willing to pledge your property. If not, the unsecured route applies and the numbers change.",
    );
  }
  if (
    d.isProductivePurpose &&
    isKnown(profile.productiveReturn) &&
    d.productiveMonthlyCredit > 0
  ) {
    out.push(
      "We counted only half of the extra income you expect from this loan, and only when deciding borrow vs borrow-less — not for the lender estimate.",
    );
  }
  return out;
}
