import { parseXml, asArray, attr, textOf } from "./xml";

export interface CellFormula {
  /** Literal formula text — present on a standalone formula or a shared formula's *master* cell. */
  text: string | null;
  /**
   * Excel shared-formula group index (`<f t="shared" si="N">`). Member
   * cells other than the master carry only this — their effective formula
   * is the master's, translated by Excel's own relative-reference rules;
   * this parser doesn't re-implement that translation (see assertions.ts).
   */
  sharedIndex: number | null;
}

export interface RawCell {
  ref: string; // e.g. "C4"
  col: string; // "C"
  row: number; // 4
  /** Resolved value: string (shared/inline string), number, boolean, or null for a blank cell. */
  value: string | number | boolean | null;
  styleIndex: number;
  formula: CellFormula | null;
}

export interface RawRow {
  row: number;
  heightPt: number | null;
  hidden: boolean;
  outlineLevel: number;
  cells: Map<string, RawCell>; // keyed by column letter
}

export interface RawSheet {
  dimension: string;
  rightToLeft: boolean;
  rows: Map<number, RawRow>;
  merges: string[]; // "C1:D1"
  colorScaleRanges: RawColorScaleRule[];
}

export interface RawColorScaleRule {
  sqref: string; // space-separated A1 ranges, e.g. "C4:S8 C9 E9:S9"
  priority: number;
  midPercentile: number;
  low: string; // "#RRGGBB"
  mid: string;
  high: string;
}

function splitRef(ref: string): { col: string; row: number } {
  const match = /^([A-Z]+)([0-9]+)$/.exec(ref);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`ingest-workbook: malformed cell reference "${ref}"`);
  }
  return { col: match[1], row: Number(match[2]) };
}

function argbToHex(argb: string): string {
  const rgb = argb.length === 8 ? argb.slice(2) : argb;
  return `#${rgb.toUpperCase()}`;
}

function parseColorScaleRules(
  conditionalFormattingNodes: unknown[],
): RawColorScaleRule[] {
  const rules: RawColorScaleRule[] = [];
  for (const cfNode of conditionalFormattingNodes) {
    const sqref = attr(cfNode, "sqref");
    if (!sqref) continue;
    const cfRules = asArray((cfNode as { cfRule?: unknown[] }).cfRule);
    for (const cfRule of cfRules) {
      const type = attr(cfRule, "type");
      if (type !== "colorScale") continue;
      const priority = Number(attr(cfRule, "priority") ?? 0);
      const colorScale = (cfRule as { colorScale?: unknown }).colorScale;
      if (!colorScale) continue;
      const cfvos = asArray((colorScale as { cfvo?: unknown[] }).cfvo);
      const colors = asArray((colorScale as { color?: unknown[] }).color);
      const percentileCfvo = cfvos.find((c) => attr(c, "type") === "percentile");
      const midPercentile = percentileCfvo
        ? Number(attr(percentileCfvo, "val") ?? 50)
        : 50;
      const [lowColor, midColor, highColor] = colors;
      if (!lowColor || !midColor || !highColor || cfvos.length !== 3) {
        throw new Error(
          `ingest-workbook: colour-scale rule for "${sqref}" is not a 3-stop min/percentile/max scale`,
        );
      }
      rules.push({
        sqref,
        priority,
        midPercentile,
        low: argbToHex(attr(lowColor, "rgb") ?? ""),
        mid: argbToHex(attr(midColor, "rgb") ?? ""),
        high: argbToHex(attr(highColor, "rgb") ?? ""),
      });
    }
  }
  return rules;
}

/** Parses `xl/worksheets/sheet1.xml`: cells, merges, row heights/hidden, rightToLeft, colour-scale rules (T5.1, T5.3). */
export function parseSheet(xml: string, sharedStrings: string[]): RawSheet {
  const doc = parseXml(xml) as {
    worksheet?: {
      dimension?: unknown;
      sheetViews?: { sheetView?: unknown[] };
      mergeCells?: { mergeCell?: unknown[] };
      sheetData?: { row?: unknown[] };
      conditionalFormatting?: unknown[];
    };
  };
  const worksheet = doc.worksheet;
  if (!worksheet) throw new Error("ingest-workbook: sheet1.xml has no <worksheet> root");

  const dimension = attr(worksheet.dimension, "ref") ?? "";
  const sheetView = asArray(worksheet.sheetViews?.sheetView)[0];
  const rightToLeft = attr(sheetView, "rightToLeft") === "1";

  const merges = asArray(worksheet.mergeCells?.mergeCell)
    .map((m) => attr(m, "ref"))
    .filter((ref): ref is string => Boolean(ref));

  const rows = new Map<number, RawRow>();
  for (const rowNode of asArray(worksheet.sheetData?.row)) {
    const rowIndex = Number(attr(rowNode, "r"));
    const heightAttr = attr(rowNode, "ht");
    const cells = new Map<string, RawCell>();
    for (const cellNode of asArray((rowNode as { c?: unknown[] }).c)) {
      const ref = attr(cellNode, "r");
      if (!ref) continue;
      const { col, row } = splitRef(ref);
      const type = attr(cellNode, "t");
      const styleIndex = Number(attr(cellNode, "s") ?? 0);
      const formulaNode = (cellNode as { f?: unknown }).f;
      const formula: CellFormula | null =
        formulaNode === undefined
          ? null
          : {
              text: textOf(formulaNode) || null,
              sharedIndex:
                attr(formulaNode, "t") === "shared" &&
                attr(formulaNode, "si") !== undefined
                  ? Number(attr(formulaNode, "si"))
                  : null,
            };
      const rawV = (cellNode as { v?: unknown }).v;

      let value: RawCell["value"] = null;
      if (rawV !== undefined) {
        const text = textOf(rawV);
        if (type === "s") {
          const index = Number(text);
          value = sharedStrings[index] ?? "";
        } else if (type === "str") {
          value = text; // cached formula string result
        } else if (type === "b") {
          value = text === "1";
        } else if (type === "e") {
          value = null; // cached formula error (e.g. blank average) — SPEC §3.1: renders blank
        } else {
          value = text === "" ? null : Number(text);
        }
      } else if (type === "inlineStr") {
        const inline = (cellNode as { is?: unknown }).is;
        value = textOf((inline as { t?: unknown })?.t);
      }

      cells.set(col, { ref, col, row, value, styleIndex, formula });
    }
    rows.set(rowIndex, {
      row: rowIndex,
      heightPt: heightAttr ? Number(heightAttr) : null,
      hidden: attr(rowNode, "hidden") === "1",
      outlineLevel: Number(attr(rowNode, "outlineLevel") ?? 0),
      cells,
    });
  }

  const colorScaleRanges = parseColorScaleRules(asArray(worksheet.conditionalFormatting));

  return { dimension, rightToLeft, rows, merges, colorScaleRanges };
}

export function getCell(sheet: RawSheet, ref: string): RawCell | undefined {
  const { col, row } = splitRef(ref);
  return sheet.rows.get(row)?.cells.get(col);
}

export function cellValue(
  sheet: RawSheet,
  ref: string,
): string | number | boolean | null {
  return getCell(sheet, ref)?.value ?? null;
}
