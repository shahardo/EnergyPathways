import { describe, expect, it } from "vitest";
import { parseSheet } from "../../../scripts/ingest/sheet";
import {
  runStructuralAssertions,
  StructuralAssertionError,
} from "../../../scripts/ingest/assertions";

const COLUMNS = "CDEFGHIJKLMNOPQRS".split("");

function inlineStrCell(ref: string, text: string): string {
  return `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
}

function numberCell(ref: string, value: number): string {
  return `<c r="${ref}"><v>${value}</v></c>`;
}

function averageFormulaCell(
  ref: string,
  col: string,
  startRow: number,
  endRow: number,
): string {
  return `<c r="${ref}"><f>IFERROR(AVERAGE(${col}${startRow}:${col}${endRow}), "")</f><v>3</v></c>`;
}

/**
 * A minimal but structurally complete sheet1.xml: just enough for every
 * `runStructuralAssertions` check to pass (T5's "fixture workbook" tests,
 * DEV-PLAN T5 acceptance — a moved row, a broken merge, or a bad formula
 * each abort ingestion with a message naming the problem). Built as one
 * string so each test can surgically corrupt a single piece of it.
 */
function buildValidSheetXml(): string {
  const rowALabels: Record<number, string> = {
    1: "ציר",
    2: "תחום",
    3: "פוטנציאל",
    9: "ביטחון",
    20: "סביבה",
    31: "שוויון",
    38: "סבירות",
    39: "חסמים",
  };
  const yearRows = [10, 21, 32];
  const years = [2025, 2030, 2040, 2050];

  const cellsByRow = new Map<number, string[]>();
  const addCell = (row: number, cellXml: string) => {
    const existing = cellsByRow.get(row) ?? [];
    existing.push(cellXml);
    cellsByRow.set(row, existing);
  };

  for (const [row, label] of Object.entries(rowALabels)) {
    addCell(Number(row), inlineStrCell(`A${row}`, label));
  }
  for (const startRow of yearRows) {
    years.forEach((year, offset) => {
      const row = startRow + offset;
      addCell(row, numberCell(`A${row}`, year));
    });
  }
  addCell(40, inlineStrCell("A40", "2025-2030"));
  addCell(52, inlineStrCell("A52", "2030-2040"));
  addCell(61, inlineStrCell("A61", "2040-2050"));
  for (const c of COLUMNS) addCell(9, averageFormulaCell(`${c}9`, c, 4, 8));
  for (const c of COLUMNS) addCell(20, averageFormulaCell(`${c}20`, c, 15, 19));

  const rows = [...cellsByRow.entries()]
    .sort(([a], [b]) => a - b)
    .map(([row, cells]) => `<row r="${row}">${cells.join("")}</row>`);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:S66"/>
<sheetViews><sheetView rightToLeft="1"/></sheetViews>
<sheetData>${rows.join("")}</sheetData>
<mergeCells count="3">
<mergeCell ref="A40:A51"/><mergeCell ref="A52:A60"/><mergeCell ref="A61:A66"/>
</mergeCells>
</worksheet>`;
}

function parseAndAssert(xml: string) {
  const sheet = parseSheet(xml, []);
  runStructuralAssertions(sheet);
}

describe("runStructuralAssertions", () => {
  it("accepts a structurally valid minimal fixture", () => {
    expect(() => parseAndAssert(buildValidSheetXml())).not.toThrow();
  });

  it("aborts when a row label has moved (e.g. A1 no longer says ציר)", () => {
    const xml = buildValidSheetXml().replace(
      `${inlineStrCell("A1", "ציר")}`,
      inlineStrCell("A1", "WRONG"),
    );
    expect(() => parseAndAssert(xml)).toThrow(StructuralAssertionError);
    expect(() => parseAndAssert(xml)).toThrow(/A1 expected label/);
  });

  it("aborts when a phase merge is missing (a broken phase band)", () => {
    const xml = buildValidSheetXml().replace('<mergeCell ref="A40:A51"/>', "");
    expect(() => parseAndAssert(xml)).toThrow(StructuralAssertionError);
    expect(() => parseAndAssert(xml)).toThrow(/missing phase merge A40:A51/);
  });

  it("aborts when an average formula references the wrong column (an inserted/moved column)", () => {
    const xml = buildValidSheetXml().replace(
      averageFormulaCell("C9", "C", 4, 8),
      averageFormulaCell("C9", "D", 4, 8), // C9 now averages D's sub-scores, not its own
    );
    expect(() => parseAndAssert(xml)).toThrow(StructuralAssertionError);
    expect(() => parseAndAssert(xml)).toThrow(/does not reference C4:C8/);
  });

  it("aborts when a year label is out of place (a moved trajectory row)", () => {
    const xml = buildValidSheetXml().replace(
      '<row r="10">' + numberCell("A10", 2025) + "</row>",
      '<row r="10">' + numberCell("A10", 1999) + "</row>",
    );
    expect(() => parseAndAssert(xml)).toThrow(StructuralAssertionError);
    expect(() => parseAndAssert(xml)).toThrow(/A10 expected year label 2025/);
  });
});
