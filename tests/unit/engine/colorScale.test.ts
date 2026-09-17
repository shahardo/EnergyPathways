import { describe, expect, it } from "vitest";
import {
  buildColorScale,
  type ColorScaleRuleLike,
} from "@/lib/engine/workbook/colorScale";

const SYNTHETIC_RULE: ColorScaleRuleLike = {
  ranges: ["A1:A3"],
  low: "#FF0000",
  mid: "#00FF00",
  high: "#0000FF",
  midPercentile: 50,
};

function lookupIn(values: Record<string, number | null>) {
  return (ref: string) => values[ref] ?? null;
}

describe("buildColorScale", () => {
  it("maps min -> low, median -> mid, max -> high exactly", () => {
    const scale = buildColorScale(SYNTHETIC_RULE, lookupIn({ A1: 1, A2: 3, A3: 5 }));
    expect(scale("A1")).toBe("#FF0000");
    expect(scale("A2")).toBe("#00FF00");
    expect(scale("A3")).toBe("#0000FF");
  });

  it("interpolates linearly between stops", () => {
    // n=4: PERCENTILE.INC(50) sits between the 2nd and 3rd order statistics
    // (rank 1.5 -> sorted[1..2] = 2, 3 -> p50 = 2.5). Value 2 is 2/3 of the
    // way from min (1) to p50 (2.5), so its colour is 2/3 of the way from
    // low to mid.
    const rule: ColorScaleRuleLike = { ...SYNTHETIC_RULE, ranges: ["A1:A4"] };
    const scale = buildColorScale(rule, lookupIn({ A1: 1, A2: 2, A3: 3, A4: 4 }));
    expect(scale("A2")).toBe("#55AA00");
  });

  it("returns high for every cell when the range's min equals its max (SPEC §5.4)", () => {
    const scale = buildColorScale(SYNTHETIC_RULE, lookupIn({ A1: 5, A2: 5, A3: 5 }));
    expect(scale("A1")).toBe("#0000FF");
    expect(scale("A2")).toBe("#0000FF");
    expect(scale("A3")).toBe("#0000FF");
  });

  it("returns null for a blank cell", () => {
    const scale = buildColorScale(SYNTHETIC_RULE, lookupIn({ A1: 1, A2: null, A3: 5 }));
    expect(scale("A2")).toBeNull();
  });

  it("returns a no-op scale when the whole range is blank", () => {
    const scale = buildColorScale(
      SYNTHETIC_RULE,
      lookupIn({ A1: null, A2: null, A3: null }),
    );
    expect(scale("A1")).toBeNull();
  });

  it("is range-relative: changing one cell shifts another cell's colour even though that cell's own value never changed", () => {
    // Mirrors the workbook's own proof case: a hidden sub-score changing
    // recolours the visible average in the same rule range (T6b). A2's own
    // value (4) is unchanged; moving A3 shifts the shared PERCENTILE.INC(50)
    // midpoint (it's one of the two order statistics the median interpolates
    // between for this 4-element range) that A2's colour is relative to.
    const rule: ColorScaleRuleLike = { ...SYNTHETIC_RULE, ranges: ["A1:A4"] };
    const before = buildColorScale(rule, lookupIn({ A1: 2, A2: 4, A3: 6, A4: 8 }));
    const after = buildColorScale(rule, lookupIn({ A1: 2, A2: 4, A3: 60, A4: 8 }));
    expect(after("A2")).not.toBe(before("A2"));
  });

  it("expands a multi-column range (e.g. E9:S9) into every covered cell", () => {
    const rule: ColorScaleRuleLike = {
      ranges: ["E9:G9"],
      low: "#FF0000",
      mid: "#00FF00",
      high: "#0000FF",
      midPercentile: 50,
    };
    const scale = buildColorScale(rule, lookupIn({ E9: 1, F9: 3, G9: 5 }));
    expect(scale("E9")).toBe("#FF0000");
    expect(scale("F9")).toBe("#00FF00");
    expect(scale("G9")).toBe("#0000FF");
  });

  it("supports a union of ranges, e.g. the workbook's security rule (C4:S8 C9 E9:S9)", () => {
    const rule: ColorScaleRuleLike = {
      ranges: ["A1:A2", "B5"],
      low: "#FF0000",
      mid: "#00FF00",
      high: "#0000FF",
      midPercentile: 50,
    };
    const scale = buildColorScale(rule, lookupIn({ A1: 1, A2: 3, B5: 5 }));
    expect(scale("A1")).toBe("#FF0000");
    expect(scale("A2")).toBe("#00FF00");
    expect(scale("B5")).toBe("#0000FF");
  });
});
