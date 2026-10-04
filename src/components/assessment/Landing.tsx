"use client";

import { useMemo } from "react";
import { Button, SiteHeader } from "@/components/shared/ui";
import { SAMPLE_BORROWERS, type SampleKey } from "@/lib/data/sampleBorrowers";
import { runAssessment } from "@/lib/rules/pipeline";
import { PRODUCTS } from "@/lib/config/products";
import { inr, inrOrNil, lakhRange, lakhRangeOrNil, pctRange } from "@/lib/calculations/money";

const OUTPUTS = [
  {
    n: "01",
    title: "Should you borrow?",
    body: "A clear verdict — borrow, borrow less, or don't borrow right now — with the reason behind it.",
  },
  {
    n: "02",
    title: "How much is safe",
    body: "What a lender might sanction next to what your income can comfortably repay, stress-tested.",
  },
  {
    n: "03",
    title: "A fair interest rate",
    body: "A rate band for a profile like yours, plus the all-in cost (APR) once fees and GST are added.",
  },
  {
    n: "04",
    title: "Your EMI ceiling",
    body: "The monthly payment not to cross, how tenure changes total interest, and one stress test.",
  },
] as const;

const STEPS = [
  {
    title: "Answer about 9 questions",
    body: "Income, existing EMIs, what the loan is for. Questions adapt — a salaried employee isn't asked about ITRs or collateral.",
  },
  {
    title: "Get four answers, each with a why",
    body: "Every number comes with a one-line reason. Skip a question and the ranges widen instead of guessing.",
  },
  {
    title: "Take the Negotiation Card",
    body: "A one-screen summary of your safe amount, fair rate and EMI limit — screenshot it or copy the text before you visit a lender.",
  },
] as const;

export function Landing({
  onStart,
  onSample,
}: {
  onStart: () => void;
  onSample: (key: SampleKey) => void;
}) {
  return (
    <div className="bg-paper">
      {/* Top bar */}
      <div className="border-b border-line">
        <div className="mx-auto max-w-page px-5 sm:px-8">
          <SiteHeader
            right={
              <nav className="flex items-center gap-6 text-sm">
                <a href="#how-it-works" className="hidden text-ink/60 hover:text-ink sm:inline">
                  How it works
                </a>
                <a href="#samples" className="hidden text-ink/60 hover:text-ink sm:inline">
                  Examples
                </a>
                <Button onClick={onStart}>Start assessment</Button>
              </nav>
            }
          />
        </div>
      </div>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-page items-center gap-12 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs font-medium text-ink/70">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Free loan self-check for Indian borrowers
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Know what you can safely borrow — before you meet a lender.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink/65">
              A lender tells you how much you <em>can</em> get. Borrower Copilot tells you how
              much you <em>should</em> take — plus a fair interest rate and the EMI you
              shouldn&apos;t cross.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={onStart}
                className="rounded-lg bg-accent px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-accent-dark"
              >
                Start — it takes 3 minutes
              </button>
              <a href="#samples" className="text-[15px] font-medium text-ink/70 hover:text-ink">
                See an example →
              </a>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/55">
              {["No login", "No documents", "Runs entirely in your browser"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <ExampleResult />
        </section>

        {/* What you get */}
        <section className="border-t border-line bg-mist">
          <div className="mx-auto max-w-page px-5 py-20 sm:px-8">
            <SectionHeading
              eyebrow="What you get"
              title="Four answers you can act on"
              body="Covers personal, home, gold, two-wheeler and business loans, and loans against property."
            />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {OUTPUTS.map((o) => (
                <div key={o.n} className="rounded-xl border border-line bg-white p-5">
                  <p className="text-sm font-semibold text-accent">{o.n}</p>
                  <h3 className="mt-3 font-semibold tracking-tight">{o.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/60">{o.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The core idea: two different numbers */}
        <section className="mx-auto max-w-page px-5 py-20 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <SectionHeading
              eyebrow="Why it matters"
              title="The amount a lender offers isn't the amount you can afford"
              body="Lenders size a loan by what they can recover. That number is usually higher than what fits your budget. We work out both, separately, and always recommend the safe one."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-line p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/45">
                  Lender&apos;s view
                </p>
                <ul className="mt-4 flex flex-col gap-3 text-sm text-ink/70">
                  <li>Up to 40–55% of income can go to EMIs</li>
                  <li>Longest tenure the product allows</li>
                  <li>Collateral can raise the amount</li>
                </ul>
              </div>
              <div className="rounded-xl border border-accent/30 bg-accent-soft p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Your safe view
                </p>
                <ul className="mt-4 flex flex-col gap-3 text-sm text-ink/80">
                  <li>Checks EMI share and money left after essentials — uses the lower</li>
                  <li>Must survive a 15% drop in income</li>
                  <li>Priced at the top of the fair rate band</li>
                  <li>Collateral never raises it</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-8 border-t border-line">
          <div className="mx-auto max-w-page px-5 py-20 sm:px-8">
            <SectionHeading eyebrow="How it works" title="Three minutes, start to finish" />
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="border-t border-line pt-5">
                  <p className="text-sm font-medium text-ink/40">Step {i + 1}</p>
                  <h3 className="mt-2 font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/60">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Sample borrowers */}
        <section id="samples" className="scroll-mt-8 border-t border-line bg-mist">
          <div className="mx-auto max-w-page px-5 py-20 sm:px-8">
            <SectionHeading
              eyebrow="Try it without typing"
              title="See a full result for a sample borrower"
              body="Three real-world profiles — a salaried professional, a self-employed business owner and an informal earner — each leading to a different verdict."
            />
            <div className="mt-10 grid gap-3 md:grid-cols-3">
              {(Object.keys(SAMPLE_BORROWERS) as SampleKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => onSample(key)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-5 py-4 text-left text-sm font-medium transition-colors hover:border-accent"
                >
                  {SAMPLE_BORROWERS[key].label}
                  <span className="text-ink/35">→</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Honest limits */}
        <section className="mx-auto max-w-page px-5 py-20 sm:px-8">
          <SectionHeading eyebrow="Good to know" title="What this is — and isn't" />
          <dl className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              [
                "Private by design",
                "There's no account and no server. Your answers never leave your device — every number is calculated in your browser.",
              ],
              [
                "Market references, not offers",
                "Rate bands and fees reflect Sept 2026 market references. They are not any lender's offer and not a credit check.",
              ],
              [
                "Honest about gaps",
                "Say \"I'm not sure\" and the result shows lower confidence and wider ranges — it never quietly assumes zero.",
              ],
            ].map(([t, d]) => (
              <div key={t}>
                <dt className="font-semibold tracking-tight">{t}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink/60">{d}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-page px-5 pb-20 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-ink px-8 py-10 text-white md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Check your numbers first.</h2>
              <p className="mt-2 text-white/65">
                Walk into the branch knowing your limit, not hearing it.
              </p>
            </div>
            <button
              onClick={onStart}
              className="shrink-0 rounded-lg bg-white px-6 py-3 text-[15px] font-medium text-ink transition-colors hover:bg-white/90"
            >
              Check my numbers
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-page flex-col gap-2 px-5 py-8 text-sm text-ink/50 sm:flex-row sm:justify-between sm:px-8">
          <p className="font-medium text-ink/70">Borrower Copilot</p>
          <p>A self-assessment tool, not financial advice or a loan offer.</p>
        </div>
      </footer>
    </div>
  );
}

/** Hero preview — real engine output for the salaried sample borrower. */
function ExampleResult() {
  const sample = SAMPLE_BORROWERS.priya.profile;
  const card = useMemo(() => runAssessment(sample).card, [sample]);
  const product = PRODUCTS[sample.loanType].label.toLowerCase();

  return (
    <div className="rounded-2xl border border-line bg-white">
      <div className="flex flex-col gap-1 border-b border-line px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink/45">Example result</p>
        <p className="text-xs text-ink/50">
          Salaried · asked for {inr(sample.amountWanted)} {product}
        </p>
      </div>

      <div className="px-5 py-5">
        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
          {card.verdictLine}
        </span>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <p className="text-xs font-medium text-emerald-800">Safe to borrow</p>
            <p className="mt-1 whitespace-nowrap text-lg font-semibold tracking-tight sm:text-2xl">
              {lakhRangeOrNil(card.safeAmount)}
            </p>
          </div>
          <div className="rounded-xl border border-line p-4">
            <p className="text-xs font-medium text-ink/50">Lender may offer</p>
            <p className="mt-1 whitespace-nowrap text-lg font-semibold tracking-tight text-ink/45 sm:text-2xl">
              {lakhRange(card.lenderRange)}
            </p>
          </div>
        </div>

        <dl className="mt-5 divide-y divide-line text-sm">
          <Row label="Fair interest rate" value={pctRange(card.fairRatePct)} />
          <Row label="All-in cost incl. fees" value={pctRange(card.aprPct)} />
          <Row label="EMI ceiling" value={`${inrOrNil(card.emiCeiling)}/month`} />
        </dl>
      </div>

      <p className="border-t border-line px-5 py-3.5 text-xs text-ink/50">
        Every number comes with a one-line reason you can check.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-ink/55">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold text-accent">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight">{title}</h2>
      {body && <p className="mt-4 leading-relaxed text-ink/60">{body}</p>}
    </div>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8.5l3 3 7-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-emerald-600"
      />
    </svg>
  );
}
