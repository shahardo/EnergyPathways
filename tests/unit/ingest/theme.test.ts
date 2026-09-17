import { describe, expect, it } from "vitest";
import {
  applyTint,
  parseTheme,
  resolveThemeOrRgbColor,
} from "../../../scripts/ingest/theme";

const OFFICE_THEME_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="44546A"/></a:dk2>
      <a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
      <a:accent1><a:srgbClr val="5B9BD5"/></a:accent1>
      <a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
      <a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>
      <a:accent4><a:srgbClr val="FFC000"/></a:accent4>
      <a:accent5><a:srgbClr val="4472C4"/></a:accent5>
      <a:accent6><a:srgbClr val="70AD47"/></a:accent6>
      <a:hlink><a:srgbClr val="0563C1"/></a:hlink>
      <a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
    </a:clrScheme>
  </a:themeElements>
</a:theme>`;

describe("applyTint", () => {
  // Every case here was cross-checked against the real workbook's resolved
  // fills in DEV-PLAN T5.2 (styles.xml + theme1.xml -> SPEC §5.3/§5.6/§5.7 hex).
  it.each([
    ["5B9BD5", 0.5999938962981048, "BDD7EE"], // accent1 lighter 60% -> natural_gas name fill
    ["70AD47", 0.5999938962981048, "C5E0B4"], // accent6 lighter 60% -> electricity_import name fill
    ["ED7D31", 0.5999938962981048, "F8CBAD"], // accent2 lighter 60% -> future_tech name fill
    ["FFC000", 0.5999938962981048, "FFE699"], // accent4 lighter 60% -> renewables name fill
    ["5B9BD5", 0.7999816888943144, "DEEBF7"], // accent1 lighter 80% -> phase band 2025-2030 body fill
    ["FFFFFF", -0.34998626667073579, "A6A6A6"], // lt1 darker 35% -> label column fill
    ["FFFFFF", -0.249977111117893, "BFBFBF"], // lt1 darker 25% -> likelihood/barriers fill
    ["FFFFFF", -0.14999847407452621, "D9D9D9"], // lt1 darker 15% -> sparkline cell background
    ["000000", 0.499984740745262, "7F7F7F"], // dk1 lighter 50% -> coal name fill
  ])("applyTint(%s, %s) === #%s", (hex, tint, expected) => {
    expect(applyTint(hex, tint)).toBe(expected);
  });

  it("returns the colour unchanged for tint 0", () => {
    expect(applyTint("5B9BD5", 0)).toBe("5B9BD5");
  });
});

describe("parseTheme", () => {
  it("indexes the clrScheme the way a fill's theme attribute does: 0 lt1, 1 dk1, ... 9 accent6", () => {
    const palette = parseTheme(OFFICE_THEME_XML);
    expect(palette[0]).toBe("FFFFFF"); // lt1
    expect(palette[1]).toBe("000000"); // dk1
    expect(palette[4]).toBe("5B9BD5"); // accent1
    expect(palette[9]).toBe("70AD47"); // accent6
  });
});

describe("resolveThemeOrRgbColor", () => {
  const palette = parseTheme(OFFICE_THEME_XML);

  it("prefers an explicit rgb over a theme reference", () => {
    expect(resolveThemeOrRgbColor(palette, { rgb: "FF7030A0" })).toBe("#7030A0");
  });

  it("resolves theme + tint", () => {
    expect(resolveThemeOrRgbColor(palette, { theme: 4, tint: 0.5999938962981048 })).toBe(
      "#BDD7EE",
    );
  });

  it("resolves a bare theme index with no tint", () => {
    expect(resolveThemeOrRgbColor(palette, { theme: 7 })).toBe("#FFC000");
  });
});
