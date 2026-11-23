// US-04 (pipeline inspection import) + US-06 (Asset ID & unit validation)
// Pure functions, no React, so they can be unit-tested or moved to a backend later.

export const REQUIRED_COLUMNS = [
  "asset_id", "inspection_date", "method", "measured_thickness",
  "thickness_unit", "pressure", "pressure_unit", "inspector",
] as const;

export const METHODS = ["UT", "MFL", "ILI", "RT", "VISUAL"] as const;

// Unit tables -> factor to the standard unit (mm for thickness, bar for pressure)
const THICKNESS_TO_MM: Record<string, number> = { mm: 1, cm: 10, in: 25.4 };
const PRESSURE_TO_BAR: Record<string, number> = { bar: 1, psi: 0.0689476, kpa: 0.01, mpa: 10 };

// PHM-<PL|SF|TK>-<3 digits>, e.g. PHM-PL-001
export const ASSET_ID_PATTERN = /^PHM-(PL|SF|TK)-\d{3}$/;

export type Level = "error" | "warning";
export type RowStatus = "valid" | "warning" | "error";
export type Issue = { field: string; message: string; level: Level };

export type CleanRecord = {
  assetId: string;
  inspectionDate: string; // ISO yyyy-mm-dd
  method: string;
  thicknessMm: number;
  pressureBar: number | null;
  inspector: string;
  remarks: string;
};

export type ParsedRow = {
  line: number; // line number in the file (header = 1)
  raw: Record<string, string>;
  issues: Issue[];
  status: RowStatus;
  clean?: CleanRecord;
};

export type ParseResult = {
  fileErrors: string[];
  rows: ParsedRow[];
};

/* ---------- CSV parsing ---------- */

function detectDelimiter(headerLine: string): string {
  // Excel with Indonesian regional settings exports ";" instead of ","
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semis = (headerLine.match(/;/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const delim = detectDelimiter(src.split(/\r?\n/, 1)[0] ?? "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/* ---------- field validators ---------- */

function parseDate(value: string): Date | null {
  const v = value.trim();
  let y: number, m: number, d: number;
  let match = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);          // 2026-11-13
  if (match) { y = +match[1]; m = +match[2]; d = +match[3]; }
  else if ((match = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/))) { // 13/11/2026
    d = +match[1]; m = +match[2]; y = +match[3];
  } else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  // reject overflow like 2026-02-31
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date;
}

const toIso = (d: Date) => d.toISOString().slice(0, 10);

function parseNumber(value: string): number | null {
  const v = value.trim().replace(",", "."); // 8,42 -> 8.42
  if (v === "" || !/^-?\d+(\.\d+)?$/.test(v)) return null;
  return Number(v);
}

/* ---------- main entry ---------- */

export function validateInspectionCsv(text: string, knownAssetIds: string[]): ParseResult {
  const table = parseCsv(text).filter(r => r.some(c => c.trim() !== ""));
  if (table.length === 0) return { fileErrors: ["File is empty."], rows: [] };

  const header = table[0].map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const missing = REQUIRED_COLUMNS.filter(c => !header.includes(c));
  if (missing.length) {
    return { fileErrors: [`Missing required column(s): ${missing.join(", ")}`], rows: [] };
  }
  if (table.length === 1) return { fileErrors: ["File has a header but no data rows."], rows: [] };

  const known = new Set(knownAssetIds.map(id => id.toUpperCase()));
  const seen = new Set<string>();
  const today = new Date();
  const rows: ParsedRow[] = [];

  table.slice(1).forEach((cells, idx) => {
    const raw: Record<string, string> = {};
    header.forEach((h, i) => { raw[h] = (cells[i] ?? "").trim(); });
    const issues: Issue[] = [];
    const err = (field: string, message: string) => issues.push({ field, message, level: "error" });
    const warn = (field: string, message: string) => issues.push({ field, message, level: "warning" });

    // --- Asset ID (US-06) ---
    const assetId = raw.asset_id.toUpperCase();
    if (!assetId) err("asset_id", "Asset ID is empty.");
    else if (!ASSET_ID_PATTERN.test(assetId)) err("asset_id", "Wrong format. Expected PHM-PL-001 style.");
    else if (!assetId.startsWith("PHM-PL-")) err("asset_id", "Not a pipeline asset (should start with PHM-PL-).");
    else if (!known.has(assetId)) err("asset_id", "Asset ID not found in the asset register.");

    // --- Date ---
    const date = parseDate(raw.inspection_date);
    if (!date) err("inspection_date", "Invalid date. Use YYYY-MM-DD or DD/MM/YYYY.");
    else if (date.getTime() > today.getTime()) err("inspection_date", "Inspection date is in the future.");

    // --- Method ---
    const method = raw.method.toUpperCase();
    if (!(METHODS as readonly string[]).includes(method)) err("method", `Unknown method. Use: ${METHODS.join(", ")}.`);

    // --- Thickness + unit (US-06) ---
    let thicknessMm: number | null = null;
    const tUnit = raw.thickness_unit.toLowerCase();
    const tVal = parseNumber(raw.measured_thickness);
    if (tVal === null) err("measured_thickness", "Thickness must be a number.");
    else if (!(tUnit in THICKNESS_TO_MM)) err("thickness_unit", `Unknown unit "${raw.thickness_unit}". Use mm, cm or in.`);
    else if (tVal <= 0) err("measured_thickness", "Thickness must be greater than 0.");
    else {
      thicknessMm = Math.round(tVal * THICKNESS_TO_MM[tUnit] * 100) / 100;
      if (thicknessMm > 100) err("measured_thickness", `${thicknessMm} mm is not plausible for a pipe wall. Check the unit.`);
      else if (thicknessMm < 1 || thicknessMm > 50) warn("measured_thickness", `${thicknessMm} mm looks unusual. Please double check.`);
      if (tUnit !== "mm") warn("thickness_unit", `Converted from ${tUnit} to mm.`);
    }

    // --- Pressure + unit (US-06), pressure may be blank ---
    let pressureBar: number | null = null;
    if (raw.pressure !== "") {
      const pUnit = raw.pressure_unit.toLowerCase();
      const pVal = parseNumber(raw.pressure);
      if (pVal === null) err("pressure", "Pressure must be a number.");
      else if (!(pUnit in PRESSURE_TO_BAR)) err("pressure_unit", `Unknown unit "${raw.pressure_unit}". Use bar, psi, kPa or MPa.`);
      else if (pVal < 0) err("pressure", "Pressure cannot be negative.");
      else {
        pressureBar = Math.round(pVal * PRESSURE_TO_BAR[pUnit] * 100) / 100;
        if (pressureBar > 500) err("pressure", `${pressureBar} bar is not plausible. Check the unit.`);
        if (pUnit !== "bar") warn("pressure_unit", `Converted from ${raw.pressure_unit} to bar.`);
      }
    } else warn("pressure", "No pressure value provided.");

    // --- Inspector ---
    if (!raw.inspector) err("inspector", "Inspector name is empty.");

    // --- Duplicates inside the file ---
    if (date && assetId && method) {
      const key = `${assetId}|${toIso(date)}|${method}`;
      if (seen.has(key)) err("asset_id", "Duplicate of an earlier row (same asset, date and method).");
      seen.add(key);
    }

    const hasError = issues.some(i => i.level === "error");
    const status: RowStatus = hasError ? "error" : issues.length ? "warning" : "valid";
    rows.push({
      line: idx + 2, raw, issues, status,
      clean: hasError ? undefined : {
        assetId, inspectionDate: toIso(date!), method, thicknessMm: thicknessMm!,
        pressureBar, inspector: raw.inspector, remarks: raw.remarks ?? "",
      },
    });
  });

  return { fileErrors: [], rows };
}
