import { describe, expect, it } from "vitest";
import {
  buildChannelMatrixColumnGroups,
  channelMatrixColumnKey,
  flattenChannelMatrixColumns,
} from "@/components/channel-matrix/channelMatrixColumns";
import { buildRoadmapLayout } from "@/components/workbook/roadmapRows";
import { PHASE_BANDS } from "../../../scripts/ingest/phaseBands";
import type { SparklineSpec } from "@/lib/schemas/workbook";

const SPARKLINE_SPECS: SparklineSpec[] = [
  {
    dimension: "security",
    metric: "generation",
    axisMin: 0,
    axisMax: 100,
    fill: "#5B9BD5",
  },
  {
    dimension: "environment",
    metric: "emissions",
    axisMin: 0,
    axisMax: 100,
    fill: "#70AD47",
  },
  {
    dimension: "equity",
    metric: "price_impact",
    axisMin: 0,
    axisMax: 100,
    fill: "#ED7D31",
  },
];
const ROADMAP_LAYOUT = buildRoadmapLayout(PHASE_BANDS);

describe("buildChannelMatrixColumnGroups", () => {
  const groups = buildChannelMatrixColumnGroups(SPARKLINE_SPECS, ROADMAP_LAYOUT);

  it("orders groups: potential, the 3 dimensions, trilemma, likelihood, barriers, then the 3 phases", () => {
    expect(groups.map((g) => g.id)).toEqual([
      "potential",
      "security",
      "environment",
      "equity",
      "trilemma",
      "likelihood",
      "barriers",
      "2025-2030",
      "2030-2040",
      "2040-2050",
    ]);
  });

  it("gives each dimension group a score column followed by its metric's 4 milestone years", () => {
    for (const dimension of ["security", "environment", "equity"] as const) {
      const group = groups.find((g) => g.id === dimension)!;
      expect(group.columns).toHaveLength(5);
      expect(group.columns[0]).toMatchObject({ kind: "dimension-score", dimension });
      expect(
        group.columns.slice(1).map((c) => (c.kind === "trajectory" ? c.year : null)),
      ).toEqual([2025, 2030, 2040, 2050]);
    }
  });

  it("uses each dimension's own trajectory metric, not a hardcoded one", () => {
    const security = groups.find((g) => g.id === "security")!;
    expect(security.columns[1]).toMatchObject({
      kind: "trajectory",
      metric: "generation",
    });
    const equity = groups.find((g) => g.id === "equity")!;
    expect(equity.columns[1]).toMatchObject({
      kind: "trajectory",
      metric: "price_impact",
    });
  });

  it("gives potential, trilemma, likelihood and barriers exactly one column each", () => {
    for (const id of ["potential", "trilemma", "likelihood", "barriers"]) {
      expect(groups.find((g) => g.id === id)!.columns).toHaveLength(1);
    }
  });

  it("mirrors buildRoadmapLayout's row counts as roadmap-slot columns per phase", () => {
    expect(groups.find((g) => g.id === "2025-2030")!.columns).toHaveLength(8); // 3 targets + 2 steps + 3 impact
    expect(groups.find((g) => g.id === "2030-2040")!.columns).toHaveLength(3);
    expect(groups.find((g) => g.id === "2040-2050")!.columns).toHaveLength(2);
    for (const group of groups.slice(7)) {
      expect(group.columns.every((c) => c.kind === "roadmap-slot")).toBe(true);
    }
  });

  it("throws if a dimension has no sparkline spec, rather than silently omitting its metric years", () => {
    expect(() =>
      buildChannelMatrixColumnGroups(
        SPARKLINE_SPECS.filter((s) => s.dimension !== "equity"),
        ROADMAP_LAYOUT,
      ),
    ).toThrow(/equity/);
  });

  it("flattens to the same total column count as the sum of every group's columns", () => {
    const flat = flattenChannelMatrixColumns(groups);
    expect(flat).toHaveLength(groups.reduce((sum, g) => sum + g.columns.length, 0));
  });

  it("gives every column a unique, stable key", () => {
    const flat = flattenChannelMatrixColumns(groups);
    const keys = flat.map(channelMatrixColumnKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
