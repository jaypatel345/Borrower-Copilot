"use client";

import type { Question } from "@/lib/questions/registry";
import { ProgressBar, Button } from "@/components/shared/ui";
import { QuestionInput } from "./inputs";

export function QuestionFlow({
  question,
  progressFraction,
  stepIndex,
  canBack,
  canFinishEarly,
  onSubmit,
  onBack,
  onFinish,
}: {
  question: Question;
  progressFraction: number;
  stepIndex: number;
  canBack: boolean;
  canFinishEarly: boolean;
  onSubmit: (value: unknown) => void;
  onBack: () => void;
  onFinish: () => void;
}) {
  return (
    <main className="flex flex-col">
      <div className="mb-6 flex items-center gap-3">
        {canBack ? (
          <button onClick={onBack} className="shrink-0 text-sm text-ink/55 hover:text-ink" aria-label="Back">
            ← Back
          </button>
        ) : (
          <span />
        )}
        <div className="flex-1">
          <ProgressBar fraction={progressFraction} />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-6">
        <p className="mb-2 text-xs font-semibold text-accent">
          {question.tier === "must" ? "Question" : "One more thing"}
        </p>
        <h1 className="mb-2 text-2xl font-semibold leading-snug tracking-tight">{question.prompt}</h1>
        {question.help && <p className="mb-4 text-sm leading-relaxed text-ink/55">{question.help}</p>}

        <div className="mt-4">
          {/* key forces fresh input state per question */}
          <QuestionInput key={`${question.id}-${stepIndex}`} spec={question.input} onSubmit={onSubmit} />
        </div>
      </div>

      {canFinishEarly && (
        <div className="mt-6 rounded-2xl border border-line bg-white p-5">
          <p className="mb-3 text-sm text-ink/55">
            You&apos;ve answered enough for a result. More answers only tighten the ranges.
          </p>
          <Button variant="outline" onClick={onFinish}>
            Skip the rest — see my result
          </Button>
        </div>
      )}
    </main>
  );
}
