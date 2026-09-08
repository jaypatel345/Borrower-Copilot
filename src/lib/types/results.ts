// ---------------------------------------------------------------------------
// Output types. The pipeline (lib/rules/pipeline.ts) returns a ResultBundle;
// components in src/components/results/ render it and never compute.
// ---------------------------------------------------------------------------

import type { LoanType } from "./borrower";

export type ConfidenceLevel = "high" | "medium" | "low";

export type Range = { low: number; high: number };

export type Confidence = {
  level: ConfidenceLevel;
  /** Multiplier (>= 1) applied to base range half-widths. Never narrows. */
  amountWidthPct: number; // e.g. 0.08, 0.15, 0.22
  rateWidenHighPp: number; // extra pp added to the high side of the rate band
  missing: string[]; // human-readable list of what is unknown
};

export type Explanation = {
  /** One-sentence "why", built from the exact numbers used. */
  sentence: string;
  factors: { label: string; value: string }[];
};

// O1 -----------------------------------------------------------------------
export type Verdict = "borrow" | "borrow_less" | "dont_borrow";

export type DecisionResult = {
  verdict: Verdict;
  headline: string;
  reasons: string[]; // 2-4, each tied to a binding number
};

// O2 -----------------------------------------------------------------------
export type AmountResult = {
  lenderSanction: Range; // O2A — estimate, looser
  safeAmount: Range; // O2B — conservative, income/residual-bound
  recommended: "safe";
  routedTo?: LoanType; // set when the engine re-routes the product
  routeReason?: string;
  explanation: Explanation;
};

// O3 -----------------------------------------------------------------------
export type RateResult = {
  fairBandPct: Range;
  aprBandPct: Range; // all-in, incl. processing fee + GST
  processingFeePct: number;
  drivers: string[]; // each non-zero premium/discount, for the card
  explanation: Explanation;
  offerComparison?: {
    lenderRatePct: number;
    lenderAprPct?: number;
    verdict: "fair" | "high" | "very_high";
  };
};

// O4 -----------------------------------------------------------------------
export type TenureOption = {
  months: number;
  emi: number;
  totalInterest: number;
  note: string;
};

export type StressResult = {
  scenario: "income_drop" | "rate_rise";
  label: string; // "Income falls 15%"
  newTotalFoirPct: number;
  newResidual: number;
  pass: boolean;
  sentence: string;
};

export type EmiResult = {
  ceiling: number; // recommended monthly max
  bindingConstraint: "foir" | "residual";
  currentEmi: number;
  totalAfterProposed: number; // at the safe amount
  residualAfter: number;
  tenureOptions: TenureOption[];
  stress: StressResult;
  explanation: Explanation;
};

// Negotiation Card -------------------------------------------------------
export type NegotiationCard = {
  verdict: Verdict;
  verdictLine: string;
  safeAmount: Range;
  lenderRange: Range;
  emiCeiling: number;
  fairRatePct: Range;
  aprPct: Range;
  tenureMonths: Range;
  why: string[]; // 2-4 concise
  stressLine: string;
  sayThis: string;
  confidenceLevel: ConfidenceLevel;
  missing: string[];
};

// Bundle -----------------------------------------------------------------
export type ResultBundle = {
  decision: DecisionResult;
  amount: AmountResult;
  rate: RateResult;
  emi: EmiResult;
  card: NegotiationCard;
  confidence: Confidence;
  /** Assumptions the app made that the borrower should know about. */
  disclosures: string[];
};
