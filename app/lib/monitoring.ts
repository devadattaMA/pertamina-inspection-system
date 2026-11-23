import { ASSETS, getAsset } from "./assets";
import { APP_TODAY, addDays, formatDate } from "./dates";
import { rng, round } from "./random";
import type { MonitoringRecord } from "./types";

/** Standard units (data dictionary): coupon weight in g, injection in L and L/day. */
export const WEIGHT_UNITS = { g: 1, mg: 0.001 } as const; // factor to grams
export const RATE_UNITS = { "L/day": 1, "L/h": 24, "gal/day": 3.78541 } as const; // factor to L/day
export type WeightUnit = keyof typeof WEIGHT_UNITS;
export type RateUnit = keyof typeof RATE_UNITS;

export type FormValues = {
  assetId: string;
  date: string;
  couponId: string;
  weightUnit: WeightUnit;
  initial: string;
  retrieved: string;
  exposureDays: string;
  inhibitor: string;
  injectedL: string;
  rateValue: string;
  rateUnit: RateUnit;
  notes: string;
};

export const emptyForm = (assetId = ""): FormValues => ({
  assetId, date: APP_TODAY, couponId: "", weightUnit: "g", initial: "", retrieved: "", exposureDays: "",
  inhibitor: "", injectedL: "", rateValue: "", rateUnit: "L/day", notes: "",
});

/** Accepts "12,5" as well as "12.5". Returns NaN for empty or invalid text. */
export function parseNumber(text: string): number {
  const t = text.trim().replace(",", ".");
  return t === "" || !/^-?\d*\.?\d+$/.test(t) ? NaN : Number(t);
}

export const weightLossMg = (r: MonitoringRecord) => (r.couponInitialG - r.couponFinalG) * 1000;
export const lossRateMgPerDay = (r: MonitoringRecord) => weightLossMg(r) / r.exposureDays;

export type FormErrors = Partial<Record<keyof FormValues, string>>;

export function validate(v: FormValues, existing: MonitoringRecord[]): FormErrors {
  const e: FormErrors = {};
  if (!v.assetId) e.assetId = "Select an asset from the register.";
  else if (!getAsset(v.assetId)) e.assetId = "Asset ID is not in the asset register.";

  if (!v.date) e.date = "Date is required.";
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date) || addDays(v.date, 0) !== v.date) e.date = "Enter a valid date.";
  else if (v.date > APP_TODAY) e.date = `Date cannot be after today (${formatDate(APP_TODAY)}).`;

  const coupon = v.couponId.trim();
  if (!coupon) e.couponId = "Coupon ID is required.";
  else if (coupon.length > 30) e.couponId = "Coupon ID is too long (max 30 characters).";

  const f = WEIGHT_UNITS[v.weightUnit];
  const initial = parseNumber(v.initial) * f;
  const retrieved = parseNumber(v.retrieved) * f;
  if (Number.isNaN(initial)) e.initial = "Enter the initial weight as a number.";
  else if (initial <= 0) e.initial = "Initial weight must be greater than 0.";
  if (Number.isNaN(retrieved)) e.retrieved = "Enter the retrieved weight as a number.";
  else if (retrieved < 0) e.retrieved = "Retrieved weight cannot be negative.";
  else if (!Number.isNaN(initial) && retrieved > initial) e.retrieved = "Retrieved weight cannot exceed the initial weight. Check the value and unit.";

  const days = parseNumber(v.exposureDays);
  if (Number.isNaN(days) || !Number.isInteger(days)) e.exposureDays = "Enter whole days.";
  else if (days < 1 || days > 365) e.exposureDays = "Exposure must be between 1 and 365 days.";

  const injected = parseNumber(v.injectedL);
  if (Number.isNaN(injected)) e.injectedL = "Enter the injected volume in litres.";
  else if (injected < 0) e.injectedL = "Injected volume cannot be negative.";

  const rate = parseNumber(v.rateValue);
  if (Number.isNaN(rate)) e.rateValue = "Enter the measured injection rate as a number, e.g. 2.5.";
  else if (rate < 0) e.rateValue = "Injection rate cannot be negative.";

  if (!e.assetId && !e.date && !e.couponId && existing.some(r => r.assetId === v.assetId && r.date === v.date && r.couponId.toLowerCase() === coupon.toLowerCase())) {
    e.couponId = "A record for this asset, date and coupon already exists.";
  }
  return e;
}

/** Convert validated form values to a stored record in standard units. */
export function buildRecord(v: FormValues): MonitoringRecord {
  const f = WEIGHT_UNITS[v.weightUnit];
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    assetId: v.assetId,
    date: v.date,
    couponId: v.couponId.trim(),
    couponInitialG: round(parseNumber(v.initial) * f, 4),
    couponFinalG: round(parseNumber(v.retrieved) * f, 4),
    exposureDays: parseNumber(v.exposureDays),
    inhibitor: v.inhibitor.trim(),
    injectedL: round(parseNumber(v.injectedL), 2),
    injectionRateLpd: round(parseNumber(v.rateValue) * RATE_UNITS[v.rateUnit], 2),
    notes: v.notes.trim(),
    source: "Form",
  };
}

/* ------------- sample history, standing in for the existing Excel log ------------- */

const SAMPLE_BASE: Record<string, { loss: number; rate: number; atRisk?: boolean }> = {
  "PHM-PL-001": { loss: 0.45, rate: 60 },
  "PHM-PL-008": { loss: 1.1, rate: 85, atRisk: true },
  "PHM-PL-012": { loss: 0.3, rate: 35 },
  "PHM-SF-014": { loss: 0.6, rate: 120 },
  "PHM-SF-021": { loss: 0.5, rate: 28 },
  "PHM-SF-027": { loss: 0.4, rate: 22 },
  "PHM-SF-033": { loss: 1.3, rate: 45, atRisk: true },
  "PHM-TK-003": { loss: 0.7, rate: 15 },
};

export function sampleMonitoring(): MonitoringRecord[] {
  const out: MonitoringRecord[] = [];
  ASSETS.forEach((asset, ai) => {
    const base = SAMPLE_BASE[asset.id];
    if (!base) return;
    for (let mi = 0; mi < 6; mi++) {
      const month = String(6 + mi).padStart(2, "0");
      const date = `2026-${month}-${String(2 + ai).padStart(2, "0")}`;
      const r = rng(`${asset.id}|${date}`);
      const exposureDays = 30;
      const lossMg = base.loss * (1 + 0.04 * mi) * (0.9 + 0.2 * r()) * exposureDays;
      const initial = round(20 + r() * 10, 4);
      const rate = round(base.rate * (base.atRisk ? 1 - 0.06 * mi : 1) * (0.95 + 0.1 * r()), 2);
      out.push({
        id: `sample-${asset.id}-${month}`, assetId: asset.id, date,
        couponId: `CC-${asset.id.slice(-6)}-${month}`,
        couponInitialG: initial, couponFinalG: round(initial - lossMg / 1000, 4), exposureDays,
        inhibitor: asset.department === "Pipeline" ? "Inhibitor A" : "Inhibitor B",
        injectedL: round(rate * (0.97 + 0.06 * r()), 2), injectionRateLpd: rate,
        notes: "", source: "Excel (sample)",
      });
    }
  });
  return out;
}
