"use client";

import { useState } from "react";
import type { InputSpec } from "@/lib/questions/registry";
import { inr } from "@/lib/calculations/money";
import { Button } from "@/components/shared/ui";

type Props = { spec: InputSpec; initial?: unknown; onSubmit: (value: unknown) => void };

const fieldCls =
  "w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-base outline-none focus:border-accent";

function NumberField({
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {prefix && <span className="text-ink/50">{prefix}</span>}
      <input
        className={fieldCls}
        inputMode="numeric"
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
      />
      {suffix && <span className="text-sm text-ink/50">{suffix}</span>}
    </div>
  );
}

export function QuestionInput({ spec, initial, onSubmit }: Props) {
  switch (spec.kind) {
    case "choice":
      return <ChoiceInput spec={spec} onSubmit={onSubmit} />;
    case "money":
      return <MoneyInput spec={spec} initial={initial} onSubmit={onSubmit} />;
    case "integer":
      return <IntegerInput spec={spec} initial={initial} onSubmit={onSubmit} />;
    case "score":
      return <ScoreInput onSubmit={onSubmit} />;
    case "percent":
      return <PercentInput spec={spec} onSubmit={onSubmit} />;
    case "months":
      return <MonthsInput spec={spec} onSubmit={onSubmit} />;
    case "moneyRange":
      return <MoneyRangeInput onSubmit={onSubmit} />;
    case "bounce":
      return <BounceInput onSubmit={onSubmit} />;
    case "upcomingExpense":
      return <UpcomingExpenseInput onSubmit={onSubmit} />;
    case "productiveReturn":
      return <ProductiveReturnInput onSubmit={onSubmit} />;
    case "offer":
      return <OfferInput onSubmit={onSubmit} />;
    default:
      return null;
  }
}

function ChoiceInput({
  spec,
  onSubmit,
}: {
  spec: Extract<InputSpec, { kind: "choice" }>;
  onSubmit: (v: unknown) => void;
}) {
  // Empty option list => the repeatable existing-loans builder.
  if (spec.options.length === 0) return <ExistingLoansInput onSubmit={onSubmit} />;
  return (
    <div className="flex flex-col gap-2">
      {spec.options.map((o) => (
        <button
          key={o.value}
          onClick={() => onSubmit(o.value)}
          className="rounded-xl border border-black/15 bg-white px-4 py-3 text-left text-sm font-medium transition hover:border-accent active:scale-[0.99]"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MoneyInput({
  spec,
  initial,
  onSubmit,
}: {
  spec: Extract<InputSpec, { kind: "money" }>;
  initial?: unknown;
  onSubmit: (v: unknown) => void;
}) {
  const [v, setV] = useState(typeof initial === "number" ? String(initial) : "");
  return (
    <div className="flex flex-col gap-3">
      <NumberField value={v} onChange={setV} prefix="₹" placeholder="0" />
      {v !== "" && <p className="text-xs text-ink/50">{inr(Number(v))}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onSubmit(Number(v))} disabled={v === ""}>
          Continue
        </Button>
        {spec.zeroLabel && (
          <Button variant="outline" onClick={() => onSubmit(0)}>
            {spec.zeroLabel}
          </Button>
        )}
        {spec.allowUnknown && (
          <Button variant="outline" onClick={() => onSubmit("unknown")}>
            I&apos;m not sure
          </Button>
        )}
      </div>
      {spec.allowUnknown && (
        <p className="text-[11px] text-ink/45">
          &ldquo;I&apos;m not sure&rdquo; is not zero — we&apos;ll widen the result and tell you what&apos;s missing.
        </p>
      )}
    </div>
  );
}

function IntegerInput({
  spec,
  initial,
  onSubmit,
}: {
  spec: Extract<InputSpec, { kind: "integer" }>;
  initial?: unknown;
  onSubmit: (v: unknown) => void;
}) {
  const [v, setV] = useState(typeof initial === "number" ? String(initial) : "");
  const n = Number(v);
  const valid = v !== "" && n >= spec.min && n <= spec.max;
  return (
    <div className="flex flex-col gap-3">
      <NumberField value={v} onChange={setV} suffix={spec.suffix} />
      <Button onClick={() => onSubmit(n)} disabled={!valid}>
        Continue
      </Button>
      {v !== "" && !valid && (
        <p className="text-xs text-rose-600">
          Enter a number between {spec.min} and {spec.max}.
        </p>
      )}
    </div>
  );
}

function ScoreInput({ onSubmit }: { onSubmit: (v: unknown) => void }) {
  const [v, setV] = useState(720);
  return (
    <div className="flex flex-col gap-3">
      <input
        type="range"
        min={300}
        max={900}
        value={v}
        onChange={(e) => setV(Number(e.target.value))}
        className="w-full accent-accent"
      />
      <p className="text-center text-2xl font-semibold">{v}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onSubmit(v)}>That&apos;s about right</Button>
        <Button variant="outline" onClick={() => onSubmit("unknown")}>
          I don&apos;t know it
        </Button>
      </div>
      <p className="text-[11px] text-ink/45">
        Unknown ≠ a bad score. We model it as unknown and widen the rate band.
      </p>
    </div>
  );
}

function PercentInput({
  spec,
  onSubmit,
}: {
  spec: Extract<InputSpec, { kind: "percent" }>;
  onSubmit: (v: unknown) => void;
}) {
  const [v, setV] = useState("");
  return (
    <div className="flex flex-col gap-3">
      <NumberField value={v} onChange={setV} suffix="%" />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onSubmit(Number(v))} disabled={v === ""}>
          Continue
        </Button>
        {spec.allowUnknown && (
          <Button variant="outline" onClick={() => onSubmit("unknown")}>
            I&apos;m not sure
          </Button>
        )}
      </div>
    </div>
  );
}

function MonthsInput({
  spec,
  onSubmit,
}: {
  spec: Extract<InputSpec, { kind: "months" }>;
  onSubmit: (v: unknown) => void;
}) {
  const [v, setV] = useState("");
  return (
    <div className="flex flex-col gap-3">
      <NumberField value={v} onChange={setV} suffix="months" />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onSubmit(Number(v))} disabled={v === ""}>
          Continue
        </Button>
        <Button variant="outline" onClick={() => onSubmit(0)}>
          None
        </Button>
        {spec.allowUnknown && (
          <Button variant="outline" onClick={() => onSubmit("unknown")}>
            Not sure
          </Button>
        )}
      </div>
    </div>
  );
}

function MoneyRangeInput({ onSubmit }: { onSubmit: (v: unknown) => void }) {
  const [low, setLow] = useState("");
  const [high, setHigh] = useState("");
  const valid = low !== "" && high !== "" && Number(high) >= Number(low);
  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs text-ink/55">A low month</label>
      <NumberField value={low} onChange={setLow} prefix="₹" />
      <label className="text-xs text-ink/55">A good month</label>
      <NumberField value={high} onChange={setHigh} prefix="₹" />
      <Button onClick={() => onSubmit({ low: Number(low), high: Number(high) })} disabled={!valid}>
        Continue
      </Button>
    </div>
  );
}

function BounceInput({ onSubmit }: { onSubmit: (v: unknown) => void }) {
  const [yes, setYes] = useState(false);
  const [count, setCount] = useState("1");
  const [within, setWithin] = useState("1");
  if (!yes) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={() => onSubmit("none")}>
          No, nothing bounced
        </Button>
        <Button variant="outline" onClick={() => setYes(true)}>
          Yes, a payment bounced
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs text-ink/55">How many?</label>
      <NumberField value={count} onChange={setCount} />
      <label className="text-xs text-ink/55">How many months ago (most recent)?</label>
      <NumberField value={within} onChange={setWithin} />
      <Button
        onClick={() => onSubmit({ count: Number(count), withinMonths: Number(within) })}
        disabled={count === "" || within === ""}
      >
        Continue
      </Button>
    </div>
  );
}

function UpcomingExpenseInput({ onSubmit }: { onSubmit: (v: unknown) => void }) {
  const [yes, setYes] = useState(false);
  const [amount, setAmount] = useState("");
  const [within, setWithin] = useState("");
  if (!yes) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={() => onSubmit("none")}>
          Nothing big coming up
        </Button>
        <Button variant="outline" onClick={() => setYes(true)}>
          Yes, there&apos;s a big expense
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs text-ink/55">Roughly how much?</label>
      <NumberField value={amount} onChange={setAmount} prefix="₹" />
      <label className="text-xs text-ink/55">In how many months?</label>
      <NumberField value={within} onChange={setWithin} />
      <Button
        onClick={() => onSubmit({ amount: Number(amount), withinMonths: Number(within) })}
        disabled={amount === "" || within === ""}
      >
        Continue
      </Button>
    </div>
  );
}

function ProductiveReturnInput({ onSubmit }: { onSubmit: (v: unknown) => void }) {
  const [yes, setYes] = useState(false);
  const [extra, setExtra] = useState("");
  const [payback, setPayback] = useState("");
  if (!yes) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={() => setYes(true)}>
          Yes, I can estimate
        </Button>
        <Button variant="outline" onClick={() => onSubmit("none")}>
          I&apos;d rather not guess
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs text-ink/55">Extra income per month</label>
      <NumberField value={extra} onChange={setExtra} prefix="₹" />
      <label className="text-xs text-ink/55">Months until it pays back the loan</label>
      <NumberField value={payback} onChange={setPayback} />
      <Button
        onClick={() =>
          onSubmit({ extraMonthlyIncome: Number(extra), paybackMonths: Number(payback) })
        }
        disabled={extra === "" || payback === ""}
      >
        Continue
      </Button>
      <p className="text-[11px] text-ink/45">
        We count only half of this, and only when deciding borrow vs borrow-less.
      </p>
    </div>
  );
}

function OfferInput({ onSubmit }: { onSubmit: (v: unknown) => void }) {
  const [yes, setYes] = useState(false);
  const [rate, setRate] = useState("");
  const [fee, setFee] = useState("");
  if (!yes) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={() => onSubmit("none")}>
          No quote yet
        </Button>
        <Button variant="outline" onClick={() => setYes(true)}>
          Yes, I have a quote
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs text-ink/55">Rate they quoted</label>
      <NumberField value={rate} onChange={setRate} suffix="%" />
      <label className="text-xs text-ink/55">Processing fee, if you know it (optional)</label>
      <NumberField value={fee} onChange={setFee} suffix="%" />
      <Button
        onClick={() =>
          onSubmit({
            ratePct: Number(rate),
            processingFeePct: fee === "" ? undefined : Number(fee),
          })
        }
        disabled={rate === ""}
      >
        Continue
      </Button>
    </div>
  );
}

type LoanRow = { kind: string; emi: string; outstanding: string; aprPct: string };
const emptyRow = (): LoanRow => ({ kind: "unsecured", emi: "", outstanding: "", aprPct: "" });

function ExistingLoansInput({ onSubmit }: { onSubmit: (v: unknown) => void }) {
  const [rows, setRows] = useState<LoanRow[]>([emptyRow()]);
  const update = (i: number, patch: Partial<LoanRow>) =>
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="flex flex-col gap-4">
      {rows.map((row, i) => (
        <div key={i} className="rounded-xl border border-black/10 p-3">
          <select
            className={fieldCls}
            value={row.kind}
            onChange={(e) => update(i, { kind: e.target.value })}
          >
            <option value="secured">Secured loan (home, vehicle, LAP)</option>
            <option value="unsecured">Personal / unsecured loan</option>
            <option value="app_loan">App / instant loan</option>
            <option value="credit_card">Credit card</option>
            <option value="informal">Informal / private</option>
          </select>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <NumberField value={row.emi} onChange={(v) => update(i, { emi: v })} prefix="₹" placeholder="EMI" />
            <NumberField
              value={row.outstanding}
              onChange={(v) => update(i, { outstanding: v })}
              prefix="₹"
              placeholder="Owed"
            />
            <NumberField value={row.aprPct} onChange={(v) => update(i, { aprPct: v })} suffix="%" />
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setRows((r) => [...r, emptyRow()])}>
          + Add another
        </Button>
        <Button
          onClick={() =>
            onSubmit(
              rows
                .filter((r) => r.emi !== "" || r.outstanding !== "")
                .map((r) => ({
                  kind: r.kind,
                  emi: r.emi === "" ? undefined : Number(r.emi),
                  outstanding: r.outstanding === "" ? undefined : Number(r.outstanding),
                  aprPct: r.aprPct === "" ? undefined : Number(r.aprPct),
                })),
            )
          }
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
