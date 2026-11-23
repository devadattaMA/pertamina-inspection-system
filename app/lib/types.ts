export type Department = "Pipeline" | "Surface Facility";

export type RegisteredAsset = {
  id: string; // unified asset_id
  name: string;
  area: string;
  department: Department;
  type: string;
};

/** Production operating parameters, one record per asset_id per day (US-02). */
export type ProductionRecord = {
  assetId: string;
  date: string; // YYYY-MM-DD
  pressure: number; // bar
  temperature: number; // °C
  gas: number; // MMSCFD
  water: number; // BWPD
  oil: number; // BOPD
  source: "Direct Viewer";
};

/** Surface facility inspection record from SAP, one per TML per inspection (US-03). */
export type InspectionRecord = {
  assetId: string;
  date: string; // YYYY-MM-DD
  tml: string; // thickness measurement location
  method: string;
  nominalMm: number;
  measuredMm: number;
  corrosionType: string;
  depthMm: number;
  lengthMm: number;
  widthMm: number;
  notification: string; // SAP notification number
  team: string;
  source: "SAP";
};

/** Raw payloads as returned by the (mock) source systems. */
export type RawProduction = {
  asset_tag: string;
  reading_date: string;
  pressure_bar: number;
  temperature_c: number;
  gas_mmscfd: number;
  water_bwpd: number;
  oil_bopd: number;
};

export type RawInspection = {
  equipment_id: string;
  inspection_date: string;
  tml_id: string;
  method: string;
  nominal_wt_mm: number;
  measured_wt_mm: number;
  corrosion_type: string;
  corrosion_depth_mm: number;
  corrosion_length_mm: number;
  corrosion_width_mm: number;
  notification_no: string;
  inspector_team: string;
};

export type SyncResult = {
  at: string; // ISO timestamp of the sync run
  window: { from: string; to: string };
  fetched: number;
  added: number;
  updated: number;
  unchanged: number;
  unlinked: string[]; // source ids that are not in the asset register
};

export type SourceState<T> = { records: T[]; result: SyncResult | null };
