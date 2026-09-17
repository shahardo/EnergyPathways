/**
 * Excel three-colour scale, reproduced exactly (SPEC §5.4): a `min /
 * PERCENTILE.INC(50) / max` colour scale over the *rule's full range*
 * (hidden sub-scores together with the average row), never over one
 * visible row alone — that's what makes the scale range-relative rather
 * than a fixed 1–5 gradient.
 */

export interface ColorScaleRuleLike {
  ranges: readonly string[]; // A1 ranges/cells, e.g. ["C4:S8", "C9", "E9:S9"]
  low: string; // "#RRGGBB"
  mid: string;
  high: string;
  midPercentile: number; // 0-100, e.g. 50
}

function parseA1Cell(ref: string): { column: string; row: number } {
  const match = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`colorScale: malformed cell reference "${ref}"`);
  }
  return { column: match[1], row: Number(match[2]) };
}

/** Expands "C4:S8" or a bare "C9" into its individual cell references. Assumes single-letter columns — true for C..S, the only columns any colour-scale rule in this workbook spans. */
export function expandRange(range: string): string[] {
  const [startRef, endRef] = range.split(":");
  if (!startRef) throw new Error(`colorScale: empty range`);
  if (!endRef) return [startRef];

  const start = parseA1Cell(startRef);
  const end = parseA1Cell(endRef);
  if (start.column.length !== 1 || end.column.length !== 1) {
    throw new Error(`colorScale: multi-letter columns not supported in range "${range}"`);
  }

  const cells: string[] = [];
  for (let col = start.column.charCodeAt(0); col <= end.column.charCodeAt(0); col++) {
    for (let row = start.row; row <= end.row; row++) {
      cells.push(`${String.fromCharCode(col)}${row}`);
    }
  }
  return cells;
}

/** Excel's `PERCENTILE.INC`: linear interpolation between order statistics, inclusive of both endpoints. */
function percentileInc(sortedAscending: readonly number[], k: number): number {
  const n = sortedAscending.length;
  const first = sortedAscending[0];
  if (n === 0 || first === undefined) throw new Error("percentileInc: empty input");
  if (n === 1) return first;

  const rank = k * (n - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  const lower = sortedAscending[lowerIndex];
  const upper = sortedAscending[upperIndex];
  if (lower === undefined || upper === undefined) {
    throw new Error("percentileInc: rank out of range");
  }
  return lower + (rank - lowerIndex) * (upper - lower);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]: readonly [number, number, number]): string {
  const toHex = (c: number) =>
    Math.round(Math.min(255, Math.max(0, c)))
      .toString(16)
      .toUpperCase()
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lerpHex(fromHex: string, toHex: string, t: number): string {
  const clampedT = Math.min(1, Math.max(0, t));
  const [r1, g1, b1] = hexToRgb(fromHex);
  const [r2, g2, b2] = hexToRgb(toHex);
  return rgbToHex([
    r1 + (r2 - r1) * clampedT,
    g1 + (g2 - g1) * clampedT,
    b1 + (b2 - b1) * clampedT,
  ]);
}

/**
 * Builds a `cellRef -> hex | null` lookup for one colour-scale rule.
 * `getCellValue` is asked for every cell the rule's ranges cover (once, up
 * front, to compute min/max/median), and again per lookup — pass something
 * cheap (a `Map` read), not a recomputation.
 *
 * ```
 * v ≤ p50:  colour = lerp(low, mid, (v − min) / (p50 − min))
 * v > p50:  colour = lerp(mid, high, (v − p50) / (max − p50))
 * min == max: colour = high
 * ```
 */
export function buildColorScale(
  rule: ColorScaleRuleLike,
  getCellValue: (cellRef: string) => number | null,
): (cellRef: string) => string | null {
  const cellRefs = rule.ranges.flatMap(expandRange);
  const numericValues = cellRefs
    .map(getCellValue)
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  if (numericValues.length === 0) {
    return () => null;
  }

  const min = numericValues[0]!;
  const max = numericValues[numericValues.length - 1]!;
  const p50 = percentileInc(numericValues, rule.midPercentile / 100);

  return (cellRef: string) => {
    const value = getCellValue(cellRef);
    if (value === null) return null;
    if (min === max) return rule.high;
    if (value <= p50) {
      const t = p50 === min ? 1 : (value - min) / (p50 - min);
      return lerpHex(rule.low, rule.mid, t);
    }
    const t = max === p50 ? 0 : (value - p50) / (max - p50);
    return lerpHex(rule.mid, rule.high, t);
  };
}
