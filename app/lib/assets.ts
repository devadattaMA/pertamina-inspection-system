import type { RegisteredAsset } from "./types";

/**
 * Prototype asset register. In the real system this is the SAP-based asset
 * register; asset_id is the unified key that every source is linked through.
 */
export const ASSETS: RegisteredAsset[] = [
  { id: "PHM-PL-001", name: "Handil–Bekapai Export Line", area: "Handil", department: "Pipeline", type: "Pipeline" },
  { id: "PHM-PL-008", name: "Attaka Offshore Flowline", area: "Attaka", department: "Pipeline", type: "Pipeline" },
  { id: "PHM-PL-012", name: "Tunu Gas Transmission", area: "Tunu", department: "Pipeline", type: "Pipeline" },
  { id: "PHM-SF-014", name: "Central Processing Facility", area: "Bekapai", department: "Surface Facility", type: "Facility" },
  { id: "PHM-SF-021", name: "Test Separator V-101", area: "Handil", department: "Surface Facility", type: "Vessel" },
  { id: "PHM-SF-027", name: "Gas Scrubber V-204", area: "Tunu", department: "Surface Facility", type: "Vessel" },
  { id: "PHM-SF-033", name: "Process Manifold Piping", area: "Attaka", department: "Surface Facility", type: "Piping" },
  { id: "PHM-TK-003", name: "Produced Water Storage Tank", area: "Handil", department: "Surface Facility", type: "Tank" },
];

const byId = new Map(ASSETS.map(a => [a.id, a]));
export const getAsset = (id: string) => byId.get(id);
