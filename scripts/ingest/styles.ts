import { parseXml, asArray, attr } from "./xml";
import { resolveThemeOrRgbColor, type ThemePalette } from "./theme";

export interface CellFormat {
  fillId: number;
  numFmtId: number;
}

export interface WorkbookStyles {
  /** cellXfs index -> resolved fill hex (`#RRGGBB`), or `null` for "no fill" (patternType="none"). */
  fillByXf: (xfIndex: number) => string | null;
  cellFormat: (xfIndex: number) => CellFormat;
}

function parseFillColor(palette: ThemePalette, fill: unknown): { hex: string | null } {
  const patternFill = (fill as { patternFill?: unknown }).patternFill;
  if (!patternFill) return { hex: null };
  const patternType = attr(patternFill, "patternType");
  if (patternType !== "solid") return { hex: null };
  const fg = (patternFill as { fgColor?: unknown }).fgColor;
  if (!fg) return { hex: null };
  const theme = attr(fg, "theme");
  const rgb = attr(fg, "rgb");
  const tint = attr(fg, "tint");
  const hex = resolveThemeOrRgbColor(palette, {
    theme: theme !== undefined ? Number(theme) : undefined,
    rgb,
    tint: tint !== undefined ? Number(tint) : undefined,
  });
  return { hex };
}

/** Parses `xl/styles.xml`'s `<fills>` and `<cellXfs>` (T5.2). */
export function parseStyles(xml: string, palette: ThemePalette): WorkbookStyles {
  const doc = parseXml(xml) as {
    styleSheet?: {
      fills?: { fill?: unknown[] };
      cellXfs?: { xf?: unknown[] };
    };
  };
  const fillNodes = asArray(doc.styleSheet?.fills?.fill);
  const fillHexById = fillNodes.map((fill) => parseFillColor(palette, fill).hex);

  const xfNodes = asArray(doc.styleSheet?.cellXfs?.xf);
  const xfs = xfNodes.map((xf) => ({
    fillId: Number(attr(xf, "fillId") ?? 0),
    numFmtId: Number(attr(xf, "numFmtId") ?? 0),
  }));

  return {
    fillByXf(xfIndex: number) {
      const xf = xfs[xfIndex];
      if (!xf) throw new Error(`ingest-workbook: cellXfs index ${xfIndex} out of range`);
      const hex = fillHexById[xf.fillId];
      return hex === undefined ? null : hex;
    },
    cellFormat(xfIndex: number) {
      const xf = xfs[xfIndex];
      if (!xf) throw new Error(`ingest-workbook: cellXfs index ${xfIndex} out of range`);
      return xf;
    },
  };
}
