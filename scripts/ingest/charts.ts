import { parseXml, asArray, attr, textOf } from "./xml";
import type { ThemePalette } from "./theme";

const THEME_SLOT_NAMES = [
  "lt1",
  "dk1",
  "lt2",
  "dk2",
  "accent1",
  "accent2",
  "accent3",
  "accent4",
  "accent5",
  "accent6",
  "hlink",
  "folHlink",
] as const;

/** DrawingML `<a:schemeClr val="accent1"/>` names a clrScheme slot directly — no numeric-index quirk (that's spreadsheetML cell fills only). */
function resolveSchemeColorName(palette: ThemePalette, name: string): string | null {
  const index = THEME_SLOT_NAMES.indexOf(name as (typeof THEME_SLOT_NAMES)[number]);
  return index === -1 ? null : `#${palette[index]}`;
}

export interface ParsedChart {
  file: string; // "chart1.xml"
  dataColumn: string; // "E"
  dataStartRow: number; // 10 | 21 | 32
  axisMin: number;
  axisMax: number;
  fill: string; // "#5B9BD5"
}

function parseA1Ref(ref: string): { column: string; row: number } {
  const match = /^Sheet1!\$([A-Z]+)\$(\d+)/.exec(ref);
  if (!match || !match[1] || !match[2]) {
    throw new Error(
      `ingest-workbook: chart data reference "${ref}" is not a Sheet1 A1 range`,
    );
  }
  return { column: match[1], row: Number(match[2]) };
}

/** Parses one `chartN.xml` — data range, axis bounds, series fill (T5.4). */
export function parseChart(
  file: string,
  xml: string,
  palette: ThemePalette,
): ParsedChart {
  const doc = parseXml(xml) as {
    "c:chartSpace"?: {
      "c:chart"?: { "c:plotArea"?: Record<string, unknown> };
    };
  };
  const plotArea = doc["c:chartSpace"]?.["c:chart"]?.["c:plotArea"];
  if (!plotArea) throw new Error(`ingest-workbook: ${file} has no plot area`);

  const areaChart = plotArea["c:areaChart"] as { "c:ser"?: unknown[] } | undefined;
  const ser = asArray(areaChart?.["c:ser"])[0] as
    { "c:val"?: { "c:numRef"?: { "c:f"?: unknown } }; "c:spPr"?: unknown } | undefined;
  if (!ser) throw new Error(`ingest-workbook: ${file} has no chart series`);

  const ref = textOf(ser["c:val"]?.["c:numRef"]?.["c:f"]);
  const { column, row } = parseA1Ref(ref);

  const valAx = plotArea["c:valAx"] as
    { "c:scaling"?: { "c:max"?: unknown; "c:min"?: unknown } } | undefined;
  const scaling = valAx?.["c:scaling"];
  const axisMax = Number(attr(scaling?.["c:max"], "val"));
  const axisMin = Number(attr(scaling?.["c:min"], "val"));
  if (!Number.isFinite(axisMin) || !Number.isFinite(axisMax)) {
    throw new Error(`ingest-workbook: ${file} value axis is missing an explicit min/max`);
  }

  const solidFill = (ser["c:spPr"] as { "a:solidFill"?: unknown })?.["a:solidFill"];
  const schemeClr = (solidFill as { "a:schemeClr"?: unknown })?.["a:schemeClr"];
  const srgbClr = (solidFill as { "a:srgbClr"?: unknown })?.["a:srgbClr"];
  let fill: string | null = null;
  if (schemeClr) fill = resolveSchemeColorName(palette, attr(schemeClr, "val") ?? "");
  else if (srgbClr) fill = `#${(attr(srgbClr, "val") ?? "").toUpperCase()}`;
  if (!fill)
    throw new Error(`ingest-workbook: ${file} series has no resolvable fill colour`);

  return { file, dataColumn: column, dataStartRow: row, axisMin, axisMax, fill };
}
