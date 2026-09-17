import type { Dimension, SubScoreKey, TrajectoryMetric } from "@/lib/schemas/workbook";

/**
 * Static row map for rows 1–39 (the matrix; the roadmap section, rows
 * 40–66, is handled separately by `roadmap.ts`/`phaseBands.ts`). Row
 * numbers, Hebrew labels and the average-formula ranges are the workbook's
 * own (SPEC §2.2) — `key` and `labelEn` are ours, `labelEn` a working
 * translation pending OQ-11. Hidden state and row height still come from
 * the sheet itself at ingestion (SPEC's "layout metadata ingested, not
 * hard-coded" — PRD §5.1); this table supplies only what the workbook has
 * no cell for.
 */
export type RowKind =
  | { kind: "axis_header" }
  | { kind: "channel_name" }
  | { kind: "potential" }
  | { kind: "sub_score"; dimension: Dimension; key: SubScoreKey }
  | { kind: "dimension_average"; dimension: Dimension }
  | { kind: "trajectory"; metric: TrajectoryMetric; year: 2025 | 2030 | 2040 | 2050 }
  | { kind: "sparkline"; dimension: Dimension }
  | { kind: "trilemma" }
  | { kind: "likelihood" }
  | { kind: "barriers" };

export interface RowMapEntry {
  row: number;
  key: string;
  labelEn: string;
  spec: RowKind;
}

export const ROW_MAP: readonly RowMapEntry[] = [
  { row: 1, key: "axis", labelEn: "Axis", spec: { kind: "axis_header" } },
  { row: 2, key: "channel", labelEn: "Channel", spec: { kind: "channel_name" } },
  { row: 3, key: "potential", labelEn: "Potential", spec: { kind: "potential" } },
  {
    row: 4,
    key: "security.import_dependency",
    labelEn: "Import dependency",
    spec: { kind: "sub_score", dimension: "security", key: "import_dependency" },
  },
  {
    row: 5,
    key: "security.diversity",
    labelEn: "Diversity",
    spec: { kind: "sub_score", dimension: "security", key: "diversity" },
  },
  {
    row: 6,
    key: "security.storage_capability",
    labelEn: "Storage capability",
    spec: { kind: "sub_score", dimension: "security", key: "storage_capability" },
  },
  {
    row: 7,
    key: "security.grid_reliability",
    labelEn: "Grid reliability",
    spec: { kind: "sub_score", dimension: "security", key: "grid_reliability" },
  },
  {
    row: 8,
    key: "security.redundancy",
    labelEn: "Redundancy",
    spec: { kind: "sub_score", dimension: "security", key: "redundancy" },
  },
  {
    row: 9,
    key: "security",
    labelEn: "Security",
    spec: { kind: "dimension_average", dimension: "security" },
  },
  {
    row: 10,
    key: "generation.2025",
    labelEn: "2025",
    spec: { kind: "trajectory", metric: "generation", year: 2025 },
  },
  {
    row: 11,
    key: "generation.2030",
    labelEn: "2030",
    spec: { kind: "trajectory", metric: "generation", year: 2030 },
  },
  {
    row: 12,
    key: "generation.2040",
    labelEn: "2040",
    spec: { kind: "trajectory", metric: "generation", year: 2040 },
  },
  {
    row: 13,
    key: "generation.2050",
    labelEn: "2050",
    spec: { kind: "trajectory", metric: "generation", year: 2050 },
  },
  {
    row: 14,
    key: "sparkline.security",
    labelEn: "Generation trajectory",
    spec: { kind: "sparkline", dimension: "security" },
  },
  {
    row: 15,
    key: "environment.co2_intensity",
    labelEn: "CO2 intensity",
    spec: { kind: "sub_score", dimension: "environment", key: "co2_intensity" },
  },
  {
    row: 16,
    key: "environment.renewable_share",
    labelEn: "Renewable share",
    spec: { kind: "sub_score", dimension: "environment", key: "renewable_share" },
  },
  {
    row: 17,
    key: "environment.efficiency",
    labelEn: "Efficiency",
    spec: { kind: "sub_score", dimension: "environment", key: "efficiency" },
  },
  {
    row: 18,
    key: "environment.air_quality",
    labelEn: "Air quality",
    spec: { kind: "sub_score", dimension: "environment", key: "air_quality" },
  },
  {
    row: 19,
    key: "environment.methane_emissions",
    labelEn: "Methane emissions",
    spec: { kind: "sub_score", dimension: "environment", key: "methane_emissions" },
  },
  {
    row: 20,
    key: "environment",
    labelEn: "Environment",
    spec: { kind: "dimension_average", dimension: "environment" },
  },
  {
    row: 21,
    key: "emissions.2025",
    labelEn: "2025",
    spec: { kind: "trajectory", metric: "emissions", year: 2025 },
  },
  {
    row: 22,
    key: "emissions.2030",
    labelEn: "2030",
    spec: { kind: "trajectory", metric: "emissions", year: 2030 },
  },
  {
    row: 23,
    key: "emissions.2040",
    labelEn: "2040",
    spec: { kind: "trajectory", metric: "emissions", year: 2040 },
  },
  {
    row: 24,
    key: "emissions.2050",
    labelEn: "2050",
    spec: { kind: "trajectory", metric: "emissions", year: 2050 },
  },
  {
    row: 25,
    key: "sparkline.environment",
    labelEn: "Emissions trajectory",
    spec: { kind: "sparkline", dimension: "environment" },
  },
  {
    row: 26,
    key: "equity.access_to_electricity",
    labelEn: "Access to electricity",
    spec: { kind: "sub_score", dimension: "equity", key: "access_to_electricity" },
  },
  {
    row: 27,
    key: "equity.clean_cooking",
    labelEn: "Clean cooking",
    spec: { kind: "sub_score", dimension: "equity", key: "clean_cooking" },
  },
  {
    row: 28,
    key: "equity.electricity_price",
    labelEn: "Electricity price",
    spec: { kind: "sub_score", dimension: "equity", key: "electricity_price" },
  },
  {
    row: 29,
    key: "equity.fuel_price",
    labelEn: "Fuel price",
    spec: { kind: "sub_score", dimension: "equity", key: "fuel_price" },
  },
  {
    row: 30,
    key: "equity.industrial_price",
    labelEn: "Industrial price",
    spec: { kind: "sub_score", dimension: "equity", key: "industrial_price" },
  },
  {
    row: 31,
    key: "equity",
    labelEn: "Equity",
    spec: { kind: "dimension_average", dimension: "equity" },
  },
  {
    row: 32,
    key: "price_impact.2025",
    labelEn: "2025",
    spec: { kind: "trajectory", metric: "price_impact", year: 2025 },
  },
  {
    row: 33,
    key: "price_impact.2030",
    labelEn: "2030",
    spec: { kind: "trajectory", metric: "price_impact", year: 2030 },
  },
  {
    row: 34,
    key: "price_impact.2040",
    labelEn: "2040",
    spec: { kind: "trajectory", metric: "price_impact", year: 2040 },
  },
  {
    row: 35,
    key: "price_impact.2050",
    labelEn: "2050",
    spec: { kind: "trajectory", metric: "price_impact", year: 2050 },
  },
  {
    row: 36,
    key: "sparkline.equity",
    labelEn: "Price-impact trajectory",
    spec: { kind: "sparkline", dimension: "equity" },
  },
  { row: 37, key: "trilemma", labelEn: "Trilemma", spec: { kind: "trilemma" } },
  { row: 38, key: "likelihood", labelEn: "Likelihood", spec: { kind: "likelihood" } },
  { row: 39, key: "barriers", labelEn: "Barriers", spec: { kind: "barriers" } },
];

export function rowMapEntry(row: number): RowMapEntry {
  const entry = ROW_MAP.find((r) => r.row === row);
  if (!entry) throw new Error(`ingest-workbook: no row map entry for row ${row}`);
  return entry;
}
