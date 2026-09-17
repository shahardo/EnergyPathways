import { describe, expect, it } from "vitest";
import { resolveCallouts } from "../../../scripts/ingest/callouts";

describe("resolveCallouts", () => {
  it("resolves an anchor cell to its channel and phase", () => {
    const { callouts, duplicateAnchors } = resolveCallouts([
      { text: "message", anchorCell: "F49" },
    ]);
    expect(duplicateAnchors).toHaveLength(0);
    expect(callouts).toHaveLength(1);
    expect(callouts[0]).toMatchObject({
      channelId: "regional_interconnection",
      phase: "2025-2030",
      anchorCell: "F49",
      textHe: "message",
    });
  });

  it("resolves a 2030-2040 phase anchor from its row", () => {
    const { callouts } = resolveCallouts([{ text: "x", anchorCell: "J53" }]);
    expect(callouts[0]?.phase).toBe("2030-2040");
    expect(callouts[0]?.channelId).toBe("gas_generation_expansion");
  });

  it("de-duplicates an identical callout repeated at the same anchor (OQ-18)", () => {
    const { callouts, duplicateAnchors } = resolveCallouts([
      { text: "same text", anchorCell: "Q49" },
      { text: "same text", anchorCell: "Q49" },
    ]);
    expect(callouts).toHaveLength(1);
    expect(duplicateAnchors).toEqual(["Q49"]);
  });

  it("keeps two different callouts at the same anchor (not a duplicate, a distinct note)", () => {
    const { callouts, duplicateAnchors } = resolveCallouts([
      { text: "first", anchorCell: "Q49" },
      { text: "second", anchorCell: "Q49" },
    ]);
    expect(callouts).toHaveLength(2);
    expect(duplicateAnchors).toHaveLength(0);
  });

  it("throws for an anchor outside the channel columns", () => {
    expect(() => resolveCallouts([{ text: "x", anchorCell: "A49" }])).toThrow();
  });
});
