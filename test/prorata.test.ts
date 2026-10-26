import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PersonInput,
  SplitMethod,
  buildMessage,
  settleUp,
  splitCost,
} from "../src/lib/prorata";
import {
  SAMPLE_CURRENCY,
  SAMPLE_PAYER_ID,
  SAMPLE_PERIOD_DAYS,
  SAMPLE_TOTAL,
  SAMPLE_UNITS_KWH,
  getSamplePeople,
} from "../src/lib/sample";

describe("Prorata prepaid meter split math, settlement, and message builder", () => {
  it("1. Equal split of 20,000 among 4 gives 5,000 each", () => {
    const res = splitCost({
      total: 20000,
      people: getSamplePeople(),
      method: "equal",
      periodDays: 30,
    });
    assert.equal(res.error, null);
    assert.deepEqual(
      res.shares.map((s) => s.share),
      [5000, 5000, 5000, 5000]
    );
    assert.equal(res.sumOfShares, 20000);
  });

  it("2. Split that does not divide evenly (10,000 among 3) gives 3,334 + 3,333 + 3,333 = 10,000", () => {
    const threePeople: PersonInput[] = [
      { id: "p1", name: "Ada", days: 30, weight: 1 },
      { id: "p2", name: "Tobi", days: 30, weight: 1 },
      { id: "p3", name: "Chidi", days: 30, weight: 1 },
    ];
    const res = splitCost({
      total: 10000,
      people: threePeople,
      method: "equal",
      periodDays: 30,
    });
    assert.equal(res.error, null);
    assert.deepEqual(
      res.shares.map((s) => s.share),
      [3334, 3333, 3333]
    );
    assert.equal(res.sumOfShares, 10000);
  });

  it("3. By days: one person away half the period pays proportionally less", () => {
    const res = splitCost({
      total: SAMPLE_TOTAL,
      people: getSamplePeople(),
      method: "days",
      periodDays: SAMPLE_PERIOD_DAYS,
    });
    // Days are 30, 15, 30, 30 (sum = 105)
    // Tobi (15 days) pays half of a 30-day flatmate's base share: 71 vs 143
    const ada = res.shares.find((s) => s.id === "ada")!;
    const tobi = res.shares.find((s) => s.id === "tobi")!;
    assert.ok(tobi.share < ada.share);
    assert.deepEqual(
      res.shares.map((s) => s.share),
      [143, 71, 143, 143]
    );
    assert.equal(res.sumOfShares, SAMPLE_TOTAL);
  });

  it("4. Days x weight changes the split in the expected direction", () => {
    const byDays = splitCost({
      total: SAMPLE_TOTAL,
      people: getSamplePeople(),
      method: "days",
      periodDays: SAMPLE_PERIOD_DAYS,
    });
    const byDaysWeight = splitCost({
      total: SAMPLE_TOTAL,
      people: getSamplePeople(),
      method: "days_weight",
      periodDays: SAMPLE_PERIOD_DAYS,
    });

    const chidiDays = byDays.shares.find((s) => s.id === "chidi")!.share;
    const chidiWeighted = byDaysWeight.shares.find(
      (s) => s.id === "chidi"
    )!.share;
    const tobiDays = byDays.shares.find((s) => s.id === "tobi")!.share;
    const tobiWeighted = byDaysWeight.shares.find(
      (s) => s.id === "tobi"
    )!.share;

    // Chidi (1.5x AC weight) increases from 143 to 187; Tobi decreases from 71 to 63
    assert.ok(chidiWeighted > chidiDays);
    assert.ok(tobiWeighted < tobiDays);
    assert.deepEqual(
      byDaysWeight.shares.map((s) => s.share),
      [125, 63, 187, 125]
    );
    assert.equal(byDaysWeight.sumOfShares, SAMPLE_TOTAL);
  });

  it("5. Shares always sum exactly to the total across 250 deterministic pseudo-random cases", () => {
    let seed = 42;
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const methods: SplitMethod[] = ["equal", "days", "days_weight"];

    for (let i = 0; i < 250; i++) {
      const total = Math.floor(nextRand() * 250000) + 1;
      const count = Math.floor(nextRand() * 6) + 2;
      const periodDays = 30;
      const people: PersonInput[] = [];
      for (let p = 0; p < count; p++) {
        people.push({
          id: `p-${p}`,
          name: `P${p}`,
          days: Math.floor(nextRand() * 30) + 1,
          weight: Math.round((0.5 + nextRand() * 2.0) * 10) / 10,
        });
      }
      const method = methods[i % methods.length];
      const res = splitCost({ total, people, method, periodDays });
      const sum = res.shares.reduce((acc, s) => acc + s.share, 0);
      assert.equal(sum, total);
      assert.equal(res.sumOfShares, total);
    }
  });

  it("6. Zero total, zero weights and negative inputs behave safely without NaN", () => {
    const zeroTotal = splitCost({
      total: 0,
      people: getSamplePeople(),
      method: "days",
    });
    assert.equal(zeroTotal.error, null);
    assert.equal(zeroTotal.sumOfShares, 0);
    assert.ok(zeroTotal.shares.every((s) => s.share === 0));

    const allZeroDays = splitCost({
      total: 20000,
      people: [
        { id: "a", name: "Ada", days: 0, weight: 1 },
        { id: "b", name: "Tobi", days: -5, weight: 1 },
      ],
      method: "days",
    });
    assert.ok(allZeroDays.error !== null);
    assert.equal(allZeroDays.sumOfShares, 0);
    assert.ok(
      allZeroDays.shares.every(
        (s) => Number.isFinite(s.share) && s.share === 0
      )
    );

    const negativeTotal = splitCost({
      total: -15000,
      people: [
        { id: "a", name: "Ada", days: 45, weight: -2 },
        { id: "b", name: "Tobi", days: 15, weight: 1 },
      ],
      method: "days_weight",
      periodDays: 30,
    });
    assert.equal(negativeTotal.total, 0);
    assert.equal(negativeTotal.shares[0].days, 30); // clamped to periodDays
    assert.equal(negativeTotal.shares[0].weight, 0); // clamped non-negative
  });

  it("7. A person with 0 days pays 0", () => {
    const res = splitCost({
      total: 20000,
      people: [
        { id: "ada", name: "Ada", days: 30, weight: 1 },
        { id: "tobi", name: "Tobi", days: 0, weight: 1.5 },
        { id: "chidi", name: "Chidi", days: 30, weight: 1 },
      ],
      method: "days_weight",
      periodDays: 30,
    });
    const tobi = res.shares.find((s) => s.id === "tobi")!;
    assert.equal(tobi.share, 0);
    assert.equal(res.sumOfShares, 20000);
  });

  it("8. settleUp nets out the payer correctly", () => {
    const split = splitCost({
      total: SAMPLE_TOTAL,
      people: getSamplePeople(),
      method: "days",
      periodDays: SAMPLE_PERIOD_DAYS,
    });
    const settlement = settleUp(SAMPLE_PAYER_ID, split.shares);
    assert.equal(settlement.payerId, "ada");
    assert.equal(settlement.payerOwnShare, 143);
    assert.equal(settlement.debts.length, 3);
    assert.equal(
      settlement.debts.some((d) => d.fromId === "ada"),
      false
    );
    assert.equal(
      settlement.payerOwnShare + settlement.totalOwedToPayer,
      SAMPLE_TOTAL
    );
  });

  it("9. The message contains the exact numbers", () => {
    const msg = buildMessage({
      total: SAMPLE_TOTAL,
      currency: SAMPLE_CURRENCY,
      units: SAMPLE_UNITS_KWH,
      payerId: SAMPLE_PAYER_ID,
      people: getSamplePeople(),
      method: "days",
      periodDays: SAMPLE_PERIOD_DAYS,
    });
    assert.ok(msg.includes("$500"));
    assert.ok(msg.includes("280 kWh"));
    assert.ok(msg.includes("Ada: $143"));
    assert.ok(msg.includes("Tobi: $71"));
    assert.ok(msg.includes("Chidi: $143"));
    assert.ok(msg.includes("Zainab: $143"));
    assert.ok(msg.includes("Tobi owes Ada $71"));
    assert.ok(msg.includes("Shares add up to $500"));
  });

  it("10. The sample produces the exact numbers shown across all three methods", () => {
    const eq = splitCost({
      total: SAMPLE_TOTAL,
      people: getSamplePeople(),
      method: "equal",
      periodDays: SAMPLE_PERIOD_DAYS,
      units: SAMPLE_UNITS_KWH,
    });
    const dy = splitCost({
      total: SAMPLE_TOTAL,
      people: getSamplePeople(),
      method: "days",
      periodDays: SAMPLE_PERIOD_DAYS,
      units: SAMPLE_UNITS_KWH,
    });
    const dw = splitCost({
      total: SAMPLE_TOTAL,
      people: getSamplePeople(),
      method: "days_weight",
      periodDays: SAMPLE_PERIOD_DAYS,
      units: SAMPLE_UNITS_KWH,
    });

    assert.deepEqual(
      eq.shares.map((s) => s.share),
      [125, 125, 125, 125]
    );
    assert.deepEqual(
      dy.shares.map((s) => s.share),
      [143, 71, 143, 143]
    );
    assert.deepEqual(
      dw.shares.map((s) => s.share),
      [125, 63, 187, 125]
    );
    assert.deepEqual(
      dw.shares.map((s) => s.unitsShare),
      [70, 35, 105, 70]
    );
  });
});
