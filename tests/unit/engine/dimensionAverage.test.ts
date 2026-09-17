import { describe, expect, it } from "vitest";
import { dimensionAverage } from "@/lib/engine/workbook/dimensionAverage";

describe("dimensionAverage", () => {
  it("averages the non-blank sub-scores", () => {
    expect(dimensionAverage([4, 5, 3, 4, 5])).toBeCloseTo(4.2, 5);
  });

  it("skips blanks like AVERAGE() does", () => {
    expect(dimensionAverage([4, null, 4])).toBeCloseTo(4, 5);
  });

  it('is null when every sub-score is blank, like IFERROR(AVERAGE(blank),"")', () => {
    expect(dimensionAverage([null, null, null, null, null])).toBeNull();
  });
});
