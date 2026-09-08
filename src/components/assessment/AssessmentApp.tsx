"use client";

import { useEffect, useMemo, useState } from "react";
import {
  emptyFlow,
  answer,
  nextQuestion,
  progress,
  canFinishEarly,
  mustComplete,
  toProfile,
  type FlowState,
} from "@/lib/questions/engine";
import { QUESTIONS } from "@/lib/questions/registry";
import { runAssessment } from "@/lib/rules/pipeline";
import { SAMPLE_BORROWERS, type SampleKey } from "@/lib/data/sampleBorrowers";
import type { BorrowerProfile } from "@/lib/types/borrower";
import { isKnown } from "@/lib/types/borrower";
import { inr } from "@/lib/calculations/money";
import { Landing } from "./Landing";
import { QuestionFlow } from "./QuestionFlow";
import { Results } from "@/components/results/Results";

type Step = { id: string; value: unknown };
type Phase = "landing" | "assess" | "result";

function foldFlow(steps: Step[]): FlowState {
  return steps.reduce((s, step) => answer(s, step.id, step.value), emptyFlow());
}

export function AssessmentApp() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [steps, setSteps] = useState<Step[]>([]);
  const [sampleLabel, setSampleLabel] = useState<string | null>(null);

  const flow = useMemo(() => foldFlow(steps), [steps]);
  const current = phase === "assess" ? nextQuestion(flow) : null;
  const prog = progress(flow);

  // Flow exhausted (must-set done, no applicable questions left) -> results.
  useEffect(() => {
    if (phase === "assess" && !current && mustComplete(flow.draft)) {
      setPhase("result");
    }
  }, [phase, current, flow.draft]);

  const submit = (value: unknown) => {
    if (!current) return;
    setSteps((s) => [...s, { id: current.id, value }]);
  };
  const back = () => setSteps((s) => s.slice(0, -1));
  const editFrom = (questionId: string) => {
    const idx = steps.findIndex((s) => s.id === questionId);
    if (idx >= 0) setSteps((s) => s.slice(0, idx));
    setPhase("assess");
  };

  const start = () => {
    setSteps([]);
    setSampleLabel(null);
    setPhase("assess");
  };

  const loadSample = (key: SampleKey) => {
    // Replay the sample profile through the question registry so the flow's
    // answered-list and adaptive skips stay consistent.
    const profile = SAMPLE_BORROWERS[key].profile;
    const replayed: Step[] = [];
    let s = emptyFlow();
    let guard = 0;
    while (guard++ < 50) {
      const q = nextQuestion(s);
      if (!q) break;
      const value = sampleAnswerFor(q.id, profile);
      replayed.push({ id: q.id, value });
      s = answer(s, q.id, value);
    }
    setSteps(replayed);
    setSampleLabel(SAMPLE_BORROWERS[key].label);
    setPhase("result");
  };

  if (phase === "landing") {
    return <Landing onStart={start} onSample={loadSample} />;
  }

  if (phase === "assess") {
    if (current) {
      return (
        <QuestionFlow
          question={current}
          progressFraction={prog.fraction}
          stepIndex={steps.length}
          canBack={steps.length > 0}
          canFinishEarly={canFinishEarly(flow) && prog.additionalApplicable > prog.additionalAnswered}
          onSubmit={submit}
          onBack={back}
          onFinish={() => setPhase("result")}
        />
      );
    }
    return null; // transient — effect above flips to "result"
  }

  const bundle = runAssessment(toProfile(flow));
  return (
    <Results
      bundle={bundle}
      sampleLabel={sampleLabel}
      answeredSteps={steps.map((s) => ({
        id: s.id,
        label: QUESTIONS.find((q) => q.id === s.id)?.prompt ?? s.id,
        display: describeAnswer(s.id, s.value),
      }))}
      onEdit={editFrom}
      onRestart={() => setPhase("landing")}
    />
  );
}

// ---- sample replay + answer descriptions --------------------------------

function sampleAnswerFor(id: string, p: BorrowerProfile): unknown {
  const k = <T,>(v: { status: "known"; value: T } | { status: "unknown" } | undefined) =>
    v && v.status === "known" ? v.value : "unknown";
  switch (id) {
    case "purpose": return p.purpose;
    case "loanType": return p.loanType;
    case "amountWanted": return p.amountWanted;
    case "reportedIncome": return p.reportedIncome;
    case "incomeType": return p.incomeType;
    case "existingEmiTotal": return p.existingEmiTotal;
    case "householdExpenses": return k(p.householdExpenses);
    case "age": return p.age;
    case "creditScore": return k(p.creditScore);
    case "incomeStability": return isKnown(p.incomeStability) ? p.incomeStability.value : "stable";
    case "variableIncomeShare":
      return isKnown(p.variableIncomeShare) ? p.variableIncomeShare.value * 100 : "unknown";
    case "documentedIncome": return k(p.documentedIncome);
    case "incomeRange":
      return { low: p.incomeRangeLow ?? p.reportedIncome, high: p.incomeRangeHigh ?? p.reportedIncome };
    case "existingLoans": return p.existingLoans ?? [];
    case "cardUtilisation":
      return isKnown(p.cardUtilisation) ? p.cardUtilisation.value * 100 : "unknown";
    case "bouncedPaymentsRecent":
      return isKnown(p.bouncedPaymentsRecent) && p.bouncedPaymentsRecent.value.count > 0
        ? p.bouncedPaymentsRecent.value
        : "none";
    case "emergencySavingsMonths": return k(p.emergencySavingsMonths);
    case "collateralValue": return k(p.collateralValue);
    case "coApplicantIncome": return isKnown(p.coApplicantIncome) ? p.coApplicantIncome.value : 0;
    case "upcomingLargeExpense":
      return isKnown(p.upcomingLargeExpense) ? p.upcomingLargeExpense.value : "none";
    case "productiveReturn":
      return isKnown(p.productiveReturn) ? p.productiveReturn.value : "none";
    case "existingOffer":
      return isKnown(p.existingOffer) ? p.existingOffer.value : "none";
    case "processingFeePctOverride":
      return isKnown(p.processingFeePctOverride) ? p.processingFeePctOverride.value : "unknown";
    default: return "unknown";
  }
}

const MONEY_QUESTION_IDS = new Set([
  "amountWanted",
  "reportedIncome",
  "existingEmiTotal",
  "householdExpenses",
  "documentedIncome",
  "collateralValue",
  "coApplicantIncome",
]);

const numField = (v: Record<string, unknown>, key: string): number =>
  typeof v[key] === "number" ? (v[key] as number) : 0;

function describeAnswer(id: string, v: unknown): string {
  if (v === "unknown") return "Not sure";
  if (v === "none") return "None";
  if (typeof v === "number") {
    if (MONEY_QUESTION_IDS.has(id)) {
      return v === 0 ? (id === "existingEmiTotal" ? "Nothing" : "None") : inr(v);
    }
    return String(v);
  }
  if (Array.isArray(v)) return `${v.length} loan(s)`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("low" in o && "high" in o) return `${inr(numField(o, "low"))} – ${inr(numField(o, "high"))}`;
    if ("count" in o) return `${numField(o, "count")} bounce(s)`;
    if ("ratePct" in o) return `${numField(o, "ratePct")}% quoted`;
    if ("extraMonthlyIncome" in o) return `${inr(numField(o, "extraMonthlyIncome"))}/mo extra`;
    if ("amount" in o) return `${inr(numField(o, "amount"))} soon`;
  }
  return String(v);
}
