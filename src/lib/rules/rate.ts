// ---------------------------------------------------------------------------
// O3 fair-rate band = product's well-qualified band + additive risk premiums
// (RULES.md §9b, §9c). Never a point. Unknowns widen the HIGH side only, so
// missing information can never make the band look tighter (CLAUDE.md §3.4).
// ---------------------------------------------------------------------------

import type { BorrowerProfile } from "../types/borrower";
import type { DerivedInputs } from "./deriveInputs";
import type { ConfidenceLevel, Range } from "../types/results";
import { RULES } from "../config/rules";
import { EV_GREEN_CONCESSION_PP } from "../config/products";
import { roundTo } from "../calculations/money";

export type FairRate = {
  bandPct: Range;
  drivers: string[]; // each non-zero adjustment, plain language, for the card
};

export function computeFairRate(
  p: BorrowerProfile,
  d: DerivedInputs,
  confidenceLevel: ConfidenceLevel,
): FairRate {
  const base = d.product.config.fairBandPct;
  let low = base.low;
  let high = base.high;
  const drivers: string[] = [];
  const bump = (lowPp: number, highPp: number, text: string) => {
    low += lowPp;
    high += highPp;
    if (text) drivers.push(text);
  };

  // Credit tier.
  const t = RULES.creditTiers;
  if (d.creditTier === "unknown") {
    bump(t.unknown.ratePremiumLowPp, t.unknown.ratePremiumHighPp, "No credit score — band widened, not penalised");
  } else {
    const pp = t[d.creditTier].ratePremiumPp;
    if (pp > 0) bump(pp, pp, `Credit score in the "${d.creditTier}" band (+${pp}pp)`);
    else drivers.push("Strong credit score — best-tier pricing");
  }

  // Income type.
  const itPp = RULES.ratePremiumsPp.incomeType[d.incomeType];
  if (itPp > 0) bump(itPp, itPp, `${d.incomeType === "informal" ? "Informal" : "Self-employed"} income (+${itPp}pp)`);

  // Stability.
  if (d.stability === "variable") bump(RULES.ratePremiumsPp.stabilityVariable, RULES.ratePremiumsPp.stabilityVariable, "Variable income (+0.5pp)");
  if (d.stability === "uncertain") bump(RULES.ratePremiumsPp.stabilityUncertain, RULES.ratePremiumsPp.stabilityUncertain, "Uncertain income (+1.5pp)");

  // Existing debt load.
  const foirBefore = d.stableIncomeSafe > 0 ? d.existingEmiTotal / d.stableIncomeSafe : 0;
  if (foirBefore > 0.4) bump(RULES.ratePremiumsPp.foirBeforeLoanOver40, RULES.ratePremiumsPp.foirBeforeLoanOver40, "Existing EMIs already above 40% of income (+0.5pp)");

  // Card utilisation.
  if (d.cardUtilisation != null && d.cardUtilisation > 0.8) bump(RULES.ratePremiumsPp.cardUtilOver80, RULES.ratePremiumsPp.cardUtilOver80, "Credit card almost maxed out (+0.5pp)");

  // Recent bounce.
  if (d.hasRecentBounce) bump(RULES.ratePremiumsPp.recentBounce, RULES.ratePremiumsPp.recentBounce, "A payment bounced in the last 3 months (+2pp)");

  // Small unsecured ticket — fixed costs. Not applied to secured / re-routed loans.
  if (!d.product.config.secured && p.amountWanted < RULES.ratePremiumsPp.smallUnsecuredTicketCutoff) {
    bump(RULES.ratePremiumsPp.smallUnsecuredTicket, RULES.ratePremiumsPp.smallUnsecuredTicket, "Small unsecured loan (+0.5pp)");
  }

  // EV green concession.
  if (p.purpose === "vehicle_for_work" && d.product.loanType === "two_wheeler") {
    bump(-EV_GREEN_CONCESSION_PP, -EV_GREEN_CONCESSION_PP, `EV green concession (−${EV_GREEN_CONCESSION_PP}pp)`);
  }

  // Secured + collateral comfortably covers the ask -> a real discount, but
  // deliberately smaller than the unknown-credit widen (uncertainty survives).
  const ltv = d.product.config.ltv ?? 0;
  const collateralCovers =
    d.product.config.secured &&
    d.collateralValue != null &&
    d.collateralValue * ltv >= p.amountWanted;
  if (collateralCovers) {
    const disc = RULES.ratePremiumsPp.securedCollateralDiscount;
    bump(-disc.lowPp, -disc.highPp, `Well-covered by collateral (−${disc.lowPp} to −${disc.highPp}pp)`);
  }

  if (d.product.reRouted) drivers.push("Priced as a secured loan — much cheaper than the unsecured route");

  // Confidence widening — high side only.
  high += RULES.confidence.rateWidenHighPp[confidenceLevel];

  low = Math.max(0, low);
  if (high < low) high = low;

  return {
    bandPct: {
      low: roundTo(low, RULES.rounding.ratePctStep),
      high: roundTo(high, RULES.rounding.ratePctStep),
    },
    drivers,
  };
}
