import { describe, it, expect } from "vitest";
import { SAMPLE_BORROWERS } from "../data/sampleBorrowers";
import { runAssessment } from "./pipeline";
import { lakhRange, pctRange, inr } from "../calculations/money";

const results = Object.fromEntries(
  Object.entries(SAMPLE_BORROWERS).map(([k, v]) => [k, runAssessment(v.profile)]),
) as Record<keyof typeof SAMPLE_BORROWERS, ReturnType<typeof runAssessment>>;

describe("Priya — strong salaried, consumption", () => {
  const r = results.priya;
  it("gets a competitive personal-loan band (best tier, no premiums)", () => {
    expect(r.rate.fairBandPct.low).toBeCloseTo(10.5, 1);
    expect(r.rate.fairBandPct.high).toBeLessThanOrEqual(13);
  });
  it("lender sanction clearly exceeds safe amount", () => {
    expect(r.amount.lenderSanction.high).toBeGreaterThan(r.amount.safeAmount.high * 1.3);
  });
  it("high confidence (everything known)", () => {
    expect(r.confidence.level).toBe("high");
  });
  it("verdict is borrow or borrow_less, never dont_borrow", () => {
    expect(r.decision.verdict).not.toBe("dont_borrow");
  });
  it("existing car EMI shows up as a factor", () => {
    expect(JSON.stringify(r.amount.explanation.factors)).toMatch(/14,000/);
  });
  it("card is a real negotiation ask — rate script + tenure", () => {
    expect(r.card.sayThis).toMatch(/looking for about/i);
    expect(r.card.tenureMonths.high).toBeGreaterThan(0);
  });
});

describe("Ravi — self-employed, collateral-rich, thin ITR, productive", () => {
  const r = results.ravi;
  it("is routed to a secured product", () => {
    expect(r.amount.routedTo).toBe("business_secured");
    expect(r.amount.routeReason).toMatch(/secured/i);
  });
  it("credit score unknown => band widened, not penalised", () => {
    expect(r.rate.drivers.join(" ")).toMatch(/no credit score/i);
    expect(r.confidence.missing).toContain("credit score");
  });
  it("safe amount is income-bound and well below the ₹15L ask", () => {
    expect(r.amount.safeAmount.high).toBeLessThan(1_500_000);
  });
  it("lender sanction uses documented income, still separate from safe", () => {
    expect(r.amount.lenderSanction.high).toBeGreaterThan(r.amount.safeAmount.high);
  });
  it("confidence capped at medium (unknown score)", () => {
    expect(r.confidence.level).not.toBe("high");
  });
});

describe("Anita — informal, distressed, expensive debt", () => {
  const r = results.anita;
  it("verdict is dont_borrow", () => {
    expect(r.decision.verdict).toBe("dont_borrow");
  });
  it("reasons mention the thin cushion and the expensive debt", () => {
    expect(r.decision.reasons.join(" ")).toMatch(/cushion|spare|24%/i);
  });
  it("does not count the scooter's promised income (distress)", () => {
    expect(JSON.stringify(r.disclosures)).toMatch(/repayment stress|do not count/i);
  });
  it("safe amount collapses toward zero", () => {
    expect(r.amount.safeAmount.high).toBeLessThan(150_000);
  });

  it("the card is not a negotiation ask — no ₹0 script, no tenure", () => {
    expect(r.card.sayThis).not.toMatch(/₹0[–-]₹0/);
    expect(r.card.sayThis).not.toMatch(/looking for about/i);
    expect(r.card.sayThis).toMatch(/clearing my higher-interest debt first/i);
    expect(r.card.tenureMonths).toEqual({ low: 0, high: 0 });
  });
});

describe("cross-borrower: the two numbers are always different and safe < lender", () => {
  for (const key of ["priya", "ravi", "anita"] as const) {
    it(`${key}: safe.high <= lender.high`, () => {
      const r = results[key];
      expect(r.amount.safeAmount.high).toBeLessThanOrEqual(r.amount.lenderSanction.high);
    });
  }
});

// ---- compact results table (visible in test output) --------------------
it("print O1–O4 summary table", () => {
  const rows = (["priya", "ravi", "anita"] as const).map((k) => {
    const r = results[k];
    return {
      borrower: k,
      O1: r.decision.verdict,
      "O2 safe": lakhRange(r.amount.safeAmount),
      "O2 lender": lakhRange(r.amount.lenderSanction),
      "O3 rate": pctRange(r.rate.fairBandPct),
      "O3 APR": pctRange(r.rate.aprBandPct),
      "O4 EMI ceiling": inr(r.emi.ceiling),
      "O4 stress": r.emi.stress.pass ? "pass" : "FAIL",
      confidence: r.confidence.level,
    };
  });
  // eslint-disable-next-line no-console
  console.table(rows);
  expect(rows).toHaveLength(3);
});
