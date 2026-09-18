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
 *
 * Matches by each channel's own `axisGroupId`, not the axis group's
 * `startColumn`/`endColumn` letters, so a group whose columns are only
 * partly present in `channels` still spans exactly its remaining columns
 * (SPEC §5.9's column filtering: "a header whose columns are partly
 * hidden shrinks its span"), and a group with none present is simply
 * omitted ("fully hidden, it disappears") rather than throwing.
 */
export function computeAxisGroupSpans(
  channels: readonly Channel[],
  axisGroups: readonly AxisGroup[],
): AxisGroupSpan[] {
  const spans: AxisGroupSpan[] = [];
  for (const axisGroup of axisGroups) {
    const indexes = channels.flatMap((c, index) =>
      c.axisGroupId === axisGroup.axisGroupId ? [index] : [],
    );
    if (indexes.length === 0) continue;
    const startIndex = Math.min(...indexes);
    spans.push({
      axisGroup,
      gridColumnStart: startIndex + 2,
      gridColumnEnd: startIndex + 2 + indexes.length,
      columnCount: indexes.length,
    });
  }
  return spans;
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
