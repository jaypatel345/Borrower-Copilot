// ---------------------------------------------------------------------------
// Per-product configuration. Every number here is documented in RULES.md §2-4,
// §13. Classifications: mostly "market reference" (Sep 2026), a few "regulatory"
// (LTV) and "my judgement" (business_secured band). Change here, whole app updates.
// ---------------------------------------------------------------------------

import type { LoanType } from "../types/borrower";

export type ProductConfig = {
  label: string;
  secured: boolean;
  rateType: "fixed" | "floating";
  /** Fair band for a well-qualified borrower, %. RULES.md §2. */
  fairBandPct: { low: number; high: number };
  /** Processing fee assumption, % of principal (GST added separately). RULES.md §3. */
  processingFeePct: number;
  /** LTV against collateral value, 0..1. RULES.md §4. undefined = unsecured. */
  ltv?: number;
  /** Allowed tenures in months, ascending. RULES.md §13. */
  tenuresMonths: number[];
  /** Default tenure used to size the SAFE amount (comfortable, not max). */
  comfortableTenureMonths: number;
};

export const PRODUCTS: Record<LoanType, ProductConfig> = {
  // fairBandPct = the TIGHT band for a well-qualified borrower. RULES.md §2
  // premiums in RULES.ratePremiumsPp widen it for weaker profiles.
  personal: {
    label: "Personal loan",
    secured: false,
    rateType: "fixed",
    fairBandPct: { low: 10.5, high: 12.5 },
    processingFeePct: 2.0,
    tenuresMonths: [12, 24, 36, 48, 60, 72],
    comfortableTenureMonths: 48,
  },
  home: {
    label: "Home loan",
    secured: true,
    rateType: "floating",
    fairBandPct: { low: 7.5, high: 8.75 },
    processingFeePct: 0.4,
    ltv: 0.8, // mid tier; RULES.md §4 notes RBI ticket-size tiering
    tenuresMonths: [60, 120, 180, 240],
    comfortableTenureMonths: 180,
  },
  lap: {
    label: "Loan Against Property",
    secured: true,
    rateType: "floating",
    fairBandPct: { low: 9.0, high: 10.5 },
    processingFeePct: 1.0,
    ltv: 0.6,
    tenuresMonths: [60, 84, 120, 180],
    comfortableTenureMonths: 120,
  },
  gold: {
    label: "Gold loan",
    secured: true,
    rateType: "fixed",
    fairBandPct: { low: 9.0, high: 11.0 },
    processingFeePct: 0.5,
    ltv: 0.75, // RULES.md §4: RBI tiered 85/80/75 by ticket; 75 for > Rs 5L
    tenuresMonths: [6, 12, 24, 36],
    comfortableTenureMonths: 24,
  },
  two_wheeler: {
    label: "Two-wheeler loan",
    secured: true,
    rateType: "fixed",
    fairBandPct: { low: 11.0, high: 13.5 }, // EV band; RULES.md §2
    processingFeePct: 2.0,
    ltv: 0.85,
    tenuresMonths: [12, 24, 36, 48],
    comfortableTenureMonths: 36,
  },
  business_secured: {
    label: "Business loan (against property)",
    secured: true,
    rateType: "floating",
    fairBandPct: { low: 10.0, high: 12.5 }, // my judgement, RULES.md §2
    processingFeePct: 2.0,
    ltv: 0.6,
    tenuresMonths: [12, 24, 36, 48, 60, 84, 120],
    comfortableTenureMonths: 84,
  },
  business_unsecured: {
    label: "Business loan (unsecured)",
    secured: false,
    rateType: "fixed",
    fairBandPct: { low: 15.0, high: 19.0 },
    processingFeePct: 2.0,
    tenuresMonths: [12, 24, 36, 48, 60],
    comfortableTenureMonths: 36,
  },
};

/** EV green concession applied to two-wheeler when purpose is a work vehicle. RULES.md §2. */
export const EV_GREEN_CONCESSION_PP = 0.5;

/** GST on processing fees. RULES.md §1 (sourced fact). */
export const GST_ON_FEE = 0.18;
