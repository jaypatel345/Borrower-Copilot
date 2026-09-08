// ---------------------------------------------------------------------------
// Confidence reflects MISSING information only. Fewer answers -> lower level ->
// wider bands. It can never narrow a band (CLAUDE.md §3.4). RULES.md §12.
// ---------------------------------------------------------------------------

import type { DerivedInputs } from "./deriveInputs";
import type { Confidence, ConfidenceLevel } from "../types/results";
import { RULES } from "../config/rules";

const FRIENDLY: Record<string, string> = {
  creditScore: "credit score",
  householdExpenses: "household running costs",
  incomeStability: "how stable your income is",
  documentedIncome: "documented (ITR) income",
  variableIncomeShare: "how much of your pay is variable",
  incomeRange: "your month-to-month income range",
};

export function computeConfidence(d: DerivedInputs): Confidence {
  const c = RULES.confidence;
  let level: ConfidenceLevel =
    d.confidencePoints >= c.highMinPoints && !d.hasRecentBounce
      ? "high"
      : d.confidencePoints >= c.mediumMinPoints
        ? "medium"
        : "low";

  // Hard cap: a core unknown (credit score or income) can't be "high".
  if (d.creditTier === "unknown" && level === "high") level = "medium";

  const missing = Array.from(new Set(d.unknownFields))
    .map((f) => FRIENDLY[f])
    .filter((x): x is string => !!x);

  return {
    level,
    amountWidthPct: c.amountWidthPct[level],
    rateWidenHighPp: c.rateWidenHighPp[level],
    missing,
  };
}
