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
    <main className="flex min-h-[80vh] flex-col py-4">
      <div className="mb-6 flex items-center gap-3">
        {canBack ? (
          <button onClick={onBack} className="text-sm text-ink/50 hover:text-ink" aria-label="Back">
            ← Back
          </button>
        ) : (
          <span />
        )}
        <div className="flex-1">
          <ProgressBar fraction={progressFraction} />
        </div>
      </div>

      <div className="flex-1">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink/40">
          {question.tier === "must" ? "Question" : "One more thing"}
        </p>
        <h1 className="mb-2 text-xl font-semibold leading-snug">{question.prompt}</h1>
        {question.help && <p className="mb-4 text-[13px] text-ink/55">{question.help}</p>}

        <div className="mt-4">
          {/* key forces fresh input state per question */}
          <QuestionInput key={`${question.id}-${stepIndex}`} spec={question.input} onSubmit={onSubmit} />
        </div>
      </div>

      {canFinishEarly && (
        <div className="mt-8 border-t border-black/10 pt-4">
          <p className="mb-2 text-xs text-ink/50">
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
