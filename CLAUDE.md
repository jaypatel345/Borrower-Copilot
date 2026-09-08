# CLAUDE.md — Borrower Copilot

## 1. Project Context

We are building "Borrower Copilot", a take-home challenge for Lokta.

The product is a borrower-side financial self-assessment tool for Indian borrowers.

The borrower answers a small set of adaptive questions and receives:

1. O1 — Borrow / Don't borrow / Borrow less
2. O2 — Maximum amount
   - Likely lender sanction
   - Safe borrower amount
   - Clearly recommend which number to use
3. O3 — Fair interest rate
   - Rate band, never a single point
   - APR / all-in cost including processing fee
4. O4 — EMI / monthly outflow ceiling
   - Recommended monthly ceiling
   - Tenure trade-off
   - At least one stress case

Then generate a one-screen "Negotiation Card" that the borrower can show to a lender.

The goal is NOT to predict what a specific lender will approve.

The goal is to help the borrower understand:
- what they can probably get
- what they can safely afford
- what rate is reasonable
- what EMI they should refuse to exceed
- why those numbers were produced

---

## 2. Core Product Principle

Build for the borrower, not the lender.

The app should make the borrower the best-informed person in the room.

Every important number MUST be explainable.

For every output, the user should be able to answer:

"Why did the app give me this number?"

Use short explanations such as:

"Your safe EMI is ₹22,000 because we cap total debt payments at 40% of stable monthly income and you already pay ₹14,000."

Never show a number without a reason.

---

## 3. Non-Negotiable Product Rules

### 3.1 No Login

No authentication.

No account creation.

No personal data storage.

All calculations happen locally in the browser.

Do not introduce a backend unless explicitly requested.

### 3.2 India First

Currency:
- INR
- ₹
- Indian number formatting

Examples:
₹8,00,000
₹22,000/month
11.0%–12.5%

Use Indian lending terminology where appropriate.

### 3.3 Unknown Is Not Zero

This is critical.

If the borrower says:

"I don't know my credit score"

DO NOT treat it as 300, 0, or a bad score.

Represent it explicitly as:

creditScore = unknown

Unknown information should widen confidence/ranges.

Example:

Known score:
780 → narrower rate band

Unknown score:
unknown → wider rate band + lower confidence

### 3.4 Confidence Must Reflect Missing Information

Fewer answers = wider ranges.

Never make the output more precise because information is missing.

Use confidence levels such as:

- High
- Medium
- Low

And explain what is missing.

Example:

"Medium confidence — your credit score and income stability are unknown."

### 3.5 Ranges Over False Precision

Never present lending estimates as overly precise.

Bad:
"Your fair rate is 11.83%."

Good:
"Fair rate: 11%–12.5%."

Bad:
"Maximum loan = ₹7,84,320."

Good:
"Likely sanction: ₹7.0L–₹8.5L."

The product should communicate uncertainty honestly.

---

# 4. Architecture

Use a simple architecture.

Preferred stack:

- Next.js
- TypeScript
- React
- Tailwind CSS

No unnecessary backend.

Rules must be separated from UI.

Recommended structure:

src/
  app/
  components/
  lib/
    rules/
      affordability.ts
      eligibility.ts
      rate.ts
      emi.ts
      stress.ts
      products.ts
      explanations.ts
    calculations/
    types/
    data/

Do NOT put financial rules directly inside React components.

React components should display results.

Business logic should live in pure TypeScript functions.

---

# 5. Domain Model

Create a central borrower profile.

Example:

type BorrowerProfile = {
  purpose: ...
  loanType: ...
  amountWanted: number
  monthlyIncome: number
  incomeType: "salaried" | "self_employed" | "informal"
  incomeStability?: ...
  existingEMIs: number
  householdExpenses?: number
  age: number
  creditScore?: number
  emergencySavingsMonths?: number
  variableIncomeShare?: number
  existingLoanDetails?: ...
  creditUtilisation?: ...
  bouncedPayments?: ...
  collateralValue?: number
  coApplicantIncome?: number
  upcomingExpenses?: number
  productiveReturn?: number
  lenderOffer?: ...
}

Optional information MUST remain optional.

Do not silently assign zero.

---

# 6. Question Design

The question flow is one of the most important parts of the challenge.

The app must be adaptive.

Do NOT ask every borrower the same 30 questions.

## Must Questions

Keep the mandatory set around 8–10 questions.

The minimum information should cover:

1. What do you need the money for?
2. What type of loan are you considering?
3. How much do you want to borrow?
4. Monthly net income
5. Income type
6. Existing monthly EMIs
7. Household expenses
8. Age
9. Credit score, if known
10. Basic income stability

The exact wording can be improved for UX.

## Additional Questions

Only ask an additional question if its answer changes at least one output.

Examples:

- income stability
- variable income percentage
- loan details
- credit card utilisation
- recent bounced payments
- emergency savings
- collateral value
- co-applicant
- upcoming large expenses
- productive return from borrowing
- existing lender offer
- processing fee

If a question does not change any number, remove it.

---

# 7. Adaptive Question Rules

Use conditional questions.

Examples:

### Salaried borrower

Ask:
- employment stability
- variable income
- existing EMIs
- credit score
- emergency savings

Do not ask:
- shop turnover
- business ITR details
- collateral questions unless relevant

### Self-employed borrower

Ask:
- business history
- documented income / ITR
- income variability
- collateral
- business purpose
- co-applicant
- existing formal debt

### Informal-income borrower

Ask:
- income range
- income variability
- recent repayment history
- bounced payments
- existing app loans
- emergency savings
- household obligations

### Productive borrowing

If the purpose is business/income-generating:

Ask:
- expected additional monthly income
- expected payback period

This can affect the Borrow / Borrow Less decision.

---

# 8. Borrow / Don't Borrow Logic

O1 must allow all three outcomes:

- BORROW
- BORROW LESS
- DON'T BORROW

"Don't borrow" must be reachable.

Do not design the system to always approve borrowing.

Potential triggers for "Don't borrow":

- Existing debt burden is already too high
- Requested EMI would create unsafe debt burden
- Very high-cost existing debt should be cleared first
- Recent repayment distress
- Insufficient income after essential expenses
- Requested loan is primarily for consumption and affordability is weak
- Stress case creates an unsafe situation
- Informal income + high requested obligation + weak repayment history

Every decision must contain a reason.

Example:

"Don't borrow right now — your existing and proposed repayments would consume too much of your stable income, leaving too little room for household expenses."

---

# 9. Maximum Amount — TWO NUMBERS

This is one of the most important requirements.

Always calculate separately:

## A. Likely lender sanction

This is an estimate of what a lender might potentially sanction.

It may consider:

- income
- income type
- existing EMI
- FOIR
- credit score
- tenure
- collateral
- product type

This number should be presented as an ESTIMATE.

Example:

"Likely lender range: ₹7L–₹9L"

## B. Safe borrower amount

This is the amount the borrower should personally be comfortable carrying.

It must be more conservative.

Example:

"Safe amount: ₹5.5L–₹6.5L"

Then explicitly recommend:

"Use the safe amount when negotiating."

The lender number is NOT the recommendation.

---

# 10. FOIR / Affordability

Use a transparent FOIR-style framework.

FOIR:

(existing EMIs + proposed EMI) / monthly income

Do not blindly use one universal threshold.

Use reasonable product/income-type assumptions and document them in RULES.md.

Example conceptual thresholds:

- Strong salaried profile: around 40–50%
- Self-employed: more conservative depending on income stability/documentation
- Informal income: more conservative
- High existing debt: lower safe threshold

These are assumptions, not universal lending rules.

Document every threshold and its rationale.

---

# 11. Household Expenses

Do not calculate affordability only from EMI/income.

The borrower must have enough income remaining for living expenses.

Safe EMI should consider both:

FOIR-style debt burden

AND

income remaining after essential expenses.

Use the more conservative constraint.

---

# 12. Fair Interest Rate

Never output a single rate.

Output a band.

Example:

"Fair rate: 11%–12.5%"

The band should depend on:

- loan product
- credit score
- income type
- income stability
- existing debt
- repayment history
- collateral
- loan amount
- borrower risk

Use realistic Indian product-level ranges.

Products relevant to this challenge:

- Personal loan
- Home loan
- Loan Against Property
- Gold loan
- Two-wheeler loan
- Business loan

Do not pretend these ranges represent a specific lender's current offer.

Clearly label them as market/reference assumptions.

---

# 13. APR / All-In Cost

Interest rate alone is not enough.

Include processing fee in the effective borrowing cost.

The app must help compare:

"Lender says 12%"

against:

"12% + 2% processing fee"

Use an approximate APR/effective-cost calculation where appropriate.

Clearly document the calculation assumptions.

Do not claim legal/regulatory compliance unless the implementation actually supports it.

---

# 14. EMI Calculation

Use standard reducing-balance EMI math.

Formula:

EMI = P × r × (1+r)^n / ((1+r)^n - 1)

Where:

P = principal
r = monthly interest rate
n = number of months

Allow tenure options such as:

12
24
36
48
60
72 months

Only show tenures relevant to the product.

---

# 15. EMI Recommendation

O4 should provide:

- Recommended maximum EMI
- Current existing EMI
- Total EMI after proposed loan
- Remaining income
- Tenure trade-off

Example:

"Agree to no more than ₹22,000/month."

Then show:

36 months → higher EMI, lower total interest

60 months → lower EMI, higher total interest

The borrower should understand the trade-off.

---

# 16. Stress Case

Every result must include at least one stress scenario.

Possible scenarios:

### Income stress

Example:

"Income falls by 15%."

Recalculate affordability.

OR

### Rate stress

Example:

"Interest rate rises by 2 percentage points."

Recalculate EMI / affordability where relevant.

For fixed-rate products, prefer an income stress scenario.

For floating-rate products, show rate stress.

Explain the result clearly.

Example:

"At a 15% income drop, your proposed EMI would consume 49% of income. That is above your safe ceiling."

---

# 17. Borrower-Specific Reasoning

The three required borrowers MUST behave differently.

## Priya

29
Bengaluru
Salaried software engineer
Large MNC
5 years
₹1,10,000 net/month
Existing car EMI ₹14,000
2 years remaining
Credit score 780
Rent ₹28,000
Wants ₹8L personal loan for wedding

Expected behavior:

- Strong credit profile
- Stable salaried income
- Personal loan rate should be relatively competitive
- Existing EMI reduces safe capacity
- Wedding is consumption, so do not assume financial return
- Safe borrowing amount should be below maximum theoretical sanction if affordability requires it

## Ravi

42
Mysuru
Self-employed kirana owner
14 years
Cash income ₹40k–₹80k/month
ITR ₹4.2L/year
Own shop ₹45L unencumbered
No formal loan history
No credit score
Wife earns ₹18k
Wants ₹15L for inventory + delivery vehicle

Expected behavior:

- Do NOT treat cash-income maximum as fully equivalent to documented income
- No credit score = unknown, NOT poor score
- Collateral is important
- Route/rate reasoning should recognize Loan Against Property / secured business lending as potentially more appropriate than unsecured personal borrowing
- Productive purpose can improve borrowing rationale
- Need to distinguish documented income from claimed cash flow
- Co-applicant income may matter if appropriately considered

## Anita

35
Hubballi
Informal income
Delivery rider + tailoring
₹26k–₹30k/month
Two children
Husband unemployed for 8 months
Three app loans
₹35k outstanding
30%+ interest
One EMI bounced last month
Wants ₹1.5L electric scooter

Expected behavior:

- High financial stress
- Existing expensive debt
- Recent bounce
- Informal/variable income
- Household dependency
- New borrowing should likely be rejected or strongly reduced
- Consider "don't borrow" or "borrow less" before approving the scooter
- The system should explain that refinancing/clearing expensive debt may be safer than adding another large EMI
- Do not assume the scooter's promised income increase as guaranteed

The exact final values should come from the implemented rules, not hardcoded borrower-specific outputs.

---

# 18. Negotiation Card

The Negotiation Card is a core product feature.

It should fit on one phone screen.

It should contain:

BORROWER COPILOT

Decision:
BORROW / BORROW LESS / DON'T BORROW

Safe amount:
₹X–₹Y

Likely lender range:
₹X–₹Y

Recommended EMI ceiling:
₹X/month

Fair rate:
X%–Y%

Estimated all-in cost:
X%–Y%

Tenure:
Recommended range

Why:
2–4 concise reasons

Stress:
"At 15% lower income, your safe EMI remains..."

Negotiation line:

"Based on my profile, I'm looking for approximately X%–Y% with an EMI no higher than ₹X."

The card should be easy to screenshot.

Avoid excessive text.

---

# 19. UI / UX

Mobile-first.

The primary experience should feel like a simple guided assessment, not a banking application.

Recommended flow:

Landing
↓
Explain what the user will get
↓
Question 1
↓
Adaptive questions
↓
Progress indicator
↓
Results
↓
O1
↓
O2
↓
O3
↓
O4
↓
Negotiation Card

Keep the question UI extremely simple.

One question per screen is preferred where practical.

Use plain language.

Avoid financial jargon unless immediately explained.

Bad:

"Enter gross monthly disposable income."

Good:

"How much do you take home each month after tax?"

---

# 20. Explainability

Every major output needs:

1. Number
2. Range
3. Confidence
4. One-sentence explanation
5. Key factors

Example:

### Safe EMI
₹22,000/month

Medium confidence

"Your ceiling is based on a 40% debt-to-income limit after accounting for your existing ₹14,000 EMI."

Factors:
- Income: ₹1.1L
- Existing EMI: ₹14k
- Household cost: ₹28k rent
- Credit score: 780

---

# 21. RULES.md

RULES.md is a first-class deliverable.

Every rule, threshold, band and assumption must be documented in a table.

Required columns:

| What | Value | Why | Source |
|------|-------|-----|--------|

Examples:

| What | Value | Why | Source |
|------|-------|-----|--------|
| Salaried safe FOIR | 40% | Conservative borrower-side ceiling | my judgement |
| Personal loan fair rate | X–Y% | Market reference band | source |
| Processing fee assumption | X% | Used for all-in cost calculation | my judgement |
| Unknown credit score | No score penalty | Unknown ≠ bad | my judgement |
| Income stress | -15% | Test affordability resilience | my judgement |

Be explicit about:

- what is sourced
- what is an assumption
- what is a product heuristic
- what is uncertain
- what the app cannot know

Do not hide assumptions inside code.

---

# 22. Sources

When using external financial/product/rate information:

Prefer authoritative sources.

Examples:

- RBI
- official lender documentation
- official regulatory material
- reputable financial institutions
- reliable market sources

Do not blindly copy random websites.

Record source URLs in RULES.md.

Do not represent an assumption as an RBI rule.

---

# 23. Engineering Principles

Keep calculations deterministic and testable.

Prefer pure functions.

Example:

calculateSafeEmi(profile)

calculateLikelySanction(profile)

calculateFairRate(profile)

calculateApr(profile)

calculateStressCase(profile)

calculateBorrowDecision(profile)

calculateNegotiationCard(profile)

Each function should:

- receive explicit inputs
- return structured output
- avoid UI dependencies
- be easy to unit test

---

# 24. No Hardcoded Final Answers

Do not create special cases such as:

if borrower.name === "Priya":
   return ₹6L

The three borrowers are test cases, not production logic.

Rules must produce their outputs.

---

# 25. Tests

Create tests for:

- FOIR calculation
- EMI calculation
- unknown credit score
- high existing EMI
- low income
- high income
- salaried borrower
- self-employed borrower
- informal borrower
- secured vs unsecured routing
- recent bounce
- stress case
- fair-rate bands
- processing fee / APR
- Borrow / Borrow Less / Don't Borrow decisions

At minimum, test the three provided borrower scenarios.

---

# 26. Don't Overbuild

This challenge has a 12–16 hour expected effort.

Do NOT add:

- authentication
- database
- backend
- user accounts
- bureau API
- payment system
- complex ML model
- vector database
- LLM dependency
- unnecessary state-management libraries
- elaborate admin dashboard

A deterministic rules engine is preferred.

AI may assist development, but the final lending logic must be understandable without AI.

---

# 27. AI Usage

Use AI to accelerate implementation, not to outsource judgement.

Before implementing a financial rule, ask:

1. What exactly does this rule mean?
2. Why does it exist?
3. What input changes it?
4. What happens when the input is unknown?
5. Is this a sourced fact or our judgement?
6. Can the borrower understand the explanation?

Never blindly accept generated financial rules.

---

# 28. Code Quality

Prefer:

- small functions
- descriptive names
- TypeScript types
- constants for thresholds
- centralized rule configuration
- comments explaining WHY, not WHAT
- no duplicated calculations

Avoid:

- giant components
- magic numbers
- duplicated financial formulas
- hidden assumptions
- deeply nested conditionals
- unnecessary abstractions

---

# 29. Rule Configuration

Where practical, centralize adjustable assumptions.

Example:

RULES = {
  affordability: {
    salariedSafeFoIr: 0.40,
    selfEmployedSafeFoIr: 0.35,
    informalSafeFoIr: 0.30,
  },

  stress: {
    incomeDrop: 0.15,
    rateIncrease: 0.02,
  },

  products: {
    personalLoan: {...},
    lap: {...},
    businessLoan: {...},
  }
}

This is intentional because the follow-up interview may ask us:

"Change this assumption from 40% to 45%."

We should be able to change one value and see the entire application update.

---

# 30. Handling Contradictory Data

Do not silently choose one value.

Example:

User says:

"Income ₹50,000"

Then later says:

"ITR income ₹35,000/month"

Keep both concepts separate:

reportedIncome
documentedIncome

Explain:

"Your documented income is lower than your stated cash income, so the lender-side estimate is more conservative."

---

# 31. Safety / Honesty

This is a financial guidance product.

Do not claim:

"You will get this loan."

Use:

"Likely lender range"

"Estimated"

"Borrower-side safe range"

"Based on the information you provided"

Do not present estimates as guaranteed approvals.

Do not pretend to know lender-specific underwriting models.

---

# 32. Product Language

Use confident but honest language.

Prefer:

"Your safe ceiling"

"Likely lender range"

"Fair rate range"

"Based on your profile"

"Medium confidence"

"Here's what is driving this number"

Avoid:

"Approved"

"Guaranteed"

"You qualify"

"Best rate"

"Exact eligibility"

---

# 33. Development Workflow

Before writing significant code:

1. Understand the product requirements.
2. Define the borrower data model.
3. Define the rules.
4. Define the calculation outputs.
5. Define the adaptive question tree.
6. Define the result structure.
7. Implement calculation functions.
8. Write tests.
9. Build UI.
10. Run the three borrower scenarios.
11. Validate every output against RULES.md.
12. Polish mobile UX.
13. Write README.
14. Record walkthrough / prepare walkthrough notes.

Do not start by building the UI.

---

# 34. Definition of Done

The project is complete only when:

- [ ] App runs locally in under 5 minutes
- [ ] No login
- [ ] No backend
- [ ] Mobile-first
- [ ] Adaptive questions
- [ ] 8–10 must questions approximately
- [ ] Unknown values handled explicitly
- [ ] Confidence widens with missing information
- [ ] Borrow / Borrow Less / Don't Borrow all reachable
- [ ] Likely lender sanction separated from safe borrower amount
- [ ] Fair rate shown as a band
- [ ] APR/all-in cost includes processing fee assumption
- [ ] EMI ceiling shown
- [ ] Tenure trade-off shown
- [ ] Stress case shown
- [ ] Negotiation Card implemented
- [ ] Priya tested
- [ ] Ravi tested
- [ ] Anita tested
- [ ] RULES.md complete
- [ ] README complete
- [ ] Financial calculations tested
- [ ] No unexplained magic numbers
- [ ] No hardcoded borrower-specific results
- [ ] All assumptions clearly documented

---

# 35. How Claude Should Work With Me

When I ask you to implement something:

1. First inspect the existing project.
2. Do not rewrite working code unnecessarily.
3. Explain the relevant design decision briefly before making major architectural changes.
4. Prefer the smallest implementation that satisfies the requirement.
5. Keep domain rules separate from UI.
6. If a financial assumption is required and is not already documented:
   - identify it clearly
   - suggest a reasonable assumption
   - mark it as "my judgement"
   - add it to RULES.md
7. Never invent a regulatory requirement.
8. Never treat unknown data as zero.
9. Never silently make a financial assumption.
10. After implementation, run the relevant tests.
11. Test the affected borrower scenario(s).
12. Report exactly what changed.

If something in the brief is ambiguous, choose the simplest defensible interpretation and document it rather than overengineering.

---

# 36. Priority Order

When trade-offs happen, prioritize in this order:

1. Correct lending reasoning
2. Honest uncertainty
3. Explainability
4. Adaptive questions
5. Negotiation Card
6. Mobile UX
7. Tests
8. Visual polish

Do NOT sacrifice domain correctness for UI polish.

---

# 37. Final Mindset

This is not a generic loan EMI calculator.

It is a borrower decision and negotiation product.

The central question is:

"Can a borrower walk into a lender tomorrow and make a better decision because of this app?"

Every feature, rule and UI decision should support that outcome.