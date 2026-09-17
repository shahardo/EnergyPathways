import { parseXml, asArray, attr, textOf } from "./xml";

function columnIndexToLetter(index0: number): string {
  let n = index0 + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

interface AnchorFrom {
  col0: number;
  row0: number;
}

function anchorFrom(node: unknown): AnchorFrom {
  const from = (node as { "xdr:from"?: unknown })["xdr:from"];
  const col = Number(textOf((from as { "xdr:col"?: unknown })?.["xdr:col"]));
  const row = Number(textOf((from as { "xdr:row"?: unknown })?.["xdr:row"]));
  return { col0: col, row0: row };
}

export interface ChartAnchor {
  chartRelId: string;
  /**
   * The chart's rendered column, i.e. the column it visually sits under.
   * Empirically one column past the anchor's raw `from` column for every
   * one of this workbook's 51 charts (T5.4) — the shape's `colOff` is
   * consistently large enough (~1.45–1.48M EMU, close to a full column
   * width) that the chart's true left edge falls in the next column. This
   * is what lets T5.4 catch chart49–51 referencing column C's data while
   * rendered in D's slot (SPEC §5.5, §6.3).
   */
  visualColumn: string;
}

export interface CalloutShape {
  /** Concatenated text runs, minus the leading ⚠️ icon shape (extracted separately). */
  text: string;
  anchorCell: string; // e.g. "F49"
}

export interface ParsedDrawing {
  chartAnchors: ChartAnchor[];
  callouts: CalloutShape[];
}

/** Parses `xl/drawings/drawing1.xml`: chart anchors (T5.4) and callout group-shapes (T5.5). */
export function parseDrawing(xml: string): ParsedDrawing {
  const doc = parseXml(xml) as { "xdr:wsDr"?: Record<string, unknown> };
  const root = doc["xdr:wsDr"];
  if (!root) throw new Error("ingest-workbook: drawing1.xml has no <xdr:wsDr> root");

  const twoCell = asArray(root["xdr:twoCellAnchor"]);
  const oneCell = asArray(root["xdr:oneCellAnchor"]);
  const anchors = [...twoCell, ...oneCell];

  const chartAnchors: ChartAnchor[] = [];
  const callouts: CalloutShape[] = [];

  for (const anchor of anchors) {
    const graphicFrame = (anchor as { "xdr:graphicFrame"?: unknown })["xdr:graphicFrame"];
    if (graphicFrame) {
      const chartRef = (
        graphicFrame as {
          "a:graphic"?: { "a:graphicData"?: { "c:chart"?: unknown } };
        }
      )["a:graphic"]?.["a:graphicData"]?.["c:chart"];
      const rId = attr(chartRef, "r:id");
      if (!rId) continue;
      const { col0 } = anchorFrom(anchor);
      chartAnchors.push({ chartRelId: rId, visualColumn: columnIndexToLetter(col0 + 1) });
      continue;
    }

    const group = (anchor as { "xdr:grpSp"?: unknown })["xdr:grpSp"];
    if (group) {
      const shapes = asArray((group as { "xdr:sp"?: unknown[] })["xdr:sp"]);
      const texts: string[] = [];
      for (const shape of shapes) {
        const paragraphs = asArray(
          (shape as { "xdr:txBody"?: { "a:p"?: unknown[] } })["xdr:txBody"]?.["a:p"],
        );
        for (const p of paragraphs) {
          const runs = asArray((p as { "a:r"?: unknown[] })["a:r"]);
          for (const run of runs) {
            const text = textOf((run as { "a:t"?: unknown })["a:t"]);
            if (text) texts.push(text);
          }
        }
      }
      const message = texts.filter((t) => t !== "⚠️" && t.trim() !== "").join("");
      if (!message) continue; // the rounded-rectangle background shape carries no text
      const { col0, row0 } = anchorFrom(anchor);
      callouts.push({
        text: message,
        anchorCell: `${columnIndexToLetter(col0)}${row0 + 1}`,
      });
    }
  }

  return { chartAnchors, callouts };
}
