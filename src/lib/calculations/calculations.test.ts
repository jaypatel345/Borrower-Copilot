import { describe, it, expect } from "vitest";
import { emi, principalFromEmi, totalInterest, monthlyRate } from "./emi";
import { solveMonthlyIrr, aprFromLoan } from "./irr";
import { roundTo, roundDownTo, toRange, lakh, pctRange, tenureRangeLabel } from "./money";

describe("emi", () => {
  it("matches a known reducing-balance figure (10L @ 12% / 60m ~= 22244)", () => {
    expect(emi(1_000_000, 12, 60)).toBeCloseTo(22244.45, 0);
  });

  it("handles the 0% edge as straight-line", () => {
    expect(emi(120_000, 0, 12)).toBe(10_000);
  });

  it("principalFromEmi is the inverse of emi", () => {
    const p = 750_000;
    const e = emi(p, 13.5, 48);
    expect(principalFromEmi(e, 13.5, 48)).toBeCloseTo(p, 0);
  });

  it("returns 0 for non-positive tenure or emi (no NaN)", () => {
    expect(emi(100000, 12, 0)).toBe(0);
    expect(principalFromEmi(0, 12, 48)).toBe(0);
    expect(principalFromEmi(5000, 12, 0)).toBe(0);
  });

  it("totalInterest is EMI*n - principal", () => {
    const ti = totalInterest(500_000, 12, 36);
    expect(ti).toBeGreaterThan(0);
    expect(ti).toBeCloseTo(emi(500_000, 12, 36) * 36 - 500_000, 4);
  });

  it("monthlyRate converts annual %", () => {
    expect(monthlyRate(12)).toBeCloseTo(0.01, 10);
  });
});

describe("irr / apr", () => {
  it("APR with no fee equals the nominal rate", () => {
    const apr = aprFromLoan({ principal: 500_000, annualRatePct: 12, months: 36, processingFeePct: 0 });
    expect(apr).toBeCloseTo(12, 1);
  });

  it("APR exceeds the nominal rate once a fee + GST is added", () => {
    const apr = aprFromLoan({ principal: 500_000, annualRatePct: 12, months: 36, processingFeePct: 2 });
    expect(apr).toBeGreaterThan(12);
    expect(apr).toBeLessThan(15); // 2% fee over 3y shouldn't blow up APR
  });

  it("shorter tenure amplifies the fee's APR impact", () => {
    const short = aprFromLoan({ principal: 500_000, annualRatePct: 12, months: 12, processingFeePct: 2 });
    const long = aprFromLoan({ principal: 500_000, annualRatePct: 12, months: 60, processingFeePct: 2 });
    expect(short).toBeGreaterThan(long);
  });

  it("solveMonthlyIrr finds ~1% monthly for a clean 12%/12m loan", () => {
    const e = emi(100_000, 12, 12);
    const irr = solveMonthlyIrr([100_000, ...Array<number>(12).fill(-e)]);
    expect(irr).toBeCloseTo(0.01, 4);
  });
});

describe("money helpers", () => {
  it("roundTo / roundDownTo", () => {
    expect(roundTo(11.83, 0.25)).toBe(11.75);
    expect(roundDownTo(22_340, 500)).toBe(22_000);
  });

  it("toRange snaps low down and high up (never tighter than the point)", () => {
    const r = toRange(740_900, 0.08, 50_000);
    expect(r.low).toBeLessThanOrEqual(740_900);
    expect(r.high).toBeGreaterThanOrEqual(740_900);
    expect(r.low % 50_000).toBe(0);
    expect(r.high % 50_000).toBe(0);
  });

  it("lakh + pctRange formatting", () => {
    expect(lakh(800_000)).toBe("₹8.0L");
    expect(lakh(45_000)).toBe("₹45,000");
    expect(pctRange({ low: 10.5, high: 12.5 })).toBe("10.5%–12.5%");
  });

  it("tenureRangeLabel", () => {
    expect(tenureRangeLabel(36, 48)).toBe("3–4 years");
    expect(tenureRangeLabel(48, 84)).toBe("4–7 years");
    expect(tenureRangeLabel(18, 36)).toBe("18–36 months");
    expect(tenureRangeLabel(0, 0)).toBe("—");
    expect(tenureRangeLabel(24, 24)).toBe("2 years");
  });
});
