import { CurrencyCode, PersonInput, SplitMethod } from "./prorata";

export const SAMPLE_TOTAL = 500;
export const SAMPLE_CURRENCY: CurrencyCode = "USD";
export const SAMPLE_UNITS_KWH = 280;
export const SAMPLE_PERIOD_DAYS = 30;
export const SAMPLE_PAYER_ID = "ada";
export const SAMPLE_DEFAULT_METHOD: SplitMethod = "days";

export const SAMPLE_PEOPLE: PersonInput[] = [
  {
    id: "ada",
    name: "Ada",
    days: 30,
    weight: 1.0,
  },
  {
    id: "tobi",
    name: "Tobi",
    days: 15, // Away for half the 30-day period
    weight: 1.0,
  },
  {
    id: "chidi",
    name: "Chidi",
    days: 30,
    weight: 1.5, // Heavy user (runs AC)
  },
  {
    id: "zainab",
    name: "Zainab",
    days: 30,
    weight: 1.0,
  },
];

export function getSamplePeople(): PersonInput[] {
  return SAMPLE_PEOPLE.map((p) => ({ ...p }));
}
