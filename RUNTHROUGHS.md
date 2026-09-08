# Run-throughs — Priya, Ravi, Anita

Every number below is produced by `runAssessment()` (verified against the app on
2026-09-08). Nothing is hand-written or borrower-special-cased.

The brief gives hard facts (income, EMIs, score, collateral, amount). A few
fields the app *asks* but the brief doesn't state are marked **[assumed]** and
listed per borrower — these are test inputs, tagged `// assumed:` in
`src/lib/data/sampleBorrowers.ts`.

Load any of these in the app via **"Try a sample borrower"** on the landing screen.

---

## Priya, 29 · Bengaluru · salaried

### Data

| Field | Value | Source |
|---|---|---|
| Purpose | Wedding | stated |
| Loan type | Personal loan | stated |
| Amount wanted | ₹8,00,000 | stated |
| Net monthly income | ₹1,10,000 | stated |
| Income type | Salaried (5 yrs, large MNC) | stated |
| Existing EMI | ₹14,000 car loan, 2 yrs left | stated |
| Credit score | 780 | stated |
| Rent | ₹28,000 | stated |
| Household expenses (total) | **₹42,000** | **[assumed]** rent ₹28k + ~₹14k living |
| Age | 29 | stated |
| Income stability | Very stable | **[assumed]** from "5 yrs, large MNC" |
| Emergency savings | 3 months | **[assumed]** |
| Existing loan APR | 10% | **[assumed]** typical car loan |
| Card utilisation | 20% | **[assumed]** |

*The variable-pay-share question is **not asked** — her income is very stable and
salaried — so the assessment plans on her full ₹1,10,000 take-home and the result
notes "how much of your pay is variable" as missing (confidence stays High on the
strength of the other answers).*

### Questions asked (17)

purpose → loan type → amount → income → income type → existing EMIs → household
expenses → age → credit score → income stability → existing loans → card
utilisation → recent bounces → emergency savings → upcoming large expense →
existing offer → processing fee.

*Not asked* (adaptive): variable-pay share (income is very stable), ITR income,
income range, collateral, co-applicant, productive return — none apply to a
salaried borrower with steady pay taking a personal loan for a wedding.

### Outputs

**O1 — BORROW** ("Borrow — but only what you need")
- You can safely carry ₹7.5L–₹9.5L, which covers your ₹8,00,000 request.
- Your ceiling comes from keeping all loan payments together under 40% of income, after your existing ₹14,000 EMI.
- This is a discretionary spend — take only what you actually need.

**O2 — How much**
| | Range |
|---|---|
| **Safe for you (use this)** | **₹7.5L – ₹9.5L** |
| A lender might sanction (estimate) | ₹21.5L – ₹27.0L |

*Why:* safe amount sized from a ₹30,000 safe EMI ceiling (40% cap on total loan
payments applied to ₹1,10,000 income, less the ₹14,000 car EMI). Lender estimate
uses a looser 55% ceiling over 72 months — what she *can* get, not what she
*should* take.

**O3 — Fair rate: 10.5% – 12.5%**  ·  All-in APR **11.8% – 13.8%** (≈2% fee + 18% GST)
- Driver: strong credit score → best-tier pricing (no premiums applied).

**O4 — EMI ceiling: ₹30,000/month** (bound by the 40% cap on total loan payments)
| | |
|---|---|
| You already pay | ₹14,000 |
| Total after this loan (at safe amount) | ₹36,593 |
| Income left after that | ₹31,407 |

Tenure trade-off (at the safe amount, ~₹8.5L, priced at the top of the fair band):

| Tenure | EMI | Total interest |
|---|---|---|
| 12 months | ₹75,720 | ₹58,645 |
| 36 months | ₹28,436 | ₹1,73,681 |
| 48 months | ₹22,593 | ₹2,34,464 |
| 72 months | ₹16,840 | ₹3,62,444 |

**Stress — income falls 15%:** total repayments become 39% of income, ₹14,907 left
after essentials. **Holds** — the safe amount already absorbs this.

Confidence: **High** (missing only: how much of her pay is variable — not enough
to lower the level).

### Negotiation Card

```
BORROWER COPILOT
Decision: Borrow — but only what you need

Safe amount:          ₹7.5L–₹9.5L
Likely lender range:  ₹21.5L–₹27.0L
EMI ceiling:          ₹30,000
Fair rate:            10.5%–12.5% (all-in APR 11.8%–13.8%)
Tenure:               3–4 years

Why:
- You can safely carry ₹7.5L–₹9.5L, which covers your ₹8,00,000 request.
- Your ceiling comes from keeping all loan payments together under 40% of income, after your existing ₹14,000 EMI.
- This is a discretionary spend — take only what you actually need.

Stress: If your income dropped 15%, your total repayments would be 39% of income,
leaving ₹14,907 after essentials. Your safe amount already absorbs this.

Say this: "Based on my profile I'm looking for about ₹7.5L–₹9.5L at 10.5%–12.5%,
with an EMI no higher than ₹30,000, over 3–4 years. Please share the Key Facts
Statement with the all-in APR including fees."

Confidence: high (not told: how much of your pay is variable)
```

---

## Ravi, 42 · Mysuru · self-employed

### Data

| Field | Value | Source |
|---|---|---|
| Purpose | Grow the business (stock + delivery vehicle) | stated |
| Loan type asked for | Business loan (unsecured) | stated intent |
| Amount wanted | ₹15,00,000 | stated |
| Cash income | ₹40,000–₹80,000/month | stated |
| ITR income | ₹4,20,000/year → **₹35,000/month** | stated |
| Income type | Self-employed, kirana, 14 yrs | stated |
| Existing formal loans | None | stated |
| Credit score | **Unknown** (no history) | stated |
| Shop premises | ₹45,00,000, unencumbered | stated |
| Spouse income | ₹18,000 teaching | stated |
| Reported income (cash midpoint) | **₹60,000** | **[assumed]** midpoint of ₹40–80k |
| Household expenses | **₹25,000** | **[assumed]** family in Mysuru |
| Income stability | Stable | **[assumed]** 14 yrs trading |
| Variable income share | 40% | **[assumed]** seasonal kirana |
| Emergency savings | 4 months | **[assumed]** |
| Co-applicant | Spouse, ₹18,000, salaried | stated income; co-applicant treatment [assumed] |
| Productive return | **₹15,000/month extra, 24-month payback** | **[assumed]** Ravi's own estimate |

### Questions asked (21)

The 9 must questions, then: income stability → variable income share → **ITR
income** → **income range (low/good month)** → card utilisation → emergency
savings → **collateral value** → **co-applicant income** → upcoming large expense
→ **productive return** → existing offer → processing fee.

*Adaptive difference vs Priya:* ITR, income range, collateral, co-applicant and
productive-return questions all appear because he is self-employed with a
business purpose.

### Outputs

**O1 — BORROW LESS** ("Borrow — but less than you planned")
- You can safely carry ₹3.0L–₹5.0L — less than the ₹15,00,000 you asked for.
- Your limit is the income left after ₹25,000 of essential costs — not the loan-payment cap.
- We gave partial credit for the extra income you expect, but it still doesn't cover the full amount.

**O2 — How much**  ·  *Routed to a secured loan* (business loan against property)
> You own unencumbered collateral worth more than you want to borrow. A business
> loan (against property) is secured, so it is priced far below an unsecured loan.
> *Unsecured, the same purpose sits at roughly 15.0%–19.0% before risk premiums,
> on a smaller amount — the secured route is materially cheaper.*

| | Range |
|---|---|
| **Safe for you (use this)** | **₹3.0L – ₹5.0L** |
| A lender might sanction (estimate) | ₹11.0L – ₹15.5L |

*Why:* the safe amount is sized from a ₹11,640 safe EMI ceiling — the
"money left after essentials" limit on his **documented** ₹35,000 income (+ 80% of
the co-applicant's ₹18,000) after ₹25,000 of essential costs. **Collateral does
not raise this number.** The lender estimate uses the documented income at a 45%
lender FOIR over 120 months, capped by 60% LTV on the ₹45L shop — hence the large
gap. This is the point: *lender capacity ≠ safe capacity.*

**O3 — Fair rate: 10.8% – 15.0%**  ·  All-in APR **11.5% – 15.8%**
- No credit score — band widened, not penalised
- Self-employed income (+0.5pp)
- Well-covered by collateral (−0.5 to −1pp)
- Priced as a secured loan — much cheaper than the unsecured route

**O4 — EMI ceiling: ₹11,500/month** (bound by money left after essentials)
| | |
|---|---|
| You already pay | ₹0 |
| Total after this loan (at safe amount) | ₹7,719 |
| Income left after that | ₹11,681 |

Tenure trade-off (at the safe amount, ~₹4L, priced at the top of the fair band):

| Tenure | EMI | Total interest |
|---|---|---|
| 12 months | ₹36,103 | ₹33,240 |
| 36 months | ₹13,866 | ₹99,181 |
| 84 months | ₹7,719 | ₹2,48,371 |
| 120 months | ₹6,453 | ₹3,74,408 |

**Stress — rate rises 2pp** (floating secured product): EMI climbs to ₹8,174,
repayments take 18% of income, ₹11,226 left. **Holds.**

Confidence: **Medium** — capped because the credit score is unknown.

### Negotiation Card

```
BORROWER COPILOT
Decision: Borrow — but less than you planned

Safe amount:          ₹3.0L–₹5.0L
Likely lender range:  ₹11.0L–₹15.5L
EMI ceiling:          ₹11,500
Fair rate:            10.8%–15.0% (all-in APR 11.5%–15.8%)
Tenure:               4–7 years

Why:
- You can safely carry ₹3.0L–₹5.0L — less than the ₹15,00,000 you asked for.
- Your limit is the income left after ₹25,000 of essential costs — not the loan-payment cap.
- We gave partial credit for the extra income you expect, but it still doesn't cover the full amount.

Stress: If your rate rose 2pp, your EMI would climb to ₹8,174 and total
repayments would take 18% of income, leaving ₹11,226 after essentials. Still
within your safe ceiling.

Say this: "Based on my profile I'm looking for about ₹3.0L–₹5.0L at 10.8%–15.0%,
with an EMI no higher than ₹11,500, over 4–7 years. Please share the Key Facts
Statement with the all-in APR including fees."

Confidence: medium (not told: credit score)
```

Disclosures shown: co-applicant income counted at 80% because he named them;
documented income is below stated cash so the lender estimate uses the documented
figure; assumes he is willing to pledge the property; projected extra income
counted at half and only for the borrow-vs-less decision.

---

## Anita, 35 · Hubballi · informal

### Data

| Field | Value | Source |
|---|---|---|
| Purpose | E-scooter to double delivery runs | stated |
| Loan type | Two-wheeler loan | stated |
| Amount wanted | ₹1,50,000 | stated |
| Income | ₹26,000–₹30,000/month (delivery + tailoring) | stated |
| Income type | Informal | stated |
| Household | Two children; husband unemployed 8 months | stated |
| Existing debt | 3 app loans, ₹35,000 outstanding at 30%+, 1 EMI bounced last month | stated |
| Credit score | Unknown | stated |
| Reported income (midpoint) | **₹28,000** | **[assumed]** midpoint of ₹26–30k |
| Existing EMI total | **₹6,500** | **[assumed]** 3 app loans, ~6-month tenor |
| App-loan split | ₹2,200 / ₹2,200 / ₹2,100 EMI; ₹12k / ₹12k / ₹11k owed; 32% / 34% / 30% | **[assumed]** totals match the brief |
| Household expenses | **₹18,000** | **[assumed]** two kids, one earner |
| Income stability | Variable | **[assumed]** consistent with "informal" |
| Emergency savings | 0 months | **[assumed]** consistent with the brief |
| Co-applicant | None (husband unemployed) | stated |
| Productive return | **₹8,000/month, 18-month payback** | **[assumed]** Anita's hope — **not counted** (see below) |

### Questions asked (19)

The 9 must questions, then: income stability → **income range** → **existing
loans** → **recent bounces** → emergency savings → co-applicant income → upcoming
large expense → productive return → existing offer → processing fee.

*Adaptive difference:* income range, existing-loan detail and recent-bounce
questions appear; ITR, card utilisation and the collateral-pledge question do
**not** (informal income, and a ₹1.5L two-wheeler is already secured by the
vehicle).

### Outputs

**O1 — DON'T BORROW** ("Don't borrow right now")
- After ₹18,000 of essential costs and ₹6,500 of existing loan payments, only
  ₹2,500 of your income is spare — less than the 10% cushion we treat as the safe
  minimum.
- You have debt at 24%+ interest. Clearing or refinancing that will save you more
  each month than this new loan is likely to earn or provide.

**O2 — How much**
| | Range |
|---|---|
| **Safe for you (use this)** | **Effectively nil** |
| A lender might sanction (estimate) | ₹1.0L – ₹2.0L |

*Why:* the safe EMI ceiling works out to ₹250 — the safe FOIR is floored at 25%
(30% for informal, −5pp for zero savings, −5pp for the recent bounce), which
after her existing ₹6,500 EMI leaves almost nothing. A lender might still offer
₹1–2L against the scooter; she should not take it.

**O3 — Fair rate: 15.3% – 20.0%**  ·  All-in APR **17.0% – 21.8%**
- No credit score — band widened, not penalised
- Informal income (+1.5pp)
- Variable income (+0.5pp)
- A payment bounced in the last 3 months (+2pp)
- EV green concession (−0.5pp)

**O4 — EMI ceiling: Effectively nil.** The card explains: *"After your essential
costs and the loan payments you already have, there is no room for a new EMI."*
| | |
|---|---|
| You already pay | ₹6,500 |
| Income left after essentials + that payment | ₹2,500 |

The tenure trade-off table is hidden (there is no affordable EMI to compare).

**Stress — income falls 15%:** *"…leaving you ₹1,550 short of covering
essentials."* **Breaks** — the lender's ₹1–2L would not survive this.

Confidence: **Medium** (credit score unknown).

Disclosure shown: *"You expect this loan to raise your income, but because of
recent repayment stress we do not count that projected income."*

### Negotiation Card

A DON'T-BORROW card drops the tenure row and the rate-ask script:

```
BORROWER COPILOT
Decision: Don't borrow right now

Safe amount:          Effectively nil
Likely lender range:  ₹1.0L–₹2.0L
EMI ceiling:          Effectively nil
Fair rate:            15.3%–20.0% (all-in APR 17.0%–21.8%)

Why:
- After ₹18,000 of essential costs and ₹6,500 of existing loan payments, only
  ₹2,500 of your income is spare — less than the 10% cushion we treat as the safe
  minimum.
- You have debt at 24%+ interest. Clearing or refinancing that will save you more
  each month than this new loan is likely to earn or provide.

Stress: If your income dropped 15%, your total repayments would be 28% of income,
leaving you ₹1,550 short of covering essentials. That breaches your safe ceiling —
the lender amount would not survive this.

Where you stand: "I've been through my finances. I'm not taking a new loan yet —
I'm clearing my higher-interest debt first, then I'll reassess."

Confidence: medium (not told: credit score)
```

---

## Summary

| | O1 | O2 safe | O2 lender | O3 rate | O3 APR | O4 ceiling | Stress | Confidence |
|---|---|---|---|---|---|---|---|---|
| Priya | Borrow | ₹7.5L–₹9.5L | ₹21.5L–₹27.0L | 10.5–12.5% | 11.8–13.8% | ₹30,000 | holds | High |
| Ravi | Borrow less | ₹3.0L–₹5.0L | ₹11.0L–₹15.5L | 10.8–15.0% | 11.5–15.8% | ₹11,500 | holds | Medium |
| Anita | Don't borrow | Effectively nil | ₹1.0L–₹2.0L | 15.3–20.0% | 17.0–21.8% | breaks | nil | Medium |

Three borrowers, three verdicts, three product paths (personal / secured-business
after routing / two-wheeler), and in every case the safe number is materially
below the lender number.
