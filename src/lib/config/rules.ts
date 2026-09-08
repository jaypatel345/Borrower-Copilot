// ---------------------------------------------------------------------------
// THE central rule configuration. Every threshold the engine uses lives here so
// that "change 40% to 45%" is a one-line edit (product brief). Each value maps
// to a row in RULES.md; section refs in comments.
// ---------------------------------------------------------------------------

import type { IncomeType } from "../types/borrower";

export const RULES = {
  // -- §6 Lender-side FOIR (O2A, "what a lender will likely sanction") --------
  lenderFoir: {
    salariedHigh: 0.55, // net income > Rs 1,00,000/mo   (market reference)
    salariedMid: 0.5, // net income Rs 30k-1,00,000/mo  (market reference)
    salariedLow: 0.4, // net income < Rs 30,000/mo      (my judgement)
    salariedHighIncomeCutoff: 100_000,
    salariedLowIncomeCutoff: 30_000,
    selfEmployed: 0.45, // applied to DOCUMENTED income   (my judgement)
    informal: 0.4, // applied to ASSESSED income     (my judgement)
  },

  // -- §7 Borrower-safe FOIR (O2B, O4) — my judgement throughout -------------
  safeFoir: {
    byIncomeType: {
      salaried: 0.4,
      self_employed: 0.35,
      informal: 0.3,
    } as Record<IncomeType, number>,
    adj: {
      lowEmergencySavingsPp: -0.05, // < 1 month saved
      highEmergencySavingsPp: +0.03, // >= 6 months saved (capped)
      recentBouncePp: -0.05, // any bounce in last 3 months
    },
    floor: 0.25, // never let adjustments stack below this
    lowSavingsMonths: 1,
    highSavingsMonths: 6,
  },

  // -- §8 Residual-income test (second ceiling; engine takes the lower) ------
  residual: {
    maxNewEmiShareOfDisposable: 0.6, // my judgement
    householdUnknownFallbackShareOfIncome: 0.5, // CALCULATION fallback only, never shown as real expenses
    minBufferShareOfIncome: 0.1, // below this -> DONT BORROW
  },

  // -- §9a Income haircuts — my judgement -----------------------------------
  incomeHaircut: {
    variablePaySafeWeight: 0.5,
    variablePayLenderWeight: 0.6,
    selfEmployedLenderCashWeight: 0.65, // vs min(documented, weight*cashMidpoint)
    selfEmployedSafeCashWeight: 0.5,
    informalPointInRange: 0.25, // low + 0.25*(high-low)
    coApplicantFormalWeight: 0.8,
    coApplicantInformalWeight: 0.6,
    productiveReturnWeight: 0.5, // O1 only; disabled under distress
  },

  // -- §9b Credit-score tiers (CIBIL 300-900) -------------------------------
  creditTiers: {
    prime: { min: 760, ratePremiumPp: 0.0 },
    good: { min: 725, ratePremiumPp: 0.5 },
    fair: { min: 680, ratePremiumPp: 1.5 },
    weak: { min: 0, ratePremiumPp: 3.0 },
    unknown: {
      ratePremiumLowPp: 0.75, // widen band low side
      ratePremiumHighPp: 2.0, // widen band high side
      dropsConfidenceLevels: 1,
    },
  },

  // -- §6 Lender capacity multiplier by credit tier — my judgement --------
  // Applied to the income-derived principal in O2A only (a haircut for risk,
  // NOT a rejection; unknown score => 0.9, never 0). RULES.md §6.
  lenderCapacityMultiplierByTier: {
    prime: 1.0,
    good: 0.95,
    fair: 0.85,
    weak: 0.7,
    unknown: 0.9,
  },

  // -- §9c Additive rate premiums — my judgement --------------------------
  ratePremiumsPp: {
    incomeType: { salaried: 0.0, self_employed: 0.5, informal: 1.5 } as Record<IncomeType, number>,
    stabilityVariable: 0.5,
    stabilityUncertain: 1.5,
    foirBeforeLoanOver40: 0.5,
    cardUtilOver80: 0.5,
    recentBounce: 2.0,
    smallUnsecuredTicket: 0.5,
    smallUnsecuredTicketCutoff: 100_000,
    // Applied to a secured LAP / business-secured / home loan when unencumbered
    // collateral comfortably covers the ask. Improves the band but is smaller
    // than the unknown-credit widen, so no-credit-history uncertainty survives.
    securedCollateralDiscount: { lowPp: 0.5, highPp: 1.0 },
  },

  // -- §10 Stress test — my judgement ------------------------------------
  stress: {
    incomeDropPct: 0.15,
    rateRisePp: 2.0,
    failTotalFoirPct: 0.6,
    // fail also if post-stress residual < 0
  },

  // -- §11 O1 decision thresholds — my judgement ------------------------
  decision: {
    distressBounceWithinMonths: 3,
    distressPostLoanFoirPct: 0.35,
    expensiveDebtAprPct: 24,
    expensiveDebtOutstandingIncomeMultiple: 3,
    weakConsumptionSafeVsWantedRatio: 0.4,
    // "weak affordability" for the consumption DON'T-stop: safe EMI ceiling is a
    // small slice of income. Prevents a healthy borrower who simply over-asks
    // from getting DON'T instead of BORROW LESS.
    weakAffordabilityCeilingShareOfIncome: 0.2,
    borrowLessSafeVsWantedRatio: 0.9,
  },

  // -- §12 Confidence model — my judgement -----------------------------
  confidence: {
    amountWidthPct: { high: 0.08, medium: 0.15, low: 0.22 },
    rateWidenHighPp: { high: 0.0, medium: 1.0, low: 2.0 },
    highMinPoints: 3,
    mediumMinPoints: 1,
  },

  // -- §13 Age caps -----------------------------------------------------
  retirementAge: { salaried: 60, self_employed: 65, informal: 65 } as Record<IncomeType, number>,

  // -- §14 Rounding ---------------------------------------------------
  rounding: {
    amountStep: 50_000,
    emiFloorStep: 500,
    ratePctStep: 0.25,
    aprPctStep: 0.1,
  },
} as const;

export type RulesConfig = typeof RULES;
