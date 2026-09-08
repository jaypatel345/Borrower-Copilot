import { describe, it, expect } from "vitest";
import {
  QUESTIONS,
  ADDITIONAL_QUESTIONS,
  MUST_QUESTIONS,
} from "./registry";
import {
  emptyFlow,
  answer,
  nextQuestion,
  progress,
  canFinishEarly,
  isFinished,
  toProfile,
  type FlowState,
} from "./engine";
import { runAssessment } from "../rules/pipeline";
import { isKnown } from "../types/borrower";

// Walk the flow, answering via a lookup keyed by question id.
function run(answers: Record<string, unknown>): FlowState {
  let s = emptyFlow();
  let guard = 0;
  while (guard++ < 50) {
    const q = nextQuestion(s);
    if (!q) break;
    if (!(q.id in answers)) {
      throw new Error(`flow asked "${q.id}" but the test gave no answer`);
    }
    s = answer(s, q.id, answers[q.id]);
  }
  return s;
}

describe("registry invariants", () => {
  it("every additional question moves at least one output", () => {
    for (const q of ADDITIONAL_QUESTIONS) {
      expect(q.affects.length, q.id).toBeGreaterThan(0);
    }
  });

  it("question ids are unique", () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("must-set is 8–10 questions", () => {
    expect(MUST_QUESTIONS.length).toBeGreaterThanOrEqual(8);
    expect(MUST_QUESTIONS.length).toBeLessThanOrEqual(10);
  });
});

describe("adaptive paths — a salaried borrower and a kirana owner see different questions", () => {
  const salariedAnswers: Record<string, unknown> = {
    purpose: "wedding",
    loanType: "personal",
    amountWanted: 800_000,
    reportedIncome: 110_000,
    incomeType: "salaried",
    existingEmiTotal: 14_000,
    householdExpenses: 42_000,
    age: 29,
    creditScore: 780,
    incomeStability: "very_stable",
    existingLoans: [{ kind: "secured", emi: 14_000, monthsRemaining: 24 }],
    cardUtilisation: 20,
    bouncedPaymentsRecent: "none",
    emergencySavingsMonths: 3,
    upcomingLargeExpense: "none",
    existingOffer: "none",
    processingFeePctOverride: "unknown",
  };

  it("salaried flow never asks ITR, income-range, or collateral", () => {
    let s = emptyFlow();
    const asked: string[] = [];
    let guard = 0;
    while (guard++ < 50) {
      const q = nextQuestion(s);
      if (!q) break;
      asked.push(q.id);
      s = answer(s, q.id, salariedAnswers[q.id] ?? "none");
    }
    expect(asked).not.toContain("documentedIncome");
    expect(asked).not.toContain("incomeRange");
    expect(asked).not.toContain("collateralValue");
    expect(asked).not.toContain("productiveReturn"); // wedding = consumption
  });

  it("self-employed flow asks ITR, collateral, co-applicant and productive return", () => {
    let s = emptyFlow();
    const asked: string[] = [];
    const seAnswers: Record<string, unknown> = {
      purpose: "business_investment",
      loanType: "business_unsecured",
      amountWanted: 1_500_000,
      reportedIncome: 60_000,
      incomeType: "self_employed",
      existingEmiTotal: 0,
      householdExpenses: 25_000,
      age: 42,
      creditScore: "unknown",
      incomeStability: "stable",
      variableIncomeShare: 40,
      documentedIncome: 35_000,
      incomeRange: { low: 40_000, high: 80_000 },
      cardUtilisation: "unknown",
      emergencySavingsMonths: 4,
      collateralValue: 4_500_000,
      coApplicantIncome: 18_000,
      upcomingLargeExpense: "none",
      productiveReturn: { extraMonthlyIncome: 15_000, paybackMonths: 24 },
      existingOffer: "none",
      processingFeePctOverride: "unknown",
    };
    let guard = 0;
    while (guard++ < 50) {
      const q = nextQuestion(s);
      if (!q) break;
      asked.push(q.id);
      s = answer(s, q.id, seAnswers[q.id] ?? "none");
    }
    expect(asked).toEqual(
      expect.arrayContaining(["documentedIncome", "collateralValue", "coApplicantIncome", "productiveReturn"]),
    );
  });

  it("informal flow asks income-range, bounces and savings but not ITR/collateral-by-default", () => {
    let s = emptyFlow();
    const asked: string[] = [];
    const infAnswers: Record<string, unknown> = {
      purpose: "vehicle_for_work",
      loanType: "two_wheeler",
      amountWanted: 150_000,
      reportedIncome: 28_000,
      incomeType: "informal",
      existingEmiTotal: 6_500,
      householdExpenses: 18_000,
      age: 35,
      creditScore: "unknown",
      incomeStability: "variable",
      incomeRange: { low: 26_000, high: 30_000 },
      existingLoans: [{ kind: "app_loan", emi: 6_500, outstanding: 35_000, aprPct: 32 }],
      bouncedPaymentsRecent: { count: 1, withinMonths: 1 },
      emergencySavingsMonths: 0,
      coApplicantIncome: 0,
      upcomingLargeExpense: "none",
      productiveReturn: { extraMonthlyIncome: 8_000, paybackMonths: 18 },
      existingOffer: "none",
      processingFeePctOverride: "unknown",
    };
    let guard = 0;
    while (guard++ < 50) {
      const q = nextQuestion(s);
      if (!q) break;
      asked.push(q.id);
      s = answer(s, q.id, infAnswers[q.id] ?? "none");
    }
    expect(asked).toEqual(expect.arrayContaining(["incomeRange", "bouncedPaymentsRecent", "emergencySavingsMonths"]));
    expect(asked).not.toContain("documentedIncome");
    expect(asked).not.toContain("collateralValue"); // informal + small secured two-wheeler
  });
});

describe("must-set gating and unknowns", () => {
  it("cannot finish early until all 9 must questions are answered", () => {
    let s = emptyFlow();
    s = answer(s, "purpose", "medical");
    s = answer(s, "loanType", "personal");
    expect(canFinishEarly(s)).toBe(false);
  });

  it("\"I don't know\" on credit score stores unknown, not a number", () => {
    let s = emptyFlow();
    s = answer(s, "creditScore", "unknown");
    expect(s.draft.creditScore).toEqual({ status: "unknown" });
  });

  it("\"I'm not sure\" on household expenses stores unknown, not 0", () => {
    let s = emptyFlow();
    s = answer(s, "householdExpenses", "unknown");
    expect(s.draft.householdExpenses).toEqual({ status: "unknown" });
  });

  it("progress fraction rises and hits 1 only when fully finished", () => {
    const partial = run2(["purpose", "loanType", "amountWanted"]);
    expect(progress(partial).fraction).toBeLessThan(0.6);
  });
});

function run2(ids: string[]): FlowState {
  const canned: Record<string, unknown> = {
    purpose: "medical",
    loanType: "personal",
    amountWanted: 300_000,
  };
  let s = emptyFlow();
  for (const id of ids) s = answer(s, id, canned[id]);
  return s;
}

describe("flow output feeds runAssessment", () => {
  it("a fully-answered informal flow yields a valid profile -> DON'T for Anita-like input", () => {
    const s = run({
      purpose: "vehicle_for_work",
      loanType: "two_wheeler",
      amountWanted: 150_000,
      reportedIncome: 28_000,
      incomeType: "informal",
      existingEmiTotal: 6_500,
      householdExpenses: 18_000,
      age: 35,
      creditScore: "unknown",
      incomeStability: "variable",
      incomeRange: { low: 26_000, high: 30_000 },
      existingLoans: [{ kind: "app_loan", emi: 6_500, outstanding: 35_000, aprPct: 32 }],
      bouncedPaymentsRecent: { count: 1, withinMonths: 1 },
      emergencySavingsMonths: 0,
      coApplicantIncome: 0,
      upcomingLargeExpense: "none",
      productiveReturn: { extraMonthlyIncome: 8_000, paybackMonths: 18 },
      existingOffer: "none",
      processingFeePctOverride: "unknown",
    });
    expect(isFinished(s)).toBe(true);
    const profile = toProfile(s);
    expect(isKnown(profile.creditScore)).toBe(false);
    const result = runAssessment(profile);
    expect(result.decision.verdict).toBe("dont_borrow");
  });

  it("minimum must-set only still produces all four outputs with low/medium confidence", () => {
    const s = run({
      purpose: "consumption_other",
      loanType: "personal",
      amountWanted: 400_000,
      reportedIncome: 70_000,
      incomeType: "salaried",
      existingEmiTotal: 0,
      householdExpenses: "unknown",
      age: 30,
      creditScore: "unknown",
      // stop here — answer additional questions with "none"/defaults
      incomeStability: "stable",
      cardUtilisation: "unknown",
      emergencySavingsMonths: "unknown",
      upcomingLargeExpense: "none",
      existingOffer: "none",
      processingFeePctOverride: "unknown",
    });
    const result = runAssessment(toProfile(s));
    expect(result.amount.safeAmount).toBeDefined();
    expect(result.rate.fairBandPct.high).toBeGreaterThan(result.rate.fairBandPct.low);
    expect(["low", "medium"]).toContain(result.confidence.level);
  });
});
