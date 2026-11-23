export const PARAMS = [
  { key: "pressure", label: "Pressure", unit: "bar", digits: 1 },
  { key: "temperature", label: "Temperature", unit: "°C", digits: 1 },
  { key: "gas", label: "Gas flowrate", unit: "MMSCFD", digits: 2 },
  { key: "water", label: "Water flowrate", unit: "BWPD", digits: 0 },
  { key: "oil", label: "Oil flowrate", unit: "BOPD", digits: 0 },
] as const;

export type ParamKey = (typeof PARAMS)[number]["key"];
