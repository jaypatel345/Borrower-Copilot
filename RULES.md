# RULES.md — Borrower Copilot

Every threshold, band, fee, formula and assumption used by the rules engine.
**Classification** is one of: `sourced fact` · `regulatory requirement` · `market reference` · `my judgement`.

- **sourced fact** — structurally/legally true (a formula, a statutory rate).
- **regulatory requirement** — an RBI rule. Cited to an RBI circular. Scope/date noted; verify before relying in production.
- **market reference** — representative of Indian retail lending as observed on lender / aggregator sites in **Sep 2026**. Not any lender's live offer.
- **my judgement** — a choice I made for this borrower-side tool. Deliberately conservative. Change freely in `src/lib/config/rules.ts`.

Research date: **2026-09-08**. Rate environment context: RBI repo ~5.5%, one of the softer rate phases; home-loan floating rates were unusually low (~7–8%). Bands below reflect that and will drift with the rate cycle.

Every value here lives in **`src/lib/config/rules.ts`** (thresholds) or **`src/lib/config/products.ts`** (per-product bands, fees, LTV, tenures). No rule file hard-codes a number. Section refs like "§9a" are internal to this document.

---

## 1. Core formulas

| What | Value | Classification | Why | Source |
|---|---|---|---|---|
| Reducing-balance EMI | `EMI = P·r·(1+r)^n / ((1+r)^n − 1)`, `r` = annual rate / 12, `n` = months | sourced fact | Standard amortising-loan math | Standard finance |
| Principal from EMI (annuity PV) | `P = EMI · (1 − (1+r)^-n) / r` | sourced fact | Inverse of the above; used to size O2A / O2B | Standard finance |
| FOIR | `(existing EMIs + proposed EMI) / monthly income` | market reference | Standard Indian serviceability metric; no statutory value | idfcfirst.bank.in FOIR explainer; precisa.in |
| APR / all-in cost | monthly IRR `i` (bisection) solving `netDisbursed = Σ EMIₜ/(1+i)^t`; `APR = i × 12`. `netDisbursed = principal − fee − GST(fee)`, EMIs use the nominal rate. Illustrated on the **safe-amount midpoint** at the **comfortable tenure**, at both ends of the fair-rate band. | regulatory requirement (concept) / my judgement (our approximation) | RBI KFS mandates an all-charges-inclusive APR + amortisation sheet; exact solver is ours | RBI/2024-25/18, 15 Apr 2024 |
| GST on loan processing fee | 18% | sourced fact | GST rate on financial services fees | GST law |
| Lakh formatting / `en-IN` grouping | ₹8,00,000 style | sourced fact | Indian digit grouping | `Intl.NumberFormat('en-IN')` |

---

## 2. Product interest-rate bands (fair band for a well-qualified borrower)

Used as the **base** in O3; premiums from §9 are added. "Upper market" = weaker profile / NBFC, shown as context only.

The **fair band** is the *tight* band a well-qualified borrower should expect. Premiums in §9c widen it for weaker profiles; the **upper market** column is context for how high a weak/NBFC quote can legitimately go.

| Product | Fair band (well-qualified) | Upper market | Rate type | Classification | Source (Sep 2026) |
|---|---|---|---|---|---|
| Home loan | 7.5%–8.75% | ~11%+ | floating (repo-linked) | market reference | scripbox.com, cleartax.in, hdfc.bank.in, paisabazaar.com |
| Loan Against Property (LAP) | 9.0%–10.5% | ~18% | floating | market reference | cleartax.in, hdfc.bank.in (repo + 3.0–4.5%), smfgindiacredit.com |
| Personal loan | 10.5%–12.5% | ~24% | fixed | market reference | paisabazaar.com (SBI 10.30–15.30%), hdfc.bank.in (10.40–24.16% IRR) |
| Gold loan | 9.0%–11.0% | ~24%+ | fixed | market reference | cleartax.in, bankbazaar.com (from 8.55%), iifl.com |
| Two-wheeler loan (EV) | 11.0%–13.5% | ~22% | fixed | market reference | hdbfs.com, meraev.com; ~0.5% green concession common |
| Business loan — unsecured / MSME | 15.0%–19.0% | ~26% | fixed | market reference | paisabazaar.com, flexiloans.com (PSU 12–16, private 14–20, NBFC 15–24) |
| Business loan — secured (against property) | 10.0%–12.5% | ~16% | floating | my judgement (blend of LAP + MSME secured pricing) | derived from LAP band + flexiloans MSME data |
| EV green concession | −0.5% to band | market reference | Common under bank green-mobility schemes | hdbfs.com, tradebrains.in |

---

## 3. Processing fees (assumption used in APR; borrower can override)

| Product | Assumed fee | Observed market range | Classification | Source |
|---|---|---|---|---|
| Personal loan | 2.0% + 18% GST | 1%–3% (SBI ≤1.5%; HDFC ~₹6,500 flat) | market reference | paisabazaar.com, hdfc.bank.in |
| Home loan | 0.40% + GST | 0.25%–1.5% (often capped) | market reference | nobroker.in, creditmantri.com |
| LAP | 1.0% + GST | 0.5%–3.0% | market reference | creditcares.in, bajajfinserv.in |
| Gold loan | 0.50% + GST | 0.25%–1.0% or flat | market reference | cleartax.in, iifl.com |
| Two-wheeler | 2.0% + GST | 1.5%–3.0% | market reference | bankbazaar.com |
| Business loan | 2.0% + GST | 1%–3% | market reference | paisabazaar.com, flexiloans.com |
| Borrower-supplied fee | overrides the assumption | — | my judgement | — |

---

## 4. LTV / collateral ratios (for secured sanction in O2A)

The **implemented value** is a single flat ratio per product (`PRODUCTS[...].ltv` in `src/lib/config/products.ts`). The RBI/market context (tiered, where it exists) is shown for reference; a production build should implement the tiers.

| Product | Implemented value | Regulatory / market context | Classification | Source |
|---|---|---|---|---|
| Home loan | **80%** (flat) | RBI ticket-size-tiered: 90% (≤₹30L) / 80% (₹30L–75L) / 75% (>₹75L) | regulatory requirement (tiers) / my judgement (flat mid value) | RBI Master Circular – Housing Finance (verify current tiers) |
| Gold loan | **75%** (flat) | RBI tiered: 85% (≤₹2.5L) / 80% (₹2.5L–5L) / 75% (>₹5L), effective 01 Apr 2026 | regulatory requirement (tiers) / my judgement (flat, = the >₹5L cap) | RBI gold-loan directions 2025/26; ujjivansfb.bank.in, airtel.in/blog |
| LAP | **60%** of market value | Banks 50–70% for non-home mortgage | market reference | cleartax.in, bankermart.com |
| Two-wheeler | **85%** of on-road price | Typical 80–90% funding | market reference | bankbazaar.com |
| Business (against property) | **60%** of collateral value | Priced like LAP | my judgement | — |
| Unencumbered collateral only | pledged value counts only if the borrower states it is loan-free | — | my judgement | Avoid double-counting charged assets |

---

## 5. RBI regulatory points surfaced by the app

| What | Value / rule | Classification | Why it matters here | Source |
|---|---|---|---|---|
| Key Facts Statement (KFS) + APR | All retail & MSME term loans: lender must give KFS with all-inclusive APR, fee schedule, amortisation | regulatory requirement | O3 shows an APR the borrower can demand from the lender and compare | RBI/2024-25/18 DOR.STR.REC.13/13.03.00/2024-25, 15 Apr 2024, effective 01 Oct 2024 |
| Charges outside KFS | Cannot be levied without explicit borrower consent | regulatory requirement | Negotiation Card line: "ask for the KFS" | Same circular |
| Penal charges (not penal interest) | Penalty = flat "penal charge", not added to interest rate; no capitalisation | regulatory requirement | App never models compounding penal interest; flagged as a borrower right | RBI/2023-24/53, 18 Aug 2023, effective 01 Apr 2024 |
| Individual (non-business) penal charge | Not higher than for non-individual borrowers | regulatory requirement | Context only | Same circular |
| Prepayment / foreclosure charges | Barred on floating-rate loans to individuals (non-business); and to MSEs up to ₹7.5 cr — for loans sanctioned/renewed on/after 01 Jan 2026 | regulatory requirement | "Clear high-cost debt first" advice assumes floating loans can be foreclosed free; Card notes it | RBI (Pre-payment Charges on Loans) Directions, 2025, 02 Jul 2025 |
| Statutory FOIR ceiling | None exists | regulatory requirement (absence) | We must not present any FOIR number as an RBI rule | gktoday.in; precisa.in |
| Floating-rate benchmark | Retail floating loans priced off an external benchmark (repo) | regulatory requirement | Rate-stress scenario applied to floating products | RBI External Benchmark guidelines |

---

## 6. Lender-side FOIR (for O2A — "what a lender will likely sanction")

Higher, less conservative than the borrower-safe set. Estimate only. The income figure compared against the cutoffs and multiplied by the FOIR is the **lender-view stable income** (§9a haircuts + co-applicant), not raw take-home.

| Borrower type | Lender FOIR | Classification | Why | Source |
|---|---|---|---|---|
| Salaried, lender-view income > ₹1,00,000/mo | 55% | market reference | Banks stretch to 50–65% with strong profile | precisa.in; idfcfirst.bank.in |
| Salaried, lender-view income ₹30,000–1,00,000/mo | 50% | market reference | "≤50% generally acceptable" | Same |
| Salaried, lender-view income < ₹30,000/mo | 40% | my judgement | Thin absolute residual at low income | — |
| Self-employed (applied to **documented** income) | 45% | my judgement (bank practice varies 40–50%) | Lumpier cash flow, weaker verification | flexiloans.com; general practice |
| Informal / assessed income | 40% | my judgement | No verified income; lenders assess conservatively | — |

### §6b Lender capacity multiplier by credit tier (O2A only)

| Tier | Multiplier on income-derived sanction | Classification | Why |
|---|---|---|---|
| Prime (≥760) | ×1.00 | my judgement | — |
| Good (725–759) | ×0.95 | my judgement | — |
| Fair (680–724) | ×0.85 | my judgement | — |
| Weak (<680) | ×0.70 | my judgement | — |
| **Unknown** | ×0.90 | my judgement | A haircut for uncertainty, **never a rejection** (§3.3) |

---

## 7. Borrower-safe FOIR (for O2B, O4 — "what the borrower should carry")

`my judgement` throughout — this is the product's opinion, tuned conservative. All live in `rules.affordability`.

| What | Value | Classification | Why | Source |
|---|---|---|---|---|
| Safe FOIR — salaried | 40% | my judgement | Brief's own worked example uses 40%; leaves real buffer | brief example |
| Safe FOIR — self-employed | 35% | my judgement | Income volatility + no salary floor | — |
| Safe FOIR — informal | 30% | my judgement | Highest volatility, zero cushion, dependants common | — |
| Adjust: emergency savings < 1 month | −5 pp | my judgement | No shock absorber | — |
| Adjust: emergency savings ≥ 6 months | +3 pp (capped) | my judgement | Genuine resilience, but don't over-reward | — |
| Adjust: any bounced payment in last 3 months | −5 pp | my judgement | Demonstrated repayment stress | — |
| Safe FOIR floor after adjustments | 25% | my judgement | Prevent stacking adjustments to an unusable number | — |

---

## 8. Residual-income test (the second affordability ceiling; app uses the lower of §7 and §8)

| What | Value | Classification | Why | Source |
|---|---|---|---|---|
| Safe new EMI ≤ share of disposable | 60% of `(stableIncome − essentialExpenses − existingEMIs − amortisedUpcomingExpense)` | my judgement | Borrower keeps ≥40% of post-essentials income free | brief |
| `householdExpenses` unknown | treat as **unknown**, not 0; use fallback = 50% of net income **only as a calculation fallback, never shown as the borrower's actual expenses** + drop confidence one level. UI must explicitly disclose: "We assumed a household-cost figure — your result may change if you enter your real expenses." | my judgement | "Unknown is never zero" (§3.3); fallback must not flatter the borrower and must be visible | brief, user instruction 2026-09-08 |
| Minimum absolute buffer | household must retain > 10% of net income beyond essentials + all EMIs, else → DON'T BORROW | my judgement | Hard floor against over-lending | — |
| Collateral vs borrower-side affordability | Collateral may raise **O2A (lender sanction)** and trigger secured routing only. It must **never** relax the §7 FOIR ceiling or the §8 residual ceiling. O2B (safe amount) and O4 (EMI ceiling) stay bound by income/residual affordability regardless of collateral. | my judgement | A pledged shop does not make monthly repayment affordable (Ravi) | user instruction 2026-09-08 |

---

## 9. Income treatment & rate premiums

### 9a. Income haircuts (all `my judgement`)

| What | Value | Why |
|---|---|---|
| Salaried variable pay | count fixed + **50%** of variable (safe) / **60%** (lender) | Variable pay not guaranteed |
| Self-employed lender income | ITR given: `min(documentedIncome, 0.65 × cashMidpoint)`; **no ITR: `0.50 × cashMidpoint`** (lender can only use the conservative figure) | Don't treat claimed cash = verified income (§30) |
| Self-employed safe income | `min(documentedIncome, 0.50 × cashMidpoint)`; no ITR: `0.50 × cashMidpoint` | Borrower-side extra caution |
| `cashMidpoint` | `(incomeRangeLow + incomeRangeHigh) / 2` if a range was given, else `reportedIncome` | — |
| Informal income point estimate | range given: `low + 0.25 × (high − low)`; no range: `0.50 × reportedIncome` | Plan near the bad month, not the average |
| Co-applicant income | +80% if formal & same type, +60% if informal. **Only counted when the borrower explicitly names a co-applicant** (the co-applicant question) — never inferred from "has a spouse". A disclosure line states this. | Partial reliance |
| Productive-return credit | +50% of projected extra monthly income, **O1 only**, **disabled if any recent bounce / distress trigger** | Projected income is not guaranteed (Anita) |

### 9b. Credit-score tiers (CIBIL 300–900)

| Tier | Score | Rate premium | Classification | Why |
|---|---|---|---|---|
| Prime | ≥ 760 | +0.0% | market reference (750+ = "good") + my judgement (cutoffs) | cleartax.in, gocredit.money |
| Good | 725–759 | +0.5% | my judgement | — |
| Fair | 680–724 | +1.5% | my judgement | — |
| Weak | < 680 | +3.0% | my judgement | — |
| **Unknown** | not known | **+0.75% to band low, +2.0% to band high**, confidence −1 level | my judgement | "Unknown ≠ 300" (§3.3): a widening, not a rejection |

### 9c. Additive rate premiums (`my judgement`, added to the §2 base band)

| Factor | Premium |
|---|---|
| Income type: self-employed / informal | +0.5% / +1.5% |
| Income stability: variable / uncertain | +0.5% / +1.5% |
| FOIR before new loan > 40% | +0.5% |
| Card utilisation > 80% | +0.5% |
| Bounced payment in last 3 months | +2.0% |
| Unsecured ticket < ₹1,00,000 | +0.5% |
| Routed to a secured product | use secured base band; small-unsecured-ticket premium not applied |
| Secured + collateral covers the ask (collateral × LTV ≥ amount) | −0.5% to band low, −1.0% to band high — my judgement. Improves the band but stays smaller than the unknown-credit widen, so no-credit-history uncertainty is not erased. |

---

## 10. Stress test (O4 — at least one scenario required)

| What | Value | Classification | Why | Source |
|---|---|---|---|---|
| Income-drop scenario | −15% to stable income | my judgement | Brief suggests it; ~one bad quarter for variable earners | brief |
| Rate-rise scenario | +200 bps to rate | my judgement (rate cycles have moved ~250 bps) | Applied to floating products (home, LAP, floating business) | brief |
| Scenario selection | fixed-rate products → income drop; floating → rate rise; informal income → income drop always | my judgement | Match the risk the borrower actually carries | brief |
| Stress "fail" | post-stress total FOIR > 60% **or** post-stress residual < 0 | my judgement | Above any safe ceiling / negative cash flow | — |
| Safe amount (O2B) sizing | must pass its own stress test — size to `min(safeEMI, stressedSafeEMI)` | my judgement | O2B should already survive the shock | brief |

---

## 11. O1 decision thresholds (`my judgement`; ordered — first hard stop wins)

| Trigger → DON'T BORROW | Condition |
|---|---|
| Already over-leveraged | `existingEMIs / safe stable income` ≥ the mid lender ceiling for the income type (salaried 50%, self-employed 45%, informal 40%) |
| No room after essentials | `stableIncome − essentialExpenses − existingEMIs` ≤ 10% of net income |
| Distress + fresh debt | bounce in ≤3 months **and** informal/uncertain income **and** post-loan FOIR > 35% (FOIR computed on the *requested* amount, at the fair-band high rate and comfortable tenure) |
| Expensive debt first | an existing loan at APR ≥ 24% with outstanding ≥ 3× monthly income **and** purpose is consumption |
| Advisory (not a hard stop) | any existing loan at APR ≥ 24% always adds a "clear this first" reason to a DON'T / BORROW LESS verdict |
| Fails stress badly | post-stress total FOIR > 60% **or** post-stress residual < 0 |
| Weak consumption case | purpose is pure consumption **and** affordability is weak (safe EMI ceiling < 20% of stable income, or spare income < 20% of income) **and** safe amount (O2B high) < 40% of amount wanted. A healthy borrower who merely over-asks gets BORROW LESS, not this. |
| **→ BORROW LESS** | no hard stop, but O2B high-end < 90% of amount wanted |
| **→ BORROW** | no hard stop and O2B high-end ≥ 90% of amount wanted |

Every verdict carries 2–4 reason strings built from the binding numbers.

---

## 12. Confidence model (`my judgement`)

| What | Value | Why |
|---|---|---|
| Start level | Low | Minimum must-set only ⇒ wide ranges (§3.4) |
| +1 toward High for each known | creditScore known · householdExpenses known · incomeStability known · (self-employed) documentedIncome known | Each removes a major unknown |
| Level mapping | 3+ points & no recent bounce → High · 1–2 → Medium · 0 → Low | — |
| Hard cap | unknown credit score ⇒ max Medium (income is always known — it is a must-question) | Core input missing |
| Amount range width | High ±8% · Medium ±15% · Low ±22% | Wider band with less info |
| Rate band widening (high side) | High +0 · Medium +1.0 pp · Low +2.0 pp | Never narrower than §2 base band |
| Direction rule | missing info may only **widen** a range, never narrow it | brief |

---

## 13. Tenure & age caps

| What | Value | Classification | Source |
|---|---|---|---|
Implemented tenures (`PRODUCTS[...].tenuresMonths`) and the "comfortable" tenure used to size the safe amount:

| Product | Tenures (months) | Comfortable (safe-amount sizing) | Classification | Source |
|---|---|---|---|---|
| Personal loan | 12 / 24 / 36 / 48 / 60 / 72 | 48 | market reference | paisabazaar.com |
| Home loan | 60 / 120 / 180 / 240 | 180 | market reference | general |
| LAP | 60 / 84 / 120 / 180 | 120 | market reference | general |
| Gold loan | 6 / 12 / 24 / 36 | 24 | market reference | cleartax.in |
| Two-wheeler | 12 / 24 / 36 / 48 | 36 | market reference | bankbazaar.com |
| Business (against property) | 12 / 24 / 36 / 48 / 60 / 84 / 120 | 84 | my judgement | — |
| Business (unsecured) | 12 / 24 / 36 / 48 / 60 | 36 | market reference | paisabazaar.com |
| Age cap on tenure | tenure ≤ (retirementAge − age) × 12; retirementAge = 60 salaried, 65 self-employed / informal. If nothing fits, the shortest tenure is kept. | market reference | general underwriting practice |
| Max tenure (O2A sizing) | the longest tenure that fits the age cap | — | — |

---

## 14. Rounding & display (`my judgement`)

| What | Value | Why |
|---|---|---|
| Loan amounts (O2) | point estimate widened by ±(confidence width): safe amount ±8/15/22%, lender sanction ±max(that, 10%); low rounded down / high rounded up to ₹50,000; shown in lakh | Honest imprecision (§3.5); lender estimate is never tighter than ±10% |
| EMI ceiling (O4) | round **down** to ₹500 | Ceiling should never be rounded up |
| "Effectively nil" | when a safe EMI < ₹1,000 or a safe amount range tops out < ₹1,000, the UI shows "Effectively nil" + an explanation, not "₹0" | my judgement — "₹0" reads like a bug; "effectively nil" is the honest message |
| Interest rates (O3) | round to 0.25%, always a band | No false precision (§3.5) |
| APR | round to 0.1%, shown as a band | — |

---

## 15. What the app cannot know (stated in-app where relevant)

| Limitation | Consequence in the app |
|---|---|
| Any specific lender's underwriting model / live rate sheet | O2A is labelled an estimate; O3 is "market reference, not an offer" |
| How a lender weighs collateral in practice | Collateral improves O2A / routing per §4 LTV, but O2B and O4 remain income-bound (see §8) |
| The borrower's actual credit bureau report | Score is self-reported or unknown; unknown widens bands |
| Whether informal / cash income will continue | Informal income haircut + mandatory income-drop stress |
| Whether productive income will actually arrive | Counted at 50%, O1 only, off under distress |
| DSA / co-lending markups, insurance cross-sell, GST changes | APR uses a fee assumption; borrower urged to demand the KFS |
| Regional / co-operative lender variations | Bands are national representative figures |

---

## Sources

- RBI — Key Facts Statement for Loans & Advances: RBI/2024-25/18 DOR.STR.REC.13/13.03.00/2024-25, 15 Apr 2024 — https://rbidocs.rbi.org.in/rdocs/notification/PDFs/CIRCULARKFS1504242AE2500BAF494C2A82442B0B642705C1.PDF
- RBI — Fair Lending Practice / Penal Charges: RBI/2023-24/53, 18 Aug 2023 (effective 01 Apr 2024)
- RBI — (Pre-payment Charges on Loans) Directions, 2025, 02 Jul 2025 (effective 01 Jan 2026)
- RBI — gold-loan LTV directions 2025/26 (tiered 85/80/75, effective 01 Apr 2026)
- Home loan rates: https://scripbox.com/pf/lowest-home-loan-interest-rate/ · https://cleartax.in/s/lowest-home-loan-interest-rate · https://homeloans.hdfc.bank.in/checklist/home-loan-interest-rates · https://www.paisabazaar.com/home-loan/interest-rates/
- LAP rates: https://cleartax.in/s/loan-against-property-interest-rates · https://www.hdfc.bank.in/loan-against-property/interest-rates-and-charges · https://www.smfgindiacredit.com/loan-against-property-interest-rates.aspx
- Personal loan rates: https://www.paisabazaar.com/personal-loan/sbi-personal-loan-interest-rates/ · https://www.hdfc.bank.in/personal-loan/interest-rates-and-charges
- Gold loan rates / LTV: https://cleartax.in/s/gold-loan-interest-rates · https://www.bankbazaar.com/personal-loan/gold-loan-interest-rates.html · https://www.ujjivansfb.bank.in/banking-blogs/gold-loan/gold-loan-ltv-ratio-explained · https://www.iifl.com/blogs/gold-loan/goldloan-comparison-2026
- Two-wheeler / EV rates: https://www.bankbazaar.com/two-wheeler-loan-interest-rates.html · https://www.axis.bank.in/loans/two-wheeler-loans/interest-rates · https://www.hdbfs.com/products/two-wheeler-loan/blogs/electric-two-wheeler-loan-interest-rates-2026
- Business / MSME loan rates: https://www.paisabazaar.com/business-loan/interest-rates/ · https://flexiloans.com/blog/business-loan-interest-rates-in-india · https://flexiloans.com/blog/msme-loan-interest-rates
- Processing fees: https://www.nobroker.in/home-loan/home-loan-processing-fees/ · https://www.creditmantri.com/home-loan-processing-fees-and-charges/ · https://creditcares.in/loan-against-property-interest-rates-2026/
- FOIR practice: https://www.idfcfirst.bank.in/finfirst-blogs/personal-loan/what-is-foir · https://precisa.in/blog/foir-fixed-obligation-to-income-ratio/ · https://www.gktoday.in/fixed-obligations-to-income-ratio-foir/

*Aggregator sources (BankBazaar, Paisabazaar, ClearTax, CreditMantri, etc.) are secondary. Before production use, each rate/fee band should be re-verified against the primary lender's own rate card and RBI primary circulars.*
