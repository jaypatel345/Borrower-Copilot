# Walkthrough

A 5-minute read: how the app works, the decisions that shaped it, and what I'd do
next.

---

## 1. The 60-second demo

1. **Landing** → tap **"Ravi, 42 · Mysuru · self-employed"**.
2. **O1** says *Borrow less*, with reasons tied to numbers.
3. **O2** shows two numbers, far apart: safe **₹3.0–5.0L** vs lender **₹11.0–15.5L**,
   and a banner explaining the loan was *routed to a secured product* because he
   owns an unencumbered shop.
4. **O3**: a rate *band* 10.8–15.0%, plus the all-in APR, plus chips showing every
   adjustment ("No credit score — band widened, not penalised").
5. **O4**: a ₹11,500 EMI ceiling, a tenure table, and a rate-rise stress test that
   holds.
6. **Negotiation Card** tab → a one-screen summary with a "Say this" script and a
   Copy button.
7. **Answers** tab → every answer, each with an Edit link.

Then try **Anita** (Don't borrow, "Effectively nil") and **Priya** (Borrow, tight
rate, high confidence). Same engine, three different paths.

---

## 2. How it's built

- **Next.js static export** — `npm run build` emits `./out`, deployable to Vercel
  with zero config. No backend, no database, no auth. Everything runs in the
  browser.
- **Rules are pure TypeScript in `src/lib/rules/`**, orchestrated by
  `runAssessment(profile)`. No UI imports, no `Date.now()`, no randomness — so the
  three borrowers are snapshot-tested and the follow-up "change a rule live" is a
  one-line edit in `src/lib/config/rules.ts`.
- **Components render a `ResultBundle`; they never compute.**
- **78 tests**: EMI/IRR maths, the question engine's adaptive paths, every
  decision branch, and UI integration on all three samples.

Pipeline: `deriveInputs → confidence → rate → affordability → safeAmount (O2B) →
eligibility (O2A) → stress → decision (O1) → assemble`.

---

## 3. Key decisions

**Two numbers, computed from different rules.** Lender sanction uses a loose FOIR
(50–55%), max tenure, and collateral LTV. Safe amount uses the *lower* of a FOIR
cap and a residual-income cap, sized to survive a −15% income shock, at the top of
the rate band, over a comfortable tenure. They are meant to diverge — Ravi's gap
(₹4L vs ₹13L midpoints) is the product working, not a bug.

**Collateral never raises the safe number.** It can lift the lender estimate and
trigger secured routing, but O2B and O4 stay bound to income and residual cash
flow. A pledged shop doesn't make a monthly payment affordable.

**Unknown ≠ zero, three ways.** (a) Optional fields are three-state — *not asked* /
*unknown* / *known*. (b) "I'm not sure" on household costs uses a **visible**
50%-of-income calculation fallback and drops confidence; it's never shown as the
borrower's real expenses and never silently ₹0. (c) Unknown credit score → tier
`unknown` (a 0.9× capacity haircut and a wider rate band), never tier `weak`.

**Confidence only widens.** Missing information adds to the *high* side of the rate
band and to the amount band width. It can never make an estimate look more
precise. Unknown credit score caps confidence at Medium.

**Adaptive questions, each earning its place.** 9 must + 14 additional. Every
additional question declares which outputs it can move (`affects`) — a test fails
if one moves nothing. Salaried Priya sees 17 questions; self-employed Ravi sees 21
(ITR, collateral, co-applicant); informal Anita sees 19 (income range, bounces),
and is *not* asked about ITR or property.

**"Don't borrow" is reachable and fires on Anita** — via the residual-buffer floor
(under 10% of income uncommitted) and, independently, the recent-bounce +
informal + high-FOIR rule. Her hoped-for scooter income is explicitly not counted
because of the recent bounce.

**Rates are labelled market references, not offers.** Product bands are the *tight*
band a well-qualified borrower should expect (Sept 2026, RBI repo ~5.5%); premiums
widen them. Every band, fee, threshold and formula is in
[RULES.md](./RULES.md), classified `sourced fact` / `regulatory requirement` /
`market reference` / `my judgement`, with source URLs. Aggregator sources are
flagged as secondary.

**Honest about the RBI angle.** The all-in APR *concept* is a real regulatory
requirement (Key Facts Statement, Apr 2024) and the app tells the borrower to
demand the KFS. Our IRR solver is an approximation, not a compliance claim. There
is no statutory FOIR ceiling in India — every FOIR number is ours and labelled so.

---

## 4. What I'd build next

1. **Debt-consolidation modelling.** For Anita, actually compute the monthly
   saving from refinancing the 30%+ app loans into a lower-rate product, instead
   of only advising it in prose — then show it as an alternative "path".
2. **A "what changed" diff on Edit** — when the borrower edits an answer from the
   results screen, show which of O1–O4 moved and by how much. This is the app's
   whole thesis (every additional question tightens a range) and it should be
   visible.
3. **Save the card as an image** (`html-to-image`) — right now it's screenshot +
   copy-text only.
4. **Tiered LTV.** The config uses a flat LTV per product; implement the RBI
   ticket-size tiers for home and gold loans.
5. **Persist the session** in `localStorage` so a refresh doesn't lose progress.
6. **A11y + i18n pass** — proper focus management between questions, and a
   Kannada/Hindi translation given the target users.

## 5. What I'd cut / deliberately left out

- **No bureau integration, no ML model, no lender API** — out of scope by the
  brief, and the point is a transparent rules engine a borrower can audit.
- **No account, no server, no persistence beyond the browser** — keeps "nothing
  leaves your phone" literally true.
- **Loan products beyond the six the brief needs** — education loans, credit-card
  balance transfers, etc. are stubs at best.
- **Amortisation schedules and prepayment modelling** — the tenure table shows the
  trade-off; a full schedule is noise on a phone.
- **Fancy charts** — the tenure trade-off is a 4-row table, not a chart. Faster to
  read, nothing to misinterpret.
- **Polished visual design** — the brief scores "works on a phone" and "ranges
  shown as ranges", not pixels. The UI is clean and mobile-first; it is not
  art-directed.
