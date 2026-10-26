# Prorata — Devpost submission copy (NextSpark Hacks)

Deadline: Tue 27 Oct 2026, 04:00 AM WAT. Target submit: tonight.

---

## 1. Project name

Prorata

## 2. Short / tagline (max ~200 chars)

Split a shared prepaid electricity meter fairly — by equal share, days present, or days × appliance weight — and always exactly to the last cent.

## 3. Elevator / "what it does" (one paragraph)

Prorata is a one-screen workbench for the monthly prepaid-meter argument. One flatmate pays $500 into the shared meter, then everyone argues about who owes what. Prorata takes the amount paid, the units received, the people in the house, how many days each person was actually around, and an optional appliance weight (1.0 normal, 1.5 for the air-conditioned room). It returns each person's exact share, who owes the payer, and a ready-to-paste group-chat message — with the shares guaranteed to add up to the exact amount paid.

## 4. Inspiration (problem)

In a shared flat, a student hostel, or a compound of rented rooms, one prepaid electricity meter is topped up by one person. Splitting it fairly is genuinely hard arithmetic dressed up as a social problem:

- People travel home for a week or two, so a flat equal split punishes the person who stayed.
- One person runs an air conditioner or a deep freezer, so a pure day count punishes the others.
- Top-ups are not round: $100 split three ways is $33.333 each. Someone eats the missing cent, or someone loses trust in the maths.
- The argument happens in a group chat at 11 PM with no shared record.

Splitwise-style apps handle shared expenses, but they assume round amounts and equal participation. Nobody in the flat wants to explain largest-remainder rounding at midnight — they just want a number that is obviously fair and obviously adds up.

## 5. What it does (features)

1. **Top-up details:** amount paid, currency selector, USD by default, optional units received in kWh, period length in days, and who paid.
2. **People list:** add, rename, or remove flatmates. Each person has days present in the period and an optional appliance weight.
3. **Three split methods, switchable live:**
   - Equal split.
   - Pro rata by days present.
   - Pro rata by days present × appliance weight.
4. **Exact integer maths:** every share is computed in whole currency units with largest-remainder allocation (BigInt), so the shares always sum to exactly the amount paid. kWh are allocated the same way in 0.1 kWh units.
5. **Who owes the payer:** nets out the payer's own share and lists each debt individually.
6. **Group-chat message:** one-click copy of a plain-text summary ready for WhatsApp, Telegram, or SMS.
7. **Built-in sample:** four flatmates, $500, 280 kWh, 30 days, one person away half the month, one person with an AC — so the app is useful the moment it loads.
8. **Auto / Light / Dark theme** that follows the device by default, plus saved inputs in localStorage so your numbers survive a refresh.

## 6. How I built it

- Next.js 15 (App Router) + React 19 + TypeScript + Tailwind, single page, no backend, no database, no API keys.
- All money and units maths lives in two pure modules — `src/lib/prorata.ts` and `src/lib/sample.ts` — so the UI contains no arithmetic of its own.
- `allocateLargestRemainder` converts the total into integer units, floors each proportional share, then hands out the leftover units one at a time by largest remainder, breaking ties by list order. The sum is therefore always exact, by construction.
- The UI is a dark obsidian-emerald glass workbench with an electric mint accent, with a light theme derived from the same tokens, and full keyboard/screen-reader labelling on every control.
- Ten unit tests cover the maths, the guards, the settlement, the message builder, and the sample numbers. They run with `npm test` (Node's test runner through tsx) and all ten pass.

## 7. Challenges I ran into

- **Exactness.** Naive floats drift: 100 / 3 × 3 = 99.999…. Switching to integer units with a largest-remainder pass removed the problem entirely, but it has to be done twice — once for money and once for kWh in tenths.
- **Fairness without a PhD.** The weight idea is only useful if a flatmate can see *why* their number moved. Each method prints a one-sentence explanation, and each row explains its own denominator ("15 of 30 days", "30d × 1.5x = 45 weighted days").
- **Hostile input.** Empty fields, negative numbers, zero days, everyone at zero weight, and a payer who gets removed mid-edit all had to behave sensibly instead of showing NaN.
- **No browser screenshot tool in my build environment**, so I wrote a Pillow renderer that mirrors the real component to produce the gallery screenshots and the demo video frames.

## 8. What I learned

- A "social" problem is often an arithmetic problem with a social wrapper; fixing the arithmetic precisely is what makes the social part easy.
- Largest-remainder allocation is the smallest piece of code that removes an entire class of arguments.
- Doing the maths in a pure module first made the UI almost trivial to build and test.

## 9. What's next / incomplete (honest scope)

- Not connected to any meter, vending platform, or payment provider. You still transfer the money yourselves.
- No tariff-band lookup — you type the amount and the units you actually received.
- No accounts, no cloud history, no shareable links; saved inputs live in the browser only.
- Planned later: multi-month history, sub-meter readings, and a shareable read-only link per month.

## 10. Built with

TypeScript, Next.js 15, React 19, Tailwind CSS, Node test runner (tsx), Pillow (for the demo video frames).

## 11. Try it out links

- Public repo: https://github.com/unborn7g/Prorata
- Demo video: https://youtu.be/<id>
- Live demo: (Vercel link after deploy)

## 12. Tools / AI credit

Built by me (unborn7g). I chose the problem, the three split methods, the largest-remainder rule, the sample numbers, and the obsidian-emerald visual direction, and I reviewed and tested every function. I used an AI coding agent in Arena.ai Agent Mode to help write the code, the tests, and the README, and Claude for planning and review. The voiceover in the demo is AI-generated speech reading a script I wrote.

## 13. Video script (for reference)

Natural 1.0x narration, 82.9 seconds, no sped-up audio.
