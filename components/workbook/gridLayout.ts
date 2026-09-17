import type { AxisGroup, Channel, RowLabel } from "@/lib/schemas/workbook";

/** 1pt = 1.33px at 100% zoom (SPEC §5.2). */
const PT_TO_PX = 1.33;

export interface AxisGroupSpan {
  axisGroup: AxisGroup;
  /** 1-based CSS grid-column start line (label column occupies line 1). */
  gridColumnStart: number;
  /** 1-based CSS grid-column end line (exclusive). */
  gridColumnEnd: number;
  columnCount: number;
}

/**
 * Places each axis group on the CSS grid line range covering its channel
 * columns. Channels are assumed already sorted by `columnOrder` (workbook
 * order) — grid column 1 is the label column, so channel index `i`
 * (0-based) sits at line `i + 2`.
 */
export function computeAxisGroupSpans(
  channels: readonly Channel[],
  axisGroups: readonly AxisGroup[],
): AxisGroupSpan[] {
  const indexByLetter = new Map(channels.map((c, index) => [c.columnLetter, index]));

  return axisGroups.map((axisGroup) => {
    const startIndex = indexByLetter.get(axisGroup.startColumn);
    const endIndex = indexByLetter.get(axisGroup.endColumn);
    if (startIndex === undefined || endIndex === undefined) {
      throw new Error(
        `computeAxisGroupSpans: axis group "${axisGroup.axisGroupId}" references a column outside the channel list`,
      );
    }
    return {
      axisGroup,
      gridColumnStart: startIndex + 2,
      gridColumnEnd: endIndex + 3,
      columnCount: endIndex - startIndex + 1,
    };
  });
}

export interface MatrixRowMetrics {
  row: RowLabel;
  heightPx: number;
  /** Sticky `top` offset — the cumulative height of every row above this one. */
  stickyTop: number;
}

/** Row heights and cumulative sticky offsets for the given rows, in workbook order. */
export function computeRowMetrics(rows: readonly RowLabel[]): MatrixRowMetrics[] {
  let cumulative = 0;
  return rows.map((row) => {
    const heightPx = row.heightPt * PT_TO_PX;
    const metrics: MatrixRowMetrics = { row, heightPx, stickyTop: cumulative };
    cumulative += heightPx;
    return metrics;
  });
}
