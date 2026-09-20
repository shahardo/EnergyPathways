import type {
  Channel,
  ChannelId,
  Dimension,
  DimensionAverage,
  ColorScaleRule,
  RowLabel,
  SubScore,
  SubScoreKey,
  TrilemmaColorScale,
} from "@/lib/schemas/workbook";
import { subScoreKeySchema } from "@/lib/schemas/workbook";
import { buildColorScale } from "@/lib/engine/workbook/colorScale";
import { dimensionAverage } from "@/lib/engine/workbook/dimensionAverage";

export const DIMENSIONS = [
  "security",
  "environment",
  "equity",
] as const satisfies readonly Dimension[];

function isDimension(key: string): key is Dimension {
  return (DIMENSIONS as readonly string[]).includes(key);
}

function isDimensionRowLabel(row: RowLabel): row is RowLabel & { key: Dimension } {
  return isDimension(row.key);
}

export type ScoreBlockRow =
  | { kind: "score"; dimension: Dimension; rowLabel: RowLabel }
  | {
      kind: "subscore";
      dimension: Dimension;
      subScoreKey: SubScoreKey;
      rowLabel: RowLabel;
    };

/**
 * The three score rows (SPEC §2.2 rows 9/20/31), each optionally preceded by
 * its five sub-score rows (rows 4-8/15-19/26-30) when that dimension is
 * expanded -- the workbook's own row order ("in place" disclosure, PRD
 * F-102), not a group appended elsewhere.
 */
export function buildScoreBlockRows(
  rowLabels: readonly RowLabel[],
  expandedDimensions: ReadonlySet<Dimension>,
): ScoreBlockRow[] {
  const scoreRowLabels = rowLabels
    .filter(isDimensionRowLabel)
    .sort((a, b) => a.row - b.row);

  const rows: ScoreBlockRow[] = [];
  for (const scoreRowLabel of scoreRowLabels) {
    const dimension = scoreRowLabel.key;

    if (expandedDimensions.has(dimension)) {
      const subRowLabels = rowLabels
        .filter((r) => r.key.startsWith(`${dimension}.`))
        .sort((a, b) => a.row - b.row);
      for (const subRowLabel of subRowLabels) {
        const subScoreKey = subScoreKeySchema.parse(
          subRowLabel.key.slice(dimension.length + 1),
        );
        rows.push({ kind: "subscore", dimension, subScoreKey, rowLabel: subRowLabel });
      }
    }
    rows.push({ kind: "score", dimension, rowLabel: scoreRowLabel });
  }
  return rows;
}

export interface DimensionColorScales {
  /** `null` for a blank sub-score or all-blank average (SPEC §5.4). */
  colorForCell(
    dimension: Dimension,
    columnLetter: string,
    cellRef: string,
  ): string | null;
}

/**
 * One colour function per colour-scale rule (SPEC §5.4), built over the
 * rule's *full* range -- hidden sub-scores together with the average row --
 * never over one visible row alone. Column D has its own single-cell rule
 * per dimension (`${dimension}_d`); every other column uses the main rule.
 */
export function buildDimensionColorScales(
  colorScaleRules: readonly ColorScaleRule[],
  subScores: readonly SubScore[],
  dimensionAverages: readonly DimensionAverage[],
): DimensionColorScales {
  const valueByCellRef = new Map<string, number>();
  for (const s of subScores) if (s.value !== null) valueByCellRef.set(s.cellRef, s.value);
  for (const d of dimensionAverages)
    if (d.value !== null) valueByCellRef.set(d.cellRef, d.value);
  const getCellValue = (cellRef: string): number | null =>
    valueByCellRef.get(cellRef) ?? null;

  const scaleByRuleId = new Map<string, (cellRef: string) => string | null>();
  for (const rule of colorScaleRules) {
    scaleByRuleId.set(rule.ruleId, buildColorScale(rule, getCellValue));
  }

  return {
    colorForCell(dimension, columnLetter, cellRef) {
      const ruleId = columnLetter === "D" ? `${dimension}_d` : dimension;
      const colorFn = scaleByRuleId.get(ruleId);
      if (!colorFn) {
        throw new Error(
          `buildDimensionColorScales: missing colour-scale rule "${ruleId}"`,
        );
      }
      return colorFn(cellRef);
    },
  };
}

export interface TrilemmaScores {
  /** `null` when all three dimension averages are blank for that channel (SPEC §3.1's blank semantics). */
  valueByChannelId: ReadonlyMap<ChannelId, number | null>;
  /** `null` for a blank value, or when the workbook carries no colour-scale rule for row 37. */
  colorForChannel(channelId: ChannelId): string | null;
}

/**
 * Row 37's Trilemma composite (טרילמה, OQ-16): "the mean of the three
 * dimension averages" — the documented default for a row the current
 * workbook leaves blank. Reuses `dimensionAverage`'s exact blank
 * semantics (mean of whichever of the three are present; `null` if all
 * three are) rather than a bespoke average, and colours itself the same
 * way every dimension's own score row does — `buildColorScale` over the
 * row's real cell references (`${columnLetter}37`), range-relative
 * across all 17 channels, using the colour-scale rule the workbook
 * itself carries for that row (captured at ingestion, never invented).
 */
export function computeTrilemmaScores(
  channels: readonly Channel[],
  dimensionAverages: readonly DimensionAverage[],
  rule: TrilemmaColorScale | null,
): TrilemmaScores {
  const averageByChannelDim = new Map<string, number | null>();
  for (const d of dimensionAverages) {
    averageByChannelDim.set(`${d.channelId}|${d.dimension}`, d.value);
  }

  const valueByChannelId = new Map<ChannelId, number | null>();
  const cellRefByChannelId = new Map<ChannelId, string>();
  const valueByCellRef = new Map<string, number>();
  for (const channel of channels) {
    const value = dimensionAverage(
      DIMENSIONS.map((d) => averageByChannelDim.get(`${channel.channelId}|${d}`) ?? null),
    );
    valueByChannelId.set(channel.channelId, value);
    const cellRef = `${channel.columnLetter}37`; // SPEC §2.2 row 37
    cellRefByChannelId.set(channel.channelId, cellRef);
    if (value !== null) valueByCellRef.set(cellRef, value);
  }

  if (!rule) {
    return { valueByChannelId, colorForChannel: () => null };
  }
  const colorForCellRef = buildColorScale(
    rule,
    (cellRef) => valueByCellRef.get(cellRef) ?? null,
  );
  return {
    valueByChannelId,
    colorForChannel: (channelId) => {
      const cellRef = cellRefByChannelId.get(channelId);
      return cellRef ? colorForCellRef(cellRef) : null;
    },
  };
}
