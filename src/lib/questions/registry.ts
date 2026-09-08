// ---------------------------------------------------------------------------
// The question set. Two tiers (product brief):
//   - must:       ~9 questions; the app produces all four outputs from these
//   - additional: only asked when appliesWhen() is true AND the answer moves an
//                 output (every additional question declares `affects`)
//
// Each question is pure: `toProfile(answer, draft)` returns a Partial to merge.
// "I don't know" answers arrive as the string "unknown" and map to
// { field: { status: "unknown" } } — never to 0 (product brief).
// ---------------------------------------------------------------------------

import type { BorrowerProfile, DraftProfile, LoanType, Purpose } from "../types/borrower";
import { known, unknown, isKnown } from "../types/borrower";

export type OutputId = "O1" | "O2" | "O3" | "O4";
export type QuestionTier = "must" | "additional";

export type InputSpec =
  | { kind: "choice"; options: { value: string; label: string }[] }
  | { kind: "money"; allowUnknown?: boolean; zeroLabel?: string }
  | { kind: "integer"; min: number; max: number; suffix?: string }
  | { kind: "score"; allowUnknown: true }
  | { kind: "percent"; allowUnknown?: boolean }
  | { kind: "months"; allowUnknown?: boolean }
  | { kind: "moneyRange" }
  | { kind: "bounce" }
  | { kind: "upcomingExpense" }
  | { kind: "productiveReturn" }
  | { kind: "offer" };

export type Question = {
  id: string;
  tier: QuestionTier;
  prompt: string;
  help?: string;
  input: InputSpec;
  /** Outputs this answer can change. MUST be non-empty for `additional` questions. */
  affects: OutputId[];
  appliesWhen: (d: DraftProfile) => boolean;
  toProfile: (answer: unknown, d: DraftProfile) => Partial<BorrowerProfile>;
};

// ---- helpers ----------------------------------------------------------

const PRODUCTIVE_PURPOSES: ReadonlySet<Purpose> = new Set<Purpose>([
  "business_investment",
  "working_capital",
  "vehicle_for_work",
  "home_purchase",
  "home_reno",
]);

export function defaultLoanType(purpose: Purpose): LoanType {
  switch (purpose) {
    case "home_purchase":
    case "home_reno":
      return "home";
    case "vehicle":
    case "vehicle_for_work":
      return "two_wheeler";
    case "business_investment":
    case "working_capital":
      return "business_unsecured";
    default:
      return "personal";
  }
}

const num = (a: unknown): number => (typeof a === "number" ? a : Number(a));
const isUnknown = (a: unknown): a is "unknown" => a === "unknown";

// ---- must questions (order = ask order) ------------------------------

const MUST: Question[] = [
  {
    id: "purpose",
    tier: "must",
    prompt: "What's the money for?",
    input: {
      kind: "choice",
      options: [
        { value: "wedding", label: "A wedding" },
        { value: "medical", label: "Medical costs" },
        { value: "education", label: "Education" },
        { value: "home_purchase", label: "Buying a home" },
        { value: "home_reno", label: "Home repairs / renovation" },
        { value: "vehicle", label: "A vehicle (personal use)" },
        { value: "vehicle_for_work", label: "A vehicle to earn with" },
        { value: "business_investment", label: "Growing a business" },
        { value: "working_capital", label: "Business running costs" },
        { value: "debt_consolidation", label: "Paying off other debt" },
        { value: "consumption_other", label: "Something else" },
      ],
    },
    affects: ["O1", "O2", "O3", "O4"],
    appliesWhen: () => true,
    toProfile: (a) => {
      const purpose = a as Purpose;
      return { purpose, loanType: defaultLoanType(purpose) };
    },
  },
  {
    id: "loanType",
    tier: "must",
    prompt: "What kind of loan are you thinking about?",
    help: "We've pre-picked one based on your answer above — change it if you had something else in mind.",
    input: {
      kind: "choice",
      options: [
        { value: "personal", label: "Personal loan" },
        { value: "home", label: "Home loan" },
        { value: "lap", label: "Loan against property" },
        { value: "gold", label: "Gold loan" },
        { value: "two_wheeler", label: "Two-wheeler loan" },
        { value: "business_unsecured", label: "Business loan (no security)" },
        { value: "business_secured", label: "Business loan (against property)" },
      ],
    },
    affects: ["O2", "O3", "O4"],
    appliesWhen: () => true,
    toProfile: (a) => ({ loanType: a as LoanType }),
  },
  {
    id: "amountWanted",
    tier: "must",
    prompt: "How much do you want to borrow?",
    input: { kind: "money" },
    affects: ["O1", "O2", "O4"],
    appliesWhen: () => true,
    toProfile: (a) => ({ amountWanted: num(a) }),
  },
  {
    id: "reportedIncome",
    tier: "must",
    prompt: "How much do you take home in a typical month, after tax?",
    input: { kind: "money" },
    affects: ["O1", "O2", "O3", "O4"],
    appliesWhen: () => true,
    toProfile: (a) => ({ reportedIncome: num(a) }),
  },
  {
    id: "incomeType",
    tier: "must",
    prompt: "How does that income reach you?",
    input: {
      kind: "choice",
      options: [
        { value: "salaried", label: "A regular salary" },
        { value: "self_employed", label: "From my own business or profession" },
        { value: "informal", label: "Irregular, cash, or gig work" },
      ],
    },
    affects: ["O1", "O2", "O3", "O4"],
    appliesWhen: () => true,
    toProfile: (a) => ({ incomeType: a as BorrowerProfile["incomeType"] }),
  },
  {
    id: "existingEmiTotal",
    tier: "must",
    prompt: "How much do you pay every month on loans or EMIs you already have?",
    input: { kind: "money", zeroLabel: "Nothing" },
    affects: ["O1", "O2", "O4"],
    appliesWhen: () => true,
    toProfile: (a) => ({ existingEmiTotal: num(a) }),
  },
  {
    id: "householdExpenses",
    tier: "must",
    prompt:
      "Roughly what does your household spend each month to run — rent, food, bills, school fees — not counting loan payments?",
    help: "A rough figure is fine. If you genuinely can't estimate, choose \"I'm not sure\" — we'll widen the result and tell you.",
    input: { kind: "money", allowUnknown: true },
    affects: ["O1", "O2", "O4"],
    appliesWhen: () => true,
    toProfile: (a) =>
      isUnknown(a) ? { householdExpenses: unknown() } : { householdExpenses: known(num(a)) },
  },
  {
    id: "age",
    tier: "must",
    prompt: "How old are you?",
    input: { kind: "integer", min: 18, max: 75, suffix: "years" },
    affects: ["O2", "O4"],
    appliesWhen: () => true,
    toProfile: (a) => ({ age: num(a) }),
  },
  {
    id: "creditScore",
    tier: "must",
    prompt: "Do you know your credit score?",
    help: "CIBIL or similar, 300–900. If you don't know it, that's fine — say so and we won't guess.",
    input: { kind: "score", allowUnknown: true },
    affects: ["O2", "O3"],
    appliesWhen: () => true,
    toProfile: (a) =>
      isUnknown(a) ? { creditScore: unknown() } : { creditScore: known(num(a)) },
  },
];

// ---- additional questions -------------------------------------------

const ADDITIONAL: Question[] = [
  {
    id: "incomeStability",
    tier: "additional",
    prompt: "How steady is that income?",
    input: {
      kind: "choice",
      options: [
        { value: "very_stable", label: "Very steady — same every month for years" },
        { value: "stable", label: "Mostly steady" },
        { value: "variable", label: "It moves around month to month" },
        { value: "uncertain", label: "Unpredictable / I worry about it" },
      ],
    },
    affects: ["O2", "O3", "O4"],
    appliesWhen: () => true,
    toProfile: (a) => ({ incomeStability: known(a as never) }),
  },
  {
    id: "variableIncomeShare",
    tier: "additional",
    prompt: "About what share of your income is the part that varies?",
    input: { kind: "percent" },
    affects: ["O2", "O4"],
    appliesWhen: (d) =>
      d.incomeType === "self_employed" ||
      (d.incomeType === "salaried" &&
        isKnown(d.incomeStability) &&
        (d.incomeStability.value === "variable" || d.incomeStability.value === "uncertain")),
    toProfile: (a) => ({ variableIncomeShare: known(num(a) / 100) }),
  },
  {
    id: "documentedIncome",
    tier: "additional",
    prompt: "What monthly income do your tax filings (ITR) show?",
    help: "Lenders lean on this figure, not your cash flow. Divide your annual ITR income by 12.",
    input: { kind: "money", allowUnknown: true },
    affects: ["O2"],
    appliesWhen: (d) => d.incomeType === "self_employed",
    toProfile: (a) =>
      isUnknown(a) ? { documentedIncome: unknown() } : { documentedIncome: known(num(a)) },
  },
  {
    id: "incomeRange",
    tier: "additional",
    prompt: "Think of a low month and a good month — what do you bring in?",
    input: { kind: "moneyRange" },
    affects: ["O2", "O4"],
    appliesWhen: (d) => d.incomeType === "informal" || d.incomeType === "self_employed",
    toProfile: (a) => {
      const r = a as { low: number; high: number };
      return { incomeRangeLow: r.low, incomeRangeHigh: r.high };
    },
  },
  {
    id: "existingLoans",
    tier: "additional",
    prompt: "Tell us about the loans you're already paying.",
    help: "Type, monthly EMI, amount still owed, and the interest rate if you know it.",
    input: { kind: "choice", options: [] }, // rendered as a repeatable list in the UI
    affects: ["O1", "O3"],
    appliesWhen: (d) => (d.existingEmiTotal ?? 0) > 0,
    toProfile: (a) => ({ existingLoans: a as BorrowerProfile["existingLoans"] }),
  },
  {
    id: "cardUtilisation",
    tier: "additional",
    prompt: "How much of your credit card limit are you using right now?",
    input: { kind: "percent", allowUnknown: true },
    affects: ["O1", "O3"],
    appliesWhen: (d) => d.incomeType === "salaried" || d.incomeType === "self_employed",
    toProfile: (a) =>
      isUnknown(a) ? { cardUtilisation: unknown() } : { cardUtilisation: known(num(a) / 100) },
  },
  {
    id: "bouncedPaymentsRecent",
    tier: "additional",
    prompt: "Have any payments bounced or been missed recently?",
    input: { kind: "bounce" },
    affects: ["O1", "O3"],
    appliesWhen: (d) => d.incomeType === "informal" || (d.existingEmiTotal ?? 0) > 0,
    toProfile: (a) =>
      a === "none"
        ? { bouncedPaymentsRecent: known({ count: 0, withinMonths: 12 }) }
        : { bouncedPaymentsRecent: known(a as { count: number; withinMonths: number }) },
  },
  {
    id: "emergencySavingsMonths",
    tier: "additional",
    prompt: "If your income stopped, how many months could your household keep going on savings?",
    input: { kind: "months", allowUnknown: true },
    affects: ["O1", "O2", "O4"],
    appliesWhen: () => true,
    toProfile: (a) =>
      isUnknown(a)
        ? { emergencySavingsMonths: unknown() }
        : { emergencySavingsMonths: known(num(a)) },
  },
  {
    id: "collateralValue",
    tier: "additional",
    prompt: "Do you own something loan-free you could pledge — property or gold? Roughly what's it worth?",
    input: { kind: "money", allowUnknown: true },
    affects: ["O2", "O3"],
    // Only ask where collateral could actually re-route the product or move the
    // rate: an unsecured ask, an asset-backed product, or a large personal loan.
    // A small already-secured loan (e.g. a ₹1.5L two-wheeler) does not qualify.
    appliesWhen: (d) =>
      d.incomeType === "self_employed" ||
      d.loanType === "lap" ||
      d.loanType === "gold" ||
      d.loanType === "business_secured" ||
      d.loanType === "business_unsecured" ||
      (d.loanType === "personal" && (d.amountWanted ?? 0) >= 1_000_000),
    toProfile: (a) =>
      isUnknown(a) ? { collateralValue: unknown() } : { collateralValue: known(num(a)) },
  },
  {
    id: "coApplicantIncome",
    tier: "additional",
    prompt: "Will anyone apply with you? What do they earn each month?",
    help: "Only add someone who will actually be a co-applicant on the loan.",
    input: { kind: "money", allowUnknown: true, zeroLabel: "No co-applicant" },
    affects: ["O2"],
    appliesWhen: (d) => d.incomeType === "self_employed" || d.incomeType === "informal",
    toProfile: (a) =>
      isUnknown(a) || num(a) === 0
        ? {}
        : { coApplicantIncome: known(num(a)), coApplicantIncomeType: "salaried" },
  },
  {
    id: "upcomingLargeExpense",
    tier: "additional",
    prompt: "Any big expense coming in the next year — fees, another wedding, a medical thing?",
    input: { kind: "upcomingExpense" },
    affects: ["O2", "O4"],
    appliesWhen: () => true,
    toProfile: (a) =>
      a === "none"
        ? {}
        : { upcomingLargeExpense: known(a as { amount: number; withinMonths: number }) },
  },
  {
    id: "productiveReturn",
    tier: "additional",
    prompt: "How much extra will you earn each month once this loan does its job, and how soon?",
    help: "Your best honest estimate. We only count part of it, and only when weighing whether to borrow.",
    input: { kind: "productiveReturn" },
    affects: ["O1"],
    appliesWhen: (d) => d.purpose != null && PRODUCTIVE_PURPOSES.has(d.purpose),
    toProfile: (a) =>
      a === "none"
        ? {}
        : {
            productiveReturn: known(
              a as { extraMonthlyIncome: number; paybackMonths: number },
            ),
          },
  },
  {
    id: "existingOffer",
    tier: "additional",
    prompt: "Has a lender already quoted you a rate? What rate and fee?",
    input: { kind: "offer" },
    affects: ["O3"],
    appliesWhen: () => true,
    toProfile: (a) =>
      a === "none"
        ? {}
        : {
            existingOffer: known(
              a as { ratePct: number; processingFeePct?: number; amount?: number; tenureMonths?: number },
            ),
          },
  },
  {
    id: "processingFeePctOverride",
    tier: "additional",
    prompt: "Do you know the processing fee that lender charges?",
    input: { kind: "percent", allowUnknown: true },
    affects: ["O3"],
    appliesWhen: (d) => !isKnown(d.existingOffer),
    toProfile: (a) =>
      isUnknown(a)
        ? {}
        : { processingFeePctOverride: known(num(a)) },
  },
];

export const QUESTIONS: Question[] = [...MUST, ...ADDITIONAL];
export const MUST_QUESTIONS = MUST;
export const ADDITIONAL_QUESTIONS = ADDITIONAL;
export const MUST_FIELDS: (keyof BorrowerProfile)[] = [
  "purpose",
  "loanType",
  "amountWanted",
  "reportedIncome",
  "incomeType",
  "existingEmiTotal",
  "householdExpenses",
  "age",
  "creditScore",
];
