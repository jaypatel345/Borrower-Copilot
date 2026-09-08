# Borrower Copilot

A borrower-side loan self-assessment for Indian borrowers. Answer ~9 adaptive
questions and get four things you can act on before you walk into a lender:

| | Output |
|---|---|
| **O1** | Borrow / Borrow less / Don't borrow — with the reason |
| **O2** | Two numbers: what a lender might **sanction** vs. what you can **safely carry** |
| **O3** | A fair interest-rate **band** + the all-in cost (APR including fees) |
| **O4** | A monthly **EMI ceiling**, the tenure trade-off, and one stress case |

Plus a one-screen **Negotiation Card** to hold up in a branch.

No login, no backend, no documents. Every number is computed in the browser and
every number has a one-sentence "why".

---

## Deliverables

The four deliverables, at the root:

1. **The working app** — [live demo](https://borrower-copilot-one.vercel.app/), or run locally (see below). Also `src/`.
2. **[RULES.md](./RULES.md)** — every threshold, band, fee, formula and assumption in a table: what · value · why · source or "my judgement".
3. **[RUNTHROUGHS.md](./RUNTHROUGHS.md)** — Priya, Ravi and Anita: the questions asked, the four outputs, and the Negotiation Card for each (stated vs assumed inputs marked).
4. **5-minute walkthrough** — [Loom video](https://www.loom.com/share/2f6596433b5f48ad9aeaf010339c6856). Key decisions and "what I'd build next / cut" are in this README.

---

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

That's the whole setup — well under 5 minutes.

```bash
npm test             # 78 tests (rules + question engine + UI integration)
npm run build        # static export to ./out  — deploy that folder anywhere
```

**Vercel:** import the repo, framework auto-detected as Next.js, no env vars, no
config. `next.config.mjs` sets `output: "export"` so it ships as a static site.

---

## Why it's built this way

The brief's core tension: **a lender's number and a safe number are different**,
and the borrower only ever sees the lender's. So the engine computes them
separately and always recommends the safe one:

- **Lender sanction (O2A)** — looser: lender FOIR (50–55%), max tenure, credit-tier
  haircut, collateral LTV if secured. Presented as an *estimate*.
- **Safe amount (O2B)** — conservative on every input: the lower of a FOIR cap and
  a residual-income cap, sized to survive a −15% income shock, priced at the top
  of the rate band, over a comfortable (not maximum) tenure. **Collateral never
  raises this number.**

Other principles from the brief, enforced in code:

- **Unknown ≠ zero.** Optional answers are three-state (`not asked` / `unknown` /
  `known`). "I'm not sure" on household costs uses a *visible* 50%-of-income
  calculation fallback and drops confidence — it is never shown as your real
  expenses, and never silently treated as ₹0.
- **Confidence widens with silence.** Fewer answers → wider bands. Missing info can
  only widen a range, never tighten it. Unknown credit score caps confidence at
  Medium and widens the rate band's *high* side only.
- **Every additional question moves an output.** Each question declares which of
  O1–O4 it can change (`affects`); a test fails if an additional question affects
  nothing.
- **Adaptive.** A salaried employee is not asked about ITR or collateral; a kirana
  owner is. See the three run-throughs.

---

## Architecture

```
src/
  app/                      Next.js entry; one static page
  components/
    assessment/             Landing, one-question-at-a-time flow, all inputs
    results/                O1–O4 cards, Negotiation Card, disclosures
    shared/                 progress bar, confidence badge, stat rows, "why" block
  lib/
    config/
      rules.ts              EVERY threshold (FOIR, haircuts, tiers, stress, …)
      products.ts           per-product rate bands, fees, LTV, tenures
    types/                  BorrowerProfile (+ Known<T>), ResultBundle
    questions/
      registry.ts           9 must + 14 adaptive questions
      engine.ts             next-question / progress / back-edit (pure)
    rules/                  pure functions — no UI, no I/O, deterministic
      deriveInputs.ts        raw answers → stable income, credit tier, routing, distress
      affordability.ts       safe EMI = min(FOIR cap, residual cap) + stressed variant
      rate.ts                fair band = product base + additive premiums
      apr.ts                 all-in APR via IRR of real cash flows
      eligibility.ts         O2A lender sanction
      safeAmount.ts          O2B safe amount
      stress.ts              one scenario: rate +2pp (floating) or income −15%
      decision.ts            O1 ordered rule list
      confidence.ts          High/Medium/Low + band widening
      explanations.ts        one-sentence "why" built from the numbers actually used
      pipeline.ts            runAssessment(profile) → ResultBundle  ← the entry point
    calculations/           emi.ts, irr.ts, money.ts (formatting + rounding)
    data/sampleBorrowers.ts Priya, Ravi, Anita fixtures
```

**Rule of the codebase:** components render a `ResultBundle`; they never compute.
No financial number is hard-coded outside `lib/config/`. No borrower-specific
special-casing — the three samples are test inputs, not outputs.

### Pipeline (`runAssessment`)

```
profile
 └─ deriveInputs         stable income (safe + lender views), essentials (or visible
    │                     fallback), credit tier, product routing, distress flags
 ├─ confidence           level + range-width multipliers
 ├─ rate                 fair band + APR (needs confidence to widen)
 ├─ affordability        safe EMI ceiling + −15% stressed ceiling
 ├─ safeAmount (O2B)     from min(ceiling, stressed ceiling); collateral excluded
 ├─ eligibility (O2A)    from lender FOIR × lender income; collateral LTV if secured
 ├─ stress               rate +2pp or income −15%, pass/fail vs ceiling
 ├─ decision (O1)        ordered hard stops, then safe vs wanted
 └─ assemble             O1–O4 + Negotiation Card + disclosures
```

Deterministic: no `Date.now()`, no randomness, no network. The same profile
always produces the same bundle, which is why the three sample borrowers can be
snapshot-tested.

---

## Assumptions & honesty

**[RULES.md](./RULES.md)** documents every threshold, band, fee and formula, each
classified as `sourced fact` · `regulatory requirement` · `market reference` ·
`my judgement`, with source URLs.

Headline points:

- Interest-rate bands and fees are **market references** for Sep 2026 (RBI repo
  ~5.5%), gathered from lender and aggregator sites — **not any lender's offer**.
  Aggregator sources are secondary and flagged for re-verification.
- The APR concept is an **RBI regulatory requirement** (Key Facts Statement, Apr
  2024); our IRR solver is an approximation, not a compliance claim.
- There is **no statutory FOIR ceiling** in India — every FOIR number here is
  our judgement, tuned conservative, and labelled as such.
- The app **cannot know**: any specific lender's underwriting model, your real
  bureau report, whether informal income continues, or whether projected
  "productive" income actually arrives (counted at 50%, O1 only, off under
  repayment distress).

Change any assumption in `src/lib/config/rules.ts` and the whole app updates.

---

## What I'd build next

1. **Debt-consolidation modelling** — for Anita, compute the monthly saving from
   refinancing the 30%+ app loans into a lower-rate product, shown as an
   alternative path (not just advised in prose).
2. **A "what changed" diff on Edit** — when an answer is edited from the results
   screen, show which of O1–O4 moved and by how much.
3. **Save the card as an image** (currently screenshot + copy-text only).
4. **Tiered LTV** — config uses a flat LTV per product; implement the RBI
   ticket-size tiers for home and gold loans.
5. **Persist the session** in `localStorage` so a refresh doesn't lose progress.
6. **A11y + i18n** — focus management between questions; Kannada/Hindi.

## What I cut / left out

No bureau integration, ML model, or lender API (out of scope; the point is a
transparent rules engine). No account/server/persistence beyond the browser.
Loan products beyond the six the brief needs. Full amortisation schedules and
prepayment modelling (the tenure table shows the trade-off). Charts — the tenure
trade-off is a 4-row table. Art-directed visual design — the UI is clean and
mobile-first, not polished for its own sake.
