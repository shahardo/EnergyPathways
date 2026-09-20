import { describe, expect, it } from "vitest";
import { getChannel, getWorkbookPayload } from "@/lib/db/queries";
import { CHANNEL_IDS } from "@/lib/schemas/workbook";

/**
 * Integration-ish smoke test over the real committed `db/snapshot.json`
 * (DEV-PLAN T4 acceptance: "payload round-trips through the schemas with
 * no `any`"). `getDb()` auto-hydrates `reference.sqlite` from the snapshot
 * on first use, so this also exercises the from-scratch-clone path that CI
 * runs on, with no OOXML parsing involved.
 */
describe("getWorkbookPayload", () => {
  it("returns all 17 channels in canonical workbook order, schema-validated", () => {
    const payload = getWorkbookPayload();
    expect(payload.channels.map((c) => c.channelId)).toEqual([...CHANNEL_IDS]);
  });

  it("carries row 37's Trilemma colour-scale rule (OQ-16), captured separately from the six dimension rules", () => {
    const payload = getWorkbookPayload();
    expect(payload.trilemmaColorScale).toEqual({
      ranges: ["C37:S37"],
      low: "#F8696B",
      mid: "#FFEB84",
      high: "#63BE7B",
      midPercentile: 50,
    });
  });

  it("carries the shared layout metadata tables", () => {
    const payload = getWorkbookPayload();
    expect(payload.axisGroups).toHaveLength(10);
    expect(payload.colorScaleRules).toHaveLength(6);
    expect(payload.sparklineSpecs).toHaveLength(3);
    expect(payload.phaseBands).toHaveLength(3);
    expect(payload.ramp).toHaveLength(4);
  });

  it("recovers CF/CI matching SPEC §3.4 for a representative column", () => {
    const payload = getWorkbookPayload();
    const coal = payload.channels.find((c) => c.channelId === "return_to_coal");
    expect(coal?.cf).toBeCloseTo(0.7, 5);
    expect(coal?.ciGPerKwh).toBeCloseTo(900, 5);
    expect(coal?.paramsRecovered).toBe(true);
  });

  it("leaves column D's CF unrecovered and column D excluded from security sub-scores", () => {
    const payload = getWorkbookPayload();
    const demandReduction = payload.channels.find(
      (c) => c.channelId === "demand_reduction",
    );
    expect(demandReduction?.cf).toBeNull();
    expect(demandReduction?.paramsRecovered).toBe(false);
    const dSecurity = payload.subScores.filter(
      (s) => s.channelId === "demand_reduction" && s.dimension === "security",
    );
    expect(dSecurity.every((s) => s.value === null)).toBe(true);
  });
});

describe("getChannel", () => {
  it("returns one column's full data, cross-referenced by channelId", () => {
    const channel = getChannel("renewables_storage");
    expect(channel.subScores.length).toBeGreaterThan(0);
    expect(channel.subScores.every((s) => s.channelId === "renewables_storage")).toBe(
      true,
    );
    expect(channel.roadmapItems.length).toBeGreaterThan(0);
    expect(channel.trajectories).toHaveLength(12); // 3 metrics x 4 milestone years
  });

  it("throws for an unknown channel id", () => {
    // @ts-expect-error deliberately invalid input
    expect(() => getChannel("not_a_channel")).toThrow();
  });
});
