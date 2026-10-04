"use client";

import { useState } from "react";
import type { ResultBundle } from "@/lib/types/results";
import { ConfidenceBadge, Button, Section } from "@/components/shared/ui";
import { DecisionCard, AmountCard, RateCard, EmiCard } from "./cards";
import { NegotiationCard } from "./NegotiationCard";

type AnsweredStep = { id: string; label: string; display: string };

export function Results({
  bundle,
  sampleLabel,
  answeredSteps,
  onEdit,
  onRestart,
}: {
  bundle: ResultBundle;
  sampleLabel: string | null;
  answeredSteps: AnsweredStep[];
  onEdit: (questionId: string) => void;
  onRestart: () => void;
}) {
  const [tab, setTab] = useState<"result" | "card" | "answers">("result");

  return (
    <main className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3 pb-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your assessment</h1>
          {sampleLabel && <p className="mt-0.5 text-sm text-ink/50">Sample: {sampleLabel}</p>}
        </div>
        <ConfidenceBadge level={bundle.confidence.level} missing={bundle.confidence.missing} />
      </header>

      <div className="flex gap-1 rounded-xl border border-line bg-white p-1 text-sm">
        {(["result", "card", "answers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-3 py-1.5 font-medium capitalize ${
              tab === t ? "bg-accent-soft text-accent" : "text-ink/55"
            }`}
          >
            {t === "card" ? "Negotiation card" : t}
          </button>
        ))}
      </div>

      {tab === "result" && (
        <>
          <DecisionCard d={bundle.decision} />
          <AmountCard a={bundle.amount} />
          <RateCard r={bundle.rate} />
          <EmiCard e={bundle.emi} />

          <Section eyebrow="Assumptions & limits" title="Where this is guessing">
            <ul className="flex flex-col gap-2">
              {bundle.disclosures.map((x, i) => (
                <li key={i} className="flex gap-2 text-[12px] leading-snug text-ink/70">
                  <span className="text-ink/30">–</span>
                  {x}
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}

      {tab === "card" && <NegotiationCard card={bundle.card} />}

      {tab === "answers" && (
        <Section title="Your answers" eyebrow="Edit anything">
          <ul className="flex flex-col divide-y divide-line">
            {answeredSteps.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[12px] text-ink/55">{s.label}</p>
                  <p className="text-sm font-medium">{s.display}</p>
                </div>
                <button
                  onClick={() => onEdit(s.id)}
                  className="shrink-0 text-xs font-medium text-accent"
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Button variant="ghost" onClick={onRestart}>
        Start over
      </Button>
    </main>
  );
}
