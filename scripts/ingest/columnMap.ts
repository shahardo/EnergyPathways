import type { AxisGroupId, ChannelId, EnergyRole } from "@/lib/schemas/workbook";

/**
 * The committed column map (DEV-PLAN T5.7, SPEC §2.5): column letter →
 * `channel_id`, axis group and energy role. These are stable keys assigned
 * here, once, by hand — never derived from the Hebrew text, which can be
 * edited in the workbook without changing what a column *means*.
 *
 * `potentialMw` here is only the parsed-for-convenience number; the
 * authoritative source is still the workbook's row-3 cell, read fresh at
 * ingestion and checked against this table (a mismatch is reported, not
 * silently trusted either way).
 */
export interface ColumnMapEntry {
  columnLetter: string;
  channelId: ChannelId;
  axisGroupId: AxisGroupId;
  energyRole: EnergyRole;
  potentialMw: number | null;
}

export const COLUMN_MAP: readonly ColumnMapEntry[] = [
  {
    columnLetter: "C",
    channelId: "efficiency",
    axisGroupId: "efficiency",
    energyRole: "demand_reduction",
    potentialMw: 3000,
  },
  {
    columnLetter: "D",
    channelId: "demand_reduction",
    axisGroupId: "efficiency",
    energyRole: "demand_reduction_unconfirmed",
    potentialMw: null,
  },
  {
    columnLetter: "E",
    channelId: "renewables_storage",
    axisGroupId: "renewables",
    energyRole: "generation_variable",
    potentialMw: 50000,
  },
  {
    columnLetter: "F",
    channelId: "regional_interconnection",
    axisGroupId: "electricity_import",
    energyRole: "import_electricity",
    potentialMw: 8000,
  },
  {
    columnLetter: "G",
    channelId: "lng_import",
    axisGroupId: "natural_gas",
    energyRole: "fuel_source_gas",
    potentialMw: 10000,
  },
  {
    columnLetter: "H",
    channelId: "gas_ccs",
    axisGroupId: "natural_gas",
    energyRole: "generation_gas",
    potentialMw: 10000,
  },
  {
    columnLetter: "I",
    channelId: "pipeline_gas_import",
    axisGroupId: "natural_gas",
    energyRole: "fuel_source_gas",
    potentialMw: 10000,
  },
  {
    columnLetter: "J",
    channelId: "gas_generation_expansion",
    axisGroupId: "natural_gas",
    energyRole: "generation_gas",
    potentialMw: 10000,
  },
  {
    columnLetter: "K",
    channelId: "fuel_supply",
    axisGroupId: "fuels",
    energyRole: "enabler",
    potentialMw: null,
  },
  {
    columnLetter: "L",
    channelId: "grid_development",
    axisGroupId: "grid",
    energyRole: "enabler",
    potentialMw: null,
  },
  {
    columnLetter: "M",
    channelId: "geothermal",
    axisGroupId: "future_tech",
    energyRole: "generation_firm",
    potentialMw: 10000,
  },
  {
    columnLetter: "N",
    channelId: "nuclear_smr",
    axisGroupId: "future_tech",
    energyRole: "generation_firm",
    potentialMw: 8000,
  },
  {
    columnLetter: "O",
    channelId: "nuclear_fusion",
    axisGroupId: "future_tech",
    energyRole: "generation_firm",
    potentialMw: 5000,
  },
  {
    columnLetter: "P",
    channelId: "hydrogen_import",
    axisGroupId: "hydrogen",
    energyRole: "generation_firm",
    potentialMw: 8000,
  },
  {
    columnLetter: "Q",
    channelId: "deepwater_gas_exploration",
    axisGroupId: "domestic_gas",
    energyRole: "fuel_source_gas",
    potentialMw: 2000,
  },
  {
    columnLetter: "R",
    channelId: "small_gas_fields",
    axisGroupId: "domestic_gas",
    energyRole: "fuel_source_gas",
    potentialMw: 1000,
  },
  {
    columnLetter: "S",
    channelId: "return_to_coal",
    axisGroupId: "coal",
    energyRole: "generation_firm",
    potentialMw: 5000,
  },
];

export const CHANNEL_COLUMNS = COLUMN_MAP.map((c) => c.columnLetter);

export function columnMapByLetter(letter: string): ColumnMapEntry {
  const entry = COLUMN_MAP.find((c) => c.columnLetter === letter);
  if (!entry)
    throw new Error(`ingest-workbook: no column map entry for column "${letter}"`);
  return entry;
}

/** Axis groups in column order (SPEC §5.3), with the merged header span each covers. */
export const AXIS_GROUPS: readonly {
  axisGroupId: AxisGroupId;
  nameHe: string;
  nameEn: string;
  startColumn: string;
  endColumn: string;
  headerFill: string;
  nameFill: string;
}[] = [
  {
    axisGroupId: "efficiency",
    nameHe: "התייעלות",
    nameEn: "Efficiency",
    startColumn: "C",
    endColumn: "D",
    headerFill: "#7030A0",
    nameFill: "#DEBDFF",
  },
  {
    axisGroupId: "renewables",
    nameHe: "מתחדשות",
    nameEn: "Renewables",
    startColumn: "E",
    endColumn: "E",
    headerFill: "#FFC000",
    nameFill: "#FFE699",
  },
  {
    axisGroupId: "electricity_import",
    nameHe: "ייבוא חשמל",
    nameEn: "Electricity import",
    startColumn: "F",
    endColumn: "F",
    headerFill: "#70AD47",
    nameFill: "#C5E0B4",
  },
  {
    axisGroupId: "natural_gas",
    nameHe: "גז טבעי",
    nameEn: "Natural gas",
    startColumn: "G",
    endColumn: "J",
    headerFill: "#5B9BD5",
    nameFill: "#BDD7EE",
  },
  {
    axisGroupId: "fuels",
    nameHe: "הדלקים",
    nameEn: "Fuels",
    startColumn: "K",
    endColumn: "K",
    headerFill: "#7030A0",
    nameFill: "#DEBDFF",
  },
  {
    axisGroupId: "grid",
    nameHe: "הרשת",
    nameEn: "Grid",
    startColumn: "L",
    endColumn: "L",
    headerFill: "#70AD47",
    nameFill: "#C5E0B4",
  },
  {
    axisGroupId: "future_tech",
    nameHe: "טכנולוגיות עתיד",
    nameEn: "Future technologies",
    startColumn: "M",
    endColumn: "O",
    headerFill: "#ED7D31",
    nameFill: "#F8CBAD",
  },
  {
    axisGroupId: "hydrogen",
    nameHe: "מימן",
    nameEn: "Hydrogen",
    startColumn: "P",
    endColumn: "P",
    headerFill: "#4472C4",
    nameFill: "#B4C7E7",
  },
  {
    axisGroupId: "domestic_gas",
    nameHe: "גז טבעי",
    nameEn: "Natural gas (domestic)",
    startColumn: "Q",
    endColumn: "R",
    headerFill: "#5B9BD5",
    nameFill: "#BDD7EE",
  },
  {
    axisGroupId: "coal",
    nameHe: "חזרה לפחם",
    nameEn: "Return to coal",
    startColumn: "S",
    endColumn: "S",
    headerFill: "#A6A6A6",
    nameFill: "#7F7F7F",
  },
];
