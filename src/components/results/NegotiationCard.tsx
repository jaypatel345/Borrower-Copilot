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

const VERDICT_TONE = {
  borrow: "bg-emerald-600",
  borrow_less: "bg-amber-500",
  dont_borrow: "bg-rose-600",
} as const;

const CONF_TONE = {
  high: "bg-emerald-100 text-emerald-900",
  medium: "bg-amber-100 text-amber-900",
  low: "bg-rose-100 text-rose-900",
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
    `Fair rate: ${pctRange(card.fairRatePct)} (all-in APR ${pctRange(card.aprPct)})`,
    ...(isDont ? [] : [`Tenure: ${tenure}`]),
    "",
    "Why:",
    ...card.why.map((w) => `- ${w}`),
    "",
    `Stress: ${card.stressLine}`,
    "",
    `${lastHeading}: ${card.sayThis}`,
    `Confidence: ${card.confidenceLevel}${
      card.missing.length ? ` (not told: ${card.missing.join(", ")})` : ""
    }`,
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
    <div className="flex flex-col gap-2">
      <div
        id="negotiation-card"
        className="overflow-hidden rounded-2xl border border-black/15 bg-white shadow-md"
      >
        <div
          className={`flex items-start justify-between gap-2 px-3.5 py-2.5 text-white ${VERDICT_TONE[card.verdict]}`}
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-90">
              Borrower Copilot
            </p>
            <p className="text-[15px] font-bold leading-tight">{card.verdictLine}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${CONF_TONE[card.confidenceLevel]}`}
          >
            {card.confidenceLevel} conf.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-3.5 py-2.5">
          <Field label="Safe amount" value={lakhRangeOrNil(card.safeAmount)} highlight />
          <Field label="Likely lender" value={lakhRange(card.lenderRange)} />
          <Field label="EMI ceiling" value={inrOrNil(card.emiCeiling)} highlight />
          <Field
            label="Fair rate"
            value={pctRange(card.fairRatePct)}
            sub={`all-in ${pctRange(card.aprPct)}`}
          />
          {!isDont && <Field label="Tenure" value={tenure} />}
        </div>

        <div className="border-t border-black/10 px-3.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/45">Why</p>
          <ul className="mt-0.5 flex flex-col gap-0.5">
            {card.why.map((w, i) => (
              <li key={i} className="text-[11px] leading-tight text-ink/80">
                • {w}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-black/10 px-3.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/45">Stress</p>
          <p className="mt-0.5 text-[11px] leading-tight text-ink/80">{card.stressLine}</p>
        </div>

        <div className="border-t border-black/10 bg-black/[0.03] px-3.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/45">
            {lastHeading}
          </p>
          <p className="mt-0.5 text-[12px] font-medium leading-tight">{card.sayThis}</p>
          {card.missing.length > 0 && (
            <p className="mt-1 text-[10px] text-ink/45">Not told: {card.missing.join(", ")}</p>
          )}
        </div>
      </div>

      <button
        onClick={copy}
        className="rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-medium active:scale-[0.98]"
      >
        {copied ? "Copied ✓" : "Copy card text"}
      </button>
      <p className="text-[11px] text-ink/45">
        {isDont
          ? "Screenshot this to talk it through with someone, or copy the text."
          : "Screenshot this to show a lender, or copy the text."}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  const green = highlight && value !== "Effectively nil";
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-wide text-ink/40">{label}</p>
      <p className={`text-[13px] font-semibold leading-tight ${green ? "text-emerald-700" : "text-ink"}`}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-ink/45">{sub}</p>}
    </div>
  );
}
