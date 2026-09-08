// Tenure options, capped by the borrower's working horizon. RULES.md §13.

import type { DerivedInputs } from "./deriveInputs";
import { RULES } from "../config/rules";

/** Months until the borrower's assumed retirement age. */
export function monthsToRetirement(d: DerivedInputs, age: number): number {
  return Math.max(0, (RULES.retirementAge[d.incomeType] - age) * 12);
}

/** Product tenures that fit inside the working horizon (always keeps at least the shortest). */
export function availableTenures(d: DerivedInputs, age: number): number[] {
  const cap = monthsToRetirement(d, age);
  const fit = d.product.config.tenuresMonths.filter((m) => m <= cap);
  return fit.length > 0 ? fit : [d.product.config.tenuresMonths[0]!];
}

export function maxTenure(d: DerivedInputs, age: number): number {
  return Math.max(...availableTenures(d, age));
}

export function comfortableTenure(d: DerivedInputs, age: number): number {
  const want = d.product.config.comfortableTenureMonths;
  const cap = maxTenure(d, age);
  return Math.min(want, cap);
}
