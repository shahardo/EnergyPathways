/**
 * Sparkline geometry (DEV-PLAN T6, SPEC §5.5): a filled-area path on a
 * **shared fixed axis** (identical bounds for all 17 columns — passed in,
 * never derived from the values themselves) and a **category axis**: four
 * equally spaced points, even though the milestone years are 5/10/10
 * years apart. That mismatch is deliberate — it's what the workbook itself
 * draws, and the full-size time-axis chart (F-105) is where the true
 * spacing shows up instead.
 */

export interface SparklineAxis {
  axisMin: number;
  axisMax: number;
}

export interface SparklinePoint {
  x: number;
  y: number;
  value: number | null;
}

export interface SparklineGeometry {
  /** SVG path `d` for the filled area, `null` when every value is blank (an empty plot frame, SPEC §5.5). */
  areaPath: string | null;
  /** Y-coordinate of the zero baseline, for callers that want to draw it explicitly. */
  zeroY: number;
  points: SparklinePoint[];
}

function valueToY(value: number, axis: SparklineAxis, height: number): number {
  const clamped = Math.min(axis.axisMax, Math.max(axis.axisMin, value));
  const fraction = (clamped - axis.axisMin) / (axis.axisMax - axis.axisMin);
  return height - fraction * height; // SVG y grows downward
}

export function sparklinePath(
  values: readonly (number | null)[],
  axis: SparklineAxis,
  width: number,
  height: number,
): SparklineGeometry {
  if (axis.axisMax === axis.axisMin) {
    throw new Error("sparklinePath: axisMin and axisMax must differ");
  }
  if (values.length < 2) {
    throw new Error("sparklinePath: needs at least two category points");
  }

  const zeroY = valueToY(0, axis, height);
  const step = width / (values.length - 1);
  const points: SparklinePoint[] = values.map((value, index) => ({
    x: index * step,
    y: value === null ? zeroY : valueToY(value, axis, height),
    value,
  }));

  const present = points.filter((p) => p.value !== null);
  if (present.length === 0) {
    return { areaPath: null, zeroY, points };
  }

  const first = present[0]!;
  const last = present[present.length - 1]!;
  const line = present.map((p) => `L ${p.x} ${p.y}`).join(" ");
  const areaPath = `M ${first.x} ${zeroY} L ${first.x} ${first.y} ${line} L ${last.x} ${zeroY} Z`;

  return { areaPath, zeroY, points };
}
