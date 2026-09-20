import { describe, expect, it } from "vitest";
import {
  EMPTY_HIDDEN_SECTIONS,
  parseSectionVisibility,
  serializeSectionVisibility,
} from "@/components/workbook/sectionVisibility";

describe("parseSectionVisibility / serializeSectionVisibility", () => {
  it("round-trips hidden sections through the URL", () => {
    const hidden = parseSectionVisibility(new URLSearchParams("hide=scores,roadmap"));
    expect(hidden).toEqual(new Set(["scores", "roadmap"]));

    const serialized = serializeSectionVisibility(hidden);
    expect(serialized.get("hide")).toBe("scores,roadmap");
  });

  it("parses empty params as nothing hidden (the workbook's own default view)", () => {
    const hidden = parseSectionVisibility(new URLSearchParams());
    expect(hidden.size).toBe(0);
  });

  it("omits the param entirely when nothing is hidden", () => {
    const params = serializeSectionVisibility(EMPTY_HIDDEN_SECTIONS);
    expect(params.toString()).toBe("");
  });

  it("ignores an unrecognized section key rather than throwing", () => {
    const hidden = parseSectionVisibility(new URLSearchParams("hide=scores,bogus"));
    expect(hidden).toEqual(new Set(["scores"]));
  });
});
