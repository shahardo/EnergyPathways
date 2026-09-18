import { describe, expect, it } from "vitest";
import {
  buildRoadmapLayout,
  indexRoadmapItems,
  roadmapItemKey,
} from "@/components/workbook/roadmapRows";
import { PHASE_BANDS } from "../../../scripts/ingest/phaseBands";
import type { RoadmapItem } from "@/lib/schemas/workbook";

describe("buildRoadmapLayout", () => {
  const layout = buildRoadmapLayout(PHASE_BANDS);

  it("derives 3 target + 2 step + 3 impact rows for 2025-2030 (SPEC §2.3)", () => {
    const rows2530 = layout.rows.filter((r) => r.phase === "2025-2030");
    expect(rows2530.filter((r) => r.kind === "target")).toHaveLength(3);
    expect(rows2530.filter((r) => r.kind === "step")).toHaveLength(2);
    expect(rows2530.filter((r) => r.kind === "impact")).toHaveLength(3);
  });

  it("derives 3 step slots for 2030-2040 and 2 for 2040-2050, no targets/impact", () => {
    const rows3040 = layout.rows.filter((r) => r.phase === "2030-2040");
    expect(rows3040.every((r) => r.kind === "step")).toBe(true);
    expect(rows3040).toHaveLength(3);

    const rows4050 = layout.rows.filter((r) => r.phase === "2040-2050");
    expect(rows4050.every((r) => r.kind === "step")).toBe(true);
    expect(rows4050).toHaveLength(2);
  });

  it("numbers slots 1-based within each kind, in row order", () => {
    const targets = layout.rows.filter(
      (r) => r.phase === "2025-2030" && r.kind === "target",
    );
    expect(targets.map((r) => r.slot)).toEqual([1, 2, 3]);
  });

  it("tags rows with their sub-group key only where the phase has sub-groups", () => {
    const rows2530 = layout.rows.filter((r) => r.phase === "2025-2030");
    expect(rows2530.every((r) => r.subGroupKey !== null)).toBe(true);
    const rows3040 = layout.rows.filter((r) => r.phase === "2030-2040");
    expect(rows3040.every((r) => r.subGroupKey === null)).toBe(true);
  });

  it("phase spans cover every row of that phase exactly once", () => {
    for (const span of layout.phaseSpans) {
      const rowsInSpan = layout.rows.slice(
        span.startIndex,
        span.startIndex + span.rowCount,
      );
      expect(rowsInSpan.every((r) => r.phase === span.phase)).toBe(true);
    }
    const totalSpanned = layout.phaseSpans.reduce((sum, s) => sum + s.rowCount, 0);
    expect(totalSpanned).toBe(layout.rows.length);
  });

  it("sub-group spans only exist for 2025-2030 and partition its rows", () => {
    expect(layout.subGroupSpans.every((s) => s.phase === "2025-2030")).toBe(true);
    expect(layout.subGroupSpans.map((s) => s.key)).toEqual([
      "targets",
      "steps",
      "impact",
    ]);
    const totalSubGrouped = layout.subGroupSpans.reduce((sum, s) => sum + s.rowCount, 0);
    const rows2530 = layout.rows.filter((r) => r.phase === "2025-2030");
    expect(totalSubGrouped).toBe(rows2530.length);
  });
});

describe("indexRoadmapItems", () => {
  it("looks up an item by phase/kind/slot/channel", () => {
    const item: RoadmapItem = {
      channelId: "efficiency",
      phase: "2025-2030",
      kind: "step",
      slot: 1,
      titleHe: "כותרת",
      detailHe: "פרטים",
      challengesHe: "טקסט",
      titleEn: null,
      detailEn: null,
      challengesEn: null,
      cellRefs: ["C43", "C44", "C45"],
    };
    const index = indexRoadmapItems([item]);
    expect(index.get(roadmapItemKey("2025-2030", "step", 1, "efficiency"))).toBe(item);
    expect(
      index.get(roadmapItemKey("2025-2030", "step", 2, "efficiency")),
    ).toBeUndefined();
  });
});
