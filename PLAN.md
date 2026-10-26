# Prorata: build plan for NextSpark Hacks

Deadline: Oct 27, 2026, 4:00 AM WAT. Target: submitted by 11 PM Oct 26, so the last five hours are buffer.
Prize reality: $100 cash for 1st place only, 252 participants. Everything else is credits and certificates. Keep the effort small and the result honest.

Status of each fact: the rules, criteria and deadline come from the NextSpark page text you pasted. The Prorata idea comes from your bot's earlier summary, so items marked CONFIRM need your yes or a change.

---

## 1. What the judges score (from the page)

| Criterion | What Prorata must show |
|---|---|
| Creativity and Originality | A fresh, thoughtful approach to a real everyday problem: sharing one prepaid electricity meter fairly. |
| Impact | Clear who benefits: flatmates, tenants in a shared compound, families, student hostels. Say how, in plain words. |
| Technical Execution | The prototype works exactly as shown in the video. Split math is correct, tested, and always adds up to the amount paid. |
| Design and User Experience | Easy to understand in seconds, accessible, light and dark following the device. |

Submission checklist from the rules (all required):
1. Project description: problem, who it helps, what it does, how you built it, challenges, what you learned.
2. Public GitHub repo with setup instructions.
3. Demo video, 1 to 3 minutes, watchable without requesting access.
4. At least one screenshot.
5. Tools and credits, including any AI assistance. Be specific and honest.
6. Clearly mark anything planned or incomplete.
7. Optional: live demo link (Vercel).

Eligibility to check on the "View full rules" page before you submit: students only (you are an architecture student), ages 13+, any proof-of-enrolment rule for winners, and whether the project must be created during the submission period (start it today, commit often, so the history shows it).

---

## 2. The idea (CONFIRM)

**Problem.** In a shared flat, compound or hostel, one prepaid meter is topped up by one person. Everyone else owes them money, but nobody agrees on what is fair. People were away for two weeks, one person runs an AC, and the top-up is not a round number. It becomes an argument or a loss for whoever pays.

**Prorata.** You enter what was paid and who is in the house. Prorata splits the cost fairly, shows the method in one plain sentence, makes sure the shares add up exactly to what was paid, tells each person what they owe the payer, and gives a message to copy into the group chat.

**The kernel (the one unique thing).** A split that is fair, explained, and always exact. No share is off by a kobo, and anyone can check the working.

**Who it helps.** Flatmates, tenants sharing a meter, student hostels, families with a sub-let.

**Not AI-dependent.** The core is plain, tested arithmetic, so it works with no API key and no setup. (If you want an AI touch later, it is optional and not needed to win.)

---

## 3. Scope: the smallest thing that is complete

### Must have (the demo flow)
1. **Top-up inputs:** amount paid, currency (default NGN, selectable), optional units (kWh) received, who paid.
2. **People list:** add and remove people. Each has a name, days present in the period, and an optional weight (for example 1.0 normal, 1.5 heavy user such as AC).
3. **Method switch (three options):**
   - Equal split.
   - By days present (pro rata).
   - By days present x weight.
4. **Result:** each person's share in money (and kWh if units were entered), with a one-sentence explanation of the method. A "who owes the payer" line for everyone else.
5. **Exactness:** shares always add up exactly to the amount paid (largest-remainder rounding to the smallest currency unit).
6. **Copy message:** a short, friendly message for the group chat with the numbers filled in.
7. **Built-in sample:** four flatmates, a 20,000 top-up, one person away half the period, so the demo works instantly.
8. **System theme by default,** with Auto / Light / Dark control and a saved choice.

### Later (say so in the README, do not build)
Sub-meter readings, real tariff bands from the electricity regulator, saving history across months, accounts, sharing by link, payments.

### Explicitly not claimed
Prorata does not look up real tariffs, does not connect to any meter or payment service, and is not financial advice.

---

## 4. The math (pure functions, tested)

`splitCost({ total, people, method })` returns `{ shares[], explanation }`.

- Work in the smallest currency unit (integers), never floats.
- Weights: equal gives each person 1. By days gives each person days. By days x weight gives days x weight.
- Raw share = total x personWeight / sumOfWeights.
- Round down each share, then give the leftover units, one at a time, to the people with the largest remainders (ties go to the earlier person in the list). The sum then equals the total exactly.
- People with 0 weight pay 0. If everyone's weight is 0, return a clear error state, not NaN.
- Clamp bad input: negative or blank numbers become 0. Days cannot exceed the period length.
- `settleUp(payerId, shares)` returns who owes the payer how much. The payer's own share is netted out.
- `buildMessage(...)` fills a fixed template with the exact numbers. No AI, no guessing.

Tests (about 10, all must pass and be pasted into the README as real output):
1. Equal split of 20,000 among 4 gives 5,000 each.
2. Split that does not divide evenly (10,000 among 3) gives 3,334 + 3,333 + 3,333 = 10,000.
3. By days: one person away half the period pays proportionally less.
4. Days x weight changes the split in the expected direction.
5. Shares always sum exactly to the total (loop over many random cases).
6. Zero total, zero weights and negative inputs behave safely.
7. A person with 0 days pays 0.
8. `settleUp` nets out the payer correctly.
9. The message contains the exact numbers.
10. The sample produces the numbers shown in the video.

---

## 5. Build slices

| Slice | What | Time |
|---|---|---|
| 1 | Next.js + TypeScript + Tailwind scaffold, `src/lib/prorata.ts` pure math, 10 tests, sample data | 1 h |
| 2 | The single-page UI with the sample prefilled, live-updating results, method switch, add/remove people | 1.5 h |
| 3 | System theme + Auto/Light/Dark, copy message, input guards, empty and error states, saved inputs | 45 min |
| 4 | README (problem, who it helps, how to run, real test output, tools and AI credits, what is incomplete), LICENSE, repo publish | 45 min |
| 5 | Demo video (1 to 3 min), 3 to 5 screenshots | 1 h |
| 6 | Devpost form, final repo check, submit | 45 min |
