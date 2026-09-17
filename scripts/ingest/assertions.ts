import { AXIS_GROUPS, CHANNEL_COLUMNS } from "./columnMap";
import { cellValue, getCell, type RawSheet } from "./sheet";
import type { WorkbookStyles } from "./styles";

export class StructuralAssertionError extends Error {}

function fail(message: string): never {
  throw new StructuralAssertionError(
    `ingest-workbook: structural assertion failed — ${message}`,
  );
}

const ROW_A_LABELS: readonly [number, string][] = [
  [1, "ציר"],
  [2, "תחום"],
  [3, "פוטנציאל"],
  [9, "ביטחון"],
  [20, "סביבה"],
  [31, "שוויון"],
  [38, "סבירות"],
  [39, "חסמים"],
];

const YEAR_LABEL_ROWS: readonly number[] = [10, 21, 32]; // each block's first of 4 rows: 2025, 2030, 2040, 2050
const YEAR_LABELS = [2025, 2030, 2040, 2050];

const PHASE_MERGES: readonly { ref: string; label: string }[] = [
  { ref: "A40:A51", label: "2025-2030" },
  { ref: "A52:A60", label: "2030-2040" },
  { ref: "A61:A66", label: "2040-2050" },
];

/**
 * Rows 9 and 20 are live `IFERROR(AVERAGE(...),"")` formulas in the current
 * file. Row 31 (equity) is not — every one of its cells holds a plain
 * cached number (or, for F/M, a literal empty string) with no `<f>` at
 * all. That's a real property of the current workbook, not a parsing gap,
 * so it isn't asserted here; `checkEquityAverageIsLiteral` below reports it
 * as an ingestion anomaly instead of aborting on it.
 */
const AVERAGE_FORMULA_ROWS: readonly {
  row: number;
  subScoreStart: number;
  subScoreEnd: number;
}[] = [
  { row: 9, subScoreStart: 4, subScoreEnd: 8 },
  { row: 20, subScoreStart: 15, subScoreEnd: 19 },
];

/**
 * SPEC §6.4 / NFR-9. Aborts (never writes) on the first violation, naming
 * the row/column/cell responsible — a revised workbook that moved
 * something must stop ingestion, not silently shift values into the wrong
 * field.
 */
export function runStructuralAssertions(sheet: RawSheet): void {
  if (sheet.dimension === "") fail("sheet has no <dimension> element");

  for (const [row, expected] of ROW_A_LABELS) {
    const actual = cellValue(sheet, `A${row}`);
    if (actual !== expected) {
      fail(`A${row} expected label "${expected}", found ${JSON.stringify(actual)}`);
    }
  }

  for (const startRow of YEAR_LABEL_ROWS) {
    YEAR_LABELS.forEach((year, offset) => {
      const row = startRow + offset;
      const actual = cellValue(sheet, `A${row}`);
      if (actual !== year) {
        fail(`A${row} expected year label ${year}, found ${JSON.stringify(actual)}`);
      }
    });
  }

  for (const merge of PHASE_MERGES) {
    if (!sheet.merges.includes(merge.ref)) {
      fail(`missing phase merge ${merge.ref}`);
    }
    const startRow = Number(/\d+/.exec(merge.ref)![0]);
    const actual = cellValue(sheet, `A${startRow}`);
    if (actual !== merge.label) {
      fail(
        `${merge.ref} expected phase label "${merge.label}", found ${JSON.stringify(actual)}`,
      );
    }
  }

  for (const { row, subScoreStart, subScoreEnd } of AVERAGE_FORMULA_ROWS) {
    // Excel stores one shared formula per contiguous run of identical
    // formulas (here, typically E..S) and translates it per cell by
    // relative reference — member cells carry only a shared-group index,
    // not their own formula text. Resolve each cell to its *master*
    // formula text (defined once, on the first cell of its group) and
    // check that master, rather than re-deriving each column's offset.
    const masterTextBySharedIndex = new Map<number, string>();
    for (const col of CHANNEL_COLUMNS) {
      const formula = getCell(sheet, `${col}${row}`)?.formula;
      if (formula?.text && formula.sharedIndex !== null) {
        masterTextBySharedIndex.set(formula.sharedIndex, formula.text);
      }
    }

    for (const col of CHANNEL_COLUMNS) {
      const cell = getCell(sheet, `${col}${row}`);
      const formula = cell?.formula ?? null;
      if (!formula) fail(`${col}${row} has no AVERAGE formula`);

      const expectedRange = `${col}${subScoreStart}:${col}${subScoreEnd}`;
      if (formula.text) {
        if (!formula.text.includes(expectedRange)) {
          fail(
            `${col}${row}'s formula does not reference ${expectedRange} (found "${formula.text}")`,
          );
        }
        continue;
      }
      if (formula.sharedIndex === null) {
        fail(`${col}${row} has neither its own formula text nor a shared-formula index`);
      }
      const masterText = masterTextBySharedIndex.get(formula.sharedIndex);
      if (!masterText?.includes("AVERAGE(")) {
        fail(
          `${col}${row}'s shared formula group ${formula.sharedIndex} has no AVERAGE(...) master`,
        );
      }
    }
  }
}

/**
 * The committed `AXIS_GROUPS` table (columnMap.ts) hand-records each axis
 * group's header/name fill hex — cross-checked here against the fill this
 * ingestion run actually resolves from the live file's `styles.xml` +
 * `theme1.xml`, so a revised theme or fill is caught rather than silently
 * left stale in the committed table (SPEC §5.3, PRD §5.1 "ingested, not
 * hard-coded").
 */
export function assertAxisGroupFillsMatch(sheet: RawSheet, styles: WorkbookStyles): void {
  for (const group of AXIS_GROUPS) {
    const headerCell = getCell(sheet, `${group.startColumn}1`);
    const nameCell = getCell(sheet, `${group.startColumn}2`);
    const headerFill = headerCell ? styles.fillByXf(headerCell.styleIndex) : null;
    const nameFill = nameCell ? styles.fillByXf(nameCell.styleIndex) : null;
    if (headerFill !== group.headerFill) {
      fail(
        `axis group "${group.axisGroupId}" header fill is ${headerFill}, committed table says ${group.headerFill}`,
      );
    }
    if (nameFill !== group.nameFill) {
      fail(
        `axis group "${group.axisGroupId}" name fill is ${nameFill}, committed table says ${group.nameFill}`,
      );
    }
  }
}

/**
 * Row 31 (equity average) holds literal cached numbers rather than a live
 * formula (see the comment on `AVERAGE_FORMULA_ROWS` above). This checks
 * only that every cell is a plausible average — numeric, in range, or
 * genuinely blank — and returns `true` when at least one column really is
 * a bare literal, so the caller can record it as an ingest-report anomaly.
 */
export function checkEquityAverageIsLiteral(sheet: RawSheet): boolean {
  let sawLiteral = false;
  for (const col of CHANNEL_COLUMNS) {
    const cell = getCell(sheet, `${col}31`);
    if (!cell) fail(`${col}31 (equity average) is missing`);
    if (cell.formula === null) sawLiteral = true;
    const value = cell.value;
    const isPlausible =
      value === null ||
      (typeof value === "string" && value.trim() === "") ||
      (typeof value === "number" && value >= 1 && value <= 5);
    if (!isPlausible) {
      fail(`${col}31 (equity average) has an implausible value ${JSON.stringify(value)}`);
    }
  }
  return sawLiteral;
}
