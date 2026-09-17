import type {
  Channel,
  ChannelText,
  DimensionAverage,
  Likelihood,
  SubScore,
  TrajectoryPoint,
} from "@/lib/schemas/workbook";
import { CHANNEL_COLUMNS, COLUMN_MAP } from "./columnMap";
import { ROW_MAP } from "./rowMap";
import { cellValue, getCell, type RawSheet } from "./sheet";

function numberOrNull(value: string | number | boolean | null): number | null {
  if (value === null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() === "") return null; // cached "" from IFERROR(...,"")
  throw new Error(`ingest-workbook: expected a number, got ${JSON.stringify(value)}`);
}

function stringOrNull(value: string | number | boolean | null): string | null {
  if (value === null) return null;
  if (typeof value === "string") return value.trim() === "" ? null : value;
  throw new Error(`ingest-workbook: expected a string, got ${JSON.stringify(value)}`);
}

const LIKELIHOOD_HE: Record<string, Likelihood> = {
  גבוהה: "high",
  בינונית: "medium",
  נמוכה: "low",
};

function parseLikelihood(value: string | number | boolean | null): Likelihood {
  const text = stringOrNull(value);
  if (text === null || text === "-") return null;
  const mapped = LIKELIHOOD_HE[text];
  if (mapped === undefined) {
    throw new Error(`ingest-workbook: unrecognized likelihood value "${text}"`);
  }
  return mapped;
}

/** Channel identification + potential (row 1–3), no recovered CF/CI yet — the orchestrator adds those (T5.10). */
export function extractChannelBase(
  sheet: RawSheet,
): Omit<Channel, "cf" | "ciGPerKwh" | "paramsRecovered">[] {
  return COLUMN_MAP.map((col, index) => {
    const nameHe = stringOrNull(cellValue(sheet, `${col.columnLetter}2`));
    if (!nameHe) {
      throw new Error(`ingest-workbook: channel name missing at ${col.columnLetter}2`);
    }
    const potentialRaw = stringOrNull(cellValue(sheet, `${col.columnLetter}3`));
    return {
      channelId: col.channelId,
      columnLetter: col.columnLetter,
      columnOrder: index + 1,
      axisGroupId: col.axisGroupId,
      nameHe,
      nameEn: "", // English names are pending client approval (PRD OQ-11); filled from a translation catalogue once available.
      potentialMw: col.potentialMw,
      potentialRaw,
      energyRole: col.energyRole,
    };
  });
}

export function extractSubScores(sheet: RawSheet): SubScore[] {
  const rows: SubScore[] = [];
  for (const row of ROW_MAP) {
    if (row.spec.kind !== "sub_score") continue;
    for (const col of CHANNEL_COLUMNS) {
      const ref = `${col}${row.row}`;
      const cell = getCell(sheet, ref);
      const entry = COLUMN_MAP.find((c) => c.columnLetter === col);
      if (!entry) continue;
      rows.push({
        channelId: entry.channelId,
        dimension: row.spec.dimension,
        key: row.spec.key,
        value: numberOrNull(cell?.value ?? null),
        cellRef: ref,
      });
    }
  }
  return rows;
}

export function extractDimensionAverages(sheet: RawSheet): DimensionAverage[] {
  const rows: DimensionAverage[] = [];
  for (const row of ROW_MAP) {
    if (row.spec.kind !== "dimension_average") continue;
    for (const col of CHANNEL_COLUMNS) {
      const ref = `${col}${row.row}`;
      const entry = COLUMN_MAP.find((c) => c.columnLetter === col);
      if (!entry) continue;
      rows.push({
        channelId: entry.channelId,
        dimension: row.spec.dimension,
        value: numberOrNull(cellValue(sheet, ref)),
        cellRef: ref,
      });
    }
  }
  return rows;
}

export function extractTrajectories(sheet: RawSheet): TrajectoryPoint[] {
  const rows: TrajectoryPoint[] = [];
  for (const row of ROW_MAP) {
    if (row.spec.kind !== "trajectory") continue;
    for (const col of CHANNEL_COLUMNS) {
      const ref = `${col}${row.row}`;
      const entry = COLUMN_MAP.find((c) => c.columnLetter === col);
      if (!entry) continue;
      rows.push({
        channelId: entry.channelId,
        metric: row.spec.metric,
        year: row.spec.year,
        value: numberOrNull(cellValue(sheet, ref)),
        cellRef: ref,
      });
    }
  }
  return rows;
}

export function extractChannelText(sheet: RawSheet): ChannelText[] {
  const likelihoodRow = ROW_MAP.find((r) => r.spec.kind === "likelihood")?.row;
  const barriersRow = ROW_MAP.find((r) => r.spec.kind === "barriers")?.row;
  if (!likelihoodRow || !barriersRow) {
    throw new Error("ingest-workbook: row map is missing likelihood/barriers rows");
  }
  return COLUMN_MAP.map((col) => {
    const likelihoodRef = `${col.columnLetter}${likelihoodRow}`;
    const barriersRef = `${col.columnLetter}${barriersRow}`;
    return {
      channelId: col.channelId,
      likelihood: parseLikelihood(cellValue(sheet, likelihoodRef)),
      likelihoodCellRef: likelihoodRef,
      barriersHe: stringOrNull(cellValue(sheet, barriersRef)),
      barriersEn: null, // no approved translations yet (SPEC §5.10 rule 5)
      barriersCellRef: barriersRef,
    };
  });
}
