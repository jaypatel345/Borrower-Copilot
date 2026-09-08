// ---------------------------------------------------------------------------
// The three required borrowers, as fully-answered BorrowerProfiles.
//
// The brief gives us hard facts (income, EMIs, score, collateral, amount).
// A few fields the app would ASK but the brief does not state are marked
// `// assumed:` below and are re-listed in RUNTHROUGHS.md so the reader can see
// exactly what we put in. These are test INPUTS, not hardcoded outputs
// (CLAUDE.md §24) — the rules engine produces every number.
// ---------------------------------------------------------------------------

import type { BorrowerProfile } from "../types/borrower";
import { known, unknown } from "../types/borrower";

export const PRIYA: BorrowerProfile = {
  purpose: "wedding",
  loanType: "personal",
  amountWanted: 800_000,
  reportedIncome: 110_000,
  incomeType: "salaried",
  existingEmiTotal: 14_000, // car loan, 2 years left
  householdExpenses: known(42_000), // assumed: rent Rs 28k (stated) + ~Rs 14k living
  age: 29,
  creditScore: known(780),
  incomeStability: known("very_stable"), // 5 years, large MNC
  // variableIncomeShare intentionally omitted: her adaptive path (very-stable
  // salaried) never asks it, so setting it here would make the fixture-direct
  // assessment diverge from the in-app sample replay.
  emergencySavingsMonths: known(3), // assumed
  existingLoans: [
    { kind: "secured", emi: 14_000, monthsRemaining: 24, aprPct: 10 }, // aprPct assumed
  ],
  cardUtilisation: known(0.2), // assumed
};

export const RAVI: BorrowerProfile = {
  purpose: "business_investment",
  loanType: "business_unsecured", // stated intent; engine re-routes to secured
  amountWanted: 1_500_000,
  reportedIncome: 60_000, // cash midpoint of Rs 40k-80k
  incomeType: "self_employed",
  existingEmiTotal: 0, // never taken a formal loan
  householdExpenses: known(25_000), // assumed: family in Mysuru
  age: 42,
  creditScore: unknown(), // no credit history — UNKNOWN, not poor (§3.3)
  incomeStability: known("stable"), // 14 years trading
  variableIncomeShare: known(0.4), // assumed: seasonal kirana swings
  documentedIncome: known(35_000), // ITR Rs 4.2L/year -> Rs 35k/month
  incomeRangeLow: 40_000,
  incomeRangeHigh: 80_000,
  emergencySavingsMonths: known(4), // assumed
  collateralValue: known(4_500_000), // shop premises, unencumbered
  collateralType: "property",
  coApplicantIncome: known(18_000), // wife, teaching
  coApplicantIncomeType: "salaried",
  productiveReturn: known({ extraMonthlyIncome: 15_000, paybackMonths: 24 }), // assumed: Ravi's own estimate, treated at 50% + flagged unverified
};

export const ANITA: BorrowerProfile = {
  purpose: "vehicle_for_work",
  loanType: "two_wheeler",
  amountWanted: 150_000,
  reportedIncome: 28_000, // midpoint of Rs 26k-30k
  incomeType: "informal",
  existingEmiTotal: 6_500, // assumed: 3 app loans, Rs 35k outstanding at 30%+, ~6-month tenor
  householdExpenses: known(18_000), // assumed: two children, husband unemployed, Hubballi
  age: 35,
  creditScore: unknown(),
  incomeStability: known("variable"),
  variableIncomeShare: known(0.5), // assumed
  incomeRangeLow: 26_000,
  incomeRangeHigh: 30_000,
  existingLoans: [
    { kind: "app_loan", emi: 2_200, outstanding: 12_000, aprPct: 32, monthsRemaining: 6 },
    { kind: "app_loan", emi: 2_200, outstanding: 12_000, aprPct: 34, monthsRemaining: 6 },
    { kind: "app_loan", emi: 2_100, outstanding: 11_000, aprPct: 30, monthsRemaining: 6 },
  ], // emi/outstanding split assumed; totals match the brief
  bouncedPaymentsRecent: known({ count: 1, withinMonths: 1 }),
  emergencySavingsMonths: known(0),
  coApplicantIncome: known(0), // husband unemployed 8 months
  productiveReturn: known({ extraMonthlyIncome: 8_000, paybackMonths: 18 }), // assumed: Anita's hope; DISABLED by the distress trigger
};

export const SAMPLE_BORROWERS = {
  priya: { label: "Priya, 29 · Bengaluru · salaried", profile: PRIYA },
  ravi: { label: "Ravi, 42 · Mysuru · self-employed", profile: RAVI },
  anita: { label: "Anita, 35 · Hubballi · informal", profile: ANITA },
} as const;

export type SampleKey = keyof typeof SAMPLE_BORROWERS;
