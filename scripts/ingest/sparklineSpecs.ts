import type { Dimension, SparklineSpec, TrajectoryMetric } from "@/lib/schemas/workbook";
import type { ParsedChart } from "./charts";

const DIMENSION_BY_START_ROW: Record<
  number,
  { dimension: Dimension; metric: TrajectoryMetric }
> = {
  10: { dimension: "security", metric: "generation" },
  21: { dimension: "environment", metric: "emissions" },
  32: { dimension: "equity", metric: "price_impact" },
};

/**
 * Builds the three shared sparkline specs (SPEC §5.5 — one fixed axis/fill
 * per dimension, identical for all 17 columns) from the 51 parsed charts,
 * asserting that every chart in a dimension really does agree (T5.4). A
 * chart that doesn't match its dimension's axis/fill is a structural
 * change the workbook's design promises never happens — abort rather than
 * silently pick one.
 */
export function resolveSparklineSpecs(charts: readonly ParsedChart[]): SparklineSpec[] {
  const byDimension = new Map<Dimension, ParsedChart[]>();
  for (const chart of charts) {
    const mapping = DIMENSION_BY_START_ROW[chart.dataStartRow];
    if (!mapping) {
      throw new Error(
        `ingest-workbook: ${chart.file} plots data starting at row ${chart.dataStartRow}, outside any known trajectory range`,
      );
    }
    const list = byDimension.get(mapping.dimension) ?? [];
    list.push(chart);
    byDimension.set(mapping.dimension, list);
  }

  const specs: SparklineSpec[] = [];
  for (const [dimension, list] of byDimension) {
    const mapping = DIMENSION_BY_START_ROW[list[0]!.dataStartRow]!;
    const mins = new Set(list.map((c) => c.axisMin));
    const maxs = new Set(list.map((c) => c.axisMax));
    const fills = new Set(list.map((c) => c.fill));
    if (mins.size > 1 || maxs.size > 1 || fills.size > 1) {
      throw new Error(
        `ingest-workbook: ${dimension} sparklines disagree on axis/fill across columns (mins=${[...mins]}, maxs=${[...maxs]}, fills=${[...fills]})`,
      );
    }
    specs.push({
      dimension,
      metric: mapping.metric,
      axisMin: [...mins][0]!,
      axisMax: [...maxs][0]!,
      fill: [...fills][0]!,
    });
  }
  return specs;
}
