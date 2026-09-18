import { MILESTONE_YEARS } from "@/lib/schemas/workbook";
import type {
  ChannelId,
  Dimension,
  RowLabel,
  TrajectoryMetric,
  TrajectoryPoint,
} from "@/lib/schemas/workbook";

const SPARKLINE_KEY_PATTERN = /^sparkline\.(security|environment|equity)$/;

/**
 * Rows 14/25/36 (SPEC §2.2): one always-visible sparkline row directly below
 * each score row, keyed `sparkline.<dimension>` by ingestion. Unlike the
 * sub-score rows, these never collapse and are not part of the score block's
 * disclosure toggle (`buildScoreBlockRows`).
 */
export function buildSparklineRowByDimension(
  rowLabels: readonly RowLabel[],
): ReadonlyMap<Dimension, RowLabel> {
  const map = new Map<Dimension, RowLabel>();
  for (const row of rowLabels) {
    const match = SPARKLINE_KEY_PATTERN.exec(row.key);
    if (match) map.set(match[1] as Dimension, row);
  }
  return map;
}

/**
 * One channel's four milestone-year trajectory values, in year order —
 * the sparkline's category points (SPEC §5.5), evenly spaced regardless of
 * the real 5/10/10-year gaps between them.
 */
export function trajectoryValuesForChannel(
  trajectories: readonly TrajectoryPoint[],
  channelId: ChannelId,
  metric: TrajectoryMetric,
): (number | null)[] {
  const byYear = new Map(
    trajectories
      .filter((t) => t.channelId === channelId && t.metric === metric)
      .map((t) => [t.year, t.value] as const),
  );
  return MILESTONE_YEARS.map((year) => byYear.get(year) ?? null);
}
