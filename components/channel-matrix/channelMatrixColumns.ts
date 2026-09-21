import { MILESTONE_YEARS } from "@/lib/schemas/workbook";
import type {
  Dimension,
  MilestoneYear,
  SparklineSpec,
  TrajectoryMetric,
} from "@/lib/schemas/workbook";
import { DIMENSIONS } from "../workbook/scoreRows";
import type { RoadmapLayout, RoadmapSlotRow } from "../workbook/roadmapRows";

export type ChannelMatrixColumn =
  | { kind: "potential" }
  | { kind: "dimension-score"; dimension: Dimension }
  | {
      kind: "trajectory";
      dimension: Dimension;
      metric: TrajectoryMetric;
      year: MilestoneYear;
    }
  | { kind: "trilemma" }
  | { kind: "likelihood" }
  | { kind: "barriers" }
  | { kind: "roadmap-slot"; slot: RoadmapSlotRow };

export interface ChannelMatrixColumnGroup {
  /** "potential" | a `Dimension` | "trilemma" | "likelihood" | "barriers" | a roadmap `Phase` */
  id: string;
  columns: ChannelMatrixColumn[];
}

/**
 * The transposed (channels-as-rows) table's column structure: one group
 * per dimension (its score, then its trajectory metric's four milestone
 * years -- the score itself has no per-year breakdown in the workbook,
 * only its associated metric does), then Trilemma/Likelihood/Barriers,
 * then one group per roadmap phase, with that phase's target/step/impact
 * slots as columns instead of rows.
 *
 * Pure structure only, no labels/colours/formatting -- same split as
 * `roadmapRows.ts`'s `buildRoadmapLayout` and `gridLayout.ts`'s axis-group
 * spans; the rendering component looks up display text and fills per
 * column, the same way `WorkbookMatrix.tsx` does for its rows.
 */
export function buildChannelMatrixColumnGroups(
  sparklineSpecs: readonly SparklineSpec[],
  roadmapLayout: RoadmapLayout,
): ChannelMatrixColumnGroup[] {
  const metricByDimension = new Map(sparklineSpecs.map((s) => [s.dimension, s.metric]));

  const groups: ChannelMatrixColumnGroup[] = [
    { id: "potential", columns: [{ kind: "potential" }] },
  ];

  for (const dimension of DIMENSIONS) {
    const metric = metricByDimension.get(dimension);
    if (!metric) {
      throw new Error(
        `buildChannelMatrixColumnGroups: missing sparkline spec for dimension "${dimension}"`,
      );
    }
    groups.push({
      id: dimension,
      columns: [
        { kind: "dimension-score", dimension },
        ...MILESTONE_YEARS.map((year): ChannelMatrixColumn => ({
          kind: "trajectory",
          dimension,
          metric,
          year,
        })),
      ],
    });
  }

  groups.push({ id: "trilemma", columns: [{ kind: "trilemma" }] });
  groups.push({ id: "likelihood", columns: [{ kind: "likelihood" }] });
  groups.push({ id: "barriers", columns: [{ kind: "barriers" }] });

  for (const phaseSpan of roadmapLayout.phaseSpans) {
    const slots = roadmapLayout.rows.slice(
      phaseSpan.startIndex,
      phaseSpan.startIndex + phaseSpan.rowCount,
    );
    groups.push({
      id: phaseSpan.phase,
      columns: slots.map((slot): ChannelMatrixColumn => ({ kind: "roadmap-slot", slot })),
    });
  }

  return groups;
}

export function flattenChannelMatrixColumns(
  groups: readonly ChannelMatrixColumnGroup[],
): ChannelMatrixColumn[] {
  return groups.flatMap((g) => g.columns);
}

/** A stable React key / DOM-attribute value for one column. */
export function channelMatrixColumnKey(column: ChannelMatrixColumn): string {
  switch (column.kind) {
    case "potential":
    case "trilemma":
    case "likelihood":
    case "barriers":
      return column.kind;
    case "dimension-score":
      return `score-${column.dimension}`;
    case "trajectory":
      return `trajectory-${column.dimension}-${column.year}`;
    case "roadmap-slot":
      return `roadmap-${column.slot.phase}-${column.slot.kind}-${column.slot.slot}`;
  }
}
