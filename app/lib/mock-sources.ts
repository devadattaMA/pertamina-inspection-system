/**
 * Server-side stand-ins for Direct Viewer and SAP. They return deterministic
 * synthetic data shaped like the partner's datasets (risk R-02: sample data
 * until real access is granted). Replace the route handlers that call these
 * with real connectors later; the ingestion code on the client stays the same.
 */
import { APP_TODAY, addDays, daysBetween, eachDay } from "./dates";
import { rng, round } from "./random";
import type { RawInspection, RawProduction } from "./types";


/* ------------------------------ Direct Viewer ------------------------------ */

const PRODUCTION_BASE: Record<string, { p: number; t: number; gas: number; water: number; oil: number }> = {
  "PHM-PL-001": { p: 42.8, t: 58, gas: 14.2, water: 3100, oil: 5200 },
  "PHM-PL-008": { p: 36.2, t: 71, gas: 6.4, water: 4800, oil: 2100 },
  "PHM-PL-012": { p: 51.6, t: 46, gas: 38.5, water: 180, oil: 90 },
  "PHM-SF-014": { p: 18.4, t: 64, gas: 52, water: 9800, oil: 7400 },
  "PHM-SF-021": { p: 12.6, t: 55, gas: 3.1, water: 1300, oil: 950 },
  "PHM-SF-027": { p: 24.3, t: 38, gas: 21, water: 40, oil: 15 },
  "PHM-SF-033": { p: 19.8, t: 52, gas: 12.5, water: 2200, oil: 1700 },
};

export function directViewerPayload(from: string, to: string) {
  const records: RawProduction[] = [];
  for (const date of eachDay(from, to)) {
    const day = daysBetween("2026-01-01", date);
    for (const [tag, b] of Object.entries(PRODUCTION_BASE)) {
      const r = rng(`${tag}|${date}`);
      const wave = Math.sin(day / 9 + tag.length);
      records.push({
        asset_tag: tag,
        reading_date: date,
        pressure_bar: round(b.p * (1 + 0.03 * wave + (r() - 0.5) * 0.03), 1),
        temperature_c: round(b.t * (1 + 0.02 * wave + (r() - 0.5) * 0.02), 1),
        gas_mmscfd: round(b.gas * (1 + 0.04 * wave + (r() - 0.5) * 0.05), 2),
        water_bwpd: Math.round(b.water * (1 + 0.05 * Math.cos(day / 11) + (r() - 0.5) * 0.06)),
        oil_bopd: Math.round(b.oil * (1 - 0.0003 * day + 0.04 * wave + (r() - 0.5) * 0.05)),
      });
    }
    // A tag that has no match in the asset register, to exercise linking.
    if (date === APP_TODAY) {
      records.push({ asset_tag: "PHM-SF-099", reading_date: date, pressure_bar: 9.8, temperature_c: 41, gas_mmscfd: 1.2, water_bwpd: 220, oil_bopd: 140 });
    }
  }
  return { source: "Direct Viewer", generatedAt: new Date().toISOString(), from, to, records };
}

/* ----------------------------------- SAP ----------------------------------- */

type TmlSpec = { tml: string; latest: number; rate: number; type: string; len: number; wid: number; method?: string };
type InspectionSpec = { id: string; nominal: number; campaigns: string[]; tmls: TmlSpec[] };

// `latest` is the thickness at the most recent campaign; earlier campaigns are
// back-calculated with the corrosion rate (mm/year).
const INSPECTION_SPECS: InspectionSpec[] = [
  { id: "PHM-SF-014", nominal: 12.7, campaigns: ["2026-03-10", "2026-07-14", "2026-11-12"], tmls: [
    { tml: "TML-01", latest: 11.2, rate: 0.18, type: "General corrosion", len: 180, wid: 120 },
    { tml: "TML-02", latest: 11.62, rate: 0.12, type: "General corrosion", len: 150, wid: 90 },
    { tml: "TML-03", latest: 11.95, rate: 0.09, type: "Pitting", len: 25, wid: 25 },
    { tml: "TML-04", latest: 11.41, rate: 0.21, type: "Localized corrosion", len: 210, wid: 140 } ] },
  { id: "PHM-TK-003", nominal: 11.1, campaigns: ["2026-02-24", "2026-06-30", "2026-11-10"], tmls: [
    { tml: "TML-01", latest: 9.76, rate: 0.26, type: "General corrosion", len: 320, wid: 210 },
    { tml: "TML-02", latest: 10.02, rate: 0.2, type: "Pitting", len: 30, wid: 30 },
    { tml: "TML-03", latest: 10.35, rate: 0.14, type: "General corrosion", len: 240, wid: 160 },
    { tml: "TML-04", latest: 9.88, rate: 0.24, type: "Underside corrosion", len: 280, wid: 190, method: "UT scan" } ] },
  { id: "PHM-SF-021", nominal: 15.88, campaigns: ["2026-02-18", "2026-06-23", "2026-10-29"], tmls: [
    { tml: "TML-01", latest: 14.31, rate: 0.2, type: "Erosion-corrosion", len: 140, wid: 100 },
    { tml: "TML-02", latest: 14.95, rate: 0.12, type: "General corrosion", len: 170, wid: 110 },
    { tml: "TML-03", latest: 15.2, rate: 0.08, type: "Pitting", len: 20, wid: 20 },
    { tml: "TML-04", latest: 14.62, rate: 0.17, type: "General corrosion", len: 200, wid: 130 } ] },
  { id: "PHM-SF-027", nominal: 19.05, campaigns: ["2026-04-07", "2026-08-11", "2026-11-05"], tmls: [
    { tml: "TML-01", latest: 17.62, rate: 0.22, type: "General corrosion", len: 260, wid: 180 },
    { tml: "TML-02", latest: 18.1, rate: 0.15, type: "General corrosion", len: 190, wid: 120 },
    { tml: "TML-03", latest: 18.44, rate: 0.1, type: "Pitting", len: 28, wid: 28 },
    { tml: "TML-04", latest: 17.88, rate: 0.19, type: "Localized corrosion", len: 220, wid: 150 } ] },
  { id: "PHM-SF-033", nominal: 10.97, campaigns: ["2026-03-24", "2026-07-28", "2026-10-14"], tmls: [
    { tml: "TML-01", latest: 9.18, rate: 0.3, type: "Erosion-corrosion", len: 190, wid: 110 },
    { tml: "TML-02", latest: 9.52, rate: 0.22, type: "General corrosion", len: 160, wid: 100 },
    { tml: "TML-03", latest: 9.74, rate: 0.16, type: "Pitting", len: 22, wid: 22 },
    { tml: "TML-04", latest: 9.31, rate: 0.27, type: "Erosion-corrosion", len: 175, wid: 105 } ] },
];

function notificationNo(seed: string): string {
  return "30" + String(Math.floor(rng(seed)() * 1e7)).padStart(7, "0");
}

function allInspections(): RawInspection[] {
  const out: RawInspection[] = [];
  for (const spec of INSPECTION_SPECS) {
    const lastDate = spec.campaigns[spec.campaigns.length - 1];
    const team = `Inspection Team ${rng(spec.id)() < 0.5 ? "A" : "B"}`;
    spec.campaigns.forEach((date, ci) => {
      const notification = notificationNo(`${spec.id}|${date}`);
      const scale = 0.75 + 0.125 * ci;
      for (const t of spec.tmls) {
        const isLast = date === lastDate;
        const years = daysBetween(date, lastDate) / 365.25;
        const jitter = isLast ? 0 : (rng(`${spec.id}|${t.tml}|${date}`)() - 0.5) * 0.06;
        const measured = round(Math.min(spec.nominal, t.latest + t.rate * years + jitter), 2);
        out.push({
          equipment_id: spec.id,
          inspection_date: date,
          tml_id: t.tml,
          method: t.method ?? "UT thickness",
          nominal_wt_mm: spec.nominal,
          measured_wt_mm: measured,
          corrosion_type: t.type,
          corrosion_depth_mm: round(spec.nominal - measured, 2),
          corrosion_length_mm: Math.round(t.len * scale),
          corrosion_width_mm: Math.round(t.wid * scale),
          notification_no: notification,
          inspector_team: team,
        });
      }
    });
  }
  // Equipment that is not in the asset register, to exercise linking.
  out.push({ equipment_id: "PHM-SF-099", inspection_date: "2026-11-02", tml_id: "TML-01", method: "UT thickness", nominal_wt_mm: 9.5, measured_wt_mm: 8.9, corrosion_type: "General corrosion", corrosion_depth_mm: 0.6, corrosion_length_mm: 90, corrosion_width_mm: 60, notification_no: "300000000", inspector_team: "Inspection Team A" });
  return out;
}

export function sapInspectionPayload(from: string, to: string) {
  const records = allInspections().filter(r => r.inspection_date >= from && r.inspection_date <= to);
  return { source: "SAP PM", generatedAt: new Date().toISOString(), from, to, records };
}

export const MAX_WINDOW_DAYS = 400;
export function validWindow(from: string, to: string): boolean {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  return iso.test(from) && iso.test(to) && from <= to && daysBetween(from, to) <= MAX_WINDOW_DAYS && addDays(from, 0) === from;
}
