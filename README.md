# Prorata — Split the meter fairly

**Prorata** helps flatmates, tenants in a shared compound, and student hostels split a shared prepaid electricity meter top-up fairly—by **equal share**, **days present**, or **days present times appliance weight**—and guarantees that individual shares always add up to the exact amount paid.

- **Public Repository:** [https://github.com/unborn7g/Prorata](https://github.com/unborn7g/Prorata)
- **License:** [MIT](./LICENSE)

---

## 1. The Problem & Who It Helps

In a shared flat, compound, or student hostel, one prepaid electricity meter is topped up by one person. Everyone else owes that person money, but splitting the cost causes arguments:
- One flatmate traveled home for two weeks (`15` out of `30` days).
- Another flatmate runs an air conditioner or heavy appliance (`1.5x` load).
- The top-up amount (`$500` or `$40`) does not divide evenly, leaving missing cents or an unfair loss for whoever paid.

**Who benefits:**
- **Student flatmates and off-campus hostels** where people travel home during breaks or exams.
- **Tenants sharing one compound meter** who need a transparent, one-screen calculation everyone can check before sending their transfer.
- **Sub-lets and shared family flats** where occupancy days vary from month to month.

Works with any currency: USD by default, plus NGN, GBP, EUR, KES, and GHS.

---

## 2. What Prorata Does

1. **Top-Up Inputs:** Enter the amount paid, currency, optional electricity units received (`kWh`), period length in days, and who paid the meter.
2. **People List:** Add or remove flatmates, set how many days each person was present in the period, and set an optional load weight (e.g., `1.0` normal, `1.5` heavy user / AC).
3. **Three Split Methods (`src/lib/prorata.ts`):**
   - **Equal split:** Each person gets weight `1`.
   - **By days present (pro rata):** Each person's weight is their `days` present.
   - **By days & weight:** Each person's weight is `days * weight`.
4. **Exact Sum Guarantee (Largest-Remainder Method):**
   - All money calculations run in integer units using `BigInt` quotient and remainder math (`allocateLargestRemainder`).
   - Each share is rounded down first, and leftover units are distributed `1` at a time to the largest remainders (ties broken by earlier position in the list).
   - **Result:** The shares always add up to the exact amount paid (`0` rounding gap).
5. **Who Owes the Payer (`settleUp`):** Nets out the payer's own share and lists exactly how much each other flatmate owes the payer.
6. **One-Click Group-Chat Message (`buildMessage`):** Generates a friendly, plain-text summary ready to paste into WhatsApp, Telegram, or SMS.

---

## 3. Built-In Sample Scenario (`src/lib/sample.ts`)

Prorata opens with a pre-loaded 4-flatmate sample over a `30`-day period (`$500` top-up, `280 kWh` received, paid by **Ada**):

| Flatmate | Days Present (`/30`) | Weight | Equal Split | By Days Present | By Days & Weight |
|---|---:|---:|---:|---:|---:|
| **Ada** *(Paid top-up)* | `30 d` | `1.0x` | `$125` (`70 kWh`) | `$143` (`80 kWh`) | `$125` (`70 kWh`) |
| **Tobi** *(Away half the period)* | `15 d` | `1.0x` | `$125` (`70 kWh`) | `$71` (`40 kWh`) | `$63` (`35 kWh`) |
| **Chidi** *(Heavy user — AC)* | `30 d` | `1.5x` | `$125` (`70 kWh`) | `$143` (`80 kWh`) | `$187` (`105 kWh`) |
| **Zainab** *(Normal user)* | `30 d` | `1.0x` | `$125` (`70 kWh`) | `$143` (`80 kWh`) | `$125` (`70 kWh`) |
| **Exact Total** | | | **`$500` (`280 kWh`)** | **`$500` (`280 kWh`)** | **`$500` (`280 kWh`)** |

---

## 4. How to Run Locally

No API keys, accounts, or database setup required.

```bash
git clone https://github.com/unborn7g/Prorata.git
cd Prorata
npm install
npm test
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 5. Real Unit Test Output (`npm test`)

All 10 unit tests in `test/prorata.test.ts` run with Node's native test runner via `tsx --test`:

```text
▶ Prorata prepaid meter split math, settlement, and message builder
  ✔ 1. Equal split of 20,000 among 4 gives 5,000 each
  ✔ 2. Split that does not divide evenly (10,000 among 3) gives 3,334 + 3,333 + 3,333 = 10,000
  ✔ 3. By days: one person away half the period pays proportionally less
  ✔ 4. Days x weight changes the split in the expected direction
  ✔ 5. Shares always sum exactly to the total across 250 deterministic pseudo-random cases
  ✔ 6. Zero total, zero weights and negative inputs behave safely without NaN
  ✔ 7. A person with 0 days pays 0
  ✔ 8. settleUp nets out the payer correctly
  ✔ 9. The message contains the exact numbers
  ✔ 10. The sample produces the exact numbers shown across all three methods
✔ Prorata prepaid meter split math, settlement, and message builder
ℹ tests 10
ℹ suites 1
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

(Test names 1 and 2 use plain unit counts, not a specific currency; the sample tests assert the exact `$500` figures above.)

---

## 6. What Is Planned / Incomplete & Honest Scope

- **Working right now:** Top-up inputs (`amount`, `currency`, `kWh units`, `period days`, `payer`), dynamic flatmate list (`add`, `edit`, `remove`), 3-way split method switch (`Equal`, `By days present`, `By days & weight`), exact largest-remainder integer rounding, payer settlement calculation, one-click group-chat message copy, local browser persistence (`localStorage`), and `Auto / Light / Dark` theme control.
- **Planned for later (not built in this prototype):** Sub-meter hardware readings, live tariff-band lookups, multi-month cloud history, shareable cloud links, and direct payment/bank transfers.
- **Explicitly not claimed:** Prorata does not connect to a physical meter or payment processor and is not financial advice.

---

## 7. Tools & Credits

- **Framework & Language:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Node.js native test runner (`node:test` + `tsx`).
- **Fonts:** Bricolage Grotesque, Instrument Sans, IBM Plex Mono.
- **AI Assistance:** Built with an AI coding agent under my direction (I chose the prepaid meter problem, flatmate sample, largest-remainder rounding rules, and UI direction, and reviewed/tested the output), with Claude used for planning and review.
