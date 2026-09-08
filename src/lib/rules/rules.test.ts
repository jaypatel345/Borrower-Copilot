import { describe, it, expect } from "vitest";
import type { BorrowerProfile } from "../types/borrower";
import { known, unknown } from "../types/borrower";
import { deriveInputs } from "./deriveInputs";
import { computeAffordability } from "./affordability";
import { computeConfidence } from "./confidence";
import { computeFairRate } from "./rate";
import { computeSafeAmount } from "./safeAmount";
import { computeLenderSanction } from "./eligibility";
import { runAssessment } from "./pipeline";

// A middle-of-the-road salaried baseline we mutate per test.
const base = (): BorrowerProfile => ({
  purpose: "consumption_other",
  loanType: "personal",
  amountWanted: 500_000,
  reportedIncome: 80_000,
  incomeType: "salaried",
  existingEmiTotal: 0,
  householdExpenses: known(30_000),
  age: 35,
  creditScore: known(770),
  incomeStability: known("stable"),
});

describe("deriveInputs — unknown is never zero", () => {
  it("unknown credit score => tier 'unknown', not 'weak'", () => {
    const d = deriveInputs({ ...base(), creditScore: unknown() });
    expect(d.creditTier).toBe("unknown");
    expect(d.unknownFields).toContain("creditScore");
  });

  it("unknown household expenses => visible fallback, flagged, never 0", () => {
    const d = deriveInputs({ ...base(), householdExpenses: unknown() });
    expect(d.essentialExpensesAssumed).toBe(true);
    expect(d.essentialExpenses).toBe(80_000 * 0.5);
    expect(d.unknownFields).toContain("householdExpenses");
    expect(d.notes.join(" ")).toMatch(/assumed/i);
  });

  it("informal income uses low-end + 25% of range, not the midpoint", () => {
    const d = deriveInputs({
      ...base(),
      incomeType: "informal",
      reportedIncome: 28_000,
      incomeRangeLow: 26_000,
      incomeRangeHigh: 30_000,
    });
    expect(d.stableIncomeSafe).toBe(27_000); // 26000 + 0.25*4000
  });

  it("self-employed: documented income caps the lender view, cash claim does not", () => {
    const d = deriveInputs({
      ...base(),
      incomeType: "self_employed",
      reportedIncome: 60_000,
      incomeRangeLow: 40_000,
      incomeRangeHigh: 80_000,
      documentedIncome: known(35_000),
    });
    expect(d.stableIncomeLender).toBe(35_000); // min(35000, 0.65*60000)
    expect(d.stableIncomeSafe).toBe(30_000); // min(35000, 0.5*60000)
    expect(d.notes.join(" ")).toMatch(/documented/i);
  });
});

describe("deriveInputs — product routing", () => {
  it("routes an unsecured business ask to secured when collateral covers it", () => {
    const d = deriveInputs({
      ...base(),
      purpose: "business_investment",
      loanType: "business_unsecured",
      amountWanted: 1_500_000,
      collateralValue: known(4_500_000),
      collateralType: "property",
    });
    expect(d.product.reRouted).toBe(true);
    expect(d.product.loanType).toBe("business_secured");
  });

  it("does NOT route when there is no collateral", () => {
    const d = deriveInputs({
      ...base(),
      purpose: "business_investment",
      loanType: "business_unsecured",
      amountWanted: 1_500_000,
    });
    expect(d.product.reRouted).toBe(false);
  });

  it("does NOT route when collateral is too small to cover the ask", () => {
    const d = deriveInputs({
      ...base(),
      purpose: "business_investment",
      loanType: "business_unsecured",
      amountWanted: 5_000_000,
      collateralValue: known(1_000_000),
    });
    expect(d.product.reRouted).toBe(false);
  });
});

describe("affordability — two ceilings, take the lower", () => {
  it("high household expenses make the residual test bind", () => {
    const d = deriveInputs({ ...base(), reportedIncome: 100_000, householdExpenses: known(70_000) });
    const a = computeAffordability(d);
    expect(a.bindingConstraint).toBe("residual");
    expect(a.safeEmiCeiling).toBe(a.residualCapEmi);
  });

  it("low expenses + existing EMI make the FOIR test bind", () => {
    const d = deriveInputs({ ...base(), reportedIncome: 100_000, householdExpenses: known(15_000), existingEmiTotal: 10_000 });
    const a = computeAffordability(d);
    expect(a.bindingConstraint).toBe("foir");
  });

  it("stressed ceiling is never above the normal ceiling", () => {
    const d = deriveInputs(base());
    const a = computeAffordability(d);
    expect(a.stressedSafeEmiCeiling).toBeLessThanOrEqual(a.safeEmiCeiling + 1e-6);
  });

  it("safe FOIR cannot be adjusted below the floor", () => {
    const d = deriveInputs({
      ...base(),
      incomeType: "informal",
      incomeRangeLow: 26_000,
      incomeRangeHigh: 30_000,
      emergencySavingsMonths: known(0),
      bouncedPaymentsRecent: known({ count: 1, withinMonths: 1 }),
    });
    const a = computeAffordability(d);
    expect(a.safeFoir).toBe(0.25); // 0.30 - 0.05 - 0.05 = 0.20 -> floored at 0.25
  });
});

describe("rate — unknown widens the HIGH side only", () => {
  it("unknown score keeps low near base but pushes high up", () => {
    const known770 = deriveInputs(base());
    const unknownScore = deriveInputs({ ...base(), creditScore: unknown() });
    const rKnown = computeFairRate(base(), known770, "high");
    const rUnknown = computeFairRate(
      { ...base(), creditScore: unknown() },
      unknownScore,
      computeConfidence(unknownScore).level,
    );
    expect(rUnknown.bandPct.high).toBeGreaterThan(rKnown.bandPct.high);
    expect(rUnknown.bandPct.low).toBeGreaterThanOrEqual(rKnown.bandPct.low);
    // band must not collapse to a point
    expect(rUnknown.bandPct.high).toBeGreaterThan(rUnknown.bandPct.low);
  });

  it("recent bounce adds a visible driver and raises the band", () => {
    const d = deriveInputs({ ...base(), bouncedPaymentsRecent: known({ count: 1, withinMonths: 1 }) });
    const r = computeFairRate(base(), d, "medium");
    expect(r.drivers.join(" ")).toMatch(/bounced/i);
    expect(r.bandPct.low).toBeGreaterThan(10.5);
  });
});

describe("lender sanction vs safe amount stay separate", () => {
  it("lender sanction is >= safe amount for a healthy profile", () => {
    const d = deriveInputs(base());
    const conf = computeConfidence(d);
    const fair = computeFairRate(base(), d, conf.level);
    const aff = computeAffordability(d);
    const safe = computeSafeAmount(d, aff, fair.bandPct, 35, conf.amountWidthPct);
    const lender = computeLenderSanction(d, 35, fair.bandPct, conf.amountWidthPct);
    expect(lender.range.high).toBeGreaterThan(safe.range.high);
  });

  it("collateral raises the lender number but NOT the safe number", () => {
    const withCollateral: BorrowerProfile = {
      ...base(),
      incomeType: "self_employed",
      purpose: "business_investment",
      loanType: "business_unsecured",
      amountWanted: 1_500_000,
      reportedIncome: 60_000,
      incomeRangeLow: 40_000,
      incomeRangeHigh: 80_000,
      documentedIncome: known(35_000),
      collateralValue: known(4_500_000),
      collateralType: "property",
    };
    const noCollateral: BorrowerProfile = { ...withCollateral, collateralValue: unknown() };

    const rWith = runAssessment(withCollateral);
    const rNo = runAssessment(noCollateral);

    // Safe amount is identical with/without collateral (income-bound only).
    expect(rWith.amount.safeAmount).toEqual(rNo.amount.safeAmount);
    // Lender sanction is at least as high with collateral + secured routing.
    expect(rWith.amount.lenderSanction.high).toBeGreaterThanOrEqual(
      rNo.amount.lenderSanction.high,
    );
  });
});

describe("decision — all three verdicts are reachable", () => {
  it("BORROW for a strong profile asking a modest amount", () => {
    const r = runAssessment({ ...base(), amountWanted: 300_000, reportedIncome: 120_000 });
    expect(r.decision.verdict).toBe("borrow");
    expect(r.decision.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("BORROW LESS when the ask exceeds safe capacity but nothing is unsafe", () => {
    const r = runAssessment({ ...base(), amountWanted: 3_000_000, reportedIncome: 90_000, householdExpenses: known(30_000) });
    expect(r.decision.verdict).toBe("borrow_less");
  });

  it("DON'T BORROW when nothing is left after essentials", () => {
    const r = runAssessment({
      ...base(),
      reportedIncome: 30_000,
      householdExpenses: known(26_000),
      existingEmiTotal: 3_000,
    });
    expect(r.decision.verdict).toBe("dont_borrow");
  });

  it("DON'T BORROW on recent bounce + informal + high proposed FOIR", () => {
    const r = runAssessment({
      ...base(),
      incomeType: "informal",
      reportedIncome: 28_000,
      incomeRangeLow: 26_000,
      incomeRangeHigh: 30_000,
      householdExpenses: known(14_000),
      existingEmiTotal: 4_000,
      amountWanted: 200_000,
      bouncedPaymentsRecent: known({ count: 1, withinMonths: 1 }),
      emergencySavingsMonths: known(0),
    });
    expect(r.decision.verdict).toBe("dont_borrow");
    expect(r.decision.reasons.join(" ")).toMatch(/bounce|spare|cushion|repayments/i);
  });

  it("every decision carries at least one reason", () => {
    for (const wanted of [200_000, 1_000_000, 8_000_000]) {
      const r = runAssessment({ ...base(), amountWanted: wanted });
      expect(r.decision.reasons.length).toBeGreaterThan(0);
    }
  });
});

describe("confidence widens with silence", () => {
  it("fully-answered profile => high; sparse profile => low/medium with wider band", () => {
    const full = runAssessment(base());
    const sparse = runAssessment({
      ...base(),
      creditScore: unknown(),
      householdExpenses: unknown(),
      incomeStability: unknown(),
    });
    expect(full.confidence.level).toBe("high");
    expect(sparse.confidence.amountWidthPct).toBeGreaterThan(full.confidence.amountWidthPct);
    expect(sparse.confidence.missing.length).toBeGreaterThan(0);
  });
});
