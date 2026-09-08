"use client";

import { Button } from "@/components/shared/ui";
import { SAMPLE_BORROWERS, type SampleKey } from "@/lib/data/sampleBorrowers";

export function Landing({
  onStart,
  onSample,
}: {
  onStart: () => void;
  onSample: (key: SampleKey) => void;
}) {
  return (
    <main className="flex flex-col gap-6 py-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
          Borrower Copilot
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          Know your numbers before you walk into a lender.
        </h1>
      </div>

      <p className="text-sm leading-relaxed text-ink/70">
        Answer about 9 quick questions. You&apos;ll get four things you can act on:
      </p>

      <ul className="flex flex-col gap-2 text-sm">
        {[
          ["Should you borrow?", "Borrow, borrow less, or don't — with the reason."],
          ["How much?", "What a lender might sanction vs. what you can safely carry."],
          ["A fair rate", "A band for your profile, plus the all-in cost with fees."],
          ["An EMI to hold the line at", "The monthly figure to refuse to cross."],
        ].map(([t, d]) => (
          <li key={t} className="rounded-xl border border-black/10 bg-white p-3">
            <span className="font-semibold">{t}</span>
            <span className="block text-ink/60">{d}</span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-ink/50">
        No login. No documents. Nothing leaves your phone — every number is worked out
        here in the browser. Rates and fees are Sept 2026 market references, not a
        lender&apos;s offer.
      </p>

      <Button onClick={onStart}>Start — it takes 3 minutes</Button>

      <div className="mt-2 border-t border-black/10 pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/45">
          Or try a sample borrower
        </p>
        <div className="flex flex-col gap-2">
          {(Object.keys(SAMPLE_BORROWERS) as SampleKey[]).map((key) => (
            <button
              key={key}
              onClick={() => onSample(key)}
              className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-left text-sm transition hover:border-accent"
            >
              {SAMPLE_BORROWERS[key].label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
