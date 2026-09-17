import { describe, expect, it } from "vitest";
import {
  CHANNEL_IDS,
  channelSchema,
  likelihoodSchema,
  scoreSchema,
  subScoreSchema,
} from "@/lib/schemas/workbook";

describe("scoreSchema", () => {
  it("accepts scores in 1..5", () => {
    expect(scoreSchema.safeParse(1).success).toBe(true);
    expect(scoreSchema.safeParse(5).success).toBe(true);
    expect(scoreSchema.safeParse(3.4).success).toBe(true);
  });

  it("rejects out-of-range scores", () => {
    expect(scoreSchema.safeParse(0).success).toBe(false);
    expect(scoreSchema.safeParse(5.1).success).toBe(false);
    expect(scoreSchema.safeParse(-1).success).toBe(false);
  });

  it("accepts null for a blank workbook cell", () => {
    expect(scoreSchema.safeParse(null).success).toBe(true);
  });
});

describe("likelihoodSchema", () => {
  it("accepts the workbook's vocabulary and null for '-'", () => {
    expect(likelihoodSchema.safeParse("high").success).toBe(true);
    expect(likelihoodSchema.safeParse("medium").success).toBe(true);
    expect(likelihoodSchema.safeParse("low").success).toBe(true);
    expect(likelihoodSchema.safeParse(null).success).toBe(true);
  });

  it("rejects an unknown likelihood value", () => {
    expect(likelihoodSchema.safeParse("very-high").success).toBe(false);
    expect(likelihoodSchema.safeParse("-").success).toBe(false);
  });
});

describe("channelSchema", () => {
  it("accepts column D's blank potential and unrecoverable parameters (OQ-14)", () => {
    const result = channelSchema.safeParse({
      channelId: "demand_reduction",
      columnLetter: "D",
      columnOrder: 2,
      axisGroupId: "efficiency",
      nameHe: "הפחתת ביקושים",
      nameEn: "Demand reduction",
      potentialMw: null,
      potentialRaw: "-",
      energyRole: "demand_reduction_unconfirmed",
      cf: null,
      ciGPerKwh: -400,
      paramsRecovered: false,
    });
    expect(result.success).toBe(true);
  });

  it("has all 17 channel ids in canonical workbook order", () => {
    expect(CHANNEL_IDS).toHaveLength(17);
    expect(CHANNEL_IDS[0]).toBe("efficiency");
    expect(CHANNEL_IDS[CHANNEL_IDS.length - 1]).toBe("return_to_coal");
  });
});

describe("subScoreSchema", () => {
  it("accepts a blank sub-score (e.g. column D's hidden security rows)", () => {
    const result = subScoreSchema.safeParse({
      channelId: "demand_reduction",
      dimension: "security",
      key: "import_dependency",
      value: null,
      cellRef: "D4",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed cell reference", () => {
    const result = subScoreSchema.safeParse({
      channelId: "efficiency",
      dimension: "security",
      key: "import_dependency",
      value: 4,
      cellRef: "not-a-cell",
    });
    expect(result.success).toBe(false);
  });
});
