export type SplitMethod = "equal" | "days" | "days_weight";

export type CurrencyCode = "NGN" | "USD" | "GBP" | "EUR" | "KES" | "GHS";

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  label: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  NGN: { code: "NGN", symbol: "₦", label: "NGN (₦)" },
  USD: { code: "USD", symbol: "$", label: "USD ($)" },
  GBP: { code: "GBP", symbol: "£", label: "GBP (£)" },
  EUR: { code: "EUR", symbol: "€", label: "EUR (€)" },
  KES: { code: "KES", symbol: "KSh ", label: "KES (KSh)" },
  GHS: { code: "GHS", symbol: "GH₵", label: "GHS (GH₵)" },
};

export interface PersonInput {
  id: string;
  name: string;
  days: number;
  weight?: number;
}

export interface PersonShare {
  id: string;
  name: string;
  days: number;
  weight: number;
  effectiveWeight: number;
  share: number;
  unitsShare: number;
  percentage: number;
}

export interface SplitCostInput {
  total: number;
  people: PersonInput[];
  method: SplitMethod;
  periodDays?: number;
  units?: number;
}

export interface SplitCostResult {
  total: number;
  units: number;
  periodDays: number;
  method: SplitMethod;
  shares: PersonShare[];
  sumOfShares: number;
  explanation: string;
  error: string | null;
}

export interface DebtLine {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface SettleUpResult {
  payerId: string;
  payerName: string;
  payerOwnShare: number;
  totalOwedToPayer: number;
  debts: DebtLine[];
}

export interface BuildMessageInput {
  total: number;
  currency?: CurrencyCode;
  units?: number;
  payerId: string;
  people: PersonInput[];
  method: SplitMethod;
  periodDays?: number;
}

const WEIGHT_SCALE = 10000;

export function clampNonNegativeInt(val: unknown, max = 1_000_000_000): number {
  const num = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.min(max, Math.round(num));
}

export function clampNonNegativeFloat(val: unknown, max = 1_000_000): number {
  const num = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.min(max, num);
}

export function formatMoney(
  amount: number,
  currency: CurrencyCode = "NGN"
): string {
  const info = CURRENCIES[currency] ?? CURRENCIES.NGN;
  const safe = clampNonNegativeInt(amount);
  return `${info.symbol}${safe.toLocaleString("en-US")}`;
}

/**
 * Largest-remainder (Hamilton) integer allocation using exact BigInt arithmetic
 * so sum(allocations) === totalInt for any non-negative integer total and weights.
 */
export function allocateLargestRemainder(
  totalInt: number,
  scaledWeights: number[]
): number[] {
  const n = scaledWeights.length;
  if (n === 0) return [];
  const safeTotal = clampNonNegativeInt(totalInt);
  if (safeTotal === 0) return new Array(n).fill(0);

  const bigWeights = scaledWeights.map((w) =>
    BigInt(Math.max(0, Math.round(w)))
  );
  const sumW = bigWeights.reduce((acc, w) => acc + w, 0n);
  if (sumW <= 0n) {
    return new Array(n).fill(0);
  }

  const bigTotal = BigInt(safeTotal);
  const floored: number[] = new Array(n).fill(0);
  const remainders: { index: number; rem: bigint }[] = [];
  let sumFloored = 0;

  for (let i = 0; i < n; i++) {
    const w = bigWeights[i];
    if (w <= 0n) {
      floored[i] = 0;
      remainders.push({ index: i, rem: 0n });
      continue;
    }
    const numer = bigTotal * w;
    const q = Number(numer / sumW);
    const r = numer % sumW;
    floored[i] = q;
    sumFloored += q;
    remainders.push({ index: i, rem: r });
  }

  const leftover = safeTotal - sumFloored;
  if (leftover > 0) {
    remainders.sort((a, b) => {
      if (b.rem !== a.rem) {
        return b.rem > a.rem ? 1 : -1;
      }
      return a.index - b.index;
    });
    for (let k = 0; k < leftover && k < remainders.length; k++) {
      floored[remainders[k].index] += 1;
    }
  }

  return floored;
}

export function splitCost(input: SplitCostInput): SplitCostResult {
  const periodDays = Math.max(
    1,
    clampNonNegativeInt(input.periodDays ?? 30, 366) || 30
  );
  const total = clampNonNegativeInt(input.total);
  const units = clampNonNegativeFloat(input.units ?? 0, 1_000_000);
  const method: SplitMethod = input.method ?? "days";
  const rawPeople = Array.isArray(input.people) ? input.people : [];

  if (rawPeople.length === 0) {
    return {
      total,
      units,
      periodDays,
      method,
      shares: [],
      sumOfShares: 0,
      explanation: "Add at least one person to split the top-up.",
      error: "Add at least one person to split the top-up.",
    };
  }

  const normalized = rawPeople.map((p, idx) => {
    const cleanName = (p.name ?? "").trim() || `Person ${idx + 1}`;
    const days = Math.min(periodDays, clampNonNegativeInt(p.days, periodDays));
    const weight =
      p.weight === undefined ? 1 : clampNonNegativeFloat(p.weight, 100);

    let effectiveWeight = 0;
    if (method === "equal") {
      effectiveWeight = 1;
    } else if (method === "days") {
      effectiveWeight = days;
    } else {
      effectiveWeight = days * weight;
    }

    return {
      id: p.id || `person-${idx + 1}`,
      name: cleanName,
      days,
      weight,
      effectiveWeight,
      scaledWeight: Math.round(effectiveWeight * WEIGHT_SCALE),
    };
  });

  const totalScaledWeight = normalized.reduce(
    (sum, p) => sum + p.scaledWeight,
    0
  );

  if (totalScaledWeight <= 0) {
    return {
      total,
      units,
      periodDays,
      method,
      shares: normalized.map((p) => ({
        id: p.id,
        name: p.name,
        days: p.days,
        weight: p.weight,
        effectiveWeight: 0,
        share: 0,
        unitsShare: 0,
        percentage: 0,
      })),
      sumOfShares: 0,
      explanation:
        "Everyone has 0 weight in this period. Increase at least one person's days or weight.",
      error:
        "Everyone has 0 weight in this period. Increase at least one person's days or weight.",
    };
  }

  const scaledWeights = normalized.map((p) => p.scaledWeight);
  const moneyAlloc = allocateLargestRemainder(total, scaledWeights);

  // Split kWh units in integer tenths (0.1 kWh precision) so units also sum cleanly
  const totalUnitTenths = Math.round(units * 10);
  const unitTenthsAlloc = allocateLargestRemainder(
    totalUnitTenths,
    scaledWeights
  );

  const shares: PersonShare[] = normalized.map((p, i) => {
    const pct =
      totalScaledWeight > 0
        ? Math.round((p.scaledWeight / totalScaledWeight) * 1000) / 10
        : 0;
    return {
      id: p.id,
      name: p.name,
      days: p.days,
      weight: p.weight,
      effectiveWeight: Math.round(p.effectiveWeight * 100) / 100,
      share: moneyAlloc[i],
      unitsShare: unitTenthsAlloc[i] / 10,
      percentage: pct,
    };
  });

  const sumOfShares = shares.reduce((s, item) => s + item.share, 0);

  let explanation = "";
  if (method === "equal") {
    explanation = `Split equally among ${shares.length} ${
      shares.length === 1 ? "person" : "people"
    }, with any leftover unit assigned by largest remainder.`;
  } else if (method === "days") {
    const totalPersonDays = normalized.reduce((s, p) => s + p.days, 0);
    explanation = `Split pro rata by days present (${totalPersonDays} total person-days across ${periodDays} days), rounded to the exact unit by largest remainder.`;
  } else {
    const totalWeightedDays =
      Math.round(
        normalized.reduce((s, p) => s + p.effectiveWeight, 0) * 100
      ) / 100;
    explanation = `Split by days present times appliance weight (${totalWeightedDays} total weighted person-days), rounded to the exact unit by largest remainder.`;
  }

  return {
    total,
    units,
    periodDays,
    method,
    shares,
    sumOfShares,
    explanation,
    error: null,
  };
}

export function settleUp(
  payerId: string,
  shares: PersonShare[]
): SettleUpResult {
  if (!Array.isArray(shares) || shares.length === 0) {
    return {
      payerId,
      payerName: "",
      payerOwnShare: 0,
      totalOwedToPayer: 0,
      debts: [],
    };
  }

  const payer = shares.find((s) => s.id === payerId) ?? shares[0];
  const debts: DebtLine[] = [];
  let totalOwedToPayer = 0;

  for (const s of shares) {
    if (s.id === payer.id) continue;
    const amt = clampNonNegativeInt(s.share);
    totalOwedToPayer += amt;
    debts.push({
      fromId: s.id,
      fromName: s.name,
      toId: payer.id,
      toName: payer.name,
      amount: amt,
    });
  }

  return {
    payerId: payer.id,
    payerName: payer.name,
    payerOwnShare: clampNonNegativeInt(payer.share),
    totalOwedToPayer,
    debts,
  };
}

export function buildMessage(input: BuildMessageInput): string {
  const currency: CurrencyCode = input.currency ?? "NGN";
  const split = splitCost({
    total: input.total,
    people: input.people,
    method: input.method,
    periodDays: input.periodDays,
    units: input.units,
  });

  if (split.error) {
    return `Meter split could not be calculated: ${split.error}`;
  }

  const settlement = settleUp(input.payerId, split.shares);
  const unitsPart =
    split.units > 0 ? ` (${split.units.toLocaleString("en-US")} kWh)` : "";

  const methodLabel =
    split.method === "equal"
      ? "equal split"
      : split.method === "days"
        ? "pro rata by days present"
        : "pro rata by days present x weight";

  const shareParts = split.shares.map((s) => {
    const uStr = split.units > 0 ? ` (${s.unitsShare} kWh)` : "";
    return `${s.name}: ${formatMoney(s.share, currency)}${uStr}`;
  });

  const debtParts = settlement.debts
    .filter((d) => d.amount > 0)
    .map(
      (d) =>
        `${d.fromName} owes ${d.toName} ${formatMoney(d.amount, currency)}`
    );

  const lines = [
    `Prepaid meter top-up: ${formatMoney(split.total, currency)}${unitsPart}, paid by ${settlement.payerName} (${methodLabel}).`,
    `Shares: ${shareParts.join(" · ")}.`,
    debtParts.length > 0
      ? `To settle up: ${debtParts.join("; ")}. (Shares add up to ${formatMoney(split.sumOfShares, currency)}.)`
      : `Everyone is settled up. (Shares add up to ${formatMoney(split.sumOfShares, currency)}.)`,
  ];

  return lines.join("\n");
}
