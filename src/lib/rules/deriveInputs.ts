// ---------------------------------------------------------------------------
// profile -> DerivedInputs: the single normalisation step every downstream rule
// reads from. Turns raw answers into "stable income (safe / lender views)",
// "essential expenses", credit tier, product routing, distress flags and the
// list of unknowns that will widen confidence.
//
// Key discipline: unknown is never zero (product brief). A missing optional
// field either uses an explicit, documented fallback (and is recorded in
// `unknownFields` + `notes`) or simply does not contribute.
// ---------------------------------------------------------------------------

import type {
  BorrowerProfile,
  IncomeType,
  LoanType,
  Purpose,
  Stability,
} from "../types/borrower";
import { isKnown } from "../types/borrower";
import { PRODUCTS, type ProductConfig } from "../config/products";
import { RULES } from "../config/rules";

export type CreditTier = "prime" | "good" | "fair" | "weak" | "unknown";

export type DerivedProduct = {
  loanType: LoanType;
  config: ProductConfig;
  reRouted: boolean;
  routeReason?: string;
};

export type DerivedInputs = {
  incomeType: IncomeType;
  purpose: Purpose;
  isProductivePurpose: boolean;

  reportedIncome: number;
  documentedIncome?: number;
  /** Income the borrower should plan around (conservative). */
  stableIncomeSafe: number;
  /** Income a lender would likely credit (still haircut, but less severe). */
  stableIncomeLender: number;

  essentialExpenses: number;
  essentialExpensesAssumed: boolean;

  existingEmiTotal: number;
  amortisedUpcomingExpense: number;
  /** stableIncomeSafe − essentials − existing EMIs − amortised upcoming expense. */
  disposableIncomeSafe: number;

  creditTier: CreditTier;
  creditScoreKnown: boolean;

  /** Passthroughs for rate/decision — undefined means "not asked". */
  stability?: Stability;
  cardUtilisation?: number;
  emergencySavingsMonths?: number;

  product: DerivedProduct;
  collateralValue?: number;

  hasRecentBounce: boolean;
  hasExpensiveExistingDebt: boolean;
  /** Recent repayment stress — disables productive-income credit. */
  distress: boolean;
  /** 50% of projected extra income, or 0 when unknown / not productive / distress. */
  productiveMonthlyCredit: number;

  /** Machine ids of missing fields, for confidence scoring. */
  unknownFields: string[];
  /** Human-readable assumptions the borrower should see. */
  notes: string[];
  /** How many high-impact optional fields were answered (confidence points). */
  confidencePoints: number;
};

const PRODUCTIVE_PURPOSES: ReadonlySet<Purpose> = new Set<Purpose>([
  "business_investment",
  "working_capital",
  "vehicle_for_work",
  "home_purchase",
  "home_reno",
]);

function creditTierFor(score: number): CreditTier {
  const t = RULES.creditTiers;
  if (score >= t.prime.min) return "prime";
  if (score >= t.good.min) return "good";
  if (score >= t.fair.min) return "fair";
  return "weak";
}

function cashMidpoint(p: BorrowerProfile): number {
  if (p.incomeRangeLow != null && p.incomeRangeHigh != null) {
    return (p.incomeRangeLow + p.incomeRangeHigh) / 2;
  }
  return p.reportedIncome;
}

// ---- income derivation, per income type ---------------------------------

function salariedIncome(p: BorrowerProfile, unknowns: string[]) {
  const h = RULES.incomeHaircut;
  if (isKnown(p.variableIncomeShare)) {
    const v = p.variableIncomeShare.value;
    const fixed = p.reportedIncome * (1 - v);
    const variable = p.reportedIncome * v;
    return {
      safe: fixed + variable * h.variablePaySafeWeight,
      lender: fixed + variable * h.variablePayLenderWeight,
    };
  }
  // Not asked -> assume fully fixed but flag it (do not silently optimise).
  unknowns.push("variableIncomeShare");
  return { safe: p.reportedIncome, lender: p.reportedIncome };
}

function selfEmployedIncome(p: BorrowerProfile, unknowns: string[]) {
  const h = RULES.incomeHaircut;
  const cashMid = cashMidpoint(p);
  const documented = isKnown(p.documentedIncome) ? p.documentedIncome.value : undefined;
  if (documented == null) unknowns.push("documentedIncome");

  const lender =
    documented != null
      ? Math.min(documented, h.selfEmployedLenderCashWeight * cashMid)
      : h.selfEmployedSafeCashWeight * cashMid; // no ITR -> lender can only use the conservative figure
  const safe =
    documented != null
      ? Math.min(documented, h.selfEmployedSafeCashWeight * cashMid)
      : h.selfEmployedSafeCashWeight * cashMid;
  return { safe, lender };
}

function informalIncome(p: BorrowerProfile, unknowns: string[]) {
  const h = RULES.incomeHaircut;
  if (p.incomeRangeLow != null && p.incomeRangeHigh != null) {
    const point =
      p.incomeRangeLow + h.informalPointInRange * (p.incomeRangeHigh - p.incomeRangeLow);
    return { safe: point, lender: point };
  }
  unknowns.push("incomeRange");
  // Fall back to a haircut on the single figure they gave.
  return {
    safe: p.reportedIncome * h.selfEmployedSafeCashWeight,
    lender: p.reportedIncome * h.selfEmployedSafeCashWeight,
  };
}

function coApplicantContribution(p: BorrowerProfile): number {
  if (!isKnown(p.coApplicantIncome)) return 0;
  const h = RULES.incomeHaircut;
  const weight =
    p.coApplicantIncomeType === "informal"
      ? h.coApplicantInformalWeight
      : h.coApplicantFormalWeight;
  return p.coApplicantIncome.value * weight;
}

// ---- product routing ---------------------------------------------------
// Borrower-favourable: if the borrower is heading for an unsecured loan but owns
// enough unencumbered collateral to cover it, route to the cheaper secured
// product. Never the reverse. Collateral affects O2A / rate only (never O2B/O4).

function routeProduct(p: BorrowerProfile): DerivedProduct {
  const stated = p.loanType;
  const statedConfig = PRODUCTS[stated];
  const collateral = isKnown(p.collateralValue) ? p.collateralValue.value : 0;

  if (statedConfig.secured || collateral <= 0) {
    return { loanType: stated, config: statedConfig, reRouted: false };
  }

  const target: LoanType =
    stated === "business_unsecured" ? "business_secured" : "lap";
  const targetConfig = PRODUCTS[target];
  const covers = collateral * (targetConfig.ltv ?? 0) >= p.amountWanted;

  if (!covers) {
    return { loanType: stated, config: statedConfig, reRouted: false };
  }
  return {
    loanType: target,
    config: targetConfig,
    reRouted: true,
    routeReason: `You own unencumbered collateral worth more than you want to borrow. A ${targetConfig.label.toLowerCase()} is secured, so it is priced far below an unsecured loan.`,
  };
}

// ---- main --------------------------------------------------------------

export function deriveInputs(p: BorrowerProfile): DerivedInputs {
  const unknownFields: string[] = [];
  const notes: string[] = [];

  // Income (two views) + co-applicant.
  const base =
    p.incomeType === "salaried"
      ? salariedIncome(p, unknownFields)
      : p.incomeType === "self_employed"
        ? selfEmployedIncome(p, unknownFields)
        : informalIncome(p, unknownFields);
  // Spouse / other income is added ONLY when the borrower explicitly named a
  // co-applicant (the coApplicantIncome question). It is never inferred.
  const coApp = coApplicantContribution(p);
  const stableIncomeSafe = base.safe + coApp;
  const stableIncomeLender = base.lender + coApp;
  if (coApp > 0) {
    notes.push(
      `A co-applicant's income (counted at ${
        p.coApplicantIncomeType === "informal"
          ? RULES.incomeHaircut.coApplicantInformalWeight * 100
          : RULES.incomeHaircut.coApplicantFormalWeight * 100
      }%) is included because you named them on this loan. Without a co-applicant on the application, only your own income counts.`,
    );
  }

  if (
    p.incomeType === "self_employed" &&
    isKnown(p.documentedIncome) &&
    p.documentedIncome.value < cashMidpoint(p)
  ) {
    notes.push(
      "Your documented (ITR) income is lower than your stated cash income, so the lender-side estimate uses the documented figure.",
    );
  }

  // Essential expenses — unknown uses a visible fallback, never zero.
  let essentialExpenses: number;
  let essentialExpensesAssumed = false;
  if (isKnown(p.householdExpenses)) {
    essentialExpenses = p.householdExpenses.value;
  } else {
    essentialExpenses =
      p.reportedIncome * RULES.residual.householdUnknownFallbackShareOfIncome;
    essentialExpensesAssumed = true;
    unknownFields.push("householdExpenses");
    notes.push(
      `You didn't give your household running costs, so we assumed ${Math.round(
        RULES.residual.householdUnknownFallbackShareOfIncome * 100,
      )}% of your income for the affordability maths only. Enter your real expenses and this result may change.`,
    );
  }

  // Upcoming large expense -> monthly drag over the window.
  let amortisedUpcomingExpense = 0;
  if (isKnown(p.upcomingLargeExpense)) {
    const { amount, withinMonths } = p.upcomingLargeExpense.value;
    amortisedUpcomingExpense = amount / Math.max(1, withinMonths);
  }

  const disposableIncomeSafe =
    stableIncomeSafe - essentialExpenses - p.existingEmiTotal - amortisedUpcomingExpense;

  // Credit tier.
  const creditScoreKnown = isKnown(p.creditScore);
  const creditTier: CreditTier = creditScoreKnown
    ? creditTierFor((p.creditScore as { value: number }).value)
    : "unknown";
  if (!creditScoreKnown) unknownFields.push("creditScore");

  // Distress signals.
  const hasRecentBounce =
    isKnown(p.bouncedPaymentsRecent) &&
    p.bouncedPaymentsRecent.value.count > 0 &&
    p.bouncedPaymentsRecent.value.withinMonths <= RULES.decision.distressBounceWithinMonths;
  const hasExpensiveExistingDebt = (p.existingLoans ?? []).some(
    (l) => (l.aprPct ?? 0) >= RULES.decision.expensiveDebtAprPct,
  );
  const distress = hasRecentBounce || hasExpensiveExistingDebt;

  // Productive-income credit: 50%, O1 only, off under distress. RULES.md §9a.
  const isProductivePurpose = PRODUCTIVE_PURPOSES.has(p.purpose);
  let productiveMonthlyCredit = 0;
  if (isProductivePurpose && isKnown(p.productiveReturn) && !distress) {
    productiveMonthlyCredit =
      p.productiveReturn.value.extraMonthlyIncome * RULES.incomeHaircut.productiveReturnWeight;
  } else if (isProductivePurpose && isKnown(p.productiveReturn) && distress) {
    notes.push(
      "You expect this loan to raise your income, but because of recent repayment stress we do not count that projected income.",
    );
  }

  // Confidence points — high-impact optional fields that were answered.
  let confidencePoints = 0;
  if (creditScoreKnown) confidencePoints++;
  if (isKnown(p.householdExpenses)) confidencePoints++;
  if (isKnown(p.incomeStability)) confidencePoints++;
  else unknownFields.push("incomeStability");
  if (p.incomeType === "self_employed" && isKnown(p.documentedIncome)) confidencePoints++;

  return {
    incomeType: p.incomeType,
    purpose: p.purpose,
    isProductivePurpose,
    reportedIncome: p.reportedIncome,
    documentedIncome: isKnown(p.documentedIncome) ? p.documentedIncome.value : undefined,
    stableIncomeSafe,
    stableIncomeLender,
    essentialExpenses,
    essentialExpensesAssumed,
    existingEmiTotal: p.existingEmiTotal,
    amortisedUpcomingExpense,
    disposableIncomeSafe,
    creditTier,
    creditScoreKnown,
    stability: isKnown(p.incomeStability) ? p.incomeStability.value : undefined,
    cardUtilisation: isKnown(p.cardUtilisation) ? p.cardUtilisation.value : undefined,
    emergencySavingsMonths: isKnown(p.emergencySavingsMonths)
      ? p.emergencySavingsMonths.value
      : undefined,
    product: routeProduct(p),
    collateralValue: isKnown(p.collateralValue) ? p.collateralValue.value : undefined,
    hasRecentBounce,
    hasExpensiveExistingDebt,
    distress,
    productiveMonthlyCredit,
    unknownFields,
    notes,
    confidencePoints,
  };
}
