import { describe, it, expect } from "vitest";
import { RULES } from "./rules";
import { PRODUCTS } from "./products";
import { SAMPLE_BORROWERS } from "../data/sampleBorrowers";

// Phase 0 sanity: config is internally consistent and fixtures are well-formed.
describe("config invariants", () => {
  it("safe FOIR is always below the matching lender FOIR", () => {
    expect(RULES.safeFoir.byIncomeType.salaried).toBeLessThan(RULES.lenderFoir.salariedMid);
    expect(RULES.safeFoir.byIncomeType.self_employed).toBeLessThan(RULES.lenderFoir.selfEmployed);
    expect(RULES.safeFoir.byIncomeType.informal).toBeLessThan(RULES.lenderFoir.informal);
  });

  it("every product has a low <= high fair band and ascending tenures", () => {
    for (const p of Object.values(PRODUCTS)) {
      expect(p.fairBandPct.low).toBeLessThanOrEqual(p.fairBandPct.high);
      const t = p.tenuresMonths;
      expect([...t].sort((a, b) => a - b)).toEqual(t);
      expect(t).toContain(p.comfortableTenureMonths);
    }
  });

  it("secured products carry an LTV, unsecured do not", () => {
    for (const p of Object.values(PRODUCTS)) {
      if (p.secured) expect(typeof p.ltv).toBe("number");
      else expect(p.ltv).toBeUndefined();
    }
  });
});

describe("sample borrowers", () => {
  it("all three have the full must-set", () => {
    for (const { profile } of Object.values(SAMPLE_BORROWERS)) {
      expect(profile.amountWanted).toBeGreaterThan(0);
      expect(profile.reportedIncome).toBeGreaterThan(0);
      expect(profile.householdExpenses).toBeDefined();
      expect(profile.creditScore).toBeDefined();
      expect(Number.isFinite(profile.existingEmiTotal)).toBe(true);
    }
  });

  it("Ravi and Anita have unknown credit score; Priya knows hers", () => {
    expect(SAMPLE_BORROWERS.ravi.profile.creditScore.status).toBe("unknown");
    expect(SAMPLE_BORROWERS.anita.profile.creditScore.status).toBe("unknown");
    expect(SAMPLE_BORROWERS.priya.profile.creditScore.status).toBe("known");
  });
});
