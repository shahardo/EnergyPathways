import { describe, expect, it } from "vitest";
import { sparklinePath } from "@/lib/engine/workbook/sparklinePath";

describe("sparklinePath", () => {
  const axis = { axisMin: 0, axisMax: 90 };

  it("places four category points at equal spacing, ignoring the real year gaps", () => {
    const { points } = sparklinePath([8.8, 26.3, 56.9, 87.6], axis, 300, 50);
    expect(points.map((p) => p.x)).toEqual([0, 100, 200, 300]);
  });

  it("maps axisMax to y=0 and axisMin to y=height", () => {
    const { points } = sparklinePath([0, 90, 0, 90], axis, 300, 50);
    expect(points[0]?.y).toBe(50); // 0 -> bottom
    expect(points[1]?.y).toBe(0); // 90 -> top
  });

  it("places the zero baseline below the top of the frame for an axis that dips negative", () => {
    const emissionsAxis = { axisMin: -6, axisMax: 30 };
    const { zeroY } = sparklinePath([0, 0, 0, 0], emissionsAxis, 300, 36);
    // zero is 6/36 of the way up from the bottom of a -6..30 range (range 36)
    expect(zeroY).toBeCloseTo(36 - (6 / 36) * 36, 5);
  });

  it("returns a null area path when every value is blank (columns K, L)", () => {
    const { areaPath } = sparklinePath([null, null, null, null], axis, 300, 50);
    expect(areaPath).toBeNull();
  });

  it("returns a non-null closed area path for real data", () => {
    const { areaPath } = sparklinePath([8.8, 26.3, 56.9, 87.6], axis, 300, 50);
    expect(areaPath).toMatch(/^M .* Z$/);
  });

  it("rejects a degenerate axis", () => {
    expect(() =>
      sparklinePath([1, 2, 3, 4], { axisMin: 5, axisMax: 5 }, 100, 50),
    ).toThrow();
  });
});
