import type {
  AmountResult,
  DecisionResult,
  EmiResult,
  RateResult,
} from "@/lib/types/results";
import {
  inr,
  inrOrNil,
  lakhRange,
  lakhRangeOrNil,
  pctRange,
} from "@/lib/calculations/money";
import { Section, StatRow, Why, tenureLabel } from "@/components/shared/ui";

const VERDICT = {
  borrow: { label: "Borrow", tone: "bg-emerald-100 text-emerald-900" },
  borrow_less: { label: "Borrow less", tone: "bg-amber-100 text-amber-900" },
  dont_borrow: { label: "Don't borrow", tone: "bg-rose-100 text-rose-900" },
} as const;

export function DecisionCard({ d }: { d: DecisionResult }) {
  const v = VERDICT[d.verdict];
  return (
    <Section eyebrow="O1 · The verdict" title={d.headline}>
      <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${v.tone}`}>
        {v.label}
      </span>
      <ul className="mt-3 flex flex-col gap-2">
        {d.reasons.map((r, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-snug text-ink/80">
            <span className="text-accent">•</span>
            {r}
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function AmountCard({ a }: { a: AmountResult }) {
  return (
    <Section eyebrow="O2 · How much" title="Two different numbers">
      {a.routedTo && a.routeReason && (
        <div className="mb-3 rounded-xl bg-accent/10 p-3 text-[13px] text-ink/80">
          <p>
            <span className="font-semibold">Routed to a secured loan. </span>
            {a.routeReason}
          </p>
          {a.routeAlternative && (
            <p className="mt-1.5 text-[12px] text-ink/60">{a.routeAlternative}</p>
          )}
        </div>
      )}

      {(() => {
        const nilSafe = a.safeAmount.high < 1000;
        return (
          <>
            <div
              className={`rounded-xl border-2 p-3 ${
                nilSafe ? "border-rose-300 bg-rose-50/60" : "border-emerald-300 bg-emerald-50/60"
              }`}
            >
              <p
                className={`text-[11px] font-semibold uppercase tracking-wide ${
                  nilSafe ? "text-rose-800" : "text-emerald-800"
                }`}
              >
                Safe for you — use this
              </p>
              <p className="text-xl font-bold">{lakhRangeOrNil(a.safeAmount)}</p>
              <p className="text-[11px] text-ink/55">
                {nilSafe
                  ? "Your income can't safely take on any new loan payment right now."
                  : "What your income comfortably repays, stress-tested."}
              </p>
            </div>

            <div className="mt-2 rounded-xl border border-black/15 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">
                A lender might sanction (estimate)
              </p>
              <p className="text-lg font-semibold text-ink/70">{lakhRange(a.lenderSanction)}</p>
              <p className="text-[11px] text-ink/55">
                What you <em>can</em> get — not what you <em>should</em> take.
              </p>
            </div>
          </>
        );
      })()}

      <Why sentence={a.explanation.sentence} factors={a.explanation.factors} />
    </Section>
  );
}

export function RateCard({ r }: { r: RateResult }) {
  return (
    <Section eyebrow="O3 · A fair rate" title={pctRange(r.fairBandPct)}>
      <div className="flex flex-col gap-1">
        <StatRow label="Fair rate band" value={pctRange(r.fairBandPct)} strong />
        <StatRow
          label="All-in cost (APR)"
          value={pctRange(r.aprBandPct)}
          hint={`includes ~${r.processingFeePct}% fee + 18% GST`}
        />
        {r.offerComparison && (
          <StatRow
            label="A lender quoted you"
            value={`${r.offerComparison.lenderRatePct}%`}
            hint={
              r.offerComparison.verdict === "fair"
                ? "within your fair band"
                : r.offerComparison.verdict === "high"
                  ? "above your fair band — push back"
                  : "well above fair — negotiate hard"
            }
          />
        )}
      </div>

      {r.drivers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.drivers.map((x, i) => (
            <span key={i} className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] text-ink/70">
              {x}
            </span>
          ))}
        </div>
      )}

      <Why sentence={r.explanation.sentence} factors={r.explanation.factors} />
    </Section>
  );
}

export function EmiCard({ e }: { e: EmiResult }) {
  const nil = e.ceiling < 1000;
  return (
    <Section eyebrow="O4 · The EMI to hold the line at" title={inrOrNil(e.ceiling) + (nil ? "" : "/month")}>
      {nil && (
        <p className="mb-3 rounded-xl bg-rose-50 p-3 text-[13px] text-rose-900">
          After your essential costs and the loan payments you already have, there
          is no room for a new EMI. Any new borrowing would come out of money you
          need to live on.
        </p>
      )}
      <div className="flex flex-col gap-1">
        <StatRow label="Agree to no more than" value={inrOrNil(e.ceiling)} strong />
        <StatRow label="You already pay" value={inr(e.currentEmi)} />
        {!nil && (
          <StatRow label="Total after this loan" value={inr(Math.round(e.totalAfterProposed))} />
        )}
        <StatRow
          label="Income left after that"
          value={inr(Math.round(e.residualAfter))}
          hint="after essential costs + all loan payments"
        />
      </div>

      {!nil && e.tenureOptions.length > 1 && (
        <div className="mt-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink/45">
            Tenure trade-off (at the safe amount)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="text-ink/45">
                <tr>
                  <th className="py-1 text-left font-medium">Tenure</th>
                  <th className="py-1 text-right font-medium">EMI</th>
                  <th className="py-1 text-right font-medium">Total interest</th>
                </tr>
              </thead>
              <tbody>
                {e.tenureOptions.map((t) => (
                  <tr key={t.months} className="border-t border-black/5">
                    <td className="py-1.5">{tenureLabel(t.months)}</td>
                    <td className="py-1.5 text-right font-medium">{inr(t.emi)}</td>
                    <td className="py-1.5 text-right text-ink/60">{inr(t.totalInterest)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-[11px] text-ink/50">
            Shorter = less interest overall. Longer = lower monthly, more interest.
          </p>
        </div>
      )}

      <div
        className={`mt-4 rounded-xl p-3 text-[13px] ${
          e.stress.pass ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"
        }`}
      >
        <p className="font-semibold">
          Stress test — {e.stress.label}: {e.stress.pass ? "holds" : "breaks"}
        </p>
        <p className="mt-1 leading-snug">{e.stress.sentence}</p>
      </div>

      <Why sentence={e.explanation.sentence} factors={e.explanation.factors} />
    </Section>
  );
}
