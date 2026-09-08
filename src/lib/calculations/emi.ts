// Standard reducing-balance EMI math. RULES.md §1 (sourced fact).

/** Annual % (e.g. 12) -> monthly decimal rate (0.01). */
export const monthlyRate = (annualPct: number): number => annualPct / 100 / 12;

/** EMI = P·r·(1+r)^n / ((1+r)^n − 1). Handles the r = 0 edge (interest-free). */
export function emi(principal: number, annualPct: number, months: number): number {
  if (months <= 0) return 0;
  const r = monthlyRate(annualPct);
  if (r === 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

/** Inverse: largest principal whose EMI does not exceed `emiAmount`. Annuity present value. */
export function principalFromEmi(
  emiAmount: number,
  annualPct: number,
  months: number,
): number {
  if (months <= 0 || emiAmount <= 0) return 0;
  const r = monthlyRate(annualPct);
  if (r === 0) return emiAmount * months;
  const f = Math.pow(1 + r, months);
  return (emiAmount * (f - 1)) / (r * f);
}

/** Total interest paid over the full schedule. */
export function totalInterest(
  principal: number,
  annualPct: number,
  months: number,
): number {
  return Math.max(0, emi(principal, annualPct, months) * months - principal);
}
