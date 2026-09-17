import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { dimensionAverage } from "@/lib/engine/workbook/dimensionAverage";
import { buildColorScale, expandRange } from "@/lib/engine/workbook/colorScale";
import { workbookPayloadSchema, type WorkbookPayload } from "@/lib/schemas/workbook";

/**
 * T6b parity harness (AC-1). Recomputes independently from the live
 * `db/snapshot.json` — the committed `db/parity-fixtures.json` (generated
 * by `npm run parity:generate`, never automatically) is a frozen
 * expectation this test also checks against, so a change to the colour
 * scale or average math is caught even if nobody remembered to
 * regenerate fixtures.
 */

const snapshot: WorkbookPayload = workbookPayloadSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "db", "snapshot.json"), "utf-8")),
);

const fixtures = JSON.parse(
  readFileSync(path.join(process.cwd(), "db", "parity-fixtures.json"), "utf-8"),
) as {
  recomputedAverages: {
    channelId: string;
    dimension: string;
    cellRef: string;
    recomputed: number | null;
  }[];
  cellColors: Record<string, string | null>;
};

describe("dimension average parity (AC-1: averages equal cached formula results)", () => {
  it("recomputes every dimension average to within 1e-9 of the workbook's cached value", () => {
    for (const avg of snapshot.dimensionAverages) {
      const subScores = snapshot.subScores.filter(
        (s) => s.channelId === avg.channelId && s.dimension === avg.dimension,
      );
      const recomputed = dimensionAverage(subScores.map((s) => s.value));
      if (avg.value === null) {
        expect(recomputed, `${avg.channelId}/${avg.dimension}`).toBeNull();
      } else {
        expect(recomputed, `${avg.channelId}/${avg.dimension}`).not.toBeNull();
        expect(
          Math.abs((recomputed ?? NaN) - avg.value),
          `${avg.channelId}/${avg.dimension}`,
        ).toBeLessThan(1e-9);
      }
    }
  });

  it("matches the committed fixture (regression guard)", () => {
    for (const fixture of fixtures.recomputedAverages) {
      const subScores = snapshot.subScores.filter(
        (s) => s.channelId === fixture.channelId && s.dimension === fixture.dimension,
      );
      const recomputed = dimensionAverage(subScores.map((s) => s.value));
      expect(recomputed, fixture.cellRef).toBe(fixture.recomputed);
    }
  });
});

describe("colour scale parity (AC-1/AC-2: expected colour for every cell)", () => {
  const cellValues = new Map<string, number | null>();
  for (const s of snapshot.subScores) cellValues.set(s.cellRef, s.value);
  for (const a of snapshot.dimensionAverages) cellValues.set(a.cellRef, a.value);

  it("matches the committed fixture for every cell in every rule's range", () => {
    for (const rule of snapshot.colorScaleRules) {
      const scale = buildColorScale(rule, (ref) => cellValues.get(ref) ?? null);
      for (const ref of rule.ranges.flatMap(expandRange)) {
        expect(scale(ref), ref).toBe(fixtures.cellColors[ref]);
      }
    }
  });

  it("colours column D's all-5 environment block #63BE7B (DEV-PLAN T6b acceptance)", () => {
    const environmentRule = snapshot.colorScaleRules.find(
      (r) => r.ruleId === "environment_d",
    );
    expect(environmentRule).toBeDefined();
    const scale = buildColorScale(environmentRule!, (ref) => cellValues.get(ref) ?? null);
    for (const ref of ["D15", "D16", "D17", "D18", "D19", "D20"]) {
      expect(scale(ref), ref).toBe("#63BE7B");
    }
  });

  it("is range-relative on the real data: changing one hidden sub-score recolours other cells in the same range", () => {
    const rule = snapshot.colorScaleRules.find((r) => r.ruleId === "security");
    expect(rule).toBeDefined();
    const cellRefs = rule!.ranges.flatMap(expandRange);
    // Exclude the mutated cell itself and column S (whose own colour
    // necessarily changes because its own value changed) — every remaining
    // cell's *inputs* are untouched, so any colour shift among them can only
    // come from the range-wide min/max/median moving.
    const untouchedRefs = cellRefs.filter((ref) => !ref.startsWith("S") && ref !== "S8");

    const before = buildColorScale(rule!, (ref) => cellValues.get(ref) ?? null);
    const beforeColors = untouchedRefs.map((ref) => before(ref));

    const mutated = new Map(cellValues);
    mutated.set("S8", -100); // push one hidden sub-score (coal's redundancy) below the range's real minimum
    const after = buildColorScale(rule!, (ref) => mutated.get(ref) ?? null);
    const afterColors = untouchedRefs.map((ref) => after(ref));

    expect(afterColors).not.toEqual(beforeColors);
  });
});
