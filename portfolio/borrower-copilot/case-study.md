# Borrower Copilot — Case Study

**Live:** https://borrower-copilot-one.vercel.app · **Code:** https://github.com/jaypatel345/Borrower-Copilot

## Problem

Indian borrowers usually see only what a lender is willing to sanction, never what they can safely repay — and the two numbers are often far apart.

## What I built

A borrower-side loan self-assessment tool: about 9 adaptive questions produce a borrow / borrow less / don't borrow verdict, a safe amount next to a likely lender sanction, a fair rate band with all-in APR, and an EMI ceiling with a stress test.
It runs entirely in the browser — no login, no backend, no documents — on a deterministic rules engine where every number comes with a one-sentence "why"; it is a self-assessment aid, not financial advice or a lender offer.

## Features

- **Adaptive questions:** 9 core questions plus 14 conditional ones (e.g. ITR, collateral, co-applicant), so a salaried employee and a kirana owner see different flows.
- **Two amounts, side by side:** a conservative "safe for you" range and a looser "a lender might sanction" estimate; collateral can raise the lender estimate but never the safe amount.
- **Fair rate band + all-in APR:** product base band plus risk premiums, with APR computed from an IRR of the actual cash flows including processing fee and 18% GST.
- **EMI ceiling, tenure trade-off and one stress case:** income −15% or rate +2pp depending on the product, with a clear holds / breaks result.
- **Honest uncertainty:** unknown answers are never treated as zero — missing information lowers confidence (High / Medium / Low) and widens the ranges.
- **One-screen Negotiation Card:** the safe amount, rate band, EMI cap and a script asking the lender for the Key Facts Statement, ready to take into a branch.

## Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Logic and data:** pure, deterministic TypeScript rules engine (`runAssessment()`); all thresholds centralised in `src/lib/config/rules.ts` and `products.ts`; hand-written EMI and IRR (bisection) calculations
- **Testing:** Vitest, React Testing Library, jsdom
- **Delivery:** static export (`output: "export"`) deployed on Vercel

## Result

**78 automated tests across 6 test files, all passing** (I ran `npm test` and got 78/78). They cover the EMI/IRR math, the config, the rules engine, the question engine, the three documented sample borrowers end to end, and UI integration.

## How the numbers are grounded

`RULES.md` labels each threshold as a *sourced fact*, *regulatory requirement*, *market reference* or *my judgement*:

- **Regulatory (RBI):** the all-inclusive APR / Key Facts Statement requirement, penal-charge rules, and prepayment-charge rules. The app's IRR solver is an approximation, not a compliance claim.
- **Market reference:** rate bands and processing fees taken from lender and aggregator sites in Sep 2026, representative only, not any lender's live offer.
- **My judgement:** every FOIR (fixed obligations to income ratio) limit. India has no statutory FOIR ceiling. The same goes for the income haircuts, the credit-tier premiums, the stress scenarios, the verdict thresholds and the confidence model. These are deliberate, conservative product choices, not official lending rules.

## Worked examples

`RUNTHROUGHS.md` covers three sample borrowers, each with a different verdict. Inputs the brief didn't state are marked as assumed.

- **Priya** (salaried) gets *Borrow*.
- **Ravi** (self-employed) gets *Borrow less*, routed to a secured business loan.
- **Anita** (informal income, existing high-interest app loans) gets *Don't borrow*.

In all three cases the safe amount is well below the lender estimate.

## Planned, not built

These are listed in the README under "What I'd build next" and are **not** in the app yet:

- Debt-consolidation modelling
- A "what changed" diff after editing an answer
- Saving the card as an image
- RBI ticket-size-tiered LTV (loan-to-value), which is currently a flat ratio per product
- Saving progress in `localStorage`
- Accessibility improvements and Kannada/Hindi translations
