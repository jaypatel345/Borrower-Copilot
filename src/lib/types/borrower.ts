// ---------------------------------------------------------------------------
// BorrowerProfile — the single source of truth for a borrower's answers.
//
// Three states per optional field (CLAUDE.md §3.3, "Unknown is never zero"):
//   - field absent from the object  -> not asked (adaptive flow skipped it)
//   - { status: "unknown" }         -> asked, borrower does not know
//   - { status: "known", value }    -> asked, answered
// ---------------------------------------------------------------------------

export type Known<T> =
  | { status: "known"; value: T }
  | { status: "unknown" };

export const known = <T,>(value: T): Known<T> => ({ status: "known", value });
export const unknown = <T,>(): Known<T> => ({ status: "unknown" });
export const isKnown = <T,>(k: Known<T> | undefined): k is { status: "known"; value: T } =>
  !!k && k.status === "known";

export type IncomeType = "salaried" | "self_employed" | "informal";

export type Purpose =
  | "wedding"
  | "medical"
  | "education"
  | "home_purchase"
  | "home_reno"
  | "vehicle"
  | "vehicle_for_work"
  | "debt_consolidation"
  | "business_investment"
  | "working_capital"
  | "consumption_other";

export type LoanType =
  | "personal"
  | "home"
  | "lap"
  | "gold"
  | "two_wheeler"
  | "business_secured"
  | "business_unsecured";

export type Stability = "very_stable" | "stable" | "variable" | "uncertain";

export type CollateralType = "property" | "gold" | "vehicle" | "other";

export type ExistingLoanKind =
  | "secured"
  | "unsecured"
  | "app_loan"
  | "credit_card"
  | "informal";

export type ExistingLoan = {
  kind: ExistingLoanKind;
  emi?: number; // INR / month
  outstanding?: number; // INR
  aprPct?: number; // borrower's stated rate on it
  monthsRemaining?: number;
};

export type BorrowerProfile = {
  // ---- MUST fields (always present once the must-set is complete) ----
  purpose: Purpose;
  loanType: LoanType; // stated intent; the engine may re-route (e.g. Ravi -> LAP)
  amountWanted: number; // INR
  reportedIncome: number; // INR / month, take-home
  incomeType: IncomeType;
  existingEmiTotal: number; // INR / month; 0 is a real answer
  householdExpenses: Known<number>; // INR / month, essentials excl. EMIs
  age: number;
  creditScore: Known<number>; // CIBIL-style 300-900

  // ---- ADDITIONAL fields (present only if the adaptive flow asked) ----
  incomeStability?: Known<Stability>;
  variableIncomeShare?: Known<number>; // 0..1 of income that swings
  documentedIncome?: Known<number>; // ITR / Form-16 monthly, kept SEPARATE (§30)
  incomeRangeLow?: number; // informal borrowers give a band
  incomeRangeHigh?: number;
  existingLoans?: ExistingLoan[]; // detail behind existingEmiTotal
  cardUtilisation?: Known<number>; // 0..1
  bouncedPaymentsRecent?: Known<{ count: number; withinMonths: number }>;
  emergencySavingsMonths?: Known<number>;
  collateralValue?: Known<number>; // INR, unencumbered
  collateralType?: CollateralType;
  coApplicantIncome?: Known<number>; // INR / month
  coApplicantIncomeType?: IncomeType;
  upcomingLargeExpense?: Known<{ amount: number; withinMonths: number }>;
  productiveReturn?: Known<{ extraMonthlyIncome: number; paybackMonths: number }>;
  existingOffer?: Known<{
    ratePct: number;
    processingFeePct?: number;
    amount?: number;
    tenureMonths?: number;
  }>;
  processingFeePctOverride?: Known<number>;
};

// A partial profile while the interview is in progress.
export type DraftProfile = Partial<BorrowerProfile>;
