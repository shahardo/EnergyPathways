import { describe, expect, it } from "vitest";
import { resolveFreeText } from "@/lib/i18n/freeText";

describe("resolveFreeText", () => {
  it("returns the Hebrew text verbatim in Hebrew mode", () => {
    expect(resolveFreeText("he", "טקסט", null)).toEqual({
      text: "טקסט",
      isHebrewSource: false,
    });
  });

  it("returns null in Hebrew mode when the Hebrew source is blank", () => {
    expect(resolveFreeText("he", null, "English")).toBeNull();
  });

  it("prefers a real English translation when one exists", () => {
    expect(resolveFreeText("en", "טקסט", "Text")).toEqual({
      text: "Text",
      isHebrewSource: false,
    });
  });

  it("falls back to the Hebrew source, marked, when English is null (OQ-11)", () => {
    expect(resolveFreeText("en", "טקסט", null)).toEqual({
      text: "טקסט",
      isHebrewSource: true,
    });
  });

  it("falls back to the Hebrew source, marked, when English is an empty string", () => {
    expect(resolveFreeText("en", "טקסט", "")).toEqual({
      text: "טקסט",
      isHebrewSource: true,
    });
  });

  it("returns null in English mode when both sources are blank", () => {
    expect(resolveFreeText("en", null, null)).toBeNull();
  });
});
