import type { RowLabel } from "@/lib/schemas/workbook";
import { ROW_MAP } from "./rowMap";
import { cellValue, type RawSheet } from "./sheet";

const DEFAULT_ROW_HEIGHT_PT = 14.25; // sheetFormatPr defaultRowHeight, when a row has no explicit `ht`

/** Combines the static row map (key/labelEn) with what the sheet itself says about each row (SPEC's "ingested, not hard-coded" rule for layout metadata). */
export function extractRowLabels(sheet: RawSheet): RowLabel[] {
  return ROW_MAP.map((entry) => {
    const rawLabel = cellValue(sheet, `A${entry.row}`);
    if (rawLabel === null && entry.spec.kind !== "sparkline") {
      throw new Error(`ingest-workbook: row ${entry.row} has no label at A${entry.row}`);
    }
    const labelHe = rawLabel === null ? null : String(rawLabel);
    const row = sheet.rows.get(entry.row);
    return {
      row: entry.row,
      key: entry.key,
      labelHe,
      labelEn: entry.labelEn,
      visible: !(row?.hidden ?? false),
      heightPt: row?.heightPt ?? DEFAULT_ROW_HEIGHT_PT,
    };
  });
}
