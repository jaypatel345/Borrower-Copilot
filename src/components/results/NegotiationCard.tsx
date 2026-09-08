"use client";

import { useState } from "react";
import type { NegotiationCard as CardData } from "@/lib/types/results";
import {
  inrOrNil,
  lakhRange,
  lakhRangeOrNil,
  pctRange,
  tenureRangeLabel,
} from "@/lib/calculations/money";
import { ConfidenceBadge } from "@/components/shared/ui";

const VERDICT_TONE = {
  borrow: "bg-emerald-600",
  borrow_less: "bg-amber-500",
  dont_borrow: "bg-rose-600",
} as const;

export function NegotiationCard({ card }: { card: CardData }) {
  const [copied, setCopied] = useState(false);
  const isDont = card.verdict === "dont_borrow";
  const tenure = tenureRangeLabel(card.tenureMonths.low, card.tenureMonths.high);
  const lastHeading = isDont ? "Where you stand" : "Say this";

  const plain = [
    "BORROWER COPILOT",
    `Decision: ${card.verdictLine}`,
    `Safe amount: ${lakhRangeOrNil(card.safeAmount)}`,
    `Likely lender range: ${lakhRange(card.lenderRange)}`,
    `EMI ceiling: ${inrOrNil(card.emiCeiling)}`,
    `Fair rate: ${pctRange(card.fairRatePct)}`,
    `All-in APR: ${pctRange(card.aprPct)}`,
    ...(isDont ? [] : [`Tenure: ${tenure}`]),
    "",
    "Why:",
    ...card.why.map((w) => `- ${w}`),
    "",
    `Stress: ${card.stressLine}`,
    "",
    `${lastHeading}: ${card.sayThis}`,
  ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        id="negotiation-card"
        className="overflow-hidden rounded-2xl border border-black/15 bg-white shadow-md"
      >
        <div className={`px-4 py-3 text-white ${VERDICT_TONE[card.verdict]}`}>
          <p className="text-[11px] font-semibold uppercase tracking-widest opacity-90">
            Borrower Copilot
          </p>
          <p className="text-lg font-bold leading-tight">{card.verdictLine}</p>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-4 py-3 text-sm">
          <Field label="Safe amount" value={lakhRangeOrNil(card.safeAmount)} highlight />
          <Field label="Likely lender" value={lakhRange(card.lenderRange)} />
          <Field label="EMI ceiling" value={inrOrNil(card.emiCeiling)} highlight />
          <Field label="Fair rate" value={pctRange(card.fairRatePct)} />
          <Field label="All-in APR" value={pctRange(card.aprPct)} />
          {!isDont && <Field label="Tenure" value={tenure} />}
        </div>

        <div className="border-t border-black/10 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Why</p>
          <ul className="mt-1 flex flex-col gap-1">
            {card.why.map((w, i) => (
              <li key={i} className="text-[12px] leading-snug text-ink/80">
                • {w}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-black/10 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Stress</p>
          <p className="mt-1 text-[12px] leading-snug text-ink/80">{card.stressLine}</p>
        </div>

        <div className="border-t border-black/10 bg-black/[0.03] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">
            {lastHeading}
          </p>
          <p className="mt-1 text-[13px] font-medium leading-snug">{card.sayThis}</p>
        </div>

        <div className="flex items-center justify-between px-4 py-2">
          <ConfidenceBadge level={card.confidenceLevel} missing={card.missing} />
        </div>
      </div>

      <button
        onClick={copy}
        className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-medium active:scale-[0.98]"
      >
        {copied ? "Copied ✓" : "Copy card text"}
      </button>
      <p className="text-[11px] text-ink/45">
        {isDont
          ? "Screenshot this to talk it through with someone, or copy the text below."
          : "Screenshot this screen to show a lender, or copy the text below."}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  // Green only signals "your key number to hold to" — not appropriate when it's nil.
  const green = highlight && value !== "Effectively nil";
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">{label}</p>
      <p className={`font-semibold ${green ? "text-emerald-700" : "text-ink"}`}>{value}</p>
    </div>
  );
}
